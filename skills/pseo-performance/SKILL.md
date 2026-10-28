---
name: pseo-performance
description: Optimize a programmatic SEO application for Core Web Vitals, build performance, and scalability at 1000+ pages, including static generation, incremental regeneration, bundle optimization, and caching. Use when builds are slow, pages are large, Core Web Vitals scores are poor, or when scaling to many pages causes performance issues.
argument-hint: "[focus: all | build | cwv | bundle | caching]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
---

# pSEO Performance Optimization

Optimize the application for fast builds, excellent Core Web Vitals, and reliable performance at 1000+ page scale.

## Scope parameter

| Value | Sections |
|---|---|
| `build` | 1, 2, 7, 8 |
| `cwv` | 3, 6, 9 |
| `bundle` | 4 |
| `caching` | 5 |
| `all` | everything |

## Core Principles

1. **Static first**: Pre-render as many pages as possible at build time
2. **Incremental where needed**: Use ISR for pages that change frequently
3. **Minimal JavaScript**: Pages should be functional with minimal client-side JS
4. **Image optimization**: All images processed, sized, and lazy-loaded
5. **Cache aggressively**: Cache data fetches, API calls, and rendered output

## Optimization Areas

### 1. Static Generation Strategy

Choose the right rendering strategy for scale:

| Page Count | Strategy | Implementation |
|-----------|----------|----------------|
| < 500 | Full SSG | Generate all pages at build time |
| 500-5000 | SSG + ISR | Generate high-traffic pages at build, ISR for rest |
| 5000+ | ISR + on-demand | Generate on first request, revalidate periodically |

**Next.js App Router (without Cache Components, Next.js 15 style and still valid in 16):**
```typescript
// Generate most important pages at build time
export async function generateStaticParams() {
  const topPages = await getTopPages(500);
  return topPages.map((p) => ({ slug: p.slug }));
}

// ISR for the rest
export const revalidate = 86400; // 24 hours
```

**Next.js 16.4.x (>= 16.4.1 for security fixes) with Cache Components** (`cacheComponents: true`, enabled by default in `create-next-app` from 16.4, planned default in Next.js 17). Caching is opt-in via `"use cache"`, and dynamic is the default:
```typescript
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  // With Cache Components this MUST return at least one param.
  // An empty array is a build error.
  const topPages = await getTopPages(500);
  return topPages.map((p) => ({ slug: p.slug }));
}

async function getPage(slug: string) {
  "use cache";
  cacheLife("days");
  cacheTag(`page:${slug}`);
  return fetchSinglePage(slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; // params is async-only in Next.js 16
  const page = await getPage(slug);
  if (!page) notFound(); // see "Status codes with streaming" below
  return <PageView page={page} />;
}
```
- If you can't list any real params, return one placeholder param and call `notFound()` for it (the documented workaround).
- `ensureStatic` (requires `cacheComponents`): only `"navigation"` adds build validation (the build fails if dynamic content sneaks in), and it requires `generateStaticParams` to return every param. `"shell"` and `"prefetch"` add no build validation. With seeded params and on-demand rest, do not claim `ensureStatic` validates anything. Details: https://github.com/lisbeth718/pseo-skills/blob/main/docs/research-2026-10.md (section 11.4).
- Invalidate with `revalidateTag(tag, profile)` (a cache-life profile is required in Next.js 16), `updateTag(tag)` for read-your-writes in Server Actions, or `refresh()`.
- Turbopack is the default bundler in Next.js 16. `next build` no longer runs lint, so run your linter in a pre-push or post-build step.
- Next.js 16.3 added a better ISR path: URLs omitted from build-time prerendering can serve an instant loading shell to the first visitor. Mind the status-code caveat below.

**Fallback handling:**
- Prefer a fallback that keeps the HTML meaningful for crawlers, not an empty shell
- Return `notFound()` for genuinely invalid slugs
- Without Cache Components, `dynamicParams = true` allows ISR for pages not in `generateStaticParams`, and `dynamicParams = false` makes unlisted params 404

