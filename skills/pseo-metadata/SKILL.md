---
name: pseo-metadata
description: Implement fully dynamic SEO metadata including title tags, meta descriptions, canonical URLs, Open Graph tags, and Twitter cards for programmatic SEO pages. Use when setting up or fixing metadata, adding OG/Twitter tags, implementing canonical URLs, or when metadata is static, duplicated, or missing across pSEO pages.
argument-hint: "[scope: all | titles | descriptions | canonical | opengraph | twitter | robots | export | i18n]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
---

# pSEO Dynamic Metadata

Implement a metadata system that generates unique, accurate SEO tags for every programmatic page.

## Core Principles

1. **Every page gets unique metadata**: No two pages share the same title or description
2. **Data-driven generation**: Metadata is constructed from structured content fields, not hardcoded
3. **Canonical by default**: Every page declares its canonical URL, in the `<head>` of the initial HTML
4. **Social-ready**: Open Graph and Twitter cards are complete on every page, with a page-specific or per-category image (never one site-wide placeholder)
5. **Framework-native**: Use the framework's built-in metadata API

## Scope parameter

`all` (default) = everything. `titles` = section 2, `descriptions` = section 3, `canonical` = section 4 (and 8a), `opengraph` = section 5, `twitter` = section 6, `robots` = sections 7, 7a, 7b, `export` = sections 8 and 8a, `i18n` = section 9.

## Implementation Steps

### 1. Create the Metadata Generator

Build a centralized function that constructs metadata from page data:

**Next.js App Router pattern:**
```typescript
// lib/metadata.ts
import type { Metadata } from "next";

export function generatePageMetadata(data: PageData, baseUrl: string): Metadata {
  const title = buildTitle(data);
  const description = buildDescription(data);
  const canonicalUrl = `${baseUrl}${data.canonicalPath}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "article",
      siteName: "Site Name",
      // images: [{ url, width, height, alt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      // images: [url],
    },
  };
}
```

### 2. Build Title Construction Logic

Titles must be:
- **Unique** across all pages (validate with pseo-quality-guard)
- **50-60 characters** target length (hard cap at 70)
- **Front-loaded** with the primary keyword
- **Accurate to the page**: Google may rewrite titles that are stuffed, boilerplate or do not describe the page. Do not fight rewrites with more keywords; make the title and H1 agree and describe the content.
- **Multi-dimensional**: Use 2+ data fields to construct, not just one variable

```typescript
function buildTitle(data: PageData): string {
  // Combine multiple data dimensions
  // e.g., "{primary keyword} - {differentiator} | {brand}"
  // NOT just "{keyword} | Brand" for every page
}
```

### 3. Build Description Construction Logic

Descriptions must be:
- **Unique** across all pages
- **150-160 characters** target length
- **Action-oriented**: Include a value proposition or call to action
- **Keyword-inclusive**: Naturally incorporate the page's target keyword
- Google often shows its own snippet instead of the meta description. Write it for users, not as a ranking lever.
- Review generated titles and descriptions by hand. Google says to fact-check all AI-generated titles and meta descriptions.

### 4. Implement Canonical URLs

- Every page must set a self-referencing canonical URL in the `<head>` (Google's canonical docs specify the head section)
- If JavaScript sets or changes the canonical, it must equal the canonical in the original HTML, or leave it out of the original HTML (Google, 2025-12-17)
- Use absolute URLs (include protocol and domain)
- Canonicals must match the actual URL path exactly (no trailing slash mismatches)
- For paginated content, each page gets its own canonical
- If a page has query parameters, the canonical should point to the clean URL
- For paginated content, never point every page at page 1
- Near-duplicate template pages split into separate canonicals faster when the difference is clear and significant. After fixing duplicates, Google may hold a cluster for up to two weeks.

### 5. Configure Open Graph Tags

Required OG tags for every pSEO page:
- `og:title` - Can differ from the HTML title (no brand suffix needed)
- `og:description` - Can differ from meta description
- `og:url` - Must match canonical
- `og:type` - Usually "article" for content pages, "website" for hubs
- `og:site_name` - Consistent across all pages
- `og:image` - Page-specific image, else a per-category image generated with `opengraph-image.tsx` (`ImageResponse`); never one site-wide placeholder. Always include alt text
- `og:locale` - Language/locale setting

Image SEO for these images (details in pseo-templates section 9):
- Descriptive, data-driven `alt` on every image, fact-checked if AI-written.
- Important images belong in an image sitemap: see pseo-linking section 6.
- AI-generated images carry IPTC digital source type `TrainedAlgorithmicMedia` in the file metadata (Merchant Center requires it; see the [research doc](https://github.com/lisbeth718/pseo-skills/blob/main/docs/research-2026-10.md)).

### 6. Configure Twitter Card Tags

Required Twitter tags:
- `twitter:card` - Usually "summary_large_image"
- `twitter:title` - Can match OG title
- `twitter:description` - Can match OG description
- `twitter:image` - Can match OG image

### 7. Add Supplementary Meta Tags

Where appropriate:
- `robots`: Default to `index, follow`; set `noindex` only for utility, filtered-view and share/tool-output pages; thin pages are not generated or return 404/410 (pseo-data, Data Sufficiency First)
- Put `noindex` in the initial HTML when you mean it, and do not rely on JavaScript to remove it later. If the original HTML has `noindex`, Google may skip rendering and never see the JS change (Google, 2025-12-15). Pages you may want indexed should not ship `noindex` at all.
- Do not use `noindex` to save crawl budget; Google still requests the URL. Use 404/410 for removed pages and robots.txt for URL spaces you never want crawled.
- `author`: If content has an author
- `article:published_time` / `article:modified_time`: For article-type pages

### 7a. Snippet and AI Feature Controls

Eligibility for AI Overviews and AI Mode needs only indexing and a snippet-eligible page. No extra tags are required. To limit use, per page:

- `nosnippet`: no snippet in web search, Images, Discover, AI Overviews or AI Mode, and the content is not used as direct input for AI Overviews and AI Mode
- `max-snippet:[n]`: caps how much text may be used, including as direct input for AI Overviews and AI Mode
- `data-nosnippet`: excludes specific sections at text level
- `noindex`: removes the page from Search entirely
- `noarchive`, `nocache`, `nositelinkssearchbox` are ignored

Site-wide, Search Console > Settings > Search generative AI can exclude the property from AI Overviews and AI Mode without affecting classic Search. `Google-Extended` in robots.txt does not control AI Overviews or AI Mode.

```typescript
robots: { index: true, follow: true, "max-snippet": 160 }  // only when you want a cap
```

Google respects robots meta tags in the body (2026-03-24), but still keep robots and canonical in the head.

### 7b. HTML Size

Keep head tags first and the HTML small. The 2MB Googlebot limit and how to stay under it: see pseo-templates section 6b.

### 8. Export Metadata in Page Files

Wire the metadata generator into every page route. In Next.js 16, `params` is a Promise:

```typescript
// app/[category]/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata(
  { params }: { params: Promise<{ category: string; slug: string }> }
): Promise<Metadata> {
  const { category, slug } = await params;
  const data = await getPageData(slug);
  if (!data || data.category !== category) notFound();
  return generatePageMetadata(data, process.env.NEXT_PUBLIC_BASE_URL!);
}
```

### 8a. Next.js 16 Metadata Streaming: Keep Canonical in the Head

Next.js may stream `generateMetadata` output into `<body>` for JavaScript-executing bots (verified for Googlebot). Google's canonical docs specify `<head>`, and there is no Google statement accepting `rel=canonical` in the body. To be safe:

- Make canonical and robots metadata resolve in the initial head shell: static metadata, a cached lookup (`"use cache"` inside `generateMetadata` or the data function), or no runtime data in metadata.
- With Cache Components, metadata that reads runtime data defers to request time. Next then forces an explicit choice: `use cache` in `generateMetadata` or a dynamic marker. Choose the cache.
- Or force blocking head metadata for all bots in `next.config.ts`:

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  htmlLimitedBots: /.*/,
};
export default nextConfig;
```

