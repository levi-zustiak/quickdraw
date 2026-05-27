import { createActor } from 'xstate';
import type { Actor } from 'xstate';
import { roomMachine, STARTING_HP } from './room-machine';
import type { RoomContext, IoRef } from './room-machine';

export { STARTING_HP };

export type RoomActor = Actor<typeof roomMachine>;

export class RoomManager {
  private actors = new Map<string, RoomActor>();

  joinRoom(
    io: IoRef,
    roomCode: string,
    socketId: string,
    playerName: string,
  ): { role: 'p1'; actor: RoomActor } | { role: 'p2'; actor: RoomActor } | { error: string } {
    let actor = this.actors.get(roomCode);

    if (!actor) {
      actor = createActor(roomMachine, {
        input: { io, roomCode, p1SocketId: socketId, p1Name: playerName },
      });
      actor.start();
      this.actors.set(roomCode, actor);
      return { role: 'p1', actor };
    }

    const ctx = actor.getSnapshot().context;
    if (ctx.p2SocketId !== null) {
      return { error: 'Room is full' };
    }

    // Caller must call actor.send('PLAYER_JOINED') after socket.join(roomCode)
    // so the lobby-ready broadcast reaches P2's socket.
    return { role: 'p2', actor };
  }

  joinAsSpectator(roomCode: string, socketId: string): { context: RoomContext } | { error: string } {
    const actor = this.actors.get(roomCode);
    if (!actor) return { error: 'Room not found' };
    const ctx = actor.getSnapshot().context;
    if (!ctx.p2SocketId) return { error: 'Room not found' };
    ctx.spectatorSocketIds.add(socketId);
    return { context: ctx };
  }

  leaveRoom(socketId: string):
    | { type: 'player'; roomCode: string }
    | { type: 'spectator'; roomCode: string; spectatorCount: number }
    | null {
    for (const [roomCode, actor] of this.actors) {
      const ctx = actor.getSnapshot().context;

      if (ctx.spectatorSocketIds.has(socketId)) {
        ctx.spectatorSocketIds.delete(socketId);
        return { type: 'spectator', roomCode, spectatorCount: ctx.spectatorSocketIds.size };
      }

      if (ctx.p1SocketId === socketId || ctx.p2SocketId === socketId) {
        const isP1 = ctx.p1SocketId === socketId;
        const hasP2 = !!ctx.p2SocketId;

        if (!hasP2 || (isP1 && !hasP2)) {
          // Only one player — destroy room
          actor.stop();
          this.actors.delete(roomCode);
          return null;
        }

        actor.send({ type: 'PLAYER_LEFT', socketId });

        // If the machine went back to waiting with no p2, and p1 leaves entirely, clean up
        const newCtx = actor.getSnapshot().context;
        if (!newCtx.p2SocketId && newCtx.p1SocketId === socketId) {
          actor.stop();
          this.actors.delete(roomCode);
          return null;
        }

        return { type: 'player', roomCode };
      }
    }
    return null;
  }

  getActor(roomCode: string): RoomActor | undefined {
    return this.actors.get(roomCode);
  }

  getContext(roomCode: string): RoomContext | undefined {
    return this.actors.get(roomCode)?.getSnapshot().context;
  }
}
