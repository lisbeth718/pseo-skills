---
name: pseo-scale
description: Architect programmatic SEO systems for 10K-100K+ pages with database-backed data layers, data sufficiency gating, incremental validation, crawl budget management, content enrichment pipelines, and edge delivery. Use when scaling beyond 10K pages, when builds are OOMing, when Google is not indexing all pages, or when the current in-memory architecture has hit its limits.
argument-hint: "[focus: all | database | gating | enrichment | validation | crawl | monitoring | cdn]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
---

# pSEO Scale Architecture

## Scope parameter

| Value | Sections |
|---|---|
| `database` | 1 |
| `gating` | 2 |
| `enrichment` | 3 |
| `validation` | 4 |
| `crawl` | 5 |
| `monitoring` | 6 |
| `cdn` | 7, 8 |
| `all` | everything |

Architect pSEO systems that work at 10K-100K+ pages. The patterns in the other pseo-* skills are correct at 1K-10K. Beyond 10K, in-memory data layers, full-corpus validation, and single-deploy rollouts break down. This skill provides the architecture changes needed at scale.

## Scale Tiers

| Tier | Pages | Data Layer | Validation | Rollout | Sitemap |
|------|-------|-----------|------------|---------|---------|
| Tiny | < 100 | JSON/files, in-memory | Full pairwise | Single deploy | Single file |
| Small | 100-1K | JSON/files, in-memory | Full pairwise | 1-4 weeks in batches of 50-200 | Single file |
| Medium | 1K-10K | Files or DB, two-tier memory | Fingerprint-based | 4-8 weeks in batches | Index + children |
| Large | 10K-50K | Database required | Incremental + sampling | Category-by-category | Index + chunked |
| Very Large | 50K-100K+ | Database + cache layer | Delta-only + periodic full | ISR + sitemap waves | Index + streaming |

Rollout pacing in this table is an operational heuristic shared with pseo-performance, not a Google rule.

**This skill focuses on the Large and Very Large tiers.** If the project is under 10K pages, the standard pseo-* skills are sufficient.

## 1. Database-Backed Data Layer

At 10K+ pages, JSON files and in-memory arrays stop working. The data layer must move to a database with proper indexing.

### Why In-Memory Breaks

```
Pages    PageIndex in memory    Full content (if loaded)
1K       ~1MB                   ~100-500MB
10K      ~10MB                  ~1-5GB (OOM)
50K      ~50MB (borderline)     ~5-25GB (impossible)
100K     ~100MB                 ~10-50GB (impossible)
```

At 50K+, even holding all `PageIndex` records in memory is borderline. At 100K, `getAllSlugs()` returning an array of 100K objects takes ~100MB and seconds to deserialize. You need cursor-based iteration.

### Database Requirements

**Minimum schema:**
```sql
CREATE TABLE pages (
  id            SERIAL PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  canonical_path TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  h1            TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  category      TEXT NOT NULL,
  subcategory   TEXT,
  status        TEXT DEFAULT 'published',
  monthly_traffic INTEGER DEFAULT 0,  -- from analytics/GSC; used to rank pre-build and cache warming
  last_modified TIMESTAMPTZ NOT NULL,
  published_at  TIMESTAMPTZ,
  -- Heavy fields (only loaded per-page)
  intro_text    TEXT,
  body_content  TEXT,
  faqs          JSONB,
  related_slugs TEXT[],
  featured_image JSONB,
  -- Scale fields
  data_sufficiency_score REAL,  -- see section 2
  content_hash  TEXT,           -- for incremental validation
  last_validated TIMESTAMPTZ
);

-- Required indexes for pSEO queries
CREATE INDEX idx_pages_category ON pages(category);
CREATE INDEX idx_pages_status ON pages(status) WHERE status = 'published';
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_last_modified ON pages(last_modified DESC);
CREATE INDEX idx_pages_sufficiency ON pages(data_sufficiency_score);
CREATE INDEX idx_pages_category_status ON pages(category, status);
```

**Categories table:**
```sql
CREATE TABLE categories (
  slug          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  parent_slug   TEXT REFERENCES categories(slug),
  page_count    INT DEFAULT 0,
  last_modified TIMESTAMPTZ
);
```

