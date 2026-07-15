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
   \`tipas.setState\`), events back to you (\`tipas.emit\`), and \`tipas.resize\`.
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
a typical loop: render a \`button\` block → the human taps it → \`poll_events\`
returns \`{ type: "button_press", payload: ... , block_id: ... }\` → you react by
updating blocks.

## block types

${types}
`;
}
