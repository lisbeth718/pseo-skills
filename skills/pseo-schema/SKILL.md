---
name: pseo-schema
description: Implement JSON-LD structured data for programmatic SEO pages using types that still produce Google rich results (Product, Organization, LocalBusiness, BreadcrumbList, Article, JobPosting, Event, Review snippets and similar). Use when adding or fixing schema markup, removing retired types (FAQ, HowTo), or when Google Search Console reports schema errors. Markup must match visible content; no special schema is needed for AI features.
argument-hint: "[types: Article | Product | LocalBusiness | Organization | Breadcrumb | JobPosting | Event | Author | all]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
---

# pSEO Schema Markup

Implement JSON-LD structured data that describes what is visibly on each programmatic page, so eligible pages can qualify for rich results.

Research basis: https://github.com/lisbeth718/pseo-skills/blob/main/docs/research-2026-10.md (primary sources, 2026-10-12).

## Core Principles

1. **JSON-LD format**: Always use JSON-LD, not Microdata or RDFa
2. **Context-appropriate types**: Match schema type to the page's actual content
3. **Data-driven generation**: Schema is built from the same data that drives the page
4. **Valid and complete**: Every schema block must pass Google's Rich Results Test
5. **No fabrication**: Only include fields backed by real data
6. **Matches visible content**: Structured data must match the text users see on the page (Google's AI features docs repeat this)
7. **Review it like content**: Google says to manually fact-check AI-generated structured data, along with titles, meta descriptions and alt text

## Scope parameter

`types` selects what to implement. `Article`, `Product`, `LocalBusiness`, `JobPosting`, `Event`, `Breadcrumb`, `Organization` = sections 1-5 plus the matching rule in section 4 (Product also section 8, LocalBusiness also section 9). `Author` = sections 6 and 7 (author, reviewer and entity pages). `all` (default) = everything.

## What Schema Does and Does Not Do (as of 2026-10-12)

- **Rich results only.** The value of schema in Google Search is rich-result eligibility. It is not a ranking tactic.
- **No special schema for AI features.** Google states AI Overviews and AI Mode need no special schema.org markup, and tells sites not to over-focus on structured data. Do not add markup "for AI" or "for LLM extraction".
- **Retired in Google Search, do not generate for rich results:**
  - FAQ rich results: no longer shown from 2026-05-07, docs removed 2026-06-15
  - HowTo (removed 2023) and Sitelinks search box (removed 2024)
  - Practice problems (deprecated 2025-11-05, docs removed 2026-01-06)
  - Course info, Estimated salary, Learning video, Special announcement, Vehicle listing (phased out, docs removed 2025-09-09)
  - ClaimReview: being phased out in Google Search
- **Dataset** markup is only used by Dataset Search since 2025-11-05, not Google Search.
- **Breadcrumbs:** mobile results show the domain only since 2025-01-23. Desktop still shows breadcrumbs, and BreadcrumbList markup remains supported.

## FAQPage: Optional Semantic Markup Only

FAQPage no longer produces a rich result in Google. Do not add it for SERP real estate, ranking, or AI visibility. Keep it only if another consumer needs it (for example a non-Google parser) and the Q&A is fully visible on the page. If you have existing FAQPage or HowTo generators, remove them from the default page composition. Visible FAQ sections on the page can stay if they help users; they just do not need markup.

## Baseline Schema

- `BreadcrumbList`: on every page with a navigation hierarchy (desktop breadcrumb display)
- `Organization`: site-level, once per site (homepage or shared layout). The logo now lives in the Organization docs.
- `WebPage` / `WebSite`: optional semantic markup. They produce no Google rich result by themselves, so treat as low priority. Do not add a sitelinks search box (retired).

These are in addition to the content-specific types below.

## Schema Types by Page Context

Only types in Google's Search Gallery (page last updated 2026-06-15) are listed as primary.

| Page Type | Primary Schema | Supporting Schema |
|-----------|---------------|-------------------|
| Content/article page | `Article` | `BreadcrumbList`, `Organization` |
| Product page | `Product` (product snippet / merchant listing) | `BreadcrumbList`, `Offer`, review snippet fields where real |
| Category/hub page | `BreadcrumbList` (no hub-specific rich result exists) | `CollectionPage`, `ItemList` (optional semantic markup, no rich result; carousel only if eligible) |
| Local/location page | `LocalBusiness` | `BreadcrumbList`, `Organization` |
| Job page | `JobPosting` | `BreadcrumbList`, `Organization` |
| Event page | `Event` (must be bookable by the public at a physical location) | `BreadcrumbList` |
| Software page | `SoftwareApplication` | `BreadcrumbList` |
| Q&A / forum page | `QAPage` or `DiscussionForumPosting` (real user content only) | `BreadcrumbList` |

Other Search Gallery types that fit some pSEO sites: Recipe, Video, Vacation rental, Profile page, Return policy, Shipping policy, Loyalty program, Employer rating, Image license metadata. Use them only when the page genuinely is that thing.

## Implementation Steps

### 1. Create Schema Generator Functions

Build a module of pure functions that produce schema objects from page data:

```typescript
// lib/schema.ts

export function generateArticleSchema(data: PageData, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.h1,
    description: data.metaDescription,
    url,
    datePublished: data.publishedDate,
    dateModified: data.lastModified,
    author: { "@type": "Organization", name: "..." },
    publisher: { "@type": "Organization", name: "..." },
  };
}

export function generateProductSchema(data: ProductData, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.name,
    description: data.description,
    url,
    image: data.images,
    ...(data.category && { category: data.category }),
    // Only include offers when price and availability are visible on the page
    ...(data.price && {
      offers: {
        "@type": "Offer",
        price: data.price,
        priceCurrency: data.currency,
        availability: data.availabilityUrl,
        ...(data.priceValidUntil && { priceValidUntil: data.priceValidUntil }),
      },
    }),
  };
}

// FAQPage: OPTIONAL semantic markup only. Google retired the FAQ rich
// result (not shown from 2026-05-07) and no special schema is needed for AI
// features. Do not use this as a ranking or AI tactic. If used, the Q&A
// must be visible in the rendered HTML, never only in the JSON-LD.
export function generateFAQSchema(faqs: FAQ[]) {
  if (!faqs?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function generateBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
```

### 2. Create the Schema Renderer Component

Build a reusable component that injects JSON-LD into the page. Escape `<` so data cannot close the script tag:

```typescript
export function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
```

Keep JSON-LD small: it counts toward the Googlebot 2MB limit (pseo-templates section 6b), so do not inline huge `ItemList` or dataset blobs on every page.

### 3. Compose Schema per Page

Each page template composes its schema from multiple generators:

```typescript
// In the page component
const schemas = [
  generateArticleSchema(data, canonicalUrl),
  generateBreadcrumbSchema(breadcrumbItems),
].filter(Boolean);

// Render each as a separate script tag
{schemas.map((schema, i) => <JsonLd key={i} data={schema} />)}
```

### 4. Schema Field Rules

**Required fields per type** (check the type's current Google doc, requirements change):

- `Article`: headline, url, datePublished, dateModified, author, publisher
- `BreadcrumbList`: itemListElement with position, name, item
- `Product`: name, description, image; offers or review if available and visible on the page
- `LocalBusiness`: name, address; plus the fields Google lists for the business type
- `JobPosting`, `Event`: follow the current Google doc for required properties

**Field integrity rules:**
- `headline` must match the page's H1 or title
- `url` must match the canonical URL
- `dateModified` must be a valid ISO 8601 date
- Never include empty strings or placeholder values
- Never include fields with fabricated data (e.g., fake reviews)
- Every value must be visible on the page or derivable from what is visible

**Review snippets:**
- Only mark up real, first-party-visible reviews and ratings
- Avoid multiple ways of indicating the reviewed item (Google, 2025-11-12)
- No fake or undisclosed incentivized reviews (Google guideline, 2026-07-24)
- Never generate `AggregateRating` from invented numbers

**Product sale pricing:** use `validFrom`, `validThrough` and `priceValidUntil` for sale durations (Google, 2026-07-07).

### 5. Handle Multiple Schema Types

A single page can have multiple schema blocks. Render them as separate `<script type="application/ld+json">` tags, not as an array in one tag (for maximum compatibility).

## Validation

Schema must:
- Pass Google's Rich Results Test (https://search.google.com/test/rich-results)
- Pass Schema.org validation
- Match the visible page content
- Not include deprecated properties or retired types
- Not include fields with empty or placeholder values
- Use absolute URLs, not relative paths

Watch Search Console enhancement reports. Retired features (FAQ, HowTo, Course info and others) are gone from reports and the Rich Results Test, so a clean report there does not mean the markup does anything.

### 6. E-E-A-T Schema Support

E-E-A-T is not a specific ranking factor, but trust matters, especially on YMYL topics. Schema can state authorship and responsibility clearly. It reinforces what the visible page already shows; it does not replace it.

**Author/Organization schema:**
```typescript
interface AuthorInfo {
  type: "person" | "organization";
  name: string;
  url: string;
  role?: string;
  credentialCategory?: string;
  sameAs?: string[];
}

export function generateAuthorSchema(author: AuthorInfo) {
  return {
    "@context": "https://schema.org",
    "@type": author.type === "person" ? "Person" : "Organization",
    name: author.name,
    url: author.url,
    ...(author.role && { jobTitle: author.role }),
    ...(author.credentialCategory && {
      hasCredential: {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: author.credentialCategory,
      },
    }),
    ...(author.sameAs && { sameAs: author.sameAs }),
  };
}
```

**Add `author` and `publisher` to Article schema** and show the same attribution on the page.

**dateModified must be accurate.** Never set dateModified to today's date if the content has not actually changed. Use the real last-modified date from the data source. The same rule applies to sitemap `lastmod`, which Google uses only if it is consistently accurate.

**For YMYL content, additionally include:**
- `reviewedBy` on `WebPage` pointing to a `Person` (not a business type): `jobTitle` is the person's role, and `hasCredential` is `{ "@type": "EducationalOccupationalCredential", credentialCategory }`. Show the same reviewer and credential visibly on the page.
- `citation` or `isBasedOn` for content derived from authoritative sources

```typescript
export function generateReviewedWebPage(url: string, reviewer: { name: string; url: string; role: string; credentialCategory: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url,
    reviewedBy: {
      "@type": "Person",
      name: reviewer.name,
      url: reviewer.url,
      jobTitle: reviewer.role,
      hasCredential: {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: reviewer.credentialCategory,
      },
    },
  };
}
```

`reviewedBy`, `hasCredential` and `credentialCategory` are schema.org vocabulary; the [research doc](https://github.com/lisbeth718/pseo-skills/blob/main/docs/research-2026-10.md) does not verify Google reads them for any feature, so treat them as semantic markup of visible facts.

### 7. Author and Entity Pages (E-E-A-T)

Bylines should link to real pages, not just print names:

- **Author profile page** (`/authors/[slug]`): visible bio, role, credentials, and the pages they wrote. Markup: `ProfilePage` with `mainEntity` a `Person` (`name`, `jobTitle`, `sameAs` links to real profiles, `hasCredential` as above). "Profile page" is listed in Google's Search Gallery (research doc, Search Gallery list and section 11); the page must be about one real person or organization, with first-party content.
- **Organization / about page** (`/about`): the single place for the site-level `Organization` (name, logo, `sameAs`, contact). Link to it from the footer and from bylines of organization-authored pages.
- **Bylines** on every pSEO page link to the author or about page, using the same name as `author` in the Article schema. Organization attribution is acceptable for data-driven pages; do not invent a person.

```typescript
export function generateProfilePageSchema(url: string, person: AuthorInfo) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    mainEntity: {
      "@type": "Person",
      name: person.name,
      jobTitle: person.role,
      sameAs: person.sameAs,
      ...(person.credentialCategory && {
        hasCredential: {
          "@type": "EducationalOccupationalCredential",
          credentialCategory: person.credentialCategory,
        },
      }),
    },
  };
}
```

Never fabricate people, credentials or `sameAs` links.

### 8. E-commerce (short)

Verified in the [research doc](https://github.com/lisbeth718/pseo-skills/blob/main/docs/research-2026-10.md): Merchant listing, Product variants, Return policy and Shipping policy are Search Gallery features; merchant shipping policy markup was added 2025-11-12; `Product.category` and sale-duration fields were added in 2026 (see above).

- Product and merchant listing data must match the Merchant Center feed (price, availability, identifiers) and the visible page.
- Shipping and returns: `shippingDetails` on `Offer` and `hasMerchantReturnPolicy` on `Offer` (or an organization-level policy). Property names are schema.org; check the current Google doc for required fields before shipping.
- Variants: `ProductGroup` with `hasVariant` / `variesBy` for size or color variants. Check the Google Product variants doc for which properties it requires; this skill does not verify them.
- Per-field requirements beyond the above are not verified here. Keep markup generic and follow the live Google docs.

### 9. Local SEO (short)

`LocalBusiness` only for a real location, one per location, with NAP (name, address, phone) identical to the visible page and the business profile. A location page without unique local data (real address, staff, inventory, local facts) is a doorway page, not a local page: see pseo-quality-guard section 7.

### 10. Video

`VideoObject` for pages whose main content is a video: see Google's video doc for required properties (2026-09-24 added `creator`/`author` and `interactionStatistic`).

## File Organization

```
lib/
  schema.ts            # all schema generator functions
  schema.test.ts       # validation tests
components/
  JsonLd.tsx           # reusable JSON-LD renderer
```

## Relationship to Other Skills

- **Depends on**: pseo-data (structured fields feed schema generation)
- **Works with**: pseo-templates (schema components are rendered inside page templates)
- **Breadcrumb data from**: pseo-linking (breadcrumb trail structure)

## Verify

Build, start the app, and run seo-regression-guard against localhost (`npx -y tsx <seo-regression-guard-dir>/scripts/seo-check.ts --site http://localhost:3000`). Zero errors for the touched templates; also run the Rich Results Test on one URL per template.
