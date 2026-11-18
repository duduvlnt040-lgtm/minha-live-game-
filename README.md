# Casamento da Barata 3D

Jogo 3D interativo em formato vertical **9:16** construído com **React + Three.js + TypeScript + Tailwind CSS**, pronto para publicação estática na **Vercel** e integração direta na plataforma **MINHA LIVE GAMES**.

---

## 1. Estrutura do Projeto

```text
├── index.html                    # Entrada HTML e fontes
├── package.json                  # Dependências e scripts de build/servidor
├── vercel.json                   # Configuração de deploy na Vercel
├── vite.config.ts                # Configuração Vite (build relativo em dist/)
├── tsconfig.json                 # Configuração TypeScript
├── server.ts                     # Servidor opcional Node + Express + WebSocket (/ws/live)
└── src/
    ├── main.tsx                  # Inicialização React
    ├── App.tsx                   # Shell 9:16, ciclo 3D e ponte MINHA LIVE GAMES
    ├── index.css                 # Estilos Tailwind CSS
    ├── audio/
    │   └── weddingAudio.ts       # Áudio procedural via Web Audio API (zero arquivos externos)
    ├── components/
    │   ├── WeddingHud.tsx        # HUD do salão, rodada, participantes e eventos
    │   └── LiveBridgeDrawer.tsx  # Painel de integração e teste local (atalho: tecla L)
    ├── game/
    │   ├── types.ts              # Tipos de entidades, eventos e estado
    │   ├── rules.ts              # Lógica de jogo, colisões, proximidade e câmera automática
    │   └── rules.test.ts         # Testes unitários (node:test)
    └── three/
        ├── textures.ts           # Texturas procedurais em Canvas2D
        ├── roachModel.ts         # Modelos 3D articulados das baratas, noivo e noiva
        └── ballroomScene.ts      # Salão 3D, iluminação, confetes e câmeras suaves
```

---

## 2. Como Executar Localmente

### Requisitos
- **Node.js 18+** e **npm**

### Passo a passo
```bash
# 1. Instalar dependências
npm install

# 2. Rodar em modo desenvolvimento completo (Vite + Express + WebSocket na porta 3000)
npm run dev

# 3. Ou gerar a versão compilada estática em dist/ e pré-visualizar
npm run build
npm run preview
```

### Testes e Verificação
```bash
npx --yes tsx --test src/game/rules.test.ts
npm run lint
```

---

## 3. Como Publicar na Vercel

O projeto já inclui `vercel.json` configurado para Vite (`npm run build` → `dist/`):

1. Exporte/submeta o repositório para o GitHub (ou use a CLI da Vercel na raiz do projeto).
2. No painel da **Vercel**, clique em **Add New Project** e importe o repositório (ou execute `npx vercel --prod`).
3. Configurações detectadas automaticamente:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. (Opcional) Defina a variável de ambiente `VITE_LIVE_WS_URL` apontando para o servidor WebSocket da sua plataforma (ex.: `wss://live.minhalivegames.com/ws`).

---

## 4. Integração com a Plataforma MINHA LIVE GAMES

Todos os modelos 3D, texturas, animações e sons são gerados 100% em código (sem dependências de servidores ou caminhos locais). Você pode conectar eventos reais do TikTok LIVE ao jogo de **4 formas**:

### Opção A — `iframe` + `window.postMessage` (Recomendado para MINHA LIVE GAMES)
```js
const iframe = document.getElementById('casamento-barata-iframe');
iframe.contentWindow.postMessage(
  {
    type: 'minha-live-games:event',
    payload: {
      type: 'gift', // 'gift' | 'like' | 'comment' | 'follow' | 'share' | 'crown_bride' | 'ceremony_boost'
      user: '@usuario_tiktok',
      giftName: 'Buquê Dourado',
      giftValue: 25,
    },
  },
  '*',
);
```

### Opção B — Ponte Global JavaScript (`window.MinhaLiveGames`)
```js
window.MinhaLiveGames.emitEvent({
  type: 'comment',
  user: '@maria_live',
  comment: 'ARROCHAAA CASAL!',
});

// Consultar estado atual da partida:
const estado = window.MinhaLiveGames.getState();
```

### Opção C — WebSocket Externo (`?ws=...` ou `VITE_LIVE_WS_URL`)
Abra o jogo passando o endpoint WebSocket na URL:
```text
https://seu-jogo.vercel.app/?ws=wss://seu-servidor-live.com/ws
```
Cada mensagem JSON enviada pelo WebSocket deve seguir:
```json
{
  "type": "live:event",
  "payload": {
    "type": "gift",
    "user": "@usuario_tiktok",
    "giftName": "Rosa",
    "giftValue": 25,
    "comment": "Arrocha casal!"
  }
}
```

### Opção D — Servidor Node Incluso (`server.ts`)
Ao hospedar o projeto em um servidor Node.js (`npm run build && npm run start`), o servidor expõe:
- **WebSocket:** `ws://<host>:3000/ws/live`
- **Webhook HTTP:** `POST http://<host>:3000/api/live/event`
- **Status:** `GET http://<host>:3000/api/live/status`

---

## 5. Controles de Teclado (Uso Administrativo / Depuração)
- **Clique nas baratas:** interage e aumenta afinidade (100% coroa nova noiva).
- **`WASD` / Setas:** movimenta a barata ativa pelo salão.
- **`Espaço`:** dispara comemoração e confetes.
- **`M`:** silencia/ativa o áudio.
- **`L`:** abre/fecha o painel de diagnóstico e disparo de eventos de teste.
