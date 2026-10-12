---
name: pseo-metadata
description: Implement fully dynamic SEO metadata including title tags, meta descriptions, canonical URLs, Open Graph tags, and Twitter cards for programmatic SEO pages. Use when setting up or fixing metadata, adding OG/Twitter tags, implementing canonical URLs, or when metadata is static, duplicated, or missing across pSEO pages.
argument-hint: "[scope: all | titles | descriptions | canonical | opengraph | twitter]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
---

# pSEO Dynamic Metadata

Implement a metadata system that generates unique, accurate SEO tags for every programmatic page.

## Core Principles

1. **Every page gets unique metadata**: No two pages share the same title or description
2. **Data-driven generation**: Metadata is constructed from structured content fields, not hardcoded
3. **Canonical by default**: Every page declares its canonical URL, in the `<head>` of the initial HTML
4. **Social-ready**: Open Graph and Twitter cards are complete on every page
5. **Framework-native**: Use the framework's built-in metadata API

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
- `og:image` - Page-specific or category-specific image with alt text
- `og:locale` - Language/locale setting

### 6. Configure Twitter Card Tags

Required Twitter tags:
- `twitter:card` - Usually "summary_large_image"
- `twitter:title` - Can match OG title
- `twitter:description` - Can match OG description
- `twitter:image` - Can match OG image

### 7. Add Supplementary Meta Tags

Where appropriate:
- `robots`: Default to `index, follow`; set `noindex` for thin/utility pages
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

Googlebot for Search fetches only the first 2MB of uncompressed HTML (documented 2026-02-03); each CSS/JS resource has its own cap. Metadata that sits past 2MB is not read. Keep inline JSON, RSC payloads and giant tables small, and keep head tags first.

### 8. Export Metadata in Page Files

Wire the metadata generator into every page route. In Next.js 16, `params` is a Promise:

```typescript
// app/[category]/[slug]/page.tsx
export async function generateMetadata(
  { params }: { params: Promise<{ category: string; slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPageData(slug);
  if (!data) return {};
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

- Verify with `curl -s URL | grep -i canonical` and check the tag appears inside `<head>`. This placement advice is an inference from Google's docs, not a Google guarantee.

### 9. Internationalization (i18n) Metadata

For multi-language pSEO sites, add language-specific metadata:

- **hreflang tags**: Declare all language variants of each page. Every page must link to all its translations including itself.
  ```typescript
  alternates: {
    canonical: `${baseUrl}/${lang}${data.canonicalPath}`, // canonicalPath starts with "/"
    languages: {
      "en": `${baseUrl}/en${data.canonicalPath}`,
      "de": `${baseUrl}/de${data.canonicalPath}`,
      "x-default": `${baseUrl}/en${data.canonicalPath}`,
    },
  }
  ```
- **x-default**: Add `x-default` pointing to a language selector or default version when one exists
- **Canonical per language**: Each language version gets its own canonical (e.g., `/en/service/slug` and `/de/service/slug` are each self-canonical)
- **og:locale**: Set to the page's language (e.g., `en_US`, `de_DE`)
- **og:locale:alternate**: List all other available locales
- **URL structure**: Subdirectories (`/en/`, `/de/`) are the simplest default; avoid query params for language
- **Title and description**: Must be translated, not just the body. Templated metadata in the target language.

## Metadata Validation Rules

Run these checks (or integrate with pseo-quality-guard):
- No two pages produce the same title
- No two pages produce the same description
- All titles are between 30-70 characters
- All descriptions are between 100-170 characters
- All canonical URLs resolve to 200 status
- Canonical and robots tags appear inside `<head>` in the raw HTML (curl, no JS)
- Initial HTML is well under 2MB uncompressed
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
