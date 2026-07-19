import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { z } from 'zod';
import { resolveAgent } from './_lib/auth.js';
import * as store from './_lib/store.js';
import { buildGuide } from './_lib/guide.js';
import { BLOCK_TYPES } from '../src/lib/blockRegistry.js';

const blockTypeEnum = z.enum(Object.keys(BLOCK_TYPES));

const ctxOf = (extra) => extra.authInfo.extra;
const text = (data) => ({
  content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }],
});

// tool handlers throw StoreError with agent-readable messages (including the
// valid schema on validation failures) — surface them as MCP tool errors
const run = (fn) => async (args, extra) => {
  try {
    return text(await fn(args ?? {}, ctxOf(extra)));
  } catch (err) {
    return { content: [{ type: 'text', text: err.message }], isError: true };
  }
};

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'get_app_guide',
      {
        title: 'get app guide',
        description:
          "START HERE. Returns the rules for building on this surface: every block type with its props schema, the user's own component library, design guidance, and how interactive events work. Call this before creating anything.",
        inputSchema: {},
      },
      run(async (_args, ctx) => buildGuide(await store.listComponents(ctx)))
    );

    server.registerTool(
      'define_component',
      {
        title: 'define component',
        description:
          "Add a reusable component to the user's library (or replace it — same name upserts, and every rendered instance hot-swaps live). code is full HTML/CSS/JS like a canvas block; instance props arrive as `tipas.props` and the full tipas bridge (query/subscribe/getState/setState/emit/resize) is available. props_schema declares the instance props using the same shape format as built-in blocks, e.g. {\"title\":{\"type\":\"string\",\"required\":true}}. Instance it with create_block type 'component'.",
        inputSchema: {
          name: z.string().min(1).max(60).describe('lowercase, e.g. "habit-card"'),
          description: z.string().optional(),
          props_schema: z.record(z.any()).optional(),
          code: z.string().min(1),
        },
      },
      run((args, ctx) => store.defineComponent(ctx, args))
    );

    server.registerTool(
      'list_components',
      {
        title: 'list components',
        description: "List the user's component library: names, descriptions and props schemas (no code). Check here before defining a new component — reuse beats duplication.",
        inputSchema: {},
      },
      run((_args, ctx) => store.listComponents(ctx))
    );

    server.registerTool(
      'get_component',
      {
        title: 'get component',
        description: 'Fetch a single component including its full code — use before editing a component someone else (or past you) defined.',
        inputSchema: { name: z.string().min(1).max(60) },
      },
      run((args, ctx) => store.getComponent(ctx, args))
    );

    server.registerTool(
      'delete_component',
      {
        title: 'delete component',
        description: 'Delete a component from the library. Existing instances of it will render an error state — remove or repoint them first.',
        inputSchema: { name: z.string().min(1).max(60) },
      },
      run((args, ctx) => store.deleteComponent(ctx, args))
    );

    server.registerTool(
      'list_spaces',
      {
        title: 'list spaces',
        description:
          "List the human's spaces (screens) with ids, names and icons. Always check this before create_space so you reuse existing spaces instead of duplicating them.",
        inputSchema: {},
      },
      run((_args, ctx) => store.listSpaces(ctx))
    );

    server.registerTool(
      'create_space',
      {
        title: 'create space',
        description:
          'Create a new space (a screen on the phone). Keep spaces focused on one topic. The icon must be a single emoji.',
        inputSchema: {
          name: z.string().min(1).max(60).describe('short lowercase name, e.g. "workouts"'),
          icon: z.string().optional().describe('a single emoji, e.g. "🏋️"'),
          sort_order: z.number().int().optional(),
        },
      },
      run((args, ctx) => store.createSpace(ctx, args))
    );

    server.registerTool(
      'update_space',
      {
        title: 'update space',
        description: 'Rename a space, change its emoji icon, or reorder it.',
        inputSchema: {
          space_id: z.string().uuid(),
          name: z.string().min(1).max(60).optional(),
          icon: z.string().optional().describe('a single emoji'),
          sort_order: z.number().int().optional(),
        },
      },
      run((args, ctx) => store.updateSpace(ctx, args))
    );

    server.registerTool(
      'delete_space',
      {
        title: 'delete space',
        description: 'Delete a space AND every block inside it (cascades). Irreversible — prefer hiding blocks via update_blocks if unsure.',
        inputSchema: { space_id: z.string().uuid() },
      },
      run((args, ctx) => store.deleteSpace(ctx, args))
    );

    server.registerTool(
      'list_blocks',
      {
        title: 'list blocks',
        description:
          'List blocks in a space (pass space_id) or on the home dashboard (omit space_id). Returns full rows including props, sort_order and created_by.',
        inputSchema: { space_id: z.string().uuid().optional() },
      },
      run((args, ctx) => store.listBlocks(ctx, args))
    );

    server.registerTool(
      'create_block',
      {
        title: 'create block',
        description:
          'Create a widget inside a space, or on the home dashboard if space_id is omitted. Props must match the schema for the type — call get_app_guide for schemas. Interactive types (button, toggle, list, input) send events back to you; fetch them with poll_events.',
        inputSchema: {
          space_id: z.string().uuid().optional().describe('omit to place on the home dashboard'),
          type: blockTypeEnum,
          props: z.record(z.any()),
          sort_order: z.number().int().optional(),
        },
      },
      run((args, ctx) => store.createBlock(ctx, args))
    );

    server.registerTool(
      'update_blocks',
      {
        title: 'update blocks',
        description:
          'Batch-edit up to 50 blocks: replace props (full replacement, validated against the block type), move to another space (space_id), reorder (sort_order), or hide/show (visible). Returns per-item results — check each ok flag.',
        inputSchema: {
          updates: z
            .array(
              z.object({
                block_id: z.string().uuid(),
                props: z.record(z.any()).optional(),
                space_id: z.string().uuid().nullable().optional(),
                sort_order: z.number().int().optional(),
                visible: z.boolean().optional(),
              })
            )
            .min(1)
            .max(50),
        },
      },
      run((args, ctx) => store.updateBlocksBatch(ctx, args.updates))
    );

    server.registerTool(
      'delete_block',
      {
        title: 'delete blocks',
        description: 'Permanently delete blocks by id. Prefer update_blocks with visible:false when the human might want them back.',
        inputSchema: { block_ids: z.array(z.string().uuid()).min(1) },
      },
      run((args, ctx) => store.deleteBlocks(ctx, args.block_ids))
    );

    server.registerTool(
      'list_datasets',
      {
        title: 'list datasets',
        description:
          "List the user's datasets — named streams of JSON rows. Datasets are the data plane: you write rows here (or external scripts push them via webhook), and canvas blocks read them live on the phone.",
        inputSchema: {},
      },
      run((_args, ctx) => store.listDatasets(ctx))
    );

    server.registerTool(
      'insert_rows',
      {
        title: 'insert rows',
        description:
          'Append JSON rows to a dataset (created automatically if it does not exist). Each row is an arbitrary JSON object; pass ts to backdate. Canvas blocks subscribed to the dataset update instantly. Max 500 rows per call.',
        inputSchema: {
          dataset: z.string().min(1).max(60).describe('lowercase name, e.g. "polymarket-odds"'),
          rows: z.array(z.record(z.any())).min(1).max(500),
        },
      },
      run((args, ctx) => store.insertRows(ctx, args))
    );

    server.registerTool(
      'query_rows',
      {
        title: 'query rows',
        description: 'Read rows from a dataset, newest first. Optionally filter with since (ISO timestamp).',
        inputSchema: {
          dataset: z.string().min(1).max(60),
          limit: z.number().int().min(1).max(1000).optional(),
          since: z.string().optional(),
        },
      },
      run((args, ctx) => store.queryRows(ctx, args))
    );

    server.registerTool(
      'delete_dataset',
      {
        title: 'delete dataset',
        description: 'Delete a dataset AND all its rows. Irreversible.',
        inputSchema: { dataset: z.string().min(1).max(60) },
      },
      run((args, ctx) => store.deleteDataset(ctx, args))
    );

    server.registerTool(
      'set_vars',
      {
        title: 'set vars',
        description:
          'Set live named variables (key → any JSON value, ≤10kB each). Every artifact binding a variable — {{name}} in its HTML, data-var attributes, or tipas.onVar — updates on the phone instantly. Scripts can set the same vars over plain HTTP: POST /api/vars with your bearer token and a JSON object body. Use vars for current values; use datasets for history/streams.',
        inputSchema: { vars: z.record(z.any()).describe('e.g. {"steps": 8432, "weather": "22° sunny"}') },
      },
      run((args, ctx) => store.setVars(ctx, args.vars))
    );

    server.registerTool(
      'get_vars',
      {
        title: 'get vars',
        description: 'Read live variables (all, or a subset by key) with who last set them and when.',
        inputSchema: { keys: z.array(z.string()).optional() },
      },
      run((args, ctx) => store.getVars(ctx, args.keys))
    );

    const feedConfigShape = {
      name: z.string().min(1).max(40).describe('lowercase, e.g. "btc" or "vilnius-weather"'),
      url: z.string().url().describe('public https JSON API to poll'),
      interval_minutes: z.number().int().min(5).max(1440).optional().describe('default 10'),
      map: z
        .array(z.record(z.any()))
        .min(1)
        .describe(
          'extraction entries. each: {"var":"btc_price","path":"bitcoin.usd","round":0}. field spec ops: path (dot-path), parse (JSON.parse stringified field), index, mul, round, lookup+default (code→label map), template ("{{a}} of {{b.c}}" — resolves earlier vars first, then response paths). list extractor: {"var":"top","path":"","pick":{"limit":3,"fields":{"q":"question","pct":{"path":"outcomePrices","parse":true,"index":0,"mul":100,"round":0}}}}'
        ),
      dataset: z
        .record(z.any())
        .optional()
        .describe('append history each run: {"name":"market-ticks","row":{"btc":"bitcoin.usd"}}'),
      expand: z
        .record(z.any())
        .optional()
        .describe('when the response is an array of ids: {"url":"https://api.../item/{{item}}.json","limit":5} fetches each and continues with the item array'),
    };

    server.registerTool(
      'add_feed',
      {
        title: 'add feed',
        description:
          'Connect an external API to the app as a live connector — NO code or deploy involved. The runner polls the url on your interval and maps the JSON response into live vars (and optionally dataset rows) that artifacts bind. Same name upserts. ALWAYS preview with test_feed first. Only public https JSON APIs; keyless APIs work best (open-meteo, coingecko, frankfurter, polymarket gamma, hn...).',
        inputSchema: feedConfigShape,
      },
      run((args, ctx) => store.addFeed(ctx, args))
    );

    server.registerTool(
      'list_feeds',
      {
        title: 'list feeds',
        description: "List the user's connectors with their interval, last run time and last status (ok or the error).",
        inputSchema: {},
      },
      run((_args, ctx) => store.listFeeds(ctx))
    );

    server.registerTool(
      'delete_feed',
      {
        title: 'delete feed',
        description: 'Remove a connector. Its vars keep their last value; nothing refreshes them anymore.',
        inputSchema: { name: z.string().min(1).max(40) },
      },
      run((args, ctx) => store.deleteFeed(ctx, args))
    );

    server.registerTool(
      'test_feed',
      {
        title: 'test feed',
        description:
          'Dry-run a connector config (or a saved feed by name only): fetches the API once and returns exactly which vars/rows the mapping extracts, WITHOUT saving or writing anything. Use before add_feed.',
        inputSchema: {
          name: z.string().min(1).max(40).optional().describe('saved feed to test'),
          url: z.string().url().optional(),
          map: z.array(z.record(z.any())).optional(),
          dataset: z.record(z.any()).optional(),
          expand: z.record(z.any()).optional(),
        },
      },
      run(async (args, ctx) => {
        let feed = args;
        if (!args.url) {
          feed = await store.getFeed(ctx, args.name ?? '');
          if (!feed) throw new Error(`feed "${args.name}" not found — pass a full config or call list_feeds`);
        }
        const { runFeed } = await import('./_lib/feedRunner.js');
        return runFeed(feed);
      })
    );

    server.registerTool(
      'poll_events',
      {
        title: 'poll events',
        description:
          'Fetch unacked events from the human: button presses, toggle changes, list item toggles, input submissions. You receive events for blocks you created plus broadcasts. Ack them with ack_events (or pass auto_ack) so they are not redelivered.',
        inputSchema: {
          limit: z.number().int().min(1).max(200).optional(),
          auto_ack: z.boolean().optional(),
        },
      },
      run((args, ctx) => store.pollEvents(ctx, args))
    );

    server.registerTool(
      'set_webhook',
      {
        title: 'set webhook',
        description:
          'Register an https endpoint to receive your events as pushes instead of polling. Each event targeted at you (or broadcast) is POSTed as {event} with an X-Tipas-Signature header = hex(hmac-sha256(rawBody, webhook_secret)). The secret is returned once. Delivery is single-attempt — keep polling poll_events as the reliable fallback.',
        inputSchema: { url: z.string().url() },
      },
      run((args, ctx) => store.setWebhook(ctx, args))
    );

    server.registerTool(
      'clear_webhook',
      {
        title: 'clear webhook',
        description: 'Remove your registered webhook; events become poll-only again.',
        inputSchema: {},
      },
      run((_args, ctx) => store.clearWebhook(ctx))
    );

    server.registerTool(
      'ack_events',
      {
        title: 'ack events',
        description: 'Mark events as handled so poll_events stops returning them.',
        inputSchema: { event_ids: z.array(z.string().uuid()).min(1) },
      },
      run((args, ctx) => store.ackEvents(ctx, args.event_ids))
    );
  },
  {},
  { basePath: '/api', disableSse: true, maxDuration: 60 }
);

const verifyToken = async (_req, bearerToken) => {
  const agent = await resolveAgent(bearerToken);
  if (!agent) return undefined;
  return {
    token: bearerToken,
    scopes: ['agent'],
    clientId: agent.name,
    extra: { userId: agent.user_id, agentId: agent.id, agentName: agent.name },
  };
};

const authed = withMcpAuth(handler, verifyToken, { required: true });

export { authed as GET, authed as POST, authed as DELETE };