**Redirects table:**
```sql
CREATE TABLE redirects (
  source      TEXT PRIMARY KEY,
  destination TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_redirects_destination ON redirects(destination);
```

### Data Layer API at Scale

The pseo-data API contract changes at scale:

```typescript
// getAllSlugs() must support cursor-based iteration at 50K+
async function* getAllSlugsCursor(): AsyncGenerator<{ slug: string; category: string }> {
  let cursor: string | null = null;
  while (true) {
    // pg Pool: query() returns { rows }, not an array
    const { rows } = await pool.query(
      `SELECT slug, category FROM pages
       WHERE status = 'published'
       ${cursor ? `AND slug > $1` : ''}
       ORDER BY slug LIMIT 1000`,
      cursor ? [cursor] : []
    );
    if (rows.length === 0) break;
    for (const row of rows) yield row;
    cursor = rows[rows.length - 1].slug;
  }
}

// getPagesByCategory() must use DB pagination, not in-memory slicing.
// limit is REQUIRED: a hidden default silently truncates sitemaps and hubs.
async function getPagesByCategory(
  category: string,
  opts: { limit: number; offset?: number }
): Promise<PageIndex[]> {
  const { rows } = await pool.query(
    `SELECT slug, title, h1, meta_description, canonical_path, category, last_modified
     FROM pages
     WHERE category = $1 AND status = 'published'
     ORDER BY title
     LIMIT $2 OFFSET $3`,
    [category, opts.limit, opts.offset ?? 0]
  );
  return rows;
}

// getRelatedPages() needs a precomputed index or efficient query
async function getRelatedPages(slug: string, limit = 5): Promise<PageIndex[]> {
  // Option A: Use related_slugs array from the page record
  // Option B: Same category + shared tags query
  // Option C: Precomputed relatedness table (best at 50K+)
  const { rows } = await pool.query(
    `SELECT p.slug, p.title, p.h1, p.meta_description, p.canonical_path,
            p.category, p.last_modified
     FROM pages p
     JOIN pages source ON source.slug = $1
     WHERE p.category = source.category
       AND p.slug != $1
       AND p.status = 'published'
     ORDER BY p.last_modified DESC
     LIMIT $2`,
    [slug, limit]
  );
  return rows;
}
```

### Connection Pooling

At build time with parallel page generation, you need connection pooling:

```typescript
import { Pool } from "pg";

const pool = new Pool({
  max: 10,                    // limit concurrent connections during build
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

**ORM alternative:** If using Prisma or Drizzle, configure connection pool limits in the ORM config. Default pool sizes are often too high for build processes.

See `references/database-patterns.md` for full patterns by database type.

See `references/vercel-optimization.md` for Vercel-specific build cost and ISR optimization strategies.

## 2. Data Sufficiency Gating

At 100K pages, many combinations will produce thin content. Gate page generation BEFORE build time - don't create pages that will fail quality checks.

### Sufficiency Score

Compute a score per potential page based on available data:

```typescript
function computeSufficiencyScore(record: RawRecord): number {
  let score = 0;
  const weights = {
    hasTitle: 10,
    hasDescription: 10,           // > 50 chars
    hasBodyContent: 20,           // > 200 words
    hasRealUserQuestions: 15,     // >= 3 questions sourced from real user data (support tickets, GSC queries, forums)
    hasUniqueAttributes: 15,      // >= 3 non-null structured attributes
    hasImage: 5,
    hasCategory: 10,
    hasNumericData: 10,           // stats, ratings, prices
    hasSourceCitation: 5,         // data provenance for E-E-A-T
  };

  if (record.title?.length > 10) score += weights.hasTitle;
  if (record.description?.length > 50) score += weights.hasDescription;
  if (wordCount(record.bodyContent) > 200) score += weights.hasBodyContent;
  if (record.userQuestions?.length >= 3) score += weights.hasRealUserQuestions;
  // ... etc

  return score; // 0-100
}
```

### Gating Thresholds

| Score | Action |
|-------|--------|
| 80-100 | Generate page - sufficient data |
| 60-79 | Generate page with enrichment flag - mark for content pipeline |
| 40-59 | Hold - do not generate until data is enriched |
| 0-39 | Reject - insufficient data, do not generate |

**Store the score in the database** (`data_sufficiency_score` column) so you can:
- Query how many pages are gated vs. ready
- Track enrichment progress over time
- Re-score after data enrichment
- Gate at build time: `WHERE data_sufficiency_score >= 60 AND status = 'published'`

### Combination Gating

For combination pages (service × city, product × use-case), both dimensions must have sufficient data:

```typescript
function gateCombination(dimA: RawRecord, dimB: RawRecord): boolean {
  // Both dimensions must independently clear a minimum bar
  const scoreA = computeSufficiencyScore(dimA);
  const scoreB = computeSufficiencyScore(dimB);

  // The combination itself must produce enough unique content
  // that it's not just "dimA text + dimB text" pasted together
  const combinationHasUniqueContent =
    dimA.attributes?.length >= 2 &&
    dimB.attributes?.length >= 2;

  return scoreA >= 40 && scoreB >= 40 && combinationHasUniqueContent;
}
```

**This is the most important scale pattern.** 500 services × 200 cities = 100K combinations, but maybe only 15K have enough data for a quality page. Generate only the 15K.

## 3. Content Enrichment Pipeline

At 100K pages, you can't manually write intros and descriptions. You need an automated enrichment pipeline with quality controls.

### Pipeline Architecture

```
Raw data (DB/CMS/API)
    │
    ▼
