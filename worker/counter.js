// Shared visit counter for the personal homepage + GitHub profile README.
//
// Deploy (Cloudflare Dashboard, no CLI needed):
//   1. Create a KV namespace (Workers & Pages → KV → Create) and bind it to
//      this Worker with the variable name `VISITS`.
//   2. Create a Worker (Workers & Pages → Create → Create Worker), paste this
//      file, deploy.
//   3. Point both the homepage footer <img> and the README badge at:
//        https://<your-worker>.workers.dev/badge
//      The same KV key backs both, so they share one counter.
//
// Endpoints:
//   GET /badge          → increments the counter, returns an SVG badge
//   GET /get            → returns the current count as JSON (no increment)
// Query params for /badge: label (text), color (hex, no '#')

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const json = (body, extra = {}) =>
      new Response(JSON.stringify(body), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
          ...extra,
        },
      });

    if (url.pathname === '/get') {
      return json({ count: await readCount(env) });
    }

    if (url.pathname === '/badge') {
      const count = await increment(env);
      const label = url.searchParams.get('label') || 'visits';
      const color = url.searchParams.get('color') || '2a6f4e';
      return new Response(badgeSvg(label, String(count), color), {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          // Revalidate on every load so each page view reaches this Worker
          // and increments the counter (single request, no double counting).
          'Cache-Control': 'no-cache, max-age=0, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response('shared visit counter — /badge or /get', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};

async function readCount(env) {
  const v = await env.VISITS.get('count');
  return v === null ? 0 : parseInt(v, 10) || 0;
}

// KV is eventually consistent, so read-modify-write can lose an increment
// under bursts. Retry a few times to make that vanishingly unlikely.
async function increment(env) {
  for (let i = 0; i < 3; i++) {
    const current = await readCount(env);
    const next = current + 1;
    await env.VISITS.put('count', String(next));
    const verify = await readCount(env);
    if (verify >= next) return verify;
  }
  return readCount(env);
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]));
}

function badgeSvg(label, value, color) {
  const labelW = label.length * 6.5 + 10;
  const valueW = value.length * 6.5 + 10;
  const w = labelW + valueW;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(1)}" height="20" role="img" aria-label="${escapeXml(label + ': ' + value)}"><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><rect width="${w.toFixed(1)}" height="20" rx="3" fill="#555"/><rect x="${labelW.toFixed(1)}" width="${valueW.toFixed(1)}" height="20" rx="3" fill="#${escapeXml(color)}"/><rect x="${labelW.toFixed(1)}" width="2" height="20" fill="#${escapeXml(color)}"/><rect width="${w.toFixed(1)}" height="20" fill="url(#s)"/><g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11"><text x="${(labelW / 2).toFixed(1)}" y="14">${escapeXml(label)}</text><text x="${(labelW + valueW / 2).toFixed(1)}" y="14">${escapeXml(value)}</text></g></svg>`;
}
