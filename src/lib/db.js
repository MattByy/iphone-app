import { supabase } from '@/lib/supabase';

export async function getSpaces(userId) {
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getBlocks(userId, spaceId) {
  let query = supabase
    .from('blocks')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });

  if (spaceId === null) {
    query = query.is('space_id', null);
  } else {
    query = query.eq('space_id', spaceId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getMessages(userId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
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

export async function insertBlock(userId, spaceId, type, props, order, createdBy) {
  const { data, error } = await supabase
    .from('blocks')
    .insert({
      user_id: userId,
      space_id: spaceId,
      type,
      props,
      order,
      created_by: createdBy,
      visible: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBlockProps(blockId, props) {
  const { data, error } = await supabase
    .from('blocks')
    .update({ props })
    .eq('id', blockId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function upsertUserConfig(userId, patch) {
  const { data, error } = await supabase
    .from('user_config')
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToBlocks(userId, spaceId, callback) {
  const filter =
    spaceId === null
      ? `user_id=eq.${userId}`
      : `user_id=eq.${userId}`;

  const channel = supabase
    .channel(`blocks:${userId}:${spaceId ?? 'home'}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'blocks',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => callback(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToMessages(userId, callback) {
  const channel = supabase
    .channel(`messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => callback(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToSpaces(userId, callback) {
  const channel = supabase
    .channel(`spaces:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'spaces',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => callback(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