Data sufficiency scoring ──→ Reject/hold insufficient records
    │
    ▼
Automated enrichment ──→ Generate intros and summaries from structured data
    │
    ▼
Quality sampling ──→ Human reviews a random sample (5-10%) per batch
    │
    ▼
Publish gate ──→ Only records with score >= 60 and enrichment complete
    │
    ▼
Page generation
```

### Enrichment Sources (non-LLM)

Before reaching for LLM generation, exhaust structured data enrichment:

- **Template composition from multiple fields**: Combine 3+ data fields into prose. Not `"Best {service} in {city}"` but structured sentences using attributes, stats, and category context.
- **Aggregation**: Roll up child data into parent summaries (category stats, comparison tables, top-N lists)
- **Cross-referencing**: Enrich records by joining data sources (product + reviews, service + location demographics, listing + category averages)
- **Comparison data**: Auto-generate comparison sections from sibling records in the same category

### LLM-Assisted Enrichment

If structured enrichment is insufficient, LLM-assisted generation is acceptable under strict conditions:

1. **Never generate the entire page content** - LLM fills gaps in an otherwise data-driven page
2. **Always ground in real data** - the LLM prompt includes the record's actual attributes, stats, and context
3. **Human review sampling** - review 5-10% of LLM-generated content per batch before publishing
4. **Store the generation metadata** - track which fields were LLM-generated vs. sourced from data
5. **Apply quality guard after enrichment** - run pseo-quality-guard on enriched content before publishing
6. **Regenerate periodically** - stale LLM content should be refreshed when underlying data changes

**Google's position (2026):** Using generative AI is not a violation by itself, but generating many pages "without adding value for users" may violate the scaled content abuse policy, "no matter how it's created". Google asks you to manually fact-check and review all AI-generated content, including titles, meta descriptions, structured data and alt text. The Quality Rater Guidelines (Sep 2025, sections 4.6.5 and 4.6.6) rate pages Lowest when main content is auto or AI generated with little effort, originality or added value.

Two policy lines matter directly for pSEO at this scale:
- Google's AI optimization guide (2026-05-15) says creating separate pages for every query variation "or fan-out queries" primarily to manipulate rankings or AI responses violates the scaled content abuse policy. Don't generate a page per phrasing.
- The doorway policy names "substantially similar pages that are closer to search results than a clearly defined, browseable hierarchy" and pages targeting specific regions or cities that funnel users to one page. Combination gating (section 2) is the defense.

## 4. Incremental Validation

At 100K pages, full-corpus quality checks take hours. Switch to incremental validation.

### Delta Validation

Only validate pages that changed since the last validation run:

```typescript
async function getChangedPages(since: Date): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT slug FROM pages
     WHERE (last_modified > $1 OR last_validated IS NULL)
       AND status = 'published'`,
    [since]
  );
  return rows.map((r) => r.slug);
}
```

