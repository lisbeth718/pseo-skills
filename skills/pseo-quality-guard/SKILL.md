---
name: pseo-quality-guard
description: Validate programmatic SEO pages against quality standards to prevent thin content, duplicate content, and keyword cannibalization. Use when auditing pSEO output quality, before deploying new pages, when Google Search Console reports issues, or when checking if generated pages meet quality thresholds. This skill can also be used automatically to validate changes made by other pseo-* skills.
argument-hint: "[check: all | thin | duplicates | cannibalization | metadata | abuse | prune | delta]"
allowed-tools: Read, Glob, Grep, Bash
---

# pSEO Quality Guard

Validate generated pages against SEO quality standards. Detect and flag issues that would cause Google to devalue, deindex, or penalize programmatic pages.

## Core Principles

1. **No thin pages**: Every page must provide substantial, unique value
2. **No duplicate content**: No two pages should have the same or near-identical content
3. **No cannibalization**: No two pages should target the same keyword or intent
4. **Metadata uniqueness**: Every page has unique title and description
5. **Fail loudly**: Quality issues should block deployment, not slip through silently

## Quality Checks

### 1. Thin Content Detection

A page is thin if it:
- Has fewer than 300 words of unique text content (excluding navigation, footer, boilerplate)
- Is essentially a template with only 1-2 variable substitutions
- Contains no meaningful content beyond its metadata
- Has the same paragraph structure as other pages with only proper nouns changed

**How to check:**
- Extract text content from each rendered page (strip HTML tags, nav, footer)
- Count unique words per page
- Compare content across pages - compute similarity ratios
- Flag pages with < 300 unique words or > 80% similarity to another page

### 2. Duplicate Content Detection

Check for:
- **Exact duplicates**: Two pages with identical body content
- **Near duplicates**: Pages with > 80% text similarity (use Jaccard similarity on n-grams or cosine similarity)
- **Title duplicates**: Two pages with the same `<title>` tag
- **Description duplicates**: Two pages with the same meta description
- **URL-based duplicates**: Different URLs serving the same content (www vs non-www, trailing slash variants)

**How to detect:**

At small scale (< 200 pages), pairwise comparison is feasible:
```
For each pair of pages:
  similarity = intersection(ngrams(page_a), ngrams(page_b)) / union(ngrams(page_a), ngrams(page_b))
  if similarity > 0.8: FLAG as near-duplicate
```

At scale (200+ pages), pairwise is O(n²) and impractical. Use one of:
- **MinHash / LSH**: Hash n-gram sets into fixed-size signatures, use locality-sensitive hashing to find candidate pairs. Reduces comparisons from O(n²) to near-linear.
- **SimHash**: Compute a fingerprint per page, compare fingerprints (Hamming distance). Pages with similar fingerprints are candidates.
- **Sampling**: Compare each page against a random sample of 50 others + all pages in the same category. Not exhaustive but catches the common cases.
- **Template fingerprinting**: Hash the non-variable parts of each page. If two pages share the same template fingerprint, flag them - they differ only in variable slots.

### 3. Keyword Cannibalization Detection

Cannibalization occurs when multiple pages target the same search query.

**Detection method:**
- Extract the primary keyword/intent from each page (from title, H1, and first paragraph)
- Group pages that share the same primary keyword
- Flag groups with 2+ pages targeting the same keyword

**Resolution strategies:**
- Merge thin pages targeting the same keyword into one comprehensive page
- Differentiate intent (informational vs. transactional vs. navigational)
- Canonical only for true duplicates (same content, different URL); it is not a cannibalization fix
- Cannibalization fix: merge + 301, or differentiate intent/entity

### 4. Metadata Quality Validation

Check every page's metadata for:

| Field | Validation Rule |
|-------|----------------|
| Title | Present, 30-70 chars, unique across all pages |
| Description | Present, 100-170 chars, unique across all pages |
| H1 | Present, exactly one per page, unique across all pages |
| Canonical | Present, absolute URL, self-referencing |
| OG:title | Present |
| OG:description | Present |
| OG:url | Present, matches canonical |

### 5. Schema Markup Validation

- Every page has at least BreadcrumbList schema
- Content pages have Article or appropriate type schema
- Schema matches visible text and is fact-checked (Google asks for review of titles, descriptions, structured data and alt text on AI-generated pages)
- Do not generate FAQPage or HowTo markup for Google: FAQ rich results stopped showing 2026-05-07 and HowTo went in 2023. Keep it only if another consumer needs it
- Use types that still have Search features (Product, Review snippet, Breadcrumb, JobPosting, Event, LocalBusiness, Organization). Structured data is not required for AI features
- No schema has empty or placeholder values
- All URLs in schema are absolute

### 6. Internal Link Health

- No orphan pages (pages with zero inbound internal links)
- No broken internal links (href targets that return 404)
- Every page links back to its category hub
- Breadcrumbs are present and correct

### 7. Scaled Content Abuse and Doorway Detection (Google policy, state as of 2026-10)

