'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { HolsterStyle } from '@quickdraw/game-core';

interface HolsterProps {
  armed: boolean;
  style?: HolsterStyle;
  ringProgress?: number;
  hasHover?: boolean;
}

export const Holster = forwardRef<HTMLDivElement, HolsterProps>(
  function Holster({ armed, style = 'buzzer', ringProgress = 0, hasHover = false }, ref) {
    const armedHint  = hasHover ? 'wait for draw…'      : 'hold steady…';
    const idleHint   = hasHover ? 'drop your cursor here' : 'press and hold here';

    if (style === 'glow') {
      return (
        <div
          ref={ref}
          className={cn(
            'absolute bottom-10 left-1/2 -translate-x-1/2 select-none z-[28]',
            'w-[110px] h-[110px] rounded-full flex items-center justify-center',
            'border transition-all duration-200 ease-out',
            armed
              ? 'border-solid border-qd-ink bg-qd-paper shadow-[0_0_0_8px_rgba(26,26,26,0.06)]'
              : 'border-dashed border-qd-line-strong bg-qd-surface',
          )}
        >
          <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-qd-ink-2">
            Holster
          </span>
        </div>
      );
    }

    if (style === 'ring') {
      const R = 60;
      const C = 2 * Math.PI * R;
      return (
        <div
          ref={ref}
          className="absolute bottom-[45px] left-1/2 -translate-x-1/2 w-[130px] h-[130px] flex items-center justify-center select-none z-[28]"
        >
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r={R} fill="none" stroke="#B8B8B5" strokeWidth="1.5"/>
            <circle
              cx="65" cy="65" r={R}
              fill="none" stroke="#1A1A1A" strokeWidth="2"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - ringProgress)}
              transform="rotate(-90 65 65)"
              className="transition-none"
            />
          </svg>
          <div className="relative z-10 text-center font-mono text-[9px] tracking-[0.18em] uppercase text-qd-ink-2">
            HOLSTER
            <div className="text-[8px] opacity-70 mt-1 normal-case tracking-normal">
              {armed ? 'hold steady' : (hasHover ? 'hover here' : 'press here')}
            </div>
          </div>
        </div>
      );
    }

    // Default: buzzer
    return (
      <div
        ref={ref}
        className={cn(
          'absolute bottom-[50px] left-1/2 -translate-x-1/2 select-none z-[28]',
          'w-[220px] h-[72px] rounded-[6px] flex flex-col items-center justify-center gap-1',
          'font-mono text-[11px] tracking-[0.18em] uppercase transition-all duration-200 ease-out',
          armed
            ? 'border border-solid border-qd-ink text-qd-ink bg-qd-paper shadow-[0_0_0_4px_rgba(26,26,26,0.05)]'
            : 'border border-dashed border-qd-line-strong text-qd-ink-2 bg-qd-surface',
        )}
      >
        ▼ HOLSTER ▼
        <span className="text-[9px] tracking-[0.08em] normal-case text-qd-ink-3">
          {armed ? armedHint : idleHint}
        </span>
      </div>
    );
  },
);
