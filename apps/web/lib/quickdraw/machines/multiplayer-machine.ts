import { setup, assign, fromCallback } from "xstate";
import type { Shot, Player, Target, RoundRecord } from "@quickdraw/game-core";
import { makeRoomCode } from "@quickdraw/game-core";
import type { TypedSocket } from "../socket-client";
import { clockOffsetMs } from "../socket-client";
import { toast } from "sonner";

interface SpawnPayload {
  armingDelayMs: number;
  serverSpawnAt: number;
  spawnX: number;
  spawnY: number;
  targetSize: number;
  minStageWidth: number;
  minStageHeight: number;
}

export interface MultiplayerContext {
  socket: TypedSocket;
  startingHp: number;
  roomCode: string;
  myRole: "p1" | "p2" | "spectator" | null;
  p1: Player;
  p2: Player;
  round: number;
  history: RoundRecord[];
  target: Target | null;
  shots: { p1: Shot | null; p2: Shot | null };
  hudFlash: { p1: boolean; p2: boolean };
  holsterArmed: boolean;
  spectators: number;
  muzzleFlash: boolean;
  spawnPayload: SpawnPayload | null;
}

export interface MultiplayerInput {
  socket: TypedSocket;
  startingHp: number;
}

export type MultiplayerEvent =
  | { type: "JOINED"; role: "p1" | "p2" | "spectator"; roomCode: string }
  | {
      type: "GAME_SNAPSHOT";
      phase: string;
      p1Name: string;
      p2Name: string;
      p1Hp: number;
      p2Hp: number;
      p1Ready: boolean;
      p2Ready: boolean;
      round: number;
      spectatorCount: number;
    }
  | { type: "SPECTATOR_COUNT"; count: number }
  | { type: "JOIN_ERROR"; message: string }
  | { type: "PLAYER_JOINED"; name: string; role: "p1" | "p2" }
  | { type: "PLAYER_LEFT" }
  | {
      type: "LOBBY_READY";
      p1Name: string;
      p2Name: string | null;
      round: number;
    }
  | { type: "GAME_START"; round: number }
  | {
      type: "TARGET_SPAWN";
      armingDelayMs: number;
      serverSpawnAt: number;
      spawnX: number;
      spawnY: number;
      targetSize: number;
      minStageWidth: number;
      minStageHeight: number;
    }
  | { type: "DRAWING_START"; target: Target }
  | {
      type: "ROUND_RESULT";
      winner: "p1" | "p2" | null;
      p1Shot: Shot | null;
      p2Shot: Shot | null;
      damage: number;
      p1Hp: number;
      p2Hp: number;
    }
  | { type: "NEXT_ROUND"; round: number }
  | { type: "PLAYER_HOLSTERED"; role: "p1" | "p2" }
  | { type: "FALSE_START"; by: "p1" | "p2" }
  | { type: "PLAYER_READY"; role: "p1" | "p2" }
  | { type: "PLAYER_UNREADY"; role: "p1" | "p2" }
  | { type: "CREATE_ROOM"; name: string; roomCode?: string }
  | { type: "JOIN_ROOM"; code: string; name: string }
  | { type: "READY_UP" }
  | { type: "UNREADY" }
  | { type: "ARM_HOLSTER"; stageWidth: number; stageHeight: number }
  | { type: "LEAVE_HOLSTER" }
  | {
      type: "FIRE";
      clientX: number;
      clientY: number;
      target: Target;
      spawnedAt: number;
    }
  | { type: "REMATCH" }
  | { type: "RESET" };

function makePlayer(name: string, hp: number): Player {
  return { name, hp, ready: false, wins: 0 };
}