Google's spam policies target pages generated "for the primary purpose of manipulating search rankings and not helping users ... no matter how it's created". The method (AI, templates, human) is irrelevant; only intent and value matter. Google publishes no per-update targets for its spam updates, so treat the thresholds below as internal heuristics, not Google facts.

**Recent Google updates (Search Status Dashboard, Jan 2025 - Oct 2026):**
- Core: March 2025, June 2025, December 2025, March 2026, May 2026 (plus unannounced "smaller core updates" that Google documents as continual since 2025-12-09, so recovery does not wait for a named update)
- Spam: August 2025, March 2026, June 2026, August 2026, September 2026 (2026-09-24 to 2026-10-08)
- Discover only: February 2026 Discover core update

**Current policy wording that matters for pSEO:**
- **Scaled content abuse** examples: gen-AI pages "without adding value", scraped or synonymized feeds, stitched content, multiple sites hiding the scale, keyword pages that "make little or no sense to a reader". Auto-translation without added value counts (June 2025 doc change).
- **Fan-out and query-variation pages**: separate pages for every query variation "or fan-out queries" to manipulate rankings or AI responses violate the scaled content abuse policy (AI optimization guide, 2026-05-15). Spam policies also cover "attempting to manipulate generative AI responses" (2026-05-15).
- **Doorway abuse**: "substantially similar pages that are closer to search results than a clearly defined, browseable hierarchy", and pages "targeted at specific regions or cities that funnel users to one page".
- **Keyword stuffing**: includes "blocks of text that list cities and regions" a page tries to rank for.
- **Thin affiliation / cookie-cutter templates** replicated within a site or across domains or languages.
- **Expired domain abuse**: repurposing an expired domain mainly to host low-value content that exploits its old ranking signals.
- **Site reputation policy** (updated 2026-08-28): third-party content is a violation only if published mainly because of the host's established ranking signals. Outside the EEA the manual action applies to the affected section; in the EEA there is no manual-action impact and the section may rank separately. Default presumption: new pages are judged against the overall quality of the domain, so a large batch of thin pages is a site-level risk.
- **Back-button hijacking** (enforced from 2026-06-15): includes code from ad platforms and libraries. Check third-party scripts.
- **User spam reports** can directly trigger manual actions (from 2026-04-14).
- **Quality Rater Guidelines**: current version is 2025-09-11 (no verified 2026 update). Section 4.6.5 (scaled content abuse) and 4.6.6 (little-to-no effort, originality or added value) rate such pages Lowest. Section 5.2.2 treats prominent filler ahead of the main content as a Low signal.

**Check for these patterns (internal heuristics):**

- **Template repetitiveness ratio**: Extract the boilerplate (shared HTML structure and text) from all pages of a type. If boilerplate is 60-80%, flag as warning; if > 80%, flag as critical risk.
- **Variable-swap-only differentiation**: If the only differences between pages are proper nouns (city names, product names, keywords), flag as extremely high risk. This is the doorway and scaled content pattern.
- **Doorway shape**: Many city/region/service combination pages that funnel users to one conversion page, or that are reachable mainly from search-like listings rather than a browseable hierarchy. Flag.
- **Query-variation clusters**: Several pages whose primary keywords are paraphrases of one intent. Flag for merge.
- **Filler content patterns**: Detect generic introductory paragraphs ("In today's world...", "When it comes to...", "If you're looking for...") that add no information.
- **Value-first test**: Check if the primary content/answer appears within the first 200 words. Pages that bury value below filler can be rated Low by quality raters (QRG 5.2.2).
- **E-E-A-T signal presence**: Check for author attribution, data sources, last-updated dates. Google says E-E-A-T is not a ranking factor itself, but trust matters most, so absence of all trust signals on pSEO pages is a risk factor.
- **Non-commodity test**: Could a generic gen-AI model produce this page without your data? If yes, it is commodity content.
- **Rollout size**: Large single-day batches are worth a review. Google does not document a "publication velocity" detector or any numeric page-count trigger; this is a precaution, not a known rule.
- **Third-party scripts**: no back-button hijacking from ad or library code.

**Severity (internal heuristics):**
- Template repetitiveness > 80%: **Critical**, high risk of being treated as scaled content abuse
- Template repetitiveness 60-80%: **Warning**, at risk, needs content enrichment
- Doorway shape or variable-swap-only pages present: **Critical**
- No E-E-A-T signals on any page: **Warning**
- Very large single-day batch: **Info**

### 8. Heading Hierarchy Validation

Check every page for correct heading structure:
- Exactly one `<h1>` per page
- No heading level skips (h1 → h3 without h2 is invalid)
- Headings follow a logical document outline (h1 > h2 > h3)
- No empty heading tags
- Heading content is meaningful (not generic like "Section 1")

### 9. Robots and Indexation

