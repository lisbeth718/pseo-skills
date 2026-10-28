---
name: pseo-data
description: Design and implement the structured data architecture that powers programmatic SEO pages, including content models, data sources, slug generation, and data-fetching layers. Use when setting up or refactoring the data foundation for pSEO, designing content models, or building the data pipeline that feeds page templates.
argument-hint: "[source: cms | json | database | api | mdx] [scope: models | fetching | slugs | validation | nextjs | all]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
---

# pSEO Data Architecture

Design and implement the structured data layer that feeds all programmatic SEO pages. This is the foundation every other pSEO skill depends on.

## Core Principles

1. **Single source of truth**: All page data flows from one data layer
2. **SEO-complete models**: Every content model includes all fields needed for metadata, schema markup, and linking
3. **Unique slugs by construction**: Slug generation enforces uniqueness at the data level
4. **Type safety**: All data models are fully typed (TypeScript interfaces/types)
5. **Separation of concerns**: Data fetching is decoupled from page rendering

## Data Sufficiency First

Decide which pages deserve to exist before designing anything else. Google's spam policies (scaled content abuse, doorway abuse) target many near-identical pages built mainly to rank. For every planned page type:

- Define the minimum unique data fields a page needs to be useful on its own (real facts, numbers, attributes that differ per page, not just a swapped keyword).
- Score each record against that minimum. Records below the threshold get no page: do not generate them, or return a real 404. Do not ship thin pages as `noindex` and plan to flip them later (a noindexed thin page still costs crawl budget and is a maintenance trap).
- Do not create a separate page for every query variation or "fan-out" query. One page per distinct entity or intent.
- Keep a clear, browseable hierarchy (category > page) so pages are not just "closer to search results" than to a site structure.

See **pseo-scale** for sufficiency scoring code.

## Scope parameter

`$ARGUMENTS` source picks section 5; the optional scope limits work: `models` = section 1, `fetching` = section 2, `slugs` = section 3, `validation` = section 4, `nextjs` = the Next.js 16.4 section, `all` (default) = everything.

## Implementation Steps

### 1. Define Content Models

Create TypeScript interfaces for each page type using a two-tier model. The lightweight index tier is safe to hold in memory for all pages; the heavy full tier is loaded per-page only.

```typescript
// Index tier: safe to load all at once (~1KB per page)
interface PageIndex {
  slug: string;               // unique, URL-safe
  title: string;              // page title (50-60 chars target)
  metaDescription: string;    // meta description (150-160 chars target)
  h1: string;                 // primary heading (can differ from title)
  canonicalPath: string;      // canonical URL path
  category: string;           // for hub-spoke and breadcrumbs
  lastModified: string;       // ISO date for sitemap
}

// Full tier: extends PageIndex with heavy fields (~50-500KB per page)
interface BaseSEOContent extends PageIndex {
  introText: string;
  bodyContent: string;
  faqs?: FAQ[];               // optional visible Q&A; FAQ rich results no longer exist in Google
  relatedSlugs?: string[];
  featuredImage?: SEOImage;
}
```

Extend `BaseSEOContent` for each page type with domain-specific fields. The interfaces above show the minimum required fields. See `references/content-models.md` for the full definitions (which add `subcategory`, `tags`, `publishedDate`, `status`, and more) and extended type examples (LocationPage, ProductPage, ComparisonPage, CategoryPage).

### 2. Build the Data-Fetching Layer

Split the layer in two so scripts can use it without Next.js:

- `lib/data/source.ts`: pure fetchers (read JSON/CMS/DB/API, paginate, validate). No `next/*` imports, no `server-only`, no `"use cache"`. Must run under plain `tsx`.
- `lib/data/index.ts`: cached wrappers that call `source.ts` and add `"use cache"`, `cacheLife()` and `cacheTag()`. Pages and templates import only from here.

Build and validation scripts (sitemap checks, `validate-data.ts`, sufficiency scoring) import `source.ts`, never `index.ts`, so they run outside the Next.js runtime.

Both modules together export:

