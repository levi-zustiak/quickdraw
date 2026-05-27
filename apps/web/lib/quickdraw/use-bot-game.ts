'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useMachine } from '@xstate/react';
import type { GameState, GameActions, TimingMode } from '@quickdraw/game-core';
import { botMachine } from './machines/bot-machine';

interface BotGameOptions {
  startingHp?: number;
  timingMode?: TimingMode;
  botDifficulty?: number;
}

export function useBotGame(opts: BotGameOptions = {}): { state: GameState; actions: GameActions } {
  const startingHp = opts.startingHp ?? 100;
  const timingMode = opts.timingMode ?? 'random';
  const botDifficulty = opts.botDifficulty ?? 0.55;

  const [machineState, send] = useMachine(botMachine, {
    input: { startingHp, timingMode, botDifficulty },
  });

  const ctx = machineState.context;

  // Toast auto-clear
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!ctx.toast) return;
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      send({ type: 'SET_TOAST', msg: null });
    }, 2000);
    return () => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); };
  }, [ctx.toast, send]);

  const phase = (() => {
    const v = machineState.value;
    if (typeof v === 'string') return v as GameState['phase'];
    if ('playing' in v) {
      const inner = (v as Record<string, unknown>).playing;
      if (typeof inner === 'string') return inner as GameState['phase'];
      if (typeof inner === 'object' && inner !== null) {
        const key = Object.keys(inner)[0];
        if (key === 'drawing') return 'drawing' as GameState['phase'];
        return key as GameState['phase'];
      }
    }
    return 'landing' as GameState['phase'];
  })();

  const createRoom = useCallback((name = 'YOU') => {
    send({ type: 'CREATE_ROOM', name });
  }, [send]);

  const startVsBot = useCallback(() => {
    send({ type: 'START_VS_BOT' });
  }, [send]);

  const readyUp = useCallback(() => {
    send({ type: 'READY_UP' });
  }, [send]);

  const armHolster = useCallback(() => {
    send({ type: 'ARM_HOLSTER' });
  }, [send]);

  const leaveHolster = useCallback(() => {
    send({ type: 'LEAVE_HOLSTER' });
  }, [send]);

  const fire = useCallback((clientX: number, clientY: number) => {
    if (phase === 'arming') { leaveHolster(); return; }
    if (phase !== 'drawing') return;
    send({ type: 'FIRE', clientX, clientY });
  }, [phase, send, leaveHolster]);

  const rematch = useCallback(() => {
    send({ type: 'REMATCH' });
  }, [send]);

  const reset = useCallback(() => {
    send({ type: 'RESET' });
  }, [send]);

  const setToast = useCallback((msg: string | null) => {
    send({ type: 'SET_TOAST', msg });
  }, [send]);

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
      toast: ctx.toast,
      vsBot: true,
      spectators: ctx.spectators,
      muzzleFlash: ctx.muzzleFlash,
      startingHp,
      myRole: 'p1' as const,
    },
    actions: {
      createRoom,
      joinRoom: () => {},
      startVsBot,
      readyUp,
      unready: () => {},
      armHolster,
      leaveHolster,
      fire,
      rematch,
      reset,
      setToast,
    },
  };
}
