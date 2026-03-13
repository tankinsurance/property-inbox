#!/usr/bin/env node
/**
 * pencev-sync-queue.js
 *
 * Commits the latest queue.json from the local workspace to the
 * property-inbox GitHub repo so the Cloudflare Pages UI stays up to date.
 *
 * Usage:
 *   node scripts/pencev-sync-queue.js
 *
 * Called automatically after each Pencev Capital heartbeat scan.
 *
 * Requires:
 *   - GITHUB_TOKEN env var  OR  the default secret path below
 *   - Node.js built-ins only (no npm deps)
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── Config ────────────────────────────────────────────────────────────────────
const OWNER      = 'tankinsurance';
const REPO       = 'property-inbox';
const BRANCH     = 'main';
const FILE_PATH  = 'queue.json';    // path in repo

// Local queue.json location
const LOCAL_QUEUE = path.resolve(
  process.env.QUEUE_PATH ||
  path.join(__dirname, '../../memory/property-inbox/queue.json')
);

// GitHub token — env var takes priority, otherwise read from vault
const TOKEN_PATH = process.env.GITHUB_TOKEN_PATH ||
  path.join(require('os').homedir(), '.secrets', 'github-token.txt');

// ── Helpers ───────────────────────────────────────────────────────────────────
function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
  try {
    return fs.readFileSync(TOKEN_PATH, 'utf16le').replace(/\s/g, '');
  } catch {
    // fallback utf-8
    return fs.readFileSync(TOKEN_PATH, 'utf8').trim();
  }
}

function apiRequest(method, endpoint, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}/contents/${endpoint}`,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept':        'application/vnd.github+json',
        'User-Agent':    'pencev-sync-queue/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function sync() {
  console.log('[pencev-sync-queue] Starting sync...');

  // 1. Read local queue.json
  if (!fs.existsSync(LOCAL_QUEUE)) {
    console.error(`[pencev-sync-queue] queue.json not found at: ${LOCAL_QUEUE}`);
    process.exit(1);
  }
  const localContent = fs.readFileSync(LOCAL_QUEUE, 'utf8');
  const encoded = Buffer.from(localContent).toString('base64');

  // 2. Get token
  const token = getToken();
  if (!token || token.length < 10) {
    console.error('[pencev-sync-queue] GitHub token missing or too short');
    process.exit(1);
  }

  // 3. Get current SHA of file in repo (needed for update)
  let sha = null;
  const getRes = await apiRequest('GET', FILE_PATH, null, token);
  if (getRes.status === 200 && getRes.body?.sha) {
    sha = getRes.body.sha;
    console.log(`[pencev-sync-queue] Existing file SHA: ${sha}`);
  } else if (getRes.status === 404) {
    console.log('[pencev-sync-queue] File does not exist yet — will create');
  } else {
    console.error('[pencev-sync-queue] Unexpected GET response:', getRes.status, JSON.stringify(getRes.body).slice(0, 200));
    process.exit(1);
  }

  // 4. Commit (create or update)
  const commitMsg = `chore: sync queue.json [${new Date().toISOString()}]`;
  const putBody = {
    message: commitMsg,
    content: encoded,
    branch:  BRANCH,
    ...(sha ? { sha } : {}),
  };

  const putRes = await apiRequest('PUT', FILE_PATH, putBody, token);
  if (putRes.status === 200 || putRes.status === 201) {
    const commitSha = putRes.body?.commit?.sha?.slice(0, 7) || '?';
    console.log(`[pencev-sync-queue] Committed successfully — ${commitSha}`);
    console.log(`[pencev-sync-queue] Raw URL: https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${FILE_PATH}`);
  } else {
    console.error('[pencev-sync-queue] Commit failed:', putRes.status, JSON.stringify(putRes.body).slice(0, 400));
    process.exit(1);
  }
}

sync().catch(err => {
  console.error('[pencev-sync-queue] Fatal error:', err);
  process.exit(1);
});
