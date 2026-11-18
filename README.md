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
    ├── sdk/
    │   ├── minhaLiveGames.ts     # Adaptador oficial do SDK window.MinhaLiveGames
    │   └── minhaLiveGames.test.ts# Testes do adaptador SDK (onEvent, onCommand, onControl, emitScore)
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

# 3. Ou gerar a versão compilada estática HTML5 em dist/ e pré-visualizar
npm run build
npm run preview
```

### Testes e Verificação
```bash
npx --yes tsx --test src/game/rules.test.ts src/sdk/minhaLiveGames.test.ts
npm run lint
```

---

## 3. Pacote ZIP para Importação na Minha Live Games

O arquivo `casamento-da-barata-3d.zip` contém exclusivamente a versão estática HTML5 gerada em `dist/` com `index.html` na raiz:

```text
casamento-da-barata-3d.zip
├── index.html
└── assets/
    ├── index-*.js
    └── index-*.css
```

Sem dependências de desenvolvimento, caminhos locais ou arquivos de referência do ambiente de criação.

---

## 4. Integração com a Plataforma MINHA LIVE GAMES

Todos os modelos 3D, texturas, animações e sons são gerados 100% em código (sem dependências externas). O jogo consome o SDK `window.MinhaLiveGames` fornecido pela plataforma **sem sobrescrevê-lo**:

- **`window.MinhaLiveGames.onEvent(callback)`**: recebe presentes (`gift`/`presente`), curtidas (`like`/`curtida`), comentários (`comment`/`comentario`), seguidores (`follow`) e compartilhamentos (`share`), convertendo-os para o formato interno `LiveEventInput`.
- **`window.MinhaLiveGames.onCommand(callback)`**: processa comandos (`!noiva`/`coroar`, `!arrocha`/`dancar`, `!casar`/`cerimonia`, `!entrar` ou comandos personalizados).
- **`window.MinhaLiveGames.onControl(callback)`**: controla o ciclo do jogo com `iniciar`/`start`/`resume`, `pausar`/`pause` e `reiniciar`/`restart`/`reset`.
- **`window.MinhaLiveGames.emitScore(score, meta)`**: envia a pontuação atualizada (`totalScore`) e metadados da rodada para a plataforma em tempo real.

Também há suporte complementar via `window.postMessage` (`minha-live-games:event`, `minha-live-games:command`, `minha-live-games:control`), WebSocket externo (`?ws=` / `VITE_LIVE_WS_URL`) e servidor Node opcional (`server.ts`).

---

## 5. Controles de Teclado (Uso Administrativo / Depuração)
- **Clique nas baratas:** interage e aumenta afinidade (100% coroa nova noiva).
- **`WASD` / Setas:** movimenta a barata ativa pelo salão.
- **`Espaço`:** dispara comemoração e confetes.
- **`M`:** silencia/ativa o áudio.
- **`L`:** abre/fecha o painel de diagnóstico e disparo de eventos de teste.
