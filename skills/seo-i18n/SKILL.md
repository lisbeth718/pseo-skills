---
name: seo-i18n
description: Implement multilingual and multi-regional SEO for programmatic sites - URL structure, hreflang (HTML, header, sitemap), canonical interaction, localized metadata and slugs, and Next.js 16 [lang] routing. Use when adding languages or regions, fixing hreflang errors, deciding between ccTLD/subdomain/subdirectory, or translating pSEO pages at scale.
argument-hint: "[scope: all | structure | hreflang | routing | content | validate]"
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, WebFetch
---

# SEO Internationalization

Ship language and region versions that Google can discover, pair up and serve to the right users, without triggering duplicate or scaled-content problems.

## Scope parameter

| Value | Sections |
|---|---|
| `structure` | 1 |
| `hreflang` | 2, 3, 7 (hreflang metadata and sitemaps) |
| `routing` | 4, 7 (routing and `proxy.ts`) |
| `content` | 5, 6 |
| `validate` | 8 |
| `all` (default) | everything |

## Core Principles

1. **One URL per language/region version**: never switch language by cookie, IP or Accept-Language on the same URL (Googlebot crawls mostly from the US and sends no Accept-Language)
2. **Reciprocal hreflang**: every version lists itself and all others, or the tags are ignored
3. **Self-canonical per version**: each localized page canonicalizes to itself, never to the English page
4. **Real localization, not raw machine output**: translated pages must add value for that audience
5. **One language per page**: content and navigation in the same language

## 1. URL Structure

Source: [managing multi-regional sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).

| Option | Example | Use when |
|---|---|---|
| ccTLD | example.de | Strong country targeting, budget for separate infra and local presence |
| Subdomain | de.example.com | Separate servers needed; ambiguous language vs country |
| Subdirectory | example.com/de/ | Default for pSEO: one host, shared authority, lowest maintenance |
| Parameter | ?loc=de | Do not use |

Default to subdirectories with a language segment (`/fi/`, `/en/`) or language-region (`/en-gb/`) only when content genuinely differs by region (currency, law, shipping). Keep the structure identical across versions so mapping is mechanical.

## 2. hreflang Rules

Source: [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions).

- Pick ONE method: HTML `<link>`, HTTP `Link` header, or sitemap. Google treats them equally; mixing adds maintenance only. For large pSEO sites use sitemaps (smaller HTML, one place to generate).
- Fully qualified URLs with protocol.
- Every version includes itself plus every alternate. If A points to B and B does not point back, both are ignored.
- Codes: ISO 639-1 language, optional ISO 3166-1 alpha-2 region (`en-GB`). Region alone is invalid. `UK` is not `GB`; `es-419` is not recognized. Script codes allowed (`zh-Hant`).
- `x-default`: fallback for unmatched users, usually the language selector or the default-language page.
- Only link pages that are real equivalents. A missing translation means no tag and no URL, not a link to a different page.
- Alternates must be indexable, 200, and canonical to themselves. hreflang pointing at a redirect, noindex or non-canonical URL is dropped.

## 3. Canonical + hreflang

```
/en/pricing  canonical: /en/pricing   hreflang: en, fi, de, x-default
/fi/hinnasto canonical: /fi/hinnasto  hreflang: en, fi, de, x-default
```

- Canonical points to the same-language page. Canonicalizing /fi to /en tells Google to drop /fi and invalidates the hreflang pair.
- Localized pages are only treated as duplicates when the main content stays untranslated. Translate the body, not just the boilerplate.
- Same language, different region (en-US vs en-GB) with near-identical text is the real duplicate risk: differentiate (prices, spelling, units, local data) or ship one `en` version.

## 4. No Auto-Redirects

- Do not redirect by IP or Accept-Language. It blocks crawlers and users from other versions.
- Show a dismissible banner suggesting the better version, and link to all versions from the header or footer with plain `<a href>`.
- Remembering a user's explicit choice (cookie) is fine for UX, but must not change what a URL serves.
- Redirecting `/` to a default language is acceptable only if it is a fixed rule (same target for every request), and `/` then needs `x-default` handling. Prefer serving a selector or default content at `/`.

