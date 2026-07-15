// single source of truth for what agents may render on this surface.
// imported by the client (Block.jsx renders these types) and by the server
// (api/_lib/store.js validates writes, api/_lib/guide.js generates the agent guide).
// keep this file dependency-free so it works in both bundles.

export const BLOCK_TYPES = {
  stat: {
    summary: 'big number with a small lowercase label',
    props: {
      value: { type: 'string|number', required: true },
      label: { type: 'string', required: true },
    },
    example: { value: '8h 12m', label: 'sleep last night' },
  },
  text: {
    summary: 'a short paragraph of plain text',
    props: {
      body: { type: 'string', required: true },
    },
    example: { body: 'rest day today — focus on hydration and a long walk.' },
  },
  metric: {
    summary: 'large numeric value with unit and label, formatted with thousands separators',
    props: {
      value: { type: 'string|number', required: true },
      label: { type: 'string', required: true },
      unit: { type: 'string' },
    },
    example: { value: 8432, label: 'steps today', unit: 'steps' },
  },
  chart: {
    summary: 'bar chart of name/value pairs',
    props: {
      title: { type: 'string' },
      data: {
        type: 'array',
        required: true,
        items: {
          name: { type: 'string', required: true },
          value: { type: 'number', required: true },
        },
      },
    },
    example: { title: 'weight', data: [{ name: 'mon', value: 82 }, { name: 'tue', value: 81.6 }] },
  },
  list: {
    summary: 'checklist; the human can tap items to toggle them done',
    interactive: 'emits list_item_toggle events when the human taps an item',
    props: {
      title: { type: 'string' },
      items: {
        type: 'array',
        required: true,
        items: {
          text: { type: 'string', required: true },
          done: { type: 'boolean' },
        },
      },
    },
    example: { title: 'today', items: [{ text: 'stretch 10 min', done: false }] },
  },
  progress: {
    summary: 'progress bar toward a max value',
    props: {
      label: { type: 'string', required: true },
      value: { type: 'number', required: true },
      max: { type: 'number', required: true },
      unit: { type: 'string' },
    },
    example: { label: 'water intake', value: 6, max: 8, unit: 'glasses' },
  },
  toggle: {
    summary: 'on/off switch',
    interactive: 'emits toggle_change events when the human flips it',
    props: {
      label: { type: 'string', required: true },
      value: { type: 'boolean' },
    },
    example: { label: 'bedtime reminder', value: true },
  },
  input: {
    summary: 'free-text field; the human types a value and submits',
    interactive: 'emits input_submit events with the typed value',
    props: {
      label: { type: 'string' },
      placeholder: { type: 'string' },
    },
    example: { label: 'log a meal', placeholder: 'what did you eat?' },
  },
  card: {
    summary: 'titled card with a short description',
    props: {
      title: { type: 'string' },
      description: { type: 'string' },
    },
    example: { title: 'weekly review', description: 'you trained 4 of 5 planned days.' },
  },
  divider: {
    summary: 'thin horizontal separator',
    props: {},
    example: {},
  },
  canvas: {
    summary:
      'a full mini-app: you write complete HTML/CSS/JS and it renders in a sandboxed frame on the phone. use this when no widget fits — dashboards, tools, games, anything. inside your code, a `tipas` bridge object gives you: tipas.query(dataset, {limit}) → Promise<rows>, tipas.subscribe(dataset, cb) for live rows, tipas.getState() / tipas.setState(obj) for persistence, tipas.emit(type, payload) to message you, tipas.resize(px) to grow the frame',
    interactive: 'emits whatever events your code sends via tipas.emit',
    props: {
      title: { type: 'string' },
      html: { type: 'string', required: true },
      height: { type: 'number' },
      state: { type: 'object' },
    },
    example: {
      title: 'tap counter',
      height: 200,
      html: '<button id="b" style="font-size:2rem">0</button><script>let n=0;b.onclick=async()=>{b.textContent=++n;await tipas.setState({n});tipas.emit("count",{n})};tipas.getState().then(s=>{n=s.n||0;b.textContent=n})</script>',
    },
  },
  button: {
    summary: 'full-width tappable button that sends an event back to the agent that created it',
    interactive: "emits button_press events (or a custom type via the 'event' prop)",
    props: {
      label: { type: 'string', required: true },
      event: { type: 'string' },
      payload: { type: 'object' },
      style: { type: 'string', enum: ['primary', 'secondary'] },
    },
    example: { label: 'done for today', event: 'workout_done', payload: { day: 'monday' } },
  },
};

const TYPE_CHECKS = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  boolean: (v) => typeof v === 'boolean',
  object: (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
  array: (v) => Array.isArray(v),
  'string|number': (v) => typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v)),
};

function checkShape(shape, value, path, errors) {
  for (const [key, spec] of Object.entries(shape)) {
    const v = value?.[key];
    const at = path ? `${path}.${key}` : key;
    if (v === undefined || v === null) {
      if (spec.required) errors.push(`${at}: required (${spec.type})`);
      continue;
    }
    const check = TYPE_CHECKS[spec.type];
    if (check && !check(v)) {
      errors.push(`${at}: expected ${spec.type}`);
      continue;
    }
    if (spec.enum && !spec.enum.includes(v)) {
      errors.push(`${at}: must be one of ${spec.enum.join(', ')}`);
    }
    if (spec.type === 'array' && spec.items) {
      v.forEach((item, i) => checkShape(spec.items, item, `${at}[${i}]`, errors));
    }
  }
}

// extra unknown props are allowed — only declared shapes are enforced
export function validateBlock(type, props) {
  const def = BLOCK_TYPES[type];
  if (!def) {
    return { ok: false, errors: [`unknown block type "${type}" — valid types: ${Object.keys(BLOCK_TYPES).join(', ')}`] };
  }
  const errors = [];
  checkShape(def.props, props ?? {}, '', errors);
  return errors.length ? { ok: false, errors } : { ok: true };
}

// space icons are emoji only: short, pictographic, no ascii letters/digits
export function isEmojiIcon(s) {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  return t.length > 0 && [...t].length <= 5
    && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(t)
    && !/[A-Za-z0-9]/.test(t);
}
