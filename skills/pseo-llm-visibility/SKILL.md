---
name: pseo-llm-visibility
description: Optimize programmatic SEO pages for visibility in AI answers, separating what Google officially says affects AI Overviews/AI Mode (normal SEO fundamentals) from what helps other agents (ChatGPT, Claude, Perplexity). Use when configuring AI crawler access and robots.txt, deciding on llms.txt, controlling AI Overviews/AI Mode (nosnippet, Search Console opt-out), or when the user asks about GEO/AEO, AI search visibility, or getting cited by AI.
argument-hint: "[focus: all | google-ai | llms-txt | crawlers | controls | content | entities]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
---

# pSEO LLM Visibility

Visibility in AI-generated answers. State as of 2026-10-12 (see https://github.com/lisbeth718/pseo-skills/blob/main/docs/research-2026-10.md). The key split: **Google AI features are driven by normal SEO**; other agents (ChatGPT, Claude, Perplexity, Apple, Meta) have their own crawlers and fewer documented rules.

## Why This Matters for pSEO

- Heuristic (not a Google statement): AI answers tend to cite few sources per response, and some AI-assisted searches end without an outbound click
- Google says AI Overviews and AI Mode are "rooted in our core Search ranking and quality systems", so thin or scaled pSEO pages are not rescued by AI formatting tricks
- Other AI agents run their own crawlers; blocking them by accident removes you from their answers
- Controls over how Google uses your content in AI features changed in 2026 (see section 3)

## Core Principles

1. **Google AI features = classic SEO**: indexed, snippet-eligible, crawlable, helpful, non-commodity pages. No extra technical requirements exist
2. **Non-commodity content**: Google warns against recycling content that "could easily be produced by a generative AI model". Original data and real utility beat restated generics
3. **Do not manufacture variations**: separate pages for every query variation or fan-out query, made to manipulate rankings or AI responses, violate the scaled content abuse policy
4. **Separate audiences**: Google AI features (fundamentals only) vs other agents (crawler access, optional llms.txt, clean HTML)
5. **Honest signals**: Google's spam policies now cover "attempting to manipulate generative AI responses". Inauthentic mentions and seeding are called ineffective

## What Google Says (2026-05-15 AI optimization guide)

Source: `developers.google.com/search/docs/fundamentals/ai-optimization-guide`, plus the AI features doc.

**Does nothing for Google Search, AI Overviews or AI Mode:**
- llms.txt and other special files or Markdown ("neither harm nor help", note added 2026-06-15)
- Content chunking and rewriting content for AI
- Special schema.org markup or over-focusing on structured data
- Inauthentic mentions
- Covering every long-tail or fan-out variation (AI understands synonyms)

**What applies:**
- Page is indexed and eligible to show in Search with a snippet; there are no additional technical requirements
- Allow crawling in robots.txt and at the CDN/WAF level
- Internal links, important content as text, images/video, structured data that matches visible text
- Merchant Center and Business Profile kept current
- Good page experience; AEO/GEO "is still SEO"

No third-party tool has access to Google's ranking or AI systems, so treat tool-reported "AI visibility scores" as estimates.

## Implementation Steps

### 1. Fundamentals for Google AI features

- Confirm pages are indexed and snippet-eligible (no `nosnippet`, no restrictive `max-snippet`)
- Confirm Googlebot is not blocked in robots.txt, CDN, or WAF
- Keep HTML lean: Googlebot for Search fetches only the first 2MB of uncompressed HTML, so avoid giant inline JSON or RSC payloads on pSEO templates
- Do not generate extra near-duplicate pages per query variation (see pseo-quality-guard)
- Add original, non-commodity value per page (proprietary data, calculations, real comparisons)

### 2. llms.txt (cheap, optional, for non-Google agents)

llms.txt is a plain Markdown file at `/llms.txt`. **Google Search ignores it.** No AI search provider (OpenAI, Anthropic, Perplexity) has officially said it uses llms.txt as a citation input. Reasons to still publish one: it costs little, the spec is maintained (llmstxt.org v2, modified 2026-08-10), agent tooling reads it (Chrome Lighthouse has an experimental "Agentic Browsing" category with an llms.txt discoverability audit, Chrome 150+), and AI labs publish their own docs this way.

Do not expect a ranking or citation effect. Do not spend time maintaining it by hand.

Use the template in `references/ai-crawlers.md` ("llms.txt Format Reference").

v2 spec options (optional): per-page Markdown versions (`page.html.md` or `page.md`), discovery through `<link rel="alternate" type="text/markdown">` or an HTTP `Link:` header. `/llms-full.txt` is a common convention, not required. Generate the file from the content model at build time so it never drifts.

### 3. Controls: what actually limits Google AI use

| Control | Effect on AI Overviews / AI Mode | Notes |
|---------|----------------------------------|-------|
| `Google-Extended` (robots.txt) | **None** | Controls Gemini training and Gemini Apps/Vertex grounding only |
| `nosnippet` (meta/header) | Yes, also removes the page from Search snippets | Blocks use as direct input to AIO and AI Mode |
| `max-snippet:[n]` | Yes, limits how much can be used | Does not override structured data or license agreements |
| `data-nosnippet` | Yes, for the marked sections | Text-level exclusion |
| Search Console > Settings > Search generative AI | Yes, Exclude stops links and grounding in AIO, AI Mode and Discover gen-AI features | All sites since 2026-08-31. Options: Include (default), Exclude, Inherit from parent property. Not a ranking signal for other Search. Takes 1-2 days. Does not affect training |
| `noindex` | Removes the page from Search entirely | Last resort |

Measurement: AI Overviews and AI Mode count in Search Console Performance "Web" totals. The Generative AI performance report (all sites since 2026-08-31) shows **impressions only**, with dimensions for pages, countries, devices and dates. It has no query dimension, no clicks, and no API support found. Treat clicks and queries from AI features as not measurable.

For all Google controls (robots meta, `data-nosnippet`, X-Robots-Tag, Search generative AI setting) use Google's "Control what you share" doc (2026-10-21) as the single reference: https://developers.google.com/search/docs/crawling-indexing/control-what-you-share

**Measurement: AI referral traffic.** The Generative AI report is impressions-only, so measure clicks from other engines separately:
- Analytics referrers: chatgpt.com, perplexity.ai, claude.ai, gemini.google.com, copilot.microsoft.com. Some engines append `utm_source`; this is not verified per engine, so match referrers too and do not rely on it
- Server logs: seo-log-analysis (AI bot fetches vs human referrals)

Bot fetches, not referrals: the Vercel Observability "AI Traffic" view (2026-10-28) shows requests by verified AI bot, most-crawled pages, Markdown requests and error pages. Use it for crawl monitoring, not for counting human visits.

### 4. Configure AI Crawler Access in robots.txt

robots.txt creation is owned by **pseo-linking** (section 8). This skill defines which AI crawler rules to include. AI bots fall into three classes:

- **Search/indexing bots** build the index for AI search results. Allow these to be eligible for citation
- **User-fetch bots** fetch a page when a user asks. Some ignore robots.txt. Blocking can reduce visibility for user-directed requests
- **Training bots** collect data for model training. Allowing or blocking is a business choice with no effect on Google Search

**Sensible default: allow search and user-fetch bots, opt out of training only if you choose to.** The robots.txt block and the llms.txt template live in `references/ai-crawlers.md`; use them from there and do not copy them into this skill.

Notes:
- `Google-Extended` does **not** control AI Overviews or AI Mode. Use the Search Console setting or snippet controls (section 3)
- Opting out of `GPTBot` does not remove you from ChatGPT search; `OAI-SearchBot` is independent. Likewise `ClaudeBot` vs `Claude-SearchBot`
- OpenAI says opted-out sites can still appear in ChatGPT search "as navigational links"
- Do not IP-block AI crawlers: Anthropic notes this prevents them from reading robots.txt
- Content-Signal / Content-Usage lines are not parsed by Google (inferred; Google supports only user-agent, allow, disallow, sitemap)
- Training opt-out does not affect Google Search ranking; do not disallow `Googlebot` or `Bingbot`

See `references/ai-crawlers.md` for the robots.txt template, the full table of tokens and purposes, llms.txt, Cloudflare controls and the IETF aipref status.

### 5. Content for Non-Google Agents (heuristics, not Google guidance)

These are practical heuristics. Google says chunking and rewriting for AI do nothing for its features. They cost little and keep pages clear for people, but treat any numeric target as a rough guide.

- Lead sections with the direct answer, then supporting detail
- Make each section understandable on its own (people land mid-page too)
- Use headings that state what the section answers
- Prefer plain, neutral, factual tone; avoid unsupported superlatives
- Include specific numbers, dates, and named sources where you have them (the GEO paper, Aggarwal et al. 2024, arXiv:2311.09735, reports gains from statistics and citations in a controlled setting; real-world effect on production engines is unproven)
- Do not pad or split content to hit word counts. There is no verified "ideal" section length. Earlier figures like "134-167 words" or "120-180 words gets 70% more citations" are unsupported and were removed

### 6. Entities and Consistency

Consistent naming helps both people and systems disambiguate. Not a Google AI requirement.

- Use the full canonical name of the primary entity, consistently across pages
- State relationships in text ("made by [company]", "located in [city]")
- Link to authoritative sources where it helps the reader
- Keep structured data matching the visible text. Schema is for rich-result eligibility (Product, Review, Breadcrumb, JobPosting, Event, LocalBusiness, Organization), not for AI. FAQPage rich results ended 2026-05-07 and HowTo is gone; do not generate them for SERP or AI benefit

### 7. Rendering and Indexation Across Engines

| Engine | Source | Requirement |
|--------|--------|-------------|
| Google Search, AI Overviews, AI Mode | Google index | Indexed and snippet-eligible; no extra technical requirements |
| ChatGPT search | OpenAI's own bot (`OAI-SearchBot`) | Allow it in robots.txt |
| Claude | `Claude-SearchBot`, `Claude-User` | Allow them in robots.txt |
| Perplexity | `PerplexityBot`, `Perplexity-User` | Allow PerplexityBot |
| Bing, Copilot | Bing index | Verify in Bing Webmaster Tools |

- Verify Bing indexation and submit the sitemap to both Search Console and Bing Webmaster Tools. IndexNow works for Bing, Yandex and others; Google does not participate
- Serve content in server-rendered HTML (SSR/SSG). Most non-Google bots are not documented as rendering JavaScript, so do not rely on client rendering
- Return real 404 or 410 for no-data pages; do not stream a 200 shell with `noindex` for pages that should not exist

### 8. Freshness

- Show a visible "Last updated" date only when content actually changed
- Set `dateModified` and sitemap `lastmod` from real content-change timestamps, not build time
- Use ISR with sensible revalidation for data that changes (prices, availability, ratings)
- Freshness claims for AI citation come from vendor studies and vary by topic. Treat as a heuristic

## Scope Parameter

If `$ARGUMENTS` specifies a focus:
- `all` (default): Sections 1-8
- `google-ai`: Sections 1, 3
- `llms-txt`: Section 2
- `crawlers`: Section 4 (and 7 for engine requirements)
- `controls`: Section 3
- `content`: Sections 5, 8
- `entities`: Section 6

## LLM Visibility Checklist

- [ ] Pages are indexed, snippet-eligible, and not blocked for Googlebot at robots.txt, CDN, or WAF level
- [ ] No fan-out or query-variation page sets made to manipulate rankings or AI answers
- [ ] Pages carry non-commodity value (original data, utility), not generic restatements
- [ ] robots.txt allows search and user-fetch AI bots (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User) and Bingbot
- [ ] Training opt-outs (GPTBot, ClaudeBot, Google-Extended, etc.) are a deliberate choice
- [ ] AI Overview/AI Mode controls are deliberate: nosnippet/max-snippet/data-nosnippet or the Search Console generative AI setting, not `Google-Extended`
- [ ] Site is indexed by both Google and Bing
- [ ] All pages are server-rendered (SSR/SSG), HTML under 2MB
- [ ] Entity names are consistent; structured data matches visible text
- [ ] `lastmod` and `dateModified` reflect real changes
- [ ] (Optional) `/llms.txt` exists, generated at build time, treated as non-Google agent support only
- [ ] Generative AI performance report is reviewed for impressions, with no expectation of query or click data

## Relationship to Other Skills

- **Builds on**: pseo-templates (page structure), pseo-schema (JSON-LD), pseo-metadata (crawlability), pseo-linking (robots.txt, sitemap)
- **Extends**: pseo-performance (SSR/SSG requirement, freshness via ISR)
- **Validated by**: pseo-quality-guard (content quality is the foundation; scaled thin pages fail Google's policies and will not earn citations either)
