# pSEO research: Google Search, AI search, crawlers, Next.js (state as of 2026-10-28)

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

---

## 11. Delta and re-verification, 2026-10-28

Method: every source below was fetched on 2026-10-28. Dates in parentheses are the source's own publish or "last updated" date. Tags: **NEW** (appeared after 2026-10-12), **CHANGED** (differs from sections 0-10), **CONFIRMED** (re-checked, still true), **STILL UNVERIFIED**, **WRONG** (sections 0-10 or the skills had it wrong). Vendor claims are marked as such.

### 11.1 Google ranking, policy and Search docs (delta 2026-10-12 to 2026-10-28)

- **CONFIRMED: no new ranking update.** The Search Status Dashboard ranking history still ends with the September 2026 spam update (start 2026-09-24, duration "13 days, 16 hours"). The incidents JSON shows no incident on any service since then. Nothing was in progress on 2026-10-12, so there is no rollout completion to report. [ranking history](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history), [incidents.json](https://status.search.google.com/incidents.json)
- **CONFIRMED: no new Search Central blog post since 2026-10-12.** The only October post is "New learning paths" (2026-10-06, YouTube playlists, no policy content). The 10-12 doc did not list it. [blog](https://developers.google.com/search/blog), [learning paths](https://developers.google.com/search/blog/2026/10/seo-learning-paths)
- **NEW (2026-10-26): user-generated spam guide expanded for platforms.** It adds a section "Only index content meant for Search". For pages made for direct sharing, collaboration or utility, "apply the noindex rule (using a robots meta tag or X-Robots-Tag HTTP response header) or block crawling in robots.txt by default". It also tells platforms to watch the Page Indexing and Performance reports for spikes, and to alert on "a small number of users generating a large share of indexable URLs". This is relevant to pSEO sites that generate user-created or tool-output pages. [prevent-abuse](https://developers.google.com/search/docs/monitor-debug/prevent-abuse) (last updated 2026-10-26), [updates](https://developers.google.com/search/updates)
- **NEW (2026-10-23 changelog; page footer 2026-10-21): URL structure doc on word separators.** "We recommend using hyphens ( - ) instead of underscores ( _ ) to separate words in your URLs". [url-structure](https://developers.google.com/search/docs/crawling-indexing/url-structure)
- **NEW (2026-10-23): robots.txt percent-encoding.** Google compares rules "using their percent-encoded forms" and "automatically canonicalize[s] raw UTF-8 rule paths", so `Disallow: /foo/bar/ツ` and `Disallow: /foo/bar/%E3%83%84` are treated the same. Google still recommends percent-encoding so third-party tools parse the file correctly. [robots-txt-spec](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec) (2026-10-23), [crawling changelog](https://developers.google.com/crawling/docs/changelog)
- **NEW (2026-10-21): "Control what you share" now lists all controls in one place.** It covers the robots meta tag, `data-nosnippet`, X-Robots-Tag and the Search generative AI control (site-wide). Google says these are existing options, and no new control was added. [control-what-you-share](https://developers.google.com/search/docs/crawling-indexing/control-what-you-share)
- **CHANGED (2026-10-16): Indexing API quotas restated, approval form removed.** The quota page now lists `DefaultPublishRequestsPerDayPerProject` = 200 (URL_UPDATED plus URL_DELETED, resetting at midnight Pacific), `DefaultMetadataRequestsPerMinutePerProject` = 180 and `DefaultRequestsPerMinutePerProject` = 380, all free. The changelog says the update was made "to ... remove an outdated form". The page body and the quickstart no longer describe an approval or quota-increase step. Only Google's auto-generated page summary still mentions a form. The 10-12 line "approval required for more" is therefore outdated. Scope is unchanged: "can only be used to crawl pages with either JobPosting or BroadcastEvent embedded in a VideoObject". Batches are up to 100 calls, and quota counts per URL. [quota-pricing](https://developers.google.com/search/apis/indexing-api/v3/quota-pricing), [quickstart](https://developers.google.com/search/apis/indexing-api/v3/quickstart), [using-api](https://developers.google.com/search/apis/indexing-api/v3/using-api) (all 2026-10-16)
- **NEW to this doc (2026-10-08, missed on 10-12): UGC Fresh Data Program.** This is an application-only ingestion pipeline for large UGC, social and forum platforms. It is "independent of the Google Indexing API". Requirements include on-page `SocialMediaPosting` or `DiscussionForumPosting` markup with `interactionStatistic`, public pages with stable URLs, and creator profiles. It is not a pSEO channel. [ugc-fresh-data-program](https://developers.google.com/search/docs/appearance/ugc-fresh-data-program)
- **CHANGED (2026-10-16, no changelog entry): Search Gallery page re-dated.** The feature table now lists Article, Breadcrumb, Carousel, Course list, Dataset, Discussion forum, Education Q&A, Employer aggregate rating, Event, Image metadata, Job posting, Local business, Math solver, Movie, Organization, Product, Profile page, Q&A, Recipe, Review snippet, Software app, Speakable, Subscription and paywalled content, Vacation rental and Video. Book actions is not a table row, but its doc is still live (last updated 2025-12-10) and limited to large book providers. Loyalty program, Merchant listing, Product snippet, Product variants, Return policy, Shipping policy and Carousels (beta) docs all still return 200. No structured data type was retired in the window. [search-gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery), [book](https://developers.google.com/search/docs/appearance/structured-data/book)
- **CONFIRMED: no other structured data, robots or snippet change.** The last structured data changelog entry is 2026-09-24 (VideoObject `creator`). The robots meta tag doc is still dated 2026-03-24. The spam policies doc is still dated 2026-08-28, the AI optimization guide 2026-07-10 and the AI features doc 2025-12-10. [updates](https://developers.google.com/search/updates), [robots-meta-tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag), [spam-policies](https://developers.google.com/search/docs/essentials/spam-policies)
- **CONFIRMED: no schema.org release in the window.** The latest is v30.1 (GitHub release 2026-09-15). It added `consumerNotice`, `isOftenBoughtWith` and `specification` on Product, `itemPopularity` on Offer, `minimumOrderValue` on ShippingRateSettings and `MaximumRetailPrice`, plus EU Digital Product Passport discovery vocabulary. None of these have documented Google support. [releases](https://schema.org/docs/releases.html), [GitHub](https://github.com/schemaorg/schemaorg/releases)

### 11.2 Search Console

- **CONFIRMED: no Search Console feature announcement in the window.** There was no blog post or changelog entry. The data anomalies page has no entry after August 2026. [anomalies](https://support.google.com/webmasters/answer/6211453)
- **NEW to this doc (missed on 10-12): impressions logging error.** The anomalies page says "A logging error prevented Search Console from accurately reporting impressions from May 13, 2025 until April 27, 2026" (entry dated April 3). After the fix, impressions, CTR and position shifted, while clicks were unaffected. Year-over-year impression comparisons that span April 2026 are unreliable. Other entries: Generative AI report impressions were low for 2026-08-13 to 2026-08-17 (restored 2026-08-21), and the FAQ impression drop from 2026-05-07. [anomalies](https://support.google.com/webmasters/answer/6211453)
- **CONFIRMED: Generative AI performance report still has no API.** The help page mentions only UI export, and "the usual data limitations (1,000 row limitation ...)" apply. The Search Analytics `type` enum is still `discover`, `googleNews`, `news`, `image`, `video` and `web`. [support 16984139](https://support.google.com/webmasters/answer/16984139), [searchanalytics.query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) (2026-08-11)
- **CONFIRMED: Search generative AI control** is unchanged. It offers Include, Exclude or Inherit, takes effect "within 1-2 days after the control goes live", and sits in Settings next to Change of Address. [support 16908024](https://support.google.com/webmasters/answer/16908024)

### 11.3 Core Web Vitals, CrUX, soft navigations

- **NEW (2026-10-13): experimental soft-navigation Core Web Vitals in CrUX.** Three new metrics are available in the BigQuery dataset, CrUX API and CrUX History API: `experimental_largest_contentful_paint_with_softnavs`, `experimental_interaction_to_next_paint_with_softnavs` and `experimental_cumulative_layout_shift_with_softnavs`. In the CrUX API, soft navigations are reported "under the specific URL the user navigated to". "Google's stable Core Web Vitals scores remain unchanged". FCP and navigation-type variants are expected in the November release. Google's stated plan (vendor timeline): "We aim to graduate from experimental in May of 2027 ... Once graduated, Search Console will switch to use the new data." With soft navs included, 59.5% of origins have good CWV, up from 55.9% (September 2026 dataset). [web.dev blog](https://web.dev/blog/crux-experimental-soft-navs), [CrUX release notes](https://developer.chrome.com/docs/crux/release-notes) (2026-10-13)
  - pSEO implication: Next.js client navigations between template pages will start counting per URL in CrUX. They are expected to help LCP/CLS and roughly double the INP pass rate for SPA-heavy origins (Google's figures). Search Console CWV will not change before the graduation.
- **CHANGED (2026-10-20): soft navigations doc.** It now says soft navigation metrics are in CrUX "as experimental metrics", which replaces "still to be determined". Chrome 151 default-on and `interaction-contentful-paint` are unchanged. [soft-navigations](https://developer.chrome.com/docs/web-platform/soft-navigations)
- **CONFIRMED:** CWV thresholds are unchanged ([web.dev/articles/vitals](https://web.dev/articles/vitals), still 2024-10-31). web-vitals is still v6.2.3 (2026-10-05) ([CHANGELOG](https://github.com/GoogleChrome/web-vitals/blob/main/CHANGELOG.md)).
- **NEW (2026-10-27): Lighthouse 13.6.0.** It expects to ship in Chrome 159 DevTools and PageSpeed Insights "within a week". It adds CLI bulk URL auditing (`--url-file`), and the robots-txt and llms-txt audits now fail on HTTP 429. The Agentic Resource Discovery audit moves to ARD v0.91 (`ard.json` replaces `ai-catalog.json`, discovered via `Link` header, `<link rel="ard">` or `/.well-known/ard`). [v13.6.0](https://github.com/GoogleChrome/lighthouse/releases/tag/v13.6.0)

### 11.4 Next.js and Vercel

- **NEW (2026-10-14): critical Next.js security release, 16.4.1 / 15.5.28.** It fixes two critical unauthenticated RCEs: `use cache` functions returning typed arrays (Cache Components apps, "no known workaround") and the Image Optimization API with SVG on glibc Linux (workaround: sharp >= 0.35.5). It also fixes a high-severity Server Actions DoS. Any Cache Components pSEO app on 16.4.0 should upgrade. [blog](https://nextjs.org/blog/nextjs-security-update-october-14-2026), [v16.4.1](https://github.com/vercel/next.js/releases/tag/v16.4.1)
- **NEW: later patch releases.** 16.4.2 (2026-10-15) and 16.4.3 (2026-10-23) are bug-fix backports. 16.4.3 includes "Don't load the app-page runtime in proxy.ts". Current stable is **16.4.3**, and canary is 16.5.0-canary.29 (2026-10-27). [npm](https://registry.npmjs.org/next), [v16.4.3](https://github.com/vercel/next.js/releases/tag/v16.4.3)
- **NEW (2026-10-27): scheduled security release on 2026-11-03** for "seven medium vulnerabilities". Plan an upgrade. [blog](https://nextjs.org/blog/upcoming-nextjs-security-release-november-2026)
- **CONFIRMED: next/image `priority` is deprecated for `preload` since v16.0.0.** The version history row reads "`preload` prop added, `priority` prop deprecated". `preload` inserts a `<link>` in `<head>`. The docs say not to use it together with `loading` or `fetchPriority`, and "In most cases, you should use `loading="eager"` or `fetchPriority="high"` instead of `preload`". [image](https://nextjs.org/docs/app/api-reference/components/image) (2026-09-28)
- **CONFIRMED: `cacheMaxMemorySize`** is a top-level option, in bytes, defaulting to 50 MB. It sizes both the server cache (prerendered pages, route handlers, optimized images) and the built-in `'use cache'` handler. `0` disables both in-memory caches, and the docs recommend `0` with a custom `cacheHandler`. Custom `cacheHandlers` manage their own memory. `next dev` ignores the option. [cacheMaxMemorySize](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheMaxMemorySize) (2026-08-18)
- **CONFIRMED: `revalidateTag(tag: string, profile: string | { expire?: number }): void`.** `'max'` is recommended (stale-while-revalidate with a one-year window), and `{ expire: 0 }` means blocking revalidation. The single-argument form is "deprecated" and behaves like `{ expire: 0 }`. Tags are case-sensitive with a maximum of 256 characters, and an over-long tag silently does nothing. It cannot be called in Client Components or Proxy. [revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- **CONFIRMED: `updateTag(tag: string): void`** works only in Server Actions (not Route Handlers). It expires immediately for read-your-own-writes. [updateTag](https://nextjs.org/docs/app/api-reference/functions/updateTag) (2026-08-25)
- **CONFIRMED: cacheLife preset profiles** are `default` (stale 5m / revalidate 15m / expire never), `seconds`, `minutes`, `hours`, `days`, `weeks` and `max` (5m / 30d / 1y). All of them can be redefined in `next.config`. Top-level `cacheLife` has been stable since v16.0.0. [cacheLife()](https://nextjs.org/docs/app/api-reference/functions/cacheLife), [cacheLife config](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheLife)
- **CONFIRMED: `htmlLimitedBots`** was introduced in 15.2.0. Setting it **replaces** the default list (which includes Mediapartners-Google, AdsBot-Google, Google-PageRenderer, Bingbot, Twitterbot and Slackbot, but not Googlebot). `htmlLimitedBots: /.*/` is the documented way "To fully disable streaming metadata". [htmlLimitedBots](https://nextjs.org/docs/app/api-reference/config/next-config-js/htmlLimitedBots), [generate-metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- **WRONG (section 9 and several skills): `ensureStatic` does not fail the build for every value.** The docs (2026-10-06) give these details:
  - Accepted values are `'auto'` (default), `'shell'`, `'prefetch'`, `'navigation'` and `false`. The export only works with `cacheComponents` enabled ("The build fails otherwise").
  - "With `'shell'` and `'prefetch'` ... These values do not add build validation." `'shell'` without Partial Prefetching "has no effect and Next.js logs a warning".
  - Only `'navigation'` is validated in `next dev` and `next build`. It fails on uncached data, `cookies()`/`headers()`/`searchParams`, `use cache` with expire < 5 min, stale < 30 s or revalidate 0, and request-dependent promises passed to Client Components. This also applies inside `generateMetadata`.
  - With `'navigation'`, a non-prerendered param "waits for the static result to be generated before serving it" (blocking). With `'shell'`/`'prefetch'`, it serves the fallback shell (streamed, so the status-code caveat in section 9 applies).
  - Fix for skills: recommend `ensureStatic = 'navigation'` for pSEO templates that must be static and indexable, and drop the "shell fails the build" wording.
  - [ensureStatic](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/ensureStatic)
- **CONFIRMED:** "Streaming page responses begin with a `200` status code" ([loading](https://nextjs.org/docs/app/api-reference/file-conventions/loading), 2026-10-01). `generateStaticParams` must return at least one param with Cache Components ([generate-static-params](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)). Metadata is appended to `<body>` for JS-executing bots such as Googlebot ([generate-metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata), 2026-09-23).
- **CONFIRMED: Vercel limits** (page 2026-09-16):
  - "Routes created per Deployment" is 2048 on Hobby and Pro and Custom on Enterprise. vercel.json rewrites, redirects and headers each count, and Next.js generates routes for dynamic routes, redirects, rewrites and headers.
  - Build time is 45 minutes per deployment on all plans.
  - **CHANGED detail:** runtime logs are kept 1 hour (Hobby), 1 day (Pro) and **3 days (Enterprise)**. The 10-12 doc omitted Enterprise.
  - [limits](https://vercel.com/docs/limits)
- **CONFIRMED with detail: Vercel Global Config (formerly Edge Config).**
  - Renamed on 2026-07-29. Limits were "raised on every plan": maximum store size is **1 MB on Hobby, Pro and Enterprise**. Stores: 1 total on Hobby and unlimited on Pro and Enterprise, with 1 / 3 / 3 per project. Writes propagate in up to 10 seconds.
  - Keys can be up to 256 characters and must match `^[\w-]+$` (A-Z, a-z, 0-9, `_`, `-`).
  - New package is `@vercel/global-config`. Newly connected stores create a `GLOBAL_CONFIG` env var that the legacy `@vercel/edge-config` SDK does not read by default.
  - [global-config-limits](https://vercel.com/docs/global-config/global-config-limits) (2026-07-29), [changelog](https://vercel.com/changelog/edge-config-is-now-global-config)
- **CONFIRMED: Vercel log drain fields** (2026-09-11):
  - Top-level fields: `source` (`build`, `edge`, `lambda`, `static`, `external`, `firewall`, `redirect`), `host`, `path` (function or dynamic route path), `statusCode`, `requestId`.
  - `proxy.*` fields: `proxy.timestamp`, `proxy.method`, `proxy.host`, `proxy.path` (with query), `proxy.userAgent` (**array**), `proxy.region`, `proxy.referer`, `proxy.statusCode` (`-1` = background revalidation), `proxy.clientIp`, `proxy.scheme`, `proxy.responseByteSize`, `proxy.cacheId`, `proxy.pathType`, `proxy.vercelCache` (`MISS`, `HIT`, `STALE`, `BYPASS`, `PRERENDER`, `REVALIDATED`), `proxy.wafAction`.
  - Drain filters can use `contains(log/userAgent, 'Googlebot')`, where `log/userAgent` maps to `proxy.userAgent[0]`.
  - [drains/reference/logs](https://vercel.com/docs/drains/reference/logs)
- **NEW (2026-10-28): Vercel Observability "AI Traffic".** It shows requests by verified AI bot, most-crawled pages, assistant retrievals, Markdown requests and error pages. CLI access via `vercel metrics` requires Observability Plus. [changelog](https://vercel.com/changelog/ai-traffic-insights-now-available-in-vercel-observability)

### 11.5 Google crawling, verification, international, site moves (Task B)

- **CONFIRMED: Googlebot verification** ([verify-google-requests](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests), 2026-03-20; the old `/search/docs/crawling-indexing/verifying-googlebot` URL 301s here):
  - Reverse DNS for common crawlers is `crawl-***-***-***-***.googlebot.com` or `geo-crawl-***-***-***-***.geo.googlebot.com`.
  - Special-case crawlers resolve to `rate-limited-proxy-***.google.com`. User-triggered fetchers resolve to `***.gae.googleusercontent.com` or `google-proxy-***.google.com`.
  - IP files under `https://developers.google.com/static/crawling/ipranges/` are `common-crawlers.json`, `special-crawlers.json`, `user-triggered-fetchers.json`, `user-triggered-fetchers-google.json` and `user-triggered-agents.json`. All returned 200 on 2026-10-28.
  - **There is no `googlebot.json` at the new path (404).** The legacy `/static/search/apis/ipranges/googlebot.json` 301s to `common-crawlers.json`.
  - The common crawlers list was re-dated 2026-10-15 with no changelog entry ([common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)).
- **CONFIRMED with detail: hreflang** ([localized-versions](https://developers.google.com/search/docs/specialty/international/localized-versions), last updated 2026-09-21):
  - HTML, HTTP headers and sitemaps are "equivalent". Each version "must list itself as well as all other language versions". URLs must be fully qualified.
  - "If two pages don't both point to each other, the tags will be ignored". Partial sets are tolerated: "Google will still process the ones that point to each other".
  - Codes are ISO 639-1 plus an optional ISO 3166-1 Alpha 2 region. "es-419, aren't supported". Values are case-insensitive. Region-only codes are invalid. `EU`, `UN` and `UK` have no effect. ISO 15924 scripts are allowed (`zh-Hant`, `zh-Hans-US`).
  - `x-default` is the fallback and is designed for selector pages.
  - Google "doesn't use hreflang or the HTML lang attribute to detect the language of a page". Localized pages "are only considered duplicates if the main content of the page remains untranslated".
  - `<link>` tags must sit in a well-formed `<head>` and must not be combined with `media`. Sitemap `xhtml:link` children don't count toward the URL limit.
- **CONFIRMED with detail: site move with URL changes** ([site-move-with-url-changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes), 2026-08-20; [Change of Address help](https://support.google.com/webmasters/answer/9370220)):
  - Use 301/308 redirects. Googlebot follows up to 10 hops, but Google advises "ideally no more than 3 and fewer than 5".
  - Keep redirects "generally at least 1 year". The Change of Address help says "at least 180 days" and recommends keeping the old domain for at least a year.
  - Change of Address is only for domain or subdomain moves. It is not for HTTP to HTTPS, www/non-www or path moves.
  - Since 2026-06-17, domain migrations should submit Change of Address "for all verified variants of the old domain (including subdomains and www/non-www versions) ... even if you're not actively using these variants".
  - Requirements: owner of both properties with the same Google account. Domain-level properties only, and the tool "does not move any subdomains below the specified domain (including www)".
  - Don't chain moves or merge A, B and C into D at once. A domain can be moved to a path on another domain.
  - A "move in progress" notice shows for 180 days. Old sitemaps can be removed once the new one is submitted.
- **CONFIRMED with detail: Search Analytics API** ([searchanalytics.query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query), 2026-08-11; [limits](https://developers.google.com/webmaster-tools/limits), 2025-08-28; [hourly blog](https://developers.google.com/search/blog/2025/04/san-hourly-data), 2025-04-09):
  - `rowLimit` "Valid range is 1-25,000; Default is 1,000", with paging via `startRow`. Dates are in PT.
  - `dataState`: `final` (default), `all` (includes fresh data) and `hourly_all` (use with the `HOUR` dimension, partial data). The API returns hourly data "for up to 10 days", while the UI shows only the last 24 hours.
  - `aggregationType: byProperty` is not supported for `discover`/`googleNews`.
  - Quotas: 1,200 QPM per site and per user, and 30,000,000 QPD and 40,000 QPM per project. There are also short-term (10-minute) and long-term (1-day) load quotas. Page plus query grouping is the most expensive, and long date ranges cost more.
- **CONFIRMED: URL Inspection API quota.** The limit is 2,000 QPD and 600 QPM per site, and 10,000,000 QPD and 15,000 QPM per project. Other resources allow 20 QPS and 200 QPM per user. [limits](https://developers.google.com/webmaster-tools/limits)
- **CONFIRMED with detail: "Inside Googlebot" (2026-03-31) body text** now extracted:
  - The 2MB Googlebot fetch limit applies "including the HTTP header" (the blog also says "includes HTTP request headers"). Bytes past the cutoff "aren't fetched, they aren't rendered, and they aren't indexed".
  - Each referenced resource has its own counter.
  - WRS is stateless and clears local and session storage.
  - Google advises putting meta tags, title, canonicals and essential structured data "higher up in the HTML document".
  - [blog](https://developers.google.com/search/blog/2026/03/crawler-blog-post)

### 11.6 AI crawlers, llms.txt, Cloudflare, IETF, Bing

- **CONFIRMED: OpenAI** ([bots](https://developers.openai.com/api/docs/bots)). Tokens and versions are unchanged (GPTBot/1.4, OAI-SearchBot/1.4, ChatGPT-User/1.0, OAI-AdsBot/1.0), and the "~24 hours" robots.txt lag is unchanged. Not in the 10-12 doc: IP lists at `openai.com/gptbot.json`, `searchbot.json`, `chatgpt-user.json` and `adsbot.json`. When fetching robots.txt, the UA "may" include an extra `robots.txt` marker (date added unknown).
- **CONFIRMED: Anthropic** help article is unchanged (dateModified 2026-04-07): ClaudeBot, Claude-SearchBot and Claude-User, Crawl-delay honored, and IP blocking discouraged. [Claude help](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web)
- **CONFIRMED: Perplexity** ([bots](https://docs.perplexity.ai/guides/bots)). PerplexityBot/1.0 and Perplexity-User/1.0 are unchanged. Changes "may take up to 24 hours", and Perplexity-User "generally ignores robots.txt". IP lists are at `perplexity.com/perplexitybot.json` and `perplexity-user.json`.
- **CONFIRMED: Apple** (published 2026-09-04, unchanged) ([119829](https://support.apple.com/en-us/119829)) and **Meta**. Meta's crawlers may cache robots.txt "for up to 24 hours". meta-externalfetcher and facebookexternalhit may bypass robots.txt. [Meta crawlers](https://developers.facebook.com/docs/sharing/webmasters/web-crawlers/)
- **CONFIRMED: llms.txt** spec is v2, modified 2026-08-10, with no change since ([llmstxt.org](https://llmstxt.org/)). No vendor statement about using llms.txt for citations was found.
- **CHANGED (resolves section 10): Cloudflare `use=reference`.** It is part of `content-use`, an optional Content Signals extension "Cloudflare is testing". The values are `use=immediate` ("Interact, but store and reuse nothing"), `use=reference` ("Index, excerpt, and link back") and `use=full` ("Summarize and reproduce"). Managed robots.txt is now added only when Bot Preference Sync is on **and** at least one Search, Agent or Training policy blocks. Cloudflare notes Search Console "may occasionally report `Syntax not understood`" for Content Signals and reports "no impact on crawling rates or SEO" (vendor claim). [managed-robots-txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/) (2026-10-22)
- **CHANGED (resolves section 10): Cloudflare default AI bot blocking for new domains.** "On September 15, 2026, Cloudflare will set updated defaults for new domains: bots classified as Training or as Agent will be blocked on pages that display ads, and Search will remain allowed. Mixed-purpose crawlers that combine Search and Training will also be blocked by all configurations to block AI training". The legacy "Block AI bots" toggle is deprecated as of 2026-09-15. A new pSEO site behind Cloudflare with ads may therefore block agent fetchers (ChatGPT-User, Claude-User, Perplexity-User) by default. [block-ai-bots](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/) (page 2026-07-01)
- **CONFIRMED:** Cloudflare pay per crawl is still "in closed beta" (doc 2026-07-28), and the AI Crawl Control changelog has no entry after 2026-06-16. [pay-per-crawl](https://developers.cloudflare.com/ai-crawl-control/features/pay-per-crawl/what-is-pay-per-crawl/), [changelog](https://developers.cloudflare.com/ai-crawl-control/changelog/)
- **NEW (2026-10-15): Cloudflare and OpenAI discovery pilot** (joint vendor post). It started in July 2026 on "about 1%" of Cloudflare's network. Cloudflare sends page-discovery and change signals (filtering out nonexistent, redirecting and duplicate URLs) to OpenAI's search crawler, which "independently evaluates and ranks". It "has enabled OpenAI to discover and index hundreds of millions of new web pages" (vendor claim, not independently verified). It uses "metadata ... rather than sharing page content for model training", and "A signal about a page doesn't grant permission to access it." There is no opt-in mechanism and nothing for site owners to do. [blog](https://blog.cloudflare.com/cloudflare-openai-discovery-agentic-web/)
- **NEW (2026-10-16): Cloudflare Verified bots "continuous accountability".** It produces trust bands from robots.txt (RFC 9309) adherence over time and from whether a bot backs off after HTTP 429. Scores are planned for Radar, and customers will later be able to set a trust threshold (vendor roadmap). [blog](https://blog.cloudflare.com/verified-bots-accountability/)
- **CONFIRMED: IETF aipref.** `draft-ietf-aipref-vocab-08` (2026-09-13/14) and `draft-ietf-aipref-attach-05` (2026-08-18, the robots.txt and header attachment draft) are both WG documents, "I-D Exists", intended Proposed Standard. Neither is an RFC. Correction to section 7: attachment syntax is being specified in its own draft, not just "not finalized". [vocab](https://datatracker.ietf.org/doc/draft-ietf-aipref-vocab/), [attach](https://datatracker.ietf.org/doc/draft-ietf-aipref-attach/)
- **NEW (2026-10-13): Bing Webmaster Tools "Topics Portfolio" (beta)** inside the AI Performance report. It clusters grounding queries into topics with Topic Size (approximate citations across all sites), Sites Cited, Queries and "Top Opportunity Queries" (shown as ranges). Microsoft calls these "directional signals". There are no clicks and no API. [blog](https://blogs.bing.com/webmaster/2026/10/introducing-topics-portfolio-beta-in-ai-performance/)
- **NEW to this doc (2026-02-10, missed on 10-12): Bing AI Performance report (public preview).** It shows Total Citations, Average Cited Pages, grounding queries (sampled) and page-level citations across Microsoft Copilot, Bing AI summaries and "select partner integrations". There are no clicks and no API. Unlike Google's report, it exposes query-level data. [blog](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/)
- **CONFIRMED: IndexNow.** Participants are Amazon, Bing, Naver, Seznam, Yandex and Yep, with 10,000 URLs per POST. Google is not listed. [faq](https://www.indexnow.org/faq)

### 11.7 Logs (Task B)

- **WRONG (skill `seo-log-analysis`: "Enterprise plans only"): Cloudflare Logpush is on all plans since 2026-09-30.** "Cloudflare Logpush is now available on Free, Pro, Business, and Enterprise plans with usage-based pricing", and Free, Pro and Business can self-serve.
  - Pricing per account per month: 25 GB internal exports included, then $0.03/GB (R2, Pipelines). 25 GB external exports included, then $0.10/GB. 1 GB transformations included, then $0.04/GB.
  - Existing Enterprise contracts keep their pricing.
  - Limit of 4 jobs per zone, and there is no backfill.
  - An `http_requests` record is about 1.5-3 kB uncompressed.
  - Field names used in the skill exist in the dataset: `ClientRequestURI`, `ClientIP`, `ClientRequestUserAgent`, `EdgeResponseStatus`, `EdgeTimeToFirstByteMs`, `CacheCacheStatus`, `VerifiedBotCategory`.
  - "The availability of Logpush dataset fields depends on your subscription plan", so check per-plan field availability before relying on it.
  - [changelog](https://developers.cloudflare.com/changelog/post/2026-09-30-logpush-usage-based-pricing/), [Logpush](https://developers.cloudflare.com/logs/logpush/) (2026-10-22), [pricing](https://developers.cloudflare.com/logs/logpush/pricing/) (2026-10-12), [http_requests fields](https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/zone/http_requests/) (2026-09-14)
- Vercel log drain fields: see 11.4 (CONFIRMED).

### 11.8 Section 10 items, re-checked

| Item | Status 2026-10-28 | Evidence |
|---|---|---|
| Per-update spam targets | STILL UNVERIFIED | Dashboard text only says global, all languages ([history](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history)) |
| 2025 scaled-content manual action wave | STILL UNVERIFIED (wave); CONFIRMED that the action type exists | Manual Actions help lists "Major spam problems" covering "scaled content abuse, cloaking" ([help 9044175](https://support.google.com/webmasters/answer/9044175)); no Google data on volume or timing |
| 2026 QRG update | CONFIRMED none | PDF is still "September 11, 2025", HTTP Last-Modified Thu, 11 Sep 2025 17:38 GMT ([PDF](https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf)) |
| Sep 2025 QRG YMYL rename | CONFIRMED | PDF text: "YMYL Government, Civics & Society: ... election and voting information" |
| Sep 2025 QRG "AI Overview examples added" | WRONG (secondary claim) | Full-text search of the PDF finds no "AI Overview" or "AI Mode" string; the changelog only says "Added additional examples for clarity" |
| Gen-AI report in API | CONFIRMED not available | see 11.2 |
| Google and IndexNow | STILL UNVERIFIED (no Google statement) | Not in the IndexNow participant list |
| Bytespider official docs | STILL UNVERIFIED | No ByteDance-hosted page found; only third-party listings |
| Cloudflare `use=reference` | RESOLVED (CHANGED) | see 11.6 |
| Cloudflare default block for new domains | RESOLVED (CHANGED) | see 11.6 |
| Lighthouse 13.3 date | RESOLVED: 2026-05-07 | v13.3.0 notes: "New agentic browsing category added to default config" and llms-txt audit tweaks ([v13.3.0](https://github.com/GoogleChrome/lighthouse/releases/tag/v13.3.0)) |
| "Inside Googlebot" body | RESOLVED | see 11.5 |
| AI engines using llms.txt for citations | STILL UNVERIFIED (no statement from OpenAI, Anthropic or Perplexity) | Vercel's new AI Traffic view counts "Markdown requests" by AI bots, which shows Markdown is fetched but does not prove citation use |

### 11.9 Corrections to apply in skills (not edited here)

- `ensureStatic`: only `'navigation'` validates at build. `'shell'`/`'prefetch'` add no build validation, and all values require `cacheComponents` (11.4). This affects `pseo-data`, `pseo-templates`, `pseo-performance` and `pseo-scale/references/vercel-optimization.md`.
- Cloudflare Logpush is not Enterprise-only (11.7). This affects `seo-log-analysis`.
- Indexing API: drop "approval required for more", and the default quotas are now 200 publish/day, 180 metadata/min and 380/min (11.1).
- Next.js: pin to >= 16.4.1 (critical RCEs), and plan for the 2026-11-03 security release (11.4).
- CrUX soft-nav metrics are experimental, and Search Console switches only after graduation (target May 2027) (11.3).
