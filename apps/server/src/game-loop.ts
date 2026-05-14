import type { Server, Socket } from 'socket.io';
import type { Shot } from '@quickdraw/game-core';
import { rollArmingDelay, computeDamage } from '@quickdraw/game-core';
import type { RoomManager } from './room-manager';
import { STARTING_HP } from './room-manager';

export class GameLoop {
  constructor(
    private io: Server,
    private rooms: RoomManager,
  ) {}

  register(socket: Socket): void {
    const sid = socket.id.slice(0, 8);

    socket.on('ready-up', ({ roomCode }: { roomCode: string }) => {
      const room = this.rooms.getRoom(roomCode);
      if (!room || room.phase !== 'lobby') return;

      const isP1 = room.p1SocketId === socket.id;
      if (isP1) room.p1Ready = true;
      else room.p2Ready = true;

      console.log(`[ws] ready-up  sid=${sid} room=${roomCode} role=${isP1 ? 'p1' : 'p2'} p1Ready=${room.p1Ready} p2Ready=${room.p2Ready}`);

      if (room.p1Ready && room.p2Ready) {
        room.phase = 'holster';
        console.log(`[ws] game-start  room=${roomCode} round=${room.round}`);
        this.io.to(roomCode).emit('game-start', { round: room.round });
      }
    });

    socket.on('arm-holster', ({ roomCode }: { roomCode: string }) => {
      const room = this.rooms.getRoom(roomCode);
      if (!room || room.phase !== 'holster') return;

      const isP1 = room.p1SocketId === socket.id;
      if (isP1) room.p1Holstered = true;
      else room.p2Holstered = true;

      console.log(`[ws] arm-holster  sid=${sid} room=${roomCode} role=${isP1 ? 'p1' : 'p2'} p1=${room.p1Holstered} p2=${room.p2Holstered}`);
      socket.to(roomCode).emit('player-holstered', { role: isP1 ? 'p1' as const : 'p2' as const });

      if (!room.p1Holstered || !room.p2Holstered) return;

      room.phase = 'arming';
      const armingDelayMs = rollArmingDelay('random');
      room.armingDelayMs = armingDelayMs;
      const serverSpawnAt = Date.now() + armingDelayMs;
      room.targetSpawnedAt = serverSpawnAt;

      console.log(`[ws] both-holstered  room=${roomCode} armingDelayMs=${armingDelayMs}`);
      this.io.to(roomCode).emit('target-spawn', { armingDelayMs, serverSpawnAt });

      setTimeout(() => {
        const r = this.rooms.getRoom(roomCode);
        if (r && r.phase === 'arming' && r.targetSpawnedAt === serverSpawnAt) r.phase = 'drawing';
      }, armingDelayMs);
    });

    socket.on('leave-holster', ({ roomCode }: { roomCode: string }) => {
      const room = this.rooms.getRoom(roomCode);
      if (!room) return;

      const isP1 = room.p1SocketId === socket.id;

      if (room.phase === 'holster') {
        if (isP1) room.p1Holstered = false;
        else room.p2Holstered = false;
        console.log(`[ws] leave-holster  sid=${sid} room=${roomCode} role=${isP1 ? 'p1' : 'p2'}`);
      } else if (room.phase === 'arming') {
        room.phase = 'holster';
        room.p1Holstered = false;
        room.p2Holstered = false;
        console.log(`[ws] false-start  sid=${sid} room=${roomCode} by=${isP1 ? 'p1' : 'p2'}`);
        this.io.to(roomCode).emit('false-start', { by: isP1 ? 'p1' as const : 'p2' as const });
      }
    });

    socket.on('client-shot', ({ roomCode, reactionMs, dx, dy, targetSize }: {
      roomCode: string;
      reactionMs: number;
      dx: number;
      dy: number;
      targetSize: number;
    }) => {
      const room = this.rooms.getRoom(roomCode);
      if (!room || room.phase !== 'drawing') return;

      const dist = Math.hypot(dx, dy);
      const shot: Shot = {
        reactionMs,
        dx,
        dy,
        dist,
        damage: computeDamage(dist, targetSize),
        targetSize,
      };

      const isP1 = room.p1SocketId === socket.id;
      if (isP1 && !room.p1Shot) {
        room.p1Shot = shot;
      } else if (!isP1 && !room.p2Shot) {
        room.p2Shot = shot;
      } else {
        return;
      }

      console.log(`[ws] client-shot  sid=${sid} room=${roomCode} role=${isP1 ? 'p1' : 'p2'} reactionMs=${Math.round(reactionMs)} dist=${Math.round(dist)}`);

      const bothShot = room.p1Shot && room.p2Shot;
      const graceMs = 220;

      if (bothShot) {
        this.settleRound(roomCode);
      } else {
        setTimeout(() => {
          const current = this.rooms.getRoom(roomCode);
          if (current && current.phase === 'drawing') {
            this.settleRound(roomCode);
          }
        }, graceMs);
      }
    });

    socket.on('request-next-round', ({ roomCode }: { roomCode: string }) => {
      const room = this.rooms.getRoom(roomCode);
      if (!room || room.phase !== 'result') return;

      room.phase = 'holster';
      room.p1Shot = null;
      room.p2Shot = null;
      room.round += 1;
      console.log(`[ws] request-next-round  sid=${sid} room=${roomCode} -> round=${room.round}`);
      this.io.to(roomCode).emit('next-round', { round: room.round });
    });

    socket.on('rematch', ({ roomCode }: { roomCode: string }) => {
      const room = this.rooms.getRoom(roomCode);
      if (!room || room.phase !== 'gameover') return;

      room.p1Hp = STARTING_HP;
      room.p2Hp = STARTING_HP;
      room.p1Shot = null;
      room.p2Shot = null;
      room.p1Ready = false;
      room.p2Ready = false;
      room.p1Holstered = false;
      room.p2Holstered = false;
      room.round = 1;
      room.phase = 'holster';
      console.log(`[ws] rematch  sid=${sid} room=${roomCode}`);
      this.io.to(roomCode).emit('game-start', { round: room.round });
    });
  }

  private settleRound(roomCode: string): void {
    const room = this.rooms.getRoom(roomCode);
    if (!room || room.phase !== 'drawing') return;

    const { p1Shot, p2Shot } = room;
    const winner: 'p1' | 'p2' =
      p1Shot && p2Shot
        ? p1Shot.reactionMs <= p2Shot.reactionMs ? 'p1' : 'p2'
        : p1Shot ? 'p1' : 'p2';

    const winShot = winner === 'p1' ? p1Shot! : p2Shot!;
    const damage = winShot.damage;

    if (winner === 'p1') {
      room.p2Hp = Math.max(0, room.p2Hp - damage);
    } else {
      room.p1Hp = Math.max(0, room.p1Hp - damage);
    }

    room.phase = (room.p1Hp <= 0 || room.p2Hp <= 0) ? 'gameover' : 'result';

    console.log(`[ws] round-result  room=${roomCode} winner=${winner} damage=${Math.round(damage)} p1Hp=${room.p1Hp} p2Hp=${room.p2Hp}`);
    this.io.to(roomCode).emit('round-result', {
      winner,
      p1Shot,
      p2Shot,
      damage,
      p1Hp: room.p1Hp,
      p2Hp: room.p2Hp,
    });
  }
}
