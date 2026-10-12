// Pull Search Analytics data. Writes ./data/gsc-queries.json in the current directory.
// Usage: npx tsx pull.ts --site sc-domain:example.com [--days 28]
//        [--queries 500] [--pages 200] [--top-pages 30]
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getSearchConsole, parseArgs, sleep } from './lib/auth.js';

const { flags } = parseArgs();
const site = flags.site as string;
if (!site) {
  console.error('Usage: npx tsx pull.ts --site sc-domain:example.com [--days 28]');
  process.exit(1);
}
const days = Number(flags.days || 28);
const maxQueries = Number(flags.queries || 500);
const maxPages = Number(flags.pages || 200);
const topPages = Number(flags['top-pages'] || 30);

const sc = getSearchConsole();
const PAGE_SIZE = 25000; // API max rowLimit

// Search Analytics data lags by about 2 days; end the range 2 days back.
const iso = (d: Date) => d.toISOString().slice(0, 10);
const end = new Date(Date.now() - 2 * 86400000);
const start = new Date(end.getTime() - (days - 1) * 86400000);

type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

async function query(dimensions: string[], limit: number, filters?: object[]): Promise<Row[]> {
  const rows: Row[] = [];
  let startRow = 0;
  while (rows.length < limit) {
    const rowLimit = Math.min(PAGE_SIZE, limit - rows.length);
    const res = await sc.searchanalytics.query({
      siteUrl: site,
      requestBody: {
        startDate: iso(start),
        endDate: iso(end),
        dimensions,
        rowLimit,
        startRow,
        ...(filters ? { dimensionFilterGroups: [{ filters }] } : {}),
      },
    });
    const batch = (res.data.rows || []) as Row[];
    rows.push(...batch);
    if (batch.length < rowLimit) break;
    startRow += batch.length;
    await sleep(200);
  }
  return rows;
}

const fmt = (r: Row) => ({
  keys: r.keys,
  clicks: r.clicks,
  impressions: r.impressions,
  ctr: Number((r.ctr * 100).toFixed(2)),
  position: Number(r.position.toFixed(1)),
});

async function main() {
  console.log(`Pulling ${site}, ${iso(start)} to ${iso(end)}`);
  const queries = await query(['query'], maxQueries);
  console.log(`queries: ${queries.length}`);
  const pages = await query(['page'], maxPages);
  console.log(`pages: ${pages.length}`);

  const pageQueries: Record<string, ReturnType<typeof fmt>[]> = {};
  for (const p of pages.slice(0, topPages)) {
    const url = p.keys[0];
    const rows = await query(['query'], 50, [
      { dimension: 'page', operator: 'equals', expression: url },
    ]);
    pageQueries[url] = rows.map(fmt);
    await sleep(200);
  }

  const out = {
    site,
    range: { start: iso(start), end: iso(end), days },
    pulledAt: new Date().toISOString(),
    queries: queries.map(fmt),
    pages: pages.map(fmt),
    pageQueries,
  };
  mkdirSync('data', { recursive: true });
  const file = join('data', 'gsc-queries.json');
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`Wrote ${file}`);
}

main().catch((e) => {
  console.error(e?.errors?.[0]?.message || e.message || e);
  console.error('Permission error? Try the other property form (sc-domain:example.com vs https://example.com/).');
  process.exit(1);
});
