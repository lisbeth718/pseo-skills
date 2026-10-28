---
name: pseo-templates
description: Create page templates with dynamic routing for programmatic SEO (Next.js 16), including unique intent-matched content per page with differentiated titles, headings, and descriptions, correct 404 status handling, and no doorway or scaled-content-abuse patterns. Use when building or refactoring pSEO page templates, setting up dynamic routes, or ensuring each generated page has unique, valuable content.
argument-hint: "[page-type] [scope: routes | structure | content | status | hubs | eeat | images | all]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
---

# pSEO Page Templates

Build page templates that produce unique, intent-matched content at scale through dynamic routing and structured data rendering.

## Core Principles

1. **One template, many unique pages**: Templates are content-agnostic shells that render data
2. **No thin pages**: Every generated page must have substantial, differentiated content that adds real, unique value. Do not create pages for query variations.
3. **Intent matching**: Each page targets a specific search intent derived from its data
4. **Semantic HTML**: Use correct heading hierarchy, landmarks, and elements
5. **Progressive enhancement**: Pages work without JavaScript

## Scope parameter

`page-type` names the template to build. Scope: `routes` = section 1, `structure` = sections 2 and 4-5, `content` = sections 3 and 3a, `status` = sections 6, 6a and 6b, `hubs` = section 7, `eeat` = section 8, `images` = section 9, `all` (default) = everything.

## Implementation Steps

### 1. Set Up Dynamic Routes

Create dynamic route segments using the framework's routing system:

**Next.js App Router:**
```
app/
  [category]/
    page.tsx                    # category hub page
    [slug]/
      page.tsx                  # individual pSEO page
```

**Next.js Pages Router:**
```
pages/
  [category]/
    index.tsx
    [slug].tsx
```

Implement `generateStaticParams` (App Router) or `getStaticPaths` (Pages Router) using the data layer's `getAllSlugs()`.

**Next.js 16.4.x notes (>= 16.4.1 for security fixes; current stable 16.4.3):**
- `params` and `searchParams` are Promises; always `await` them.
- `middleware.ts` is renamed `proxy.ts` (Node.js runtime) in Next.js 16.
- **Cache Components** (`cacheComponents: true` in next config, `"use cache"` directive): caching is opt-in and dynamic is the default. It is recommended for all apps and on by default in `create-next-app` from 16.4; Next.js 17 is announced to make it the default.
- With Cache Components, `generateStaticParams` **must return at least one param**; an empty array is a build error. Return a few seed params and let the rest render on demand. A placeholder param plus `notFound()` is the documented workaround when you have none.
- Without Cache Components, `generateStaticParams` can return `[]` for runtime ISR of all paths, and `dynamicParams = false` makes unlisted params 404. It is not re-run during ISR revalidation.
- `export const ensureStatic = 'navigation' | 'prefetch' | 'shell'` (16.4) requires `cacheComponents`. Only `'navigation'` adds build validation (fails the build on dynamic content) and it requires `generateStaticParams` to return every param. `'shell'` and `'prefetch'` add no build validation. With seeded params (rest on demand), do not claim it validates anything.
- Do not prerender huge sets at build: Vercel build time is capped at 45 minutes per deployment. Prerender seed pages and use ISR or on-demand rendering for the rest.

```typescript
// app/[category]/[slug]/page.tsx
export async function generateStaticParams() {
  // Seed with the most important pages; at least one is required with Cache Components
  const seeds = await getTopSlugs(100);
  return seeds.map(({ category, slug }) => ({ category, slug }));
}
```

**Slugs and URLs:** use lowercase words separated by hyphens, never underscores (Google URL structure doc, 2026-10-23). Slug generation itself lives in pseo-data section 3.

### 2. Design the Page Template Structure

Every pSEO page template must include these content sections. **Value goes first**. Google's Quality Rater Guidelines (Sep 2025, section 5.2.2) treat prominent filler ahead of the main content as a Low-quality signal, and the helpful content guidance asks whether content is mainly summarizing others. Do not bury useful content under filler intros, excessive ads, or boilerplate. The user's query should be answered within the first visible viewport.

