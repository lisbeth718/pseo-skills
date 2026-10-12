---
name: seo-log-analysis
description: Analyze server and CDN access logs for search and AI crawler behavior. Use when diagnosing crawl waste, pages that are never crawled or indexed, slow Googlebot responses, how long new pages take to get a first crawl, or how much traffic AI bots take. Covers log formats, bot verification, metrics, and a duckdb pipeline.
argument-hint: "[log path or source | metric: volume | status | waste | orphans | ttfc | latency | ai]"
allowed-tools: Read, Glob, Grep, Bash, WebFetch
---

# SEO Log Analysis

Logs are the only first-party record of what crawlers actually fetch. Search Console shows samples; logs show everything. Use them to turn "Discovered - currently not indexed" into a specific cause and action.

Read-only skill: it produces findings and recommended changes, it does not edit config.

## 1. Get the logs

| Source | How | Notes |
|---|---|---|
| nginx | `access_log` with the `seo` JSON format below | `$request_time` is total time, not TTFB; for TTFB use `$upstream_header_time` (origin) |
| Caddy | `log { format json }` | Fields: `request.uri`, `request.remote_ip`, `request.headers["User-Agent"]`, `status`, `duration` (seconds), `size` |
| Traefik | `accessLog: { format: json, fields: { headers: { defaultMode: keep } } }` | Fields: `RequestPath`, `ClientHost`, `DownstreamStatus`, `Duration` (nanoseconds), `request_User-Agent` |
| Cloudflare | Logpush `http_requests` dataset to R2/S3 (NDJSON). Enterprise plans only; other plans need a Worker or origin logs | `ClientRequestURI`, `ClientIP`, `ClientRequestUserAgent`, `EdgeResponseStatus`, `EdgeTimeToFirstByteMs`, `CacheCacheStatus`, `VerifiedBotCategory`. Edge logs include cache hits, origin logs do not |
| Vercel | Log Drain (HTTP/Datadog/etc.) | Runtime logs are kept only 1h (Hobby) or 1 day (Pro), so a drain is the only way to get history. Request entries carry a `proxy` object: `proxy.path` (with query), `proxy.statusCode`, `proxy.userAgent` (an array, take element 0), `proxy.clientIp`, `proxy.method`, `proxy.vercelCache`, `proxy.responseByteSize`; top-level `timestamp` is epoch ms. Filter to entries with `proxy` set (checked 2026-10-12 against vercel.com/docs/drains/reference/logs; re-check before relying on it) |

If the origin sits behind a CDN, analyze **edge** logs for crawl volume and **origin** logs for response time. Real client IP must come from the CDN header, never from the proxy hop.

Minimum window: 14 days for patterns, 30+ for template-level crawl share. Keep raw logs outside the repo and strip user IPs from anything committed.

nginx format with the keys the SQL below uses:

```nginx
log_format seo escape=json '{"time":"$time_iso8601","remote_addr":"$remote_addr",'
  '"xff":"$http_x_forwarded_for","request_method":"$request_method",'
  '"request_uri":"$request_uri","status":"$status","bytes":"$body_bytes_sent",'
  '"duration_s":"$request_time","ttfb_s":"$upstream_header_time",'
  '"http_user_agent":"$http_user_agent","referer":"$http_referer"}';
access_log /var/log/nginx/seo.json seo;
```

`$request_time` is seconds for the whole request; `$upstream_header_time` is seconds to the upstream's first byte and is `-` for static or cached responses. Multiply by 1000 and use `try_cast`.

## 2. Normalize

Convert every source to one schema before analysis:

```
ts, ip, method, path, query, status, bytes, ttfb_ms, duration_ms, ua, referer
```

Load into duckdb (NDJSON example, nginx JSON):

```sql
CREATE TABLE hits AS
SELECT
  CAST(time AS TIMESTAMP) AS ts,
  remote_addr AS ip,
  request_method AS method,
  split_part(request_uri, '?', 1) AS path,
  nullif(split_part(request_uri, '?', 2), '') AS query,
  CAST(status AS INT) AS status,
  try_cast(ttfb_s AS DOUBLE) * 1000 AS ttfb_ms,
  try_cast(duration_s AS DOUBLE) * 1000 AS duration_ms,
  http_user_agent AS ua
FROM read_json_auto('logs/*.json', format='newline_delimited', ignore_errors=true);
```

