---
name: seo-content-refresh
description: Data-driven content decay and pruning workflow. Use when the user wants to find pages losing traffic, decide what to refresh, consolidate, noindex or remove, clean up never-indexed or zero-impression pages, fix cannibalization, or correlate a traffic drop with a Google update. Works at page level for editorial content and at template/segment level for pSEO.
argument-hint: "[action: classify | decide | plan-redirects] [--site domain] [--window 90]"
allowed-tools: Read, Bash, Glob, Grep, Write, WebSearch
---

# SEO Content Refresh and Pruning

## Scope parameter

The `argument-hint` action values map to sections:
- `classify`: Inputs, Classes, Classifier sketch
- `decide`: Decision table, Action detail, Seasonality and update correlation, pSEO: act on segments
- `plan-redirects`: the Consolidate + 301 item in Action detail, and Safety rules

Classify every indexed page by its performance trend, then pick one action per class. Decide from data, not from page age.

## Inputs

1. **GSC export, two periods**: two `pull.ts` runs from `gsc`, one per period, each with full page coverage. Use last 90d vs previous 90d, or last 90d vs the same 90d a year ago when seasonality matters. GSC keeps 16 months of data, so pull and archive monthly.

   `<gsc-skill-dir>` is the `gsc` skill folder (e.g. `.claude/skills/gsc`); run `npm --prefix <gsc-skill-dir>/scripts install` once first.

   ```bash
   <gsc-skill-dir>/scripts/node_modules/.bin/tsx <gsc-skill-dir>/scripts/pull.ts --site sc-domain:example.com --start 2026-07-01 --end 2026-09-28 --pages 1000000 --out data/gsc-current.json
   <gsc-skill-dir>/scripts/node_modules/.bin/tsx <gsc-skill-dir>/scripts/pull.ts --site sc-domain:example.com --start 2026-04-02 --end 2026-06-30 --pages 1000000 --out data/gsc-previous.json
   ```

   The Search Analytics API returns at most 50K rows per day per search type (sorted by clicks), so on big sites a page-level pull can miss low-impression URLs. For large sites use the Search Console bulk data export to BigQuery instead (see `gsc`, action `bulk-export`): it holds every page with impressions, and template-level aggregation is one SQL query.

   Cannibalization needs query+page rows: add `--dims query,page` to a run and read the `queryPages` array.
2. **Page inventory**: URL, template/segment, publish date, real last content change (from git or CMS, not the sitemap), canonical, indexability.
3. **Optional analytics**: conversions or engagement per URL. A page with few clicks but real conversions is not prunable.

## Classes

