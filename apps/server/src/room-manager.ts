import type { Shot } from '@quickdraw/game-core';

export interface RoomState {
  p1SocketId: string;
  p1Name: string;
  p2SocketId: string | null;
  p2Name: string | null;
  phase: 'waiting' | 'lobby' | 'holster' | 'arming' | 'drawing' | 'result' | 'gameover';
  round: number;
  p1Hp: number;
  p2Hp: number;
  p1Ready: boolean;
  p2Ready: boolean;
  p1Holstered: boolean;
  p2Holstered: boolean;
  armingDelayMs: number;
  targetSpawnedAt: number;
  p1Shot: Shot | null;
  p2Shot: Shot | null;
  spectatorSocketIds: Set<string>;
}

export const STARTING_HP = 100;

export class RoomManager {
  private rooms = new Map<string, RoomState>();

  joinRoom(
    roomCode: string,
    socketId: string,
    playerName: string,
  ): { role: 'p1' | 'p2'; room: RoomState } | { error: string } {
    let room = this.rooms.get(roomCode);

    if (!room) {
      room = {
        p1SocketId: socketId,
        p1Name: playerName,
        p2SocketId: null,
        p2Name: null,
        phase: 'waiting',
        round: 0,
        p1Hp: STARTING_HP,
        p2Hp: STARTING_HP,
        p1Ready: false,
        p2Ready: false,
        p1Holstered: false,
        p2Holstered: false,
        armingDelayMs: 0,
        targetSpawnedAt: 0,
        p1Shot: null,
        p2Shot: null,
        spectatorSocketIds: new Set(),
      };
      this.rooms.set(roomCode, room);
      return { role: 'p1', room };
    }

    if (room.p2SocketId) {
      return { error: 'Room is full' };
    }

    room.p2SocketId = socketId;
    room.p2Name = playerName;
    room.phase = 'lobby';
    return { role: 'p2', room };
  }

  joinAsSpectator(roomCode: string, socketId: string): { room: RoomState } | { error: string } {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase === 'waiting') return { error: 'Room not found' };
    room.spectatorSocketIds.add(socketId);
    return { room };
  }

  leaveRoom(socketId: string):
    | { type: 'player'; roomCode: string; room: RoomState }
    | { type: 'spectator'; roomCode: string; spectatorCount: number }
    | null {
    for (const [roomCode, room] of this.rooms) {
      if (room.spectatorSocketIds.has(socketId)) {
        room.spectatorSocketIds.delete(socketId);
        return { type: 'spectator', roomCode, spectatorCount: room.spectatorSocketIds.size };
      }
      if (room.p1SocketId === socketId || room.p2SocketId === socketId) {
        if (room.p1SocketId === socketId) {
          if (room.p2SocketId) {
            room.p1SocketId = room.p2SocketId;
            room.p1Name = room.p2Name ?? 'Player';
            room.p2SocketId = null;
            room.p2Name = null;
            room.phase = 'waiting';
            room.p1Holstered = false;
            room.p2Holstered = false;
          } else {
            this.rooms.delete(roomCode);
            return null;
          }
        } else {
          room.p2SocketId = null;
          room.p2Name = null;
          room.phase = 'waiting';
          room.p1Holstered = false;
          room.p2Holstered = false;
        }
        return { type: 'player', roomCode, room };
      }
    }
    return null;
  }

  getRoom(roomCode: string): RoomState | undefined {
    return this.rooms.get(roomCode);
  }

  getRoomBySocket(socketId: string): { roomCode: string; room: RoomState } | null {
    for (const [roomCode, room] of this.rooms) {
      if (room.p1SocketId === socketId || room.p2SocketId === socketId) {
        return { roomCode, room };
      }
    }
    return null;
  }
}
