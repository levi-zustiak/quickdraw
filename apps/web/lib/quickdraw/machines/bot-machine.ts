import { setup, assign, fromCallback } from 'xstate';
import type { Shot, Player, Target, RoundRecord, TimingMode } from '@quickdraw/game-core';
import {
  makeRoomCode,
  computeDamage,
  rollBotShot,
  rollArmingDelay,
  pickP2Name,
  isHit,
} from '@quickdraw/game-core';

export interface BotContext {
  startingHp: number;
  timingMode: TimingMode;
  botDifficulty: number;
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
  spectators: number;
  muzzleFlash: boolean;
  pendingBotShot: { reactionMs: number; dx: number; dy: number; dist: number; damage: number; targetSize: number } | null;
}

export interface BotInput {
  startingHp: number;
  timingMode: TimingMode;
  botDifficulty: number;
}

export type BotEvent =
  | { type: 'CREATE_ROOM'; name: string }
  | { type: 'START_VS_BOT' }
  | { type: 'READY_UP' }
  | { type: 'ARM_HOLSTER' }
  | { type: 'LEAVE_HOLSTER' }
  | { type: 'FIRE'; clientX: number; clientY: number }
  | { type: 'BOT_SHOT' }
  | { type: 'DRAWING_READY'; target: Target }
  | { type: 'GAME_START' }
  | { type: 'REMATCH' }
  | { type: 'RESET' }
  | { type: 'SET_TOAST'; msg: string | null };

function makePlayer(name: string, hp: number): Player {
  return { name, hp, ready: false, wins: 0 };
}

