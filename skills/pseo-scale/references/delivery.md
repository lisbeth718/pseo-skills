# Edge, CDN and Build Budget (pseo-scale sections 7 and 8)


At 100K pages, the origin server can't handle all traffic directly.

### Caching Strategy

```
Client → CDN Edge → Origin (Next.js/framework)
              ↓
         Cache Layer (Redis/edge KV)
              ↓
           Database
```

**CDN configuration:**
- Cache all pSEO pages at the edge. Control page caching with `revalidate`/`cacheLife` (Next sets Cache-Control); custom `s-maxage` only on route handlers/proxy responses or a non-Vercel CDN
- Use ISR revalidation to refresh cached pages (not full rebuilds)
- Set longer TTLs for stable pages (30 days), shorter for dynamic data pages (1 day)

**Cache invalidation:**
- On data change → invalidate the specific page's cache via on-demand revalidation API
- On category change → invalidate all pages in the category
- On template change → purge the CDN for all pages of that template type

**Runtime: use Node.js plus CDN caching.** Do not recommend edge runtimes for pSEO pages:
- Cache Components and `proxy.ts` are Node-only. In Next.js 16, `proxy.ts` replaces `middleware.ts` and runs on Node.js.
- Node functions placed next to the database beat edge functions that need a remote DB round trip.
- Get low TTFB from CDN caching (ISR, `s-maxage`), not from edge compute.

### Database Connection and Index-Tier Cache

- Pooled Postgres (pgbouncer / provider pooler) or an HTTP-based driver (Neon serverless driver) from Node functions.
- **Upstash Redis via the Vercel Marketplace** or Cloudflare KV for index-tier data, with the database as source of truth.
- Pre-generated JSON at build time for small index-tier data, database only for full page content.


## Build Time Budget

| Pages pre-built | Expected build time | Memory |
|----------------|-------------------|--------|
| 1K (hubs + top pages) | 5-15 minutes | 2-4GB |
| 5K | 15-45 minutes | 4-6GB |
| 10K | 30-90 minutes | 6-8GB |
| 100K (DON'T DO THIS) | 5-15 hours | 16GB+ |

**Rule: Never pre-build more than a few thousand pages.** Vercel caps builds at 45 minutes per deployment on all plans, so the 10K row above is out of reach there. Use ISR or on-demand rendering for everything else.

For Vercel-specific cost optimization (build minutes, function costs, preview deploys), see vercel-optimization.md (same folder).

### Warm-Up After Deploy

After deploying, the ISR cache is cold. The first visitor to each page triggers generation. For critical pages:

```typescript
// scripts/warm-cache.ts - run after deploy
async function warmCache() {
  const { rows: priorityPages } = await pool.query(
    `SELECT canonical_path FROM pages
     WHERE data_sufficiency_score >= 80 AND status = 'published'
     ORDER BY monthly_traffic DESC LIMIT 5000`
  );

  // Hit each page to trigger ISR generation (rate-limited)
  for (const page of priorityPages) {
    await fetch(`${baseUrl}${page.canonical_path}`);
    await sleep(100); // 10 pages/second - don't DDoS yourself
  }
}
```

