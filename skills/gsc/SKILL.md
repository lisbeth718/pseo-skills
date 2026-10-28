---
name: gsc
description: Pull and analyze Google Search Console data for any site. Use when the user wants to check search performance, find indexing issues, analyze queries/pages/clicks, or audit their Google visibility. Handles OAuth setup, data pulling, URL inspection, and sitemap management.
argument-hint: "[action: pull | inspect | sitemaps | audit | bulk-export | setup] [--site domain] [--days N]"
allowed-tools: Read, Bash, Glob, Grep, Write
---

# Google Search Console

Pull, analyze, and act on Google Search Console data for any site. In the pSEO pipeline this is the **post-launch monitoring step**: run it after `pseo-quality-guard` once pages are live and the sitemap is submitted.

Facts below are from the [research doc](https://github.com/lisbeth718/pseo-skills/blob/main/docs/research-2026-10.md) and Google's Search Console docs.

## Scope parameter

The `argument-hint` action values map to sections: `pull` = "pull (default)", `inspect` = "inspect", `sitemaps` = "sitemaps", `audit` = "audit", `bulk-export` = "bulk-export", `setup` = "setup". `--site` and `--days` apply to `pull`, `inspect`, `sitemaps` and `audit`.

## Prerequisites

Scripts live in this skill's `scripts/` folder (`<skill-dir>/scripts/`, for example `.claude/skills/gsc/scripts/`). Install once:

```bash
npm --prefix <skill-dir>/scripts install
```

Credentials (override paths with env vars `GSC_CLIENT` and `GSC_TOKENS`):
- **OAuth client:** `~/.config/gsc-oauth-client.json`
- **OAuth tokens:** `~/.config/gsc-oauth-tokens.json`

If tokens don't exist, follow the Setup section. Never commit these files.

## Determine the site property

- `sc-domain:example.com` (domain property, covers all subdomains)
- `https://example.com/` (URL prefix property)

Try the domain property first. On a permission error, try the URL prefix version.

## Actions

### pull (default)

Default 28 days, configurable with `--days`.

```bash
<skill-dir>/scripts/node_modules/.bin/tsx <skill-dir>/scripts/pull.ts --site sc-domain:example.com --days 28
# explicit range (overrides --days), full page coverage, custom output file
<skill-dir>/scripts/node_modules/.bin/tsx <skill-dir>/scripts/pull.ts --site sc-domain:example.com --start 2026-07-01 --end 2026-09-28 --pages 1000000 --out data/gsc-current.json
# full query+page dataset for cannibalization work
<skill-dir>/scripts/node_modules/.bin/tsx <skill-dir>/scripts/pull.ts --site sc-domain:example.com --dims query,page --out data/gsc-qp.json
```

Run from the project root. Output goes to `./data/gsc-queries.json` in the **current working directory** unless `--out <path>` is given. The script fetches (paginating with `startRow`):
- Top 500 queries with clicks, impressions, CTR, position (`--queries N`)
- Top 200 pages with the same metrics (`--pages N`; use `--pages 1000000` for every page with impressions, subject to the row cap below)
- Per-page query breakdown for the top 30 pages (`--top-pages N`)
- With `--dims query,page`: the full query+page dataset (25,000 rows per request, paginated) in a `queryPages` array. This can be large and counts against load quotas.

Flags: `--start YYYY-MM-DD` and `--end YYYY-MM-DD` override `--days`; `--out <path>` sets the output file (default `data/gsc-queries.json`).

Search Analytics API notes:
- Data lags by about 2 days; the script ends the range 2 days back.
- `rowLimit` max is 25,000 per request; page with `startRow`.
- Row cap: per Google's "Getting all your data" guide, the API "exposes a maximum of 50K rows of data per day per search type (web, image, and so on--sorted by clicks)." Low-click URLs on big sites can fall outside it, so a missing page in a pull is not proof of zero impressions. For large sites use `bulk-export` below.
- Quota: 1,200 queries/min per site and per user, plus load quotas. Page+query queries are the most expensive, so keep the per-page breakdown to the top pages.
- Hourly data exists (`HOUR` dimension, `dataState: hourly_all`, up to 10 days back; added 2025-04-09). The pull script does not use it.
- AI Overviews and AI Mode clicks and impressions count in the Web totals. There is no way to split them out through the API.
- The **Generative AI performance report is UI only**: Search Console > Performance > Generative AI. It reports impressions only (no clicks, no query dimension), has a 1,000-row UI limit, and no API access was found. Do not promise gen-AI query data.

After pulling, read `data/gsc-queries.json` and analyze:

1. **Quick wins** - queries ranking position 5-20 with decent impressions but low CTR. These pages need better titles/descriptions.
2. **Zero-click high-impression** - queries with 0 clicks but 20+ impressions. Content exists but isn't compelling enough to click.
3. **Top pages** - which pages drive the most traffic? Are the right pages ranking?
4. **Missing pages** - compare GSC pages against the sitemap. Which sitemap URLs have zero impressions?
5. **Template health** - group pages by template/URL pattern. A whole pattern with impressions near zero points to a thin or duplicate template, not a per-page problem.

### inspect

URL Inspection for specific URLs.

```bash
<skill-dir>/scripts/node_modules/.bin/tsx <skill-dir>/scripts/inspect.ts --site sc-domain:example.com --urls https://example.com/a,https://example.com/b
<skill-dir>/scripts/node_modules/.bin/tsx <skill-dir>/scripts/inspect.ts --site sc-domain:example.com --file urls.txt
```

Writes `data/gsc-inspect.json`. Quota: **2,000 inspections per day and 600 per minute per site property** (10M/day and 15k/min per project). The script waits 700 ms between calls (`--delay`) and stops on a 429. Sample representative URLs per template instead of inspecting every page.

Key fields on `inspectionResult.indexStatusResult`: `verdict` (PASS, NEUTRAL, FAIL), `coverageState`, `lastCrawlTime`, `pageFetchState`, `googleCanonical`, `userCanonical`.

Common coverage states (as shown in Search Console):
- **"Submitted and indexed"** - page is in Google's index.
- **"URL is unknown to Google"** - never seen. Check sitemap submission and internal linking.
- **"Discovered - currently not indexed"** - Google knows the URL but has not crawled it yet. With many of these, check crawl budget and internal linking.
- **"Crawled - currently not indexed"** - crawled but not indexed. Usually thin or duplicate content; treat a whole template showing this as a quality signal.
- **"Duplicate without user-selected canonical"** - no canonical tag, Google picked its own.
- **"Duplicate, Google chose different canonical than user"** - Google disagrees with your canonical. Near-duplicate template pages often land here.
- **"Duplicate, submitted URL not selected as canonical"** - sitemap URL is treated as a duplicate of another.
- **"Soft 404"** - page returns 200 but looks empty. Return a real 404/410 for no-data pages.
- **"Excluded by 'noindex' tag"** - noindex present in the served HTML.

After fixing duplicate issues, Google may keep pages in a duplicate cluster for up to two weeks. Request Indexing is quota-limited; reserve it for the most important URLs.

### sitemaps

```bash
<skill-dir>/scripts/node_modules/.bin/tsx <skill-dir>/scripts/sitemaps.ts list --site sc-domain:example.com
<skill-dir>/scripts/node_modules/.bin/tsx <skill-dir>/scripts/sitemaps.ts submit --site sc-domain:example.com --url https://example.com/sitemap.xml
<skill-dir>/scripts/node_modules/.bin/tsx <skill-dir>/scripts/sitemaps.ts delete --site sc-domain:example.com --url https://example.com/old-sitemap.xml
```

`submit` and `delete` need the write scope (`auth.ts --write`). Sitemap limits: 50,000 URLs or 50MB uncompressed per file; up to 500 sitemap index files per site in Search Console. Google ignores `<priority>` and `<changefreq>`; `<lastmod>` counts only when it is consistently accurate.

### audit

Full GSC audit. Combines pull + inspect on key pages:

1. Pull 90-day data
2. `sitemaps.ts list` to check registered sitemaps and errors
3. Inspect 10-15 representative URLs (homepage, key landing pages, a sample per pSEO template)
4. Report: indexed vs not indexed per template, crawl issues, sitemap problems, quick wins

Save the audit pull with `--out data/gsc-deep.json`.

### Post-launch monitoring (pSEO)

Run after launch and on a recurring schedule (weekly during rollout):

- Pull 28 days; compare impressions and indexed share per template against the previous pull.
- Inspect a sample per template. A rising share of "Crawled - currently not indexed" or "Duplicate, Google chose different canonical than user" means the template adds too little unique value: go back to `pseo-data` (sufficiency gating) and `pseo-quality-guard`.
- Pause or slow rollout if indexed share drops. Google ships frequent spam and core updates (four spam updates in 2026 so far); judge trends over weeks, not days.
- Do not use the Google Indexing API for pSEO pages: it still supports only JobPosting and BroadcastEvent content. Default quotas are 200 publish requests/day, 180 metadata requests/min and 380 requests/min, and the old quota-increase form was removed on 2026-10-16. Rely on sitemaps and internal links.

### bulk-export

For large sites, use the Search Console bulk data export to BigQuery instead of the API: a daily export of all performance data available to Search Console, except anonymized queries. Setup (from Google's docs, verified 2026-10-28):

1. Google Cloud: use a project with billing enabled. Enable the BigQuery API and BigQuery Storage API (APIs & Services > Enabled APIs & Services).
2. IAM and Admin > Grant access: add `search-console-data-export@system.gserviceaccount.com` with the roles BigQuery Job User and BigQuery Data Editor.
3. Search Console > Settings > Bulk data export: enter the Cloud project ID (not the number), the dataset name (default `searchconsole`; custom names must start with `searchconsole`, and each property needs its own name when sharing a project), and the dataset location (hard to change once exports start). Click Continue.
4. The first export runs within 48 hours. Data before setup is not included, so keep pulling with the API for history. Once the tables exist, set a partition expiration of 14 days or longer, and never change the table schema (it makes exports fail).

Tables:
- `searchdata_site_impression`: by property. Columns `data_date`, `site_url`, `query`, `is_anonymized_query`, `country`, `search_type`, `device`, `impressions`, `clicks`, `sum_top_position`.
- `searchdata_url_impression`: by URL. Same dimensions plus `url`, and `sum_position` instead of `sum_top_position`.
- `ExportLog`: successful exports only.

Keys repeat, so always aggregate. Average position is `SUM(sum_position) / SUM(impressions) + 1` (URL table) or `SUM(sum_top_position) / SUM(impressions) + 1` (site table).

Pages with impressions in the last 90 days (every URL, no 50K cap):

```sql
SELECT url, SUM(impressions) AS impressions, SUM(clicks) AS clicks,
       SAFE_DIVIDE(SUM(sum_position), SUM(impressions)) + 1 AS avg_position
FROM `PROJECT.searchconsole.searchdata_url_impression`
WHERE data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
  AND search_type = 'WEB'
GROUP BY url
ORDER BY impressions DESC;
```

Template-level aggregation by URL regex (adjust the pattern to the site's URL structure; here the first path segment is the template):

```sql
SELECT REGEXP_EXTRACT(url, r'^https?://[^/]+(/[^/?#]*)') AS template,
       COUNT(DISTINCT url) AS pages_with_impressions,
       SUM(impressions) AS impressions, SUM(clicks) AS clicks,
       SAFE_DIVIDE(SUM(sum_position), SUM(impressions)) + 1 AS avg_position
FROM `PROJECT.searchconsole.searchdata_url_impression`
WHERE data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)
  AND search_type = 'WEB'
GROUP BY template
ORDER BY impressions DESC;
```

Compare `pages_with_impressions` per template against the template's sitemap URL count to find templates Google shows nothing for.

### setup

If OAuth tokens don't exist:

1. **Google Cloud Console** - create an OAuth 2.0 Client ID of type Desktop:
   - console.cloud.google.com > APIs & Services > Library: enable the "Google Search Console API"
   - APIs & Services > Credentials > Create OAuth client ID, type Desktop app
   - Save the JSON to `~/.config/gsc-oauth-client.json`

2. **Run the auth script** (opens a browser for consent, cross-platform):
   ```bash
   <skill-dir>/scripts/node_modules/.bin/tsx <skill-dir>/scripts/auth.ts
   ```
   It listens on `127.0.0.1:3456` for the callback (checking a random OAuth `state`) and saves tokens to `~/.config/gsc-oauth-tokens.json` (mode 600).

3. **Scope** - default is `https://www.googleapis.com/auth/webmasters.readonly`, enough for search analytics and URL inspection. Only for sitemap submit/delete, re-run with the full scope:
   ```bash
   <skill-dir>/scripts/node_modules/.bin/tsx <skill-dir>/scripts/auth.ts --write
   ```
   which requests `https://www.googleapis.com/auth/webmasters`.

## Search generative AI setting

Sites can opt out of AI Overviews, AI Mode and Discover gen-AI features without leaving classic Search: **Search Console > Settings > Search generative AI** (options: Include, Exclude, Inherit from parent property; rolled out to all sites by 2026-08-31; takes effect in 1-2 days). It is separate from `Google-Extended` (Gemini training/grounding) and from `nosnippet` / `max-snippet`. Only change it when the user asks.

## Custom scripts

Save custom scripts inside `<skill-dir>/scripts/` (so `googleapis` resolves from that folder) and run them with the same binary: `<skill-dir>/scripts/node_modules/.bin/tsx <skill-dir>/scripts/my-script.ts`. Import the shared helper instead of re-implementing auth:

```typescript
import { getSearchConsole } from './lib/auth.js';
const sc = getSearchConsole(); // tokens auto-refresh and persist
```

## Output

Pulled data goes to `data/gsc-queries.json` by default (use `--out data/gsc-deep.json` for audits) in the project directory. Add `data/` to `.gitignore` if not already there.

After analysis, present findings as actionable items sorted by impact. Focus on what can be fixed in code (titles, descriptions, canonicals, structured data, internal linking, data sufficiency) rather than off-page factors.
