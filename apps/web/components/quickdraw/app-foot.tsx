interface AppFootProps {
  left: string;
  right: string;
}

export function AppFoot({ left, right }: AppFootProps) {
  return (
    <div className="h-8 shrink-0 border-t border-qd-line bg-qd-surface flex items-center justify-between px-5 font-mono text-[10px] tracking-[0.08em] uppercase text-qd-ink-3 z-50">
      <span className="truncate">{left}</span>
      <span className="truncate">{right}</span>
    </div>
  );
}
