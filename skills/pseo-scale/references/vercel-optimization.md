# Vercel Build & Cost Optimization for pSEO at Scale

Large pSEO sites (10K-100K+ pages) can generate massive Vercel bills through build time, function invocations, and bandwidth. This reference covers practical strategies to minimize costs while maintaining performance.

## Understanding Vercel Cost Drivers

| Cost Factor | What Drives It | Impact at Scale |
|-------------|---------------|-----------------|
| Build minutes | Pages pre-built via SSG | 100K SSG pages = 5-15 hours build = $$$$ |
| Function duration | ISR revalidation, API routes | 100K ISR pages × 1s avg = 100K function-seconds/day |
| Function invocations | Each ISR page hit on cold cache | First visitor to each page = 1 invocation |
| Bandwidth | Page weight × pageviews | Large pages + high traffic = expensive |
| Proxy / middleware | Runs on every request (`proxy.ts` in Next.js 16, replaces `middleware.ts`) | Complex logic = per-request cost |

**The core insight**: Pre-building pages costs build minutes. Not pre-building costs function invocations. The optimal strategy depends on traffic patterns.

## Hard Limits That Shape the Architecture

From Vercel's limits page (updated 2026-09-16):

- **Build time: 45 minutes per deployment, all plans.** Prerendering huge pSEO sets at build will hit this wall. Use ISR or on-demand rendering with a small seed set.
- **2,048 routes per deployment**, and `vercel.json` rewrites, redirects and headers count toward it. Use pattern-based redirects, not one rule per URL.
- Static file upload via CLI: 100MB (Hobby) or 1GB (Pro).
- Build cache: 1.5-4.75GB depending on machine.
- Runtime logs are kept 1 hour (Hobby) or 1 day (Pro). Ship logs elsewhere if you need crawl analysis.

## ISR-First Architecture (Recommended for 10K+)

Never pre-build more than you need. Use ISR as the default and SSG only for high-traffic pages.

### Tiered Pre-build Strategy

```typescript
// app/[category]/[slug]/page.tsx
export async function generateStaticParams() {
  // Tier 1: Always pre-build (high traffic, low count)
  // - Hub/category pages
  // - Top 100-500 pages by traffic
  // - Homepage, about, contact

  // Tier 2: Optionally raise the production tier if build time allows
  // - Top 1000-2000 pages

  // Tier 3: Never pre-build (ISR only)
  // - Long-tail pages (the other 98K)

  const tier = process.env.VERCEL_ENV === 'production'
    ? 500   // raise only if the build stays well under the 45 minute limit
    : 50;   // minimal for preview deploys

  const topPages = await db.query(`
    SELECT slug, category FROM pages
    WHERE status = 'published'
    ORDER BY monthly_traffic DESC
    LIMIT $1
  `, [tier]);

  return topPages.map(p => ({
    category: p.category,
    slug: p.slug
  }));
}

export const dynamicParams = true; // Allow ISR for non-pre-built pages
export const revalidate = 86400;   // 24h default, tune per page type
```

This is the segment-config form, valid without Cache Components. With `cacheComponents: true` (default in `create-next-app` from Next.js 16.4, planned default in Next.js 17):
- `generateStaticParams` **must return at least one param**. An empty array is a build error. Return a placeholder param and call `notFound()` for it if you have no real seed set.
- Cache data with `"use cache"`, `cacheLife()` and `cacheTag()` instead of `revalidate`/`unstable_cache`.
- `export const ensureStatic = "shell"` fails the build if dynamic content sneaks into a template route.
- Check that a missing record 404s before streaming starts (before any Suspense fallback or `loading.tsx`). After streaming begins, `notFound()` yields 200 + `noindex`, which Google may treat as a soft 404.

### Preview Deploy Optimization

Preview deploys should NEVER build your full page corpus:

```typescript
// Only build 10-50 pages for preview deploys
const isPreview = process.env.VERCEL_ENV === 'preview';
const limit = isPreview ? 10 : 500;
```

This alone can cut preview build times from 30+ minutes to 2-3 minutes.

