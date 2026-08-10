// scripts/analyze.js
//
// IMPORTANTE: isto e uma pontuacao heuristica de sinais publicos
// (volume, momentum, liquidez), NAO uma previsao financeira validada.
// Moedas pequenas com esses sinais tambem sao o perfil classico de
// pump-and-dump. Trate o resultado como uma watchlist de risco alto,
// nunca como recomendacao de investimento.

import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve("public/data");
const RAW_FILE = path.join(DATA_DIR, "raw-candidates.json");
const OUT_FILE = path.join(DATA_DIR, "latest.json");

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Normaliza um valor para 0-100 dado um teto esperado.
function scoreCap(value, cap) {
  if (!Number.isFinite(value)) return 0;
  return clamp((Math.abs(value) / cap) * 100, 0, 100);
}

function scoreCoin(coin) {
  const change24h = coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h ?? 0;
  const change7d = coin.price_change_percentage_7d_in_currency ?? 0;
  const volume = coin.total_volume ?? 0;
  const marketCap = coin.market_cap ?? 0;

  // Sinal 1: volume/market cap alto = muita atividade relativa ao tamanho
  const volToMcap = marketCap > 0 ? volume / marketCap : 0;
  const liquiditySignal = scoreCap(volToMcap, 1.5); // >150% do mcap girado em 24h = extremo

  // Sinal 2: momentum de curto prazo
  const momentumSignal = scoreCap(change24h, 40); // 40%+ em 24h = extremo

  // Sinal 3: aceleracao (24h forte mesmo dentro de uma janela de 7d mista)
  const accelSignal =
    change7d !== 0 ? scoreCap(change24h - change7d / 7, 20) : momentumSignal * 0.5;

  // Sinal 4: risco de "moeda muito pequena e ilíquida" (penaliza, nao bonifica)
  const microCapRisk = marketCap > 0 && marketCap < 1_000_000 ? 20 : 0;

  const rawScore =
    liquiditySignal * 0.35 + momentumSignal * 0.35 + accelSignal * 0.3 - microCapRisk;

  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    price_usd: coin.current_price ?? null,
    market_cap_usd: marketCap,
    volume_24h_usd: volume,
    change_24h_pct: change24h,
    change_7d_pct: change7d,
    signal_score: Math.round(clamp(rawScore, 0, 100)),
    signals: {
      liquidity: Math.round(liquiditySignal),
      momentum: Math.round(momentumSignal),
      acceleration: Math.round(accelSignal),
    },
    risk_flags: marketCap < 1_000_000 ? ["market_cap_muito_baixo"] : [],
  };
}

async function main() {
  const raw = JSON.parse(await fs.readFile(RAW_FILE, "utf-8"));

  const candidates = [...(raw.volumeMovers || []), ...(raw.smallCaps || [])];

  // dedupe por id
  const byId = new Map();
  for (const c of candidates) byId.set(c.id, c);

  const scored = [...byId.values()]
    .map(scoreCoin)
    .sort((a, b) => b.signal_score - a.signal_score)
    .slice(0, 30);

  const output = {
    generated_at: new Date().toISOString(),
    disclaimer:
      "Watchlist heuristica baseada em sinais publicos (volume, momentum). Nao e recomendacao de investimento. Moedas com esse perfil tem alto risco, incluindo pump-and-dump.",
    trending_now: (raw.trending || []).slice(0, 10).map((t) => ({
      id: t.id,
      symbol: t.symbol,
      name: t.name,
      market_cap_rank: t.market_cap_rank,
    })),
    watchlist: scored,
  };

  await fs.writeFile(OUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Watchlist gerada com ${scored.length} moedas em ${OUT_FILE}`);
}

main().catch((err) => {
  console.error("Erro no analyze:", err);
  process.exit(1);
});
