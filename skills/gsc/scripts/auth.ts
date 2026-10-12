// Desktop OAuth loopback flow. Saves tokens to ~/.config/gsc-oauth-tokens.json
// (override with GSC_TOKENS). Client JSON: ~/.config/gsc-oauth-client.json (GSC_CLIENT).
// Usage: npx tsx auth.ts [--write]
//   default: read-only scope (webmasters.readonly)
//   --write: full scope, only needed for sitemap submit/delete
import { createServer } from 'http';
import { randomBytes } from 'crypto';
import { exec } from 'child_process';
import { platform } from 'os';
import {
  REDIRECT_PORT, SCOPE_READ, SCOPE_WRITE, TOKENS_PATH,
  newOAuthClient, parseArgs, saveTokens,
} from './lib/auth.js';

function openBrowser(url: string) {
  const p = platform();
  const cmd = p === 'darwin' ? `open "${url}"` : p === 'win32' ? `start "" "${url}"` : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.log('Could not open a browser. Open this URL manually:\n' + url);
  });
}

const { flags } = parseArgs();
const scope = flags.write ? SCOPE_WRITE : SCOPE_READ;
const client = newOAuthClient();
const oauthState = randomBytes(16).toString('hex');
const authUrl = client.generateAuthUrl({
  state: oauthState,
  access_type: 'offline',
  prompt: 'consent',
  scope: [scope],
});

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${REDIRECT_PORT}`);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  if (url.searchParams.get('state') !== oauthState) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid state.');
    return;
  }
  if (error || !code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end(`Authorization failed: ${error || 'no code returned'}`);
    if (error) {
      console.error('Authorization failed:', error);
      server.close();
      process.exit(1);
    }
    return;
  }
  try {
    const { tokens } = await client.getToken(code);
    saveTokens(tokens as Record<string, unknown>);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Done. You can close this tab.');
    console.log(`Tokens saved to ${TOKENS_PATH}`);
    console.log(`Scope: ${scope}`);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Token exchange failed. See terminal.');
    console.error('Token exchange failed:', e);
    process.exitCode = 1;
  }
  server.close();
});

server.listen(REDIRECT_PORT, '127.0.0.1', () => {
  console.log(`Listening on http://localhost:${REDIRECT_PORT} for the OAuth callback...`);
  console.log(`Requesting scope: ${scope}`);
  openBrowser(authUrl);
});
