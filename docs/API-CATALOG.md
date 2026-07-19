# keyless API catalog — verified connectors for agents

APIs that work with `add_feed` **today**: public, https, JSON, no key, no
signup. Everything below was live-verified 2026-07-19 (two independent passes,
server-side curl). Entries marked ✔tf were additionally dry-run through
`test_feed` with the config shown. Agents: always `test_feed` before
`add_feed` — APIs drift.

Conventions: poll gently (suggested minimum intervals below), one connector
per concern, lowercase var names. The runner sends an identifying User-Agent
automatically (met.no, wikimedia, openlibrary require one).

## weather / environment / astronomy

| API | sample URL | data | notes |
|---|---|---|---|
| Open-Meteo forecast | `https://api.open-meteo.com/v1/forecast?latitude=54.687&longitude=25.28&current=temperature_2m,weather_code,uv_index` | temp, wind, UV, WMO code | 10k/day free; ≥10 min |
| Open-Meteo air | `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=54.687&longitude=25.28&current=european_aqi,pm2_5` | EAQI, PM2.5, pollen | ≥30 min |
| MET Norway | `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=54.687&lon=25.28` | premium global forecast | needs UA (runner sends one) |
| SunriseSunset.io | `https://api.sunrisesunset.io/json?lat=54.687&lng=25.28` | sun times, local tz | daily |
| USGS earthquakes | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson` | significant quakes | `features.0.properties.place/mag` |
| NOAA space weather | `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json` | Kp index → aurora odds | array; big — map carefully |

## crypto / fx / markets

| API | sample URL | data | notes |
|---|---|---|---|
| CoinGecko | `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true` | price + 24h % | ≥10 min (IP-limited) |
| Kraken | `https://api.kraken.com/0/public/Ticker?pair=XBTUSD` | exchange ticker | path `result.XXBTZUSD.c.0` |
| Coinbase | `https://api.coinbase.com/v2/prices/BTC-USD/spot` | spot price | ~10k/hr |
| mempool.space | `https://mempool.space/api/v1/fees/recommended` | btc network fees | ✔tf: `fastestFee` |
| DeFiLlama | `https://api.llama.fi/v2/chains` + `https://coins.llama.fi/prices/current/coingecko:bitcoin` | TVL, token prices | generous |
| Fear & Greed | `https://api.alternative.me/fng/` | crypto sentiment | ✔tf: `data.0.value`, `data.0.value_classification` |
| Frankfurter | `https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP` | ECB fx | `.app` domain is dead — use `.dev`; ≥60 min |
| open.er-api.com | `https://open.er-api.com/v6/latest/USD` | 160+ fx rates | daily data |
| fawazahmed0 (CDN) | `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json` | 200+ fiat+crypto | CDN = effectively unlimited |
| Elering NPS | `https://dashboard.elering.ee/api/nps/price/LT/current` | Baltic electricity spot €/MWh (LT/EE/LV/FI) | ✔tf: `data.0.price`, `mul: 0.1` → ct/kWh |
| UK Carbon Intensity | `https://api.carbonintensity.org.uk/intensity` | grid gCO₂/kWh | UK only |

Truly keyless **stock** quotes are extinct in 2026 (Yahoo needs cookies, IEX
dead, everything else key-walled) — crypto/fx above or agent-side tools.

## prediction markets

| API | sample URL | data | notes |
|---|---|---|---|
| Polymarket gamma | `https://gamma-api.polymarket.com/markets?closed=false&order=volume24hr&ascending=false&limit=5` | markets, odds, volume | `outcomes`/`outcomePrices` are **stringified JSON** → `parse: true` |
| Kalshi | `https://api.elections.kalshi.com/trade-api/v2/markets?limit=5` | regulated US markets | read is keyless |
| Manifold | `https://api.manifold.markets/v0/markets?limit=5` | play-money markets | 500/min |

## sports

| API | sample URL | data | notes |
|---|---|---|---|
| ESPN (hidden) | `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard` | live scores | swap path: `football/nfl`, `soccer/eng.1`, `hockey/nhl`, `baseball/mlb`; unofficial but long-lived |
| OpenF1 | `https://api.openf1.org/v1/sessions?year=2026&session_type=Race` | F1 data | keyless = slightly delayed; realtime is paid |
| Jolpica | `https://api.jolpi.ca/ergast/f1/current/next.json` | F1 schedule/standings | ergast.com is DEAD; this is the successor; 500/hr |
| TheSportsDB | `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4328` | fixtures (4328=EPL) | public keys `3`/`123`; livescores premium |

## news / content

| API | sample URL | data | notes |
|---|---|---|---|
| HN Algolia | `https://hn.algolia.com/api/v1/search?tags=front_page` | front page, titles+points **in one call** | prefer over firebase for connectors; 10k/hr |
| HN Firebase | `https://hacker-news.firebaseio.com/v0/topstories.json` | id list → `expand` | the seeded connector uses this |
| Lobsters | `https://lobste.rs/hottest.json` | tech links, one call | ≥10 min |
| dev.to | `https://dev.to/api/articles?per_page=5&top=7` | top articles | generous |
| Wikimedia featured | `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/2026/07/19` | article/photo of day, on-this-day | date in path — agent-push daily fits better |
| GitHub | `https://api.github.com/repos/torvalds/linux` | stars/forks/issues | **60/hr/IP total** — one repo connector max, ≥30 min |

## transit / aviation / space

