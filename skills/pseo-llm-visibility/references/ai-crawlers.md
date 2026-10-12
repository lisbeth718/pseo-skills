# AI Crawler Reference

State as of 2026-10-12. Source: https://github.com/lisbeth718/pseo-skills/blob/main/docs/research-2026-10.md section 7 (vendor docs fetched that day). Vendors change tokens often; re-check the linked doc before relying on a row.

## Three classes of AI bot

| Class | What it does | Default stance |
|-------|--------------|----------------|
| Search / indexing | Builds the index behind an AI search product | Allow, needed to be eligible for citation |
| User-fetch | Fetches a URL when a user asks; some ignore robots.txt | Allow; blocking may reduce visibility for user-directed requests |
| Training | Collects data to train models | Business choice; no effect on Google Search ranking |

## Known AI Crawlers

| Vendor | robots.txt token | UA substring | Class / purpose | Honors robots.txt? |
|--------|------------------|--------------|-----------------|--------------------|
| OpenAI | `GPTBot` | `compatible; GPTBot/1.4; +https://openai.com/gptbot` | Training | Yes |
| OpenAI | `OAI-SearchBot` | `compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot` | Search (ChatGPT results). Opted-out sites can still appear "as navigational links"; ~24h to apply | Yes |
| OpenAI | `ChatGPT-User` | `compatible; ChatGPT-User/1.0; +https://openai.com/bot` | User-fetch and GPT Actions; not used to decide Search inclusion | "robots.txt rules may not apply" |
| OpenAI | `OAI-AdsBot` | `compatible; OAI-AdsBot/1.0; +https://openai.com/adsbot` | Validates ChatGPT ad landing pages; not training | Not stated |
| Anthropic | `ClaudeBot` | UA strings not published in the help article | Training | Yes; supports `Crawl-delay` |
| Anthropic | `Claude-SearchBot` | n/a | Search indexing to improve result quality | Yes |
| Anthropic | `Claude-User` | n/a | User-fetch; blocking "may reduce your site's visibility for user-directed web search" | Yes |
| Perplexity | `PerplexityBot` | `compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot` | Search; "not used to crawl content for AI foundation models" | Recommended to allow; respect not explicitly stated |
| Perplexity | `Perplexity-User` | `compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user` | User-fetch | "Generally ignores robots.txt" |
| Google | `Googlebot` | standard Googlebot UA | Search; also the source for AI Overviews and AI Mode | Yes |
| Google | `Google-Extended` | none (token only) | Gemini training + Gemini Apps / Vertex grounding. **Not** Search, **not** AI Overviews or AI Mode | Yes |
| Google | `Google-Agent` | `compatible; Google-Agent; +https://developers.google.com/crawling/docs/crawlers-fetchers/google-agent` | User-fetch: Google-hosted agents acting on a user request (added 2026-03-20); experiments with Web Bot Auth | User-triggered; generally ignores robots.txt |
| Google | `Google-GeminiNotebook` (renamed from Google-NotebookLM 2026-07-16), `Google-Pinpoint`, `Google-CWS`, `GoogleMessages` | see Google doc | User-triggered fetchers | User-triggered |
| Apple | `Applebot` | `(Applebot/0.1; +http://www.apple.com/go/applebot)` | Spotlight/Siri/Safari search; data "may also" train Apple models and ground answers. Follows Googlebot rules if no Applebot rules; ignores crawl-delay | Yes |
| Apple | `Applebot-Extended` | none ("does not crawl webpages") | Opt-out token for Apple gen-AI training; not a Search ranking factor | Yes |
| Meta | `meta-externalagent` | `meta-externalagent/1.1` | Training / direct indexing | Yes |
| Meta | `meta-webindexer` | `meta-webindexer/1.1` | Meta AI search citations | Yes |
| Meta | `meta-externalfetcher` | `meta-externalfetcher/1.1` | User-requested and agentic fetches | May bypass |
| Meta | `meta-externalads`, `facebookexternalhit` | `meta-externalads/1.1`, `facebookexternalhit/1.1` | Ads; link previews (may bypass robots.txt for integrity checks) | Partly |
| Common Crawl | `CCBot` | `CCBot/2.0 (https://commoncrawl.org/faq/)` | Open crawl corpus, widely used for training. IPs at `index.commoncrawl.org/ccbot.json`, reverse DNS `crawl.commoncrawl.org` | Yes |
| ByteDance | `Bytespider` | n/a | Presumed training. **Undocumented**: no official ByteDance doc found. Appears in Cloudflare's managed block list | Unverified |
| Microsoft | `Bingbot` | standard Bingbot UA | Search; Bing index and Copilot. Do not block | Yes |

Sources: OpenAI `developers.openai.com/api/docs/bots.md`; Claude help article "Does Anthropic crawl data from the web" (updated 2026-04-07); `docs.perplexity.ai/guides/bots`; Google common crawlers and user-triggered fetchers docs; Apple support 119829 (2026-09-04); Meta web-crawlers doc; `commoncrawl.org/ccbot`.

Notes:
- OpenAI: "Each setting is independent of the others", and if both bots are allowed "we may use the results from just one crawl for both"
- Anthropic recommends against IP blocking because it prevents the bot from reading robots.txt
- Cohere and other smaller crawlers were in earlier versions of this file; no current primary-source entry was verified, so they are omitted

## Sensible robots.txt default

Allow search and user-fetch bots. Opt out of training only if you choose to.