- `getAllSlugs()` - Returns all valid slugs for static generation. Must handle pagination internally when the data source has 1000+ records (fetch in batches, return the complete list).
- `getPageData(slug)` - Returns full content for a single page
- `getPagesByCategory(category, opts?)` - Returns pages in a category for hub pages. Accept optional `limit` and `offset` for paginated hub pages.
- `getRelatedPages(slug, limit?)` - Returns related pages for internal linking
- `getAllCategories()` - Returns all categories for navigation and hubs
- `getPageCount()` - Returns total page count (useful for sitemap splitting and build diagnostics)

All functions must be:
- Cached or memoized during build to avoid redundant reads (see Next.js 16.4 notes below)
- Typed with explicit return types
- Guarded against missing or malformed data
- Internally paginated when the data source imposes limits (e.g., CMS APIs with 100-item pages). The consumer should never need to handle pagination - the data layer abstracts it.

### 3. Implement Slug Generation

Design a slug strategy that:
- Produces URL-safe, lowercase, hyphenated strings
- Guarantees uniqueness across the entire dataset
- Is deterministic (same input always produces same slug)
- Includes a collision detection mechanism
- Follows a consistent URL hierarchy (e.g., `/category/page-slug`)
- Uses hyphens, never underscores, as word separators (Google URL structure doc, 2026-10-23); strip or convert `_` in source values

### 4. Validate Data Integrity

Build a validation function or script that checks:
- No duplicate slugs exist
- All required fields are present and non-empty
- Title and description lengths are within SEO targets
- All category references resolve to valid categories
- No orphan pages (pages not reachable through any category)

### 5. Set Up Data Source Integration

Based on the data source (`$ARGUMENTS` or detected):

**JSON files**: Create a `data/` directory with typed JSON, a loader, and build-time validation.

**CMS (headless)**: Create API client with typed responses, implement caching, handle pagination for 1000+ items.

**Database**: Create a query layer with connection pooling, implement cursor-based pagination, add query caching.

**MDX files**: Set up frontmatter schema validation, create a content loader with gray-matter parsing.

**API**: Create a typed API client, implement rate limiting and retry logic, add response caching.

## Next.js 16.4 Data Fetching

Applies when the project uses Next.js 16.4.x (>= 16.4.1 for security fixes: two critical unauthenticated RCEs, in `use cache` with Cache Components and in image optimization with SVG, were fixed 2026-10-14). Cache Components is recommended for all apps in 16.4 and becomes the default in Next.js 17.

- Enable with `cacheComponents: true`. Caching is opt-in: mark data functions with the `"use cache"` directive and set lifetime with `cacheLife()` / tag with `cacheTag()`. Dynamic is the default, so uncached reads in a page make it dynamic.
- Put the data layer wrappers in `lib/data/index.ts` (`getPageData`, `getPagesByCategory`, ...) behind `"use cache"` so page templates stay prerenderable. The uncached fetchers live in `lib/data/source.ts` (section 2).
- `params` and `searchParams` are async: `const { slug } = await params`.
- `generateStaticParams` must return at least one param when Cache Components is on (an empty array is a build error). Return a small seed set (top pages by sufficiency score) and let the rest render on demand and cache; use `notFound()` for unknown slugs.
- `export const ensureStatic = 'navigation' | 'prefetch' | 'shell'` requires `cacheComponents`. Only `'navigation'` adds build validation (it fails the build on dynamic content) and it requires `generateStaticParams` to return every param. `'shell'` and `'prefetch'` add no build validation. With a seeded param set (rest on demand), do not rely on `ensureStatic` to validate anything.
- Do not prerender the full set at build. On Vercel a build is capped at 45 minutes per deployment, so seed the top pages and use ISR/on-demand rendering for the long tail.
- Check data existence **before** any Suspense boundary or `loading.tsx` (status codes: see pseo-templates section 6a).
- Revalidation: `revalidateTag(tag, profile)` now requires a cache-life profile; use `updateTag()` in Server Actions for read-your-writes.
- Without Cache Components, use `generateStaticParams` returning `[]` or `dynamic = 'force-static'` for runtime ISR, and `dynamicParams = false` to 404 unlisted params.

## HTML Size Budget

Keep HTML well under the Googlebot 2MB limit (see pseo-templates section 6b). Data-side rules:

