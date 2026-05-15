'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Phase, Player, Target, Shot, RoundRecord, GameState, GameActions, TimingMode } from '@quickdraw/game-core';
import {
  makeRoomCode,
  computeDamage,
  rollBotShot,
  rollArmingDelay,
  pickP2Name,
  isHit,
} from '@quickdraw/game-core';

interface BotGameOptions {
  startingHp?: number;
  timingMode?: TimingMode;
  botDifficulty?: number;
}

export function useBotGame(opts: BotGameOptions = {}): { state: GameState; actions: GameActions } {
  const startingHp = opts.startingHp ?? 100;
  const timingMode = opts.timingMode ?? 'random';
  const botDifficulty = opts.botDifficulty ?? 0.55;

  const [phase, setPhase] = useState<Phase>('landing');
  const [roomCode, setRoomCode] = useState('');
  const [p1, setP1] = useState<Player>({ name: 'YOU', hp: startingHp, ready: false, wins: 0 });
  const [p2, setP2] = useState<Player>({ name: 'WAITING…', hp: startingHp, ready: false, wins: 0 });
  const [round, setRound] = useState(0);
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const [target, setTarget] = useState<Target | null>(null);
  const [shots, setShots] = useState<{ p1: Shot | null; p2: Shot | null }>({ p1: null, p2: null });
  const [hudFlash, setHudFlash] = useState({ p1: false, p2: false });
  const [holsterArmed, setHolsterArmed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [spectators, setSpectators] = useState(0);
  const [muzzleFlash, setMuzzleFlash] = useState(false);

  const armingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (armingTimerRef.current) clearTimeout(armingTimerRef.current);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
  }, []);

  const showToast = useCallback((msg: string, durationMs = 2000) => {
    setToast(msg);
    setTimeout(() => setToast(null), durationMs);
  }, []);

  const createRoom = useCallback((name = 'YOU', _roomCode?: string) => {
    const code = makeRoomCode();
    setRoomCode(code);
    setP1({ name: name.toUpperCase(), hp: startingHp, ready: false, wins: 0 });
    setP2({ name: 'WAITING…', hp: startingHp, ready: false, wins: 0 });
    setRound(0);
    setHistory([]);
    setSpectators(Math.floor(Math.random() * 4));
    setPhase('invite');
  }, [startingHp]);

  const startVsBot = useCallback(() => {
    setP2({ name: pickP2Name(), hp: startingHp, ready: true, wins: 0 });
    setPhase('lobby');
    showToast('Stranger walks in…', 1800);
  }, [startingHp, showToast]);

  // Auto-join opponent after delay on invite screen (bot fallback)
  useEffect(() => {
    if (phase !== 'invite') return;
    const t = setTimeout(() => {
      setP2({ name: pickP2Name(), hp: startingHp, ready: false, wins: 0 });
      setPhase('lobby');
      showToast('Stranger walks in…', 1800);
    }, 8000 + Math.random() * 4000);
    return () => clearTimeout(t);
  }, [phase, startingHp, showToast]);

  const readyUp = useCallback(() => {
    setP1((p) => ({ ...p, ready: true }));
    setP2((p) => ({ ...p, ready: true }));
    setTimeout(() => {
      setRound(1);
      setShots({ p1: null, p2: null });
      setTarget(null);
      setHolsterArmed(false);
      setPhase('holster');
    }, 800);
  }, []);

  const armHolster = useCallback(() => {
    if (phase !== 'holster') return;
    if (holsterArmed) return;
    setHolsterArmed(true);
    setPhase('arming');
    const delay = rollArmingDelay(timingMode);

    armingTimerRef.current = setTimeout(() => {
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
      setTarget({ x, y, size, spawnedAt });
      setPhase('drawing');

      const bot = rollBotShot(botDifficulty, size);
      botTimerRef.current = setTimeout(() => {
        setShots((s) => {
          if (s.p2) return s;
          const { dx, dy } = bot.hit;
          const dist = Math.hypot(dx, dy);
          return {
            ...s,
            p2: { reactionMs: bot.reactionMs, dx, dy, dist, damage: computeDamage(dist, size), targetSize: size },
          };
        });
      }, bot.reactionMs);
    }, delay);
  }, [phase, holsterArmed, timingMode, botDifficulty]);

  const leaveHolster = useCallback(() => {
    if (phase !== 'arming') return;
    if (armingTimerRef.current) clearTimeout(armingTimerRef.current);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setShots({ p1: null, p2: null });
    setTarget(null);
    setHolsterArmed(false);
    showToast('False start! Re-holster to try again…', 2400);
    setPhase('holster');
  }, [phase, showToast]);

  const fire = useCallback((clientX: number, clientY: number) => {
    if (phase === 'arming') { leaveHolster(); return; }
    if (phase !== 'drawing' || !target) return;
    setShots((s) => {
      if (s.p1) return s;
      const reactionMs = performance.now() - target.spawnedAt;
      const stage = document.querySelector('[data-qd-stage]');
      if (!stage) return s;
      const rect = stage.getBoundingClientRect();
      const dx = clientX - rect.left - target.x;
      const dy = clientY - rect.top - target.y;
      const dist = Math.hypot(dx, dy);
      setMuzzleFlash(true);
      setTimeout(() => setMuzzleFlash(false), 400);
      return {
        ...s,
        p1: { reactionMs, dx, dy, dist, damage: computeDamage(dist, target.size), targetSize: target.size },
      };
    });
  }, [phase, target, leaveHolster]);

  // Settle round once both shots land (or grace period after a hit)
  useEffect(() => {
    if (phase !== 'drawing') return;
    const p1Hit = shots.p1 ? isHit(shots.p1.dist, shots.p1.targetSize) : false;
    const p2Hit = shots.p2 ? isHit(shots.p2.dist, shots.p2.targetSize) : false;
    const bothShot = !!shots.p1 && !!shots.p2;
    if (!bothShot && !p1Hit && !p2Hit) return;
    const t = setTimeout(() => {
      const p1Shot = shots.p1;
      const p2Shot = shots.p2;
      const p1HitF = p1Shot ? isHit(p1Shot.dist, p1Shot.targetSize) : false;
      const p2HitF = p2Shot ? isHit(p2Shot.dist, p2Shot.targetSize) : false;

      let winner: 'p1' | 'p2' | null;
      let damage: number;

      if (p1HitF && p2HitF) {
        winner = p1Shot!.reactionMs <= p2Shot!.reactionMs ? 'p1' : 'p2';
        damage = (winner === 'p1' ? p1Shot! : p2Shot!).damage;
      } else if (p1HitF) {
        winner = 'p1';
        damage = p1Shot!.damage;
      } else if (p2HitF) {
        winner = 'p2';
        damage = p2Shot!.damage;
      } else {
        winner = null;
        damage = 0;
      }

      if (winner === 'p1') {
        setP2((p) => ({ ...p, hp: Math.max(0, p.hp - damage) }));
        setP1((p) => ({ ...p, wins: p.wins + 1 }));
        setHudFlash({ p1: false, p2: true });
      } else if (winner === 'p2') {
        setP1((p) => ({ ...p, hp: Math.max(0, p.hp - damage) }));
        setP2((p) => ({ ...p, wins: p.wins + 1 }));
        setHudFlash({ p1: true, p2: false });
      }
      setHistory((h) => [...h, { round, winner, p1Shot, p2Shot, damage }]);
      setPhase('result');
      setTimeout(() => setHudFlash({ p1: false, p2: false }), 600);
    }, 220);
    return () => clearTimeout(t);
  }, [shots, phase, round]);

  // After result: advance to next round or game over
  useEffect(() => {
    if (phase !== 'result') return;
    resultTimerRef.current = setTimeout(() => {
      if (p1.hp <= 0 || p2.hp <= 0) {
        setPhase('gameover');
      } else {
        setRound((r) => r + 1);
        setShots({ p1: null, p2: null });
        setTarget(null);
        setHolsterArmed(false);
        setPhase('holster');
      }
    }, 3500);
    return () => { if (resultTimerRef.current) clearTimeout(resultTimerRef.current); };
  }, [phase, p1.hp, p2.hp]);

  const rematch = useCallback(() => {
    setP1((p) => ({ ...p, hp: startingHp, ready: true, wins: 0 }));
    setP2((p) => ({ ...p, hp: startingHp, ready: true, wins: 0 }));
    setRound(1);
    setHistory([]);
    setShots({ p1: null, p2: null });
    setTarget(null);
    setHolsterArmed(false);
    setPhase('holster');
  }, [startingHp]);

  const reset = useCallback(() => {
    if (armingTimerRef.current) clearTimeout(armingTimerRef.current);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    setPhase('landing');
    setRoomCode('');
    setP1({ name: 'YOU', hp: startingHp, ready: false, wins: 0 });
    setP2({ name: 'WAITING…', hp: startingHp, ready: false, wins: 0 });
    setRound(0);
    setHistory([]);
    setShots({ p1: null, p2: null });
    setTarget(null);
    setHolsterArmed(false);
  }, [startingHp]);

  return {
    state: {
      phase, roomCode, p1, p2, round, history, target, shots,
      hudFlash, holsterArmed, toast, vsBot: true, spectators, muzzleFlash, startingHp,
    },
    actions: {
      createRoom, joinRoom: () => {}, startVsBot, readyUp, armHolster, leaveHolster, fire, rematch, reset, setToast,
    },
  };
}
