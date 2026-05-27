"use client";

import { useEffect, useCallback } from "react";
import { useMachine } from "@xstate/react";
import type { GameState, GameActions } from "@quickdraw/game-core";
import { getSocket } from "./socket-client";
import { multiplayerMachine } from "./machines/multiplayer-machine";

interface MultiplayerGameOptions {
  startingHp?: number;
}

export function useMultiplayerGame(opts: MultiplayerGameOptions = {}): {
  state: GameState;
  actions: GameActions;
} {
  const startingHp = opts.startingHp ?? 100;
  const socket = getSocket();

  const [machineState, send] = useMachine(multiplayerMachine, {
    input: { socket, startingHp },
  });

  const ctx = machineState.context;

  // Bridge socket events → machine events
  useEffect(() => {
    socket.on("joined", ({ role, roomCode }) => {
      console.log(`[ws] joined  role=${role} room=${roomCode}`);
      send({ type: "JOINED", role, roomCode });
    });

    socket.on("game-snapshot", (payload) => {
      send({ type: "GAME_SNAPSHOT", ...payload });
    });

    socket.on("spectator-count", ({ count }) => {
      send({ type: "SPECTATOR_COUNT", count });
    });

    socket.on("join-error", ({ message }) => {
      console.log(`[ws] join-error  message="${message}"`);
      send({ type: "JOIN_ERROR", message });
    });

    socket.on("player-joined", ({ name, role }) => {
      console.log(`[ws] player-joined  name="${name}"`);
      send({ type: "PLAYER_JOINED", name, role });
    });

    socket.on("lobby-ready", (payload) => {
      console.log(
        `[ws] lobby-ready  p1="${payload.p1Name}" p2="${payload.p2Name}"`,
      );
      send({ type: "LOBBY_READY", ...payload });
    });

    socket.on("game-start", ({ round }) => {
      console.log(`[ws] game-start  round=${round}`);
      send({ type: "GAME_START", round });
    });

    socket.on("player-holstered", ({ role }) => {
      console.log(`[ws] player-holstered  role=${role}`);
      send({ type: "PLAYER_HOLSTERED", role });
    });

    socket.on("player-ready", ({ role }) => {
      console.log(`[ws] player-ready  role=${role}`);
      send({ type: "PLAYER_READY", role });
    });

    socket.on("player-unready", ({ role }) => {
      console.log(`[ws] player-unready  role=${role}`);
      send({ type: "PLAYER_UNREADY", role });
    });

    socket.on("false-start", ({ by }) => {
      console.log(`[ws] false-start  by=${by}`);
      send({ type: "FALSE_START", by });
    });

    socket.on("target-spawn", (payload) => {
      send({ type: "TARGET_SPAWN", ...payload });
    });

    socket.on("round-result", (payload) => {
      console.log(
        `[ws] round-result  winner=${payload.winner} p1Hp=${payload.p1Hp} p2Hp=${payload.p2Hp}`,
      );
      send({ type: "ROUND_RESULT", ...payload });
    });

    socket.on("next-round", ({ round }) => {
      send({ type: "NEXT_ROUND", round });
    });

    socket.on("player-left", () => {
      console.log("[ws] player-left");
      send({ type: "PLAYER_LEFT" });
    });

    return () => {
      socket.off("joined");
      socket.off("join-error");
      socket.off("player-joined");
      socket.off("lobby-ready");
      socket.off("game-start");
      socket.off("player-holstered");
      socket.off("player-ready");
      socket.off("player-unready");
      socket.off("game-snapshot");
      socket.off("spectator-count");
      socket.off("false-start");
      socket.off("target-spawn");
      socket.off("round-result");
      socket.off("next-round");
      socket.off("player-left");
    };
  }, [socket, send]);

  // Dev shortcut: backtick triggers dev-force-start
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "`") return;
      const stage = document.querySelector("[data-qd-stage]");
      const rect = stage?.getBoundingClientRect();
      socket.emit("dev-force-start", {
        roomCode: ctx.roomCode,
        stageWidth: rect?.width ?? 1280,
        stageHeight: rect?.height ?? 720,
      });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [socket, ctx.roomCode]);

  const phase = (() => {
    const v = machineState.value;
    if (v === "connecting") return "landing" as const;
    if (typeof v === "string") return v as GameState["phase"];
    if ("playing" in v) return v.playing as GameState["phase"];
    return "landing" as const;
  })();

  const createRoom = useCallback(
    (name = "YOU", roomCode?: string) => {
      send({ type: "CREATE_ROOM", name, roomCode });
    },
    [send],
  );

  const joinRoom = useCallback(
    (code: string, name: string) => {
      send({ type: "JOIN_ROOM", code, name });
    },
    [send],
  );

  const startVsBot = useCallback(() => {
    // No-op: caller switches to bot hook
  }, []);

  const readyUp = useCallback(() => {
    send({ type: "READY_UP" });
  }, [send]);

  const unready = useCallback(() => {
    send({ type: "UNREADY" });
  }, [send]);

  const armHolster = useCallback(() => {
    const stage = document.querySelector("[data-qd-stage]");
    const rect = stage?.getBoundingClientRect();
    send({
      type: "ARM_HOLSTER",
      stageWidth: rect?.width ?? 1280,
      stageHeight: rect?.height ?? 720,
    });
  }, [send]);

  const leaveHolster = useCallback(() => {
    send({ type: "LEAVE_HOLSTER" });
  }, [send]);

  const fire = useCallback(
    (clientX: number, clientY: number) => {
      if (phase === "arming") {
        leaveHolster();
        return;
      }
      const t = ctx.target;
      if (phase !== "drawing" || !t) return;
      send({
        type: "FIRE",
        clientX,
        clientY,
        target: t,
        spawnedAt: t.spawnedAt,
      });
    },
    [phase, ctx.target, send, leaveHolster],
  );

  const rematch = useCallback(() => {
    send({ type: "REMATCH" });
  }, [send]);

  const reset = useCallback(() => {
    send({ type: "RESET" });
  }, [send]);

  const setToast = useCallback(
    (msg: string | null) => {
      send({ type: "SET_TOAST", msg });
    },
    [send],
  );

  return {
    state: {
      phase,
      roomCode: ctx.roomCode,
      p1: ctx.p1,
      p2: ctx.p2,
      round: ctx.round,
      history: ctx.history,
      target: ctx.target,
      shots: ctx.shots,
      hudFlash: ctx.hudFlash,
      holsterArmed: ctx.holsterArmed,
      vsBot: false,
      spectators: ctx.spectators,
      muzzleFlash: ctx.muzzleFlash,
      startingHp,
      myRole: ctx.myRole,
    },
    actions: {
      createRoom,
      joinRoom,
      startVsBot,
      readyUp,
      unready,
      armHolster,
      leaveHolster,
      fire,
      rematch,
      reset,
      setToast,
    },
  };
}
