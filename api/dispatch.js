import crypto from 'node:crypto';
import { getServiceClient } from './_lib/supabase.js';

// event push gateway: a postgres trigger on the events table POSTs each new
// row here (authenticated with DISPATCH_SECRET); we forward it, HMAC-signed,
// to the webhook of the agent the event targets (or every agent on broadcast).
// single attempt — polling via MCP poll_events remains the at-least-once path.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!process.env.DISPATCH_SECRET || req.headers['x-dispatch-secret'] !== process.env.DISPATCH_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // supabase database webhooks wrap the row as { record }, pg_net triggers may
  // send the row directly — accept both
  const event = req.body?.record ?? req.body;
  if (!event?.user_id || !event?.type) {
    return res.status(400).json({ error: 'not an event row' });
  }

  const sb = getServiceClient();
  let query = sb
    .from('agents')
    .select('id, name, webhook_url, webhook_secret')
    .eq('user_id', event.user_id)
    .not('webhook_url', 'is', null)
    .is('revoked_at', null);
  if (event.agent) query = query.eq('name', event.agent);
  const { data: agents, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const results = await Promise.all(
    (agents ?? []).map(async (agent) => {
      const body = JSON.stringify({ event });
      const signature = crypto.createHmac('sha256', agent.webhook_secret).update(body).digest('hex');
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch(agent.webhook_url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-tipas-signature': signature },
          body,
          signal: controller.signal,
        });
        clearTimeout(timer);
        console.log(`[dispatch] ${event.type} → ${agent.name} (${resp.status})`);
        return { agent: agent.name, status: resp.status };
      } catch (err) {
        console.log(`[dispatch] ${event.type} → ${agent.name} FAILED: ${err.message}`);
        return { agent: agent.name, error: err.message };
      }
    })
  );

  return res.status(200).json({ delivered: results });
}
