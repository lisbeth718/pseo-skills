---
name: gsc
description: Pull and analyze Google Search Console data for any site. Use when the user wants to check search performance, find indexing issues, analyze queries/pages/clicks, or audit their Google visibility. Handles OAuth setup, data pulling, URL inspection, and sitemap management.
argument-hint: "[action: pull | inspect | audit | setup] [--site domain] [--days N]"
allowed-tools: Read, Bash, Glob, Grep, Write, Agent, WebSearch
---

# Google Search Console

Pull, analyze, and act on Google Search Console data for any site.

## Prerequisites

GSC access uses OAuth2 tokens stored at:
- **OAuth client:** `~/.config/gsc-oauth-client.json`
- **OAuth tokens:** `~/.config/gsc-oauth-tokens.json`
- **Scripts directory:** `~/Development/scripts/` (contains `googleapis` npm package)

If tokens don't exist, guide the user through setup (see Setup section below).

## Determine the site property

The GSC site property is usually one of:
- `sc-domain:example.com` (domain property, covers all subdomains)
- `https://example.com` (URL prefix property)

Try domain property first (`sc-domain:` prefix). If it fails with permission error, try the URL prefix version.

## Actions

### pull (default)

Pull search analytics data. Default 28 days, configurable with `--days`.

```bash
cd ~/Development/scripts && npx tsx pull-gsc.ts --site sc-domain:DOMAIN --days DAYS
```

This outputs to `./data/gsc-queries.json` in the **current working directory** (the project, not the scripts dir). The script fetches:
- Top 500 queries with clicks, impressions, CTR, position
- Top 200 pages with the same metrics
- Per-page query breakdown for top 30 pages

After pulling, read `data/gsc-queries.json` and analyze:

1. **Quick wins** — queries ranking position 5-20 with decent impressions but low CTR. These pages need better titles/descriptions.
2. **Zero-click high-impression** — queries with 0 clicks but 20+ impressions. Content exists but isn't compelling enough to click.
3. **Top pages** — which pages drive the most traffic? Are the right pages ranking?
4. **Missing pages** — compare GSC pages against the sitemap. Which sitemap URLs have zero impressions?

### inspect

Deep inspection of specific URLs. Write and run a script using the URL Inspection API:

```typescript
import { google } from 'googleapis';
// ... auth setup ...
const sc = google.searchconsole({ version: 'v1', auth: oauth2Client });

const result = await sc.urlInspection.index.inspect({
  requestBody: { inspectionUrl: URL, siteUrl: SITE }
});

// Key fields:
// result.data.inspectionResult.indexStatusResult.verdict — PASS, NEUTRAL, FAIL
// result.data.inspectionResult.indexStatusResult.coverageState — "Submitted and indexed", "URL is unknown to Google", etc.
// result.data.inspectionResult.indexStatusResult.lastCrawlTime
// result.data.inspectionResult.indexStatusResult.pageFetchState
```

Common coverage states and what they mean:
- **"Submitted and indexed"** — Good, page is in Google's index
- **"URL is unknown to Google"** — Google has never seen this URL. Check sitemap submission and internal linking.
- **"Crawled - currently not indexed"** — Google found it but chose not to index. Usually thin content or duplicate.
- **"Duplicate without user-selected canonical"** — Missing canonical tag, Google picked its own canonical.
- **"Duplicate, submitted URL not selected as canonical"** — Your canonical points elsewhere or Google disagrees with it.

### audit

Full GSC audit. Combines pull + inspect on key pages. Steps:

1. Pull 90-day data
2. Check which sitemaps are registered (`sc.sitemaps.list`)
3. Inspect 10-15 representative URLs (homepage, key landing pages, pSEO samples)
4. Report: indexed vs not indexed, crawl issues, sitemap problems, quick wins

### setup

If OAuth tokens don't exist, guide setup:

1. **Google Cloud Console** — User needs an OAuth 2.0 Client ID (Desktop app type)
   - Go to console.cloud.google.com > APIs & Services > Credentials
   - Enable the "Google Search Console API"
   - Create OAuth 2.0 Client ID, type: Desktop
   - Save the JSON to `~/.config/gsc-oauth-client.json`

2. **Run auth script** — This opens a browser for OAuth consent:
   ```bash
   cd ~/Development/scripts && npx tsx gsc-auth.ts
   ```
   The script listens on `localhost:3456` for the OAuth callback and saves tokens to `~/.config/gsc-oauth-tokens.json`.

3. **Scope** — The auth script requests `https://www.googleapis.com/auth/webmasters` (read+write). This allows:
   - Reading search analytics
   - URL inspection
   - Sitemap submission/deletion

## Auth helper code

For custom scripts, use this auth pattern:

```typescript
import { google } from 'googleapis';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CLIENT_PATH = join(homedir(), '.config', 'gsc-oauth-client.json');
const TOKENS_PATH = join(homedir(), '.config', 'gsc-oauth-tokens.json');

function getAuth() {
  const clientFile = JSON.parse(readFileSync(CLIENT_PATH, 'utf-8'));
  const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf-8'));
  const { client_id, client_secret } = clientFile.installed || clientFile.web;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
  oauth2Client.setCredentials(tokens);
  // Auto-refresh tokens
  oauth2Client.on('tokens', (t) => {
    writeFileSync(TOKENS_PATH, JSON.stringify({ ...tokens, ...t }, null, 2));
  });
  return oauth2Client;
}

const auth = getAuth();
const sc = google.searchconsole({ version: 'v1', auth });
```

**Important:** The `googleapis` package is installed in `~/Development/scripts/node_modules/`. Run custom scripts from that directory or install it in the project.

## Sitemap management

```typescript
// List sitemaps
const sitemaps = await sc.sitemaps.list({ siteUrl: site });

// Submit new sitemap
await sc.sitemaps.submit({ siteUrl: site, feedpath: 'https://example.com/sitemap.xml' });

// Delete old sitemap
await sc.sitemaps.delete({ siteUrl: site, feedpath: 'https://example.com/old-sitemap.xml' });
```

## Output

Always save pulled data to `data/gsc-queries.json` (or `data/gsc-deep.json` for audits) in the project directory. Add `data/` to `.gitignore` if not already there.

After analysis, present findings as actionable items sorted by impact. Focus on what can be fixed in code (titles, descriptions, canonicals, structured data, internal linking) rather than off-page factors.