## On-Demand Revalidation (Best Cost/Freshness Balance)

Instead of time-based ISR revalidation, trigger revalidation only when data actually changes.

### API Route for On-Demand Revalidation

```typescript
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.REVALIDATION_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path, tag, type = 'path' } = await request.json();

  if (type === 'tag' && tag) {
    // Revalidate all pages with this cache tag.
    // Next.js 16: revalidateTag requires a cache-life profile as 2nd argument.
    // (Use updateTag(tag) instead inside Server Actions for read-your-writes.)
    revalidateTag(tag, 'max');
    return NextResponse.json({ revalidated: true, tag });
  }

  if (path) {
    // Revalidate specific path
    revalidatePath(path);
    return NextResponse.json({ revalidated: true, path });
  }

  return NextResponse.json({ error: 'Missing path or tag' }, { status: 400 });
}
```

### Webhook Integration

```typescript
// Trigger from CMS/database webhooks
// POST /api/revalidate
// Body: { "path": "/services/plumbing/new-york" }

// Or revalidate by category tag
// Body: { "type": "tag", "tag": "category:plumbing" }
```

### Cost Impact

| Strategy | Revalidations/day (100K pages) | Function invocations |
|----------|-------------------------------|---------------------|
| ISR revalidate=3600 (1h) | ~2.4M | High cost |
| ISR revalidate=86400 (24h) | ~100K | Moderate |
| On-demand only | Only changed pages | Minimal |

**Use on-demand revalidation for data-driven pages.** Set `revalidate = false` and trigger revalidation via API when data changes.

## Static Export (Zero Function Cost)

For sites where data changes infrequently, consider full static export:

```javascript
// next.config.js
module.exports = {
  output: 'export',
  // Images must be pre-optimized or use external optimizer
  images: {
    unoptimized: true, // or use Cloudinary/Imgix
  },
};
```

### When Static Export Makes Sense

- Data updates less than daily
- < 50K pages (build time still manageable)
- Can tolerate 10-60 minute deploy lag for updates
- Want to host on cheaper static hosting (S3, Cloudflare Pages)

### Hybrid Approach

Static export the long-tail, dynamic for frequently-changing pages:

```
Main app (Vercel, ISR):
  /                        # homepage
  /[category]              # category hubs
  /api/*                   # API routes
  /blog/*                  # frequently updated

Static subdomain (S3/Cloudflare):
  static.example.com/[category]/[slug]  # 100K pSEO pages
```

## Function Optimization

### Reduce Function Duration

Every millisecond costs money. Optimize data fetching:

```typescript
// BAD: Sequential queries
const page = await getPage(slug);
const related = await getRelatedPages(slug);
const category = await getCategory(page.category);

// GOOD: Parallel queries
const [page, related] = await Promise.all([
  getPage(slug),
  getRelatedPages(slug),
]);
// category data embedded in page query

// BETTER: Single optimized query
const pageWithRelated = await getPageWithRelated(slug);
```

### Function Region Optimization