Keep only GET and HEAD for crawl analysis. Drop `/_next/static`, images and fonts into a separate `asset` flag rather than deleting them; Google fetches resources separately and they count toward host load.

## 3. Classify bots, then verify

User-agent strings are spoofable. Classify by UA first, then **verify** before trusting any number.

| Class | UA token | Verify with |
|---|---|---|
| Google Search | `Googlebot`, `Googlebot-Image`, `Googlebot-Video` | `common-crawlers.json`, or reverse DNS to `googlebot.com` / `geo.googlebot.com`, forward-confirmed |
| Google special | `Google-InspectionTool`, AdsBot and other special crawlers | `special-crawlers.json`, or reverse DNS to `google.com` |
| Google user-triggered | `Google-Read-Aloud`, others in the user-triggered doc | `user-triggered-fetchers.json` and `user-triggered-fetchers-google.json`, or reverse DNS to `googleusercontent.com` / `gae.googleusercontent.com` |
| Google agent | `Google-Agent` | `user-triggered-agents.json` |
| Bing | `bingbot` | `https://www.bing.com/toolbox/bingbot.json` or reverse DNS `search.msn.com` |
| OpenAI | `GPTBot` (training), `OAI-SearchBot` (search), `ChatGPT-User` (user fetch) | `https://openai.com/gptbot.json`, `searchbot.json`, `chatgpt-user.json` |
| Perplexity | `PerplexityBot` (search), `Perplexity-User` (user fetch) | `https://www.perplexity.com/perplexitybot.json`, `perplexity-user.json` |
| Common Crawl | `CCBot` | `https://index.commoncrawl.org/ccbot.json`; reverse DNS suffix `crawl.commoncrawl.org` |
| Anthropic | `ClaudeBot` (training), `Claude-SearchBot` (search), `Claude-User` (user fetch) | No published IP list found (checked 2026-10-12): treat as UA-only, unverified; do not IP-allowlist |
| Apple | `Applebot` | `https://search.developer.apple.com/applebot.json`, or reverse DNS `applebot.apple.com`; `Applebot-Extended` is a robots token only and never appears in logs |
| Meta | `meta-externalagent` (training), `meta-webindexer` (search), `meta-externalfetcher` (user fetch) | UA-only unless Meta publishes ranges; check the Meta crawler doc. Bytespider (ByteDance) is also UA-only |
| Google-Extended, Applebot-Extended | robots.txt tokens only | Never appear in logs. Gemini training traffic arrives as normal Googlebot |

Google range files (all return 200, checked 2026-10-12 with `curl -sI`), under `https://developers.google.com/static/crawling/ipranges/`:

- `common-crawlers.json` (Googlebot and other common crawlers)
- `special-crawlers.json`
- `user-triggered-fetchers.json`
- `user-triggered-fetchers-google.json`
- `user-triggered-agents.json` (Google-Agent)

The legacy `https://developers.google.com/static/search/apis/ipranges/googlebot.json` still works as an alias (301). Do not hardcode ranges; refetch daily.

Reverse DNS suffixes (match the host equal to the suffix or ending in `.suffix`): common crawlers `googlebot.com`, `geo.googlebot.com`; special crawlers `google.com`; user-triggered fetchers `googleusercontent.com`, `gae.googleusercontent.com`.

**Claimed, unverified.** Bots with no published IP list or DNS suffix (ClaudeBot, Claude-SearchBot, Claude-User, Meta crawlers, Bytespider) cannot be verified. Report them as "claimed, unverified" in their own column, never merged into verified totals and never labelled fake.

Treat a hit as **fake** if the UA claims a bot but the IP fails verification. Report fake-bot share separately; it is a scraping and security signal, not crawl data.

### Verification script (TypeScript, run with tsx)

