---
name: pseo-linking
description: Build an intelligent internal linking system using hub-and-spoke structures, related page suggestions, breadcrumb navigation, and topical clustering for programmatic SEO. Use when implementing or improving internal linking, adding breadcrumbs, building category hub pages, or creating related-pages components.
argument-hint: "[component: all | breadcrumbs | related | hubs | sitemap]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
---

# pSEO Internal Linking

Build an internal linking system that creates strong topical authority, distributes link equity, and ensures every page is discoverable.

## Core Principles

1. **Hub-and-spoke architecture**: Category hubs link to all child pages; child pages link back to their hub
2. **Topical clustering**: Pages within the same topic cluster interlink
3. **Every page reachable**: No orphan pages - every page is linked from at least 2 other pages
4. **Crawl depth <= 3**: Any page reachable within 3 clicks from the homepage
5. **Descriptive anchor text**: Link text describes the target page, not generic "click here"

## Architecture

```
Homepage
├── Category Hub A ──→ Page A1, A2, A3, ...
│   ├── Page A1 ──→ Hub A, A2, A3 (related)
│   ├── Page A2 ──→ Hub A, A1, A3 (related)
│   └── Page A3 ──→ Hub A, A1, A2 (related)
├── Category Hub B ──→ Page B1, B2, B3, ...
│   └── ...
└── Sitemap (links all hubs)
```

## Implementation Steps

### 1. Breadcrumb Navigation

Build a breadcrumb component that:
- Renders the full path: Home > Category > Current Page
- Uses semantic HTML (`<nav>` with `<ol>`)
- Generates BreadcrumbList schema markup (coordinate with pseo-schema)
- Appears on every pSEO page

```typescript
interface BreadcrumbItem {
  label: string;
  href: string;
}

function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol>
        {items.map((item, i) => (
          <li key={item.href}>
            {i < items.length - 1 ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

### 2. Related Pages Component

Build a component that displays links to related pages:

- Pull related pages from the data layer's `getRelatedPages(slug, limit)` function
- Show 3-6 related pages per page
- Prioritize pages in the same category, then adjacent categories
- Use the page's H1 or title as anchor text
- Include a brief description or differentiator for each link

Relatedness signals (in priority order):
1. Same category
2. Shared tags or attributes
3. Similar content type
4. Alphabetically adjacent (fallback)

### 3. Hub Pages (Category Landing Pages)

Hub page creation is owned by **pseo-templates** (section 7). From a linking perspective, ensure every hub page:
- Links to all child pages in the category (or paginates if >100)
- Is linked from the homepage or global navigation
- Optional: CollectionPage or ItemList semantic markup (no rich result; coordinate with pseo-schema)

### 4. Cross-Category Linking

Identify and implement cross-category linking opportunities:
- "See also" sections linking to related pages in other categories
- Comparison pages that bridge categories
- Tag-based linking (pages sharing the same tag link to each other)

### 5. Footer/Sidebar Navigation

Add persistent navigation that links to:
- All category hub pages
- Most popular or cornerstone content pages
- This ensures hubs are reachable from every page (crawl depth = 2)

### 6. XML Sitemap

Generate a dynamic sitemap that:
- Includes only indexable, canonical, 200-status pSEO pages
- Groups URLs by category using a sitemap index
- Updates automatically when pages are added
- Splits files at 50,000 URLs or 50MB uncompressed per file (Google's limits). Search Console accepts up to 500 sitemap index files per site, and an index itself holds up to 50,000 entries.

**What Google reads (build-sitemap doc, updated 2026-07):**
- `<changefreq>` and `<priority>` are ignored. Do not generate them.
- `<lastmod>` is used only if it is consistently and verifiably accurate. Set it to the last significant update (main content, structured data, links), not the build time and not `new Date()`. Store a real `content_modified_at` per page and use that. If you can't supply a truthful date, omit `lastmod`.

```typescript
// app/sitemap.ts (Next.js App Router, up to ~50,000 URLs)
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const categories = await getAllCategories();
  const entries: MetadataRoute.Sitemap = [];

  for (const cat of categories) {
    entries.push({
      url: `${baseUrl}/${cat.slug}`,
      lastModified: cat.contentModifiedAt, // real content timestamp, never new Date()
    });

    const pages = await getPagesByCategory(cat.slug);
    for (const page of pages) {
      entries.push({
        url: `${baseUrl}/${cat.slug}/${page.slug}`,
        lastModified: page.contentModifiedAt,
      });
    }
  }

  return entries;
}
```

**Beyond 50,000 URLs: `generateSitemaps` plus a hand-written index.** `generateSitemaps` serves each chunk at `/sitemap/[id].xml`, but Next.js does not create a sitemap index. Write one yourself and submit that:

```typescript
// app/sitemap.ts
import type { MetadataRoute } from "next";

const CHUNK = 50000;

