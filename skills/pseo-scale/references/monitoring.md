# Monitoring at Scale (pseo-scale section 6)

At 100K pages, you can't manually check pages. Build automated monitoring.

### Key Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Pages indexed | Page indexing report (UI export by sitemap) or BigQuery bulk export | Drops > 5% week-over-week |
| Crawl rate | Crawl stats report (UI) plus server/CDN logs (seo-log-analysis) | Drops > 20% |
| Crawl errors (5xx, 404) | Server logs, Page indexing report | > 1% of total pages |
| CWV regressions | CrUX API or RUM (75th percentile) | Any template leaves "good" (LCP > 2.5s, INP > 200ms, CLS > 0.1); page on "poor" (LCP > 4s, CLS > 0.25) |
| Build duration | CI/CD logs | > 2x baseline |
| Build memory peak | CI/CD logs | > 80% of available memory |
| Page count by status | Database | Published count deviates from expected |
| Sufficiency score distribution | Database | > 20% of published pages below threshold |

### Automated Monitoring Script

`pool` is a `pg` Pool; `query()` returns `{ rows }`.

```typescript
// scripts/monitor-pseo.ts - run daily via cron or CI
async function monitor() {
  const count = async (sql: string) => Number((await pool.query(sql)).rows[0].count);
  const metrics = {
    totalPublished: await count("SELECT COUNT(*) FROM pages WHERE status = 'published'"),
    avgSufficiency: Number((await pool.query("SELECT AVG(data_sufficiency_score) AS count FROM pages WHERE status = 'published'")).rows[0].count),
    belowThreshold: await count("SELECT COUNT(*) FROM pages WHERE data_sufficiency_score < 60 AND status = 'published'"),
    recentlyModified: await count("SELECT COUNT(*) FROM pages WHERE last_modified > NOW() - INTERVAL '7 days'"),
    neverValidated: await count("SELECT COUNT(*) FROM pages WHERE last_validated IS NULL AND status = 'published'"),
    redirectCount: await count("SELECT COUNT(*) FROM redirects"),
    brokenRedirects: await count(
      "SELECT COUNT(*) FROM redirects r WHERE NOT EXISTS (SELECT 1 FROM pages p WHERE p.canonical_path = r.destination)"
    ),
  };

  // Output report or send to monitoring service
  console.log(JSON.stringify(metrics, null, 2));

  // Alert on critical conditions
  if (metrics.brokenRedirects > 0) console.error("ALERT: Broken redirects found");
  if (metrics.belowThreshold / metrics.totalPublished > 0.2) {
    console.error("ALERT: >20% of published pages below sufficiency threshold");
  }
}
```

### Search Console Data: What the API Does and Does Not Give You

- The Search Console API has **no index-coverage endpoint and no crawl-stats endpoint**. The sitemaps API `contents[].indexed` field is deprecated; do not build on it.
- **Indexed pages**: Page indexing report in the UI (export, filter by sitemap or by "All submitted pages"). Split sitemaps by template/category so the per-sitemap filter gives per-template indexing.
- **Crawl data**: Crawl stats report in the UI, plus server/CDN logs (see seo-log-analysis).
- **Spot checks**: URL Inspection API for samples per template. Quota is 2,000 requests/day and 600/min per site, so it cannot cover 100K URLs.
- **Performance data**: Search Analytics API (row limits apply), or the bulk export below for full per-URL data.

### Bulk Data Export to BigQuery (100K sites)

Verified against Search Console Help (support.google.com/webmasters/answer/12917675 and 12917991) on 2026-10-28.

Setup:
1. Create a Google Cloud project with billing; enable the BigQuery API and BigQuery Storage API.
2. In IAM and Admin, grant access to `search-console-data-export@system.gserviceaccount.com` with roles **BigQuery Job User** and **BigQuery Data Editor**.
3. In Search Console, open Settings > Bulk data export for the property and enter the Cloud **project ID** (not the number).
4. Dataset name defaults to `searchconsole` (custom names must start with `searchconsole`). Pick the location carefully: it is hard to change once exports begin.
5. The first export runs up to 48 hours later; it includes data for the day of the export and then runs daily.
6. Optional: set a partition expiration of 14 days or more. Never change the table schema or exports fail.

Tables (partitioned by `data_date`, Pacific Time): `searchdata_site_impression` (per property, uses `sum_top_position`) and `searchdata_url_impression` (per URL, uses `sum_position`). Anonymized queries are excluded from query-level rows but counted in totals.

Always filter on `data_date` to limit scanned bytes.

Pages by clicks (last 28 days):

```sql
SELECT url, SUM(clicks) AS clicks, SUM(impressions) AS impressions,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
       SAFE_DIVIDE(SUM(sum_position), SUM(impressions)) + 1 AS avg_position
FROM `PROJECT_ID.searchconsole.searchdata_url_impression`
WHERE data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)
  AND search_type = 'WEB'
GROUP BY url
ORDER BY clicks DESC
LIMIT 1000;
```

Template-level aggregation by URL pattern (adjust the regex to your URL structure; hyphenated slugs):

```sql
SELECT
  REGEXP_EXTRACT(url, r'^https://[^/]+/([^/]+)/') AS template,
  COUNT(DISTINCT url) AS urls_with_impressions,
  SUM(clicks) AS clicks,
  SUM(impressions) AS impressions
FROM `PROJECT_ID.searchconsole.searchdata_url_impression`
WHERE data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)
  AND search_type = 'WEB'
GROUP BY template
ORDER BY clicks DESC;
```

Compare `urls_with_impressions` to the number of published pages per template to find templates Google barely surfaces. Note: impressions before 2026-04-27 have a documented logging error (clicks unaffected), so do not compare impression trends across that date.