**Status codes with streaming:** a streamed response starts with HTTP 200. If `notFound()` runs after streaming has begun (inside a Suspense boundary, or after `loading.tsx` renders), Next.js returns 200 with an injected `<meta name="robots" content="noindex">`, and Google may report a soft 404. For "no data for this combination" pages, check existence before any Suspense fallback renders, or return the 404 from `proxy.ts` (the Next.js 16 replacement for `middleware.ts`).

**Metadata placement:** `generateMetadata` output can be streamed into `<body>` for JS-executing bots. Google's canonical docs specify `<head>`. Keep canonical and robots metadata static or `use cache` so it lands in the head shell, or force head placement with `htmlLimitedBots: /.*/`. (This is a recommendation, not a Google statement.)

**HTML size:** Googlebot for Search fetches only the first 2MB of uncompressed HTML (64MB for PDF), and each CSS/JS file has its own limit. Inline JSON, large RSC payloads and giant tables can push content past the cutoff and get it truncated. Keep key content, canonical, meta and links near the top, and check the uncompressed size of your heaviest template.

### 2. Build Performance

For builds with many pages:

- **Fetch index-tier data once; full page data per page.** Parallelize within a page, not by loading the whole corpus
- **Memoize data access**: `React.cache()` only dedupes within one render/request. For build-wide reuse use a module-level memoized promise, or `"use cache"`
- **Limit build concurrency**: If the build server has limited memory, configure worker limits
- **Incremental builds**: Use ISR to avoid rebuilding all pages on every deploy
- **Monitor build time**: Track build duration and set alerts for regressions

```typescript
// Memoize INDEX-TIER data at module level (lightweight: slug, title, category)
// NEVER cache full page content this way - see section 7 Memory Management
let indexPromise: Promise<PageIndex[]> | undefined;

export function getAllIndexData(): Promise<PageIndex[]> {
  // PageIndex[] (~1KB per page) - safe to hold in memory. One fetch per process.
  indexPromise ??= fetchAllIndexDataFromSource();
  return indexPromise;
}
// With Cache Components, an async function with "use cache" + cacheLife() works too.
```

### 3. Core Web Vitals

Thresholds are assessed on field data at the 75th percentile, split by mobile and desktop. They are unchanged: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1. Lab tools (Lighthouse, PageSpeed lab run) help debug but do not decide; do not set lab targets such as "3s on 3G".

**Experimental soft-navigation CWV (2026-10-13):** CrUX now exposes `experimental_largest_contentful_paint_with_softnavs`, `experimental_interaction_to_next_paint_with_softnavs` and `experimental_cumulative_layout_shift_with_softnavs` per URL (BigQuery, CrUX API, CrUX History API). Stable CWV and Search Console are unchanged; Google aims to graduate them in May 2027, after which Search Console switches to them. Client navigations between template pages will then count per URL. The `web-vitals` library v6 can track soft navigations in RUM.

**Measure field data per template:**
- Search Console Core Web Vitals report: groups URLs by similar pages; use it to find which template fails.
- CrUX API for a URL or origin (only URLs/origins with enough traffic return data; 404 means no data):

