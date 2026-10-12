# pSEO research: Google Search, AI search, crawlers, Next.js (state as of 2026-10-12)

Method: primary sources fetched on 2026-10-12 (Google Search Central docs/blog, Search Status Dashboard, Google crawling docs, Search Console help, vendor crawler docs, nextjs.org, npm, vercel.com, web.dev, IETF). "Last updated" = page footer date at fetch time. Items marked UNVERIFIED rest on secondary sources only.

---

## 0. TL;DR: changes that invalidate common pSEO advice

1. **FAQ rich results are gone** (no longer shown from 2026-05-07; docs removed 2026-06-15). HowTo was already gone in 2023, and so are Sitelinks search box (2024) and practice problems (Jan 2026). Course info, Estimated salary, Learning video, Special announcement and Vehicle listing went in Sep 2025, and ClaimReview is being phased out. "Add FAQPage schema for SERP real estate" is dead advice. [updates](https://developers.google.com/search/updates)
2. **Fan-out page farms are named as scaled content abuse.** Google's AI optimization guide (2026-05-15) says creating separate pages for every query variation "or fan-out queries" to manipulate rankings or AI responses violates the scaled content abuse policy. Spam policies now also cover "attempting to manipulate generative AI responses" (2026-05-15). [ai-optimization-guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [spam-policies](https://developers.google.com/search/docs/essentials/spam-policies)
3. **Doorway policy text matters for pSEO.** It names "substantially similar pages that are closer to search results than a clearly defined, browseable hierarchy" and "pages targeted at specific regions or cities that funnel users to one page". Keyword stuffing includes "blocks of text that list cities and regions". [spam-policies](https://developers.google.com/search/docs/essentials/spam-policies)
4. **llms.txt, chunking, "AEO/GEO" rewriting and special schema do nothing in Google Search.** Google states this officially (guide published 2026-05-15, llms.txt note added 2026-06-15). llms.txt still matters for non-Google agents: llmstxt.org v2 came out 2026-08-10, and Chrome Lighthouse has an experimental llms.txt audit. [ai-optimization-guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
5. **New per-site opt-out from AI Overviews / AI Mode** without losing classic Search: Search Console > Settings > Search generative AI (all sites since 2026-08-31). The Generative AI performance report covers impressions only, with no query dimension and no API found. [support 16908024](https://support.google.com/webmasters/answer/16908024), [support 16984139](https://support.google.com/webmasters/answer/16984139)
6. **Googlebot (Search) fetches only the first 2MB of uncompressed HTML** (64MB for PDF), and each CSS/JS resource is capped separately (documented 2026-02-03). The 15MB figure is the generic default for Google's crawlers. Bloated pSEO HTML (inline JSON or RSC payloads, giant tables) can be truncated. [googlebot](https://developers.google.com/search/docs/crawling-indexing/googlebot)
7. **Noindex rules tightened in Dec 2025.** If a page with `noindex` in the initial HTML has its noindex removed by JS, it may never be indexed, because Google may skip rendering. Non-200 pages may not be rendered at all (2025-12-18). [js-seo-basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
8. **Next.js streaming returns status 200 for `notFound()` once the stream has started.** Next injects `noindex`, and Google may label these pages soft 404. The 404 check has to happen before streaming (in proxy.ts or before any Suspense boundary). Metadata may also stream into `<body>` for Googlebot, but Google's canonical docs specify `<head>`. [loading.md](https://nextjs.org/docs/app/api-reference/file-conventions/loading), [generate-metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
9. **Site reputation policy changed again (2026-08-28).** EEA results get no manual-action demotion. Separated sections rank independently instead, and the policy text now lists "editorial oversight / fully integrated" factors. This partly reverses the Nov 2024 "regardless of first-party oversight" line. [blog](https://developers.google.com/search/blog/2026/08/update-site-reputation-policy)
10. **Spam updates are frequent and short.** Four spam updates came in 2026 (Mar, Jun, Aug, Sep), alongside core updates in Mar and May 2026 and Dec 2025. Google also documents unannounced "smaller core updates" (2025-12-09). From 2026-04-14, user spam reports can directly trigger manual actions. [status dashboard](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history)

---

## 1. Google ranking updates, Jan 2025 to 2026-10-12

Source for all rows: [Search Status Dashboard ranking history](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history) and the individual incident pages (times US/Pacific). `developers.google.com/search/updates/ranking` now 301s to the dashboard.

| Update | Start | Complete | Google's stated scope |
|---|---|---|---|
| March 2025 core update | 2025-03-13 | 2025-03-27 | "up to 2 weeks" |
| June 2025 core update | 2025-06-30 | 2025-07-17 | "up to 3 weeks" |
| August 2025 spam update | 2025-08-26 | 2025-09-22 | global, all languages, "few weeks" |
| December 2025 core update | 2025-12-11 | 2025-12-29 | "up to 3 weeks" |
| February 2026 Discover core update | 2026-02-05 | 2026-02-27 | Discover only, US English first |
| March 2026 spam update | 2026-03-24 | 2026-03-25 | global, all languages |
| March 2026 core update | 2026-03-27 | 2026-04-08 | "up to 2 weeks" |
| May 2026 core update | 2026-05-21 | 2026-06-02 | "up to 2 weeks" |
| June 2026 spam update | 2026-06-24 | 2026-06-26 | global, all languages |
| August 2026 spam update | 2026-08-18 | 2026-08-21 | global, all languages |
| September 2026 spam update | 2026-09-24 | 2026-10-08 | global, all languages, "up to two weeks" |

The last 2024 entries were the December 2024 spam update (2024-12-19), the December 2024 core update (2024-12-12) and the November 2024 core update (2024-11-11).

**What the updates targeted**
- Google publishes no per-update target for spam updates. Incident text only says "applies globally and to all languages".
- Secondary commentary (UNVERIFIED) attributes the Sep 2026 spam update to scaled content, expired domains and site reputation. Examples: [digitalapplied 2026-09-24](https://www.digitalapplied.com/blog/google-september-2026-spam-update-rollout-day-one), [firebrand 2026-09](https://www.firebrand.marketing/2026/09/surviving-google-spam-updates-in-the-age-of-ai/).
- Secondary sources (UNVERIFIED, vendor blogs) report a wave of "Scaled content abuse" manual actions with full deindexing from about June 2025, for example [beyondindigopets](https://www.beyondindigopets.com/blog/how-google-is-cracking-down-on-scaled-content-abuse/). No Google confirmation was found.
- The Feb 2026 Discover core update (blog 2026-02-05) aimed to show more locally relevant content, less sensational content and clickbait, and more "in-depth, original, and timely content from websites with expertise". Expertise is judged "on a topic-by-topic basis". [blog](https://developers.google.com/search/blog/2026/02/discover-core-update)

**Core update guidance (doc changelog 2025-12-09).** Google "continually" ships smaller core updates that are "not announced because they aren't widely noticeable". Recovery therefore doesn't have to wait for a named update. [core-updates](https://developers.google.com/search/docs/appearance/core-updates)

**Policy timeline relevant to pSEO**
- **2024-03-05:** three new spam policies (expired domain abuse, scaled content abuse, site reputation abuse) launched alongside the March 2024 spam update. The helpful content system was folded into core ranking: "There's no longer one signal or system used to do this." [blog](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)
- **2024-11-19:** site reputation abuse became a violation "regardless of whether there is first-party involvement or oversight". [blog](https://developers.google.com/search/blog/2024/11/site-reputation-abuse)
- **2025-06-11:** Google removed its multilingual doc advice to robots.txt-block auto-translated pages, to align with scaled content abuse. Auto-translation without added value counts as scaled content. [updates](https://developers.google.com/search/updates)
- **2026-04-13:** new "back button hijacking" policy under malicious practices, enforced from 2026-06-15. It covers manual actions and automated demotions, and explicitly includes code from ad platforms and libraries. [blog](https://developers.google.com/search/blog/2026/04/back-button-hijacking)
- **2026-04-14 and 2026-04-23:** Google "may use spam report submissions to take manual action". Report text may be sent to the site owner. [updates](https://developers.google.com/search/updates), [report-quality-issues](https://developers.google.com/search/help/report-quality-issues)
- **2026-05-15:** spam policies explicitly apply to generative AI responses in Search. The definition now includes "attempting to manipulate generative AI responses in Google Search". [updates](https://developers.google.com/search/updates)
- **2026-08-28:** site reputation policy update. Details are in section 1a. [blog](https://developers.google.com/search/blog/2026/08/update-site-reputation-policy)

### 1a. Current spam policy text relevant to pSEO
Source: [spam-policies](https://developers.google.com/search/docs/essentials/spam-policies), last updated 2026-08-28.

**Scaled content abuse** is "many pages are generated for the primary purpose of manipulating search rankings and not helping users ... no matter how it's created". Examples:
- gen-AI used to produce many pages "without adding value"
- scraping feeds or search results, including synonymizing, translating or other obfuscation
- stitching content together without adding value
- running multiple sites to hide the scale
- keyword pages that "make little or no sense to a reader"

**Doorway abuse** lists:
- multiple domains or pages "targeted at specific regions or cities that funnel users to one page"
- "Creating substantially similar pages that are closer to search results than a clearly defined, browseable hierarchy"

**Keyword stuffing** includes "Blocks of text that list cities and regions that a web page is trying to rank for".

**Scraping** is now its own section. It covers "Creating sites dedicated to embedding or compiling content ... without substantial added value".

**Thin affiliation** covers cookie-cutter templates "replicated within the same site or across multiple domains or languages".

**Expired domain abuse** is unchanged since 2024.

**Site reputation policy** (renamed from "site reputation abuse"):
- Third-party content alone is not a violation. It violates only if it is published "mainly because of that host site's already-established ranking signals".
- Review factors: consistent presentation and UX, quality relative to the main domain, stated authorship and responsibility, and whether the content appears near-identically on other sites. "Not one of these factors is either necessary or sufficient."
- Outside the EEA, a manual action applies to the affected section.
- Inside the EEA (from 2026-08-30), there is no manual-action impact. The section "may be categorized as separate from the main domain" and ranks on its own merits over time. Earlier EEA manual actions were lifted, and EEA sites get mediation.
- Default presumption: "individual pages (including new pages) match the overall quality of other pages on the domain".

**Policy circumvention** covers using new subdomains, subdirectories or sites to keep violating the policies.

---

## 2. Guidance on AI-generated / programmatic content, E-E-A-T, rater guidelines

**Using generative AI content** ([doc](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content), first added 2025-05-21, updated 2026-10-01):
- AI is useful for research and structure. "Using generative AI tools or other similar tools to generate many pages without adding value for users may violate" the scaled content abuse policy.
- "It is critical to manually factcheck and review all AI-generated content". This includes titles, meta descriptions, structured data and alt text.
- Points readers to Search Quality Rater Guidelines section 4.6.5 (Scaled Content Abuse) and 4.6.6 (little-to-no effort, originality or added value).
- Suggests disclosing how automation was used.
- Merchant Center requires IPTC `TrainedAlgorithmicMedia` metadata on AI images, and AI-generated product titles and descriptions must be labeled.

**AI optimization guide** ([doc](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), published 2026-05-15, last updated 2026-07-10, [blog](https://developers.google.com/search/blog/2026/05/a-new-resource-for-optimizing)):
- AI features are "rooted in our core Search ranking and quality systems". They use RAG/grounding plus query fan-out.
- Asks for "Non-commodity content". Commodity example: "7 Tips for First-Time Homebuyers". Don't recycle what "could easily be produced by a generative AI model".
- "While it might be tempting to create separate content for every possible variation of how people might search (for example, by focusing on other queries that people have asked, or fan-out queries), doing so primarily to manipulate rankings or generative AI responses ... violates Google's scaled content abuse spam policy."
- No need for "enough long-tail keywords" or every variation, because AI understands synonyms.
- Things you can ignore for Google: llms.txt and other "special" markup or Markdown, chunking, rewriting for AI, inauthentic mentions, and over-focusing on structured data ("no special schema.org markup").
- AEO/GEO "is still SEO" from Google's perspective.
- Agents section: points to [web.dev agent-friendly UX](https://web.dev/articles/ai-agent-site-ux) and the Universal Commerce Protocol ([ucp.dev](https://ucp.dev/latest/)).

**Third-party SEO tools guidance** (2026-06-05): "No third-party tool has access to our internal ranking or AI systems." [third-party-seo](https://developers.google.com/search/docs/fundamentals/third-party-seo)

**Helpful content and E-E-A-T** ([creating-helpful-content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), last updated 2026-10-05):
- Self-check questions include "Are you using extensive automation to produce content on many topics?" and "mainly summarizing what others have to say".
- E-E-A-T "isn't a specific ranking factor". "Trust is most important." YMYL topics get more weight.
- Rater data "is not used directly in our ranking algorithms".
- Search Essentials page last updated 2025-12-10 ([essentials](https://developers.google.com/search/docs/essentials)).

**Quality Rater Guidelines.** The current PDF is dated **September 11, 2025** (182 pages), fetched 2026-10-12 from [raterhub PDF](https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf).
- Official changelog (Appendix 2):
  - Sep 2025: "Updated YMYL definitions; Added additional examples; minor changes". Secondary sources say "YMYL Society" was renamed "YMYL Government, Civics & Society" (elections, civics) and AI Overview examples were added. These details were not verified line-by-line.
  - Jan 2025: "Updated Page Quality Lowest and Low sections to better align with Google Search Web Spam Policies; added illustrative examples"
  - Feb 2024: untrustworthy pages
  - Nov 2023: Needs Met
- **No 2026 QRG version exists** as of 2026-10-12. Blog claims of May or June 2026 QRG updates (for example [pravinkumar](https://www.pravinkumar.co/blog/google-june-2026-quality-rater-guidelines-webflow-aeo-2026)) are NOT supported by the PDF and are likely false.
- Section 4.6.5 Scaled Content Abuse: "Using automated tools (generative AI or otherwise) as a low-effort way to produce many pages that add little-to-no value ... compared to other pages on the web". Rate Lowest "no matter how they are created", even if the method is unknown, "when you strongly suspect scaled content abuse after looking at several pages".
- Section 4.6.6: Lowest if all or almost all main content is "copied, paraphrased, embedded, auto or AI generated, or reposted ... with little to no effort, little to no originality, and little to no added value", even with credit given. "Effort" includes "building custom page functionality".
- Generative AI is "a helpful tool" and use of it "alone does not determine the level of effort or Page Quality rating".
- Section 5.2.2 "Filler as a Poor User Experience": low-effort content that "artificially inflate[s]" a page. Prominent filler ahead of the main content is a Low signal. This is directly relevant to templated intros.

---

## 3. AI Overviews / AI Mode: citation, controls, measurement

**Eligibility** ([ai-features](https://developers.google.com/search/docs/appearance/ai-features), last updated 2025-12-10):
- A page must be indexed and "eligible to be shown in Google Search with a snippet". There are "no additional technical requirements".
- Both features may use "query fan-out" across subtopics. They "may use different models and techniques". AI Overviews "often don't trigger".
- Best practices: allow crawling in robots.txt and at CDN level, use internal links, provide important content as text, add images/video, keep structured data matching visible text, and keep Merchant Center and Business Profile current.

**New site-level control (Search generative AI control)** ([support 16908024](https://support.google.com/webmasters/answer/16908024); rolled out to all sites by 2026-08-31):
- Location: Search Console > Settings > Search generative AI.
- Options: Include (default), Exclude, or Inherit from parent property. Covers AI Overviews, AI Mode and gen-AI features in Discover.
- Exclude stops links and grounding use in those features. It "isn't used as a ranking or inclusion signal affecting other parts of Search". Content may still help Search "understand the language". It doesn't affect training (use Google-Extended for that).
- Takes effect in "1-2 days", with some content taking longer.
- Child properties can override the parent setting, and owners of the top-level domain are notified when they do.

**Page and text controls** ([robots-meta-tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)):
- `nosnippet` applies to "web search, Google Images, Discover, AI Overviews, AI Mode" and "will also prevent the content from being used as a direct input for AI Overviews and AI Mode".
- `max-snippet:[n]` likewise "limit[s] how much of the content may be used as a direct input for AI Overviews and AI Mode". It does not override in-page structured data or license agreements.
- `data-nosnippet` excludes sections at text level.
- `noindex` removes the page from Search entirely.
- `noarchive`, `nocache` and `nositelinkssearchbox` are ignored (historical).
- 2026-03-24: Google "doesn't enforce placement of meta robots in the HTML head and will respect robots meta tags in the body".

**Google-Extended** ([common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers); description updated 2025-04-25):
- A robots.txt-only token with no separate UA.
- Controls use for training future Gemini models (Gemini Apps, Vertex AI) **and** for grounding in Gemini Apps and Vertex AI Grounding with Google Search.
- "Does not impact a site's inclusion in Google Search nor is it used as a ranking signal". It does **not** control AI Overviews or AI Mode. Use the GSC control or nosnippet for those.

**Measurement**
- AI Overviews have counted toward Search Console Performance "Web" totals since launch.
- AI Mode has counted toward totals since 2025-06-16 ([updates](https://developers.google.com/search/updates)).
- **Generative AI performance report** (announced 2026-06-03, all sites by 2026-08-31; [blog](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports), [support 16984139](https://support.google.com/webmasters/answer/16984139)):
  - Separate reports for Search (AI Overviews + AI Mode) and Discover.
  - **Metric: impressions only.** Dimensions are pages, countries, devices and dates (hourly, daily, weekly, monthly).
  - Search type filter: "Web: text-based" vs "Web: multimodal" (multimodal added 2026-09-24, [blog](https://developers.google.com/search/blog/2026/09/web-multimodal-in-sc)).
  - Excludes Search Labs data. Has a 1,000-row UI limit.
  - No query dimension and no clicks are documented. No API `type` for gen-AI appears in the [Search Analytics API reference](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) as of 2026-10-12 (NOT FOUND, so treat as not available).
- Google claims clicks from AI Overview SERPs are "higher quality". This is a vendor claim with no independent data cited.
- **Preferred sources:**
  - Docs added 2026-01-30.
  - All languages from 2026-04-30.
  - Rolling out to AI Overviews and AI Mode from 2026-05-27.
  - Custom button added 2026-08-20.
  - [preferred-sources](https://developers.google.com/search/docs/appearance/preferred-sources)

**Spam in AI answers.** Spam policies apply to AI responses (2026-05-15). Inauthentic "mentions" seeding is called ineffective.

---

## 4. Structured data changes

Sources: [doc changelog](https://developers.google.com/search/updates), [blog 2025-06-12](https://developers.google.com/search/blog/2025/06/simplifying-search-results), [blog 2025-11-05](https://developers.google.com/search/blog/2025/11/update-on-our-efforts).

**Retired from Google Search**

| Feature | Status |
|---|---|
| FAQ rich result | Not shown from **2026-05-07** (notice 2026-05-08). Docs removed 2026-06-15; `/faqpage` 301s to `updates#removing-faq-rich-result` |
| Practice problems | Deprecated 2025-11-05; docs removed 2026-01-06; GSC/API support ended Jan 2026 |
| Dataset | Since 2025-11-05 only used by Dataset Search, not Google Search |
| Course info, Estimated salary, Learning video, Special announcement, Vehicle listing | Phased out (announced 2025-06-12). Docs removed 2025-09-09. Dropped from GSC reports and Rich Results Test 2025-09-09; API until Dec 2025; BigQuery fields NULL from 2025-10-01. Special announcement deprecated 2025-07-31 |
| ClaimReview | "We're phasing out support for ClaimReview markup in Google Search". Still used by Fact Check Explorer ([factcheck](https://developers.google.com/search/docs/appearance/structured-data/factcheck)) |
| Book actions | Banner removed 2025-11-05 because "there's still a feature using the markup" |
| HowTo | Removed 2023 |
| Sitelinks search box | Removed 2024 (`/sitelinks-searchbox` 301s to `updates#bye-sitelinkbox`) |

Non-structured-data removals:
- AMP viewer/cache path: Google links directly to the publisher's AMP host from 2026-07-01.
- Discover "Follow" feature removed 2025-11-19.
- Mobile breadcrumbs: from **2025-01-23** mobile results show the domain only. Breadcrumbs still appear on desktop, and BreadcrumbList markup remains supported ([blog](https://developers.google.com/search/blog/2025/01/simplifying-breadcrumbs)).

**Still documented in the Search Gallery** (page last updated 2026-06-15, [search-gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)):
- Article, Book, Breadcrumb, Carousel (and carousels beta, EEA/Turkey/South Africa)
- Course list, Discussion forum, Education Q&A, Employer rating, Event, Image license metadata, Job posting
- Local business, Loyalty program, Math solvers, Merchant listing, Movie
- Organization (logo now lives here; `/logo` 301s to `/organization`)
- Paywalled content, Product, Product snippet, Product variants, Profile page, QAPage, Recipe
- Return policy, Shipping policy, Review snippet, Software app, Speakable, Vacation rental, Video

**Additions and changes, 2025-2026**
- 2025-06-10: loyalty program markup and a separate return policy doc.
- 2025-06-05: events must be bookable by the public and at a physical location. Online event properties removed.
- 2025-11-12: merchant shipping policy markup supported. Review snippets should avoid multiple ways of indicating the reviewed item.
- 2026-03-24: new Discussion Forum and QAPage properties.
- 2026-03-02: preferred image can be set via schema.org image or og:image.
- 2026-05-20: `hasAdultConsideration` on Product.
- 2026-07-07: `Product.category` (Text or CategoryCode) and sale-duration guidance (`validFrom`, `validThrough`, `priceValidUntil`).
- 2026-07-24: review snippet guideline against fake or undisclosed incentivized reviews.
- 2026-09-24: VideoObject `creator` (and `author`) plus `interactionStatistic` types.
- 2025-06-05: Recipe `image` does not influence text-result thumbnails.

**pSEO implications**
- Structured data is not required for AI features.
- Its value is rich-result eligibility (Product, Review, Breadcrumb on desktop, JobPosting, Event, LocalBusiness, Organization).
- Remove FAQPage and HowTo generation unless it serves other consumers.

---

## 5. Core Web Vitals

**Metrics unchanged.** LCP ≤2.5s, INP ≤200ms, CLS ≤0.1, measured at the 75th percentile, split by mobile and desktop ([web.dev/articles/vitals](https://web.dev/articles/vitals), page last updated 2024-10-31). INP replaced FID on 2024-03-12 (that is the pre-2025 baseline; no change found since).

**Soft navigations**
- Chrome measures them by default from **Chrome 151**.
- Soft-nav LCP uses `interaction-contentful-paint` entries.
- "How exactly soft navigations will be reported in CrUX ... is also still to be determined".
- Source: [developer.chrome.com/docs/web-platform/soft-navigations](https://developer.chrome.com/docs/web-platform/soft-navigations), last updated 2026-09-02.
- Implication: SPA/Next.js client navigations are not yet in CrUX or ranking data.

**web-vitals JS library**
- v6.0.0 (2026-07-21) added soft-navigation support. Latest is v6.2.3 (2026-10-05).
- Source: [CHANGELOG](https://github.com/GoogleChrome/web-vitals/blob/main/CHANGELOG.md).

**Google Search's use of CWV.** Page experience docs were "clarified" earlier (pre-2025). No 2025-2026 ranking-weight change was announced. The AI guide still lists "good page experience". [ai-optimization-guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

---

## 6. Sitemaps, crawling, indexing, Search Console

**Sitemaps** ([build-sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), last updated 2026-07-08):
- Limits: 50MB uncompressed or 50,000 URLs per sitemap.
- "Google ignores `<priority>` and `<changefreq>` values."
- `<lastmod>` is used only "if it's consistently and verifiably ... accurate". It should reflect the "last significant update" (main content, structured data, links), not the copyright date.
- Up to **500 sitemap index files per site** in Search Console ([large-sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps), 2025-12-10). Standard sitemaps.org limits apply to an index (50,000 entries).

**Crawling docs moved** to `developers.google.com/crawling` (2025-11-20 and 2025-12-18). This covers crawler lists, robots.txt spec, faceted nav, crawl budget and HTTP status codes. Changelog RSS: [crawling changelog](https://developers.google.com/crawling/docs/changelog). The IP range files moved to `/crawling/ipranges` (2026-02-11).

**Crawl budget** ([crawl-budget](https://developers.google.com/crawling/docs/crawl-budget), last updated 2026-07-22):
- Applies to sites with 1M+ pages changing weekly, 10k+ pages changing daily, or many "Discovered - currently not indexed" URLs.
- Budget = crawl capacity limit (hostload, shared across **all** Google crawlers) + crawl demand.
- Use robots.txt for URLs you never want crawled. Don't use noindex to save budget ("Google will still request, but then drop").
- Don't use robots.txt to temporarily reallocate budget.
- Return 404/410 for removed pages. Eliminate soft 404s. Keep sitemaps current with lastmod. Avoid redirect chains. Support 304 / If-Modified-Since.
- Google supports ETag and Last-Modified heuristic caching ([overview](https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers)).
- `Retry-After` is documented for emergency crawl reduction (2026-10-06).

**File size**
- Googlebot for Search: first **2MB** of HTML and other supported types (uncompressed), and 64MB for PDF. Each referenced resource has its own limit.
- Other crawlers: 15MB default.
- Documented 2026-02-03 ([googlebot](https://developers.google.com/search/docs/crawling-indexing/googlebot)). Google also posted the explainer "Inside Googlebot" in March 2026 ([blog](https://developers.google.com/search/blog/2026/03/crawler-blog-post)); its body text was not extracted.

**robots.txt**
- Google supports only `user-agent`, `allow`, `disallow` and `sitemap`. `crawl-delay` is not supported.
- 500 KiB limit. Cached up to 24h.
- Source: [robots-txt-spec](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec).
- Implication: Content-Signal and Content-Usage lines are ignored by Google's parser (an inference from "supports the following fields"; Google has made no explicit statement).

**JavaScript**
- 2025-12-15: noindex in the original HTML may cause Google to skip rendering, so don't remove noindex via JS.
- 2025-12-17: the canonical in the original HTML must equal the JS canonical, or leave it out of the original HTML.
- 2025-12-18: non-200 pages "rendering might be skipped".
- 2026-03-04: Google dropped the "JS makes it harder" accessibility section.
- Source: [js-seo-basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

**IndexNow**
- Participants are Amazon, Bing, Naver, Seznam, Yandex and Yep. Max 10,000 URLs per POST. The key file sits at `/{key}.txt` ([indexnow.org/faq](https://www.indexnow.org/faq)).
- **Google does not participate.** No official Google statement was found in 2026. This is secondary consensus, e.g. [searchbloom](https://www.searchbloom.com/ai-seo/inclusion/indexnow/).

**Google Indexing API**
- Still only for JobPosting and BroadcastEvent-in-VideoObject. Default quota 200, with approval required for more.
- "Any attempts to abuse the Indexing API, including the use of multiple accounts ... may result in access being revoked".
- Source: [quickstart](https://developers.google.com/search/apis/indexing-api/v3/quickstart), last updated 2026-07-16.
- Using it for pSEO pages is against its terms.

**Search Console and API**

| Change | Date | Source |
|---|---|---|
| Search Analytics API hourly data: `HOUR` dimension and `dataState: HOURLY_ALL`, up to 10 days back | 2025-04-09 | [blog](https://developers.google.com/search/blog/2025/04/san-hourly-data) |
| New Search Console Insights report | 2025-06 | [blog](https://developers.google.com/search/blog/2025/06/search-console-insights) |
| Query groups in Insights | 2025-10 | [blog](https://developers.google.com/search/blog/2025/10/search-console-query-groups) |
| Branded queries filter | 2025-11 | [blog](https://developers.google.com/search/blog/2025/11/search-console-branded-filter) |
| Custom chart annotations | 2025-11 | [blog](https://developers.google.com/search/blog/2025/11/custom-chart-annotations) |
| AI-powered report configuration | 2025-12 | [blog](https://developers.google.com/search/blog/2025/12/ai-powered-configuration) |
| Social channels | 2025-12 | [blog](https://developers.google.com/search/blog/2025/12/social-channels-search-console) |
| Weekly and monthly views | 2025-12 | [blog](https://developers.google.com/search/blog/2025/12/weekly-monthly-views-search-console) |
| Social/video platform properties, global | 2026-07 | [blog](https://developers.google.com/search/blog/2026/07/platform-properties-social-video-guide) |
| Generative AI performance reports and Search generative AI control | 2026-06 / 2026-08-31 | see section 3 |
| Web multimodal search type | 2026-09-24 | see section 3 |

**API quotas** ([limits](https://developers.google.com/webmaster-tools/limits)):
- URL Inspection API: **2,000 QPD and 600 QPM per site**; 10M QPD and 15k QPM per project.
- Search Analytics: 1,200 QPM per site and per user; 30M QPD and 40k QPM per project; plus load quotas. Page+query queries are the most expensive.
- `rowLimit` max 25,000.

**Canonical re-evaluation** (2026-07-10). After fixing duplicate-content issues, "Google might hold pages in a duplicate cluster for up to two weeks". Request Indexing is quota-limited, so "reserve it for your most important URLs". [canonicalization-troubleshooting](https://developers.google.com/search/docs/crawling-indexing/canonicalization-troubleshooting)

---

## 7. LLM visibility: llms.txt, AI crawlers, controls

**llms.txt status**
- Spec: [llmstxt.org](https://llmstxt.org/) **v2**, published 2024-09-03 and modified 2026-08-10 (Jeremy Howard).
  - Root or any path; each llms.txt covers the pages under its path.
  - Per-page `.md` versions (`page.html.md` / `page.md`).
  - Discovery via `<link rel="alternate" type="text/markdown">` and `rel="describedby"` to llms.txt, or via HTTP `Link:` headers.
  - Claims "thousands of sites" use it. This is a vendor or author claim, not independently counted.
- **Google Search ignores it.** "Doing so will neither harm nor help your site's visibility or rankings in Google Search, as Google Search ignores them" (note added 2026-06-15). [ai-optimization-guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- **Chrome Lighthouse** has an experimental "Agentic Browsing" category. It includes an `llms.txt` discoverability audit, plus WebMCP, accessibility-for-agents and layout-stability audits. It requires Chrome 150+ and shows a fractional score, not a weighted one. Doc last updated 2026-05-05 ([scoring](https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring)).
  - Open bugs: valid files failing ([#17082](https://github.com/GoogleChrome/lighthouse/issues/17082)), and 304 responses nulling the score ([#17266](https://github.com/GoogleChrome/lighthouse/issues/17266)).
  - Secondary sources say it shipped in Lighthouse 13.3 around May-June 2026 (UNVERIFIED exact date: [ppc.land](https://ppc.land/google-adds-llms-txt-to-lighthouse-as-agentic-web-standards-heat-up/)).
- AI labs publish llms.txt for their own docs. For example, OpenAI developer docs link `/llms.txt` and serve `.md` page variants ([developers.openai.com/api/docs/bots.md](https://developers.openai.com/api/docs/bots.md)).
- No AI search provider has officially said it uses llms.txt as a ranking or citation input. Not found for OpenAI, Anthropic or Perplexity.

**AI crawler and user-agent tokens** (all fetched 2026-10-12)

| Vendor | robots.txt token | UA substring | Purpose | robots.txt respected? | Source |
|---|---|---|---|---|---|
| OpenAI | `GPTBot` | `compatible; GPTBot/1.4; +https://openai.com/gptbot` | Crawl for foundation-model training | Yes (opt-out = disallow) | [OpenAI bots](https://developers.openai.com/api/docs/bots.md) |
| OpenAI | `OAI-SearchBot` | `compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot` | ChatGPT search results; opted-out sites can still appear "as navigational links"; ~24h to apply | Yes | same |
| OpenAI | `ChatGPT-User` | `compatible; ChatGPT-User/1.0; +https://openai.com/bot` | User-initiated fetches and GPT Actions; "not used to determine whether content may appear in Search" | "robots.txt rules may not apply" | same |
| OpenAI | `OAI-AdsBot` | `compatible; OAI-AdsBot/1.0; +https://openai.com/adsbot` | Validates ChatGPT ad landing pages; not used for training | not stated | same |
| Anthropic | `ClaudeBot` | (UA strings not published in help article) | Training data | Yes; supports `Crawl-delay` | [Claude help, updated 2026-04-07](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web) |
| Anthropic | `Claude-SearchBot` | n/a | Indexing to improve search result quality | Yes | same |
| Anthropic | `Claude-User` | n/a | User-initiated fetches; blocking "may reduce your site's visibility for user-directed web search" | Yes (Anthropic says all its bots honor robots.txt) | same |
| Perplexity | `PerplexityBot` | `compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot` | Surface and link sites in Perplexity search; "not used to crawl content for AI foundation models" | recommended to allow (respect not explicitly stated) | [Perplexity bots](https://docs.perplexity.ai/guides/bots) |
| Perplexity | `Perplexity-User` | `compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user` | User-requested fetch | "generally ignores robots.txt" | same |
| Google | `Google-Extended` | none (token only) | Gemini training + Gemini Apps / Vertex grounding; not Search, not AIO/AI Mode | Yes | [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) |
| Google | `Google-Agent` | `compatible; Google-Agent; +https://developers.google.com/crawling/docs/crawlers-fetchers/google-agent` | Google-hosted agents acting on user request (added 2026-03-20); experimenting with Web Bot Auth (`agent.bot.goog`) | user-triggered (generally ignores robots.txt) | [user-triggered fetchers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-user-triggered-fetchers) |
| Google | `Google-GeminiNotebook` (was Google-NotebookLM, renamed 2026-07-16), `Google-Pinpoint`, `Google-CWS`, `GoogleMessages` | see doc | user-triggered fetchers | user-triggered | [crawling changelog](https://developers.google.com/crawling/docs/changelog) |
| Apple | `Applebot` | `(Applebot/0.1; +http://www.apple.com/go/applebot)` | Spotlight/Siri/Safari search; data "may also" train Apple models and ground answers; follows Googlebot rules if none for Applebot; ignores crawl-delay | Yes | [Apple 119829, 2026-09-04](https://support.apple.com/en-us/119829) |
| Apple | `Applebot-Extended` | none ("does not crawl webpages") | Opt out of Apple gen-AI training; not a Search ranking factor | Yes | same |
| Meta | `meta-externalagent` | `meta-externalagent/1.1` | AI training / direct indexing | Yes | [Meta crawlers](https://developers.facebook.com/docs/sharing/webmasters/web-crawlers/) |
| Meta | `meta-webindexer` | `meta-webindexer/1.1` | Meta AI search citations | Yes | same |
| Meta | `meta-externalfetcher` | `meta-externalfetcher/1.1` | User-requested and agentic fetches | may bypass | same |
| Meta | `meta-externalads`, `facebookexternalhit` | `meta-externalads/1.1`, `facebookexternalhit/1.1` | Ads; link previews (may bypass robots.txt for integrity checks) | partly | same |
| Common Crawl | `CCBot` | `CCBot/2.0 (https://commoncrawl.org/faq/)` | Open crawl corpus (widely used for training); IPs at `index.commoncrawl.org/ccbot.json`, reverse DNS `crawl.commoncrawl.org` | Yes | [commoncrawl.org/ccbot](https://commoncrawl.org/ccbot) |
| ByteDance | `Bytespider` | n/a | AI training (presumed) | UNVERIFIED (no official ByteDance doc found); appears in Cloudflare's managed block list | [Cloudflare managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/) |

Notes on the table:
- OpenAI: "Each setting is independent of the others", and "If your site has allowed both bots, we may use the results from just one crawl for both".
- Anthropic recommends against IP blocking because it prevents reading robots.txt.

**Cloudflare**
- **AI Crawl Control** (formerly AI Audit) is on all plans, doc last updated 2026-08-14 ([docs](https://developers.cloudflare.com/ai-crawl-control/)). It provides a dashboard, per-crawler allow/block and robots.txt compliance tracking.
- **Pay per crawl** is still in **closed or private beta** (doc 2026-07-28). Crawlers either send payment-intent headers and get a 200, or receive **HTTP 402** with pricing. Cloudflare is merchant of record. WAF and Bot Management blocks override it. [pay-per-crawl](https://developers.cloudflare.com/ai-crawl-control/features/pay-per-crawl/what-is-pay-per-crawl/)
- **Managed robots.txt / Bot Preference Sync** (doc 2026-10-08) prepends the Content Signals Policy text plus disallow groups for Amazonbot, Applebot-Extended, Bytespider, CCBot, ClaudeBot, Google-Extended, GPTBot and meta-externalagent. Example line: `Content-signal: search=yes, ai-train=no, use=reference`.
  - Signals defined: `search` (index plus links and short excerpts, *excluding* AI summaries), `ai-input` (RAG/grounding) and `ai-train`.
  - Framed as an EU DSM Directive Art. 4 rights reservation.
  - The `use=reference` value is not defined in the policy text shown (UNVERIFIED meaning).
  - [managed-robots-txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
- The default-on blocking of AI crawlers for new Cloudflare domains (announced July 2025) was not re-verified in current docs (UNVERIFIED).

**IETF AI Preferences (aipref)**
- `draft-ietf-aipref-vocab-08` is dated 2026-09-14, Standards Track, still an Internet-Draft. Categories: `train-ai`, `ai-use`, `search`. Example: `train-ai=y, search=n`.
- Attachment (robots.txt / `Content-Usage` header) syntax is not finalized.
- Source: [draft-08](https://www.ietf.org/archive/id/draft-ietf-aipref-vocab-08.txt).
- No major crawler has documented honoring it (none found).

**Web Bot Auth** (signed agent requests, HTTP message signatures): Google documented experimental support on 2026-05-04 ([web-bot-auth](https://developers.google.com/crawling/docs/crawlers-fetchers/web-bot-auth)).

---

## 8. Canonicals, hreflang, pagination, faceted nav, soft 404, thin pages

**Canonical**
- `rel=canonical` belongs "in the head section" ([consolidate-duplicate-urls](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)). The JS canonical must equal the original HTML (2025-12-17).
- Duplicate clusters can persist up to 2 weeks after a fix (2026-07-10).
- Pages split out faster when the "difference ... is clear and significant". This is directly relevant to near-duplicate template pages.

**hreflang** ([localized-versions](https://developers.google.com/search/docs/specialty/international/localized-versions)):
- Self-referencing and bidirectional links are required ("If two pages don't both point to each other, the tags will be ignored").
- Use fully qualified URLs and `x-default` for fallback.
- Auto-translated pages without value fall under scaled content abuse (June 2025 doc change).

**Pagination** ([pagination doc](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading), 2025-12-10):
- Each page gets its own canonical. "Don't use the first page of a paginated sequence as the canonical."
- No `#` page numbers. `rel=next/prev` are not used by Google.
- noindex or robots.txt-block filter and sort variants.
- Faceted nav doc: nonexistent pagination URLs should return 404.

**Faceted navigation** ([faceted-navigation](https://developers.google.com/crawling/docs/faceted-navigation), moved 2025-12-18; originally Dec 2024):
- If facets need not be indexed, block them via robots.txt (pattern example `disallow: /*?*color=`) or use URL fragments.
- `rel=canonical` and `nofollow` are "generally less effective in the long term".
- If facets must be indexable:
  - use the standard `&` separator
  - keep path-encoded filter order fixed with no duplicates
  - **return 404 for empty filter combinations, duplicate filters and nonsensical combos**, at the URL itself rather than a redirect to a generic error page

**Soft 404 / thin pages**
- Soft 404s keep getting crawled and waste budget. Return a real 404/410 for no-data pages ([crawl-budget](https://developers.google.com/crawling/docs/crawl-budget)).
- For SPAs: JS redirect to a URL that returns 404, or JS-added noindex ([js-seo-basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)).
- Avoid shipping `noindex` in the initial HTML for pages you may later want indexed (2025-12-15).
- For thin programmatic pages:
  - Don't generate them at all, or 404 them, if there is no data.
  - Use `noindex` for low-value-but-useful-to-users pages (still crawled).
  - Use robots.txt disallow for infinite or low-value URL spaces you never want crawled. Blocked URLs can still be indexed URL-only if linked, and blocked pages' noindex is not seen.
- Spam policy guidance: "If you're hosting such content on your site, exclude it from Search" ([spam-policies#scaled-content](https://developers.google.com/search/docs/essentials/spam-policies#scaled-content)).
- Site-wide quality presumption: "individual pages (including new pages) match the overall quality of other pages on the domain" (site reputation section). Large volumes of thin pages are a site-level risk.

---

## 9. Next.js (current: 16.4.0, 2026-10-06; canary 16.5.0-canary.8)

Release dates from npm ([registry](https://registry.npmjs.org/next)):
- 16.0.0: 2025-10-22 (blog dated 2025-10-21)
- 16.1.0: 2025-12-18
- 16.2.0: 2026-03-18
- 16.3.0: 2026-08-03
- 16.4.0: 2026-10-06

Next.js 17 is announced as the version where Cache Components become the default ([16.4 blog](https://nextjs.org/blog/next-16-4)).

**Next.js 16 (2025-10-21)** ([blog](https://nextjs.org/blog/next-16)):
- **Cache Components:** `cacheComponents: true` plus the `"use cache"` directive. Caching is fully opt-in and dynamic is the default. Completes PPR; `experimental.ppr` and `experimental.dynamicIO` were removed or renamed.
- `proxy.ts` replaces `middleware.ts` and runs on Node.js. middleware.ts is deprecated (Edge only).
- Async-only `params`, `searchParams`, `cookies()`, `headers()` and `draftMode()`.
- Async `params` in metadata image routes. `generateImageMetadata` `id` is now a `Promise<string>`.
- `revalidateTag(tag, cacheLifeProfile)` requires a profile. New `updateTag()` (read-your-writes in Server Actions) and `refresh()`.
- Turbopack is the default bundler. `next build` no longer lints, and the `next lint` command was removed.
- **AMP removed entirely.**
- Node 20.9+ and TS 5.1+.
- next/image defaults: `minimumCacheTTL` 4h, `qualities` [75], local src with query strings needs `localPatterns`, max 3 redirects.
- Parallel routes need `default.js`.

**16.3 (2026-08-03)** ([blog](https://nextjs.org/blog/next-16-3)):
- Instant Navigations (opt-in) and Partial Prefetching.
- **"Better ISR: URLs omitted from build-time prerendering can now serve an instant loading shell to the first visitor"**. SEO-relevant, because the shell streams first. See the status-code caveat below.
- `next/root-params` (e.g. `[lang]` from any Server Component, works inside `use cache`).
- `catchError` error boundaries. `import.meta.glob`. Disk build cache on by default. TypeScript 7 support.
- `next dev` writes a version-matched `AGENTS.md` block.

**16.4 (2026-10-06)** ([blog](https://nextjs.org/blog/next-16-4)):
- Cache Components recommended for all apps and enabled by default in `create-next-app`.
- `partialPrefetching: true` is part of the model.
- **`export const ensureStatic = 'navigation' | 'prefetch' | 'shell'`** fails the build if dynamic content sneaks into a route. Useful for guaranteeing static pSEO templates.
- `next upgrade --agent`. React 19.3.

**`generateStaticParams`** ([doc](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)):
- With Cache Components it **must return at least one param**; an empty array is a build error. A placeholder param plus `notFound()` is the documented workaround.
- `ensureStatic='navigation'` routes must return complete params.
- Without Cache Components: return `[]` or `dynamic='force-static'` for runtime ISR of all paths. `dynamicParams=false` makes unlisted params 404.
- It is not re-run during ISR revalidation.

**`generateSitemaps`** ([doc](https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps), 2026-09-28):
- Returns `[{id}]`, served at `/.../sitemap/[id].xml`. `id` is a `Promise<string>` (await it).
- Next does **not** auto-generate a sitemap index. Write one yourself (for example a route handler) and submit it.
- The official `sitemap.ts` example uses `lastModified: new Date()`, `changeFrequency` and `priority` ([sitemap doc](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)). Google ignores changefreq and priority, and build-time `new Date()` makes lastmod unverifiable. Use real content-modified timestamps.

**Metadata streaming** ([generate-metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)):
- `generateMetadata` output may be appended to `<body>` for JS-executing bots ("verified ... Googlebot").
- HTML-limited bots (e.g. facebookexternalhit) get blocking metadata in `<head>`.
- Force head placement for all bots with `htmlLimitedBots: /.*/`.
- **Risk for pSEO:** Google's canonical docs specify `<head>`. Google respects robots meta in body (2026-03-24), but no equivalent statement exists for `rel=canonical` in body. Recommended: make canonical/robots metadata static or `use cache` so it renders in the head shell, or set `htmlLimitedBots`. (This recommendation is an inference, not a Google statement.)
- With Cache Components, metadata that reads runtime data defers to request time. If the rest of the page is prerenderable, Next forces an explicit choice (`use cache` in generateMetadata, or a dynamic marker).

**Status codes with streaming** ([loading.md](https://nextjs.org/docs/app/api-reference/file-conventions/loading), [not-found.md](https://nextjs.org/docs/app/api-reference/functions/not-found)):
- "Streaming page responses begin with a `200` status code." `notFound()` after streaming has started yields 200 plus an injected `<meta name="robots" content="noindex">`.
- "Some crawlers may label these responses as 'soft 404s'."
- To return a real 404, check existence before any Suspense fallback or `loading.tsx` renders, or in `proxy.ts` (rewrite or return 404).
- This matters for programmatic "no data for this combo" pages and for Google's faceted-nav 404 guidance.

**Vercel limits** ([limits](https://vercel.com/docs/limits), last updated 2026-09-16):
- **Build time 45 min per deployment** (all plans), so don't prerender huge pSEO sets at build. Use ISR or on-demand rendering with a few seed params.
- 2,048 routes per deployment (vercel.json rewrites, redirects and headers count). Use pattern-based redirects, not one per URL.
- Static file upload via CLI: 100MB (Hobby) or 1GB (Pro).
- Build cache: 1.5-4.75GB by machine.
- Runtime logs kept 1h (Hobby) or 1 day (Pro).

---

## 10. Unverified or not found (flagged)
- What each 2025-2026 spam update specifically targeted: Google gives no detail, and only secondary speculation exists.
- The 2025 "scaled content abuse manual action wave": vendor blogs only.
- Any 2026 Quality Rater Guidelines update: none exists per the official PDF. Blog claims appear false.
- Exact wording of the Sep 2025 QRG YMYL rename and the AI Overview examples: from secondary sources, not checked line-by-line in the PDF.
- Whether the gen-AI performance report is in the Search Console API: not found in the API reference (treat as unavailable).
- Google and IndexNow: no official 2026 statement. Non-participation is inferred from the IndexNow participant list.
- Bytespider official documentation: none found.
- Cloudflare `use=reference` content-signal meaning, and the current default-block policy for new domains.
- Lighthouse 13.3 exact release date.
- Body text of "Inside Googlebot" (March 2026): not extracted. The 2MB/64MB facts come from the Googlebot doc instead.
- Whether any AI search engine (OpenAI, Anthropic, Perplexity) uses llms.txt for citations: no official statement found.