**Content hashing:** Store a hash of each page's rendered content. On validation, only re-check pages whose hash changed:

```typescript
import { createHash } from "crypto";

function contentHash(page: BaseSEOContent): string {
  const content = `${page.title}|${page.h1}|${page.metaDescription}|${page.bodyContent}`;
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}
```

### Periodic Full Scan

Run a complete validation weekly or before major releases. For the full scan at 100K:

- **Parallelize**: Run 4-8 validation workers, each processing a category partition
- **Sample cross-category similarity**: Don't compare all 100K × 100K. Compare each page against 50 random pages from other categories + all pages in the same category.
- **Stream results to disk**: Write validation results to a JSONL file, then aggregate. Don't accumulate all results in memory.

```typescript
// Parallel validation by category
const categories = await getAllCategories();
const workers = categories.map(cat =>
  validateCategory(cat.slug) // each worker handles one category
);
const results = await Promise.all(workers);
```

### Validation Budget

| Scale | Delta validation | Full validation |
|-------|-----------------|----------------|
| 10K | Minutes | 30-60 minutes |
| 50K | Minutes | 2-4 hours |
| 100K | Minutes | 4-8 hours |

**Optimization**: Pre-compute and store fingerprints (MinHash signatures) in the database. Validation then only compares fingerprints, not full content.

## 5. Crawl Budget Management

At 100K pages, Google won't crawl everything immediately. Crawl budget - the number of pages Google crawls per day - becomes a constraint.

### Sitemap Submission Strategy

```
sitemap-index.xml
├── sitemap-category-a.xml     (≤ 50,000 URLs)
├── sitemap-category-b.xml
├── sitemap-category-c.xml
└── ...
```

**Sitemap rules (Google build-sitemap doc):**
- 50,000 URLs or 50MB uncompressed per file. Search Console accepts up to 500 sitemap index files per site; an index holds up to 50,000 entries.
- Google ignores `<priority>` and `<changefreq>`. Don't emit them.
- `<lastmod>` counts only if it is consistently and verifiably accurate: the last significant change to main content, structured data or links. Store a real content-modified timestamp (`last_modified`, only bumped on significant content changes) and use it. Never `new Date()` at build time, and never bump it on every deploy.
- Next.js `generateSitemaps` serves chunks at `/sitemap/[id].xml` but does not create an index. Write the index yourself (route handler) and submit it.

**Submission cadence:**
- Submit the sitemap index to both Google Search Console and Bing Webmaster Tools
- Update individual category sitemaps as pages are added
- Add URLs in category waves rather than all 100K at once. This is operational advice (so you can verify quality and indexing per wave), not a documented Google throttle.

**Pushing URLs:**
- Google Indexing API: only JobPosting and BroadcastEvent-in-VideoObject pages (default quotas 200 publish/day, 180 metadata/min, 380/min; the quota-increase form was removed 2026-10-16). Using it for other pSEO pages is against its terms.
- IndexNow notifies Bing, Yandex, Naver, Seznam, Yep, Amazon. Google does not use it. Setup: see pseo-linking section 6.
- For standard pages on Google, rely on sitemap discovery, internal links and accurate lastmod.

**Do not write sitemaps to `public/` at runtime.** Serverless filesystems are read-only or ephemeral, and files written after build are not served. Serve per-category sitemaps from a route handler that reads the database:

```typescript
// app/sitemaps/[category]/route.ts
export async function GET(_req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params;
  const { rows } = await pool.query(
    `SELECT canonical_path, last_modified FROM pages
     WHERE category = $1 AND status = 'published' AND data_sufficiency_score >= 60
     ORDER BY slug LIMIT 50000`,
    [category]
  );
  const urls = rows
    .map((r) => `  <url><loc>${baseUrl}${r.canonical_path}</loc><lastmod>${new Date(r.last_modified).toISOString()}</lastmod></url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
