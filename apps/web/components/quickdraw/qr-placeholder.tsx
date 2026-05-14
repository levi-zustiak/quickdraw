'use client';

import { useMemo } from 'react';

const CELLS = 25;

function generateMatrix(seed: string): number[][] {
  // Deterministic-ish: seed the random with a hash
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const rng = () => {
    hash ^= hash << 13;
    hash ^= hash >> 17;
    hash ^= hash << 5;
    return (hash >>> 0) / 0xFFFFFFFF;
  };

  const mat: number[][] = [];
  for (let r = 0; r < CELLS; r++) {
    mat.push(Array.from({ length: CELLS }, () => rng() < 0.48 ? 1 : 0));
  }

  // Finder patterns
  const finder = (row: number, col: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const onBorder = i === 0 || i === 6 || j === 0 || j === 6;
        const inner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        mat[row + i][col + j] = onBorder || inner ? 1 : 0;
      }
    }
  };
  finder(0, 0); finder(0, CELLS - 7); finder(CELLS - 7, 0);
  return mat;
}

const matrixCache: Record<string, number[][]> = {};

interface QrPlaceholderProps {
  size?: number;
  seed?: string;
}

export function QrPlaceholder({ size = 140, seed = 'quickdraw' }: QrPlaceholderProps) {
  const mat = useMemo(() => {
    if (!matrixCache[seed]) matrixCache[seed] = generateMatrix(seed);
    return matrixCache[seed];
  }, [seed]);

  const cell = size / CELLS;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <rect width={size} height={size} fill="#fff"/>
      {mat.flatMap((row, r) =>
        row.map((v, c) =>
          v ? (
            <rect
              key={`${r}-${c}`}
              x={c * cell} y={r * cell}
              width={cell} height={cell}
              fill="#0a0a0a"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
