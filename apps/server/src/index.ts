import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './room-manager';
import { GameLoop } from './game-loop';

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
    const result = rooms.joinRoom(roomCode, socket.id, playerName);

    if ('error' in result) {
      // Room full — try joining as spectator
      const specResult = rooms.joinAsSpectator(roomCode, socket.id);
      if ('error' in specResult) {
        console.log(`[ws] join-room  sid=${sid} room=${roomCode} -> error: ${specResult.error}`);
        socket.emit('join-error', { message: specResult.error });
        return;
      }
      const room = specResult.room;
      console.log(`[ws] join-room  sid=${sid} room=${roomCode} -> spectator`);
      socket.join(roomCode);
      socket.emit('joined', { role: 'spectator' as const, roomCode });
      socket.emit('game-snapshot', {
        phase: room.phase,
        p1Name: room.p1Name,
        p2Name: room.p2Name ?? 'OPPONENT',
        p1Hp: room.p1Hp,
        p2Hp: room.p2Hp,
        p1Ready: room.p1Ready,
        p2Ready: room.p2Ready,
        round: room.round,
        spectatorCount: room.spectatorSocketIds.size,
      });
      io.to(roomCode).emit('spectator-count', { count: room.spectatorSocketIds.size });
      return;
    }

    const action = result.role === 'p1' ? 'created' : 'joined existing';
    console.log(`[ws] join-room  sid=${sid} room=${roomCode} name="${playerName}" role=${result.role} -> ${action}`);
    socket.join(roomCode);
    socket.emit('joined', { role: result.role, roomCode });
    socket.to(roomCode).emit('player-joined', {
      name: playerName,
      role: result.role,
    });

    const room = result.room;
    if (result.role === 'p2') {
      room.phase = 'lobby';
      room.round = 1;
      console.log(`[ws] lobby-ready  room=${roomCode} p1="${room.p1Name}" p2="${room.p2Name}"`);
      io.to(roomCode).emit('lobby-ready', {
        p1Name: room.p1Name,
        p2Name: room.p2Name,
        round: room.round,
      });
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
      io.to(result.roomCode).emit('player-left', {});
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Quickdraw server listening on port ${PORT}`);
});
