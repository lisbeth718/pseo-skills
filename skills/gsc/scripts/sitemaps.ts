// Sitemap management.
// Usage: npx tsx sitemaps.ts list   --site sc-domain:example.com
//        npx tsx sitemaps.ts submit --site sc-domain:example.com --url https://example.com/sitemap.xml
//        npx tsx sitemaps.ts delete --site sc-domain:example.com --url https://example.com/old-sitemap.xml
// submit and delete need the full scope: run `npx tsx auth.ts --write` first.
import { getSearchConsole, hasWriteScope, parseArgs } from './lib/auth.js';

const { flags, rest } = parseArgs();
const action = rest[0];
const site = flags.site as string;
const url = flags.url as string;

if (!['list', 'submit', 'delete'].includes(action) || !site) {
  console.error('Usage: npx tsx sitemaps.ts <list|submit|delete> --site <property> [--url <sitemap url>]');
  process.exit(1);
}
if (action !== 'list') {
  if (!url) {
    console.error('--url is required for submit and delete');
    process.exit(1);
  }
  if (!hasWriteScope()) {
    console.error('Token lacks write scope. Run: npx tsx auth.ts --write');
    process.exit(1);
  }
}

const sc = getSearchConsole();

async function main() {
  if (action === 'list') {
    const res = await sc.sitemaps.list({ siteUrl: site });
    const items = res.data.sitemap || [];
    if (!items.length) console.log('No sitemaps registered.');
    for (const s of items) {
      const counts = (s.contents || []).map((c) => `${c.type}: ${c.submitted} submitted`).join(', ');
      console.log(`${s.path} | lastSubmitted ${s.lastSubmitted} | lastDownloaded ${s.lastDownloaded} | errors ${s.errors} | warnings ${s.warnings} | pending ${s.isPending} | ${counts}`);
    }
  } else if (action === 'submit') {
    await sc.sitemaps.submit({ siteUrl: site, feedpath: url });
    console.log(`Submitted ${url}`);
  } else {
    await sc.sitemaps.delete({ siteUrl: site, feedpath: url });
    console.log(`Deleted ${url}`);
  }
}

main().catch((e) => {
  console.error(e?.errors?.[0]?.message || e.message || e);
  process.exit(1);
});
