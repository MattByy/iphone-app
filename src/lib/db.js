import { supabase } from '@/lib/supabase';

// spaces
export async function getSpaces() {
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .order('order');
  if (error) throw error;
  return data;
}

// blocks for a space
export async function getBlocks(spaceId) {
  const { data, error } = await supabase
    .from('blocks')
    .select('*')
    .eq('space_id', spaceId)
    .order('order');
  if (error) throw error;
  return data;
}

// home blocks (no space — null space_id)
export async function getHomeBlocks() {
  const { data, error } = await supabase
    .from('blocks')
    .select('*')
    .is('space_id', null)
    .order('order');
  if (error) throw error;
  return data;
}

// messages
export async function getMessages() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function insertMessage(role, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ role, content })
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
export function subscribeToBlocks(spaceId, callback) {
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

export function subscribeToSpaces(callback) {
  const channel = supabase
    .channel('spaces')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'spaces' }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToMessages(callback) {
  const channel = supabase
    .channel('messages')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
