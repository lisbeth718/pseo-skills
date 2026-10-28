---
name: seo-regression-guard
description: Pre-deploy and post-deploy SEO regression checks for push-to-deploy sites, runnable locally or as a post-build step with no CI dependency. Use when shipping template, routing, metadata or robots changes, after a Next.js upgrade, or when asked to prevent SEO regressions, check a deploy, or diff SEO state against a baseline.
argument-hint: "[site URL | mode: baseline | check | local-build]"
allowed-tools: Read, Glob, Grep, Bash, WebFetch
---

# SEO Regression Guard

Catches the silent breakages that kill indexing: a template starts returning 200 for missing data, canonical moves out of `<head>`, a `noindex` leaks to production, robots.txt blocks the sitemap, titles collapse to one string. Samples URLs per template from the sitemap, checks them, and diffs against a saved baseline. Fails with exit code 1 on errors or regressions.

No GitHub Actions needed. Run it by hand, from a git hook, or as the last step of the deploy script. The bundled script is `scripts/seo-check.ts` (Node 20+, no dependencies, run with `npx tsx`).

## Scope parameter

| Value | Sections |
|---|---|
| site URL | Quick start (check that site) |
| `baseline` | Workflow step 1 (`--update-baseline`) |
| `check` | Quick start, What it checks, Report format |
| `local-build` | Quick start step 1 (local production build) |

## Quick start

Script location depends on how the skill is installed. Either use the installed path (`.claude/skills/seo-regression-guard/scripts/seo-check.ts`, below as `$SEO_CHECK`), or copy it to your project's `scripts/` and add `tsx` as a devDependency (`npm i -D tsx`), then run `npx tsx scripts/seo-check.ts`.

```bash
SEO_CHECK=.claude/skills/seo-regression-guard/scripts/seo-check.ts

# 1. Against a local production build (pre-deploy)
npm run build && (npm start & echo $! > .seo-server.pid)
until curl -sf localhost:3000 >/dev/null; do sleep 1; done
npx tsx $SEO_CHECK --site http://localhost:3000 --baseline .seo-baseline.json; code=$?
kill "$(cat .seo-server.pid)"; rm .seo-server.pid; exit $code

# 2. Against the live site after deploy
npx tsx $SEO_CHECK --site https://example.com --baseline .seo-baseline.json

# 3. Accept the current state as the new baseline (after an intended change)
npx tsx $SEO_CHECK --site https://example.com --update-baseline
```

(`npm start` may leave child processes; if the port stays busy, also run `pkill -f "next start"`.)

Flags: `--per-template 5` (URLs sampled per template), `--templates templates.json` (path regex per template name; default groups by first segment and depth with placeholders, e.g. `/jobs/*/*`, and single root-level slugs as `/*`), `--max-html-bytes 2000000`, `--min-text 500` (min visible text chars), `--min-links 3` (min internal links), `--json`.

Local builds: no need to rebuild with a localhost site URL. When `--site` differs from the origin in robots.txt `Sitemap:` lines, the script rewrites those sitemap URLs and every `<loc>` to the `--site` origin before fetching, downgrades `sitemap-host` to a warning, adds a `sitemap-origin` warning, and compares canonicals and hreflang self-references by path plus query instead of absolute URL. Baselines taken on another origin are compared the same way.

Commit `.seo-baseline.json` so regressions are visible in review. First run writes it if missing.

For a post-build step in `package.json`: `"postdeploy:seo": "tsx scripts/seo-check.ts --site $SITE_URL"`. Run it after the deploy is live; with powder/push-to-deploy, poll until the new build serves before running.

## What it checks

| Check | Error code | Rule |
|---|---|---|
| Sitemap valid | `sitemap-status`, `sitemap-empty`, `sitemap-size`, `sitemap-host` | 200, has URLs, at most 50,000 URLs and 50MB each (uncompressed), same host as the site. Follows sitemap indexes; `<loc>` is XML-decoded |
| `lastmod` accurate | `lastmod-invalid`, `lastmod-future`, `lastmod-uniform` | Parseable, not future, not one identical build timestamp (Google uses lastmod only when consistently verifiable; priority/changefreq are ignored) |
| robots.txt | `robots-status`, `robots-blocked`, `robots-no-sitemap` | 200 (4xx is a warning: crawlers treat it as allow-all; 5xx is an error); no sampled sitemap URL is blocked, using the `googlebot` group if present, else `*`, longest match wins and `Allow` wins ties; has `Sitemap:` line |
| Status | `status` | Every sampled sitemap URL returns 200 without redirect |
| Soft 404 | `soft-404` | A nonsense URL (last path segment of a sampled URL replaced) under each template must be 404/410, not 200. A 3xx is followed once: pass only if the target is 404/410, else warn `soft-404-redirect` |
| Indexability | `noindex`, `robots-not-in-head` | No `noindex` in `<meta name="robots">`, `<meta name="googlebot">` or `X-Robots-Tag` on a sampled URL. `robots-not-in-head` is a warning (Google still reads it) |
| Canonical | `canonical-missing`, `canonical-multiple`, `canonical-mismatch` | Exactly one `rel=canonical` in `<head>`, equal to the sitemap URL |
| Title / description | `title-missing`, `description-missing`, `title-duplicate`, `description-duplicate` | Present; not shared by more than 10% of the sample |
| hreflang | `hreflang-dupes`, `hreflang-relative`, `hreflang-self` | When present: fully qualified URLs, no duplicate codes, self-reference included |
| JSON-LD | `jsonld-invalid` | Every `application/ld+json` block parses. Does not validate schema types (use pseo-schema) |
| JS-rendering parity | `body-h1-missing` (error), `body-text-min` (warn), `internal-links-min` (warn) | Checked on raw server HTML, no JS executed: at least one `<h1>`; visible text (scripts, styles and tags stripped) of at least `--min-text` chars (default 500); at least `--min-links` internal `<a href>` (default 3). Catches client-rendered templates that look empty to crawlers that do not run JS |
| HTML size | `html-size` | Googlebot reads the first 2MB of HTML; error above the limit, warn above 75% |

