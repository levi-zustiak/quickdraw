import type { Player } from '@quickdraw/game-core';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface LobbyScreenProps {
  p1: Player;
  p2: Player;
  roomCode: string;
  spectators: number;
  max: number;
  onReady: () => void;
}

function PlayerCol({ player, role, max }: { player: Player; role: string; max: number }) {
  return (
    <div className="flex flex-col items-center gap-[10px] text-center">
      <div className="w-[88px] h-[88px] rounded-full bg-qd-ink-4 border border-qd-line text-qd-surface font-mono text-[20px] font-semibold inline-flex items-center justify-center shrink-0">
        {player.name.slice(0, 2)}
      </div>
      <div className="font-sans text-[22px] font-semibold tracking-[-0.005em] leading-[1.1] text-qd-ink">
        {player.name}
      </div>
      <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">{role}</span>
      <span className={cn(
        'inline-flex items-center gap-[6px] font-mono text-[10px] tracking-[0.08em] uppercase px-2 py-1 rounded-[2px]',
        player.ready
          ? 'bg-qd-accent-soft text-qd-accent'
          : 'bg-qd-paper text-qd-ink-2 border border-qd-line',
      )}>
        {player.ready && (
          <span className="w-[6px] h-[6px] rounded-full bg-qd-accent qd-pill-dot-blink inline-block"/>
        )}
        {!player.ready && (
          <span className="w-[6px] h-[6px] rounded-full bg-qd-ink-4 inline-block"/>
        )}
        {player.ready ? 'Ready' : 'Not ready'}
      </span>
      <div className="w-[220px] mt-1">
        <div className="h-3 bg-qd-surface border border-qd-line-strong rounded-[2px] relative overflow-hidden w-full qd-hp-bar">
          <div className="qd-hp-fill" style={{ width: '100%' }}/>
        </div>
      </div>
      <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-qd-ink-3">{max} HP</div>
    </div>
  );
}

export function LobbyScreen({ p1, p2, roomCode, spectators, max, onReady }: LobbyScreenProps) {
  return (
    <div className="flex-1 relative overflow-hidden bg-qd-paper">
      <div className="absolute inset-0 flex items-center justify-center z-10 p-6 overflow-y-auto">
        <div className="flex flex-col items-center gap-8 my-auto">
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">
            ROOM {roomCode} · 1V1
          </span>

          <h1 className="font-sans text-[36px] font-semibold tracking-[-0.01em] leading-[1.05] text-qd-ink">
            Square up.
          </h1>

          {/* VS layout */}
          <div className="grid items-center gap-[56px]" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
            <PlayerCol player={p1} role="Host" max={max}/>
            <div className="font-mono text-[28px] font-semibold tracking-[0.08em] text-qd-ink-3">VS</div>
            <PlayerCol player={p2} role="Challenger" max={max}/>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <Button variant="qd-primary" onClick={onReady} disabled={p1.ready}>
              {p1.ready ? 'Waiting…' : "I'm ready →"}
            </Button>
          </div>

          {spectators > 0 && (
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">
              👁 {spectators} {spectators === 1 ? 'stranger watching' : 'strangers watching'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
