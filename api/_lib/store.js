import { getServiceClient } from './supabase.js';
import { BLOCK_TYPES, validateBlock, isEmojiIcon } from '../../src/lib/blockRegistry.js';

// every operation takes ctx = { userId, agentName } and scopes by user_id.
// the service key bypasses RLS, so this scoping is the security boundary —
// never add a query here without it.

export class StoreError extends Error {}

function schemaHint(type) {
  const def = BLOCK_TYPES[type];
  if (!def) return '';
  return `\nschema for "${type}": ${JSON.stringify(def.props)}\nexample: ${JSON.stringify(def.example)}`;
}

function assertValidBlock(type, props) {
  const result = validateBlock(type, props);
  if (!result.ok) {
    throw new StoreError(`invalid block: ${result.errors.join('; ')}${schemaHint(type)}`);
  }
  if (type === 'canvas' && (props?.html?.length ?? 0) > 200_000) {
    throw new StoreError('canvas html too large (max 200kB) — split into multiple canvases or load less markup');
  }
}

function assertIcon(icon) {
  if (icon != null && !isEmojiIcon(icon)) {
    throw new StoreError(`icon must be a single emoji (e.g. "🏋️"), got "${icon}"`);
  }
}

// spaces -------------------------------------------------------------------

export async function listSpaces(ctx) {
  const { data, error } = await getServiceClient()
    .from('spaces')
    .select('id, name, icon, sort_order, created_by, created_at')
    .eq('user_id', ctx.userId)
    .order('sort_order');
  if (error) throw new StoreError(error.message);
  return data;
}

export async function createSpace(ctx, { name, icon = null, sort_order = 0 }) {
  assertIcon(icon);
  const { data, error } = await getServiceClient()
    .from('spaces')
    .insert({ user_id: ctx.userId, name, icon, sort_order, created_by: ctx.agentName })
    .select()
    .single();
  if (error) throw new StoreError(error.message);
  return data;
}

export async function updateSpace(ctx, { space_id, ...fields }) {
  const patch = {};
  for (const key of ['name', 'icon', 'sort_order']) {
    if (fields[key] !== undefined) patch[key] = fields[key];
  }
  if (patch.icon !== undefined) assertIcon(patch.icon);
  if (Object.keys(patch).length === 0) throw new StoreError('nothing to update');
  const { data, error } = await getServiceClient()
    .from('spaces')
    .update(patch)
    .eq('id', space_id)
    .eq('user_id', ctx.userId)
    .select()
    .maybeSingle();
  if (error) throw new StoreError(error.message);
  if (!data) throw new StoreError('space not found');
  return data;
}

export async function deleteSpace(ctx, { space_id }) {
  const { data, error } = await getServiceClient()
    .from('spaces')
    .delete()
    .eq('id', space_id)
    .eq('user_id', ctx.userId)
    .select('id')
    .maybeSingle();
  if (error) throw new StoreError(error.message);
  if (!data) throw new StoreError('space not found');
  return { deleted: space_id };
}

// blocks -------------------------------------------------------------------

export async function listBlocks(ctx, { space_id = null } = {}) {
  let query = getServiceClient()
    .from('blocks')
    .select('*')
    .eq('user_id', ctx.userId)
    .order('sort_order');
  query = space_id == null ? query.is('space_id', null) : query.eq('space_id', space_id);
  const { data, error } = await query;
  if (error) throw new StoreError(error.message);
  return data;
}

export async function createBlock(ctx, { space_id = null, type, props = {}, sort_order = 0, visible = true }) {
  assertValidBlock(type, props);
  if (space_id != null) {
    // fail loudly on foreign/unknown spaces instead of writing an orphan
    const { data: space } = await getServiceClient()
      .from('spaces')
      .select('id')
      .eq('id', space_id)
      .eq('user_id', ctx.userId)
      .maybeSingle();
    if (!space) throw new StoreError('space not found — call list_spaces for valid ids');
  }
  const { data, error } = await getServiceClient()
    .from('blocks')
    .insert({ user_id: ctx.userId, space_id, type, props, sort_order, visible, created_by: ctx.agentName })
    .select()
    .single();
  if (error) throw new StoreError(error.message);
  return data;
}

export async function updateBlocksBatch(ctx, updates) {
  const sb = getServiceClient();
  const results = [];
  for (const u of updates) {
    try {
      const patch = {};
      for (const key of ['props', 'space_id', 'sort_order', 'visible']) {
        if (u[key] !== undefined) patch[key] = u[key];
      }
      if (Object.keys(patch).length === 0) throw new StoreError('nothing to update');
      if (patch.props !== undefined) {
        const { data: existing } = await sb
          .from('blocks')
          .select('type')
          .eq('id', u.block_id)
          .eq('user_id', ctx.userId)
          .maybeSingle();
        if (!existing) throw new StoreError('block not found');
        assertValidBlock(existing.type, patch.props);
      }
      const { data, error } = await sb
        .from('blocks')
        .update(patch)
        .eq('id', u.block_id)
        .eq('user_id', ctx.userId)
        .select()
        .maybeSingle();
      if (error) throw new StoreError(error.message);
      if (!data) throw new StoreError('block not found');
      results.push({ block_id: u.block_id, ok: true });
    } catch (err) {
      results.push({ block_id: u.block_id, ok: false, error: err.message });
    }
  }
  return results;
}

