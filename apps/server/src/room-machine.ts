import { setup, assign } from "xstate";
import type { Shot } from "@quickdraw/game-core";
import { rollArmingDelay, computeDamage, isHit } from "@quickdraw/game-core";

export const STARTING_HP = 100;
const GRACE_MS = 220;

export interface IoRef {
  to: (room: string) => { emit: (event: string, data?: unknown) => void };
}

export interface RoomContext {
  io: IoRef;
  roomCode: string;
  p1SocketId: string;
  p1Name: string;
  p2SocketId: string | null;
  p2Name: string | null;
  p1Hp: number;
  p2Hp: number;
  p1Ready: boolean;
  p2Ready: boolean;
  p1Holstered: boolean;
  p2Holstered: boolean;
  p1StageWidth: number | null;
  p1StageHeight: number | null;
  p2StageWidth: number | null;
  p2StageHeight: number | null;
  armingDelayMs: number;
  targetSpawnedAt: number;
  p1Shot: Shot | null;
  p2Shot: Shot | null;
  round: number;
  spectatorSocketIds: Set<string>;
}

export interface RoomInput {
  io: IoRef;
  roomCode: string;
  p1SocketId: string;
  p1Name: string;
}

export type RoomEvent =
  | { type: "PLAYER_JOINED"; socketId: string; playerName: string }
  | { type: "READY_UP"; socketId: string }
  | { type: "UNREADY"; socketId: string }
  | {
      type: "ARM_HOLSTER";
      socketId: string;
      stageWidth: number;
      stageHeight: number;
    }
  | { type: "LEAVE_HOLSTER"; socketId: string }
  | {
      type: "CLIENT_SHOT";
      socketId: string;
      reactionMs: number;
      dx: number;
      dy: number;
      targetSize: number;
    }
  | { type: "REQUEST_NEXT_ROUND" }
  | { type: "REMATCH" }
  | { type: "PLAYER_LEFT"; socketId: string }
  | { type: "DEV_FORCE_START"; stageWidth: number; stageHeight: number };

function computeTargetSpawnCoords(
  minW: number,
  minH: number,
  targetSz: number,
) {
  const targetPadding = targetSz / 2;
  const spawnX = Math.round((Math.random() - 0.5) * (minW - targetPadding * 2));
  const spawnY = Math.round((Math.random() - 0.5) * (minH - targetPadding * 2));

  console.log(minW, minH, targetSz, spawnX, spawnY);

  return { spawnX, spawnY };
}

function roleOf(ctx: RoomContext, socketId: string): "p1" | "p2" {
  return ctx.p1SocketId === socketId ? "p1" : "p2";
}