| API | sample URL | data | notes |
|---|---|---|---|
| adsb.lol | `https://api.adsb.lol/v2/lat/54.64/lon/25.28/dist/50` | aircraft overhead now | best keyless plane feed |
| adsb.fi | `https://opendata.adsb.fi/api/v2/lat/54.64/lon/25.28/dist/50` | same | ~50/min, fallback |
| OpenSky | `https://opensky-network.org/api/states/all?lamin=54.5&lomin=25.0&lamax=54.9&lomax=25.5` | aircraft states | ~400 credits/day — prefer adsb.lol |
| Where the ISS at | `https://api.wheretheiss.at/v1/satellites/25544` | ISS position | 1/s cap, occasionally slow |
| Launch Library 2 | `https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=3&mode=list` | next rocket launches | **15/hr** — single connector ≥10 min only |
| NASA APOD | `https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY` | astronomy pic of the day | DEMO_KEY is a public constant (50/day) — hourly ok |

## public data

| API | sample URL | data | notes |
|---|---|---|---|
| World Bank | `https://api.worldbank.org/v2/country/LT/indicator/NY.GDP.MKTP.CD?format=json&mrnev=1` | any indicator/country | occasionally slow from serverless |
| Nager.Date | `https://date.nager.at/api/v3/NextPublicHolidays/LT` | public holidays | also `/CountryInfo/LT` |
| Eurostat | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_manr?format=JSON&lang=EN&geo=LT&coicop=CP00&lastTimePeriod=1` | EU inflation etc. | JSON-stat: deep paths like `value.0` |
| disease.sh | `https://disease.sh/v3/covid-19/all` | epidemiological aggregates | alive, updating |
| NOAA tides | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=8443970&product=water_level&datum=MLLW&time_zone=gmt&units=metric&format=json` | water level | US stations only |

## fun / daily

| API | sample URL | notes |
|---|---|---|
| xkcd | `https://xkcd.com/info.0.json` | daily |
| ZenQuotes | `https://zenquotes.io/api/today` | 5 req/30s |
| Advice Slip | `https://api.adviceslip.com/advice` | fine |
| catfact.ninja | `https://catfact.ninja/fact` | fine |
| Open Trivia DB | `https://opentdb.com/api.php?amount=1&type=multiple` | 1 req/5s |
| Useless Facts | `https://uselessfacts.jsph.pl/api/v2/facts/random` | fine |
| Dog CEO | `https://dog.ceo/api/breeds/image/random` | image URLs |
| TVmaze | `https://api.tvmaze.com/schedule?country=US&date=2026-07-19` | 20 req/10s |
| Open Library | `https://openlibrary.org/search.json?q=dune&limit=1&fields=title,author_name` | books |
| Bored API mirror | `https://bored-api.appbrewery.com/random` | original is dead |

## confirmed DEAD or key-required (verified — don't waste calls)

ergast.com (→ jolpi.ca) · quotable.io (cert expired) · boredapi.com (DNS gone)
· coincap.io (v2 gone, v3 keyed) · exchangerate.host (keyed) ·
api.coindesk.com BPI (gone) · farmsense (gone) · balldontlie (keyed) ·
**reddit .json (403s server IPs)** · OpenAQ v3 (keyed) · **restcountries.com
(deprecated/in-migration — avoid)** · open-notify ISS (http-only) ·
**binance (works, but geo-blocks US-cloud IPs — use coingecko/kraken)** ·
football-data.org (keyed) · wttr.in (text/plain content-type, flaky — backup only)

## ready-to-use configs (test_feed-verified)

Electricity price on the phone (Lithuania):

```json
{ "name": "power-price", "url": "https://dashboard.elering.ee/api/nps/price/LT/current",
  "interval_minutes": 30,
  "map": [
    { "var": "power_price", "path": "data.0.price", "mul": 0.1, "round": 1 },
    { "var": "power_label", "template": "{{power_price}} ct/kWh" } ] }
```

Crypto sentiment:

```json
{ "name": "fear-greed", "url": "https://api.alternative.me/fng/", "interval_minutes": 60,
  "map": [
    { "var": "fear_greed", "path": "data.0.value" },
    { "var": "fear_greed_label", "path": "data.0.value_classification" } ] }
```

## authed APIs (Gmail, Notion, Strava, Stripe, banks…)

The connector runner is keyless-only (for now). For authed services the AGENT
does the fetching and pushes results into the app with `set_vars` /
`POST /api/ingest` — the surface only renders what lands. Verified options
(mid-2026):

- **Composio / Rube** — one MCP server fronting ~500 apps. Claude Code setup is
  one command: `claude mcp add --transport http rube https://rube.app/mcp`,
  then a browser OAuth per app on first use. Composio holds and refreshes the
  third-party tokens; the agent only holds a Composio key. Free tier 20k tool
  calls/mo. The default choice for consumer SaaS (Gmail, Calendar, Notion…).
- **Pipedream MCP** (mcp.pipedream.com, 3k+ apps, tight free tier) and
  **Zapier MCP** (~9k apps, ~50 free calls/mo) — same pattern, different
  catalogs/quotas.
- **Activepieces / n8n** — self-hosted open-source equivalents when tokens
  should stay on your own box; both expose their actions as MCP tools.
- **Single-service MCP servers** — find official ones (Strava, Notion, GitHub…)
  via the official MCP registry (registry.modelcontextprotocol.io) or
  Smithery. Prefer these over aggregators when only one service is needed.
- **CLIs** — for developer services, often the best integration: `gh`,
  `stripe`, `vercel`, `supabase`, `gcloud` all hold auth locally after a
  one-time human login, and cost far fewer tokens than MCP equivalents. An
  agent with a shell should prefer the CLI where one exists, then push
  results to tipas.

Rule of thumb the industry converged on: **CLI for dev services, MCP
aggregator (Composio/Rube) for consumer SaaS, keyless connectors (`add_feed`)
for public data.** Phase 2 for tipas itself: connector rows referencing a
vault-stored `Authorization` header for simple static-token APIs — but never
OAuth refresh inside tipas; that's what the aggregators are for.
