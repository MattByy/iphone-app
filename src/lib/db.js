import { supabase } from '@/lib/supabase';

// spaces
export async function getSpaces(_userId) {
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data;
}

// blocks for a space (or home if spaceId is null)
export async function getBlocks(_userId, spaceId) {
  let query = supabase.from('blocks').select('*').order('sort_order');
  if (spaceId == null) {
    query = query.is('space_id', null);
  } else {
    query = query.eq('space_id', spaceId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateBlockProps(id, props) {
  const { error } = await supabase.from('blocks').update({ props }).eq('id', id);
  if (error) throw error;
}

// events: human interactions routed back to agents (agent = null broadcasts)
export async function insertEvent(userId, { type, payload = {}, blockId = null, agent = null }) {
  const { error } = await supabase
    .from('events')
    .insert({ user_id: userId, type, payload, block_id: blockId, agent });
  if (error) throw error;
}

// datasets: the flexible data plane (agents write via MCP, scripts via /api/ingest)
export async function getDatasetByName(name) {
  const { data, error } = await supabase
    .from('datasets')
    .select('id, name, description')
    .eq('name', name)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDatasetRows(datasetId, limit = 100) {
  const { data, error } = await supabase
    .from('dataset_rows')
    .select('id, data, ts')
    .eq('dataset_id', datasetId)
    .order('ts', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export function subscribeToDatasetRows(datasetId, callback) {
  const channel = supabase
    .channel(`dataset:${datasetId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'dataset_rows',
      filter: `dataset_id=eq.${datasetId}`,
    }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// vars: live named variables bound inside artifacts ({{name}} / data-var)
export async function getVars() {
  const { data, error } = await supabase.from('vars').select('key, value');
  if (error) throw error;
  const map = {};
  for (const row of data) map[row.key] = row.value;
  return map;
}

export function subscribeToVars(callback) {
  const channel = supabase
    .channel('vars')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vars' }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// components: the user's component library (defined by agents via MCP)
export async function getComponentByName(name) {
  const { data, error } = await supabase
    .from('components')
    .select('id, name, code, props_schema, updated_at')
    .eq('name', name)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function subscribeToComponent(componentId, callback) {
  const channel = supabase
    .channel(`component:${componentId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'components',
      filter: `id=eq.${componentId}`,
    }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// messages
export async function getMessages(_userId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function insertMessage(userId, role, content, metadata = {}) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ user_id: userId, role, content, metadata })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMessage(id, content, metadata = {}) {
  const { data, error } = await supabase
    .from('messages')
    .update({ content, metadata })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// user config
export async function getConfig(key) {
  const { data, error } = await supabase
    .from('user_config')
    .select('value')
    .eq('key', key)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.value ?? null;
}

export async function setConfig(key, value) {
  const { error } = await supabase
    .from('user_config')
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// realtime
export function subscribeToBlocks(_userId, spaceId, callback) {
  const channel = supabase
    .channel(`blocks:${spaceId ?? 'home'}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'blocks',
      filter: spaceId ? `space_id=eq.${spaceId}` : undefined,
    }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToSpaces(_userId, callback) {
  const channel = supabase
    .channel('spaces')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'spaces' }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToMessages(_userId, callback) {
  const channel = supabase
    .channel('messages')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