export const multiplayerMachine = setup({
  types: {
    context: {} as MultiplayerContext,
    events: {} as MultiplayerEvent,
    input: {} as MultiplayerInput,
  },

  actors: {
    spawnTimer: fromCallback<
      { type: "DRAWING_START"; target: Target },
      SpawnPayload
    >(({ input, sendBack }) => {
      const delay = Math.max(
        0,
        input.serverSpawnAt - (Date.now() + clockOffsetMs),
      );
      const id = setTimeout(() => {
        const stage = document.querySelector("[data-qd-stage]");
        if (!stage) return;
        const spawnedAt = performance.now();
        sendBack({
          type: "DRAWING_START",
          target: {
            x: input.spawnX,
            y: input.spawnY,
            size: input.targetSize,
            spawnedAt,
          },
        });
      }, delay);
      return () => clearTimeout(id);
    }),
  },

  guards: {
    notHolsterArmed: ({ context }) => !context.holsterArmed,
    gameOver: ({ event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "ROUND_RESULT" }>;
      return e.p1Hp <= 0 || e.p2Hp <= 0;
    },
  },

  delays: {
    HUD_FLASH: () => 600,
    MUZZLE_FLASH: () => 400,
    RESULT_AUTO_ADVANCE: () => 3500,
  },

  actions: {
    setRoomAndConnect: assign(({ context, event }) => {
      if (event.type === "CREATE_ROOM") {
        const code = event.roomCode ?? makeRoomCode();
        if (!context.socket.connected) context.socket.connect();
        context.socket.emit("join-room", {
          roomCode: code,
          playerName: (event.name || "YOU").toUpperCase(),
        });
        return {
          roomCode: code,
          p1: makePlayer(
            (event.name || "YOU").toUpperCase(),
            context.startingHp,
          ),
          p2: makePlayer("WAITING…", context.startingHp),
          round: 0,
          history: [] as RoundRecord[],
        };
      }
      if (event.type === "JOIN_ROOM") {
        const code = event.code.replace(/[·.]/g, "").toUpperCase();
        if (!context.socket.connected) context.socket.connect();
        context.socket.emit("join-room", {
          roomCode: code,
          playerName: event.name.toUpperCase(),
        });
      }
      return {};
    }),

    applyJoined: assign(({ event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "JOINED" }>;
      return { myRole: e.role, roomCode: e.roomCode };
    }),

    applyGameSnapshot: assign(({ context, event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "GAME_SNAPSHOT" }>;
      return {
        p1: {
          name: e.p1Name.toUpperCase(),
          hp: e.p1Hp,
          ready: e.p1Ready,
          wins: context.p1.wins,
        },
        p2: {
          name: e.p2Name.toUpperCase(),
          hp: e.p2Hp,
          ready: e.p2Ready,
          wins: context.p2.wins,
        },
        round: e.round,
        spectators: e.spectatorCount,
      };
    }),

    applyPlayerJoined: assign(({ context, event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "PLAYER_JOINED" }>;
      toast("Opponent joined!");
      return {
        p2: { ...context.p2, name: e.name.toUpperCase() },
      };
    }),

    applyLobbyReady: assign(({ context, event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "LOBBY_READY" }>;
      return {
        p1: {
          ...context.p1,
          name: e.p1Name.toUpperCase(),
          hp: context.startingHp,
          ready: false,
        },
        p2: {
          ...context.p2,
          name: (e.p2Name ?? "OPPONENT").toUpperCase(),
          hp: context.startingHp,
          ready: false,
        },
        round: e.round,
      };
    }),

    applyGameStart: assign(({ event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "GAME_START" }>;
      return {
        round: e.round,
        shots: { p1: null, p2: null },
        target: null,
        holsterArmed: false,
      };
    }),

    applyPlayerReady: assign(({ context, event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "PLAYER_READY" }>;
      if (e.role === "p1") return { p1: { ...context.p1, ready: true } };
      return { p2: { ...context.p2, ready: true } };
    }),

    applyPlayerUnready: assign(({ context, event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "PLAYER_UNREADY" }>;
      if (e.role === "p1") return { p1: { ...context.p1, ready: false } };
      return { p2: { ...context.p2, ready: false } };
    }),

    readyUpOptimistic: assign(({ context }) => {
      context.socket.emit("ready-up", { roomCode: context.roomCode });
      const role = context.myRole;
      if (role === "p1") return { p1: { ...context.p1, ready: true } };
      if (role === "p2") return { p2: { ...context.p2, ready: true } };
      return {};
    }),

    unreadyOptimistic: assign(({ context }) => {
      context.socket.emit("unready", { roomCode: context.roomCode });
      const role = context.myRole;
      if (role === "p1") return { p1: { ...context.p1, ready: false } };
      if (role === "p2") return { p2: { ...context.p2, ready: false } };
      return {};
    }),

    armHolsterAndEmit: assign(({ context, event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "ARM_HOLSTER" }>;
      context.socket.emit("arm-holster", {
        roomCode: context.roomCode,
        stageWidth: e.stageWidth,
        stageHeight: e.stageHeight,
      });
      return { holsterArmed: true };
    }),

    leaveHolsterAndEmit: assign(({ context }) => {
      context.socket.emit("leave-holster", { roomCode: context.roomCode });
      return { holsterArmed: false };
    }),

    storeSpawnPayload: assign(({ event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "TARGET_SPAWN" }>;
      return { spawnPayload: e };
    }),

    applyDrawingStart: assign(({ event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "DRAWING_START" }>;
      return { target: e.target };
    }),

    applyFalseStart: assign(({ context, event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "FALSE_START" }>;
      const msg =
        e.by === context.myRole
          ? "False start! Re-holster when ready…"
          : "Opponent flinched! Holster up again…";

      toast(msg);
      return {
        target: null,
        holsterArmed: false,
        spawnPayload: null,
      };
    }),

    applyHolsteredToast: assign(({ context, event }) => {
      const e = event as Extract<
        MultiplayerEvent,
        { type: "PLAYER_HOLSTERED" }
      >;
      if (e.role !== context.myRole) toast("Opponent in holster — step up!");
      return {};
    }),

    fireAndEmit: assign(({ context, event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "FIRE" }>;
      const reactionMs = performance.now() - e.spawnedAt;
      const stage = document.querySelector("[data-qd-stage]");
      const rect = stage?.getBoundingClientRect();

      // target.x/y are offsets from the stage center (server uses center-relative coords).
      // The SVG center in viewport space = stageCenterX + target.x, stageCenterY + target.y.
      const stageCenterX = (rect?.left ?? 0) + (rect?.width ?? 0) / 2;
      const stageCenterY = (rect?.top ?? 0) + (rect?.height ?? 0) / 2;
      const dx = e.clientX - stageCenterX - e.target.x;
      const dy = e.clientY - stageCenterY - e.target.y;

      console.log("fire", { rect, stageCenterX, stageCenterY, dx, dy });
      context.socket.emit("client-shot", {
        roomCode: context.roomCode,
        reactionMs,
        dx,
        dy,
        targetSize: e.target.size,
      });
      return { muzzleFlash: true };
    }),

    applyRoundResult: assign(({ context, event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "ROUND_RESULT" }>;
      return {
        p1: {
          ...context.p1,
          hp: e.p1Hp,
          wins: e.winner === "p1" ? context.p1.wins + 1 : context.p1.wins,
        },
        p2: {
          ...context.p2,
          hp: e.p2Hp,
          wins: e.winner === "p2" ? context.p2.wins + 1 : context.p2.wins,
        },
        shots: { p1: e.p1Shot, p2: e.p2Shot },
        hudFlash: { p1: e.winner === "p2", p2: e.winner === "p1" },
        muzzleFlash: false,
        history: [
          ...context.history,
          {
            round: context.round,
            winner: e.winner,
            p1Shot: e.p1Shot,
            p2Shot: e.p2Shot,
            damage: e.damage,
          },
        ],
      };
    }),

    clearHudFlash: assign({ hudFlash: { p1: false, p2: false } }),

    requestNextRound: ({ context }) => {
      context.socket.emit("request-next-round", { roomCode: context.roomCode });
    },

    applyNextRound: assign(({ event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "NEXT_ROUND" }>;
      return {
        round: e.round,
        shots: { p1: null, p2: null },
        target: null,
        holsterArmed: false,
      };
    }),

    rematchAndEmit: assign(({ context }) => {
      context.socket.emit("rematch", { roomCode: context.roomCode });
      return {
        p1: { ...context.p1, hp: context.startingHp, ready: true, wins: 0 },
        p2: { ...context.p2, hp: context.startingHp, ready: true, wins: 0 },
        history: [] as RoundRecord[],
        shots: { p1: null, p2: null },
        target: null,
        holsterArmed: false,
      };
    }),

    // Applied when the server broadcasts game-start to the non-initiating player.
    // Mirrors rematchAndEmit but without emitting — the server-side reset already happened.
    applyRematch: assign(({ context, event }) => {
      const e = event as Extract<MultiplayerEvent, { type: "GAME_START" }>;
      return {
        p1: { ...context.p1, hp: context.startingHp, ready: false, wins: 0 },
        p2: { ...context.p2, hp: context.startingHp, ready: false, wins: 0 },
        history: [] as RoundRecord[],
        shots: { p1: null, p2: null },
        target: null,
        holsterArmed: false,
        round: e.round,
      };
    }),

    resetAndDisconnect: assign(({ context }) => {
      context.socket.disconnect();
      return {
        roomCode: "",
        myRole: null as "p1" | "p2" | "spectator" | null,
        p1: makePlayer("YOU", context.startingHp),
        p2: makePlayer("WAITING…", context.startingHp),
        round: 0,
        history: [] as RoundRecord[],
        shots: { p1: null, p2: null },
        target: null,
        holsterArmed: false,
        toast: null,
        muzzleFlash: false,
        spawnPayload: null,
      };
    }),
  },
}).createMachine({
  context: ({ input }) => ({
    socket: input.socket,
    startingHp: input.startingHp,
    roomCode: "",
    myRole: null,
    p1: makePlayer("YOU", input.startingHp),
    p2: makePlayer("WAITING…", input.startingHp),
    round: 0,
    history: [],
    target: null,
    shots: { p1: null, p2: null },
    hudFlash: { p1: false, p2: false },
    holsterArmed: false,
    toast: null,
    spectators: 0,
    muzzleFlash: false,
    spawnPayload: null,
  }),

  id: "multiplayer",
  initial: "landing",

  on: {
    GAME_SNAPSHOT: { actions: "applyGameSnapshot" },
    SPECTATOR_COUNT: {
      actions: assign(({ event }) => ({
        spectators: (
          event as Extract<MultiplayerEvent, { type: "SPECTATOR_COUNT" }>
        ).count,
      })),
    },
  },

  states: {
    landing: {
      on: {
        // CREATE_ROOM: optimistically show invite immediately; JOINED confirms role later.
        CREATE_ROOM: { target: "invite", actions: "setRoomAndConnect" },
        // JOIN_ROOM: wait for server confirmation before showing anything.
        JOIN_ROOM: { target: "connecting", actions: "setRoomAndConnect" },
      },
    },

    connecting: {
      on: {
        JOINED: [
          {
            guard: ({ event }) =>
              (event as Extract<MultiplayerEvent, { type: "JOINED" }>).role ===
              "spectator",
            target: "spectating",
            actions: "applyJoined",
          },
          {
            target: "invite",
            actions: "applyJoined",
          },
        ],
        JOIN_ERROR: {
          target: "landing",
          actions: () => toast("Failed to join"),
        },
      },
    },

    invite: {
      on: {
        // JOINED can arrive here for the CREATE_ROOM path — confirm role without transitioning.
        JOINED: {
          guard: ({ event }) =>
            (event as Extract<MultiplayerEvent, { type: "JOINED" }>).role !==
            "spectator",
          actions: "applyJoined",
        },
        PLAYER_JOINED: { actions: "applyPlayerJoined" },
        LOBBY_READY: { target: "lobby", actions: "applyLobbyReady" },
        PLAYER_LEFT: { actions: () => toast("Opponent disconnected.") },
        RESET: { target: "landing", actions: "resetAndDisconnect" },
      },
    },

    spectating: {
      on: {
        PLAYER_LEFT: { actions: () => toast("A player disconnected.") },
        RESET: { target: "landing", actions: "resetAndDisconnect" },
      },
    },

    lobby: {
      on: {
        PLAYER_READY: { actions: "applyPlayerReady" },
        PLAYER_UNREADY: { actions: "applyPlayerUnready" },
        READY_UP: { actions: "readyUpOptimistic" },
        UNREADY: { actions: "unreadyOptimistic" },
        GAME_START: { target: "playing", actions: "applyGameStart" },
        PLAYER_LEFT: {
          target: "invite",
          actions: () => toast("Opponent disconnected."),
        },
        RESET: { target: "landing", actions: "resetAndDisconnect" },
      },
    },

    playing: {
      initial: "holster",
      on: {
        PLAYER_LEFT: {
          target: "invite",
          actions: () => toast("Opponent disconnected."),
        },
        PLAYER_HOLSTERED: { actions: "applyHolsteredToast" },
        RESET: { target: "landing", actions: "resetAndDisconnect" },
        // Safety net: NEXT_ROUND can arrive in any sub-state if ROUND_RESULT was missed/dropped.
        NEXT_ROUND: { target: ".holster", actions: "applyNextRound" },
      },
      states: {
        holster: {
          on: {
            ARM_HOLSTER: {
              guard: "notHolsterArmed",
              actions: "armHolsterAndEmit",
            },
            LEAVE_HOLSTER: { actions: "leaveHolsterAndEmit" },
            TARGET_SPAWN: {
              target: "arming",
              actions: "storeSpawnPayload",
            },
          },
        },

        arming: {
          invoke: {
            src: "spawnTimer",
            input: ({ context }) => context.spawnPayload!,
          },
          on: {
            DRAWING_START: { target: "drawing", actions: "applyDrawingStart" },
            FALSE_START: { target: "holster", actions: "applyFalseStart" },
            LEAVE_HOLSTER: { actions: "leaveHolsterAndEmit" },
            // Handle round result arriving before our timer fires (clock drift / instant P1 shot).
            // Without this the machine gets stuck in arming forever.
            ROUND_RESULT: [
              {
                guard: "gameOver",
                target: "#multiplayer.gameover",
                actions: "applyRoundResult",
              },
              { target: "result", actions: "applyRoundResult" },
            ],
            NEXT_ROUND: { target: "holster", actions: "applyNextRound" },
          },
        },

        drawing: {
          on: {
            FIRE: { actions: "fireAndEmit" },
            ROUND_RESULT: [
              {
                guard: "gameOver",
                target: "#multiplayer.gameover",
                actions: "applyRoundResult",
              },
              { target: "result", actions: "applyRoundResult" },
            ],
            FALSE_START: { target: "holster", actions: "applyFalseStart" },
          },
        },

        result: {
          after: {
            HUD_FLASH: { actions: "clearHudFlash" },
            RESULT_AUTO_ADVANCE: { actions: "requestNextRound" },
          },
          on: {
            NEXT_ROUND: { target: "holster", actions: "applyNextRound" },
          },
        },
      },
    },

    gameover: {
      on: {
        REMATCH: { target: "playing", actions: "rematchAndEmit" },
        // The server broadcasts game-start to all clients when any player initiates a rematch.
        // Without this handler the non-initiating player's client silently drops the event.
        GAME_START: { target: "playing", actions: "applyRematch" },
        RESET: { target: "landing", actions: "resetAndDisconnect" },
      },
    },
  },
});
