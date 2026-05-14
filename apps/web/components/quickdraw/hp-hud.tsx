import { cn } from '@/lib/utils';
import type { Player } from '@quickdraw/game-core';

interface HpHudProps {
  player: Player;
  align?: 'left' | 'right';
  hit?: boolean;
  max: number;
}

export function HpHud({ player, align = 'left', hit = false, max }: HpHudProps) {
  const pct = Math.max(0, (player.hp / max) * 100);
  const low = player.hp / max <= 0.3;
  const isRight = align === 'right';

  return (
    <div className={cn('flex flex-col gap-1 w-[280px] max-w-[42vw]', isRight && 'items-end')}>
      <div className="flex justify-between items-baseline gap-3 w-full">
        {isRight ? (
          <>
            <span className="font-mono text-[11px] tracking-[0.04em] text-qd-ink-2 tabular-nums">
              {Math.round(player.hp)} / {max}
            </span>
            <span className="font-sans text-sm font-semibold text-qd-ink">{player.name}</span>
          </>
        ) : (
          <>
            <span className="font-sans text-sm font-semibold text-qd-ink">{player.name}</span>
            <span className="font-mono text-[11px] tracking-[0.04em] text-qd-ink-2 tabular-nums">
              {Math.round(player.hp)} / {max}
            </span>
          </>
        )}
      </div>

      <div className={cn('h-3 bg-qd-surface border border-qd-line-strong rounded-[2px] relative overflow-hidden w-full qd-hp-bar', hit && 'qd-hp-bar-hit')}>
        <div
          className={cn('qd-hp-fill', low && 'qd-hp-fill-low')}
          style={{ width: `${pct}%`, ...(isRight ? { marginLeft: 'auto' } : {}) }}
        />
      </div>

      <div
        className="font-mono text-[9px] tracking-[0.12em] uppercase text-qd-ink-3"
        style={{ textAlign: isRight ? 'right' : 'left' }}
      >
        ROUND WINS · {player.wins}
      </div>
    </div>
  );
}
