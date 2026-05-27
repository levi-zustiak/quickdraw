import type { Server, Socket } from 'socket.io';
import type { RoomManager } from './room-manager';

export class GameLoop {
  constructor(
    private io: Server,
    private rooms: RoomManager,
  ) {}

  register(socket: Socket): void {
    const sid = socket.id.slice(0, 8);

    socket.on('time-sync', (callback: (serverTime: number) => void) => {
      callback(Date.now());
    });

    socket.on('dev-force-start', ({ roomCode, stageWidth, stageHeight }: { roomCode: string; stageWidth: number; stageHeight: number }) => {
      if (process.env.NODE_ENV === 'production') return;
      const actor = this.rooms.getActor(roomCode);
      if (!actor) return;
      console.log(`[ws] dev-force-start  room=${roomCode} sid=${sid}`);
      actor.send({ type: 'DEV_FORCE_START', stageWidth, stageHeight });
    });

    socket.on('ready-up', ({ roomCode }: { roomCode: string }) => {
      const actor = this.rooms.getActor(roomCode);
      if (!actor) return;
      console.log(`[ws] ready-up  sid=${sid} room=${roomCode}`);
      actor.send({ type: 'READY_UP', socketId: socket.id });
    });

    socket.on('unready', ({ roomCode }: { roomCode: string }) => {
      const actor = this.rooms.getActor(roomCode);
      if (!actor) return;
      console.log(`[ws] unready  sid=${sid} room=${roomCode}`);
      actor.send({ type: 'UNREADY', socketId: socket.id });
    });

    socket.on('arm-holster', ({ roomCode, stageWidth, stageHeight }: { roomCode: string; stageWidth: number; stageHeight: number }) => {
      const actor = this.rooms.getActor(roomCode);
      if (!actor) return;
      actor.send({ type: 'ARM_HOLSTER', socketId: socket.id, stageWidth, stageHeight });
    });

    socket.on('leave-holster', ({ roomCode }: { roomCode: string }) => {
      const actor = this.rooms.getActor(roomCode);
      if (!actor) return;
      actor.send({ type: 'LEAVE_HOLSTER', socketId: socket.id });
    });

    socket.on('client-shot', ({ roomCode, reactionMs, dx, dy, targetSize }: {
      roomCode: string;
      reactionMs: number;
      dx: number;
      dy: number;
      targetSize: number;
    }) => {
      const actor = this.rooms.getActor(roomCode);
      if (!actor) return;
      actor.send({ type: 'CLIENT_SHOT', socketId: socket.id, reactionMs, dx, dy, targetSize });
    });

    socket.on('request-next-round', ({ roomCode }: { roomCode: string }) => {
      const actor = this.rooms.getActor(roomCode);
      if (!actor) return;
      actor.send({ type: 'REQUEST_NEXT_ROUND' });
    });

    socket.on('rematch', ({ roomCode }: { roomCode: string }) => {
      const actor = this.rooms.getActor(roomCode);
      if (!actor) return;
      actor.send({ type: 'REMATCH' });
    });
  }
}
