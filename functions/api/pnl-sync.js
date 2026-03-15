/**
 * Cloudflare Pages Function: /api/pnl-sync
 * GET  — read P&L data from KV
 * PUT  — write P&L data to KV
 * KV binding: PENCEV_KV (set in Pages dashboard)
 */

const KV_KEY = 'pencev-pnl-v2';

export async function onRequestGet({ env }) {
  try {
    const value = await env.PENCEV_KV.get(KV_KEY);
    return new Response(value || 'null', {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const body = await request.text();
    await env.PENCEV_KV.put(KV_KEY, body);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
