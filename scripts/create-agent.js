// mint an MCP bearer token for an agent. run locally, never deployed:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/create-agent.js --user <uuid> --name claude-code
// prints the raw token ONCE — only its sha256 hash is stored.

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const arg = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

const userId = arg('--user');
const name = arg('--name');

if (!userId || !name) {
  console.error('usage: node scripts/create-agent.js --user <user-uuid> --name <agent-name>');
  process.exit(1);
}

// names appear in PostgREST or-filters and in created_by attribution — keep them plain
if (!/^[a-z0-9][a-z0-9-_]{1,39}$/.test(name)) {
  console.error('agent name must be 2-40 chars of lowercase letters, digits, - or _');
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (source your local .env)');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const token = `tipas_${crypto.randomBytes(32).toString('hex')}`;
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

const { data, error } = await supabase
  .from('agents')
  .insert({ user_id: userId, name, token_hash: tokenHash })
  .select()
  .single();

if (error) {
  console.error('failed:', error.message);
  process.exit(1);
}

console.log(`agent "${data.name}" created (id ${data.id})`);
console.log('');
console.log('token (shown once, store it now):');
console.log(token);
console.log('');
console.log('connect claude code:');
console.log(`  claude mcp add --transport http tipas https://<your-app>.vercel.app/api/mcp --header "Authorization: Bearer ${token}"`);