| Class | Definition (heuristics, tune per site) |
|---|---|
| growing | clicks up more than 20% vs prior period, min 30 clicks in either |
| stable | clicks within -20% to +20% |
| decaying | clicks down more than 30% and at least 30 clicks lost, or impressions down more than 40% |
| never-performed | indexable, older than 6 months, under 10 impressions in the whole window |
| cannibalizing | 2+ URLs each get at least 10 impressions for the same query and no URL holds a clear lead (heuristic: top URL under 70% of the query's impressions) |
| low-volume | under 30 clicks in both periods: too noisy to classify, leave alone |
| lost (check indexing) | had at least 30 clicks in the previous period and is missing from the current export (no impressions at all) |

All numbers above are heuristics, not Google rules. Scale them to site size: a site with 500 clicks a month needs lower floors than one with 500k.

## Decision table

| Class | First check | Action |
|---|---|---|
| growing | none | Leave alone. Add internal links to it from related pages. |
| stable | none | Leave alone. |
| decaying | Seasonality? Update date overlap? Position drop or CTR drop? | Position drop: refresh content. CTR drop with stable position: rewrite title/description, check for new SERP features or AI Overviews. Impressions drop only: demand fell, do nothing. |
| never-performed | Is it indexed? Does it have internal links? Is the query demand real? | Not indexed: see "Discovered/Crawled - not indexed" below. Indexed and orphaned: add internal links, wait one more window. Still nothing and no unique value: consolidate (301) or remove. |
| lost (check indexing) | URL Inspection: noindex, canonical change, redirect, 404, or removed from sitemap? | Fix the cause (unintended noindex/canonical/redirect). If removal was intended, confirm a 301 to the closest match is in place. |
| cannibalizing | Do the pages serve the same intent? | Same intent: merge into the strongest URL, 301 the rest. Different intents: differentiate titles/H1s and internal anchors. |

### Action detail

- **Refresh**: change what makes the page wrong or thin. Update facts, figures, screenshots, examples, sources, and add what top results now cover that you lack. A new date on unchanged text is not a refresh. Do not fake `dateModified` or sitemap `lastmod`; set them only when the content meaningfully changed (Google's sitemap docs say it uses `lastmod` only when it is consistently accurate, and a site that lies loses the signal).
- **Consolidate + 301**: move the useful content into the winner, then 301 each loser to it (one hop, to the closest equivalent, not the homepage). Update internal links to point at the final URL. Keep the redirects for at least a year.
- **noindex**: use for pages users still need but search does not (filtered views, thin utility pages). Remove them from the sitemap, and do not also block them in robots.txt: Google must crawl the page to see the tag.
- **410/404**: use for pages with no replacement, no backlinks and no traffic. 410 and 404 are both treated as gone; 410 is a clear signal and tends to drop out slightly faster. Never return 200 with an empty "not found" page (soft 404).
- **Improve internal links**: for orphaned or low-link pages, add contextual links from relevant high-traffic pages and the parent hub. See `pseo-linking`.
- **Leave alone**: the default. Stable pages that rank do not need touching.

## Never-performed pages: check indexing first

Zero impressions has two causes. Check URL Inspection (or the Page indexing report) before deciding:

- **Not indexed** ("Crawled - currently not indexed", "Discovered - currently not indexed"): a quality or crawl-priority problem. Improve uniqueness and internal links, or cut. Do not resubmit unchanged pages.
- **Indexed, no impressions**: no demand, or ranking too low to show. Check the target query exists (GSC query data, keyword tool) before judging.

## Seasonality and update correlation

Before calling anything "decaying":

1. Compare YoY, or check the same weeks last year. A Christmas page down 60% in February is not decaying.
2. Overlay the drop onto update windows. A drop that starts inside a rollout window and hits a whole template or section points at a ranking change, not a single bad page. Google says rollouts can take up to 2-3 weeks, so allow the full window.
3. Wait for the rollout to end before acting. Google's guidance is to assess after completion, and it ships smaller unannounced core updates continuously, so recovery does not need a named update.

Known windows (source: [research doc](https://github.com/lisbeth718/pseo-skills/blob/main/docs/research-2026-10.md), from the Search Status Dashboard):

| Update | Start | End |
|---|---|---|
| March 2025 core | 2025-03-13 | 2025-03-27 |
| June 2025 core | 2025-06-30 | 2025-07-17 |
| August 2025 spam | 2025-08-26 | 2025-09-22 |
| December 2025 core | 2025-12-11 | 2025-12-29 |
| March 2026 spam | 2026-03-24 | 2026-03-25 |
| March 2026 core | 2026-03-27 | 2026-04-08 |
| May 2026 core | 2026-05-21 | 2026-06-02 |
| June 2026 spam | 2026-06-24 | 2026-06-26 |
| August 2026 spam | 2026-08-18 | 2026-08-21 |
| September 2026 spam | 2026-09-24 | 2026-10-08 |

Re-check the dashboard (status.search.google.com) for anything newer. Google publishes no per-spam-update target, so a spam-update drop on templated pages is evidence for a scaled content problem, not proof.

## pSEO: act on segments, not pages

For programmatic pages, aggregate the classes by template and segment (e.g. `/jobs/[city]/[role]`, by city tier or by data source) before deciding anything.

- If a whole template is decaying or never-performed, the cause is the template or data, not 4,000 individual pages. Fix the template (more unique data per page, better intent match), then re-measure.
- If 80%+ of a segment never performs, cut the segment: noindex or 410 the long tail, keep the segment pages that earn impressions, and stop generating combinations without demand.
- Never refresh pSEO pages by swapping the date or a few tokens. That adds to the scaled-content risk (see `pseo-quality-guard`).
- Pages that exist only to cover "every variation" of a query are what Google's doorway and scaled-content policies describe. Prune those first.
- Prune in waves by segment (e.g. 10% of the segment's pages), then wait one full window and re-measure.

## Classifier sketch

Reads the `pages` array of two `pull.ts` exports (`--pages 1000000` for the fullest page coverage; on big sites a missing page can be an API row-cap gap, so confirm with BigQuery or URL Inspection), plus an optional inventory file, and writes `data/content-classes.csv`. Run from the project root with `npx tsx classify.ts data/gsc-current.json data/gsc-previous.json [data/inventory.json]`.

```ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

type Row = { page: string; clicks: number; impressions: number; position: number };
type Inv = { page: string; ageDays: number; segment: string; indexable: boolean };

const load = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8"));
const loadPull = (p: string): Row[] =>
  load<{ pages: { keys: string[]; clicks: number; impressions: number; position: number }[] }>(p).pages.map(
    (r) => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: r.position }),
  );

const [curPath, prevPath, invPath] = process.argv.slice(2);
if (!curPath || !prevPath) throw new Error("Usage: classify.ts <current.json> <previous.json> [inventory.json]");
const cur = new Map(loadPull(curPath).map((r) => [r.page, r]));
const prev = new Map(loadPull(prevPath).map((r) => [r.page, r]));
const invRows: Inv[] = invPath ? load<Inv[]>(invPath) : [];
const inv = new Map(invRows.map((r) => [r.page, r]));

// Heuristics: tune per site.
const T = { growPct: 0.2, dropPct: 0.3, minClicksLost: 30, imprDropPct: 0.4, minClicks: 30, neverImpr: 10, neverAgeDays: 180 };

type Class = "growing" | "stable" | "decaying" | "never-performed" | "low-volume" | "lost (check indexing)";

function classify(page: string): { cls: Class; action: string } {
  const c = cur.get(page) ?? { page, clicks: 0, impressions: 0, position: 0 };
  const p = prev.get(page) ?? { page, clicks: 0, impressions: 0, position: 0 };
  const meta = inv.get(page);

  // Had real clicks before, absent from the current export: de-indexed, redirected, removed or de-ranked.
  if (!cur.has(page) && p.clicks >= T.minClicks)
    return { cls: "lost (check indexing)", action: "inspect URL: indexing, canonical, redirect, status code" };

  if (meta?.indexable && meta.ageDays > T.neverAgeDays && c.impressions + p.impressions < T.neverImpr)
    return { cls: "never-performed", action: "check indexing, add internal links, then consolidate or remove" };

  if (Math.max(c.clicks, p.clicks) < T.minClicks) return { cls: "low-volume", action: "leave alone" };

  const clickChange = p.clicks ? (c.clicks - p.clicks) / p.clicks : 1;
  const imprChange = p.impressions ? (c.impressions - p.impressions) / p.impressions : 1;

  if ((clickChange < -T.dropPct && p.clicks - c.clicks >= T.minClicksLost) || imprChange < -T.imprDropPct) {
    const posDrop = c.position - p.position > 1.5;
    const action = posDrop ? "refresh content" : imprChange < -T.imprDropPct ? "demand fell: check seasonality" : "rewrite title/description";
    return { cls: "decaying", action };
  }
  if (clickChange > T.growPct) return { cls: "growing", action: "leave alone, add internal links" };
  return { cls: "stable", action: "leave alone" };
}

const pages = new Set([...cur.keys(), ...prev.keys(), ...inv.keys()]);
const lines = ["page,segment,class,action,clicks_prev,clicks_cur,impr_prev,impr_cur"];
for (const page of pages) {
  const { cls, action } = classify(page);
  const c = cur.get(page), p = prev.get(page);
  lines.push([page, inv.get(page)?.segment ?? "", cls, action, p?.clicks ?? 0, c?.clicks ?? 0, p?.impressions ?? 0, c?.impressions ?? 0]
    .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
}
mkdirSync("data", { recursive: true });
writeFileSync("data/content-classes.csv", lines.join("\n"));
```

Cannibalization uses the `queryPages` rows (`keys` = `[query, page]`) from a `--dims query,page` pull: group by query, flag queries where 2+ pages each pass the impression floor and the top page holds under 70% of impressions, then add a `cannibalizing` row per loser page. Then group the CSV by `segment` and `class` for the pSEO view.

## Safety rules

- Never bulk-delete, bulk-noindex or bulk-redirect without (1) a redirect map covering every URL removed, (2) a manual review of a random sample (at least 20 pages or 5%, whichever is larger) from each class, and (3) a backup or git commit of the content.
- Check backlinks and conversions before removing a URL. A page with external links gets a 301 to the closest match, not a 410.
- Prune in waves and re-measure for one full window between waves. Changes need weeks to show up in GSC.
- Do not change more than one thing per page group at a time, or the result cannot be attributed.
- Remove pruned URLs from the sitemap and from internal links in the same release.
- Log every action (URL, class, action, date) so a bad call can be reverted.

## Relationship to other skills

- **Input from**: `gsc` (performance data, indexing status, cannibalization and prune checks).
- **Uses rules from**: `pseo-quality-guard` (thin content, scaled-content risk, what counts as a real refresh).
- **Feeds**: `pseo-linking` (internal link fixes for orphaned pages), `pseo-templates` and `pseo-data` (template and data fixes for decaying segments), `pseo-metadata` (title/description rewrites for CTR drops).
- **Run**: monthly for growth sites, quarterly for stable ones, and after every core or spam update has finished rolling out.
