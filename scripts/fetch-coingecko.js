// scripts/fetch-coingecko.js
//
// Busca candidatos a "moeda nova com sinais agressivos" usando o free
// Demo plan da CoinGecko (100 calls/min, 10.000 calls/mes, gratis).
//
// Requer a variavel de ambiente COINGECKO_API_KEY (Demo key, gratis em
// https://www.coingecko.com/en/api/pricing -> "Demo"). Sem a chave, o
// script ainda funciona via API publica sem chave, mas com rate limit
// muito mais baixo (5-15 calls/min) e maior chance de erro 429.

import fs from "node:fs/promises";
import path from "node:path";

const API_KEY = process.env.COINGECKO_API_KEY || "";
const BASE_URL = "https://api.coingecko.com/api/v3";
const OUT_DIR = path.resolve("public/data");
const RAW_OUT_FILE = path.join(OUT_DIR, "raw-candidates.json");

function headers() {
  const h = { accept: "application/json" };
  if (API_KEY) h["x-cg-demo-api-key"] = API_KEY;
  return h;
}

async function getJSON(url) {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error(`Falha ao buscar ${url}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTrending() {
  const data = await getJSON(`${BASE_URL}/search/trending`);
  return (data.coins || []).map((c) => c.item);
}

async function fetchTopMoversByVolume() {
  // Moedas fora do top 100 por market cap, ordenadas por volume:
  // proxy simples para "moeda pequena com atividade fora do normal".
  const url =
    `${BASE_URL}/coins/markets?vs_currency=usd&order=volume_desc` +
    `&per_page=100&page=2&price_change_percentage=24h,7d&sparkline=false`;
  return getJSON(url);
}

async function fetchRecentlyAdded() {
  // /coins/list/new nao existe no free tier; usamos /coins/markets
  // ordenado por data de criacao aproximada via 'ath_date' nao e confiavel.
  // Alternativa robusta e gratuita: endpoint publico de "recently added"
  // no CoinGecko web, aqui aproximamos com order=market_cap_asc (moedas
  // pequenas tendem a ser mais novas) + filtragem manual depois.
  const url =
    `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_asc` +
    `&per_page=100&page=1&price_change_percentage=24h,7d&sparkline=false`;
  return getJSON(url);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  console.log("Buscando moedas em trending...");
  const trending = await fetchTrending();
  await sleep(1500); // respeita rate limit do free tier

  console.log("Buscando moedas pequenas com volume alto...");
  const volumeMovers = await fetchTopMoversByVolume();
  await sleep(1500);

  console.log("Buscando moedas de market cap baixo (proxy de 'novas')...");
  const smallCaps = await fetchRecentlyAdded();

  const payload = {
    fetched_at: new Date().toISOString(),
    trending,
    volumeMovers,
    smallCaps,
  };

  await fs.writeFile(RAW_OUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`Dados brutos salvos em ${RAW_OUT_FILE}`);
}

main().catch((err) => {
  console.error("Erro no fetch-coingecko:", err);
  process.exit(1);
});
