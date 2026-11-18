import React from 'react';
import type {
  BrideAnnouncement,
  LiveEventRecord,
  RoachEntity,
  WeddingPhase,
} from '../game/types';

interface WeddingHudProps {
  round: number;
  phase: WeddingPhase;
  ceremonyProgress: number;
  participantsCount: number;
  groom: RoachEntity | undefined;
  bride: RoachEntity | undefined;
  selectedRoach: RoachEntity | undefined;
  brideAnnouncement: BrideAnnouncement | null;
  recentEvents: LiveEventRecord[];
}

const PHASE_LABELS: Record<WeddingPhase, string> = {
  baile: 'Baile Aberto',
  coroacao: 'Escolha da Noiva',
  arrocha: 'Arrocha do Casal',
  cerimonia: 'Cerimônia no Altar',
  celebracao: 'Grande Celebração!',
};

export const WeddingHud: React.FC<WeddingHudProps> = ({
  round,
  phase,
  ceremonyProgress,
  participantsCount,
  groom,
  bride,
  selectedRoach,
  brideAnnouncement,
  recentEvents,
}) => {
  const roundedProgress = Math.round(ceremonyProgress);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3">
      {/* Top Integrated Ballroom Header */}
      <div className="flex flex-col items-center gap-1">
        <div
          className="w-full rounded-lg px-2.5 py-1.5 border border-[#f2bd49]/40"
          style={{
            background: 'rgba(42, 7, 18, 0.86)',
            boxShadow: '0 4px 14px rgba(12, 2, 6, 0.5)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display text-xs sm:text-sm font-bold tracking-wide text-[#ffe394] whitespace-nowrap truncate">
              CASAMENTO DA BARATA 3D
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#ffd6e0] whitespace-nowrap shrink-0 font-mono-tabular">
              <span data-testid="hud-round">Rodada {round}</span>
              <span aria-hidden="true" className="text-[#f2bd49]/70">·</span>
              <span data-testid="hud-participants">{participantsCount} Baratas</span>
            </div>
          </div>

          {/* Ceremony Progress & Phase Line */}
          <div className="mt-1 flex items-center gap-2">
            <span
              data-testid="hud-phase"
              className="text-[11px] font-bold text-[#fff3d6] whitespace-nowrap shrink-0"
            >
              {PHASE_LABELS[phase]}
            </span>
            <div className="relative h-2 flex-1 rounded-full bg-[#1e040c] overflow-hidden border border-[#f2bd49]/30">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${roundedProgress}%`,
                  background:
                    phase === 'cerimonia' || phase === 'celebracao'
                      ? '#ffd54f'
                      : '#f43f75',
                }}
              />
            </div>
            <span className="text-[11px] font-bold text-[#ffe394] font-mono-tabular w-9 text-right">
              {roundedProgress}%
            </span>
          </div>
        </div>

        {/* Coronation Banner matching the TikTok LIVE reference video */}
        {brideAnnouncement && (
          <div
            data-testid="bride-announcement"
            className="flex items-center gap-2 rounded-full px-3.5 py-1 border border-[#f2bd49]/75"
            style={{
              background: 'rgba(54, 11, 25, 0.92)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="w-6 h-6 rounded-full bg-[#c81e4b] border border-[#ffd54f] flex items-center justify-center text-[11px] font-extrabold text-white shrink-0">
              {brideAnnouncement.initial}
            </div>
            <span className="text-xs font-bold text-[#fff8f0] whitespace-nowrap truncate max-w-[230px]">
              {brideAnnouncement.handle} virou a NOIVA!
            </span>
          </div>
        )}
      </div>

      {/* Bottom Area: Couple Info + Active Character + Real-Time Events */}
      <div className="flex flex-col gap-1.5 mb-1">
        {/* Selected / Spotlight Character Info (only when user clicks or focuses a roach) */}
        {selectedRoach && (
          <div
            data-testid="selected-roach-card"
            className="self-start rounded-lg px-2.5 py-1.5 border border-[#f2bd49]/40"
            style={{ background: 'rgba(34, 6, 15, 0.86)' }}
          >
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-bold text-[#ffe394]">{selectedRoach.handle}</span>
              <span aria-hidden="true" className="text-white/40">·</span>
              <span className="text-[#ffd6e0]">
                {selectedRoach.role === 'groom'
                  ? 'Noivo'
                  : selectedRoach.role === 'bride'
                    ? 'Noiva'
                    : 'Convidado'}
              </span>
              <span aria-hidden="true" className="text-white/40">·</span>
              <span className="font-mono-tabular text-white/90">
                Afinidade {Math.round(selectedRoach.affinity)}%
              </span>
            </div>
          </div>
        )}

        {/* Compact Couple & Real-Time Event Feed */}
        <div className="flex items-end justify-between gap-2">
          {/* Real-Time Events Stream */}
          <div
            data-testid="live-events-feed"
            className="flex flex-col gap-1 max-w-[66%]"
          >
            {recentEvents.slice(0, 3).map((evt, idx) => (
              <div
                key={evt.id}
                className="rounded-md px-2 py-1 text-[11px] leading-tight text-[#fff4e6] border border-white/10 truncate"
                style={{
                  background: 'rgba(28, 5, 13, 0.78)',
                  opacity: idx === 0 ? 1 : idx === 1 ? 0.82 : 0.62,
                }}
              >
                {evt.summary}
              </div>
            ))}
          </div>

          {/* Couple Compact Card */}
          <div
            className="rounded-lg px-2.5 py-1.5 border border-[#f2bd49]/30 text-right shrink-0"
            style={{ background: 'rgba(34, 6, 15, 0.82)' }}
          >
            <div className="text-[10px] text-[#f2bd49] font-semibold">Casal no Altar</div>
            <div className="text-[11px] font-bold text-white truncate max-w-[110px]">
              {groom?.handle ?? '@noivo'}
            </div>
            <div className="text-[11px] font-bold text-[#fda4af] truncate max-w-[110px]">
              {bride?.handle ?? '@noiva'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
