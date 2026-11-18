import React, { useState } from 'react';
import { X, Radio, Gift, Heart, MessageCircle, Crown, Sparkles } from 'lucide-react';
import type { LiveEventInput, TikTokBridgeStatus } from '../game/types';

interface LiveBridgeDrawerProps {
  open: boolean;
  onClose: () => void;
  bridgeStatus: TikTokBridgeStatus;
  onTriggerTestEvent: (event: LiveEventInput) => Promise<void>;
}

export const LiveBridgeDrawer: React.FC<LiveBridgeDrawerProps> = ({
  open,
  onClose,
  bridgeStatus,
  onTriggerTestEvent,
}) => {
  const [testUser, setTestUser] = useState('@convidado_live');
  const [testComment, setTestComment] = useState('ARROCHAAA CASAL!');
  const [sending, setSending] = useState(false);

  if (!open) return null;

  async function fire(event: LiveEventInput) {
    setSending(true);
    try {
      await onTriggerTestEvent(event);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-center p-3"
      style={{ background: 'rgba(15, 3, 8, 0.72)' }}
    >
      <div
        role="dialog"
        aria-label="Integração TikTok LIVE"
        className="w-full max-h-[84%] overflow-y-auto rounded-2xl border border-[#f2bd49]/50 p-4 text-[#fff8f0]"
        style={{
          background: '#2a0814',
          boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
        }}
      >
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#f2bd49]" />
            <h2 className="font-display text-base font-bold text-[#ffe394]">
              Integração TikTok LIVE
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel TikTok LIVE"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real Connection Status (never faked) */}
        <div className="mt-3 rounded-xl p-3 border border-white/10 bg-[#1c040c]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/70">Estado da Conexão Externa</span>
            <span
              data-testid="bridge-connection-mode"
              className={`font-bold ${
                bridgeStatus.connected
                  ? 'text-emerald-400'
                  : bridgeStatus.configured
                    ? 'text-amber-300'
                    : 'text-rose-300'
              }`}
            >
              {bridgeStatus.connected
                ? `Conectado (${bridgeStatus.externalProducers})`
                : bridgeStatus.configured
                  ? 'Configurado (Aguardando Stream)'
                  : 'Não conectado (Aguardando ponte externa)'}
            </span>
          </div>

          <div className="mt-2 space-y-1 text-[11px] text-white/75 font-mono-tabular">
            <div className="truncate">
              <span className="text-[#f2bd49]">WS:</span> {bridgeStatus.endpointWs}
            </div>
            <div className="truncate">
              <span className="text-[#f2bd49]">POST:</span> {bridgeStatus.endpointHttp}
            </div>
            <div>
              <span className="text-[#f2bd49]">Eventos recebidos:</span>{' '}
              {bridgeStatus.totalEventsReceived}
            </div>
          </div>
        </div>

        {/* Manual Local Testing Panel (clearly separated from live TikTok stream) */}
        <div className="mt-4">
          <h3 className="text-xs font-bold text-[#ffe394] mb-2">
            Testar Ações no Salão (Envio Real via API/WebSocket)
          </h3>

          <div className="grid grid-cols-1 gap-2 mb-3">
            <label className="text-[11px] text-white/75 flex flex-col gap-1">
              <span>Usuário</span>
              <input
                type="text"
                value={testUser}
                onChange={(e) => setTestUser(e.target.value)}
                className="w-full rounded-lg px-2.5 py-1.5 text-xs bg-[#18040b] border border-white/20 text-white focus:outline-none focus:border-[#f2bd49]"
              />
            </label>
            <label className="text-[11px] text-white/75 flex flex-col gap-1">
              <span>Comentário</span>
              <input
                type="text"
                value={testComment}
                onChange={(e) => setTestComment(e.target.value)}
                className="w-full rounded-lg px-2.5 py-1.5 text-xs bg-[#18040b] border border-white/20 text-white focus:outline-none focus:border-[#f2bd49]"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={sending}
              onClick={() =>
                fire({
                  type: 'gift',
                  user: testUser,
                  giftName: 'Buquê Dourado',
                  giftValue: 25,
                })
              }
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[#6e1230] hover:bg-[#88173c] border border-[#f2bd49]/40 transition-colors"
            >
              <Gift className="w-3.5 h-3.5 text-[#ffd54f]" />
              <span>Presente VIP</span>
            </button>

            <button
              type="button"
              disabled={sending}
              onClick={() =>
                fire({
                  type: 'like',
                  user: testUser,
                  count: 15,
                })
              }
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[#561028] hover:bg-[#6e1533] border border-white/15 transition-colors"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>Curtidas (+15)</span>
            </button>

            <button
              type="button"
              disabled={sending}
              onClick={() =>
                fire({
                  type: 'comment',
                  user: testUser,
                  comment: testComment,
                })
              }
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[#561028] hover:bg-[#6e1533] border border-white/15 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-sky-300" />
              <span>Comentário</span>
            </button>

            <button
              type="button"
              disabled={sending}
              onClick={() =>
                fire({
                  type: 'crown_bride',
                  user: testUser,
                })
              }
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[#7c4d0f] hover:bg-[#965f14] border border-[#ffd54f]/50 transition-colors"
            >
              <Crown className="w-3.5 h-3.5 text-[#ffd54f]" />
              <span>Virar Noiva</span>
            </button>
          </div>

          <button
            type="button"
            disabled={sending}
            onClick={() =>
              fire({
                type: 'ceremony_boost',
                user: testUser,
                giftValue: 50,
              })
            }
            className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[#f2bd49] text-[#2a0814] hover:bg-[#ffd46e] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Acelerar Cerimônia do Casamento</span>
          </button>
        </div>

        {/* External Connector Schema */}
        <div className="mt-4 rounded-xl p-3 bg-[#17040a] border border-white/10 text-[11px] text-white/70">
          <div className="font-bold text-white/90 mb-1">Payload JSON para Conector Externo</div>
          <pre className="overflow-x-auto text-[10px] text-[#ffd6e0] font-mono-tabular leading-relaxed">
{`{
  "type": "gift" | "like" | "comment" | "follow",
  "user": "@usuario_tiktok",
  "giftName": "Rosa",
  "giftValue": 25,
  "comment": "Arrocha casal!"
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};