Baseline snapshots are keyed by path plus query, so a baseline from production can be compared against localhost (a warning is raised when the origin differs). Every baseline URL is re-checked on each run in addition to the new sample; a baseline URL that is now non-200 is a regression.

Regression diff (vs baseline): sitemap URL count drops more than 10%, status 200 to non-200, canonical changed, became noindex, title or description lost, hreflang lost, JSON-LD block count dropped, HTML grew more than 50%.

## Why these checks, specifically

**Next.js soft 404.** Streaming responses start with status 200. `notFound()` called after streaming has begun (inside a Suspense boundary, behind `loading.tsx`) sends 200 plus an injected `<meta name="robots" content="noindex">`. Crawlers may label it a soft 404. The probe catches this. Fix: check data existence before anything streams (in the page's top-level async component before any Suspense, or in `proxy.ts` return 404), and, only when generateStaticParams returns every param, `ensureStatic = 'navigation'` (the only value that validates at build).

**Canonical must be in `<head>`.** Next.js can stream `generateMetadata` output into `<body>` for JS-capable bots. Google's canonical docs specify `<head>`, and there is no documented tolerance for a canonical in body (robots meta in body is respected, since 2026-03). The check reads `<head>` only, so a body canonical fails as `canonical-missing`. Fix with static or `use cache` metadata, or `htmlLimitedBots: /.*/` to force head placement. This is a recommended mitigation, not a Google statement.

**noindex in initial HTML.** Google may skip rendering a page with noindex in the original HTML, so removing it with JS is unreliable. Never ship noindex for a page you later want indexed.

**Canonical in HTML vs JS.** The original-HTML canonical must equal the JS canonical or be absent. The check sees original HTML only.

**`generateStaticParams` with Cache Components** must return at least one param; a placeholder plus `notFound()` is the documented workaround. That placeholder URL must 404, which the probe verifies.

**Sitemap `lastModified: new Date()`** (the official Next.js example) stamps the build time on every URL, so lastmod is unverifiable and ignored. Use the content's real modified date. `lastmod-uniform` flags this.

## Workflow

1. **Baseline** on a known-good production state: `--update-baseline`, commit the file.
2. **Pre-deploy**: build and run against localhost. Any error blocks the push.
3. **Post-deploy**: run against production. Non-zero exit means roll back or fix forward immediately; Google's crawl of a bad template can cause lasting damage within hours (canonical clusters can take up to 2 weeks to re-evaluate).
4. **After intended changes** (new template, retitle): review the regression list, confirm each line is intended, then `--update-baseline`.
5. **Add templates** by listing them in `templates.json` when URL structure is not first-segment based:

```json
{ "home": "^/$", "city": "^/city/", "compare": "^/compare/[^/]+-vs-" }
```

## Report format

```
SEO check https://example.com: 12840 sitemap URLs, 40 sampled across 8 templates
errors 2, warnings 1, regressions 3
  [error] city/soft-404 x1: nonexistent URL returns 200 (...)
  [error] compare/canonical-missing x5: canonical exists but not in <head> (...)
  [warn] blog/description-duplicate x1: ...
  [regression] https://example.com/city/oslo: status 200 -> 500
```

Errors are grouped by `template/code` with one example URL each; use `--json` for the full list. Report to the user: what failed, which template, the one-line cause, the fix. Do not paste the full URL list.

## Limits

- Samples, not a crawl. A bug affecting 1% of a template can slip through; raise `--per-template` for risky changes, and use seo-log-analysis for real crawl evidence.
- Parses HTML with regex, so unusual markup (attributes without quotes) may be missed. It checks head tags, not rendered DOM; JS-injected tags are not seen, which matches how Google reads the original HTML.
- Does not render JavaScript, measure Core Web Vitals, or validate structured-data eligibility. Use Search Console URL Inspection (2,000 QPD per site) for rendered checks on a handful of URLs.
- Fetches with its own user agent. If a WAF treats it as a bot, allowlist your own IP rather than spoofing Googlebot.
- Redirects are not followed on purpose: a sitemap URL that redirects is itself a finding.

## Relationship to Other Skills

- **Guards output of**: pseo-metadata (canonical, title, description), pseo-schema (JSON-LD parses), pseo-linking (sitemap, redirects), pseo-templates (soft 404, empty-data pages), pseo-performance (HTML size).
- **Extends**: pseo-quality-guard (content-level validation at build time) with deploy-level checks on the live HTML.
- **Pairs with**: seo-log-analysis (logs show what crawlers saw after a regression slipped through), gsc (index coverage after the fact).
- **Run**: before and after any deploy that touches routing, metadata, robots, sitemap, or the Next.js version.