```
┌─────────────────────────────┐
│ Breadcrumbs                 │
├─────────────────────────────┤
│ H1 (unique per page)        │
│ Key answer / value upfront  │  ← answer the search intent immediately
├─────────────────────────────┤
│ Primary content section     │
│ (unique body/data)          │
├─────────────────────────────┤
│ E-E-A-T signals             │  ← author, sources, data provenance
├─────────────────────────────┤
│ FAQ section (optional,      │
│ only if users need it)      │
├─────────────────────────────┤
│ Related pages / internal    │
│ links                       │
├─────────────────────────────┤
│ Category hub link           │
└─────────────────────────────┘
```

**"Needs Met" rule:** If a user lands on this page from a search result, they should find the answer or primary value within the first screenful of content. No filler paragraphs, no "in today's world..." intros, no walls of generic text before the actual content. Get to the point immediately.

**No chunking tricks for Google:** Google states that chunking, rewriting content for AI, and llms.txt do nothing for Google Search or its AI features, and that AEO/GEO "is still SEO". Write clear sections with descriptive headings for readers. Do not target word counts per section. See pseo-llm-visibility for non-Google agents.

### 3. Ensure Content Uniqueness

Each page MUST differentiate itself through:

- **Title**: Constructed from data fields, not a single template string with one variable swap
- **H1**: May differ from the title; should include the primary keyword naturally
- **Meta description**: Generated from page-specific data, not a boilerplate with token replacement
- **Body content**: Driven by page data: descriptions, stats, attributes, comparisons
- **FAQ section (optional)**: Only questions real users ask about this page's topic, with answers specific to it. The FAQ rich result is retired, so a FAQ block earns no SERP feature; include it only when it helps readers.

Bad: `"Best {keyword} in {city}"` for every page.
Better: Titles that incorporate multiple data dimensions (type, location, attribute, use case).

### 3a. Avoid Doorway and Scaled Content Abuse

Google's spam policies (last updated 2026-08-28) are the risk boundary for pSEO:

- **Scaled content abuse**: many pages generated for the primary purpose of manipulating rankings rather than helping users, "no matter how it's created". This includes AI-generated pages without added value, scraped or synonymized feeds, stitched content, and keyword pages that make little sense to a reader.
- **Fan-out queries**: Google's AI optimization guide (2026-05-15) says creating separate pages for every query variation, "or fan-out queries", primarily to manipulate rankings or generative AI responses violates the scaled content abuse policy. You do not need a page for every long-tail variation or synonym.
- **Doorway abuse** includes "substantially similar pages that are closer to search results than a clearly defined, browseable hierarchy" and pages targeted at specific regions or cities that funnel users to one page.
- **Keyword stuffing** includes blocks of text that list cities and regions a page tries to rank for.
- **Thin affiliation**: cookie-cutter templates replicated within a site or across domains or languages. Auto-translation without added value counts as scaled content.
- Google's AI-content guidance: using AI to generate many pages without adding value may violate the policy. Fact-check and review all AI-generated content.
- Spam policies also cover attempts to manipulate generative AI responses in Google Search (2026-05-15). Spam reports can trigger manual actions (since 2026-04-14).

Before generating a page set, check each page against these questions:
- Does the page have data or functionality a user cannot get from the next result (non-commodity content)?
- Is it reachable in a clear, browseable hierarchy, not only via search-like URLs?
- Would merging near-identical pages into one stronger page serve users better?
- If no data exists for a combination, is the page not generated at all (404) rather than rendered thin?

Site-wide, Google presumes new pages match the overall quality of the domain, so a large volume of thin pages is a site-level risk.

### 4. Use Structured Content Blocks

Text variation alone is not enough to avoid thin content flags. Build reusable content components that render substantive, data-driven sections:

- **Data tables**: Render structured attributes as a comparison or specification table (e.g., features, specs, pricing tiers)
- **Stat highlights**: Pull numeric data into visual callouts (e.g., "4.8 rating", "500+ reviews", "Est. 2019")
- **Attribute breakdowns**: Render key-value pairs from the data model as descriptive sections (not just a list)
- **Comparison grids**: If the page relates to alternatives, render a side-by-side comparison
- **Contextual prose**: Generate intro and summary paragraphs from multiple data fields: not a single sentence template
- **FAQ accordion (optional)**: Render page-specific Q&A pairs. If you add FAQPage schema anyway, the questions must be visible on the page; it gives no rich result (see pseo-schema).
- **Related content cards**: Previews of related pages with titles, descriptions, and images

