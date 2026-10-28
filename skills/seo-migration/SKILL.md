---
name: seo-migration
description: Plan and execute SEO-safe site migrations - URL structure changes, domain moves, framework or platform replatforms, HTTP to HTTPS, and merging sites - with redirect maps, Next.js redirects at scale, Change of Address, monitoring and rollback. Use when changing URLs, moving domains, rebuilding a site on a new stack, or consolidating multiple sites.
argument-hint: "[phase: all | inventory | redirect-map | implement | launch | monitor | rollback]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, WebFetch
---

# SEO Migration

Move URLs without losing indexing, rankings or backlink value. Source: [site moves with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

## Scope parameter

| Value | Sections |
|---|---|
| `inventory` | Phase 1 |
| `redirect-map` | Phase 2 |
| `implement` | Phase 3 |
| `launch` | Phases 4 and 5 |
| `monitor` | Phase 6, Timeline Expectations |
| `rollback` | Rollback Plan |
| `all` (default) | everything |

## Core Principles

1. **Every old URL that had value maps 1:1 to its closest new equivalent** with a server-side permanent redirect (301 or 308)
2. **One change at a time**: do not combine a domain move, redesign, URL restructure and content rewrite, or you cannot diagnose drops
3. **No chains, no loops**: old URL goes straight to the final URL
4. **No mass-redirect to the home page**: irrelevant targets are treated as soft 404s and pass nothing
5. **Measure before and after**: a baseline is the only way to know if the migration worked
6. **Reversible**: keep the old site and a rollback path until metrics stabilize

## Migration Types

| Type | Change of Address | Notes |
|---|---|---|
| URL structure / path change | No | Redirects + sitemap |
| Domain or subdomain move | Yes (old site) | Verify all variants, redirects site-wide |
| HTTP to HTTPS, www toggle | No | Redirect + canonicals + GSC property for new variant |
| Platform / framework change (URLs unchanged) | No | Verify rendering parity, keep URLs identical |
| Merge sites | Only if a whole domain goes away | Map each section to its closest page on the target |
| Add locale prefixes | No | See seo-i18n |

## Phase 1: Pre-Migration Inventory

Build the full list of old URLs from several sources, since no single one is complete:

1. **Crawl** the live site (Screaming Frog, or `Glob`/data layer for pSEO: every route the generator can emit)
2. **Sitemaps** (all of them, including image/video)
3. **GSC**: Performance export (all pages with impressions, last 16 months), Pages report (indexed list), Links report (top linked pages)
4. **Analytics**: landing pages with sessions/conversions
5. **Backlinks**: Ahrefs/Semrush/GSC export of linked URLs
6. **Server logs**: URLs Googlebot actually requests, plus non-HTML assets (images, PDFs, JS, CSS)

Record per URL: status, canonical, indexed Y/N, clicks, impressions, referring domains, conversions, title, H1. Rank by value. High-value URLs get manually reviewed mappings.

Baseline before launch: indexed page count, clicks/impressions by section, top 100 keyword positions, crawl stats, Core Web Vitals.

## Phase 2: Redirect Map

Columns: `old_url, new_url, type (301|308|410), reason`.

Rules:
- Exact equivalent exists: redirect to it (301/308; both are permanent, 308 preserves method)
- Page merged: redirect to the page that now holds the content
- No equivalent and no value: return 410 or 404, not a redirect to home
- Normalize first: protocol, host, trailing slash, case, query params. Map the final canonical form only, and let normalization be a separate one-hop rule only if it cannot be folded into the map
- Flatten chains: resolve `A -> B -> C` into `A -> C` and `B -> C`
- Preserve query strings that affect content; drop tracking params

Generate programmatically for pSEO. Rule-based patterns cover most URLs, a lookup table covers exceptions:

```typescript
// scripts/build-redirect-map.ts
const rules: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^\/guides\/([^/]+)$/, (m) => `/learn/${m[1]}`],
];

export function resolve(oldPath: string, exceptions: Map<string, string>) {
  if (exceptions.has(oldPath)) return exceptions.get(oldPath)!;
  for (const [re, fn] of rules) { const m = oldPath.match(re); if (m) return fn(m); }
  return null; // 410/404 - decide deliberately
}
```

Validate the map in CI: every target returns 200 on the new site, no target is itself a source, no duplicates, no loops, chain depth 1.

## Phase 3: Next.js Redirects at Scale

| Scale | Approach |
|---|---|
| Up to a few hundred | `redirects()` in `next.config.ts` with `permanent: true` (308) |
| Pattern-based | `redirects()` with path-to-regexp patterns (`/guides/:slug` to `/learn/:slug`) |
| Thousands | Check the current `redirects` limit in the Next.js docs for your version; large arrays slow builds and hit platform routing-table limits (Vercel: 2,048 routes per deployment; redirects, rewrites and headers count). Move to a lookup |
| Thousands to tens of thousands+ | Lookup in `proxy.ts` against KV/Redis/DB holding the full map (optionally a bloom filter in Edge Config to skip misses) |

```typescript
// next.config.ts - patterns
async redirects() {
  return [
    { source: "/guides/:slug", destination: "/learn/:slug", permanent: true },
    { source: "/old-blog/:path*", destination: "/blog/:path*", permanent: true },
  ];
}
```

```typescript
// proxy.ts - lookup for large maps
import { Redis } from "@upstash/redis"; // @vercel/kv is sunset; or any DB / store. The full map lives there
import { NextRequest, NextResponse } from "next/server";

const redis = Redis.fromEnv(); // UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (or the KV_REST_API_* names the Vercel Marketplace integration sets)

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const target = await redis.get<string>(`r:${pathname}`);
  if (target) return NextResponse.redirect(new URL(target, req.url), 308);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
```

Notes:
- Edge Config (now Global Config) is a poor fit for large maps: keys must match `^[\w-]+$` (encode paths with base64url or a hash) and the store is capped at 1 MB on all plans per Vercel's limits page (checked 2026-10; older docs listed 8KB/64KB/512KB). Use it for small maps or a bloom filter only.
- The matcher excludes only Next static assets so legacy `.html`/`.php`/`.aspx`/`.pdf` URLs reach the lookup. Keep it that narrow. Redirect migrated assets (images, PDFs) separately.
- Cache lookups; redirect latency adds to every old-URL hit by users and Googlebot.
- Domain move: redirect at the old host (DNS/CDN/server level) with path preserved: `old.com/x` to `new.com/x`, or through the map if paths change.
- HTTP to HTTPS: enforce at the CDN/host with 301/308 and add HSTS after verifying.
- Framework-agnostic: nginx `map` + `return 301`, Cloudflare bulk redirects, or CDN rules do the same job.
- Handle 404s for unmapped URLs with a real 404 status, not a 200 "not found" page.

## Phase 4: Pre-Launch Checklist (staging)

- [ ] Redirect map validated against staging (all targets 200)
- [ ] New pages: self-referencing canonical on the new URL, titles/H1/content/structured data parity
- [ ] Internal links, sitemap, hreflang, OG URLs updated to new URLs (no internal links through redirects)
- [ ] No leftover `noindex`, `X-Robots-Tag` or robots.txt `Disallow` from staging
- [ ] Rendered HTML parity (view-source, URL Inspection live test); content not hidden behind JS
- [ ] Both old and new GSC properties verified, all variants (http/https, www/non-www); verification kept on new site
- [ ] Disavow file (if one is used) uploaded to the new GSC property
- [ ] New server capacity sized for heavier Googlebot crawling
- [ ] Analytics and tracking present on the new site
- [ ] Lower-traffic launch window, team on call

## Phase 5: Launch

1. Deploy redirects and new site together
2. Immediately spot-check top 50 URLs: status 301/308, single hop, 200 at destination, correct canonical
3. Submit the **new sitemap** in GSC
4. **Keep the old sitemap** submitted for now so you can watch Google process the old URLs (redirect warnings in it are expected). Remove once the new URLs are picked up
5. Domain moves only: use the **Change of Address** tool on the old property, for every verified variant. Do not use it for HTTP to HTTPS, www toggles or path changes
6. Update external profiles, Google Business Profile, ads, email templates, and ask top linking sites to update links

7. **Verify**: run seo-regression-guard against the live site with the pre-migration baseline (`--site <new origin> --baseline .seo-baseline.json`). Expect baseline-origin or sitemap-origin warnings on a domain move, zero errors, and review every regression line (old URLs now redirecting are intended; anything else is not).

## Phase 6: Monitoring

First two weeks, daily; then weekly until stable.

| Signal | Where | Red flag |
|---|---|---|
| Indexed pages (old falling, new rising) | GSC Pages, `site:` | New not growing after 1-2 weeks |
| Sitemap processing | GSC Sitemaps | Errors, 0 discovered |
| 404 / soft 404 / redirect errors | GSC Pages, logs | Spikes on old high-value URLs |
| Clicks/impressions by section | GSC Performance | Drop beyond expected dip |
| Crawl stats | GSC Settings | Server errors, response time up |
| Googlebot hits on old URLs | Logs | Not decreasing |
| Organic sessions, conversions | Analytics | Sustained drop vs baseline |
| Rankings for top terms | Rank tracker | Persistent loss |

Triage order for a drop: redirects broken (chains, wrong targets) then indexation blockers (noindex, robots) then canonicals pointing to old URLs then content/render differences then server errors/speed.

## Timeline Expectations (per Google)

- Small to medium sites: a few weeks or more for most URLs to move; large sites take longer
- Temporary ranking and traffic fluctuation is normal
- Keep redirects at least one year; indefinitely if users or backlinks still hit them
- Moving in sections is fine for large sites; small sites generally do better moving all at once

## Rollback Plan

Define before launch.
- Triggers: e.g. new-site indexing blockers, widespread 5xx, redirect errors on more than a set share of top URLs, traffic below an agreed floor after the expected dip window
- Keep old hosting, DNS TTL lowered (e.g. 300s) in the week before, and a tested reverse redirect config
- Rolling back after Google has begun to switch causes a second round of fluctuation, so prefer fixing forward for map errors and use rollback for site-wide failures
- Keep the old site content intact (not deleted) until the new site is stable

## Common Mistakes

- All old URLs redirected to the home page (soft 404s)
- Redirect chains from stacked past migrations (http to https to www to new path)
- Canonicals or sitemap still listing old URLs
- Staging `noindex` or robots block shipped to production
- Change of Address used for a path change or HTTPS move
- Removing the old domain or redirects after a few weeks
- Dropping non-HTML assets (images, PDFs) from the map
- Redesign, URL change and rewrite in one release

## Relationship to Other Skills

- **pseo-audit**: run the crawl audit before and after
- **gsc**: baseline exports, Pages/Sitemaps/Crawl stats monitoring
- **pseo-metadata**: canonicals and OG URLs updated to new URLs
- **pseo-linking**: rewrite internal links to final URLs
- **pseo-scale**: sitemap generation for the new structure
- **seo-i18n**: locale prefix additions and hreflang updates during a move
