#!/usr/bin/env tsx
/**
 * SEO regression check. Node 20+, no dependencies.
 *   npx tsx seo-check.ts --site https://example.com [--per-template 5] [--baseline .seo-baseline.json]
 *        [--update-baseline] [--templates templates.json] [--max-html-bytes 2000000]
 *        [--min-text 500] [--min-links 3] [--json]
 * Exit code 1 on any error or regression vs baseline.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

type Sev = "error" | "warn";
type Issue = { url: string; template: string; sev: Sev; code: string; msg: string };
type Snap = { url: string; status: number; robots: string; xrobots: string; canonical: string; title: string; description: string; hreflang: number; jsonld: number; bytes: number };

const args = process.argv.slice(2);
const opt = (n: string, d?: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const flag = (n: string) => args.includes(`--${n}`);

const site = (opt("site") ?? "").replace(/\/$/, "");
if (!site) { console.error("--site required"); process.exit(2); }
const perTemplate = Number(opt("per-template", "5"));
const baselinePath = opt("baseline", ".seo-baseline.json")!;
const maxBytes = Number(opt("max-html-bytes", "2000000"));
const minText = Number(opt("min-text", "500"));
const minLinks = Number(opt("min-links", "3"));
const UA = "seo-regression-guard/1.0";
const origin = new URL(site).origin;

// Template = first segment + depth with placeholders (/jobs/*/*), single root-level slugs as /*, "home" for /.
// Or first matching regex from templates.json: {"city":"^/city/","home":"^/$"}
const tmplMap: Record<string, string> = opt("templates") ? JSON.parse(readFileSync(opt("templates")!, "utf8")) : {};
const templateOf = (u: string) => {
  const p = new URL(u).pathname;
  for (const [name, re] of Object.entries(tmplMap)) if (new RegExp(re).test(p)) return name;
  const segs = p.split("/").filter(Boolean);
  if (!segs.length) return "home";
  if (segs.length === 1) return "/*";
  return "/" + segs[0] + "/" + segs.slice(1).map(() => "*").join("/");
};
const keyOf = (u: string) => { const x = new URL(u); return x.pathname + x.search; };

// Local-build mode: robots.txt/sitemap list production URLs. Rewrite URLs on `from` origin to `to` origin.
const rewriteOrigin = (u: string, from: string, to: string) => {
  if (from === to) return u;
  try { const x = new URL(u); return x.origin === from ? to + x.pathname + x.search + x.hash : u; } catch { return u; }
};
let srcOrigin = origin; // origin the site itself advertises in robots.txt/sitemaps
const rw = (u: string) => rewriteOrigin(u, srcOrigin, origin);

const get = (url: string, init: RequestInit = {}) =>
  fetch(url, { redirect: "manual", headers: { "user-agent": UA }, ...init });

// ---- sitemap ----
type Entry = { loc: string; lastmod?: string };
const tags = (xml: string, tag: string) => [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"))].map((m) => m[1]);
const xmlDecode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, "&");
const val = (x: string, t: string) => { const v = x.match(new RegExp(`<${t}>\\s*([^<]*?)\\s*</${t}>`))?.[1]; return v === undefined ? v : xmlDecode(v); };

async function readSitemap(url: string, issues: Issue[], depth = 0): Promise<Entry[]> {
  const r = await get(url);
  if (r.status !== 200) { issues.push({ url, template: "sitemap", sev: "error", code: "sitemap-status", msg: `HTTP ${r.status}` }); return []; }
  const raw = Buffer.from(await r.arrayBuffer());
  if (raw.length > 50 * 1024 * 1024) issues.push({ url, template: "sitemap", sev: "error", code: "sitemap-size", msg: `${raw.length} bytes > 50MB uncompressed` });
  const xml = raw.toString("utf8");
  if (/<sitemapindex/.test(xml) && depth < 2) {
    const out: Entry[] = [];
    for (const s of tags(xml, "sitemap")) { const l = val(s, "loc"); if (l) out.push(...(await readSitemap(rw(l), issues, depth + 1))); }
    return out;
  }
  const entries = tags(xml, "url").map((u) => ({ loc: rw(val(u, "loc") ?? ""), lastmod: val(u, "lastmod") })).filter((e) => e.loc);
  if (!entries.length) issues.push({ url, template: "sitemap", sev: "error", code: "sitemap-empty", msg: "no <url> entries" });
  if (entries.length > 50000) issues.push({ url, template: "sitemap", sev: "error", code: "sitemap-size", msg: `${entries.length} URLs > 50000` });
  return entries;
}

// ---- html helpers ----
const head = (html: string) => html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? "";
const metaContent = (h: string, name: string) => {
  for (const m of h.matchAll(/<meta\s[^>]*>/gi)) {
    if (new RegExp(`name=["']${name}["']`, "i").test(m[0])) return m[0].match(/content=["']([^"']*)["']/i)?.[1] ?? "";
  }
  return "";
};
const ROBOT_NAMES = ["robots", "googlebot"];
const robotsMeta = (h: string) => ROBOT_NAMES.map((n) => metaContent(h, n)).filter(Boolean).join(", ");
const hasRobotsMeta = (h: string) => ROBOT_NAMES.some((n) => new RegExp(`<meta[^>]+name=["']${n}["']`, "i").test(h));

// ---- robots.txt ----
type Rule = { allow: boolean; pat: RegExp; len: number };
function robotsRules(txt: string): Rule[] {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let cur: { agents: string[]; rules: Rule[] } | null = null, lastWasAgent = false;
  for (const line of txt.split(/\r?\n/)) {
    const l = line.replace(/#.*/, "").trim();
    const i = l.indexOf(":");
    if (i < 0) continue;
    const k = l.slice(0, i).trim().toLowerCase(), v = l.slice(i + 1).trim();
    if (k === "user-agent") {
      if (!cur || !lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(v.toLowerCase()); lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && (k === "allow" || k === "disallow") && v)
        cur.rules.push({ allow: k === "allow", len: v.length, pat: new RegExp("^" + v.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$")) });
    }
  }
  const pick = (a: string) => groups.filter((g) => g.agents.includes(a));
  const g = pick("googlebot").length ? pick("googlebot") : pick("*");
  return g.flatMap((x) => x.rules);
}
// Longest match wins; Allow wins ties.
const blockedByRobots = (rules: Rule[], path: string) => {
  let best: Rule | undefined;
  for (const r of rules) if (r.pat.test(path) && (!best || r.len > best.len || (r.len === best.len && r.allow))) best = r;
  return !!best && !best.allow;
};
const linkHrefs = (h: string, rel: string) =>
  [...h.matchAll(/<link\s[^>]*>/gi)].filter((m) => new RegExp(`rel=["']${rel}["']`, "i").test(m[0]))
    .map((m) => ({ href: m[0].match(/href=["']([^"']*)["']/i)?.[1] ?? "", tag: m[0] }));
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').trim();

async function main() {
  const issues: Issue[] = [];
  const add = (url: string, sev: Sev, code: string, msg: string) => issues.push({ url, template: templateOf(url), sev, code, msg });

  // robots.txt: 4xx = allow-all (warn), 5xx = error
  const rr = await get(`${origin}/robots.txt`, { redirect: "follow" });
  const robotsTxt = rr.status === 200 ? await rr.text() : "";
  if (rr.status >= 500) add(`${origin}/robots.txt`, "error", "robots-status", `HTTP ${rr.status} (Google treats persistent 5xx as fully disallowed)`);
  else if (rr.status !== 200) add(`${origin}/robots.txt`, "warn", "robots-status", `HTTP ${rr.status} (crawlers treat as allow-all)`);
  const sitemapUrls = [...robotsTxt.matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  let smOrigin = origin; try { smOrigin = new URL(sitemapUrls[0], origin).origin } catch {}
  const mismatch = sitemapUrls.length > 0 && smOrigin !== origin;
  if (mismatch) {
    srcOrigin = smOrigin;
    add(origin, "warn", "sitemap-origin", `robots.txt/sitemap advertise ${srcOrigin}, checking ${origin}: sitemap URLs rewritten to ${origin}, canonicals compared by path`);
    for (let i = 0; i < sitemapUrls.length; i++) sitemapUrls[i] = rw(sitemapUrls[i]);
  }
  if (!sitemapUrls.length) { sitemapUrls.push(`${origin}/sitemap.xml`); add(`${origin}/robots.txt`, "warn", "robots-no-sitemap", "no Sitemap: line"); }
  const rules = robotsRules(robotsTxt);

  // sitemap
  const all: Entry[] = [];
  for (const s of sitemapUrls) all.push(...(await readSitemap(s, issues)));
  const seen = new Set<string>();
  const entries = all.filter((e) => !seen.has(e.loc) && seen.add(e.loc));
  if (all.length !== entries.length) add(sitemapUrls[0], "warn", "sitemap-dupes", `${all.length - entries.length} duplicate URLs`);
  const lastmods = entries.map((e) => e.lastmod).filter(Boolean) as string[];
  const bad = lastmods.filter((d) => Number.isNaN(Date.parse(d)));
  if (bad.length) add(sitemapUrls[0], "error", "lastmod-invalid", `${bad.length} unparsable lastmod, e.g. ${bad[0]}`);
  if (lastmods.length > 20 && new Set(lastmods.map((d) => d.slice(0, 16))).size <= 2)
    add(sitemapUrls[0], "warn", "lastmod-uniform", "lastmod identical across URLs (build-time new Date()?); Google ignores unverifiable lastmod");
  if (lastmods.some((d) => Date.parse(d) > Date.now() + 864e5)) add(sitemapUrls[0], "error", "lastmod-future", "lastmod in the future");
  if (entries.some((e) => !e.loc.startsWith(origin))) add(sitemapUrls[0], mismatch ? "warn" : "error", "sitemap-host", "sitemap lists URLs on another host/scheme");

  // sample per template (deterministic: evenly spaced)
  const byT = new Map<string, Entry[]>();
  for (const e of entries) { const t = templateOf(e.loc); (byT.get(t) ?? byT.set(t, []).get(t)!).push(e); }
  const sample: Entry[] = [];
  for (const list of byT.values()) {
    const step = Math.max(1, Math.floor(list.length / perTemplate));
    for (let i = 0; i < list.length && sample.length < 5000 && i / step < perTemplate; i += step) sample.push(list[i]);
  }

  // Re-check every baseline URL too (on the current origin), in addition to the new sample
  const sampled = new Set(sample.map((e) => keyOf(e.loc)));
  const extra: Entry[] = [];
  let baseOriginDiffers = false;
  let base: { site?: string; urlCount: number; snaps: Record<string, Snap> } | null = null;
  if (existsSync(baselinePath) && !flag("update-baseline")) {
    base = JSON.parse(readFileSync(baselinePath, "utf8"));
    if (base!.site && base!.site !== origin) baseOriginDiffers = true;
    if (baseOriginDiffers) add(origin, "warn", "baseline-origin", `baseline was taken on ${base!.site}, checking ${origin}; comparing by path`);
    for (const k of Object.keys(base!.snaps)) if (!sampled.has(k)) extra.push({ loc: origin + k });
  }

  const snaps: Record<string, Snap> = {};
  const titles = new Map<string, string[]>(), descs = new Map<string, string[]>();

  for (const e of [...sample, ...extra]) {
    const url = e.loc;
    const isExtra = extra.includes(e);
    const key = keyOf(url);
    let r: Response;
    try { r = await get(url, { headers: { "user-agent": UA, "accept-encoding": "gzip" } }); } catch (err) { add(url, "error", "fetch", String(err)); snaps[key] = { url, status: 0, robots: "", xrobots: "", canonical: "", title: "", description: "", hreflang: 0, jsonld: 0, bytes: 0 }; continue; }
    const xrobots = r.headers.get("x-robots-tag") ?? "";
    if (r.status !== 200) { if (!isExtra) add(url, "error", "status", `sitemap URL returned ${r.status}`); snaps[key] = { url, status: r.status, robots: "", xrobots, canonical: "", title: "", description: "", hreflang: 0, jsonld: 0, bytes: 0 }; continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    const html = buf.toString("utf8");
    const h = head(html);
    const robots = robotsMeta(h) || robotsMeta(html);
    const noindex = /noindex/i.test(robots + " " + xrobots);
    if (noindex) add(url, "error", "noindex", `sitemap URL is noindex (meta: "${robots}" header: "${xrobots}"). Next.js notFound() after streaming gives 200 + noindex = soft 404`);
    if (hasRobotsMeta(html) && !hasRobotsMeta(h)) add(url, "warn", "robots-not-in-head", "robots meta outside <head> (Google still reads it, but keep it in <head>)");
    if (buf.length > maxBytes) add(url, "error", "html-size", `${buf.length} bytes > ${maxBytes} (Googlebot reads the first 2MB)`);
    else if (buf.length > maxBytes * 0.75) add(url, "warn", "html-size", `${buf.length} bytes, over 75% of 2MB`);

    const canon = linkHrefs(h, "canonical");
    let canonical = "";
    if (canon.length === 0) add(url, "error", "canonical-missing", /rel=["']canonical["']/i.test(html) ? "canonical exists but not in <head> (streamed metadata?)" : "no canonical");
    else {
      if (canon.length > 1) add(url, "error", "canonical-multiple", `${canon.length} canonical tags`);
      canonical = new URL(decode(canon[0].href), url).href;
      const cmpC = mismatch ? keyOf(canonical) : canonical, cmpU = mismatch ? keyOf(url) : url;
      if (cmpC !== cmpU && cmpC.replace(/\/$/, "") !== cmpU.replace(/\/$/, "")) add(url, "error", "canonical-mismatch", `canonical ${canonical} != sitemap URL`);
    }

    const title = decode(h.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const description = decode(metaContent(h, "description"));
    if (!title) add(url, "error", "title-missing", "no <title>"); else (titles.get(title) ?? titles.set(title, []).get(title)!).push(url);
    if (!description) add(url, "warn", "description-missing", "no meta description"); else (descs.get(description) ?? descs.set(description, []).get(description)!).push(url);

    const alts = linkHrefs(h, "alternate").filter((l) => /hreflang=/i.test(l.tag));
    if (alts.length) {
      const langs = alts.map((a) => (a.tag.match(/hreflang=["']?([^"'\s>]*)/i)?.[1] ?? "").toLowerCase());
      if (new Set(langs).size !== langs.length) add(url, "error", "hreflang-dupes", "duplicate hreflang values");
      const hrefs = alts.map((a) => a.href);
      if (hrefs.some((x) => !/^https?:\/\//.test(x))) add(url, "error", "hreflang-relative", "hreflang href must be fully qualified");
      const norm = (x: string) => (mismatch ? keyOf(x) : x).replace(/\/$/, "");
      if (!hrefs.some((x) => norm(x) === norm(url))) add(url, "error", "hreflang-self", "no self-referencing hreflang");
    }

    // JS-rendering parity: raw server HTML must carry content without executing JS
    const body = html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html;
    if (!/<h1[\s>]/i.test(body)) add(url, "error", "body-h1-missing", "no <h1> in raw server HTML (rendered client-side only?)");
    const textLen = body.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim().length;
    if (textLen < minText) add(url, "warn", "body-text-min", `${textLen} chars of visible text in raw HTML (< ${minText}); content may depend on JS`);
    const internal = [...body.matchAll(/<a\s[^>]*href=["']([^"'#][^"']*)["']/gi)].filter((m) => {
      const hr = decode(m[1]);
      if (/^(mailto:|tel:|javascript:)/i.test(hr)) return false;
      try { const o = new URL(hr, url).origin; return o === origin || o === srcOrigin; } catch { return false; }
    }).length;
    if (internal < minLinks) add(url, "warn", "internal-links-min", `${internal} internal links in raw HTML (< ${minLinks})`);

    let ld = 0;
    for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try { JSON.parse(m[1]); ld++; } catch (err) { add(url, "error", "jsonld-invalid", String(err).slice(0, 120)); }
    }
    if (!isExtra && blockedByRobots(rules, key)) add(url, "error", "robots-blocked", "sitemap URL disallowed in robots.txt");

    snaps[key] = { url, status: 200, robots, xrobots, canonical, title, description, hreflang: alts.length, jsonld: ld, bytes: buf.length };
  }

  for (const [t, urls] of titles) if (urls.length > 1 && urls.length / sample.length > 0.1) add(urls[0], "warn", "title-duplicate", `"${t.slice(0, 60)}" on ${urls.length} sampled URLs`);
  for (const [d, urls] of descs) if (urls.length > 1 && urls.length / sample.length > 0.1) add(urls[0], "warn", "description-duplicate", `"${d.slice(0, 60)}" on ${urls.length} sampled URLs`);

  // Soft-404 probe: replace the last path segment of a sampled URL per template with a nonsense slug
  const id = Date.now().toString(36);
  for (const [t, list] of byT) {
    if (t === "home") continue;
    const u = new URL(list[0].loc);
    u.pathname = u.pathname.replace(/[^/]+\/?$/, "zz-seo-guard-" + id);
    const probe = u.href;
    let r: Response;
    try { r = await get(probe); } catch (err) { add(probe, "warn", "probe-status", String(err)); continue; }
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get("location");
      try { r = await get(new URL(loc ?? "", probe).href); } catch (err) { add(probe, "warn", "soft-404-redirect", `redirect target failed: ${err}`); continue; }
      if (![404, 410].includes(r.status)) add(probe, "warn", "soft-404-redirect", `nonexistent URL redirects to ${loc} which returns ${r.status}, not 404/410`);
    } else if (r.status === 200) add(probe, "error", "soft-404", "nonexistent URL returns 200 (Next.js: notFound() after streaming starts keeps 200 + noindex; check existence before Suspense/loading.tsx or in proxy.ts)");
    else if (![404, 410].includes(r.status)) add(probe, "warn", "probe-status", `nonexistent URL returned ${r.status}`);
  }

  // ---- baseline diff ----
  const regressions: string[] = [];
  if (base) {
    if (entries.length < base.urlCount * 0.9) regressions.push(`sitemap shrank ${base.urlCount} -> ${entries.length}`);
    for (const [u, b] of Object.entries(base.snaps)) {
      const n = snaps[u];
      if (!n) continue; // unreachable: every baseline URL is re-checked
      if (b.status === 200 && n.status !== 200) regressions.push(`${u}: status 200 -> ${n.status}`);
      const sameCanon = baseOriginDiffers ? (n.canonical && keyOf(n.canonical)) === keyOf(b.canonical || "http://x/") : n.canonical === b.canonical;
      if (b.canonical && !sameCanon) regressions.push(`${u}: canonical changed ${b.canonical} -> ${n.canonical || "(none)"}`);
      if (!/noindex/i.test(b.robots + b.xrobots) && /noindex/i.test(n.robots + n.xrobots)) regressions.push(`${u}: became noindex`);
      if (b.title && !n.title) regressions.push(`${u}: title lost`);
      if (b.description && !n.description) regressions.push(`${u}: description lost`);
      if (b.hreflang > 0 && n.hreflang === 0) regressions.push(`${u}: hreflang lost`);
      if (b.jsonld > 0 && n.jsonld < b.jsonld) regressions.push(`${u}: JSON-LD blocks ${b.jsonld} -> ${n.jsonld}`);
      if (b.bytes > 0 && n.bytes > b.bytes * 1.5) regressions.push(`${u}: HTML grew ${b.bytes} -> ${n.bytes} bytes`);
    }
  }
  if (flag("update-baseline") || !existsSync(baselinePath)) {
    writeFileSync(baselinePath, JSON.stringify({ site: origin, date: new Date().toISOString(), urlCount: entries.length, snaps }, null, 1));
    console.log(`baseline written: ${baselinePath}`);
  }

  // ---- report ----
  const errors = issues.filter((i) => i.sev === "error"), warns = issues.filter((i) => i.sev === "warn");
  if (flag("json")) console.log(JSON.stringify({ issues, regressions }, null, 1));
  else {
    console.log(`SEO check ${origin}: ${entries.length} sitemap URLs, ${sample.length} sampled across ${byT.size} templates`);
    console.log(`errors ${errors.length}, warnings ${warns.length}, regressions ${regressions.length}`);
    const group = (list: Issue[]) => {
      const m = new Map<string, Issue[]>();
      for (const i of list) (m.get(`${i.template}/${i.code}`) ?? m.set(`${i.template}/${i.code}`, []).get(`${i.template}/${i.code}`)!).push(i);
      for (const [k, v] of m) console.log(`  [${v[0].sev}] ${k} x${v.length}: ${v[0].msg} (${v[0].url})`);
    };
    group(errors); group(warns);
    for (const r of regressions.slice(0, 30)) console.log(`  [regression] ${r}`);
    if (regressions.length > 30) console.log(`  ...and ${regressions.length - 30} more`);
  }
  process.exit(errors.length || regressions.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
