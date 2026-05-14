import { TargetSvg } from './target-svg';
import { damageBand, hitInViewBox } from '@quickdraw/game-core';
import type { GameState } from '@quickdraw/game-core';

interface ResultOverlayProps {
  state: GameState;
}

export function ResultOverlay({ state }: ResultOverlayProps) {
  const last = state.history[state.history.length - 1];
  if (!last) return null;

  const { winner, damage, p1Shot, p2Shot } = last;
  const winName  = winner === 'p1' ? state.p1.name : state.p2.name;
  const lossName = winner === 'p1' ? state.p2.name : state.p1.name;
  const winShot  = winner === 'p1' ? p1Shot : p2Shot;
  const lossShot = winner === 'p1' ? p2Shot : p1Shot;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 p-6 overflow-y-auto">
      <div className="flex flex-col items-center text-center gap-3 my-auto">
        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">
          {winner === 'p1' ? 'YOU WIN THE ROUND' : 'OPPONENT WINS THE ROUND'}
        </span>

        <div className="font-sans text-[44px] font-semibold tracking-[-0.02em] leading-none text-qd-ink">
          {winShot ? `${(winShot.reactionMs / 1000).toFixed(3)}s` : '—'}
        </div>

        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">
          {winShot ? `${winName} · ${damageBand(winShot.dist, winShot.targetSize)}` : ''}
        </span>

        <div className="grid mt-3" style={{ gridTemplateColumns: '1fr auto 1fr', gap: '48px', alignItems: 'center', width: '100%', maxWidth: 720 }}>
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">{winName}</span>
            <TargetSvg size={120} hit={winShot ? hitInViewBox(winShot) : null}/>
            <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-qd-ink-3">
              {winShot ? `${(winShot.reactionMs / 1000).toFixed(3)}s · hit` : 'no shot'}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 px-2 py-6">
            <div className="font-sans text-[48px] font-semibold leading-none text-qd-accent">−{damage}</div>
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">Damage</span>
          </div>

          <div className="flex flex-col items-center gap-2 opacity-55">
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">{lossName}</span>
            <TargetSvg size={120} hit={lossShot ? hitInViewBox(lossShot) : null}/>
            <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-qd-ink-3">
              {lossShot ? `${(lossShot.reactionMs / 1000).toFixed(3)}s · too slow` : 'no shot'}
            </span>
          </div>
        </div>

        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3 mt-2">
          Next round in 3…
        </span>
      </div>
    </div>
  );
}
