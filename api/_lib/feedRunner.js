// generic connector runner: a feed row declares WHAT to fetch and how to map
// the JSON response into vars/dataset rows — no API is hardcoded in the app.
// mapping vocabulary (a field spec is a path string or an object):
//   { path: "bitcoin.usd" }            walk dot-path (array indices allowed)
//   { ..., parse: true }               JSON.parse a stringified field
//   { ..., index: 0 }                  pick an array element
//   { ..., mul: 100, round: 1 }        arithmetic on numbers
//   { ..., lookup: {"0":"clear"}, default: "—" }   map codes to labels
//   { template: "{{wx_temp}}° {{wx_desc}}" }       compose from earlier vars
//                                                  (falls back to response paths)
// a map entry is { var: "name", ...fieldSpec } or a list extractor:
//   { var: "pm_markets", path: "", pick: { limit: 3, fields: { q: "question", ... } } }
// optional top-level extras:
//   expand:  { url: "https://.../{{item}}.json", limit: 5 }  — when the response
//            is an array of ids, fetch each and continue with the item array
//   dataset: { name: "market-ticks", row: { btc: "bitcoin.usd" } } — append history

import { StoreError } from './store.js';

const MAX_RESPONSE = 500_000;
const MAX_EXPAND = 8;
const MAX_MAP = 30;
export const FEED_NAME_RE = /^[a-z0-9][a-z0-9-_]{0,39}$/;

export function assertFeedUrl(url) {
  let parsed;
  try {
    parsed = new URL(url ?? '');
    if (parsed.protocol !== 'https:') throw new Error();
  } catch {
    throw new StoreError('feed url must be a valid https:// url');
  }
  const host = parsed.hostname;
  const selfHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || 'iphone-app-five.vercel.app';
  // the runner fetches agent-configured urls from inside our infra — never let
  // it be pointed back at the app, the database, or private address space
  if (
    host === selfHost ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.supabase.co') ||
    host === 'localhost' ||
    /^[\d.]+$/.test(host) ||
    host.includes(':')
  ) {
    throw new StoreError('feed url must be a public external https api');
  }
  return parsed;
}

async function fetchJson(url) {
  assertFeedUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    // several public APIs (met.no, wikimedia, openlibrary) require an
    // identifying user-agent and 403 anonymous fetchers
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'error',
      headers: { 'user-agent': 'tipas-connectors/1.0 (personal dashboard; github.com/MattByy/iphone-app)' },
    });
    if (!res.ok) throw new StoreError(`fetch failed: ${res.status}`);
    const text = await res.text();
    if (text.length > MAX_RESPONSE) throw new StoreError('response too large (max 500kB)');
    try {
      return JSON.parse(text);
    } catch {
      throw new StoreError('response is not JSON');
    }
  } finally {
    clearTimeout(timer);
  }
}

function getPath(obj, path) {
  if (path == null || path === '') return obj;
  let cur = obj;
  for (const seg of String(path).split('.')) {
    if (cur == null) return undefined;
    cur = cur[/^\d+$/.test(seg) ? Number(seg) : seg];
  }
  return cur;
}

function renderTemplate(tpl, data, vars) {
  return String(tpl).replace(/\{\{\s*([a-zA-Z0-9_.$-]+)\s*\}\}/g, (_, name) => {
    const v = vars && name in vars ? vars[name] : getPath(data, name);
    return v == null ? '' : String(v);
  });
}

function resolveField(spec, data, vars) {
  if (typeof spec === 'string') return getPath(data, spec);
  if (spec == null || typeof spec !== 'object') return undefined;
  if (spec.template != null) return renderTemplate(spec.template, data, vars);
  let v = getPath(data, spec.path ?? '');
  if (spec.parse && typeof v === 'string') {
    try { v = JSON.parse(v); } catch { /* leave as-is */ }
  }
  if (spec.index != null && Array.isArray(v)) v = v[spec.index];
  if (spec.lookup && typeof spec.lookup === 'object') {
    v = spec.lookup[String(v)] ?? spec.default ?? v;
  }
  if (typeof v === 'string' && (spec.mul != null || spec.round != null)) v = parseFloat(v);
  if (spec.mul != null && typeof v === 'number') v = v * spec.mul;
  if (spec.round != null && typeof v === 'number') {
    const f = 10 ** spec.round;
    v = Math.round(v * f) / f;
  }
  if (v === undefined) v = spec.default;
  return v;
}

function resolveFields(fields, item, vars) {
  const out = {};
  for (const [k, spec] of Object.entries(fields ?? {})) out[k] = resolveField(spec, item, vars);
  return out;
}

// fetch + map one feed config. touches nothing — persistence is the caller's job.
export async function runFeed(feed) {
  let data = await fetchJson(feed.url);

  if (feed.expand?.url) {
    if (!Array.isArray(data)) throw new StoreError('expand needs the response to be an array');
    const items = data.slice(0, Math.min(feed.expand.limit ?? MAX_EXPAND, MAX_EXPAND));
    data = (
      await Promise.all(
        items.map((item) =>
          fetchJson(renderTemplate(feed.expand.url, { item }, null)).catch(() => null)
        )
      )
    ).filter(Boolean);
  }

  const vars = {};
  for (const m of (feed.map ?? []).slice(0, MAX_MAP)) {
    if (!m?.var) continue;
    let value;
    if (m.pick) {
      const base = getPath(data, m.path ?? '');
      if (!Array.isArray(base)) continue;
      value = base
        .slice(0, Math.min(m.pick.limit ?? 5, 20))
        .map((item) => resolveFields(m.pick.fields, item, vars));
    } else {
      value = resolveField(m, data, vars);
    }
    if (value !== undefined) vars[m.var] = value;
  }

  const rows = [];
  if (feed.dataset?.name && feed.dataset.row) {
    rows.push(resolveFields(feed.dataset.row, data, vars));
  }
  return { vars, rows };
}

export function validateFeedConfig({ name, url, interval_minutes, map, dataset, expand }) {
  if (!FEED_NAME_RE.test(name ?? '')) {
    throw new StoreError('feed name must be 1-40 chars of lowercase letters, digits, - _');
  }
  assertFeedUrl(url);
  if (expand?.url) assertFeedUrl(String(expand.url).replace(/\{\{[^}]*\}\}/g, '0'));
  const interval = interval_minutes ?? 10;
  if (!Number.isInteger(interval) || interval < 5 || interval > 1440) {
    throw new StoreError('interval_minutes must be an integer between 5 and 1440');
  }
  if (!Array.isArray(map) || map.length === 0 || map.length > MAX_MAP) {
    throw new StoreError(`map must be an array of 1-${MAX_MAP} extraction entries`);
  }
  if (dataset && (!FEED_NAME_RE.test(dataset.name ?? '') || typeof dataset.row !== 'object')) {
    throw new StoreError('dataset must be { name, row: { column: fieldSpec } }');
  }
  if (JSON.stringify({ map, dataset, expand }).length > 20_000) {
    throw new StoreError('feed config too large (max 20kB)');
  }
  return interval;
}