export async function deleteBlocks(ctx, block_ids) {
  const { data, error } = await getServiceClient()
    .from('blocks')
    .delete()
    .in('id', block_ids)
    .eq('user_id', ctx.userId)
    .select('id');
  if (error) throw new StoreError(error.message);
  return { deleted: (data ?? []).map((r) => r.id) };
}

// datasets -----------------------------------------------------------------
// the flexible data plane: agents write via MCP, scripts via /api/ingest,
// canvas blocks and widgets read live.

export async function listDatasets(ctx) {
  const { data, error } = await getServiceClient()
    .from('datasets')
    .select('id, name, description, created_by, created_at')
    .eq('user_id', ctx.userId)
    .order('name');
  if (error) throw new StoreError(error.message);
  return data;
}

export async function getOrCreateDataset(ctx, { name, description = null }) {
  if (!/^[a-z0-9][a-z0-9-_]{0,59}$/.test(name)) {
    throw new StoreError('dataset name must be 1-60 chars of lowercase letters, digits, - or _');
  }
  const sb = getServiceClient();
  const { data: existing, error: findErr } = await sb
    .from('datasets')
    .select('*')
    .eq('user_id', ctx.userId)
    .eq('name', name)
    .maybeSingle();
  if (findErr) throw new StoreError(findErr.message);
  if (existing) return existing;
  const { data, error } = await sb
    .from('datasets')
    .insert({ user_id: ctx.userId, name, description, created_by: ctx.agentName })
    .select()
    .single();
  if (error) throw new StoreError(error.message);
  return data;
}

export async function insertRows(ctx, { dataset, rows }) {
  if (!Array.isArray(rows) || rows.length === 0) throw new StoreError('rows must be a non-empty array');
  if (rows.length > 500) throw new StoreError('max 500 rows per call');
  const ds = await getOrCreateDataset(ctx, { name: dataset });
  const payload = rows.map((r) => ({
    dataset_id: ds.id,
    user_id: ctx.userId,
    data: r?.data !== undefined ? r.data : r,
    ...(r?.ts ? { ts: r.ts } : {}),
  }));
  const { data, error } = await getServiceClient()
    .from('dataset_rows')
    .insert(payload)
    .select('id');
  if (error) throw new StoreError(error.message);
  return { dataset: ds.name, dataset_id: ds.id, inserted: data.length };
}

export async function queryRows(ctx, { dataset, limit = 100, since = null }) {
  const sb = getServiceClient();
  const { data: ds, error: findErr } = await sb
    .from('datasets')
    .select('id')
    .eq('user_id', ctx.userId)
    .eq('name', dataset)
    .maybeSingle();
  if (findErr) throw new StoreError(findErr.message);
  if (!ds) throw new StoreError(`dataset "${dataset}" not found — call list_datasets`);
  let query = sb
    .from('dataset_rows')
    .select('id, data, ts')
    .eq('dataset_id', ds.id)
    .order('ts', { ascending: false })
    .limit(Math.min(limit, 1000));
  if (since) query = query.gte('ts', since);
  const { data, error } = await query;
  if (error) throw new StoreError(error.message);
  return data;
}

export async function deleteDataset(ctx, { dataset }) {
  const { data, error } = await getServiceClient()
    .from('datasets')
    .delete()
    .eq('user_id', ctx.userId)
    .eq('name', dataset)
    .select('id')
    .maybeSingle();
  if (error) throw new StoreError(error.message);
  if (!data) throw new StoreError(`dataset "${dataset}" not found`);
  return { deleted: dataset };
}

// events -------------------------------------------------------------------

export async function pollEvents(ctx, { limit = 50, auto_ack = false } = {}) {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from('events')
    .select('*')
    .eq('user_id', ctx.userId)
    .or(`agent.eq.${ctx.agentName},agent.is.null`)
    .is('acked_at', null)
    .order('created_at')
    .limit(limit);
  if (error) throw new StoreError(error.message);
  if (auto_ack && data.length) {
    await ackEvents(ctx, data.map((e) => e.id));
  }
  return data;
}

export async function ackEvents(ctx, event_ids) {
  const { data, error } = await getServiceClient()
    .from('events')
    .update({ acked_at: new Date().toISOString() })
    .in('id', event_ids)
    .eq('user_id', ctx.userId)
    .select('id');
  if (error) throw new StoreError(error.message);
  return { acked: (data ?? []).map((r) => r.id) };
}