Set the function region in `vercel.json` (see Vercel's function region docs) so functions run next to your database:

```json
{
  "regions": ["iad1"]
}
```

Or use `export const runtime = 'edge'` for pages that can run on the edge (no Node.js dependencies). Check compatibility with your Next.js version and Cache Components setting first.

### Reduce Cold Starts

```typescript
// Keep database connections warm
// Use connection pooling (Prisma, pg-pool)
// Minimize dependencies in page routes

// Move heavy initialization outside request path
const db = new Pool({ /* config */ }); // Module-level, not per-request
```

## Caching Strategies

### Aggressive Data Caching

```typescript
import { unstable_cache } from 'next/cache';

// Without Cache Components: cache expensive data layer calls
export const getCachedPage = (slug: string) =>
  unstable_cache(
    async () => getPageFromDB(slug),
    ['page-data', slug],
    {
      revalidate: 86400,      // 24h
      tags: [`page:${slug}`], // Enable targeted invalidation
    }
  )();

// Cache index data more aggressively
export const getCachedCategories = unstable_cache(
  async () => getAllCategories(),
  ['categories'],
  { revalidate: 604800 }    // 7 days
);
```

With Cache Components (`cacheComponents: true`), use the `"use cache"` directive instead:

```typescript
import { cacheLife, cacheTag } from 'next/cache';

export async function getCachedPage(slug: string) {
  'use cache';
  cacheLife('days');
  cacheTag(`page:${slug}`);
  return getPageFromDB(slug);
}
```

### CDN Cache Headers

Next.js and Vercel set `Cache-Control` for ISR and cached pages themselves, and a `Cache-Control` set via `headers()` in `next.config` is overwritten for pages in production. Control page caching with `revalidate` (or `cacheLife` with Cache Components) instead.

Set a custom `Cache-Control` only for route handlers or proxy responses, for example:

```typescript
// app/api/data/route.ts
export async function GET() {
  return Response.json(await getData(), {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
```

Header rules in config count toward the 2,048-routes-per-deployment limit, so use one pattern rule, not one per URL.

## Build Size Optimization

### Analyze What's Causing Large Builds

```bash
# See what's being bundled
ANALYZE=true next build

# Check function sizes
vercel inspect <deployment-url>
```

### Reduce Page Data Size

```typescript
// BAD: Passing full database records to page
export async function generateStaticParams() {
  const allPages = await db.query('SELECT * FROM pages'); // 500KB per page
  return allPages;
}

// GOOD: Minimal data for static params
export async function generateStaticParams() {
  const slugs = await db.query('SELECT slug, category FROM pages'); // 50B per page
  return slugs;
}
```

### External Data at Runtime

Don't embed large datasets in the build:

```typescript
// BAD: Importing 10MB JSON at build time
import allProducts from '@/data/products.json';

// GOOD: Fetch at runtime or use database
const products = await fetch(`${process.env.API_URL}/products`);
```

## Monitoring & Alerts

### Track Build Costs

```bash
# In CI/CD pipeline
echo "Build completed"
echo "Pages generated: $(find .next/server/app -name '*.html' | wc -l)"
echo "Build duration: $SECONDS seconds"
```

### Vercel Usage Monitoring

Set up alerts for:
- Build minutes approaching plan limit
- Function duration spikes
- Bandwidth anomalies

```typescript
// scripts/check-vercel-usage.ts
// Run weekly to track trends
const usage = await fetch('https://api.vercel.com/v1/usage', {
  headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
});
```

## Cost Comparison: Strategies at Scale

For a 100K page pSEO site with 1M monthly pageviews:

| Strategy | Build Time | Monthly Cost (est.) | Freshness |
|----------|-----------|---------------------|-----------|
| Full SSG | 5-15 hours | $200-500 (builds) | Deploy-time |
| SSG top 1K + ISR rest | 15-30 min | $50-150 | Hourly-daily |
| ISR-only + on-demand | 2-5 min | $30-80 | Real-time |
| Static export + rebuild | 2-4 hours | $20-50 | Daily |
| Hybrid (static + dynamic) | 5-10 min | $40-100 | Mixed |

**Recommended for most pSEO sites**: SSG top 500-1K pages + ISR with on-demand revalidation for the rest.

## Quick Wins Checklist

- [ ] Preview deploys build < 50 pages
- [ ] Production builds < 2K pre-built pages and well under the 45 minute build limit (use ISR for rest)
- [ ] `vercel.json` redirects/rewrites/headers are pattern-based (2,048 routes per deployment limit)
- [ ] `revalidate` is set to 24h+ or `false` with on-demand revalidation (or `cacheLife`/`cacheTag` with Cache Components)
- [ ] `generateStaticParams` returns at least one param if Cache Components is on
- [ ] Data queries are parallelized and cached
- [ ] No large JSON imports at build time
- [ ] Function bundle size < 1MB per route
- [ ] Edge runtime used where possible
- [ ] Page caching controlled via revalidate/cacheLife; custom Cache-Control only on route handlers
- [ ] Database connections are pooled
- [ ] Build analytics tracked in CI