The goal: if you remove the page title and URL, the remaining content should still be identifiably about *this specific topic* and not interchangeable with another page.

### 5. Implement the Page Component

```typescript
// Pattern for a pSEO page component (Next.js 16: params is a Promise)
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const data = await getPageData(slug);

  if (!data || data.category !== category) notFound();

  return (
    <article>
      <Breadcrumbs category={data.category} current={data.h1} />
      <h1>{data.h1}</h1>
      <IntroSection data={data} />
      <MainContent data={data} />
      {data.faqs && data.faqs.length > 0 && <FAQSection faqs={data.faqs} />}
      <RelatedPages slug={data.slug} category={data.category} />
    </article>
  );
}
```

### 6. Handle Edge Cases

- **Missing data**: Return a real 404 for slugs without data, never render empty pages
- **Fallback rendering**: If using ISR with fallback, show a loading state, not empty content (but see the status code rule below)
- **Draft pages**: Add a mechanism to exclude draft/incomplete content from generation
- **Pagination**: If a page type has too much content, paginate with plain links and a self-canonical per page. Google does not use rel prev/next. Nonexistent pagination URLs return 404.
- **User-generated and tool-output pages**: Google's UGC spam guide (2026-10-26) says to `noindex` or block share pages and tool-output pages by default. Index only the ones that pass the sufficiency check in pseo-data.
- **Empty filter combinations**: Return 404 at the URL itself for empty, duplicate or nonsensical facet combinations (Google faceted navigation guidance), not a redirect to a generic error page.

### 6a. Status Codes with Streaming: 404 Before You Stream

Streaming responses begin with status 200. If `notFound()` runs after the stream has started (inside a Suspense boundary, or when `loading.tsx` has already rendered a fallback), Next.js returns 200 with an injected `<meta name="robots" content="noindex">`. Some crawlers label these as soft 404s, and Google also may not render non-200 or noindex pages the way you expect.

Do the existence check before any Suspense fallback or `loading.tsx` renders:

```typescript
// app/[category]/[slug]/page.tsx
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default async function Page({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  // Resolve existence BEFORE returning any <Suspense> or relying on loading.tsx
  const data = await getPageData(slug); // cache this lookup
  if (!data || data.category !== category) notFound();

  return (
    <article>
      <h1>{data.h1}</h1>
      <Suspense fallback={<RelatedSkeleton />}>
        <RelatedPages slug={data.slug} category={data.category} />
      </Suspense>
    </article>
  );
}
```

Guidelines:
- Do not put a route-level `loading.tsx` over routes that can legitimately 404, or keep the existence check in a parent layout/segment that resolves first.
- For high-volume "no data" combinations, check in `proxy.ts` (renamed from middleware in Next.js 16) and return a 404 response or rewrite to a not-found route.
- Only `notFound()` for pages that truly have no content; 404/410 removed pages and fix soft 404s to protect crawl budget.
- Verify with `curl -I` that missing slugs return `404`, not `200`.

### 6b. HTML Weight

Googlebot for Search reads only the first 2MB of HTML including HTTP headers (64MB for PDF), and each CSS/JS resource has its own cap. Content, links, canonical and structured data past that point can be missed. Avoid:
- Huge inline JSON-LD or `__NEXT_DATA__`/RSC payloads (pass only the fields the page renders)
- Giant tables or link lists rendered in full on one page (paginate)
- Serializing whole datasets into client component props

### 7. Create Category Hub Pages

Hub pages aggregate and link to individual pages within a category:

- Display a categorized listing of all pages in the category
- Include an intro paragraph unique to the category
- Link to every child page (or paginate if >100)
- Include the category's own metadata and schema markup

### 8. Add E-E-A-T Signals

Google says E-E-A-T is not a specific ranking factor, but trust is the most important part of it and YMYL topics get more weight. It applies to programmatic pages too. Every pSEO template should include:

- **Data provenance**: Where the information comes from (cite sources, databases, official records)
- **Last updated date**: Visible on the page, not just in schema. Shows the content is maintained.
- **Author or organization attribution**: Who is responsible for this content. Can be an organization for pSEO.
- **Methodology note** (where applicable): "Prices updated daily from [source]" or "Rankings based on [criteria]"
- **First-party evidence**: If the business has proprietary data, surface it (original research, real user data, verified reviews)