```typescript
const res = await fetch(
  `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${process.env.CRUX_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: "https://example.com/category/sample-page", // or { origin: "https://example.com" }
      formFactor: "PHONE",
      metrics: ["largest_contentful_paint", "interaction_to_next_paint", "cumulative_layout_shift"],
    }),
  }
);
const { record } = await res.json();
const lcpP75 = record.metrics.largest_contentful_paint.percentiles.p75;
```

- CrUX History API (`https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord`, same body) returns weekly time series; use it to confirm a template fix moved the 75th percentile.
- Sample 5-10 URLs per template; a template with no URL-level data falls back to origin data.

**Largest Contentful Paint (LCP) < 2.5s:**
- Use `next/image` or equivalent for all images (automatic sizing, WebP, lazy loading)
- Preload the LCP image with the `preload` prop (Next 16; `priority` is deprecated since v16.0.0, and the docs recommend `loading="eager"` or `fetchPriority="high"` in most cases) or `<link rel="preload">`
- Minimize render-blocking CSS; inline critical CSS
- Serve from a CDN with edge caching

**Cumulative Layout Shift (CLS) < 0.1:**
- Set explicit `width` and `height` on all images and embeds
- Reserve space for dynamic content with CSS (min-height, aspect-ratio)
- Never inject content above the fold after initial render
- Use `font-display: swap` with size-adjusted fallback fonts

**Interaction to Next Paint (INP) < 200ms:**
- Minimize client-side JavaScript
- Defer non-critical scripts
- Avoid long tasks in event handlers
- Use `React.lazy()` for below-fold interactive components

### 4. Bundle Optimization

- **Analyze the bundle**: Run the framework's bundle analyzer
- **Tree-shake unused code**: Ensure imports are specific, not barrel imports
- **Code split by route**: Each page route should have its own chunk
- **Externalize large dependencies**: Move heavy libraries to CDN or dynamic imports
- **Remove unused dependencies**: Audit `package.json` for dead dependencies

```bash
# Next.js bundle analysis
# @next/bundle-analyzer is webpack-only: Next 16 builds with Turbopack by default,
# so run it with the webpack flag (or use Turbopack's own analyzer if your version ships one)
ANALYZE=true next build --webpack
```

### 5. Caching Strategy

**Build-time caching:**
- Cache data source responses during build
- Use file-system or in-memory caching for computed values
- Cache static assets with immutable headers

**Runtime caching:**
- Set `Cache-Control` headers for static pages (e.g., `s-maxage=86400, stale-while-revalidate`)
- Use ISR revalidation to keep cached pages fresh
- Cache API responses with appropriate TTLs

**CDN caching:**
- Deploy behind a CDN (Vercel, Cloudflare, etc.)
- Configure cache keys to avoid unnecessary invalidation
- Use stale-while-revalidate for non-critical freshness

### 6. Image Optimization

- Use the framework's image component (next/image, etc.)
- Serve images in WebP/AVIF format
- Implement responsive `srcSet` for different viewports
- Lazy load below-fold images
- Set explicit dimensions to prevent layout shift
- Use a CDN image optimizer for dynamic images

### 7. Memory Management at Scale

Node.js default heap is ~1.5GB. At 1000+ pages with rich content, builds will OOM without explicit memory management.

**Increase Node.js heap when needed:**
```bash
# In build script or CI
NODE_OPTIONS="--max-old-space-size=4096" next build
```

**Limit build worker concurrency:**
```javascript
// next.config.js
module.exports = {
  experimental: {
    workerThreads: true,
    cpus: 2, // limit parallel workers to reduce total memory
  },
};
```

**Split data loading into light and heavy tiers:**
- **Index data** (slug, title, category, lastModified) - safe to hold all in memory. ~1KB per page = ~1MB for 1000 pages.
- **Full page data** (body content, FAQs, images) - load per-page, never cache the full set. ~50-500KB per page = 50MB-500MB for 1000 pages. This will OOM at scale if cached.

```typescript
// GOOD: Load full data per page
export async function getPageData(slug: string) {
  return fetchSinglePage(slug); // loads ~100KB, GC'd after render
}

