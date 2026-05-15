'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Phase, Player, Target, Shot, RoundRecord, GameState, GameActions } from '@quickdraw/game-core';
import { makeRoomCode, computeDamage } from '@quickdraw/game-core';
import { getSocket, clockOffsetMs } from './socket-client';

interface MultiplayerGameOptions {
  startingHp?: number;
}

export function useMultiplayerGame(opts: MultiplayerGameOptions = {}): { state: GameState; actions: GameActions } {
  const startingHp = opts.startingHp ?? 100;

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
  const [muzzleFlash, setMuzzleFlash] = useState(false);

  const myRoleRef = useRef<'p1' | 'p2' | null>(null);
  const currentRoomRef = useRef<string>('');
  const targetSpawnedAtRef = useRef<number>(0);
  const targetRef = useRef<Target | null>(null);
  const roundRef = useRef<number>(0);
  const targetSpawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, durationMs = 2000) => {
    setToast(msg);
    setTimeout(() => setToast(null), durationMs);
  }, []);

  useEffect(() => {
    const socket = getSocket();

    socket.on('joined', ({ role, roomCode: rc }) => {
      console.log(`[ws] joined  role=${role} room=${rc}`);
      myRoleRef.current = role;
      currentRoomRef.current = rc;
    });

    socket.on('join-error', ({ message }) => {
      console.log(`[ws] join-error  message="${message}"`);
      showToast(message, 3000);
      setPhase('landing');
    });

    socket.on('player-joined', ({ name }) => {
      console.log(`[ws] player-joined  name="${name}"`);
      setP2((p) => ({ ...p, name: name.toUpperCase() }));
      showToast('Opponent joined!', 1800);
    });

    socket.on('lobby-ready', ({ p1Name, p2Name, round: r }) => {
      console.log(`[ws] lobby-ready  p1="${p1Name}" p2="${p2Name}" round=${r}`);
      setP1((p) => ({ ...p, name: p1Name.toUpperCase(), hp: startingHp, ready: false }));
      setP2((p) => ({ ...p, name: (p2Name ?? 'OPPONENT').toUpperCase(), hp: startingHp, ready: false }));
      setRound(r);
      roundRef.current = r;
      setPhase('lobby');
    });

    socket.on('game-start', ({ round: r }) => {
      console.log(`[ws] game-start  round=${r}`);
      if (targetSpawnTimerRef.current) {
        clearTimeout(targetSpawnTimerRef.current);
        targetSpawnTimerRef.current = null;
      }
      setRound(r);
      roundRef.current = r;
      setShots({ p1: null, p2: null });
      setTarget(null);
      targetRef.current = null;
      setHolsterArmed(false);
      setPhase('holster');
    });

    socket.on('player-holstered', ({ role }: { role: 'p1' | 'p2' }) => {
      console.log(`[ws] player-holstered  role=${role}`);
      if (role !== myRoleRef.current) showToast('Opponent in holster — step up!', 1800);
    });

    socket.on('false-start', ({ by }: { by: 'p1' | 'p2' }) => {
      console.log(`[ws] false-start  by=${by}`);
      if (targetSpawnTimerRef.current) {
        clearTimeout(targetSpawnTimerRef.current);
        targetSpawnTimerRef.current = null;
      }
      setTarget(null);
      targetRef.current = null;
      setHolsterArmed(false);
      setPhase('holster');
      showToast(by === myRoleRef.current ? 'False start! Re-holster when ready…' : 'Opponent flinched! Holster up again…', 2400);
    });

    socket.on('target-spawn', ({ armingDelayMs, serverSpawnAt }) => {
      setPhase('arming');

      if (targetSpawnTimerRef.current) clearTimeout(targetSpawnTimerRef.current);
      const delay = serverSpawnAt - (Date.now() + clockOffsetMs);
      targetSpawnTimerRef.current = setTimeout(() => {
        targetSpawnTimerRef.current = null;
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
        targetSpawnedAtRef.current = spawnedAt;
        const t: Target = { x, y, size, spawnedAt };
        setTarget(t);
        targetRef.current = t;
        setPhase('drawing');
      }, Math.max(0, delay));
    });

    socket.on('round-result', ({ winner, p1Shot, p2Shot, damage, p1Hp, p2Hp }: { winner: 'p1' | 'p2'; p1Shot: Shot | null; p2Shot: Shot | null; damage: number; p1Hp: number; p2Hp: number }) => {
      console.log(`[ws] round-result  winner=${winner} damage=${damage} p1Hp=${p1Hp} p2Hp=${p2Hp}`);
      setShots({ p1: p1Shot, p2: p2Shot });
      setP1((p) => ({ ...p, hp: p1Hp, wins: winner === 'p1' ? p.wins + 1 : p.wins }));
      setP2((p) => ({ ...p, hp: p2Hp, wins: winner === 'p2' ? p.wins + 1 : p.wins }));
      setHudFlash({ p1: winner === 'p2', p2: winner === 'p1' });
      setHistory((h) => [...h, {
        round: roundRef.current,
        winner,
        p1Shot,
        p2Shot,
        damage,
      }]);
      setPhase('result');
      setTimeout(() => setHudFlash({ p1: false, p2: false }), 600);

      setTimeout(() => {
        if (p1Hp <= 0 || p2Hp <= 0) {
          setPhase('gameover');
        } else {
          const sock = getSocket();
          sock.emit('request-next-round', { roomCode: currentRoomRef.current });
        }
      }, 3500);
    });

    socket.on('next-round', ({ round: r }) => {
      if (targetSpawnTimerRef.current) {
        clearTimeout(targetSpawnTimerRef.current);
        targetSpawnTimerRef.current = null;
      }
      setRound(r);
      roundRef.current = r;
      setShots({ p1: null, p2: null });
      setTarget(null);
      targetRef.current = null;
      setHolsterArmed(false);
      setPhase('holster');
    });

    socket.on('player-left', () => {
      console.log('[ws] player-left');
      showToast('Opponent disconnected.', 3000);
      setPhase('invite');
    });

    return () => {
      socket.off('joined');
      socket.off('join-error');
      socket.off('player-joined');
      socket.off('lobby-ready');
      socket.off('game-start');
      socket.off('player-holstered');
      socket.off('false-start');
      socket.off('target-spawn');
      socket.off('round-result');
      socket.off('next-round');
      socket.off('player-left');
    };
  }, [startingHp, showToast]);

  function normalizeRoomCode(raw: string): string {
    const stripped = raw.replace(/·/g, '').replace(/\./g, '');
    if (stripped.length >= 3) return stripped.slice(0, 2) + '·' + stripped.slice(2);
    return raw.toUpperCase();
  }

  const joinRoom = useCallback((code: string, name: string) => {
    const normalizedCode = normalizeRoomCode(code);
    console.log(`[ws] emit join-room (join)  room=${normalizedCode} name="${name}"`);
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('join-room', { roomCode: normalizedCode, playerName: name.toUpperCase() });
  }, []);

  const createRoom = useCallback((name = 'YOU', roomCode?: string) => {
    const code = roomCode ?? makeRoomCode();
    setRoomCode(code);
    currentRoomRef.current = code;
    setP1({ name: name.toUpperCase(), hp: startingHp, ready: false, wins: 0 });
    setP2({ name: 'WAITING…', hp: startingHp, ready: false, wins: 0 });
    setRound(0);
    setHistory([]);
    setPhase('invite');

    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('join-room', { roomCode: code, playerName: name.toUpperCase() });
  }, [startingHp]);

  const startVsBot = useCallback(() => {
    // No-op in multiplayer mode — caller should switch to bot hook
  }, []);

  const readyUp = useCallback(() => {
    setP1((p) => ({ ...p, ready: true }));
    const socket = getSocket();
    socket.emit('ready-up', { roomCode: currentRoomRef.current });
  }, []);

  const armHolster = useCallback(() => {
    if (phase !== 'holster') return;
    if (holsterArmed) return;
    if (!currentRoomRef.current) return;
    setHolsterArmed(true);
    const socket = getSocket();
    socket.emit('arm-holster', { roomCode: currentRoomRef.current });
  }, [phase, holsterArmed]);

  const leaveHolster = useCallback(() => {
    if (phase !== 'holster' && phase !== 'arming') return;
    setHolsterArmed(false);
    const socket = getSocket();
    socket.emit('leave-holster', { roomCode: currentRoomRef.current });
    if (phase === 'arming') setPhase('holster');
  }, [phase]);

  const fire = useCallback((clientX: number, clientY: number) => {
    if (phase === 'arming') { leaveHolster(); return; }
    const t = targetRef.current;
    if (phase !== 'drawing' || !t) return;

    const stage = document.querySelector('[data-qd-stage]');
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const dx = clientX - rect.left - t.x;
    const dy = clientY - rect.top - t.y;
    const reactionMs = performance.now() - targetSpawnedAtRef.current;

    setMuzzleFlash(true);
    setTimeout(() => setMuzzleFlash(false), 400);

    const socket = getSocket();
    socket.emit('client-shot', {
      roomCode: currentRoomRef.current,
      reactionMs,
      dx,
      dy,
      targetSize: t.size,
    });
  }, [phase, leaveHolster]);

  const rematch = useCallback(() => {
    setP1((p) => ({ ...p, hp: startingHp, ready: true, wins: 0 }));
    setP2((p) => ({ ...p, hp: startingHp, ready: true, wins: 0 }));
    setHistory([]);
    setShots({ p1: null, p2: null });
    setTarget(null);
    setHolsterArmed(false);
    const socket = getSocket();
    socket.emit('rematch', { roomCode: currentRoomRef.current });
  }, [startingHp]);

  const reset = useCallback(() => {
    setPhase('landing');
    setRoomCode('');
    setP1({ name: 'YOU', hp: startingHp, ready: false, wins: 0 });
    setP2({ name: 'WAITING…', hp: startingHp, ready: false, wins: 0 });
    setRound(0);
    setHistory([]);
    setShots({ p1: null, p2: null });
    setTarget(null);
    setHolsterArmed(false);
    const socket = getSocket();
    socket.disconnect();
  }, [startingHp]);

  return {
    state: {
      phase, roomCode, p1, p2, round, history, target, shots,
      hudFlash, holsterArmed, toast, vsBot: false, spectators: 0, muzzleFlash, startingHp,
    },
    actions: {
      createRoom, joinRoom, startVsBot, readyUp, armHolster, leaveHolster, fire, rematch, reset, setToast,
    },
  };
}