```
# Search and user-fetch: allow
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

# Training: optional opt-outs
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: meta-externalagent
Disallow: /

User-agent: CCBot
Disallow: /
```

User-fetch bots that ignore robots.txt (ChatGPT-User, Perplexity-User, Google-Agent, meta-externalfetcher) need WAF/rate rules if you want to restrict them; robots.txt alone will not.

## What controls Google AI features

`Google-Extended` does **not** control AI Overviews or AI Mode. Use:
- `nosnippet`, `max-snippet:[n]`, `data-nosnippet` (also removes or limits Search snippets)
- Search Console > Settings > Search generative AI (Include / Exclude / Inherit; all sites since 2026-08-31). Does not affect training

## Cloudflare

- **AI Crawl Control** (formerly AI Audit): all plans. Dashboard, per-crawler allow/block, robots.txt compliance tracking
- **Pay per crawl**: still closed/private beta (doc 2026-07-28). Crawlers either send payment-intent headers and get a 200, or receive HTTP 402 with pricing. Cloudflare is merchant of record. WAF and Bot Management blocks override it. Not generally available, do not plan on it
- **Managed robots.txt / Bot Preference Sync**: prepends a Content Signals Policy plus disallow groups for Amazonbot, Applebot-Extended, Bytespider, CCBot, ClaudeBot, Google-Extended, GPTBot and meta-externalagent. Signals: `search` (index, links, short excerpts, excluding AI summaries), `ai-input` (RAG/grounding), `ai-train`. Example: `Content-signal: search=yes, ai-train=no, use=reference` (meaning of `use=reference` unverified)
- Check your Cloudflare AI-bot settings: managed robots.txt or block rules can silently block the search and user-fetch bots you want to allow

## IETF AI Preferences (aipref)

- `draft-ietf-aipref-vocab-08` (2026-09-14) is still an Internet-Draft. Categories: `train-ai`, `ai-use`, `search`. Example: `train-ai=y, search=n`
- Attachment syntax (robots.txt or `Content-Usage` header) is not finalized
- No major crawler has documented honoring it. Google's robots.txt parser supports only user-agent, allow, disallow, sitemap (Content-Signal lines are therefore likely ignored; inferred)
- Safe to publish as a signal; do not rely on it for enforcement

## Web Bot Auth

Signed agent requests (HTTP message signatures). Google documented experimental support on 2026-05-04. Useful for verifying agents instead of trusting UA strings.

## Per-Platform Notes

Only documented facts are listed. Citation preferences ("prefers Q&A", "top cited domains") from earlier versions were secondary-source claims and were removed.

### Google (AI Overviews, AI Mode)
- Source: Google index. Must be indexed and eligible to show with a snippet
- May use query fan-out across subtopics; AI Overviews often do not trigger
- No special markup, llms.txt, or chunking has an effect
- Fan-out page farms are scaled content abuse

### ChatGPT search
- Allow `OAI-SearchBot`. `GPTBot` (training) is independent
- `ChatGPT-User` fetches on user request

### Claude
- Allow `Claude-SearchBot` and `Claude-User`. `ClaudeBot` (training) is independent

### Perplexity
- Allow `PerplexityBot`. `Perplexity-User` fetches on user request and generally ignores robots.txt

### Bing / Copilot
- Bing index. Verify in Bing Webmaster Tools. IndexNow is supported (Google does not participate)

## llms.txt Format Reference

Status: Google Search ignores llms.txt (stated officially, 2026-06-15). No AI search provider has said it uses it for citations. The spec is llmstxt.org v2 (modified 2026-08-10); Chrome Lighthouse has an experimental llms.txt audit. Treat as cheap, optional support for non-Google agents.

```markdown
# Site Name

> Brief description of the site and its content focus.

## Docs

- [Page Title](https://example.com/page): Brief description of what this page covers
- [Another Page](https://example.com/another): Brief description

## Optional

- [Less Important Page](https://example.com/optional): Description
```

### For pSEO sites, structure llms.txt by category:

```markdown
# Example Site - [Domain]

> [One-line description of the site's purpose and expertise]

## Categories

- [Category A](/category-a): [What this category covers]
- [Category B](/category-b): [What this category covers]

## Page Types

- Individual pages: [What each page contains: data, comparisons]
- Hub pages: [Category overviews with links to all pages in the category]

## Data & Freshness

- Data source: [Where the information comes from]
- Update frequency: [How often content is refreshed]

## Full Index

- [/sitemap.xml](/sitemap.xml): XML sitemap for all pages
```

v2 options: per-page Markdown (`page.html.md` or `page.md`), discovery via `<link rel="alternate" type="text/markdown">`, `rel="describedby"`, or HTTP `Link:` headers. Generate at build time from the content model.

## Content heuristics (not Google guidance)

Google states that chunking and rewriting for AI do nothing for its features. The numbers below are not verified for any production engine. Use as rough guides only, never as targets.

| Heuristic | Basis | Status |
|-----------|-------|--------|
| Lead with the answer, keep sections self-contained | Readability, general practice | Reasonable, unquantified |
| Add statistics, quotations, source citations | GEO paper (Aggarwal et al., 2024, arXiv:2311.09735), controlled experiment | Effect on real engines unproven |
| Keep content fresh | Vendor studies | Directional only; use real `lastmod` and `dateModified` |

Removed as unsupported: "134-167 word answer capsule", "120-180 words between headings gets 70% more citations", fixed token/FAQ length tables, and platform citation multipliers.