export const botMachine = setup({
  types: {
    context: {} as BotContext,
    events: {} as BotEvent,
    input: {} as BotInput,
  },

  actors: {
    armingTimer: fromCallback<{ type: 'DRAWING_READY'; target: Target }, { timingMode: TimingMode }>(
      ({ input, sendBack }) => {
        const delay = rollArmingDelay(input.timingMode);
        const id = setTimeout(() => {
          const stage = document.querySelector('[data-qd-stage]');
          if (!stage) return;
          const rect = stage.getBoundingClientRect();
          const size = Math.max(120, Math.min(200, Math.min(rect.width, rect.height) * 0.35));
          const padX = size / 2 + 12;
          const minY = 100 + size / 2;
          const maxY = rect.height - 170 - size / 2;
          const x = padX + Math.random() * Math.max(0, rect.width - padX * 2);
          const y = minY + Math.random() * Math.max(0, maxY - minY);
          const spawnedAt = performance.now();
          sendBack({ type: 'DRAWING_READY', target: { x, y, size, spawnedAt } });
        }, delay);
        return () => clearTimeout(id);
      },
    ),

    botShooter: fromCallback<{ type: 'BOT_SHOT' }, { reactionMs: number }>(
      ({ input, sendBack }) => {
        const id = setTimeout(() => {
          sendBack({ type: 'BOT_SHOT' });
        }, input.reactionMs);
        return () => clearTimeout(id);
      },
    ),

    autoJoinTimer: fromCallback<{ type: 'START_VS_BOT' }, Record<string, never>>(
      ({ sendBack }) => {
        const delay = 8000 + Math.random() * 4000;
        const id = setTimeout(() => sendBack({ type: 'START_VS_BOT' }), delay);
        return () => clearTimeout(id);
      },
    ),
  },

  guards: {
    notHolsterArmed: ({ context }) => !context.holsterArmed,
    bothShot: ({ context }) => !!context.shots.p1 && !!context.shots.p2,
    anyHitRegistered: ({ context }) => {
      const { p1, p2 } = context.shots;
      const p1Hit = p1 ? isHit(p1.dist, p1.targetSize) : false;
      const p2Hit = p2 ? isHit(p2.dist, p2.targetSize) : false;
      return p1Hit || p2Hit;
    },
    gameOver: ({ context }) => context.p1.hp <= 0 || context.p2.hp <= 0,
  },

  delays: {
    LOBBY_START_DELAY: () => 800,
    RESULT_AUTO_ADVANCE: () => 3500,
    HUD_FLASH: () => 600,
    GRACE_PERIOD: () => 220,
  },

  actions: {
    createRoom: assign(({ context, event }) => {
      const e = event as Extract<BotEvent, { type: 'CREATE_ROOM' }>;
      return {
        roomCode: makeRoomCode(),
        p1: makePlayer((e.name || 'YOU').toUpperCase(), context.startingHp),
        p2: makePlayer('WAITING…', context.startingHp),
        round: 0,
        history: [] as RoundRecord[],
        spectators: Math.floor(Math.random() * 4),
      };
    }),

    spawnBot: assign(({ context }) => ({
      p2: makePlayer(pickP2Name(), context.startingHp),
      toast: 'Stranger walks in…',
    })),

    setReady: assign(({ context }) => ({
      p1: { ...context.p1, ready: true },
      p2: { ...context.p2, ready: true },
    })),

    startRound: assign(({ context }) => ({
      round: context.round === 0 ? 1 : context.round,
      shots: { p1: null, p2: null },
      target: null,
      holsterArmed: false,
    })),

    setHolsterArmed: assign({ holsterArmed: true }),

    applyDrawingReady: assign(({ context, event }) => {
      const e = event as Extract<BotEvent, { type: 'DRAWING_READY' }>;
      const bot = rollBotShot(context.botDifficulty, e.target.size);
      const dist = Math.hypot(bot.hit.dx, bot.hit.dy);
      return {
        target: e.target,
        pendingBotShot: {
          reactionMs: bot.reactionMs,
          dx: bot.hit.dx,
          dy: bot.hit.dy,
          dist,
          damage: computeDamage(dist, e.target.size),
          targetSize: e.target.size,
        },
      };
    }),

    applyFalseStart: assign({
      target: null,
      holsterArmed: false,
      shots: { p1: null, p2: null },
      pendingBotShot: null,
      toast: 'False start! Re-holster to try again…',
    }),

    recordBotShot: assign(({ context }) => {
      const bot = context.pendingBotShot;
      if (!bot) return {};
      const shot: Shot = {
        reactionMs: bot.reactionMs,
        dx: bot.dx,
        dy: bot.dy,
        dist: bot.dist,
        damage: bot.damage,
        targetSize: bot.targetSize,
      };
      return { shots: { ...context.shots, p2: shot } };
    }),

    recordPlayerShot: assign(({ context, event }) => {
      const e = event as Extract<BotEvent, { type: 'FIRE' }>;
      if (context.shots.p1) return {};
      const t = context.target!;
      const stage = document.querySelector('[data-qd-stage]');
      if (!stage) return {};
      const rect = stage.getBoundingClientRect();
      const dx = e.clientX - rect.left - t.x;
      const dy = e.clientY - rect.top - t.y;
      const dist = Math.hypot(dx, dy);
      const reactionMs = performance.now() - t.spawnedAt;
      const shot: Shot = { reactionMs, dx, dy, dist, damage: computeDamage(dist, t.size), targetSize: t.size };
      return {
        shots: { ...context.shots, p1: shot },
        muzzleFlash: true,
      };
    }),

    settleRound: assign(({ context }) => {
      const { p1: p1Shot, p2: p2Shot } = context.shots;
      const p1Hit = p1Shot ? isHit(p1Shot.dist, p1Shot.targetSize) : false;
      const p2Hit = p2Shot ? isHit(p2Shot.dist, p2Shot.targetSize) : false;
      let winner: 'p1' | 'p2' | null;
      let damage: number;
      if (p1Hit && p2Hit) {
        winner = p1Shot!.reactionMs <= p2Shot!.reactionMs ? 'p1' : 'p2';
        damage = (winner === 'p1' ? p1Shot! : p2Shot!).damage;
      } else if (p1Hit) {
        winner = 'p1'; damage = p1Shot!.damage;
      } else if (p2Hit) {
        winner = 'p2'; damage = p2Shot!.damage;
      } else {
        winner = null; damage = 0;
      }
      const p1Hp = winner === 'p2' ? Math.max(0, context.p1.hp - damage) : context.p1.hp;
      const p2Hp = winner === 'p1' ? Math.max(0, context.p2.hp - damage) : context.p2.hp;
      return {
        p1: { ...context.p1, hp: p1Hp, wins: winner === 'p1' ? context.p1.wins + 1 : context.p1.wins },
        p2: { ...context.p2, hp: p2Hp, wins: winner === 'p2' ? context.p2.wins + 1 : context.p2.wins },
        hudFlash: { p1: winner === 'p2', p2: winner === 'p1' },
        muzzleFlash: false,
        history: [...context.history, { round: context.round, winner, p1Shot, p2Shot, damage }],
      };
    }),

    clearHudFlash: assign({ hudFlash: { p1: false, p2: false } }),

    advanceRound: assign(({ context }) => ({
      round: context.round + 1,
      shots: { p1: null, p2: null },
      target: null,
      holsterArmed: false,
      pendingBotShot: null,
    })),

    resetForRematch: assign(({ context }) => ({
      p1: { ...context.p1, hp: context.startingHp, ready: true, wins: 0 },
      p2: { ...context.p2, hp: context.startingHp, ready: true, wins: 0 },
      round: 1,
      history: [] as RoundRecord[],
      shots: { p1: null, p2: null },
      target: null,
      holsterArmed: false,
      pendingBotShot: null,
    })),

    resetAll: assign(({ context }) => ({
      roomCode: '',
      p1: makePlayer('YOU', context.startingHp),
      p2: makePlayer('WAITING…', context.startingHp),
      round: 0,
      history: [] as RoundRecord[],
      shots: { p1: null, p2: null },
      target: null,
      holsterArmed: false,
      toast: null,
      muzzleFlash: false,
      pendingBotShot: null,
    })),

    setToast: assign(({ event }) => {
      const e = event as Extract<BotEvent, { type: 'SET_TOAST' }>;
      return { toast: e.msg };
    }),
  },
}).createMachine({
  context: ({ input }) => ({
    startingHp: input.startingHp,
    timingMode: input.timingMode,
    botDifficulty: input.botDifficulty,
    roomCode: '',
    p1: makePlayer('YOU', input.startingHp),
    p2: makePlayer('WAITING…', input.startingHp),
    round: 0,
    history: [],
    target: null,
    shots: { p1: null, p2: null },
    hudFlash: { p1: false, p2: false },
    holsterArmed: false,
    toast: null,
    spectators: 0,
    muzzleFlash: false,
    pendingBotShot: null,
  }),

  id: 'bot',
  initial: 'landing',

  on: {
    SET_TOAST: { actions: 'setToast' },
  },

  states: {
    landing: {
      on: {
        CREATE_ROOM: { target: 'invite', actions: 'createRoom' },
      },
    },

    invite: {
      invoke: { src: 'autoJoinTimer', input: {} },
      on: {
        START_VS_BOT: { target: 'lobby', actions: 'spawnBot' },
      },
    },

    lobby: {
      on: {
        START_VS_BOT: { target: 'lobby', actions: 'spawnBot' },
        READY_UP: {
          target: 'startingGame',
          actions: 'setReady',
        },
        RESET: { target: 'landing', actions: 'resetAll' },
      },
    },

    startingGame: {
      after: {
        LOBBY_START_DELAY: { target: 'playing', actions: 'startRound' },
      },
    },

    playing: {
      initial: 'holster',
      on: {
        RESET: { target: 'landing', actions: 'resetAll' },
      },
      states: {
        holster: {
          on: {
            ARM_HOLSTER: {
              guard: 'notHolsterArmed',
              target: 'arming',
              actions: 'setHolsterArmed',
            },
          },
        },

        arming: {
          invoke: {
            src: 'armingTimer',
            input: ({ context }) => ({ timingMode: context.timingMode }),
          },
          on: {
            DRAWING_READY: {
              target: 'drawing',
              actions: 'applyDrawingReady',
            },
            LEAVE_HOLSTER: {
              target: 'holster',
              actions: 'applyFalseStart',
            },
          },
        },

        drawing: {
          invoke: {
            src: 'botShooter',
            input: ({ context }) => ({ reactionMs: context.pendingBotShot?.reactionMs ?? 500 }),
          },
          initial: 'active',
          states: {
            active: {
              on: {
                FIRE: { actions: 'recordPlayerShot' },
                BOT_SHOT: { actions: 'recordBotShot' },
              },
              always: [
                { guard: 'bothShot', target: '#bot.playing.settling' },
                { guard: 'anyHitRegistered', target: 'graceWait' },
              ],
            },
            graceWait: {
              on: {
                FIRE: { actions: 'recordPlayerShot' },
                BOT_SHOT: { actions: 'recordBotShot' },
              },
              always: { guard: 'bothShot', target: '#bot.playing.settling' },
              after: {
                GRACE_PERIOD: { target: '#bot.playing.settling' },
              },
            },
          },
        },

        settling: {
          entry: 'settleRound',
          always: [
            { guard: 'gameOver', target: '#bot.gameover' },
            { target: 'result' },
          ],
        },

        result: {
          after: {
            HUD_FLASH: { actions: 'clearHudFlash' },
            RESULT_AUTO_ADVANCE: { target: 'holster', actions: 'advanceRound' },
          },
        },
      },
    },

    gameover: {
      on: {
        REMATCH: { target: 'playing', actions: 'resetForRematch' },
        RESET: { target: 'landing', actions: 'resetAll' },
      },
    },
  },
});
