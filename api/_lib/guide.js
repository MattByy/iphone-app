import { DOC_INDEX } from './docs.js';

function componentLibrary(components) {
  if (!components?.length) {
    return `_empty — you can be the first to define one with \`define_component\`._`;
  }
  return components
    .map((c) => {
      const schema = Object.keys(c.props_schema ?? {}).length
        ? `props schema: \`${JSON.stringify(c.props_schema)}\``
        : '_no props_';
      return `- **${c.name}** — ${c.description ?? ''} ${schema} (defined by ${c.created_by})`;
    })
    .join('\n');
}

// the front door: enough to orient any agent in one read, plus an index of
// deep-dive docs served by read_doc. depth lives in docs.js — keep this lean.
export function buildGuide(components = []) {
  return `# tipas — start here

you are an agent rendering onto a human's phone. this app is your display and
interaction surface: **spaces are screens, blocks are what's on them**, and
everything you write appears live (supabase realtime — no refresh). the human
sees who built what (\`created_by\`). you are not a guest here — the human
connected you precisely so you would build, maintain, and evolve their app.

## how to work

1. \`list_spaces\` before creating anything — reuse before duplicating.
2. one space per topic; the home dashboard (blocks with no space_id) is
   reserved for the few things the human should see first.
3. edit/move/reorder/hide with \`update_blocks\` (batch, ≤50) instead of
   delete-and-recreate.
4. the escalation ladder — widgets are the floor, not the ceiling:
   **typed widgets** (quick glanceables) → **canvas artifacts** (full
   HTML/JS apps, sandboxed, hot-swappable) → **components** (the user's own
   reusable library) → **datasets & vars** (the data plane, realtime) →
   **connectors** (external APIs polled for you, no code) → **events &
   webhooks** (the human talks back).
5. before building anything substantial, read the relevant doc below —
   each is short and dense. \`test_feed\` before \`add_feed\`; \`list_components\`
   before \`define_component\`.

## hard rules

- dark theme, lowercase labels, phone-width; space icons are a SINGLE emoji.
- design bar is high: one designed full-page artifact per space beats widget
  clutter. read the \`design\` doc before building screens.
- artifacts cannot make network calls (CSP) — data enters via vars, datasets,
  and connectors only.
- \`position: fixed\` does not pin inside artifacts — use \`tipas.setNav\` for
  real tab bars.

${DOC_INDEX}

## the user's component library (live)

${componentLibrary(components)}

## quick reference

- events: \`poll_events\` / \`ack_events\`, or push via \`set_webhook\` (hmac-signed).
- live values: \`set_vars\` (MCP) or \`POST /api/vars\` (any script, same bearer).
- history: \`insert_rows\` (MCP) or \`POST /api/ingest\`.
- external APIs: \`add_feed\` — see \`connectors\` + \`apis\` docs.
- authed services (gmail/notion/strava...): bring your own tools — see
  \`integrations\` doc — and push results in.
`;
}
