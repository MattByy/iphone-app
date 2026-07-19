import { getServiceClient } from './_lib/supabase.js';
import * as store from './_lib/store.js';
import { runFeed } from './_lib/feedRunner.js';

// generic connector runner — no API is hardcoded here. pg_cron POSTs every few
// minutes (vault-secret auth, same as /api/dispatch); we execute whatever
// connectors are configured in the feeds table and due, mapping each JSON
// response into vars + dataset rows per the feed's declared mapping.
// agents manage connectors over MCP: add_feed / list_feeds / delete_feed /
// test_feed. manual tick: curl -X POST -H "X-Dispatch-Secret: ..." /api/feeds

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!process.env.DISPATCH_SECRET || req.headers['x-dispatch-secret'] !== process.env.DISPATCH_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const sb = getServiceClient();
  const { data: feeds, error } = await sb.from('feeds').select('*').eq('enabled', true);
  if (error) return res.status(500).json({ error: error.message });

  const now = Date.now();
  const due = (feeds ?? []).filter(
    (f) => !f.last_run_at || now - new Date(f.last_run_at).getTime() >= f.interval_minutes * 60_000 - 30_000
  );

  const touchedUsers = new Set();
  const status = {};
  await Promise.all(
    due.map(async (feed) => {
      const ctx = { userId: feed.user_id, agentName: `feed:${feed.name}` };
      let result = 'ok';
      try {
        const { vars, rows } = await runFeed(feed);
        if (Object.keys(vars).length) await store.setVars(ctx, vars);
        if (rows.length) await store.insertRows(ctx, { dataset: feed.dataset.name, rows });
        touchedUsers.add(feed.user_id);
      } catch (err) {
        result = err.message.slice(0, 200); // a dead API must not stall the rest
      }
      status[feed.name] = result;
      await sb
        .from('feeds')
        .update({ last_run_at: new Date().toISOString(), last_status: result })
        .eq('id', feed.id);
    })
  );

  // one freshness stamp per user whose feeds refreshed — artifacts bind it
  await Promise.all(
    [...touchedUsers].map((userId) =>
      store
        .setVars({ userId, agentName: 'feeds' }, { feeds_updated: new Date().toISOString() })
        .catch(() => {})
    )
  );

  console.log(`[feeds] ${due.length}/${(feeds ?? []).length} due: ${Object.entries(status).map(([k, v]) => `${k}:${v}`).join(' ') || 'none'}`);
  return res.status(200).json({ ran: due.length, configured: (feeds ?? []).length, status });
}
