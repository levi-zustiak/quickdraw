import type { Shot } from './types';
export declare function makeRoomCode(): string;
export declare function computeDamage(distFromCenter: number, targetSize?: number): number;
export declare function damageBand(dist: number, targetSize?: number): string;
export declare function isHit(dist: number, targetSize: number): boolean;
export declare function hitInViewBox(shot: Shot): {
    x: number;
    y: number;
} | null;
export declare function rollBotShot(difficulty?: number, targetSize?: number): {
    reactionMs: number;
    hit: {
        dx: number;
        dy: number;
    };
};
export declare function rollArmingDelay(mode: string): number;
export declare function pickP1Name(): string;
export declare function pickP2Name(): string;
//# sourceMappingURL=utils.d.ts.map