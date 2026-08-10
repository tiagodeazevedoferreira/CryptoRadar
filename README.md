# CryptoRadar

PWA + pipeline automatizado que gera uma watchlist de sinais (volume,
momentum) em criptomoedas pequenas, e um segundo loop onde o Claude Code
evolui o próprio código do app sozinho, com auto-merge.

⚠️ **Isto não é uma ferramenta de previsão validada.** O score é uma
heurística sobre dados públicos. Moedas que pontuam alto aqui têm, por
definição, o perfil de risco de pump-and-dump. Trate como ponto de
partida para pesquisa, nunca como sinal de compra.

## O que roda sozinho, e o que custa dinheiro

| Peça | Custo | Observação |
|---|---|---|
| GitHub Actions (ambos workflows) | Grátis | Repositório público: minutos ilimitados |
| CoinGecko API (Demo plan) | Grátis | 10.000 chamadas/mês, sem cartão |
| Firebase Realtime Database | Grátis (plano Spark) | Suficiente para este volume de dados |
| GitHub Pages | Grátis | Hospeda o PWA |
| **Claude Code Action (Loop 2)** | **Pago** | Cobrado por token na API da Anthropic. Baixo volume (1x/dia) tende a custar poucos dólares/mês, mas não é zero. |

## Passo a passo

### 1. Criar o repositório
Crie um repositório novo no GitHub (pode ser público, para minutos de
Actions ilimitados) e suba estes arquivos.

### 2. Conta gratuita na CoinGecko
Crie uma conta Demo em https://www.coingecko.com/en/api/pricing e gere
uma Demo API key (gratuita, sem cartão).

### 3. Firebase Realtime Database
No console do Firebase, crie um projeto (plano Spark, gratuito), ative o
Realtime Database, e pegue:
- A URL do banco (ex.: `https://SEU-PROJETO-default-rtdb.firebaseio.com`)
- Um Database Secret (Configurações do projeto → Contas de serviço →
  Segredos do banco de dados — é o campo legado, mas funciona bem para
  escrita via REST API sem SDK)

### 4. Conta na Anthropic (para o Loop 2)
Crie uma API key em https://console.anthropic.com e adicione créditos
(ainda que poucos dólares — não há tier gratuito para uso via API).

Instale também o Claude GitHub App no seu repositório:
https://github.com/apps/claude

### 5. Secrets do repositório
Em **Settings → Secrets and variables → Actions**, adicione:

| Secret | Valor |
|---|---|
| `COINGECKO_API_KEY` | sua Demo key da CoinGecko |
| `FIREBASE_DB_URL` | URL do seu Realtime Database |
| `FIREBASE_DB_SECRET` | Database Secret do Firebase |
| `ANTHROPIC_API_KEY` | sua API key da Anthropic |

### 6. Ativar o GitHub Pages
Em **Settings → Pages**, configure para publicar a partir da pasta
`/public` (branch `main`). Isso coloca o app no ar em
`https://SEU-USUARIO.github.io/SEU-REPO/`.

### 7. Primeira execução manual
Vá em **Actions → Data Pipeline → Run workflow** para rodar a primeira
vez manualmente e confirmar que tudo está configurado. Depois disso, ele
roda sozinho a cada hora.

O workflow **Claude Evolve** roda 1x por dia sozinho, ou pode ser
disparado manualmente em **Actions → Claude Evolve (autonomo) → Run
workflow**. Ele abre um PR e faz merge automaticamente — sem revisão
humana, como decidido. Se em algum momento você quiser reintroduzir uma
rede de segurança, o ponto certo é o step "Auto-merge do PR criado" no
arquivo `.github/workflows/claude-evolve.yml`.

## Desenvolvimento local

```bash
npm install
COINGECKO_API_KEY=xxx npm run fetch
npm run analyze
# abra public/index.html num servidor local (ex: npx serve public)
```

## Estrutura

```
scripts/            pipeline de dados (fetch, analyze, firebase)
public/              PWA (HTML/CSS/JS puro, sem build step)
public/data/         saída do pipeline (latest.json)
.github/workflows/   os dois loops de automação
CLAUDE.md            regras que o Claude Code segue nas execuções autônomas
```
