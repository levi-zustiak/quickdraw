'use client';

import { io, type Socket } from 'socket.io-client';
import type { Shot } from '@quickdraw/game-core';

export interface ServerToClientEvents {
  joined: (payload: { role: 'p1' | 'p2'; roomCode: string }) => void;
  'join-error': (payload: { message: string }) => void;
  'player-joined': (payload: { name: string; role: 'p1' | 'p2' }) => void;
  'player-left': (payload: Record<string, never>) => void;
  'lobby-ready': (payload: { p1Name: string; p2Name: string | null; round: number }) => void;
  'game-start': (payload: { round: number }) => void;
  'target-spawn': (payload: { armingDelayMs: number; serverSpawnAt: number }) => void;
  'round-result': (payload: {
    winner: 'p1' | 'p2';
    p1Shot: Shot | null;
    p2Shot: Shot | null;
    damage: number;
    p1Hp: number;
    p2Hp: number;
  }) => void;
  'next-round': (payload: { round: number }) => void;
  'player-holstered': (payload: { role: 'p1' | 'p2' }) => void;
  'false-start': (payload: { by: 'p1' | 'p2' }) => void;
  'player-ready': (payload: { role: 'p1' | 'p2' }) => void;
  'player-unready': (payload: { role: 'p1' | 'p2' }) => void;
}

export interface ClientToServerEvents {
  'join-room': (payload: { roomCode: string; playerName: string }) => void;
  'arm-holster': (payload: { roomCode: string }) => void;
  'client-shot': (payload: { roomCode: string; reactionMs: number; dx: number; dy: number; targetSize: number }) => void;
  'request-next-round': (payload: { roomCode: string }) => void;
  'ready-up': (payload: { roomCode: string }) => void;
  'unready': (payload: { roomCode: string }) => void;
  'rematch': (payload: { roomCode: string }) => void;
  'leave-holster': (payload: { roomCode: string }) => void;
  'time-sync': (callback: (serverTime: number) => void) => void;
}

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export let clockOffsetMs = 0;

function syncClockOffset(sock: TypedSocket): void {
  const SAMPLES = 3;
  let completed = 0;
  let totalOffset = 0;

  for (let i = 0; i < SAMPLES; i++) {
    const t0 = Date.now();
    sock.emit('time-sync', (serverTime: number) => {
      const t1 = Date.now();
      const rtt = t1 - t0;
      totalOffset += serverTime - (t0 + rtt / 2);
      completed++;
      if (completed === SAMPLES) {
        clockOffsetMs = totalOffset / SAMPLES;
      }
    });
  }
}

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3001';
    socket = io(url, { autoConnect: false, transports: ['websocket'] }) as TypedSocket;

    socket.on('connect', () => syncClockOffset(socket!));

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        socket?.disconnect();
      });
    }
  }
  return socket;
}