```

Categories over 50,000 pages need chunked files plus the index. Index, `generateSitemaps` and lastmod rules: see pseo-linking section 6.

### Crawl Budget Optimization

Google's crawl budget doc applies mainly to sites with 1M+ pages changing weekly, 10K+ pages changing daily, or many "Discovered - currently not indexed" URLs. Budget = crawl capacity limit (host load, shared across all Google crawlers) + crawl demand. Below that, content quality and internal linking matter more than budget tuning.

- **Prioritize through structure, not `priority`**: Google ignores sitemap `priority`. Use internal links from hubs and shallow click depth to signal importance.
- **Remove low-quality pages from sitemap**: Pages with sufficiency score < 60 should not be in the sitemap
- **Fix crawl waste**: Return real 404/410 for removed or no-data pages, eliminate soft 404s, avoid redirect chains, and kill parameter-based duplicates
- **Faceted navigation**: Block facets you don't want indexed in robots.txt. For indexable facets, return 404 for empty, duplicate and nonsensical combinations at the URL itself. In Next.js 16, run the existence check before streaming starts (or in `proxy.ts`), otherwise `notFound()` yields 200 + noindex, a soft 404.
- **Use robots.txt, not noindex, to save budget**: Google still requests noindex pages. Don't use robots.txt to temporarily reallocate budget.
- **Support conditional requests**: ETag / Last-Modified and 304 responses cut crawl cost
- **HTML weight**: Googlebot fetches only the first 2MB of uncompressed HTML. Inline JSON, RSC payloads and huge tables on templates can be truncated.
- **Server response time**: Keep TTFB < 500ms. Slow servers get less crawl capacity.
- **Emergency reduction**: `Retry-After` is documented for temporarily reducing crawl load during an incident
- **Monitor crawl stats**: Check Google Search Console → Settings → Crawl stats weekly. If crawl rate drops, investigate.

### If Indexing Is Low

Google does not guarantee indexing all pages, and no primary source gives expected indexing rates. Measure the real rate per template (Page indexing report, filtered by sitemap).

1. Improve content quality on indexed pages first
2. Earn more backlinks to category hubs
3. Reduce total page count (prune thin pages) - a smaller, higher-quality corpus often indexes better than a large, mediocre one
4. Ensure internal linking reaches every page within 3 clicks
5. After fixing duplicate-content issues, Google may keep pages in a duplicate cluster for up to two weeks. Request Indexing is quota-limited, so reserve it for your most important URLs.

## 6. Monitoring at Scale

Track indexing, crawl, CWV, build and data-quality metrics with automated checks. Alert on: indexed pages dropping > 5% week over week, crawl requests dropping > 20%, 5xx/404 above 1% of pages, any template leaving "good" CWV, build time > 2x baseline, and > 20% of published pages below the sufficiency threshold.

**Important:** the Search Console API has no index-coverage or crawl-stats endpoints, and the sitemaps API `contents[].indexed` field is deprecated. Get indexed counts from the Page indexing report (UI export, filter by sitemap), crawl data from the Crawl stats UI plus seo-log-analysis, and for 100K sites use the Search Console bulk data export to BigQuery.

Full metric table, monitoring script, BigQuery setup and queries: `references/monitoring.md`.

## 7. Edge and CDN Architecture

Use the Node.js runtime with CDN caching (control page caching with `revalidate`/`cacheLife`; Next sets Cache-Control; custom `s-maxage` only on route handlers/proxy responses or a non-Vercel CDN; on-demand revalidation for changes, purge by template on template changes). Do not recommend edge runtimes: Cache Components and `proxy.ts` are Node-only. Use pooled Postgres or an HTTP driver, and Upstash Redis (Vercel Marketplace) for index-tier data. Details: `references/delivery.md`.

## 8. Scale-Specific Build Strategy

At 100K pages, the build process itself needs architecture.

### Don't Build All Pages

```typescript
// At 100K, only pre-build the most important pages
export async function generateStaticParams() {
  // Pre-build: top 1K pages by traffic (hub params live in app/[category]/page.tsx)
  const { rows: topPages } = await pool.query(
    `SELECT slug, category FROM pages
     WHERE status = 'published' AND data_sufficiency_score >= 80
     ORDER BY monthly_traffic DESC LIMIT 1000`
  );
  return topPages.map(p => ({ category: p.category, slug: p.slug }));
}