- Pages intended for indexing have `index, follow` (or no robots tag)
- Thin pages are not generated, or return 404/410. `noindex` only for pages useful to users but not for Search (utility, filtered views, share and tool-output pages per Google's UGC spam guide, 2026-10-26)
- No important pages accidentally blocked by robots.txt
- Sitemap includes all indexable pages and excludes noindexed ones
- Pages with no data return a real 404/410 (not a 200 soft 404); in Next.js, `notFound()` after streaming has started returns 200
- `noindex` in the initial HTML is not removed later by JS (Google may skip rendering and never index the page)

## Output Format

```
## pSEO Quality Report

### Summary
- Total pages checked: X
- Issues found: X (Y critical, Z warnings)

### Thin Content
- [list of pages with word counts below threshold]

### Duplicate Content
- [list of duplicate pairs with similarity scores]

### Keyword Cannibalization
- [list of keyword groups with competing pages]

### Metadata Issues
- [list of pages with metadata problems]

### Schema Issues
- [list of pages with schema problems]

### Linking Issues
- [list of orphan pages and broken links]

### Scaled Content Abuse Risk (internal heuristics)
- Template boilerplate ratio: X%
- Doorway-shaped or query-variation clusters: X
- Variable-swap-only pages: X
- Pages missing E-E-A-T signals: X
- Filler intro patterns detected: X pages
- Risk level: [Low | Medium | High | Critical]

### Pruning Recommendations
- Pages to remove: X
- Pages to merge: X
- Pages to noindex: X
- Pages to enrich: X
- [list of specific pages and recommended action]

### Action Required
1. [prioritized list of fixes]
```

## Memory Considerations

Quality checks load and compare page content across the full site. At scale this is the most memory-intensive operation in the pSEO pipeline.

**Do NOT load all full page content into memory at once.** Instead:

- **Stream-compare**: Load pages one at a time, compute a fingerprint (hash or MinHash signature), store only the fingerprint (~100 bytes per page). Compare fingerprints after all pages are processed.
- **Batch by category**: Run similarity checks within each category first (most duplicates are same-category). Only run cross-category checks on a sample.
- **Write intermediate results to disk**: For large sites, write per-page metrics (word count, fingerprint, title hash) to a JSON file, then process the file.

Memory budget estimate:
| Pages | Fingerprints only | Full content in memory |
|-------|-------------------|----------------------|
| 1,000 | ~100KB | ~100-500MB |
| 10,000 | ~1MB | ~1-5GB (will OOM) |
| 50,000 | ~5MB | ~5-25GB (impossible) |

Always use the fingerprint approach at 500+ pages.

## Content Pruning Recommendations

When quality checks find issues, don't just flag - recommend action.

See `references/thresholds.md` → "Content Pruning Decision Thresholds" for the exact decision table (conditions and actions).

200 genuinely valuable pages outperform 5,000 thin pages. Pruning is not failure - it's quality control.

**After pruning:**
- Use 301 only when a genuinely equivalent page exists; otherwise return 404/410
- Update the sitemap to exclude removed pages
- Update internal links that pointed to removed pages
- Re-run quality guard to verify improved metrics

## Integration as Build Check

This skill can be turned into a build-time validation script:

```typescript
// scripts/validate-pseo.ts
// Run: npx tsx scripts/validate-pseo.ts
// CI/CD: exits with code 1 if critical issues found

// Import the pure fetchers from lib/data/source.ts (pseo-data splits pure fetchers from "use cache" wrappers)
import { getAllSlugs, getPageData } from "../lib/data/source";

async function validate() {
  const slugs = await getAllSlugs();
  const issues: { slug: string; level: "critical" | "warning"; message: string }[] = [];

  for (const { slug } of slugs) {
    const page = await getPageData(slug);
    if (!page) {
      issues.push({ slug, level: "critical", message: "Page data missing" });
      continue;
    }
    if (!page.title || !page.metaDescription || !page.h1) {
      issues.push({ slug, level: "critical", message: "Missing required metadata" });
    }
    if (!page.title) continue;
    if (page.title.length > 70) {
      issues.push({ slug, level: "warning", message: `Title too long: ${page.title.length} chars` });
    }
    // Add more checks: word count, duplicate titles, schema presence, etc.
  }

  const critical = issues.filter((i) => i.level === "critical");
  console.log(`Checked ${slugs.length} pages. ${issues.length} issues (${critical.length} critical).`);
  issues.forEach((i) => console.log(`[${i.level}] ${i.slug}: ${i.message}`));
  process.exit(critical.length > 0 ? 1 : 0);
}

validate();
```

## Scope Parameter

If `$ARGUMENTS` specifies a check:
- `all` (default): Run all checks
- `thin`: Thin content detection only
- `duplicates`: Duplicate content detection only
- `cannibalization`: Keyword cannibalization only
- `metadata`: Metadata validation only
- `abuse`: Scaled content abuse pattern detection only
- `prune`: Run all checks and output pruning recommendations
- `delta`: Run all checks on pages modified since last validation only (requires content hashing - see pseo-scale section 4)

## Relationship to Other Skills

- **Validates output of**: pseo-templates, pseo-metadata, pseo-schema, pseo-linking
- **Depends on**: pseo-data (needs access to all page data for cross-page comparisons)
- **Run after**: Any other pseo-* skill to verify quality
- **Extended by**: pseo-scale (incremental/delta validation, parallel category-partitioned checks, content hash storage)
