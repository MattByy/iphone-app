import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function Block({ type, props = {}, onUpdate }) {
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
      return <ListBlock props={props} onUpdate={onUpdate} />;
    case 'progress':
      return <ProgressBlock props={props} />;
    case 'toggle':
      return <ToggleBlock props={props} onUpdate={onUpdate} />;
    case 'input':
      return <InputBlock props={props} />;
    case 'card':
      return <CardBlock props={props} />;
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

function ListBlock({ props, onUpdate }) {
  const items = props.items || [];

  const toggle = (idx) => {
    if (!onUpdate) return;
    const next = items.map((item, i) =>
      i === idx ? { ...item, done: !item.done } : item
    );
    onUpdate({ ...props, items: next });
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

function ToggleBlock({ props, onUpdate }) {
  const [val, setVal] = useState(props.value ?? false);

  const handleToggle = () => {
    const next = !val;
    setVal(next);
    if (onUpdate) onUpdate({ ...props, value: next });
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

function InputBlock({ props }) {
  const [val, setVal] = useState('');
  return (
    <div className="bg-[#161616] rounded-2xl border border-white/5 p-5 flex flex-col gap-2">
      {props.label && (
        <label className="text-[12px] text-white/50 uppercase tracking-wider">{props.label}</label>
      )}
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={props.placeholder || ''}
        className="bg-transparent border-b border-white/10 py-2 text-[15px] text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
      />
    </div>
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
