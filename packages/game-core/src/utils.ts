import type { Shot } from './types';

const CHARS = 'ACDEFHJKLMNPQRTUVWXY3479';
export function makeRoomCode(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

export function computeDamage(distFromCenter: number, targetSize = 200): number {
  const norm = distFromCenter / (targetSize / 2);
  if (norm <= 0.06) return 45;
  if (norm <= 0.18) return 35;
  if (norm <= 0.32) return 25;
  if (norm <= 0.55) return 15;
  if (norm <= 1.00) return 8;
  return 3;
}

export function damageBand(dist: number, targetSize = 200): string {
  const norm = dist / (targetSize / 2);
  if (norm <= 0.06) return 'BULLSEYE';
  if (norm <= 0.18) return 'INNER RING';
  if (norm <= 0.32) return 'MID RING';
  if (norm <= 0.55) return 'OUTER RING';
  if (norm <= 1.00) return 'EDGE';
  return 'GRAZE';
}

export function isHit(dist: number, targetSize: number): boolean {
  return dist <= targetSize / 2;
}

export function hitInViewBox(shot: Shot): { x: number; y: number } | null {
  if (!shot) return null;
  const scale = 200 / shot.targetSize;
  return { x: 100 + shot.dx * scale, y: 100 + shot.dy * scale };
}

export function rollBotShot(
  difficulty = 0.55,
  targetSize = 200,
): { reactionMs: number; hit: { dx: number; dy: number } } {
  const baseRT = 0.55 - difficulty * 0.3;
  const jitter = (Math.random() - 0.5) * 0.18;
  const reactionMs = Math.max(180, (baseRT + jitter) * 1000);
  const normSpread = 0.85 - difficulty * 0.7;
  const angle = Math.random() * Math.PI * 2;
  const r = Math.random() * normSpread * (targetSize / 2);
  return { reactionMs, hit: { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r } };
}

export function rollArmingDelay(mode: string): number {
  if (mode === 'fast') return 500 + Math.random() * 2500;
  if (mode === 'slow') return 5000 + Math.random() * 5000;
  return 1000 + Math.random() * 4000;
}

const P1_NAMES = ['YOU', 'RED-EYE PETE', 'BLACK-HAT HANK', 'DEAD-EYE DORA', 'SLIM WHITLOCK'];
const P2_NAMES = ['DEAD-HAND DAISY', 'BUCKSHOT BILL', 'SILAS CROW', 'MAD-DOG MAGGIE', 'STONE-COLD COLE'];

export function pickP1Name(): string { return P1_NAMES[Math.floor(Math.random() * P1_NAMES.length)]; }
export function pickP2Name(): string { return P2_NAMES[Math.floor(Math.random() * P2_NAMES.length)]; }
