import { createClient } from '@supabase/supabase-js';

// service-key client — bypasses RLS, so every query MUST scope by user_id.
// memoized so Fluid Compute reuses the connection across invocations.
let client = null;

export function getServiceClient() {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
  }
  return client;
}
