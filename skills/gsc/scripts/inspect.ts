// URL Inspection API for a list of URLs.
// Usage: npx tsx inspect.ts --site sc-domain:example.com --urls https://example.com/a,https://example.com/b
//        npx tsx inspect.ts --site sc-domain:example.com --file urls.txt [--delay 700] [--out data/gsc-inspect.json]
// Quota: 2,000 inspections/day and 600/min per site property. Default delay keeps you under 600/min.
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { getSearchConsole, parseArgs, sleep } from './lib/auth.js';

const { flags } = parseArgs();
const site = flags.site as string;
if (!site || (!flags.urls && !flags.file)) {
  console.error('Usage: npx tsx inspect.ts --site <property> (--urls a,b | --file urls.txt) [--delay ms] [--out path]');
  process.exit(1);
}
const urls: string[] = flags.file
  ? readFileSync(flags.file as string, 'utf-8').split('\n').map((s) => s.trim()).filter(Boolean)
  : String(flags.urls).split(',').map((s) => s.trim()).filter(Boolean);
const delay = Number(flags.delay || 700);
const outPath = (flags.out as string) || 'data/gsc-inspect.json';

if (urls.length > 2000) {
  console.error(`${urls.length} URLs exceeds the 2,000/day per-site quota. Trim the list.`);
  process.exit(1);
}

const sc = getSearchConsole();

async function main() {
  const results: Record<string, unknown>[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const res = await sc.urlInspection.index.inspect({
        requestBody: { inspectionUrl: url, siteUrl: site },
      });
      const r = res.data.inspectionResult?.indexStatusResult;
      results.push({
        url,
        verdict: r?.verdict,
        coverageState: r?.coverageState,
        lastCrawlTime: r?.lastCrawlTime,
        pageFetchState: r?.pageFetchState,
        indexingState: r?.indexingState,
        robotsTxtState: r?.robotsTxtState,
        googleCanonical: r?.googleCanonical,
        userCanonical: r?.userCanonical,
      });
      console.log(`[${i + 1}/${urls.length}] ${r?.verdict} | ${r?.coverageState} | ${url}`);
    } catch (e: any) {
      const status = e?.code || e?.response?.status;
      console.error(`[${i + 1}/${urls.length}] error ${status} for ${url}: ${e.message}`);
      results.push({ url, error: e.message });
      if (status === 429) {
        console.error('Quota hit. Stopping; partial results saved.');
        break;
      }
    }
    await sleep(delay);
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Wrote ${outPath}`);
}

main();
