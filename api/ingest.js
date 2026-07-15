import { resolveAgent } from './_lib/auth.js';
import * as store from './_lib/store.js';

// data-plane webhook for scripts and external services (Health Auto Export,
// Polymarket pollers, Zapier, anything that can POST JSON). authenticated with
// the same agent tokens as MCP, so every source is attributable.
//
//   POST /api/ingest
//   Authorization: Bearer tipas_...
//   { "dataset": "apple-health", "rows": [{ "steps": 8432 }, ...] }
//
// rows land in the dataset (auto-created) and stream live to any canvas block
// subscribed to it. a single object body is treated as one row.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const bearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const agent = await resolveAgent(bearer);
  if (!agent) {
    return res.status(401).json({ error: 'invalid or missing bearer token' });
  }

  const { dataset, rows, row } = req.body ?? {};
  if (!dataset) {
    return res.status(400).json({ error: 'dataset (string) is required' });
  }
  const payload = Array.isArray(rows) ? rows : row ? [row] : null;
  if (!payload) {
    return res.status(400).json({ error: 'rows (array) or row (object) is required' });
  }

  try {
    const ctx = { userId: agent.user_id, agentName: agent.name };
    const result = await store.insertRows(ctx, { dataset, rows: payload });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
