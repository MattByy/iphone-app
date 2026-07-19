// the agent library: get_app_guide is the front door (orientation + index),
// read_doc serves the deep dives. one doc per concern so an agent loads only
// what the task needs. keep docs/API-CATALOG.md (human copy) in sync with
// the `apis` doc below.
import { BLOCK_TYPES } from '../../src/lib/blockRegistry.js';

function blocksDoc() {
  const types = Object.entries(BLOCK_TYPES)
    .map(([type, def]) => {
      const props = Object.entries(def.props)
        .map(([key, spec]) => {
          const bits = [spec.type];
          if (spec.required) bits.push('required');
          if (spec.enum) bits.push(`one of: ${spec.enum.join(' | ')}`);
          if (spec.items) bits.push(`items: ${JSON.stringify(spec.items)}`);
          return `- \`${key}\` — ${bits.join(', ')}`;
        })
        .join('\n');
      return `### ${type}\n\n${def.summary}\n${def.interactive ? `\n**interactive:** ${def.interactive}\n` : ''}\n${props || '_no props_'}\n\nexample props: \`${JSON.stringify(def.example)}\``;
    })
    .join('\n\n');
  return `# block types — full reference

blocks are validated server-side against these schemas; a create/update with
wrong props returns the schema in the error. \`space_id\` omitted = home
dashboard. batch edits via \`update_blocks\` (≤50). prefer \`visible: false\`
over deletion when the human might want a block back.

${types}
`;
}

