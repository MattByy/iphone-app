import { resolveAgent } from './_lib/auth.js';
import * as store from './_lib/store.js';

// live variables over plain HTTP — the simplest possible integration surface.
//
//   POST /api/vars            { "steps": 8432, "weather": "22° sunny" }
//   GET  /api/vars            → { "steps": 8432, ... }
//   GET  /api/vars?keys=a,b   → subset
//
// authenticated with the same agent bearer tokens as MCP and /api/ingest.
// any artifact binding {{steps}} updates on the phone the moment this lands.
export default async function handler(req, res) {
  const bearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const agent = await resolveAgent(bearer);
  if (!agent) {
    return res.status(401).json({ error: 'invalid or missing bearer token' });
  }
  const ctx = { userId: agent.user_id, agentName: agent.name };

  try {
    if (req.method === 'POST') {
      const body = req.body ?? {};
      const vars = body.vars && typeof body.vars === 'object' ? body.vars : body;
      const result = await store.setVars(ctx, vars);
      return res.status(200).json(result);
    }
    if (req.method === 'GET') {
      const keys = req.query?.keys ? String(req.query.keys).split(',') : null;
      const rows = await store.getVars(ctx, keys);
      const map = {};
      for (const r of rows) map[r.key] = r.value;
      return res.status(200).json(map);
    }
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