export async function generateSitemaps() {
  const total = await countPublishedPages();
  return Array.from({ length: Math.ceil(total / CHUNK) }, (_, id) => ({ id }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id); // id is a Promise<string> in Next.js 16
  const pages = await getPublishedPagesChunk(id * CHUNK, CHUNK);
  return pages.map((p) => ({
    url: `${baseUrl}${p.canonicalPath}`,
    lastModified: p.contentModifiedAt,
  }));
}
```

```typescript
// app/sitemap-index.xml/route.ts
export async function GET() {
  const total = await countPublishedPages();
  const count = Math.ceil(total / 50000);
  const items = Array.from(
    { length: count },
    (_, i) => `  <sitemap><loc>${baseUrl}/sitemap/${i}.xml</loc></sitemap>`
  ).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
```

Reference the index in robots.txt (`Sitemap: https://example.com/sitemap-index.xml`) and submit it in Search Console.

**Pushing URLs to search engines:**
- IndexNow notifies Bing, Yandex, Naver, Seznam, Yep and Amazon. Google does not participate, so it does not speed up Google indexing.
- Google's Indexing API is only for JobPosting and BroadcastEvent-in-VideoObject pages (default quota 200/day). Using it for other pSEO pages is against its terms and can lose you API access.
- For Google, rely on sitemaps, internal links and accurate `lastmod`. The URL Inspection API is for monitoring, not submission (quota 2,000/day and 600/min per site).

### Faceted Navigation and Empty Combinations

Linking to filter or combination URLs creates crawl waste fast. Follow Google's faceted navigation guidance:
- If facets don't need to be indexed, block them in robots.txt (for example `disallow: /*?*color=`) or use URL fragments. `rel=canonical` and `nofollow` alone are less effective long term.
- If facets must be indexable: use the standard `&` separator, keep path-encoded filter order fixed with no duplicates, and **return 404 for empty combinations, duplicate filters and nonsensical combos** at the URL itself (not a redirect to a generic error page).
- Nonexistent pagination URLs return 404. Don't link to combinations that have no results.

**Next.js 16 caveat:** a streaming response starts with status 200. If `notFound()` runs after streaming has begun (inside a Suspense boundary or after `loading.tsx` renders), the response is 200 with an injected `noindex`, which Google may report as a soft 404. Check existence before any Suspense fallback renders, or return the 404 from `proxy.ts` (the Next.js 16 name for `middleware.ts`).

### 7. Redirect Management

At 1000+ pages, slug and URL changes are inevitable. Build a redirect system:

- Maintain a redirect map (JSON file, database table, or framework config) that maps old paths to new paths
- All redirects must be permanent (301 or 308)
- When a slug changes, automatically add the old URL to the redirect map
- When a category is renamed, redirect all child URLs under the old category path
- Implement a redirect config (or `proxy.ts` in Next.js 16, which replaced `middleware.ts`) that processes the map on every request. Prefer pattern-based redirects over one rule per URL: on Vercel, redirects and rewrites count toward the 2,048-routes-per-deployment limit
- Validate: no redirect chains (A → B → C), no redirect loops, no redirects to 404s

**Next.js pattern:** put pattern rules in `redirects()` and per-URL entries in a `proxy.ts` lookup (map or DB). Vercel allows 2,048 routes per deployment, so one rule per URL does not scale.
```typescript
// next.config.js - pattern rules only
async redirects() {
  return [
    { source: '/old-category/:slug', destination: '/new-category/:slug', permanent: true },
  ];
}
```
```typescript
// proxy.ts - per-URL entries from a map or DB lookup
import { NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const target = await lookupRedirect(request.nextUrl.pathname); // map, KV or DB
  if (target) {
    return NextResponse.redirect(new URL(target, request.url), 308);
  }
  return NextResponse.next();
}
```

**Build-time validation:**
- All redirect sources must not match any current live slug
- All redirect destinations must resolve to a live page
- Log warnings for redirects older than 12 months (consider removing)

### 8. robots.txt and AI Crawler Access

Create or update robots.txt to:
- Allow all pSEO pages for traditional crawlers (Googlebot and others)
- Allow AI search/retrieval crawlers needed for LLM citation (OAI-SearchBot, PerplexityBot, Claude-SearchBot). ChatGPT-User, Perplexity-User and Claude-User are user-triggered fetchers; their robots.txt handling varies by vendor
- Optionally block AI training crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot). Google-Extended does not affect Google Search, AI Overviews or AI Mode
- Reference the sitemap (and llms.txt if you publish one)
- Block utility/admin pages

**Critical**: Blocking an AI search crawler removes you from that product. Google ignores `crawl-delay`, and robots.txt is limited to 500 KiB. See pseo-llm-visibility for full AI crawler configuration.

### 9. llms.txt

llms.txt creation is owned by **pseo-llm-visibility** (section 2). From a linking perspective, ensure llms.txt references all category hub pages and the sitemap. The robots.txt should include a comment pointing to llms.txt.

## Link Health Checks

Verify:
- [ ] No orphan pages (every page linked from at least 2 others)
- [ ] Hub pages link to all their child pages
- [ ] Child pages link back to their hub
- [ ] Breadcrumbs are present on every page
- [ ] Related pages section shows 3-6 links
- [ ] No broken internal links (all hrefs resolve to 200)
- [ ] Sitemap includes all indexable public pages, has no `changefreq`/`priority`, and `lastmod` is a real content-modified date
- [ ] Each sitemap file is under 50,000 URLs and 50MB; a sitemap index is written and submitted
- [ ] Empty facet/combination URLs return a real 404 (not 200 + noindex)
- [ ] Crawl depth from homepage <= 3 for any page
- [ ] Redirect map exists and covers all historical URL changes
- [ ] No redirect chains or loops
- [ ] All redirect destinations resolve to live pages
- [ ] robots.txt allows AI retrieval crawlers (OAI-SearchBot, PerplexityBot, Claude-SearchBot)
- [ ] (Optional) llms.txt exists at site root with category hubs and page type descriptions

## Relationship to Other Skills

- **Depends on**: pseo-data (category data, related page queries)
- **Provides to**: pseo-schema (breadcrumb items for BreadcrumbList schema)
- **Works with**: pseo-templates (linking components are rendered in templates)