```ts
import { promises as dns } from "node:dns";
import ipaddr from "ipaddr.js"; // npm i ipaddr.js

type Prefix = { ipv4Prefix?: string; ipv6Prefix?: string };

export async function loadRanges(url: string): Promise<string[]> {
  const j = (await (await fetch(url)).json()) as { prefixes: Prefix[] };
  return j.prefixes.flatMap((p) => p.ipv4Prefix ?? p.ipv6Prefix ?? []);
}

// IPv4 and IPv6 CIDR matching. IPv4-mapped IPv6 addresses are unwrapped first.
export function matchesRanges(ip: string, cidrs: string[]): boolean {
  if (!ipaddr.isValid(ip)) return false;
  let addr = ipaddr.parse(ip);
  if (addr.kind() === "ipv6" && (addr as ipaddr.IPv6).isIPv4MappedAddress()) addr = (addr as ipaddr.IPv6).toIPv4Address();
  return cidrs.some((c) => {
    const [base, bits] = c.split("/");
    const range = ipaddr.parse(base);
    return range.kind() === addr.kind() && (addr as ipaddr.IPv4).match(range as ipaddr.IPv4, Number(bits));
  });
}

const norm = (ip: string) => ipaddr.parse(ip).toNormalizedString(); // IPv6 compares as expanded form

export async function verifyByDns(ip: string, suffixes: string[]): Promise<boolean> {
  try {
    const hosts = await dns.reverse(ip);
    for (const raw of hosts) {
      const h = raw.replace(/\.$/, "").toLowerCase(); // strip trailing dot from PTR
      if (!suffixes.some((s) => h === s || h.endsWith("." + s))) continue;
      const fwd = [...(await dns.resolve4(h).catch(() => [])), ...(await dns.resolve6(h).catch(() => []))];
      if (fwd.some((f) => norm(f) === norm(ip))) return true; // forward-confirmed
    }
  } catch {}
  return false;
}
// Verify each DISTINCT ip once and cache; never per request.
```

Prefer IP-range matching for volume (fast, offline); use reverse DNS to confirm a sample or for bots without a range file.

## 4. Metrics