For YMYL topics (health, finance, civic, legal), E-E-A-T requirements are stricter:
- Author credentials must be explicit
- Sources must be authoritative (government, medical, legal sources)
- Content must be reviewed by a qualified person

```typescript
// E-E-A-T component pattern
function ContentAttribution({ source, lastUpdated, methodology }: EEATProps) {
  return (
    <aside aria-label="Content information">
      <p>Data sourced from {source}</p>
      <p>Last updated: <time dateTime={lastUpdated}>{formatDate(lastUpdated)}</time></p>
      {methodology && <p>Methodology: {methodology}</p>}
    </aside>
  );
}
```

### 9. Image SEO at Scale

Images are often a key differentiator for pSEO pages (product photos, location images, comparison visuals). Every image rendered by a template must have:

- **Unique alt text**: Generated from data fields, not a generic template. Bad: `alt="product image"`. Good: `alt="{productName} - {color} {material}, {brand}"`.
- **Descriptive filenames**: Use slugified data fields in image URLs where possible (e.g., `blue-wool-sweater-brand.webp` not `IMG_4523.jpg`)
- **Explicit dimensions**: `width` and `height` attributes to prevent CLS
- **Lazy loading**: All below-fold images use `loading="lazy"`; the LCP image uses `loading="eager"` or `fetchPriority="high"` (`priority` is deprecated in Next 16 in favor of `preload`)
- **Image schema**: If images are a core part of the page value, include `ImageObject` in the page's JSON-LD (coordinate with pseo-schema)

- **Image sitemaps**: list important images in the sitemap; see pseo-linking section 6.
- **AI-generated images**: embed IPTC digital source type `TrainedAlgorithmicMedia` in the file metadata (Merchant Center requires it for AI images; Google also asks you to fact-check AI alt text and structured data). See the [research doc](https://github.com/lisbeth718/pseo-skills/blob/main/docs/research-2026-10.md).

**`og:image` rule (single rule):** use a page-specific image, else a per-category image generated with `opengraph-image.tsx` (`ImageResponse`). Never one site-wide placeholder across thousands of pages. Where no image fits, use data-driven visuals (charts, comparison tables) as the page's visual content.

## Template Checklist

Before considering a template complete:
- [ ] Every generated page has a unique H1 that differs from other pages
- [ ] Body content varies substantially between pages (not just variable swaps)
- [ ] At least 2 structured content blocks are present (data table, stats, attributes, FAQ, etc.)
- [ ] FAQ section (if present) renders page-specific questions real users ask; no FAQ rich result is expected
- [ ] Page set passes the doorway / scaled content abuse questions in 3a (no query-variation pages)
- [ ] Breadcrumbs render correctly with the page's category hierarchy
- [ ] Invalid slugs return a real HTTP 404 (check done before Suspense/`loading.tsx`, or in `proxy.ts`), verified with `curl -I`
- [ ] Related pages section links to other pages in the same category
- [ ] Semantic HTML is used (article, section, nav, h1-h3 hierarchy)
- [ ] `generateStaticParams` returns at least one param (required with Cache Components) and seeds the key pages; `ensureStatic = 'navigation'` only on routes whose params are complete; not relied on for seeded/on-demand routes
- [ ] Rendered HTML stays well under 2MB (no huge inline JSON)
- [ ] URLs use hyphens, no underscores; share and tool-output pages are `noindex` or blocked by default
- [ ] E-E-A-T signals present: data source, last updated date, attribution
- [ ] Primary value/answer is visible in the first viewport (no filler intros)
- [ ] YMYL pages have elevated trust signals (author credentials, authoritative sources)

## Relationship to Other Skills

- **Depends on**: pseo-data (content models and fetching)
- **Consumed by**: pseo-metadata (template structure informs meta tag placement)
- **Works with**: pseo-linking (templates render link components), pseo-schema (templates include schema scripts)

## Verify

Build, start the app, and run seo-regression-guard against localhost (`npx -y tsx <seo-regression-guard-dir>/scripts/seo-check.ts --site http://localhost:3000`). Zero errors for the touched templates, and `curl -I` on a missing slug returns 404.
