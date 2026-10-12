import { google } from 'googleapis';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

export const CLIENT_PATH =
  process.env.GSC_CLIENT || join(homedir(), '.config', 'gsc-oauth-client.json');
export const TOKENS_PATH =
  process.env.GSC_TOKENS || join(homedir(), '.config', 'gsc-oauth-tokens.json');

export const SCOPE_READ = 'https://www.googleapis.com/auth/webmasters.readonly';
export const SCOPE_WRITE = 'https://www.googleapis.com/auth/webmasters';

export const REDIRECT_PORT = 3456;
export const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;

export function loadClient(): { client_id: string; client_secret: string } {
  if (!existsSync(CLIENT_PATH)) {
    console.error(`OAuth client file not found: ${CLIENT_PATH}`);
    console.error('Create a Desktop OAuth client in Google Cloud Console and save the JSON there.');
    process.exit(1);
  }
  const file = JSON.parse(readFileSync(CLIENT_PATH, 'utf-8'));
  const c = file.installed || file.web;
  if (!c?.client_id || !c?.client_secret) {
    console.error(`Invalid OAuth client file: ${CLIENT_PATH}`);
    process.exit(1);
  }
  return { client_id: c.client_id, client_secret: c.client_secret };
}

export function saveTokens(tokens: Record<string, unknown>) {
  mkdirSync(dirname(TOKENS_PATH), { recursive: true });
  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

export function newOAuthClient() {
  const { client_id, client_secret } = loadClient();
  return new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);
}

/** True when the saved token carries the full read+write scope. */
export function hasWriteScope(): boolean {
  if (!existsSync(TOKENS_PATH)) return false;
  const t = JSON.parse(readFileSync(TOKENS_PATH, 'utf-8'));
  return String(t.scope || '').split(' ').includes(SCOPE_WRITE);
}

/** Authenticated OAuth2 client. Refreshed tokens are written back to disk. */
export function getAuth() {
  if (!existsSync(TOKENS_PATH)) {
    console.error(`No tokens at ${TOKENS_PATH}. Run: npx tsx <skill-dir>/scripts/auth.ts`);
    process.exit(1);
  }
  const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf-8'));
  const client = newOAuthClient();
  client.setCredentials(tokens);
  client.on('tokens', (t) => {
    const current = JSON.parse(readFileSync(TOKENS_PATH, 'utf-8'));
    saveTokens({ ...current, ...t });
  });
  return client;
}

export function getSearchConsole() {
  return google.searchconsole({ version: 'v1', auth: getAuth() });
}

/** Minimal arg parser: --key value, --flag. */
export function parseArgs(argv = process.argv.slice(2)) {
  const out: Record<string, string | boolean> = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else out[key] = true;
    } else rest.push(a);
  }
  return { flags: out, rest };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
