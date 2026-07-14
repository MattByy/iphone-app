import { supabase } from '@/lib/supabase';

export async function getSpaces(userId) {
  const { data, error } = await supabase.rpc('get_user_spaces', { p_user_id: userId });
  if (error) throw error;
  return data;
}

export async function getBlocks(userId, spaceId = null) {
  const { data, error } = await supabase.rpc('get_user_blocks', {
    p_user_id: userId,
    p_space_id: spaceId ?? null,
  });
  if (error) throw error;
  return data;
}

export async function getMessages(userId) {
  const { data, error } = await supabase.rpc('get_user_messages', { p_user_id: userId });
  if (error) throw error;
  return data;
}

export async function insertMessage(userId, role, content, metadata = {}) {
  const { data, error } = await supabase.rpc('insert_user_message', {
    p_user_id: userId,
    p_role: role,
    p_content: content,
    p_metadata: metadata,
  });
  if (error) throw error;
  return data?.[0];
}

export async function insertBlock(userId, spaceId, type, props, order = 0, createdBy = 'user') {
  const { data, error } = await supabase.rpc('insert_user_block', {
    p_user_id: userId,
    p_space_id: spaceId,
    p_type: type,
    p_props: props,
    p_order: order,
    p_created_by: createdBy,
  });
  if (error) throw error;
  return data?.[0];
}

export async function updateBlockProps(blockId, props) {
  const { error } = await supabase
    .from('blocks')
    .update({ props })
    .eq('id', blockId);
  if (error) throw error;
}

export async function updateMessage(messageId, content, metadata = {}) {
  const { error } = await supabase
    .from('messages')
    .update({ content, metadata })
    .eq('id', messageId);
  if (error) throw error;
}

export async function upsertUserConfig(userId, patch) {
  const { error } = await supabase
    .from('user_config')
    .upsert({ user_id: userId, ...patch });
  if (error) throw error;
}

// Realtime subscriptions — fall back gracefully if tables not in schema cache yet
export function subscribeToBlocks(userId, spaceId, callback) {
  const filter = spaceId
    ? `user_id=eq.${userId}&space_id=eq.${spaceId}`
    : `user_id=eq.${userId}`;
  const channel = supabase
    .channel(`blocks:${userId}:${spaceId ?? 'home'}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'blocks', filter }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToSpaces(userId, callback) {
  const channel = supabase
    .channel(`spaces:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'spaces', filter: `user_id=eq.${userId}` }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToMessages(userId, callback) {
  const channel = supabase
    .channel(`messages:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `user_id=eq.${userId}` }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