## 5. Translation Quality and Scaled Content Abuse

- Machine translation is not banned. Mass-producing pages with no added value is: auto-translated pages without human review or local value fall under [scaled content abuse](https://developers.google.com/search/docs/essentials/spam-policies#scaled-content).
- Per language, check: native-quality text, localized examples/units/currency, local data where it exists, reviewed by a speaker for top templates.
- Gate publishing: a locale ships a page only when its translation passes a quality check. Missing = 404 (or noindex), never a fallback to English text under a localized URL.
- Roll out by locale and measure indexing before adding the next. Thin locales hurt site-level quality.

## 6. Localize Everything on the Page

- Title, description, H1, body, alt text, breadcrumbs, nav, `<html lang>`.
- Slugs: translate when readable in the target language (`/fi/hinnasto`); keep a stable ID or key in the data layer so pairing does not depend on slug text. Use UTF-8 percent-encoded URLs consistently.
- Structured data: `inLanguage`, localized `name`/`description`, local currency in `priceCurrency`, localized `url`. Schema must match visible text (see pseo-schema).
- OG: `og:locale` and `og:locale:alternate`.
- Dates, numbers, currency via `Intl` with the page locale.

## 7. Next.js 16 Implementation

### Routing: `app/[lang]/...` + `proxy.ts`

```typescript
// proxy.ts (Next.js 16 replaces middleware.ts)
import { NextRequest, NextResponse } from "next/server";

const locales = ["en", "fi", "de"];
const defaultLocale = "en";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return;
  // Fixed rule, same target for every visitor: no IP / Accept-Language sniffing.
  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${defaultLocale}` : `/${defaultLocale}${pathname}`;
  return NextResponse.redirect(url, 308);
}

export const config = { matcher: ["/((?!_next|api|.*\\..*).*)"] };
```

```typescript
// app/[lang]/layout.tsx
export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "fi" }, { lang: "de" }];
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!locales.includes(lang)) notFound(); // import { notFound } from "next/navigation"
  return <html lang={lang}><body>{children}</body></html>;
}
```

Unknown `lang` values must hit `notFound()` before render (shown above).

### hreflang via metadata

```typescript
// app/[lang]/[slug]/page.tsx
export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params;
  const entry = await getEntry(lang, slug);           // stable key + per-locale slug
  if (!entry) return {};
  const versions = await getPublishedVersions(entry.key); // only locales that passed quality gate
  const languages: Record<string, string> = {};
  for (const v of versions) languages[v.lang] = `/${v.lang}/${v.slug}`;
  const d = versions.find(v => v.lang === defaultLocale);
  if (d) languages["x-default"] = `/${d.lang}/${d.slug}`; // only when a default version exists
  return {
    title: entry.title,
    alternates: { canonical: `/${lang}/${slug}`, languages },
  };
}
```

Caveat: in Next.js 16, hreflang from an async `generateMetadata` can stream into `<body>` instead of `<head>`. Make `generateMetadata` cached (`"use cache"`) or prefer sitemap hreflang; see pseo-metadata section 8a (htmlLimitedBots, which replaces the default bot list).

Set `metadataBase` so relative paths resolve to absolute URLs. Include the current page in `languages`. Omit `x-default` if no default version exists.

### hreflang in sitemaps

```typescript
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getAllPublishedEntries(); // grouped by stable key
  return entries.flatMap((group) =>
    group.versions.map((v) => ({
      url: `${BASE}/${v.lang}/${v.slug}`,
      lastModified: v.updatedAt,
      alternates: {
        languages: Object.fromEntries(group.versions.map((a) => [a.lang, `${BASE}/${a.lang}/${a.slug}`])),
      },
    }))
  );
}
```

Next emits the `xhtml:link` entries. Every URL repeats the full set. Past the sitemap limits, split and write the index per pseo-linking section 6, keeping each group's versions in the same file. With N alternates per URL the file can hit the 50MB limit before 50k URLs, so size chunks accordingly.

## 8. Validation Checklist

- [ ] Every localized URL returns 200 and is indexable
- [ ] Each version self-canonical and self-referencing in hreflang
- [ ] Every hreflang edge has a return edge
- [ ] Codes valid (no `UK`, no region-only, no `es-419`)
- [ ] `x-default` present when a default version exists, and itself reciprocal
- [ ] No hreflang target is redirected, noindexed or canonicalized elsewhere
- [ ] One hreflang method in use
- [ ] `<html lang>` matches content; body actually translated
- [ ] No IP/Accept-Language redirects; language switcher uses real links
- [ ] Sitemap contains all versions
- [ ] GSC: no "no return tags" or "invalid language" issues; indexing per locale checked

### Reciprocity script sketch

```typescript
// scripts/check-hreflang.mts - run: npx tsx scripts/check-hreflang.mts https://example.com/sitemap.xml
// setup: npm i -D fast-xml-parser
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
const arr = (x: any): any[] => (x == null ? [] : [].concat(x));

