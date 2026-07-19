import { BLOCK_TYPES } from '../../src/lib/blockRegistry.js';

function propsTable(props) {
  const keys = Object.entries(props);
  if (keys.length === 0) return '_no props_';
  return keys
    .map(([key, spec]) => {
      const bits = [spec.type];
      if (spec.required) bits.push('required');
      if (spec.enum) bits.push(`one of: ${spec.enum.join(' | ')}`);
      if (spec.items) bits.push(`items: ${JSON.stringify(spec.items)}`);
      return `- \`${key}\` — ${bits.join(', ')}`;
    })
    .join('\n');
}

function componentLibrary(components) {
  if (!components?.length) {
    return `_empty — you can be the first to define one with \`define_component\`._`;
  }
  return components
    .map((c) => {
      const schema = Object.keys(c.props_schema ?? {}).length
        ? `props schema: \`${JSON.stringify(c.props_schema)}\``
        : '_no props_';
      return `### ${c.name}\n\n${c.description ?? ''}\n\n${schema} (defined by ${c.created_by})`;
    })
    .join('\n\n');
}

// the guide is generated from the registry so it can never drift from what
// the app actually renders and what the server actually validates.
export function buildGuide(components = []) {
  const types = Object.entries(BLOCK_TYPES)
    .map(([type, def]) => {
      const lines = [`### ${type}`, def.summary];
      if (def.interactive) lines.push(`**interactive:** ${def.interactive}`);
      lines.push(propsTable(def.props));
      lines.push(`example props: \`${JSON.stringify(def.example)}\``);
      return lines.join('\n\n');
    })
    .join('\n\n');

  return `# tipas — agent guide

you are an agent rendering onto a human's phone. this app is your display surface:
**spaces are screens, blocks are widgets.** whatever you write appears on the
human's iPhone instantly (the app is realtime — no refresh needed).

## how to work here

1. call \`list_spaces\` before creating anything — reuse an existing space if one fits.
2. create a space per topic (workouts, nutrition, travel plans). keep each space focused.
3. blocks with \`space_id\` omitted land on the home dashboard — reserve that for the
   few things the human should see first.
4. use \`update_blocks\` to edit, move, reorder (sort_order) or hide (visible) blocks
   in batches instead of deleting and recreating.
5. \`created_by\` is stamped with your agent name — the human sees who built what.

## how far you can go

widgets are the floor, not the ceiling. the escalation ladder:

1. **typed widgets** (stat, chart, list, ...) — for simple, glanceable info. start here.
2. **canvas blocks** — you write full HTML/CSS/JS and it runs sandboxed on the phone.
   dashboards, tools, games — anything. the \`tipas\` bridge inside your code gives you
   live data (\`tipas.query\` / \`tipas.subscribe\`), persistence (\`tipas.getState\` /
   \`tipas.setState\`), events back to you (\`tipas.emit\`), \`tipas.resize\`, and a
   host-rendered tab bar for multi-screen apps (\`tipas.setNav\` / \`tipas.onNav\`).
   editing the app later = update_blocks with new html. nothing deploys; apps are data.
3. **components** — the user's own component library. \`define_component\` once
   (code like a canvas, instance props arrive as \`tipas.props\`, plus a declared
   props_schema that the server validates), then instance it anywhere with a
   \`component\` block. editing the component hot-swaps every instance live.
   check \`list_components\` and reuse before defining something new.
4. **datasets** — named streams of JSON rows, the data plane. you write them with
   \`insert_rows\`; external scripts and services push them via \`POST /api/ingest\`
   (same bearer token, body \`{"dataset":"...","rows":[...]}\`); canvas and
   component blocks read them live. connect anything: health data, market odds,
   calendars.
5. **feeds (connectors)** — plug any public JSON API straight into the app, no
   code and no deploy. \`add_feed\` declares a url, a poll interval, and a
   mapping from the response into vars (and optionally dataset rows); the app
   polls it forever and every bound artifact stays live. ALWAYS \`test_feed\`
   first — it dry-runs the fetch+mapping and shows exactly what would be
   extracted. this is how "show the weather / btc / anything on my phone"
   should be done: find a keyless https JSON api, map it, bind the vars.
   for APIs needing multi-step calls or auth, do the fetching yourself and
   push results via \`set_vars\` / \`POST /api/ingest\` instead.

   known-good keyless APIs (verified 2026-07): open-meteo + api.met.no
   (weather/air), coingecko + kraken + mempool.space + api.llama.fi +
   api.alternative.me/fng (crypto), api.frankfurter.dev + open.er-api.com
   (fx), gamma-api.polymarket.com (odds — outcomes/outcomePrices need
   \`parse: true\`) + api.elections.kalshi.com + api.manifold.markets
   (prediction markets), dashboard.elering.ee (baltic electricity spot),
   api.openf1.org + api.jolpi.ca (F1), site.api.espn.com (live scores),
   thesportsdb.com (key \`3\`), hn.algolia.com/api/v1/search?tags=front_page
   (front page in ONE call), lobste.rs/hottest.json, dev.to/api,
   api.adsb.lol (planes overhead), ll.thespacedevs.com (launches, 15/hr),
   earthquake.usgs.gov, services.swpc.noaa.gov (aurora), date.nager.at
   (holidays), xkcd.com/info.0.json. DEAD or blocked from here: ergast.com
   (use jolpi.ca), binance (geo-blocked), reddit .json, restcountries,
   quotable.io, coincap, exchangerate.host, balldontlie. for authed services
   (gmail, notion, strava, stripe...) bring your own tools — Composio/Rube
   or another MCP aggregator, an official single-service MCP server, or a
   CLI you already have (\`gh\`, \`stripe\`...) — then push results here via
   set_vars/ingest.

## full pages & bringing in designs from other tools

any canvas, component, or embed block can set \`full: true\` — it renders
edge-to-edge as a whole screen instead of a card. this is how professionally
designed pages come in:

- **design tool export** (google stitch, v0, anything that outputs html):
  take the exported html, swap hardcoded values for \`{{variables}}\`, and
  create ONE canvas block with \`full: true\` in its own space. the space IS
  that app screen. prefer this over composing many small widget blocks when
  the user asks for a designed page.
- **deployed app** (lovable, vercel, any https url that allows framing):
  create an \`embed\` block with the url and \`full: true\`.

### multi-screen apps — one artifact, many screens

a full-page artifact is not limited to one screen. put each screen in its own
\`<div class="screen">\` (hidden by default, one visible), switch them with a
few lines of JS, and declare tabs to the host:

- \`tipas.setNav([{id:"home", icon:"🏠", label:"today"}, ...], "home")\` — the
  app renders a real tab bar pinned to the bottom of the phone (2–5 tabs,
  emoji icons). call it again with a new active id to keep it in sync when
  your own buttons navigate.
- \`tipas.onNav(function(id){ ... })\` — fires when the human taps a tab; show
  the matching screen.
- do NOT use \`position: fixed\` inside your html for nav bars or headers — the
  frame is as tall as its content, so fixed elements pin to the content, not
  the phone screen. the host-rendered bar is the only thing that truly sticks.

when importing from a design tool, generate every screen in the SAME project
so they share one design system, strip each screen's own nav/back chrome, and
merge: shared head + one section per screen + \`setNav\`. this is how you ship
something that feels like an installed app, not a page.

## live variables — make any artifact update without editing it

write \`{{steps}}\` anywhere in canvas/component HTML (or \`data-var="steps"\` on an
element, or \`tipas.onVar('steps', cb)\` in JS). then anyone with a token changes it:

- MCP: \`set_vars {"vars": {"steps": 8432}}\`
- plain HTTP (scripts, cron, curl): \`POST /api/vars\` with body \`{"steps": 8432}\`
  and the same bearer token — \`GET /api/vars\` reads them back

every binding on the phone updates the moment the value lands. vars are for
current values (today's steps, the weather, a status); datasets are for
history and streams.

## design tokens — inherit the app's look

every frame is injected with the host theme: css variables \`--ink, --ink-2,
--muted, --card, --card-2, --line, --grid, --baseline, --accent, --good, --bad,
--radius\` and utility classes \`.t-pad, .t-label, .t-value, .t-muted, .t-row,
.t-btn, .t-btn-ghost\`. use them instead of hardcoding colors — artifacts that
use tokens stay on-brand when the user's theme changes.

## the user's component library

${componentLibrary(components)}

## design rules

- dark theme; labels are lowercase; keep text short — this is a phone, not a document.
- space icons are **a single emoji** (e.g. 🏋️ 🥗 ✈️). anything else is rejected.
- prefer one strong widget over three weak ones. use \`divider\` to group.

## events (how the human talks back)

interactive blocks (button, toggle, list, input) send events when the human uses
them. events are routed to the agent named in the block's \`created_by\` — so you
receive events for blocks you created. call \`poll_events\` to fetch unacked events
(includes broadcasts from human-created blocks), then \`ack_events\` when handled.
prefer push: register a webhook with \`set_webhook\` and every event is POSTed to
you the moment it happens (hmac-signed; single attempt — poll as the fallback).
a typical loop: render a \`button\` block → the human taps it → \`poll_events\`
returns \`{ type: "button_press", payload: ... , block_id: ... }\` → you react by
updating blocks.

## block types

${types}
`;
}