- `htmlLimitedBots` replaces the default bot list, so the regex above must cover every bot you want to receive blocking metadata.
- Verify with `curl -s URL | grep -i canonical` and check the tag appears inside `<head>`. This placement advice is an inference from Google's docs, not a Google guarantee.

### 9. Multilingual

See seo-i18n (hreflang only for published locales; sitemap hreflang preferred). Do not hardcode language lists in metadata.

## Metadata Validation Rules

Run these checks (or integrate with pseo-quality-guard):
- No two pages produce the same title
- No two pages produce the same description
- All titles are between 30-70 characters
- All descriptions are between 100-170 characters
- All canonical URLs resolve to 200 status
- Canonical and robots tags appear inside `<head>` in the raw HTML (curl, no JS)
- Initial HTML is well under the 2MB limit (pseo-templates section 6b)
- All OG tags are present on every page
- No page is missing metadata entirely

## File Organization

```
lib/
  metadata.ts          # generatePageMetadata() and helpers
  metadata.test.ts     # validation tests for metadata generation
```

## Relationship to Other Skills

- **Depends on**: pseo-data (content models provide metadata fields)
- **Works with**: pseo-templates (metadata is exported alongside page components)
- **Validated by**: pseo-quality-guard (checks uniqueness and completeness)

## Verify

Build, start the app, and run seo-regression-guard against localhost (`npx -y tsx <seo-regression-guard-dir>/scripts/seo-check.ts --site http://localhost:3000`). Zero errors for the touched templates; canonical and robots appear inside `<head>` in the raw HTML.