// app/[category]/page.tsx - hubs have their own generateStaticParams
export async function generateStaticParams() {
  const hubs = await getAllCategories();
  return hubs.map(h => ({ category: h.slug }));
}

// ISR handles the remaining 99K pages on first request
export const dynamicParams = true;
export const revalidate = 86400; // 24 hours
```

This segment-config form works without Cache Components. With `cacheComponents: true` (Next.js 16.4.x, use >= 16.4.1 for the security fixes; default in `create-next-app`, planned default in Next.js 17), use `"use cache"` with `cacheLife()` and `cacheTag()` on the data function instead, and note that `generateStaticParams` **must return at least one param** (an empty array is a build error; use a placeholder plus `notFound()` if needed). `ensureStatic` (needs `cacheComponents`): only `"navigation"` adds build validation and it requires `generateStaticParams` to return every param. With seeded params and on-demand rest, `ensureStatic` validates nothing, so do not rely on it there. `revalidateTag` now takes a cache-life profile as its second argument; `updateTag()` is for read-your-writes in Server Actions.

**Status codes for long-tail ISR pages:** streaming responses start with 200. If a not-found check runs after streaming begins, the page is 200 + noindex (soft 404 risk). Verify the record exists before any Suspense fallback or `loading.tsx` renders. Next.js 16.3's instant loading shell for non-prerendered URLs has the same caveat.

### Build Time Budget and Warm-Up

Never pre-build more than a few thousand pages: Vercel caps builds at 45 minutes per deployment on all plans. Use ISR or on-demand rendering for the rest. Build time table and the post-deploy cache warm-up script: `references/delivery.md`. Vercel cost tuning: `references/vercel-optimization.md`.

## Checklist

- [ ] Database is the primary data store (not JSON files or in-memory arrays)
- [ ] Required indexes exist on slug, category, status, last_modified, sufficiency_score
- [ ] Data sufficiency scoring is implemented and stored per page
- [ ] Pages with score < 60 are gated from generation
- [ ] Combination pages are gated on both dimensions
- [ ] Content enrichment pipeline exists (structured data first, LLM-assisted only with review)
- [ ] Incremental validation is implemented (delta + periodic full scan)
- [ ] Content hashes are stored for change detection
- [ ] Sitemap is split by category with a hand-written index file (Next.js `generateSitemaps` does not create one)
- [ ] Sitemap has no `priority`/`changefreq`, and `lastmod` is a verifiable content-modified date
- [ ] Empty/no-data combination URLs return a real 404 before streaming starts
- [ ] Sitemap excludes pages below sufficiency threshold
- [ ] Crawl budget is monitored via Search Console
- [ ] Monitoring script runs daily with alerts (`references/monitoring.md`)
- [ ] Sitemaps are served from route handlers, not files written at runtime
- [ ] CDN caching is configured with appropriate TTLs
- [ ] ISR handles the long tail (only top pages pre-built, build stays under Vercel's 45 min limit)
- [ ] Cache warm-up script exists for post-deploy
- [ ] Connection pooling is configured for build-time queries
- [ ] No function loads > 10K full page records into memory

## Verify

Build, start the app, and run seo-regression-guard against localhost (`npx -y tsx <seo-regression-guard-dir>/scripts/seo-check.ts --site http://localhost:3000 ...`). Zero errors for touched templates, sitemap routes and robots.

## Relationship to Other Skills

- **Extends**: pseo-data (replaces in-memory patterns with database), pseo-performance (adds CDN/edge and scale-specific build strategy), pseo-quality-guard (adds incremental validation)
- **Depends on**: All content and structure skills must be in place before scaling
- **Validated by**: pseo-quality-guard (quality doesn't change - scale does)
- **Works with**: pseo-orchestrate (scale considerations at every phase)