const DOCS = {
  canvas: `# canvas artifacts & the tipas bridge

a canvas block is full HTML/CSS/JS running sandboxed (null-origin iframe) on
the phone. you write the code as the block's \`html\` prop; editing the block
hot-swaps it live. nothing deploys — apps are data.

## the bridge (available as \`window.tipas\`)

- \`tipas.props\` — instance props (for components)
- \`tipas.vars\` — live variables snapshot; \`tipas.onVar(key, cb)\` for changes
- \`{{name}}\` in your HTML or \`data-var="name"\` on an element — auto-bound text
- \`tipas.query(dataset, {limit})\` → rows (newest first)
- \`tipas.subscribe(dataset, cb)\` — cb gets new rows as they land
- \`tipas.getState()\` / \`tipas.setState(obj)\` — per-block persistence.
  WARNING: setState replaces the whole state object — read before you write
- \`tipas.emit(type, payload)\` — send an event to your agent (see events doc)
- \`tipas.resize(px)\` — usually automatic (ResizeObserver reports content height)
- \`tipas.setNav(items, activeId)\` / \`tipas.onNav(cb)\` — multi-screen apps (below)

## rules of the sandbox

- CSP blocks all network egress (\`connect-src 'none'\`) except design CDNs
  (tailwind cdn, jsdelivr, unpkg, google fonts). NO fetch/xhr/websocket from
  artifact code — data comes through the bridge only.
- paint your own background (\`body{background:var(--card)}\` is injected;
  full pages get #0a0a0a) — transparent frames render opaque white on iOS.
- the frame is as tall as its content; the PAGE scrolls, the frame does not.
  therefore \`position: fixed\` pins to the content, NOT the phone screen —
  never use it for nav bars or headers.
- viewport is phone width (~390px). test mentally at 390.
- html cap: 200kB per canvas.

## full pages

\`full: true\` renders edge-to-edge as a whole screen — the mode for designed
app screens. one strong full-page artifact per space beats many small widgets.

## multi-screen apps (one artifact = a whole app)

put each screen in \`<div class="screen">\` (one \`.active\`, rest hidden),
switch with a few lines of JS, and declare tabs to the host:

\`tipas.setNav([{id:"home", icon:"🏠", label:"today"}, ...], "home")\` — the
app renders a real pinned bottom tab bar (2-5 tabs, emoji icons). call again
with a new active id when your own buttons navigate. \`tipas.onNav(cb)\`
fires when the human taps a tab. the host bar is the only thing that truly
sticks to the phone viewport.
`,

  components: `# the component library — define once, instance everywhere

shadcn-for-this-app: the user has a per-account component library you build.

- \`define_component {name, description, props_schema, code}\` — code is full
  HTML/JS like a canvas; instance props arrive as \`tipas.props\`; the whole
  bridge is available. same name upserts and every rendered instance
  HOT-SWAPS live. 200kB cap.
- \`props_schema\` uses the same shape format as built-in blocks, e.g.
  \`{"title":{"type":"string","required":true}}\` — the server validates
  instance props against it.
- instance with \`create_block {type:"component", props:{name:"metric-ring", ...instanceProps}}\`.
- \`list_components\` before defining — REUSE beats duplication. \`get_component\`
  returns full code for editing someone else's (or past-you's) work.
- deleting a component leaves instances rendering an error state — repoint or
  remove them first.
`,

  data: `# vars, datasets, and the HTTP endpoints

two data planes, both realtime on the phone:

## vars — current values
key → any JSON value (≤10kB). for "the number right now": today's steps, the
weather, a status. set via MCP \`set_vars {"vars": {...}}\` or plain HTTP:
\`POST /api/vars\` body \`{"steps": 8432}\` with an agent bearer token —
the path for cron jobs, shortcuts, zapier, any script. \`GET /api/vars?keys=a,b\`
reads back. every \`{{binding}}\` on the phone repaints the moment a var lands.
key charset: \`[a-z0-9][a-z0-9_.-]{0,63}\`. provenance is recorded (updated_by).

## datasets — history & streams
named JSON row streams (rows ≤50kB, ≤500/call). \`insert_rows\` via MCP or
\`POST /api/ingest\` body \`{"dataset":"name","rows":[...]}\` over HTTP.
artifacts read with \`tipas.query\`/\`tipas.subscribe\`. use for anything with
a time axis: prices, workouts, sensor data. \`query_rows\` supports \`since\`.

rule: vars for now-values, datasets for history, connectors (see connectors
doc) when a public API should feed either WITHOUT you running.
`,

  connectors: `# connectors — plug external APIs in as data, no code, no deploy

a connector row = url + poll interval + declarative mapping. the app polls it
forever (pg_cron → runner) and lands the mapped values as vars / dataset rows.
manage via MCP: \`add_feed\`, \`list_feeds\` (shows last_run + last_status),
\`delete_feed\`, and ALWAYS \`test_feed\` first (dry-run: fetches once, returns
exactly what the mapping extracts, writes nothing).

## mapping vocabulary

a field spec is a path string or an object:

- \`{"path": "bitcoin.usd"}\` — dot-path into the response (array indices ok: \`daily.max.0\`)
- \`"parse": true\` — JSON.parse a stringified field (polymarket needs this)
- \`"index": 0\` — pick an array element after parse
- \`"mul": 100, "round": 1\` — arithmetic
- \`"lookup": {"0":"clear","61":"rain"}, "default": "—"\` — code → label maps
  (put whole lookup tables in the config — they're data)
- \`{"template": "{{wx_temp}}° {{wx_desc}}"}\` — compose; resolves earlier
  extracted vars first, then response paths

a map entry: \`{"var":"btc_price", ...fieldSpec}\` or a list extractor:
\`{"var":"top_markets","path":"","pick":{"limit":3,"fields":{"q":"question","pct":{"path":"outcomePrices","parse":true,"index":0,"mul":100,"round":0}}}}\`

top-level extras:
- \`"expand": {"url":"https://.../item/{{item}}.json","limit":5}\` — response
  is an array of ids → fetch each, continue with the item array (hackernews)
- \`"dataset": {"name":"market-ticks","row":{"btc":"bitcoin.usd"}}\` — append
  a history row each run (for sparklines/trends)

## constraints

https + public hosts only (self/supabase/private addresses rejected), keyless
APIs only, JSON responses ≤500kB, intervals 5-1440 min, ≤20 feeds, ≤30 map
entries, config ≤20kB. the runner sends an identifying user-agent (met.no,
wikimedia require one). for authed or multi-step APIs, fetch on YOUR side and
push via set_vars / POST /api/ingest — or see the integrations doc.

which APIs to use → read_doc "apis".
`,

  apis: `# verified keyless API catalog (live-verified 2026-07-19)

all https, JSON, no key, no signup, server-polling friendly. test_feed before
add_feed — APIs drift. suggested minimum poll intervals in parentheses.

## weather / environment / astronomy
- open-meteo forecast: https://api.open-meteo.com/v1/forecast?latitude=54.687&longitude=25.28&current=temperature_2m,weather_code,uv_index (10m)
- open-meteo air: https://air-quality-api.open-meteo.com/v1/air-quality?latitude=54.687&longitude=25.28&current=european_aqi,pm2_5 (30m)
- met norway: https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=54.687&lon=25.28 (premium forecasts; needs UA — the runner sends one)
- sunrisesunset.io: https://api.sunrisesunset.io/json?lat=54.687&lng=25.28 (daily, local-tz times)
- usgs quakes: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson (features.0.properties.place/mag)
- noaa space weather (aurora): https://services.swpc.noaa.gov/json/planetary_k_index_1m.json

## crypto / fx / markets
- coingecko: https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true (10m, IP-limited)
- kraken: https://api.kraken.com/0/public/Ticker?pair=XBTUSD (path result.XXBTZUSD.c.0)
- coinbase spot: https://api.coinbase.com/v2/prices/BTC-USD/spot
- mempool.space fees: https://mempool.space/api/v1/fees/recommended
- defillama tvl: https://api.llama.fi/v2/chains ; prices: https://coins.llama.fi/prices/current/coingecko:bitcoin
- fear & greed: https://api.alternative.me/fng/ (data.0.value, data.0.value_classification)
- frankfurter fx (ECB): https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP (60m; the .app domain is dead)
- open.er-api.com: https://open.er-api.com/v6/latest/USD (160+ rates, daily)
- currency-api via CDN (unlimited): https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json
- elering baltic electricity: https://dashboard.elering.ee/api/nps/price/LT/current (data.0.price €/MWh; mul 0.1 → ct/kWh; LT/EE/LV/FI)
- uk grid carbon: https://api.carbonintensity.org.uk/intensity
- NOTE: keyless stock quotes are extinct (yahoo needs cookies, IEX dead) — use agent-side tools for stocks.

## prediction markets
- polymarket: https://gamma-api.polymarket.com/markets?closed=false&order=volume24hr&ascending=false&limit=5 (outcomes/outcomePrices are stringified JSON → parse:true)
- kalshi: https://api.elections.kalshi.com/trade-api/v2/markets?limit=5 (read is keyless)
- manifold: https://api.manifold.markets/v0/markets?limit=5

## sports
- espn scoreboards (unofficial, long-lived): https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard — swap path: football/nfl, soccer/eng.1, hockey/nhl, baseball/mlb
- openf1: https://api.openf1.org/v1/sessions?year=2026 (keyless = slightly delayed)
- jolpica (ergast successor): https://api.jolpi.ca/ergast/f1/current/next.json (500/hr)
- thesportsdb: https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4328 (public key "3"; 4328=EPL)

## news / content
- hn front page IN ONE CALL: https://hn.algolia.com/api/v1/search?tags=front_page (hits.0.title/points)
- hn firebase (id list, use expand): https://hacker-news.firebaseio.com/v0/topstories.json
- lobsters: https://lobste.rs/hottest.json
- dev.to: https://dev.to/api/articles?per_page=5&top=7
- wikimedia featured (date in path): https://api.wikimedia.org/feed/v1/wikipedia/en/featured/2026/07/19
- github repo stats: https://api.github.com/repos/OWNER/REPO — 60/hr/IP TOTAL, one connector max at ≥30m

## transit / aviation / space
- planes overhead (best): https://api.adsb.lol/v2/lat/54.64/lon/25.28/dist/50 ; fallback https://opendata.adsb.fi/api/v2/lat/54.64/lon/25.28/dist/50
- iss position: https://api.wheretheiss.at/v1/satellites/25544 (1/s cap, occasionally slow)
- rocket launches: https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=3&mode=list (15/hr — ONE connector, ≥10m)
- nasa apod: https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY (public demo key, 50/day)

## public data
- world bank: https://api.worldbank.org/v2/country/LT/indicator/NY.GDP.MKTP.CD?format=json&mrnev=1 (sometimes slow)
- holidays: https://date.nager.at/api/v3/NextPublicHolidays/LT
- eurostat (JSON-stat, deep paths): https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_manr?format=JSON&lang=EN&geo=LT&coicop=CP00&lastTimePeriod=1
- disease.sh: https://disease.sh/v3/covid-19/all
- noaa tides (US): https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=8443970&product=water_level&datum=MLLW&time_zone=gmt&units=metric&format=json

## fun / daily
- xkcd: https://xkcd.com/info.0.json · zenquotes: https://zenquotes.io/api/today (5/30s)
- advice: https://api.adviceslip.com/advice · catfacts: https://catfact.ninja/fact
- trivia: https://opentdb.com/api.php?amount=1&type=multiple (1/5s)
- useless facts: https://uselessfacts.jsph.pl/api/v2/facts/random
- dog images: https://dog.ceo/api/breeds/image/random · tv schedule: https://api.tvmaze.com/schedule?country=US&date=2026-07-19
- books: https://openlibrary.org/search.json?q=dune&limit=1&fields=title,author_name

## DEAD or key-required — do not use
ergast.com (→jolpi.ca) · quotable.io · boredapi.com (mirror: bored-api.appbrewery.com/random) ·
coincap.io · exchangerate.host · api.coindesk.com · farmsense · balldontlie ·
reddit .json (403s servers) · openaq · restcountries (deprecated) ·
open-notify (http-only) · binance (geo-blocked from this server) · football-data.org
`,

  events: `# events & webhooks — how the human reaches you

interactive blocks (button, toggle, list, input) and artifact \`tipas.emit\`
calls create events routed to the agent named in the block's \`created_by\`
(broadcasts go to everyone). two delivery modes:

- **poll**: \`poll_events\` returns unacked events (≤200); \`ack_events\` when
  handled (or \`auto_ack: true\`). at-least-once, always available.
- **push** (prefer if you have an endpoint): \`set_webhook {url}\` — every
  event is POSTed to you the moment it happens as \`{event}\` with header
  \`X-Tipas-Signature\` = hex(hmac-sha256(rawBody, webhook_secret)). the
  secret is returned ONCE. delivery is single-attempt — keep polling as the
  fallback. \`clear_webhook\` to stop. https external urls only.

typical loop: render a button → human taps → you receive
\`{type:"button_press", payload, block_id}\` → you update blocks/vars in
response. that loop is the whole point of this surface: a live employee
behind the glass.
`,

  design: `# design — how to make it beautiful (the bar is high)

the owner rejects hand-composed widget clutter. principles:

- ONE designed full-page artifact per space beats many small blocks.
- dark theme: page #0a0a0a, cards #161616, 16px radius, hairline borders
  rgba(255,255,255,.08), lowercase labels, ONE accent #3987e5. status colors:
  good #0ca30c, bad #d03b3b (colorblind-validated against #161616).
- host design tokens are injected into every frame: css vars --ink --ink-2
  --muted --card --card-2 --line --grid --baseline --accent --good --bad
  --radius, classes .t-pad .t-label .t-value .t-muted .t-row .t-btn
  .t-btn-ghost. use them — token-using artifacts survive theme changes.
- typography: system font via tokens, or Hanken Grotesk (google fonts loads
  fine in frames). big numbers thin-ish (600-700), labels 11-13px muted.
- charts: thin marks, no chart-junk, one accent for "today/current", the
  rest muted; direct-label selectively; never dual axes.

## importing professional designs (the stitch pipeline)

for real screens, generate with a design tool and import:
1. google stitch (stitch.googleapis.com MCP or api): create ONE project per
   app and generate every screen in it — screens then share a design system.
   prompt the exact palette above + "mobile, minimal, lowercase labels".
2. take the html export, KEEP the whole head (the inline tailwind.config is
   the design system — dropping it collapses the layout), strip any <nav>.
3. swap hardcoded values for {{vars}} bindings.
4. multi-screen: merge screens as .screen sections + tipas.setNav (see canvas
   doc). strip position:fixed from imported headers/CTAs (won't pin in the
   frame) and re-check percentage-height charts whose sizing scripts you
   stripped.
5. ship as one canvas block, full: true, in its own space.

v0/lovable exports work the same way; deployed apps can also be shown via an
\`embed\` block (external https only).
`,

  integrations: `# authed services & bigger tools — bring your own integrations

this surface renders what lands; it holds NO third-party OAuth. for gmail,
notion, strava, stripe, banks etc, the AGENT integrates and pushes results in
via set_vars / POST /api/ingest.

verified paths (mid-2026):
- **composio / rube** — one MCP server fronting ~500 apps:
  \`claude mcp add --transport http rube https://rube.app/mcp\` then browser
  OAuth per app on first use. composio stores/refreshes tokens; free tier
  ~20k tool calls/mo. default for consumer SaaS.
- **pipedream mcp** (mcp.pipedream.com) / **zapier mcp** — same pattern,
  different catalogs and (tighter) free quotas.
- **activepieces / n8n** — self-hosted open-source equivalents; expose their
  actions as MCP tools; tokens stay on the user's box.
- **single-service MCP servers** — official strava/notion/github servers via
  registry.modelcontextprotocol.io or smithery.ai; prefer over aggregators
  when you need one service.
- **CLIs** — for dev services the CLI usually beats MCP (cheaper, reliable):
  gh, stripe, vercel, supabase, gcloud auth once locally. if you have a
  shell, prefer the CLI, then push results here.

rule of thumb: CLI for dev services · MCP aggregator for consumer SaaS ·
add_feed connectors for public keyless data. all three end at the same
place: vars/datasets on the phone.
`,
};

export function readDoc(name, components = []) {
  if (name === 'blocks') return blocksDoc();
  if (DOCS[name]) return DOCS[name];
  return null;
}

export const DOC_INDEX = `## the library — read_doc(name)

- \`blocks\` — every block type with validated props schemas
- \`canvas\` — artifacts, the tipas bridge, sandbox rules, multi-screen apps
- \`components\` — the user's reusable component library
- \`data\` — vars vs datasets, and the plain-HTTP endpoints for scripts
- \`connectors\` — plug public APIs in as data (add_feed mapping language)
- \`apis\` — the verified keyless API catalog (what to connect)
- \`events\` — events, polling vs webhooks, HMAC verification
- \`design\` — the design bar, tokens, and the stitch import pipeline
- \`integrations\` — authed services: composio/rube, MCP registry, CLIs`;

export const DOC_NAMES = ['blocks', 'canvas', 'components', 'data', 'connectors', 'apis', 'events', 'design', 'integrations'];
