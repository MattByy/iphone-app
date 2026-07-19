import { getServiceClient } from './_lib/supabase.js';
import * as store from './_lib/store.js';

// live feed refresher: pulls free public APIs (weather, air, crypto, fx,
// polymarket, hackernews) and lands them as vars + dataset rows, so artifacts
// bound to {{vars}} / subscribed to datasets update on the phone in realtime.
// called on a schedule by pg_cron (same vault-secret auth as /api/dispatch);
// can also be hit manually: curl -X POST -H "X-Dispatch-Secret: ..."

const LAT = 54.687; // Vilnius — change to move the weather feeds
const LON = 25.28;

// wmo weather codes → glanceable phone copy
const WMO = {
  0: ['☀️', 'clear'], 1: ['🌤️', 'mostly clear'], 2: ['⛅', 'partly cloudy'], 3: ['☁️', 'overcast'],
  45: ['🌫️', 'fog'], 48: ['🌫️', 'rime fog'], 51: ['🌦️', 'light drizzle'], 53: ['🌦️', 'drizzle'],
  55: ['🌧️', 'heavy drizzle'], 61: ['🌧️', 'light rain'], 63: ['🌧️', 'rain'], 65: ['🌧️', 'heavy rain'],
  66: ['🌧️', 'freezing rain'], 67: ['🌧️', 'freezing rain'], 71: ['🌨️', 'light snow'], 73: ['🌨️', 'snow'],
  75: ['❄️', 'heavy snow'], 77: ['❄️', 'snow grains'], 80: ['🌦️', 'light showers'], 81: ['🌧️', 'showers'],
  82: ['⛈️', 'heavy showers'], 85: ['🌨️', 'snow showers'], 86: ['🌨️', 'snow showers'],
  95: ['⛈️', 'thunderstorm'], 96: ['⛈️', 'thunderstorm + hail'], 99: ['⛈️', 'thunderstorm + hail'],
};

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function weather() {
  const d = await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m' +
      '&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1'
  );
  const [emoji, desc] = WMO[d.current.weather_code] ?? ['🌡️', '—'];
  return {
    wx_temp: Math.round(d.current.temperature_2m),
    wx_feels: Math.round(d.current.apparent_temperature),
    wx_emoji: emoji,
    wx_desc: desc,
    wx_wind: Math.round(d.current.wind_speed_10m),
    wx_hum: d.current.relative_humidity_2m,
    wx_hi: Math.round(d.daily.temperature_2m_max[0]),
    wx_lo: Math.round(d.daily.temperature_2m_min[0]),
  };
}

async function air() {
  const d = await getJson(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}&current=european_aqi,pm2_5`
  );
  return { wx_aqi: Math.round(d.current.european_aqi), wx_pm25: Math.round(d.current.pm2_5) };
}

async function crypto() {
  try {
    // one keyless call, price + 24h change, not geo-blocked from vercel
    const d = await getJson(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'
    );
    return {
      btc_price: Math.round(d.bitcoin.usd),
      btc_chg: Math.round(d.bitcoin.usd_24h_change * 10) / 10,
      eth_price: Math.round(d.ethereum.usd),
      eth_chg: Math.round(d.ethereum.usd_24h_change * 10) / 10,
    };
  } catch {
    // coingecko rate-limited → coinbase spot (price only, no 24h change)
    const spot = async (sym) => {
      const d = await getJson(`https://api.coinbase.com/v2/prices/${sym}-USD/spot`);
      return Math.round(parseFloat(d.data.amount));
    };
    const [btc, eth] = await Promise.all([spot('BTC'), spot('ETH')]);
    return { btc_price: btc, btc_chg: null, eth_price: eth, eth_chg: null };
  }
}

async function fx() {
  const d = await getJson('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP');
  return { fx_eurusd: d.rates.USD, fx_eurgbp: d.rates.GBP };
}

async function polymarket() {
  const list = await getJson('https://gamma-api.polymarket.com/markets?closed=false&order=volume24hr&ascending=false&limit=5');
  const markets = (list ?? [])
    .map((m) => {
      let outcomes = [], prices = [];
      try { outcomes = JSON.parse(m.outcomes); prices = JSON.parse(m.outcomePrices); } catch { /* skip */ }
      const p = parseFloat(prices[0]);
      if (!m.question || !outcomes[0] || !(p >= 0)) return null;
      return {
        q: m.question.slice(0, 90),
        outcome: String(outcomes[0]).slice(0, 40),
        pct: Math.round(p * 100),
        vol: Math.round(parseFloat(m.volume24hr ?? 0)),
      };
    })
    .filter(Boolean)
    .slice(0, 3);
  return { pm_markets: markets };
}

async function hackernews() {
  const ids = (await getJson('https://hacker-news.firebaseio.com/v0/topstories.json')).slice(0, 5);
  const items = await Promise.all(
    ids.map((i) => getJson(`https://hacker-news.firebaseio.com/v0/item/${i}.json`).catch(() => null))
  );
  return {
    hn_top: items
      .filter(Boolean)
      .map((it) => ({ title: String(it.title ?? '').slice(0, 90), score: it.score ?? 0 })),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!process.env.DISPATCH_SECRET || req.headers['x-dispatch-secret'] !== process.env.DISPATCH_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // single-user install: feeds belong to the account the agents belong to
  const sb = getServiceClient();
  const { data: agent, error } = await sb.from('agents').select('user_id').limit(1).single();
  if (error || !agent) return res.status(500).json({ error: 'no agents — nothing to feed' });
  const ctx = { userId: agent.user_id, agentName: 'feeds' };

  const sources = { weather, air, crypto, fx, polymarket, hackernews };
  const vars = {};
  const status = {};
  await Promise.all(
    Object.entries(sources).map(async ([name, fn]) => {
      try {
        Object.assign(vars, await fn());
        status[name] = 'ok';
      } catch (err) {
        status[name] = err.message; // one dead API must not stall the rest
      }
    })
  );

  // the home dashboard's today card binds {{weather}} — keep it live too
  if (typeof vars.wx_temp === 'number') vars.weather = `${vars.wx_temp}° ${vars.wx_desc}`;
  vars.feeds_updated = new Date().toISOString();
  await store.setVars(ctx, vars);

  // price history for sparklines (only when crypto actually refreshed)
  if (typeof vars.btc_price === 'number') {
    await store.insertRows(ctx, {
      dataset: 'market-ticks',
      rows: [{ btc: vars.btc_price, eth: vars.eth_price ?? null, t: vars.feeds_updated }],
    });
  }

  console.log(`[feeds] ${Object.entries(status).map(([k, v]) => `${k}:${v}`).join(' ')}`);
  return res.status(200).json({ status, vars: Object.keys(vars).length });
}
