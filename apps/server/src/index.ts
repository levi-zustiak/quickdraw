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
      console.log(`[ws] join-room  sid=${sid} room=${roomCode} name="${playerName}" -> error: ${result.error}`);
      socket.emit('join-error', { message: result.error });
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
    if (result) {
      console.log(`[ws] player-left emitted  room=${result.roomCode}`);
      io.to(result.roomCode).emit('player-left', {});
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Quickdraw server listening on port ${PORT}`);
});