- Never inline the whole dataset into the page as JSON (for example a full table of 5,000 rows in a `<script>` tag or serialized props). Pass only what the visible page needs.
- Watch the RSC/`__next_f` payload and `__NEXT_DATA__` size: they count toward the 2MB. Keep per-page props to the fields rendered.
- Paginate or lazy-load long tables, with each page at its own crawlable URL and canonical (no `#` page numbers).
- Measure uncompressed HTML size of sample pages in the build and fail above a budget (for example 1MB).

## Scale Limits

The in-memory and file-based patterns in this skill work up to ~10K pages. Beyond that:

- **10K-50K pages**: Requires a database (PostgreSQL, MySQL). In-memory index tier becomes borderline at 50K (~50MB). File-based data sources are too slow.
- **50K-100K+ pages**: Requires database + cache layer (Redis) + cursor-based pagination. `getAllSlugs()` must use cursor iteration, not array return. Data sufficiency gating prevents generating thin pages.

See **pseo-scale** for the complete database-backed data layer, sufficiency scoring, and scale-specific patterns.

## Memory-Conscious Data Patterns

At 1000+ pages, how data is loaded matters more than what is loaded. A full content model with body text, FAQs, and images can be 50-500KB per page. Loading all pages into memory simultaneously will OOM.

**Two-tier data model:**

Split the data layer into lightweight index data and full page data. The `PageIndex` and `BaseSEOContent` interfaces from section 1 define the two tiers:

- `getAllSlugs()`, `getRelatedPages()`, `getPagesByCategory()` - return `PageIndex[]` (lightweight, ~1KB per page)
- `getPageData()` - returns `BaseSEOContent` (or an extended type) for a single page (heavy, ~50-500KB per page, only one at a time)

**Never do this:**
```typescript
// Loads ALL full content into memory - will OOM at scale
const allPages = await Promise.all(slugs.map(s => getPageData(s)));
```

**Instead:**
```typescript
// Process pages one at a time or in small batches
for (const slug of slugs) {
  const page = await getPageData(slug);
  await processPage(page);
  // page is GC'd after each iteration
}
```

**CMS/API pagination:**
- Fetch in batches of 100-250 records
- Yield or push to an array incrementally - don't hold all API responses in memory simultaneously
- If using GraphQL, only request index fields in list queries, full fields in single-item queries

## File Organization

```
lib/
  data/
    index.ts          # cached wrappers ("use cache", cacheLife, cacheTag); public API for pages
    source.ts         # pure fetchers, no next/* or server-only; imported by scripts
    types.ts          # TypeScript interfaces
    slugs.ts          # slug generation and validation
    validation.ts     # data integrity checks
    cache.ts          # build-time caching utilities
```

## Quality Checks

Before considering this complete:
- [ ] All content models extend BaseSEOContent (which extends PageIndex)
- [ ] `getAllSlugs()` returns 0 duplicates
- [ ] Data validation passes with zero errors
- [ ] Data layer exports are fully typed with no `any`
- [ ] Fetching is memoized for build performance
- [ ] A test or script can validate the full dataset
- [ ] Two-tier data model implemented (index data vs. full page data)
- [ ] No function loads all full page content into memory simultaneously
- [ ] CMS/API fetching uses batched pagination internally
- [ ] Data sufficiency threshold defined per page type; records below it produce no page
- [ ] No dataset-sized inline JSON; sample page HTML stays well under 2MB uncompressed
- [ ] `source.ts` has no `next/*` or `server-only` imports and runs under plain `tsx`; scripts import it, not `index.ts`
- [ ] Slugs use hyphens, no underscores

## Relationship to Other Skills

This skill provides the data foundation for:
- **pseo-templates**: Consumes `getPageData()` and `getAllSlugs()`
- **pseo-metadata**: Reads title, description, canonical from content models
- **pseo-schema**: Uses structured fields for JSON-LD generation
- **gsc**: Post-launch monitoring; per-template indexing results feed back into sufficiency thresholds
- **pseo-linking**: Uses `getRelatedPages()` and category data
- **pseo-quality-guard**: Validates against the content models

## Verify

Run the validation script (via `source.ts`) with zero errors. Then build, start the app, and run seo-regression-guard against localhost (`npx -y tsx <seo-regression-guard-dir>/scripts/seo-check.ts --site http://localhost:3000`). Zero errors for the touched templates before calling this done.
