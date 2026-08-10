// scripts/write-firebase.js
//
// Envia data/latest.json para o Firebase Realtime Database usando a
// REST API nativa do Firebase (sem SDK, sem instalar nada localmente).
//
// Requer duas variaveis de ambiente (configure como GitHub Secrets):
//   FIREBASE_DB_URL    -> ex: https://SEU-PROJETO-default-rtdb.firebaseio.com
//   FIREBASE_DB_SECRET -> Database Secret legado (Project Settings > Service
//                         accounts > Database secrets) OU um ID token válido.
//
// Para um projeto pessoal isso e suficiente e gratuito no plano Spark.

import fs from "node:fs/promises";
import path from "node:path";

const DB_URL = process.env.FIREBASE_DB_URL;
const DB_SECRET = process.env.FIREBASE_DB_SECRET;
const DATA_FILE = path.resolve("public", "data", "latest.json");

async function main() {
  if (!DB_URL || !DB_SECRET) {
    console.log(
      "FIREBASE_DB_URL ou FIREBASE_DB_SECRET nao configurados — pulando sync com Firebase (dado ja foi salvo em data/latest.json)."
    );
    return;
  }

  const payload = await fs.readFile(DATA_FILE, "utf-8");

  const url = `${DB_URL.replace(/\/$/, "")}/watchlist.json?auth=${DB_SECRET}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao gravar no Firebase: ${res.status} ${text}`);
  }

  console.log("Watchlist sincronizada com o Firebase Realtime Database.");
}

main().catch((err) => {
  console.error("Erro no write-firebase:", err);
  process.exit(1);
});
