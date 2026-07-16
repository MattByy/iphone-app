import crypto from 'node:crypto';
import { getServiceClient } from './supabase.js';

// per-instance token bucket: caps runaway agents / leaked tokens at 120
// requests per minute. fluid compute reuses instances, so this holds real
// state between invocations without a store.
const buckets = new Map();
function rateLimited(agentId) {
  const now = Date.now();
  const bucket = buckets.get(agentId) ?? { count: 0, windowStart: now };
  if (now - bucket.windowStart > 60_000) {
    bucket.count = 0;
    bucket.windowStart = now;
  }
  bucket.count += 1;
  buckets.set(agentId, bucket);
  return bucket.count > 120;
}

// bearer token → agent row. raw tokens are never stored, only sha256 hashes.
export async function resolveAgent(bearerToken) {
  if (!bearerToken) return null;
  const hash = crypto.createHash('sha256').update(bearerToken).digest('hex');
  const sb = getServiceClient();
  const { data: agent } = await sb.from('agents').select('*').eq('token_hash', hash).maybeSingle();
  if (!agent) return null;
  if (agent.revoked_at) return null;
  if (agent.expires_at && new Date(agent.expires_at) < new Date()) return null;
  if (rateLimited(agent.id)) return null;
  sb.from('agents')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', agent.id)
    .then(() => {}, () => {});
  return agent;
}
