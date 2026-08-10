# CryptoRadar — guia para o Claude Code autônomo

Este projeto tem duas partes que NÃO devem ser misturadas:

1. **Pipeline de dados** (`scripts/*.js`): busca dados na CoinGecko,
   calcula `public/data/latest.json`. Roda via `.github/workflows/data-pipeline.yml`,
   sem envolver este agente.
2. **App PWA** (`public/*`): consome `public/data/latest.json` e renderiza
   a watchlist. Sem framework — HTML/CSS/JS puro, de propósito (deploy
   simples via GitHub Pages, zero build step).

## Regras para mudanças autônomas

- Nunca altere `.github/workflows/*.yml`, `package.json` scripts, nem
  qualquer coisa que leia secrets — essas mudanças exigem revisão humana
  manual, fora deste fluxo.
- Nunca remova o `disclaimer` do watchlist nem a mensagem de risco no
  `index.html` — é requisito de produto, não decoração.
- Ao mudar `scripts/analyze.js`, mantenha a assinatura de saída de
  `public/data/latest.json` (`generated_at`, `disclaimer`, `trending_now`,
  `watchlist[].signal_score`) — o front-end depende desse formato.
- Prefira mudanças pequenas e testáveis a refactors grandes. Se não for
  possível validar a mudança rodando `npm run analyze` com o arquivo de
  exemplo em `public/data/latest.json`, prefira uma mudança mais simples.
- Este projeto não deve, em nenhuma hipótese, apresentar o `signal_score`
  como recomendação de compra/venda ou garantia de retorno.
