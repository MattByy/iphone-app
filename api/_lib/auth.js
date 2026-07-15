import crypto from 'node:crypto';
import { getServiceClient } from './supabase.js';

// bearer token → agent row. raw tokens are never stored, only sha256 hashes.
export async function resolveAgent(bearerToken) {
  if (!bearerToken) return null;
  const hash = crypto.createHash('sha256').update(bearerToken).digest('hex');
  const sb = getServiceClient();
  const { data: agent } = await sb.from('agents').select('*').eq('token_hash', hash).maybeSingle();
  if (!agent) return null;
  sb.from('agents')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', agent.id)
    .then(() => {}, () => {});
  return agent;
}