export const roomMachine = setup({
  types: {
    context: {} as RoomContext,
    events: {} as RoomEvent,
    input: {} as RoomInput,
  },

  guards: {
    bothReady: ({ context }) => context.p1Ready && context.p2Ready,
    bothHolstered: ({ context }) => context.p1Holstered && context.p2Holstered,
    bothShot: ({ context }) => !!context.p1Shot && !!context.p2Shot,
    anyHitRegistered: ({ context }) => {
      const p1Hit = context.p1Shot
        ? isHit(context.p1Shot.dist, context.p1Shot.targetSize)
        : false;
      const p2Hit = context.p2Shot
        ? isHit(context.p2Shot.dist, context.p2Shot.targetSize)
        : false;
      return p1Hit || p2Hit;
    },
    gameOver: ({ context }) => context.p1Hp <= 0 || context.p2Hp <= 0,
  },

  delays: {
    ARMING_DELAY: ({ context }) => context.armingDelayMs,
    GRACE_PERIOD: () => GRACE_MS,
  },

  actions: {
    assignP2: assign(({ context, event }) => {
      const e = event as Extract<RoomEvent, { type: "PLAYER_JOINED" }>;
      return { p2SocketId: e.socketId, p2Name: e.playerName, round: 1 };
    }),

    broadcastLobbyReady: ({ context, event }) => {
      const e = event as Extract<RoomEvent, { type: "PLAYER_JOINED" }>;
      console.log(
        `[machine] lobby-ready  room=${context.roomCode} p1="${context.p1Name}" p2="${e.playerName}"`,
      );
      context.io.to(context.roomCode).emit("lobby-ready", {
        p1Name: context.p1Name,
        p2Name: e.playerName,
        round: 1,
      });
    },

    removeP2AndReset: assign(({ context, event }) => {
      const e = event as Extract<RoomEvent, { type: "PLAYER_LEFT" }>;
      if (context.p1SocketId === e.socketId && context.p2SocketId) {
        return {
          p1SocketId: context.p2SocketId,
          p1Name: context.p2Name ?? "Player",
          p1StageWidth: context.p2StageWidth,
          p1StageHeight: context.p2StageHeight,
          p2SocketId: null as string | null,
          p2Name: null as string | null,
          p2StageWidth: null as number | null,
          p2StageHeight: null as number | null,
          p1Ready: false,
          p2Ready: false,
          p1Holstered: false,
          p2Holstered: false,
        };
      }
      return {
        p2SocketId: null as string | null,
        p2Name: null as string | null,
        p1Ready: false,
        p2Ready: false,
        p1Holstered: false,
        p2Holstered: false,
      };
    }),

    broadcastPlayerLeft: ({ context }) => {
      console.log(`[machine] player-left  room=${context.roomCode}`);
      context.io.to(context.roomCode).emit("player-left", {});
    },

    applyReadyUp: assign(({ context, event }) => {
      const e = event as Extract<RoomEvent, { type: "READY_UP" }>;
      const role = roleOf(context, e.socketId);
      context.io.to(context.roomCode).emit("player-ready", { role });
      return role === "p1" ? { p1Ready: true } : { p2Ready: true };
    }),

    applyUnready: assign(({ context, event }) => {
      const e = event as Extract<RoomEvent, { type: "UNREADY" }>;
      const role = roleOf(context, e.socketId);
      context.io.to(context.roomCode).emit("player-unready", { role });
      return role === "p1" ? { p1Ready: false } : { p2Ready: false };
    }),

    broadcastGameStart: ({ context }) => {
      console.log(
        `[machine] game-start  room=${context.roomCode} round=${context.round}`,
      );
      context.io
        .to(context.roomCode)
        .emit("game-start", { round: context.round });
    },

    resetRoundState: assign({
      p1Shot: null,
      p2Shot: null,
      p1Holstered: false,
      p2Holstered: false,
    }),

    applyArmHolster: assign(({ context, event }) => {
      const e = event as Extract<RoomEvent, { type: "ARM_HOLSTER" }>;
      const isP1 = context.p1SocketId === e.socketId;
      const role = isP1 ? ("p1" as const) : ("p2" as const);
      console.log(
        `[machine] arm-holster  room=${context.roomCode} role=${role}`,
      );
      context.io.to(context.roomCode).emit("player-holstered", { role });
      return isP1
        ? {
            p1Holstered: true,
            p1StageWidth: e.stageWidth,
            p1StageHeight: e.stageHeight,
          }
        : {
            p2Holstered: true,
            p2StageWidth: e.stageWidth,
            p2StageHeight: e.stageHeight,
          };
    }),

    applyLeaveHolster: assign(({ context, event }) => {
      const e = event as Extract<RoomEvent, { type: "LEAVE_HOLSTER" }>;
      const isP1 = context.p1SocketId === e.socketId;
      return isP1 ? { p1Holstered: false } : { p2Holstered: false };
    }),

    beginArming: assign(({ context }) => {
      const armingDelayMs = rollArmingDelay("random");
      const serverSpawnAt = Date.now() + armingDelayMs;
      const minW = Math.min(
        context.p1StageWidth ?? 1280,
        context.p2StageWidth ?? 1280,
      );
      const minH = Math.min(
        context.p1StageHeight ?? 720,
        context.p2StageHeight ?? 720,
      );
      const targetSize = Math.max(
        120,
        Math.min(200, Math.min(minW, minH) * 0.35),
      );
      const { spawnX, spawnY } = computeTargetSpawnCoords(
        minW,
        minH,
        targetSize,
      );
      console.log(
        `[machine] both-holstered→arming  room=${context.roomCode} armingDelayMs=${armingDelayMs}`,
      );
      context.io.to(context.roomCode).emit("target-spawn", {
        armingDelayMs,
        serverSpawnAt,
        spawnX,
        spawnY,
        targetSize,
        minStageWidth: minW,
        minStageHeight: minH,
      });
      return { armingDelayMs, targetSpawnedAt: serverSpawnAt };
    }),

    devForceArm: assign(({ context, event }) => {
      const e = event as Extract<RoomEvent, { type: "DEV_FORCE_START" }>;
      const armingDelayMs = rollArmingDelay("random");
      const serverSpawnAt = Date.now() + armingDelayMs;
      const minW = e.stageWidth ?? 1280;
      const minH = e.stageHeight ?? 720;
      const targetSize = Math.max(
        120,
        Math.min(200, Math.min(minW, minH) * 0.35),
      );
      const { spawnX, spawnY } = computeTargetSpawnCoords(
        minW,
        minH,
        targetSize,
      );
      context.io.to(context.roomCode).emit("target-spawn", {
        armingDelayMs,
        serverSpawnAt,
        spawnX,
        spawnY,
        targetSize,
        minStageWidth: minW,
        minStageHeight: minH,
      });
      return {
        p1Holstered: true,
        p2Holstered: true,
        p1StageWidth: e.stageWidth,
        p1StageHeight: e.stageHeight,
        p2StageWidth: e.stageWidth,
        p2StageHeight: e.stageHeight,
        armingDelayMs,
        targetSpawnedAt: serverSpawnAt,
      };
    }),

    broadcastFalseStart: assign(({ context, event }) => {
      const e = event as Extract<RoomEvent, { type: "LEAVE_HOLSTER" }>;
      const isP1 = context.p1SocketId === e.socketId;
      console.log(
        `[machine] false-start  room=${context.roomCode} by=${isP1 ? "p1" : "p2"}`,
      );
      context.io
        .to(context.roomCode)
        .emit("false-start", { by: isP1 ? ("p1" as const) : ("p2" as const) });
      return {
        p1Holstered: false,
        p2Holstered: false,
        p1StageWidth: null as number | null,
        p1StageHeight: null as number | null,
        p2StageWidth: null as number | null,
        p2StageHeight: null as number | null,
      };
    }),

    recordShot: assign(({ context, event }) => {
      const e = event as Extract<RoomEvent, { type: "CLIENT_SHOT" }>;
      const isP1 = context.p1SocketId === e.socketId;
      if (isP1 && context.p1Shot) return {};
      if (!isP1 && context.p2Shot) return {};
      const dist = Math.hypot(e.dx, e.dy);
      const shot: Shot = {
        reactionMs: e.reactionMs,
        dx: e.dx,
        dy: e.dy,
        dist,
        damage: computeDamage(dist, e.targetSize),
        targetSize: e.targetSize,
      };
      console.log(
        `[machine] client-shot  room=${context.roomCode} role=${isP1 ? "p1" : "p2"} reactionMs=${Math.round(e.reactionMs)}`,
      );
      return isP1 ? { p1Shot: shot } : { p2Shot: shot };
    }),

    settleRound: assign(({ context }) => {
      const { p1Shot, p2Shot } = context;
      const p1Hit = p1Shot ? isHit(p1Shot.dist, p1Shot.targetSize) : false;
      const p2Hit = p2Shot ? isHit(p2Shot.dist, p2Shot.targetSize) : false;
      let winner: "p1" | "p2" | null;
      let damage: number;
      if (p1Hit && p2Hit) {
        winner = p1Shot!.reactionMs <= p2Shot!.reactionMs ? "p1" : "p2";
        damage = (winner === "p1" ? p1Shot! : p2Shot!).damage;
      } else if (p1Hit) {
        winner = "p1";
        damage = p1Shot!.damage;
      } else if (p2Hit) {
        winner = "p2";
        damage = p2Shot!.damage;
      } else {
        winner = null;
        damage = 0;
      }
      const p1Hp =
        winner === "p2" ? Math.max(0, context.p1Hp - damage) : context.p1Hp;
      const p2Hp =
        winner === "p1" ? Math.max(0, context.p2Hp - damage) : context.p2Hp;
      console.log(
        `[machine] round-result  room=${context.roomCode} winner=${winner} damage=${Math.round(damage)} p1Hp=${p1Hp} p2Hp=${p2Hp}`,
      );
      context.io
        .to(context.roomCode)
        .emit("round-result", { winner, p1Shot, p2Shot, damage, p1Hp, p2Hp });
      return { p1Hp, p2Hp };
    }),

    advanceRound: assign(({ context }) => {
      const round = context.round + 1;
      console.log(
        `[machine] next-round  room=${context.roomCode} round=${round}`,
      );
      context.io.to(context.roomCode).emit("next-round", { round });
      return {
        round,
        p1Shot: null,
        p2Shot: null,
        p1Holstered: false,
        p2Holstered: false,
      };
    }),

    resetForRematch: assign(({ context }) => {
      console.log(`[machine] rematch  room=${context.roomCode}`);
      context.io.to(context.roomCode).emit("game-start", { round: 1 });
      return {
        p1Hp: STARTING_HP,
        p2Hp: STARTING_HP,
        p1Shot: null,
        p2Shot: null,
        p1Ready: false,
        p2Ready: false,
        p1Holstered: false,
        p2Holstered: false,
        round: 1,
      };
    }),
  },
}).createMachine({
  context: ({ input }) => ({
    io: input.io,
    roomCode: input.roomCode,
    p1SocketId: input.p1SocketId,
    p1Name: input.p1Name,
    p2SocketId: null,
    p2Name: null,
    p1Hp: STARTING_HP,
    p2Hp: STARTING_HP,
    p1Ready: false,
    p2Ready: false,
    p1Holstered: false,
    p2Holstered: false,
    p1StageWidth: null,
    p1StageHeight: null,
    p2StageWidth: null,
    p2StageHeight: null,
    armingDelayMs: 0,
    targetSpawnedAt: 0,
    p1Shot: null,
    p2Shot: null,
    round: 0,
    spectatorSocketIds: new Set(),
  }),

  id: "room",
  initial: "waiting",

  states: {
    waiting: {
      on: {
        PLAYER_JOINED: {
          target: "lobby",
          actions: ["assignP2", "broadcastLobbyReady"],
        },
      },
    },

    lobby: {
      on: {
        READY_UP: { actions: "applyReadyUp" },
        UNREADY: { actions: "applyUnready" },
        PLAYER_LEFT: {
          target: "waiting",
          actions: ["removeP2AndReset", "broadcastPlayerLeft"],
        },
      },
      always: {
        guard: "bothReady",
        target: "playing",
        actions: "broadcastGameStart",
      },
    },

    playing: {
      initial: "holster",
      on: {
        PLAYER_LEFT: {
          target: "waiting",
          actions: ["removeP2AndReset", "broadcastPlayerLeft"],
        },
      },
      states: {
        holster: {
          entry: "resetRoundState",
          on: {
            ARM_HOLSTER: { actions: "applyArmHolster" },
            LEAVE_HOLSTER: { actions: "applyLeaveHolster" },
            DEV_FORCE_START: {
              target: "arming",
              actions: "devForceArm",
            },
          },
          always: {
            guard: "bothHolstered",
            target: "arming",
            actions: "beginArming",
          },
        },

        arming: {
          after: {
            ARMING_DELAY: { target: "drawing" },
          },
          on: {
            LEAVE_HOLSTER: {
              target: "holster",
              actions: "broadcastFalseStart",
            },
          },
        },

        drawing: {
          initial: "active",
          states: {
            active: {
              on: {
                CLIENT_SHOT: { actions: "recordShot" },
              },
              always: [
                { guard: "bothShot", target: "#room.playing.settling" },
                { guard: "anyHitRegistered", target: "graceWait" },
              ],
            },
            graceWait: {
              on: {
                CLIENT_SHOT: { actions: "recordShot" },
              },
              always: { guard: "bothShot", target: "#room.playing.settling" },
              after: {
                GRACE_PERIOD: { target: "#room.playing.settling" },
              },
            },
          },
        },

        settling: {
          entry: "settleRound",
          always: [
            { guard: "gameOver", target: "#room.gameover" },
            { target: "result" },
          ],
        },

        result: {
          on: {
            REQUEST_NEXT_ROUND: {
              target: "holster",
              actions: "advanceRound",
            },
          },
        },
      },
    },

    gameover: {
      on: {
        REMATCH: {
          target: "playing",
          actions: "resetForRematch",
        },
        PLAYER_LEFT: {
          target: "waiting",
          actions: ["removeP2AndReset", "broadcastPlayerLeft"],
        },
      },
    },
  },
});
