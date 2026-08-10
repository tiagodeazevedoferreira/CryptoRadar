// app.js — le data/latest.json (gerado pelo pipeline) e, se configurado,
// tambem escuta o Firebase Realtime Database para atualizacao ao vivo.

const WATCHLIST_EL = document.getElementById("watchlist");
const TRENDING_EL = document.getElementById("trending");
const STATUS_EL = document.getElementById("status-row");

// Se voce quiser leitura ao vivo via Firebase (opcional), preencha aqui
// com a config publica do seu projeto (essas chaves sao seguras de expor
// no front-end — a seguranca real vem das Realtime Database Rules).
const FIREBASE_CONFIG = {
  databaseURL: "", // ex: "https://SEU-PROJETO-default-rtdb.firebaseio.com"
};

function fmtUSD(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(4)}`;
}

function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

// Desenha um "traço de sismógrafo" a partir dos sub-sinais do score —
// nao e historico real de preco, e uma leitura visual da composicao do
// sinal (liquidez / momentum / aceleracao).
function waveformSVG(signals, changeIsPositive) {
  const vals = [signals.liquidity, signals.momentum, signals.acceleration, signals.momentum];
  const w = 96;
  const h = 32;
  const stepX = w / (vals.length - 1);
  const points = vals
    .map((v, i) => {
      const x = i * stepX;
      const y = h - (v / 100) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const color = changeIsPositive ? "var(--signal-teal)" : "var(--signal-red)";
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">
    <polyline points="${points}" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
  </svg>`;
}

function renderTrending(trending) {
  if (!trending || !trending.length) {
    TRENDING_EL.innerHTML = "";
    return;
  }
  TRENDING_EL.innerHTML = trending
    .slice(0, 6)
    .map(
      (t) =>
        `<span class="chip">🔥 <b>${t.symbol?.toUpperCase() ?? "?"}</b></span>`
    )
    .join("");
}

function renderWatchlist(items) {
  if (!items || !items.length) {
    WATCHLIST_EL.innerHTML = `<li class="empty-state">Nenhum sinal relevante no momento. O pipeline roda a cada hora — volte em breve.</li>`;
    return;
  }

  WATCHLIST_EL.innerHTML = items
    .map((coin, i) => {
      const positive = (coin.change_24h_pct ?? 0) >= 0;
      return `
      <li class="row">
        <span class="rank">${String(i + 1).padStart(2, "0")}</span>
        <span class="name-cell">
          <div class="symbol">${coin.symbol}</div>
          <div class="name">${coin.name} · ${fmtUSD(coin.market_cap_usd)} mcap</div>
        </span>
        <span class="score-cell">
          <div class="score">${coin.signal_score}</div>
          <div class="label">${positive ? "" : ""}${fmtPct(coin.change_24h_pct)}</div>
        </span>
        <span class="waveform-cell">${waveformSVG(coin.signals, positive)}</span>
      </li>`;
    })
    .join("");
}

function setStatus(text, ok = true) {
  STATUS_EL.innerHTML = `<span><span class="dot" style="background:${
    ok ? "var(--signal-teal)" : "var(--signal-red)"
  }"></span>${text}</span>`;
}

async function loadFromStaticJSON() {
  const res = await fetch(`data/latest.json?_=${Date.now()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadFromFirebase() {
  if (!FIREBASE_CONFIG.databaseURL) return null;
  const res = await fetch(`${FIREBASE_CONFIG.databaseURL}/watchlist.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function init() {
  try {
    const data = (await loadFromFirebase()) || (await loadFromStaticJSON());
    renderTrending(data.trending_now);
    renderWatchlist(data.watchlist);
    const when = new Date(data.generated_at).toLocaleString("pt-BR");
    setStatus(`atualizado em ${when}`);
  } catch (err) {
    console.error(err);
    setStatus("falha ao carregar dados — tentando novamente em 30s", false);
    WATCHLIST_EL.innerHTML = `<li class="empty-state">Não foi possível carregar a watchlist ainda. Se você acabou de publicar o app, aguarde a primeira execução do pipeline no GitHub Actions.</li>`;
    setTimeout(init, 30_000);
  }
}

init();