async function loadUrls(loc: string): Promise<any[]> {
  const doc = parser.parse(await (await fetch(loc)).text());
  if (doc.sitemapindex) {
    const nested = await Promise.all(arr(doc.sitemapindex.sitemap).map((m) => loadUrls(m.loc))); // recurse into index
    return nested.flat();
  }
  return arr(doc.urlset?.url);
}

async function main() {
  const urls: any[] = await loadUrls(process.argv[2]);
  const graph = new Map<string, Map<string, string>>(); // url -> (hreflang -> href)
  const headCache = new Map<string, number>(); // href -> HEAD status; each target is requested once

  for (const u of urls) {
    const links = arr(u["xhtml:link"]);
    graph.set(u.loc, new Map(links.map((l: any) => [l.hreflang, l.href])));
  }

  let errors = 0;
  for (const [url, alts] of graph) {
    if (![...alts.values()].includes(url)) { console.error(`NO SELF: ${url}`); errors++; }
    for (const [code, href] of alts) {
      if (/-uk$/i.test(code)) { console.error(`BAD REGION ${code} (use gb, not uk): ${url}`); errors++; continue; }
      if (!/^(x-default|[a-z]{2}(-[A-Za-z]{4})?(-[A-Za-z]{2})?)$/i.test(code)) { console.error(`BAD CODE ${code}: ${url}`); errors++; }
      const back = graph.get(href);
      if (!back) { console.error(`TARGET NOT IN SITEMAP: ${url} -> ${href}`); errors++; continue; }
      if (![...back.values()].includes(url)) { console.error(`NO RETURN: ${href} !-> ${url}`); errors++; }
      let status = headCache.get(href);
      if (status === undefined) { status = (await fetch(href, { method: "HEAD", redirect: "manual" })).status; headCache.set(href, status); }
      if (status !== 200) { console.error(`${status}: ${href}`); errors++; }
    }
  }
  process.exit(errors ? 1 : 0);
}
main();
```

Extend it to fetch each target and compare its `rel=canonical` to its own URL, and to reject `noindex`.

## Common Mistakes

- Canonical on all locales pointing to English
- hreflang to a URL that redirects or 404s
- Relative URLs or missing protocol
- Translating only nav/boilerplate while the body stays in the source language
- Locale folder present, translation missing, English text served at the localized URL
- Redirecting by Accept-Language, so Googlebot only ever sees one version

## Relationship to Other Skills

- **pseo-metadata**: canonical, titles and OG per locale; this skill adds `alternates.languages`
- **pseo-schema**: `inLanguage`, localized fields, currency
- **pseo-scale**: sitemap splitting and indexing rollout per locale
- **pseo-quality-guard**: thin and machine-translated content gating
- **pseo-linking**: language switcher and localized internal links stay within the same locale
- **seo-migration**: adding locale prefixes to existing URLs is a URL structure change, follow its redirect plan
