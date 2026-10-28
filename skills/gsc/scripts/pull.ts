// Pull Search Analytics data. Writes ./data/gsc-queries.json in the current directory.
// Usage: npx tsx pull.ts --site sc-domain:example.com [--days 28]
//        [--start YYYY-MM-DD --end YYYY-MM-DD]   (override --days)
//        [--queries 500] [--pages 200] [--top-pages 30]
//        [--out data/gsc-queries.json] [--dims query,page]
// --pages 1000000 pulls every page the API exposes (max ~50K rows/day/search type; use bulk export for big sites). --dims query,page adds a full query+page
// dataset (paginated, 25,000 rows per request) as `queryPages`.
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { getSearchConsole, parseArgs, sleep } from './lib/auth.js';

const { flags } = parseArgs();
const site = flags.site as string;
if (!site) {
  console.error('Usage: npx tsx pull.ts --site sc-domain:example.com [--days 28]');
  process.exit(1);
}
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
for (const k of ['start', 'end']) {
  if (flags[k] !== undefined && !dateRe.test(String(flags[k]))) {
    console.error(`--${k} must be YYYY-MM-DD`);
    process.exit(1);
  }
}
if (flags.dims !== undefined && flags.dims !== 'query,page') {
  console.error('--dims only supports "query,page"');
  process.exit(1);
}
if (flags.out !== undefined && typeof flags.out !== 'string') {
  console.error('--out needs a path');
  process.exit(1);
}
const daysFlag = Number(flags.days || 28);
const outPath = (flags.out as string) || join('data', 'gsc-queries.json');
const withQueryPages = flags.dims === 'query,page';
const maxQueries = Number(flags.queries || 500);
const maxPages = Number(flags.pages || 200);
const topPages = Number(flags['top-pages'] || 30);

const sc = getSearchConsole();
const PAGE_SIZE = 25000; // API max rowLimit

// Search Analytics data lags by about 2 days; end the range 2 days back.
const iso = (d: Date) => d.toISOString().slice(0, 10);
const end = flags.end ? new Date(`${flags.end}T00:00:00Z`) : new Date(Date.now() - 2 * 86400000);
const start = flags.start
  ? new Date(`${flags.start}T00:00:00Z`)
  : new Date(end.getTime() - (daysFlag - 1) * 86400000);
if (start > end) {
  console.error('--start must not be after --end');
  process.exit(1);
}
const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

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

  let queryPages: ReturnType<typeof fmt>[] | undefined;
  if (withQueryPages) {
    const qp = await query(['query', 'page'], Infinity);
    queryPages = qp.map(fmt);
    console.log(`queryPages: ${queryPages.length}`);
  }

  const out = {
    site,
    range: { start: iso(start), end: iso(end), days },
    pulledAt: new Date().toISOString(),
    queries: queries.map(fmt),
    pages: pages.map(fmt),
    pageQueries,
    ...(queryPages ? { queryPages } : {}),
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e?.errors?.[0]?.message || e.message || e);
  console.error('Permission error? Try the other property form (sc-domain:example.com vs https://example.com/).');
  process.exit(1);
});
