import React, { useState, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { getDatasetByName, getDatasetRows, subscribeToDatasetRows, getComponentByName, subscribeToComponent } from '@/lib/db';

// onUpdate persists new props; onEvent(type, payload) routes a human
// interaction back to the agent that created the block (via the events table)
export default function Block({ type, props = {}, onUpdate, onEvent }) {
  switch (type) {
    case 'stat':
      return <StatBlock props={props} />;
    case 'text':
      return <TextBlock props={props} />;
    case 'metric':
      return <MetricBlock props={props} />;
    case 'chart':
      return <ChartBlock props={props} />;
    case 'list':
      return <ListBlock props={props} onUpdate={onUpdate} onEvent={onEvent} />;
    case 'progress':
      return <ProgressBlock props={props} />;
    case 'toggle':
      return <ToggleBlock props={props} onUpdate={onUpdate} onEvent={onEvent} />;
    case 'input':
      return <InputBlock props={props} onEvent={onEvent} />;
    case 'card':
      return <CardBlock props={props} />;
    case 'button':
      return <ButtonBlock props={props} onEvent={onEvent} />;
    case 'canvas':
      return <CanvasBlock props={props} onUpdate={onUpdate} onEvent={onEvent} />;
    case 'component':
      return <ComponentBlock props={props} onUpdate={onUpdate} onEvent={onEvent} />;
    case 'divider':
      return <hr className="border-white/10" />;
    default:
      return null;
  }
}

function StatBlock({ props }) {
  return (
    <div className="bg-[#161616] rounded-2xl border border-white/5 p-5 flex flex-col gap-1">
      <span className="text-[32px] font-semibold text-white leading-none tracking-tight">
        {props.value ?? '—'}
      </span>
      <span className="text-[13px] text-white/50 lowercase">{props.label}</span>
    </div>
  );
}

function TextBlock({ props }) {
  return <p className="text-white/80 text-sm">{props.body ?? props.content}</p>;
}

function MetricBlock({ props }) {
  const formatted = typeof props.value === 'number' ? props.value.toLocaleString() : props.value;
  return (
    <div className="bg-[#161616] rounded-2xl border border-white/5 p-5 flex flex-col gap-1">
      <span className="text-[42px] font-semibold text-white leading-none tracking-tight">
        {formatted}
      </span>
      <span className="text-[13px] text-white/50 lowercase">
        {props.unit ? `${props.unit} · ` : ''}{props.label}
      </span>
    </div>
  );
}

function ChartBlock({ props }) {
  const data = props.data || [];
  return (
    <div className="bg-[#161616] rounded-2xl border border-white/5 p-5 flex flex-col gap-4">
      {props.title && (
        <h3 className="text-[16px] text-white lowercase">{props.title}</h3>
      )}
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 12 }}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar dataKey="value" fill="rgba(255,255,255,0.85)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ListBlock({ props, onUpdate, onEvent }) {
  const items = props.items || [];

  const toggle = (idx) => {
    const next = items.map((item, i) =>
      i === idx ? { ...item, done: !item.done } : item
    );
    if (onUpdate) onUpdate({ ...props, items: next });
    if (onEvent) {
      onEvent('list_item_toggle', {
        title: props.title,
        index: idx,
        text: items[idx]?.text,
        done: !items[idx]?.done,
      });
    }
  };

  return (
    <div className="bg-[#161616] rounded-2xl border border-white/5 p-5 flex flex-col gap-3">
      {props.title && (
        <h3 className="text-[14px] font-medium text-white/50 uppercase tracking-wider text-[11px]">
          {props.title}
        </h3>
      )}
      <ul className="flex flex-col gap-3">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => toggle(idx)}
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ color: item.done ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)' }}
            >
              {item.done ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            <span
              className={`text-[14px] ${
                item.done ? 'line-through text-white/30' : 'text-white'
              }`}
            >
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProgressBlock({ props }) {
  const pct = props.max > 0 ? Math.min(100, (props.value / props.max) * 100) : 0;
  return (
    <div className="bg-[#161616] rounded-2xl border border-white/5 p-5 flex flex-col gap-3">
      <div className="flex justify-between items-baseline">
        <span className="text-[14px] text-white lowercase">{props.label}</span>
        <span className="text-[13px] text-white/50">
          {props.value}/{props.max}
          {props.unit ? ` ${props.unit}` : ''}
        </span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ToggleBlock({ props, onUpdate, onEvent }) {
  const [val, setVal] = useState(props.value ?? false);

  const handleToggle = () => {
    const next = !val;
    setVal(next);
    if (onUpdate) onUpdate({ ...props, value: next });
    if (onEvent) onEvent('toggle_change', { label: props.label, value: next });
  };

  return (
    <div className="bg-[#161616] rounded-2xl border border-white/5 p-5 flex items-center justify-between">
      <span className="text-[14px] text-white lowercase">{props.label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={val}
        onClick={handleToggle}
        className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors"
        style={{
          backgroundColor: val ? '#ffffff' : 'rgba(255,255,255,0.1)',
        }}
      >
        <span
          className="absolute top-1 w-4 h-4 rounded-full transition-transform"
          style={{
            left: '4px',
            transform: val ? 'translateX(20px)' : 'translateX(0)',
            backgroundColor: val ? '#0a0a0a' : 'rgba(255,255,255,0.6)',
          }}
        />
      </button>
    </div>
  );
}

function InputBlock({ props, onEvent }) {
  const [val, setVal] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const value = val.trim();
    if (!value) return;
    if (onEvent) onEvent('input_submit', { label: props.label, value });
    setVal('');
  };

  return (
    <form
      onSubmit={submit}
      className="bg-[#161616] rounded-2xl border border-white/5 p-5 flex flex-col gap-2"
    >
      {props.label && (
        <label className="text-[12px] text-white/50 uppercase tracking-wider">{props.label}</label>
      )}
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={props.placeholder || ''}
        className="bg-transparent border-b border-white/10 py-2 text-[15px] text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
      />
    </form>
  );
}

function CardBlock({ props }) {
  return (
    <div className="bg-white/[0.04] rounded-2xl border border-white/5 p-5 flex flex-col gap-2">
      {props.title && <h3 className="text-[16px] text-white">{props.title}</h3>}
      {props.description && (
        <p className="text-[13px] text-white/50">{props.description}</p>
      )}
    </div>
  );
}

// the bridge injected into every canvas frame. runs inside a null-origin
// sandbox, so agent code can only reach the app through these postMessage ops.
const CANVAS_BRIDGE = `<script>
(function () {
  var pending = {}, seq = 0, subs = {};
  function call(op, args) {
    return new Promise(function (resolve, reject) {
      var id = ++seq;
      pending[id] = { resolve: resolve, reject: reject };
      parent.postMessage(Object.assign({ tipas: true, id: id, op: op }, args), '*');
    });
  }
  window.tipas = {
    props: window.__TIPAS_PROPS__ || {},
    query: function (dataset, opts) { return call('query', { dataset: dataset, limit: (opts || {}).limit }); },
    subscribe: function (dataset, cb) { (subs[dataset] = subs[dataset] || []).push(cb); return call('subscribe', { dataset: dataset }); },
    getState: function () { return call('getState', {}); },
    setState: function (state) { return call('setState', { state: state }); },
    emit: function (type, payload) { return call('emit', { type: type, payload: payload }); },
    resize: function (px) { parent.postMessage({ tipas: true, op: 'resize', height: px }, '*'); },
  };
  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || !m.tipas) return;
    if (m.sub) { (subs[m.sub] || []).forEach(function (cb) { cb(m.rows); }); return; }
    var p = pending[m.id];
    if (!p) return;
    delete pending[m.id];
    if (m.error) p.reject(new Error(m.error)); else p.resolve(m.result);
  });
})();
</script>`;

function CanvasBlock({ props, onUpdate, onEvent }) {
  return (
    <CanvasCore
      title={props.title}
      html={props.html}
      defaultHeight={props.height}
      blockProps={props}
      onUpdate={onUpdate}
      onEvent={onEvent}
    />
  );
}

// a 'component' block instances code from the user's component library.
// the code is fetched by name and hot-swapped live when the component changes;
// instance props are injected as tipas.props inside the frame.
function ComponentBlock({ props, onUpdate, onEvent }) {
  const [comp, setComp] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;
    (async () => {
      try {
        const c = await getComponentByName(props.component);
        if (cancelled) return;
        if (!c) return setMissing(true);
        setComp(c);
        unsub = subscribeToComponent(c.id, (payload) => {
          if (payload.new?.code) setComp(payload.new);
        });
      } catch (err) {
        console.error('[ComponentBlock] load error', err);
        setMissing(true);
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, [props.component]);

  if (missing) {
    return (
      <div className="bg-[#161616] rounded-2xl border border-white/5 p-5">
        <p className="text-[13px] text-white/30 lowercase">component "{props.component}" not found</p>
      </div>
    );
  }
  if (!comp) return null;

  return (
    <CanvasCore
      html={comp.code}
      injected={props.props ?? {}}
      defaultHeight={props.height}
      blockProps={props}
      onUpdate={onUpdate}
      onEvent={onEvent}
    />
  );
}

function CanvasCore({ title, html, injected, defaultHeight, blockProps, onUpdate, onEvent }) {
  const iframeRef = useRef(null);
  const propsRef = useRef(blockProps);
  propsRef.current = blockProps;
  const [height, setHeight] = useState(defaultHeight ?? 320);

  useEffect(() => {
    const datasetCache = {};
    const unsubs = [];

    const resolveDataset = async (name) => {
      if (!datasetCache[name]) {
        const ds = await getDatasetByName(name);
        if (!ds) throw new Error(`dataset "${name}" not found`);
        datasetCache[name] = ds;
      }
      return datasetCache[name];
    };

    const reply = (msg) => {
      iframeRef.current?.contentWindow?.postMessage({ tipas: true, ...msg }, '*');
    };

    const onMessage = async (e) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const m = e.data;
      if (!m || !m.tipas) return;

      if (m.op === 'resize') {
        setHeight(Math.max(80, Math.min(1200, Number(m.height) || 320)));
        return;
      }

      try {
        if (m.op === 'query') {
          const ds = await resolveDataset(m.dataset);
          const rows = await getDatasetRows(ds.id, Math.min(m.limit ?? 100, 500));
          reply({ id: m.id, result: rows });
        } else if (m.op === 'subscribe') {
          const ds = await resolveDataset(m.dataset);
          unsubs.push(
            subscribeToDatasetRows(ds.id, (payload) => {
              reply({ sub: m.dataset, rows: [{ id: payload.new.id, data: payload.new.data, ts: payload.new.ts }] });
            })
          );
          reply({ id: m.id, result: true });
        } else if (m.op === 'getState') {
          reply({ id: m.id, result: propsRef.current.state ?? {} });
        } else if (m.op === 'setState') {
          if (onUpdate) onUpdate({ ...propsRef.current, state: m.state ?? {} });
          reply({ id: m.id, result: true });
        } else if (m.op === 'emit') {
          if (onEvent) onEvent(m.type || 'canvas_event', m.payload ?? {});
          reply({ id: m.id, result: true });
        }
      } catch (err) {
        reply({ id: m.id, error: err.message });
      }
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      unsubs.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  // <-escape so agent-provided JSON can never break out of the script tag
  const injectedJson = JSON.stringify(injected ?? {}).replace(/</g, '\\u003c');
  const srcdoc = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;background:transparent;color:#fff;font-family:-apple-system,system-ui,sans-serif}</style>
<script>window.__TIPAS_PROPS__ = ${injectedJson};</script>
${CANVAS_BRIDGE}</head><body>${html ?? ''}</body></html>`;

  return (
    <div className="bg-[#161616] rounded-2xl border border-white/5 overflow-hidden flex flex-col">
      {title && (
        <h3 className="text-[13px] text-white/50 lowercase px-5 pt-4">{title}</h3>
      )}
      <iframe
        ref={iframeRef}
        title={title || 'canvas'}
        sandbox="allow-scripts"
        srcDoc={srcdoc}
        style={{ width: '100%', height, border: 'none', display: 'block' }}
      />
    </div>
  );
}

function ButtonBlock({ props, onEvent }) {
  const [sent, setSent] = useState(false);
  const primary = (props.style ?? 'primary') === 'primary';

  const handlePress = () => {
    if (onEvent) onEvent(props.event || 'button_press', { label: props.label, ...(props.payload || {}) });
    setSent(true);
    setTimeout(() => setSent(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={handlePress}
      className={`w-full rounded-2xl p-4 text-[15px] font-medium lowercase transition-all active:scale-[0.98] ${
        primary
          ? 'bg-white text-[#0a0a0a] hover:bg-white/90'
          : 'bg-[#161616] text-white border border-white/10 hover:border-white/25'
      }`}
    >
      {sent ? 'sent ✓' : props.label}
    </button>
  );
}
