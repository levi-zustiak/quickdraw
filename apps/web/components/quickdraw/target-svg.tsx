interface TargetSvgProps {
  size?: number;
  hit?: { x: number; y: number } | null;
}

export function TargetSvg({ size = 200, hit = null }: TargetSvgProps) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size}>
      <circle cx="100" cy="100" r="98" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="1.25"/>
      <circle cx="100" cy="100" r="78" fill="none"    stroke="#1A1A1A" strokeWidth="1"/>
      <circle cx="100" cy="100" r="58" fill="#FAFAF8" stroke="#1A1A1A" strokeWidth="1"/>
      <circle cx="100" cy="100" r="38" fill="none"    stroke="#1A1A1A" strokeWidth="1"/>
      <circle cx="100" cy="100" r="18" fill="#FAFAF8" stroke="#1A1A1A" strokeWidth="1"/>
      <circle cx="100" cy="100" r="5"  fill="#1A1A1A"/>
      <g stroke="#1A1A1A" strokeWidth="0.8">
        <line x1="100" y1="2"   x2="100" y2="14"/>
        <line x1="100" y1="186" x2="100" y2="198"/>
        <line x1="2"   y1="100" x2="14"  y2="100"/>
        <line x1="186" y1="100" x2="198" y2="100"/>
      </g>
      {hit && (
        <g>
          <circle cx={hit.x} cy={hit.y} r="10" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="2"/>
          <circle cx={hit.x} cy={hit.y} r="2.5" fill="#1A1A1A"/>
        </g>
      )}
    </svg>
  );
}
