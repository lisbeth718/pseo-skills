---
name: pseo-audit
description: Audit and assess a codebase for programmatic SEO readiness at 1000+ page scale. Use when starting a pSEO project, evaluating an existing codebase for pSEO gaps, or when the user asks to audit, assess, or review their site for programmatic SEO scalability.
argument-hint: "[scope: full | routing | data | seo | performance]"
allowed-tools: Read, Glob, Grep, Bash
---

# pSEO Codebase Audit

Perform a structured audit of the codebase to assess readiness for programmatic SEO at 1000+ page scale. Produce a concrete gap analysis with actionable findings.

If **pseo-discovery** was run first, use its output to focus the audit: check whether the codebase can support the specific page types, data models, and URL structures the discovery proposed. If discovery was not run, audit generically.

## Audit Procedure

### 1. Identify the Framework and Architecture

- Detect the framework (Next.js, Astro, Nuxt, Remix, etc.) from config files
- Identify the rendering strategy: SSG, SSR, ISR, or client-side
- Map the routing structure: file-based, dynamic segments, catch-all routes
- Check for `generateStaticParams`, `getStaticPaths`, or equivalent

### 2. Assess Data Architecture

- Locate data sources: CMS, database, API, local files (JSON, MDX, CSV)
- Check for a centralized data-fetching layer vs. scattered inline fetches
- Evaluate whether data models have the fields needed for SEO (title, description, slug, category, FAQ, etc.)
- Look for a slug/URL generation strategy and whether it enforces uniqueness

### 3. Evaluate Routing and Page Templates

- Count dynamic route segments and template pages
- Check if templates produce unique content per page or rely on the same copy with minor variable swaps
- Look for catch-all routes that may create orphan or thin pages
- Verify 404 handling for invalid slugs, and for empty or nonsensical combinations (faceted/filter/location combos with no data must return a real 404 at the URL, not a redirect to a generic error page)
- Next.js 16 soft-404 check: `notFound()` called after streaming has started (inside a Suspense boundary, or after `loading.tsx` renders) returns HTTP 200 with an injected `noindex`, and Google may label it a soft 404. The existence check must run before any Suspense fallback, or in `proxy.ts`. Also note that with Cache Components `generateStaticParams` must return at least one param

### 4. Review SEO Foundations

- Check for dynamic metadata generation (title, description, canonical)
- Look for Open Graph and Twitter card tags
- Search for JSON-LD structured data or schema markup
- Check for a sitemap generator (static or dynamic)
- Look for robots.txt configuration
- Verify canonical URLs are set and self-referencing by default
- Metadata placement: Next.js may stream `generateMetadata` output into `<body>` for JS-executing bots. Google respects robots meta in the body (2026-03-24) but its canonical docs specify `<head>`, and the canonical in the original HTML must match the JS canonical. Prefer static or `use cache` metadata so canonical and robots render in the head shell (this is a recommendation, not a Google statement), or set `htmlLimitedBots`
- `noindex` in the initial HTML: confirm no page ships `noindex` that JS later removes (Google may skip rendering and never index it). Check `loading.tsx`/streaming fallbacks that inject noindex
- Googlebot HTML size: Googlebot for Search fetches only the first 2MB of uncompressed HTML (each CSS/JS resource has its own cap). Check pages for inline JSON, RSC payloads, or giant tables that push key content, canonical or links past 2MB
- Sitemap: `<lastmod>` must be a real content-modified timestamp (build-time `new Date()` makes it unverifiable and Google then ignores it); Google ignores `<priority>` and `<changefreq>`; limits 50,000 URLs / 50MB per file; Next.js `generateSitemaps` does not create a sitemap index, so check one is written and submitted
- Structured data: flag FAQPage and HowTo generation (FAQ rich results stopped showing 2026-05-07; HowTo removed 2023)
- AI features controls: check `nosnippet`, `max-snippet`, `data-nosnippet` use matches intent (they limit use in AI Overviews and AI Mode); robots.txt and CDN do not block Googlebot; note the Search Console "Search generative AI" setting and that `Google-Extended` does not control AI Overviews or AI Mode. `llms.txt` has no effect on Google Search

### 5. Evaluate Internal Linking

- Look for breadcrumb components
- Search for related-pages or hub-spoke linking patterns
- Check for programmatic cross-linking between pages
- Assess whether link structures create topical clusters

### 6. Assess Performance at Scale

- Check build configuration for page generation limits or timeouts
- Look for image optimization (next/image, sharp, etc.)
- Check for code splitting and lazy loading
- Identify large dependencies that bloat the bundle
- Look for caching headers or ISR/revalidation configuration

### 7. Check Content Quality Safeguards

- Look for content length or quality validation
- Search for duplicate content detection or prevention
- Check if pages have sufficiently differentiated titles and descriptions
- Look for noindex rules on thin or utility pages
- Look for doorway-shaped page types (city/region combos with only the place swapped, query-variation pages) and for a policy of excluding low-value pages from Search
- Check for a build-time or CI quality check (see pseo-quality-guard)

## Output Format

Structure the audit report as:

```
## pSEO Audit Report

### Framework & Rendering
- [findings]

### Data Architecture
- [findings]
- Readiness: [Ready | Needs Work | Missing]

### Routing & Templates
- [findings]
- Readiness: [Ready | Needs Work | Missing]

### SEO Foundations
- [findings]
- Readiness: [Ready | Needs Work | Missing]

### Internal Linking
- [findings]
- Readiness: [Ready | Needs Work | Missing]

### Performance at Scale
- [findings]
- Readiness: [Ready | Needs Work | Missing]

### Content Quality Safeguards
- [findings]
- Readiness: [Ready | Needs Work | Missing]

### Priority Actions (ordered)
1. [most critical gap]
2. [next priority]
...

### Recommended Skill Sequence
Based on findings, recommend which pseo-* skills to run and in what order.
If discovery was run, confirm which proposed page types are feasible given codebase state.
```

## Scope Parameter

If `$ARGUMENTS` specifies a scope, narrow the audit:
- `full` (default): Run all sections
- `routing`: Sections 1, 3 only
- `data`: Sections 1, 2 only
- `seo`: Sections 4, 5, 7 only
- `performance`: Sections 6 only

## Important Constraints

- Read files and analyze; do NOT modify any code during audit
- Be specific: cite file paths and line numbers for every finding
- Flag risks that would surface only at 1000+ pages (build time, memory, URL collisions)
- Distinguish between "not implemented" and "implemented incorrectly"
