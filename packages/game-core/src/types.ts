export type Phase =
  | 'landing'
  | 'invite'
  | 'lobby'
  | 'holster'
  | 'arming'
  | 'drawing'
  | 'result'
  | 'gameover';

export type HolsterStyle = 'buzzer' | 'glow' | 'ring';
export type TimingMode = 'fast' | 'random' | 'slow';

export interface Player {
  name: string;
  hp: number;
  ready: boolean;
  wins: number;
}

export interface Target {
  x: number;
  y: number;
  size: number;
  spawnedAt: number;
}

export interface Shot {
  reactionMs: number;
  dx: number;
  dy: number;
  dist: number;
  damage: number;
  targetSize: number;
}

export interface RoundRecord {
  round: number;
  winner: 'p1' | 'p2' | null;
  p1Shot: Shot | null;
  p2Shot: Shot | null;
  damage: number;
}

export interface GameState {
  phase: Phase;
  roomCode: string;
  p1: Player;
  p2: Player;
  round: number;
  history: RoundRecord[];
  target: Target | null;
  shots: { p1: Shot | null; p2: Shot | null };
  hudFlash: { p1: boolean; p2: boolean };
  holsterArmed: boolean;
  toast: string | null;
  vsBot: boolean;
  spectators: number;
  muzzleFlash: boolean;
  startingHp: number;
  myRole: 'p1' | 'p2' | 'spectator' | null;
}

export interface GameActions {
  createRoom: (name?: string, roomCode?: string) => void;
  joinRoom: (code: string, name: string) => void;
  startVsBot: () => void;
  readyUp: () => void;
  unready: () => void;
  armHolster: () => void;
  leaveHolster: () => void;
  fire: (clientX: number, clientY: number) => void;
  rematch: () => void;
  reset: () => void;
  setToast: (msg: string | null) => void;
}
