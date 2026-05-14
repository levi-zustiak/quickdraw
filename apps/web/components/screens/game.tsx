'use client';

import { useRef, useEffect, useState } from 'react';
import { HpHud } from '@/components/quickdraw/hp-hud';
import { TargetSvg } from '@/components/quickdraw/target-svg';
import { Holster } from '@/components/quickdraw/holster';
import { ResultOverlay } from '@/components/quickdraw/result-overlay';
import type { GameState, GameActions, HolsterStyle } from '@quickdraw/game-core';

interface GameScreenProps {
  state: GameState;
  actions: GameActions;
  max: number;
  holsterStyle?: HolsterStyle;
  hasHover?: boolean;
}

export function GameScreen({ state, actions, max, holsterStyle = 'buzzer', hasHover = false }: GameScreenProps) {
  const { phase, p1, p2, target, hudFlash, round, holsterArmed } = state;
  const holsterRef = useRef<HTMLDivElement>(null);
  const heldPointerRef = useRef<number | null>(null);
  const [ringProgress, setRingProgress] = useState(0);

  const checkHolster = (clientX: number, clientY: number): boolean => {
    const h = holsterRef.current;
    if (!h) return false;
    const r = h.getBoundingClientRect();
    return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const inH = checkHolster(e.clientX, e.clientY);
    if (phase === 'holster' && inH && !holsterArmed) actions.armHolster();
    else if (phase === 'holster' && !inH && holsterArmed) actions.leaveHolster();
    else if (phase === 'arming' && !inH) actions.leaveHolster();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (phase === 'drawing') {
      actions.fire(e.clientX, e.clientY);
    } else if (phase === 'arming') {
      actions.leaveHolster();
    } else if (phase === 'holster' && checkHolster(e.clientX, e.clientY)) {
      heldPointerRef.current = e.pointerId;
      actions.armHolster();
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    if ((phase === 'holster' || phase === 'arming') && e.pointerId === heldPointerRef.current) {
      actions.leaveHolster();
    }
    heldPointerRef.current = null;
  };

  // Ring countdown animation
  useEffect(() => {
    if (holsterStyle !== 'ring' || phase !== 'arming') {
      setRingProgress(0);
      return;
    }
    const start = performance.now();
    let raf: number;
    const tick = () => {
      setRingProgress(Math.min(1, (performance.now() - start) / 3000));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, holsterStyle]);

  const showHolster = phase === 'holster' || phase === 'arming';

  return (
    <div
      className="flex-1 relative overflow-hidden bg-qd-paper"
      data-qd-stage
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: 'none' }}
    >
      {/* HUD */}
      <div className="absolute top-4 left-5 right-5 flex justify-between items-start gap-6 z-20">
        <HpHud player={p1} align="left"  hit={hudFlash.p1} max={max}/>
        <div className="text-center font-mono shrink-0">
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">Round</div>
          <div className="text-[22px] font-semibold text-qd-ink tabular-nums leading-none">
            {String(round).padStart(2, '0')}
          </div>
        </div>
        <HpHud player={p2} align="right" hit={hudFlash.p2} max={max}/>
      </div>

      {/* Steady prompt */}
      {phase === 'holster' && (
        <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-[25] select-none pointer-events-none">
          <div className="font-sans text-[56px] font-semibold tracking-[-0.02em] leading-none text-qd-ink">
            Steady…
          </div>
          <div className="font-mono text-[11px] tracking-[0.16em] uppercase text-qd-ink-3 mt-3">
            {hasHover ? 'Holster your cursor to begin' : 'Press and hold the pad to begin'}
          </div>
        </div>
      )}

      {/* Arming prompt */}
      {phase === 'arming' && (
        <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-[25] select-none pointer-events-none">
          <div className="font-sans text-[56px] font-semibold tracking-[-0.02em] leading-none text-qd-ink">
            Wait for it…
          </div>
          <div className="font-mono text-[11px] tracking-[0.16em] uppercase text-qd-ink-3 mt-3">
            {hasHover ? "Don't flinch" : 'Keep your finger down'}
          </div>
        </div>
      )}

      {/* DRAW! prompt */}
      {phase === 'drawing' && (
        <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-[25] select-none pointer-events-none">
          <div className="font-sans font-semibold tracking-[-0.03em] leading-none text-qd-ink qd-draw-animated" style={{ fontSize: 96 }}>
            DRAW!
          </div>
        </div>
      )}

      {/* Target */}
      {phase === 'drawing' && target && (
        <div
          className="absolute pointer-events-auto cursor-crosshair z-[30] qd-target-animated"
          style={{
            left: target.x - target.size / 2,
            top: target.y - target.size / 2,
          }}
        >
          <TargetSvg size={target.size}/>
        </div>
      )}

      {/* Round result overlay */}
      {phase === 'result' && <ResultOverlay state={state}/>}

      {/* Holster pad */}
      {showHolster && (
        <Holster
          ref={holsterRef}
          armed={holsterArmed}
          style={holsterStyle}
          ringProgress={ringProgress}
          hasHover={hasHover}
        />
      )}
    </div>
  );
}