// BAD: Cache all full data in memory
const ALL_DATA = await fetchAllPages(); // 500MB+ in memory for entire build
```

**Image processing concurrency:**
- Process images in batches, not all at once
- Use `sharp`'s built-in concurrency limiter: `sharp.concurrency(1)`
- If using `next/image` with remote images, limit simultaneous optimizations

**ISR cache eviction:**
- Next.js ISR caches rendered pages in memory (or disk). At 10,000+ pages, configure:
  - Disk-based cache (default in recent Next.js versions)
  - Set top-level `cacheMaxMemorySize: 0` to disable the in-memory cache entirely if memory-constrained
  ```javascript
  // next.config.js
  module.exports = {
    cacheMaxMemorySize: 0, // rely on disk cache only
  };
  ```

**Sitemap generation:**
- Google's limits are 50,000 URLs or 50MB uncompressed per sitemap file. Split into chunks of 10,000-50,000 URLs and stream the XML rather than building the full array in memory
- Next.js `generateSitemaps` does not create a sitemap index. Write the index yourself (see pseo-linking section 6)
- Don't emit `changefreq` or `priority` (Google ignores them). Set `lastmod` only from a real content-modified timestamp, never `new Date()` at build time

**Monitor memory during builds:**
```bash
# Track peak memory usage
/usr/bin/time -v next build  # Linux
/usr/bin/time -l next build  # macOS
```

### 8. Rollout Strategy and Publication Velocity

Google documents no publication-speed signal, and no primary source says a fast publish rate is penalized by itself. The risk is quality: Google's spam policies target many pages created mainly to rank without adding value (scaled content abuse), and a large batch of thin pages hurts the site-wide quality presumption ("individual pages (including new pages) match the overall quality of other pages on the domain"). Roll out gradually for operational reasons: you can catch template bugs, check indexing, and watch quality before committing the whole corpus. Treat the table below as operational advice, not a Google rule.

**Rollout strategy for new pSEO pages:**

| Page Count | Rollout Strategy |
|-----------|-----------------|
| < 100 | Deploy all at once, low risk |
| 100-1K | Deploy over 1-4 weeks in batches of 50-200 |
| 1K-10K | Deploy over 4-8 weeks in batches; validate indexing and ranking quality per batch |
| 10K+ | ISR-only (don't pre-build). Submit sitemaps in category waves. Use data sufficiency gating to exclude thin pages. See **pseo-scale** for the full strategy |

These tiers are an operational heuristic, shared with pseo-scale, not a Google rule.

**Implementation approaches:**

- **ISR with gradual seeding**: Generate pages on-demand via ISR but add URLs to the sitemap in batches
- **Feature flag by category**: Launch one category at a time, monitor impact before launching the next
- **Draft/published status**: Mark pages as draft in the data layer, publish in batches by flipping status

**Monitor between batches:**
- Search Console: indexing status, manual actions, coverage issues ("Discovered - currently not indexed" trends)
- Organic traffic: are existing pages maintaining rankings?
- Crawl stats: is Googlebot crawling the new pages?
- Core Web Vitals: are new pages performing well?
- Spam updates are frequent and short (four in 2026 so far); check for movement after each

**Do NOT:**
- Publish thousands of pages in a single deploy without a quality check and a way to pull them back
- Bulk-submit URLs with Request Indexing or the URL Inspection API. Request Indexing is quota-limited (reserve it for your most important URLs), and the URL Inspection API allows 2,000 requests/day and 600/min per site
- Use the Indexing API (JobPosting and BroadcastEvent only) or IndexNow (does not include Google) as a Google submission shortcut
- Create all pages and then remove them quickly if they don't rank (low-quality churn). If you must remove them, return 404/410, not soft 404s

### 9. Font Optimization

- Self-host fonts (or use `next/font`)
- Subset fonts to required character sets
- Use `font-display: swap` or `optional`
- Preload the primary font file

## Performance Checklist

- [ ] Field data (CrUX / Search Console CWV report) checked per template; no template in the "poor" group
- [ ] LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 at the 75th percentile (mobile and desktop)
- [ ] Build completes in reasonable time at current page count
- [ ] Build peak memory stays within server limits (check with `/usr/bin/time`)
- [ ] No full-dataset loading in memory (two-tier data pattern used)
- [ ] Bundle size per page < 200KB JS (compressed)
- [ ] Images use next-gen formats (WebP/AVIF)
- [ ] Cache-Control headers are set for all static assets
- [ ] No unused JavaScript in production bundle
- [ ] Rollout plan exists for 100+ new pages (batches with quality and indexing checks)
- [ ] Uncompressed HTML of the heaviest template is well under Googlebot's 2MB limit
- [ ] "No data" pages return a real 404 before streaming starts (not 200 + noindex)
- [ ] Search Console monitoring is configured between deployment batches

## Verify

Build, start the app, and run seo-regression-guard against localhost (`npx -y tsx <seo-regression-guard-dir>/scripts/seo-check.ts --site http://localhost:3000 ...`). Zero errors for touched templates, then confirm the heaviest template's uncompressed HTML size.

## Relationship to Other Skills

- **Optimizes**: pseo-templates (rendering strategy), pseo-data (fetch performance)
- **Independent of**: pseo-metadata, pseo-schema, pseo-linking (these are typically lightweight)
- **Extended by**: pseo-scale (CDN/edge architecture, build strategy at 100K, cache warm-up, crawl budget, Vercel cost optimization)
- **Validated by**: Lighthouse, WebPageTest, or framework-specific performance tools