Build `bot_hits` once from `hits` (extend the CASE lists to your bots and templates; set `verified` from the script's output joined on `ip`, shown here as a `verified_ips` table):

```sql
CREATE TABLE bot_hits AS
SELECT c.*, v.ip IS NOT NULL AS verified
FROM (
  SELECT h.*,
    CASE
      WHEN ua ILIKE '%googlebot%' THEN 'googlebot'
      WHEN ua ILIKE '%bingbot%' THEN 'bingbot'
      WHEN ua ILIKE '%GPTBot%' THEN 'gptbot'
      WHEN ua ILIKE '%ClaudeBot%' THEN 'claudebot'
    END AS bot,
    CASE
      WHEN path = '/' THEN 'home'
      WHEN path LIKE '/city/%' THEN 'city'
      WHEN path LIKE '/blog/%' THEN 'blog'
      ELSE 'other'
    END AS template
  FROM hits h
) c
LEFT JOIN verified_ips v ON v.ip = c.ip AND v.bot = c.bot
WHERE c.bot IS NOT NULL;
```

Bots with no verification source (ClaudeBot etc.) get `verified = false` by construction: report them as "claimed, unverified". Run the metrics on `verified` rows (add `AND verified` to the queries) and show unverified claims separately.

Define templates with a path-to-template CASE (for example `/city/*`, `/compare/*`, `/blog/*`). 

**Crawl volume by section/template.** Compare each template's share of crawl to its share of sitemap URLs and of revenue/traffic. A template with 5% of value and 60% of crawl is the waste.

```sql
SELECT template, count(*) hits, count(DISTINCT path) urls,
       round(100.0*count(*)/sum(count(*)) OVER (),1) pct
FROM bot_hits WHERE bot='googlebot' GROUP BY 1 ORDER BY hits DESC;
```

**Status code mix.** Healthy: mostly 200, some 301, a meaningful 304 share on stable pages. Flag: 5xx above 1% (Google reduces crawl rate on server errors), long redirect chains, 404s on URLs still linked internally, 200s on pages that should be 404 (soft 404). A near-zero 304 share on rarely changing pages means no `ETag`/`Last-Modified` support; Google supports both.

**Non-canonical and parameter URLs.** Share of Googlebot hits with a `query`, with tracking params, sort/filter facets, trailing-slash or case variants, or paths absent from the sitemap.

```sql
SELECT regexp_extract(query,'^([^=&]+)',1) param, count(*) hits
FROM bot_hits WHERE bot='googlebot' AND query IS NOT NULL
GROUP BY 1 ORDER BY hits DESC LIMIT 25;
```

**Orphans.** Sitemap URLs with zero bot hits in the window (anti-join sitemap against `bot_hits`). Also the reverse: crawled URLs missing from the sitemap. Split orphans by template and by `lastmod` age.

**Crawl waste.** Hits on: non-200 URLs, parameter URLs, URLs not in the sitemap, redirected URLs, and `noindex` pages (noindex still costs a request). Waste % = those hits / total bot hits.

**Time to first crawl.** For URLs with a known publish time (from the CMS, deploy log or sitemap first-seen date): `min(ts) - published_at` per URL, then p50/p90 per template. Rising p90 means discovery is the bottleneck (links, sitemap freshness), not rendering.

**Response time to Googlebot.** p50/p95 TTFB for Googlebot hits by template, compared to users. Slow Googlebot responses lower crawl capacity (hostload is shared by all Google crawlers). Check cache status: crawlers often miss ISR/CDN caches on long-tail pages.

**AI bot share.** Group verified AI hits by purpose: training (GPTBot, ClaudeBot, CCBot, meta-externalagent, Bytespider), search (OAI-SearchBot, Claude-SearchBot, PerplexityBot, meta-webindexer), user fetch (ChatGPT-User, Claude-User, Perplexity-User, Google-Agent, meta-externalfetcher). Report each as a share of total requests and of bytes. Search and user-fetch bots are the ones that can lead to citations; training bots give no referral. Note: user-fetch bots may ignore robots.txt, so a disallow does not stop them.

## 5. Findings to actions

| Finding | Action |
|---|---|
| Parameter or facet URLs take >10% of Googlebot hits | `robots.txt` Disallow for the pattern (for example `Disallow: /*?*sort=`). Do not rely on noindex or canonical to save crawl; they still get fetched |
| Removed or empty-combo pages still crawled with 200 | Return real 404/410 at that URL. In Next.js, check existence before any Suspense/`loading.tsx` or use `proxy.ts`, otherwise streaming sends 200 + noindex |
| Sitemap URLs never crawled | Add internal links from hubs and parents (see pseo-linking); confirm sitemap is reachable, valid and in robots.txt; check for noindex/canonical-away |
| Crawled URLs not in sitemap and not wanted | Block in robots.txt or 404; if wanted, add to sitemap |
| Slow time to first crawl | Link new pages from high-crawl pages on deploy; keep `lastmod` accurate (Google ignores inflated values and ignores priority/changefreq) |
| 5xx or slow Googlebot responses | Fix origin capacity or caching first; `Retry-After` on 503/429 is the documented emergency throttle |
| Redirect chains | Point links and sitemap directly at final URL |
| Fake Googlebot traffic | Block at WAF by failed verification; exclude from all metrics |
| AI training bots unwanted | robots.txt disallow per token (GPTBot, ClaudeBot, CCBot, meta-externalagent). Do not IP-block: bots then cannot read robots.txt |
| AI search bots blocked by mistake | Allow OAI-SearchBot, Claude-SearchBot, PerplexityBot if citation matters (see pseo-llm-visibility) |

Crawl-budget framing applies mainly to sites with 1M+ pages changing weekly, 10k+ changing daily, or many "Discovered - currently not indexed" URLs. Below that, fix errors and waste, but do not chase budget numbers.

## 6. Report format

1. Window, sources, hits, verified-bot share, fake-bot share.
2. Table: template, sitemap URLs, Googlebot hits, distinct URLs crawled, % of crawl, avg crawls per URL.
3. Status mix and top 10 non-200 URLs.
4. Waste breakdown with top patterns.
5. Orphan count by template.
6. TTFC and latency p50/p95 by template.
7. AI bot table by purpose.
8. Ranked actions, each with the evidence query and the expected metric to move.

Re-run after each change; allow days to weeks for Googlebot to shift (robots.txt is cached up to 24h; duplicate clusters can persist up to 2 weeks).

## Relationship to Other Skills

- **Feeds**: pseo-linking (orphans, depth), pseo-scale (crawl budget, CDN), pseo-llm-visibility (AI bot policy), pseo-quality-guard (thin or soft-404 pages that keep getting crawled).
- **Pairs with**: gsc (Search Console Crawl Stats and index coverage confirm what logs show), seo-regression-guard (post-deploy checks catch the status and robots regressions logs reveal later).
- **Not a replacement for**: pseo-audit (code readiness); logs only describe behavior.
