interface AppBarProps {
  phaseLabel: string;
  roomCode: string;
  playerName?: string;
}

function LogoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="8" cy="8" r="1.75" fill="currentColor"/>
    </svg>
  );
}

export function AppBar({ phaseLabel, roomCode, playerName }: AppBarProps) {
  return (
    <div className="h-11 shrink-0 border-b border-qd-line bg-qd-surface flex items-center px-5 gap-6 font-mono text-[11px] tracking-[0.04em] text-qd-ink-2 z-50">
      <span className="inline-flex items-center gap-2 text-qd-ink font-semibold text-[12px] tracking-[0.08em]">
        <LogoIcon />
        QUICKDRAW
      </span>
      <span className="text-qd-ink-3 tracking-[0.04em]">{phaseLabel}</span>
      <span className="flex-1" />
      <span className="flex gap-4 items-center text-qd-ink-3">
        {playerName ? (
          <span className="text-qd-ink">{playerName.toUpperCase()}</span>
        ) : null}
        {roomCode ? (
          <span>ROOM · {roomCode}</span>
        ) : !playerName ? (
          <span>1V1 BROWSER DUEL</span>
        ) : null}
        <span className="text-qd-ink-4">v0.1</span>
      </span>
    </div>
  );
}
