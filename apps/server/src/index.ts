import { createServer } from 'http';
import { Server } from 'socket.io';
import type { StateValue } from 'xstate';
import { RoomManager } from './room-manager';
import { GameLoop } from './game-loop';

function machineStateToPhase(value: StateValue): string {
  if (typeof value === 'string') return value;
  if ('playing' in value) return value.playing as string;
  return 'waiting';
}

const PORT = parseInt(process.env.PORT ?? '3001', 10);

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
  transports: ['websocket'],
});

const rooms = new RoomManager();
const loop = new GameLoop(io, rooms);

io.on('connection', (socket) => {
  const sid = socket.id.slice(0, 8);
  console.log(`[ws] connection  sid=${sid}`);

  socket.on('join-room', ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
    const result = rooms.joinRoom(io, roomCode, socket.id, playerName);

    if ('error' in result) {
      // Room full — try joining as spectator
      const specResult = rooms.joinAsSpectator(roomCode, socket.id);
      if ('error' in specResult) {
        console.log(`[ws] join-room  sid=${sid} room=${roomCode} -> error: ${specResult.error}`);
        socket.emit('join-error', { message: specResult.error });
        return;
      }
      const ctx = specResult.context;
      const actorSnap = rooms.getActor(roomCode)!.getSnapshot();
      console.log(`[ws] join-room  sid=${sid} room=${roomCode} -> spectator`);
      socket.join(roomCode);
      socket.emit('joined', { role: 'spectator' as const, roomCode });
      socket.emit('game-snapshot', {
        phase: machineStateToPhase(actorSnap.value),
        p1Name: ctx.p1Name,
        p2Name: ctx.p2Name ?? 'OPPONENT',
        p1Hp: ctx.p1Hp,
        p2Hp: ctx.p2Hp,
        p1Ready: ctx.p1Ready,
        p2Ready: ctx.p2Ready,
        round: ctx.round,
        spectatorCount: ctx.spectatorSocketIds.size,
      });
      io.to(roomCode).emit('spectator-count', { count: ctx.spectatorSocketIds.size });
      return;
    }

    const action = result.role === 'p1' ? 'created' : 'joined existing';
    console.log(`[ws] join-room  sid=${sid} room=${roomCode} name="${playerName}" role=${result.role} -> ${action}`);
    socket.join(roomCode);
    socket.emit('joined', { role: result.role, roomCode });

    if (result.role === 'p2') {
      socket.to(roomCode).emit('player-joined', { name: playerName, role: 'p2' as const });
      // Send PLAYER_JOINED after socket.join so the lobby-ready broadcast reaches P2.
      result.actor.send({ type: 'PLAYER_JOINED', socketId: socket.id, playerName });
    }
  });

  loop.register(socket);

  socket.on('disconnect', () => {
    console.log(`[ws] disconnect  sid=${sid}`);
    const result = rooms.leaveRoom(socket.id);
    if (!result) return;
    if (result.type === 'spectator') {
      io.to(result.roomCode).emit('spectator-count', { count: result.spectatorCount });
    } else {
      console.log(`[ws] player-left emitted  room=${result.roomCode}`);
      // player-left is broadcast by the machine's broadcastPlayerLeft action
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Quickdraw server listening on port ${PORT}`);
});
