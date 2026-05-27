import { TargetSvg } from './target-svg';
import { damageBand, hitInViewBox } from '@quickdraw/game-core';
import type { GameState } from '@quickdraw/game-core';

interface ResultOverlayProps {
  state: GameState;
}

export function ResultOverlay({ state }: ResultOverlayProps) {
  const last = state.history[state.history.length - 1];
  if (!last) return null;

  const { winner, damage } = last;

  // Local player is always left; opponent always right — stable across rounds
  // Narrow to a player seat; spectators and bot games (myRole=null) fall back to p1
  const myRole  = (state.myRole === 'p1' || state.myRole === 'p2') ? state.myRole : 'p1';
  const oppRole = myRole === 'p1' ? 'p2' : 'p1';
  const myName  = state[myRole].name;
  const oppName = state[oppRole].name;
  const myShot  = myRole === 'p1' ? last.p1Shot : last.p2Shot;
  const oppShot = myRole === 'p1' ? last.p2Shot : last.p1Shot;
  const iWon    = winner === myRole;

  // Header still reflects the actual winner's reaction time and hit band
  const winShot = iWon ? myShot : oppShot;
  const winName = iWon ? myName : oppName;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 p-6 overflow-y-auto">
      <div className="flex flex-col items-center text-center gap-3 my-auto">
        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">
          {iWon ? 'YOU WIN THE ROUND' : 'OPPONENT WINS THE ROUND'}
        </span>

        <div className="font-sans text-[44px] font-semibold tracking-[-0.02em] leading-none text-qd-ink">
          {winShot ? `${(winShot.reactionMs / 1000).toFixed(3)}s` : '—'}
        </div>

        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">
          {winShot ? `${winName} · ${damageBand(winShot.dist, winShot.targetSize)}` : ''}
        </span>

        <div className="grid mt-3" style={{ gridTemplateColumns: '1fr auto 1fr', gap: '48px', alignItems: 'center', width: '100%', maxWidth: 720 }}>
          <div className={`flex flex-col items-center gap-2${!iWon ? ' opacity-55' : ''}`}>
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">{myName}</span>
            <TargetSvg size={120} hit={myShot ? hitInViewBox(myShot) : null}/>
            <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-qd-ink-3">
              {myShot ? `${(myShot.reactionMs / 1000).toFixed(3)}s · ${iWon ? 'hit' : 'too slow'}` : 'no shot'}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 px-2 py-6">
            <div className="font-sans text-[48px] font-semibold leading-none text-qd-accent">−{damage}</div>
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">Damage</span>
          </div>

          <div className={`flex flex-col items-center gap-2${iWon ? ' opacity-55' : ''}`}>
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">{oppName}</span>
            <TargetSvg size={120} hit={oppShot ? hitInViewBox(oppShot) : null}/>
            <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-qd-ink-3">
              {oppShot ? `${(oppShot.reactionMs / 1000).toFixed(3)}s · ${iWon ? 'too slow' : 'hit'}` : 'no shot'}
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
