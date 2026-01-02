import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { GameState, Player, Room, User, BOARD_SIZE, GameType, RenjuGameState, ChessGameState } from './lib/types';
import { createInitialState, isValidMove, checkWin } from './lib/game/renju';
import { createInitialChessState, makeChessMove } from './lib/game/chess';
import { createInitialGoState, makeGoMove, isValidGoMove, GO_BOARD_SIZE } from './lib/game/go';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = parseInt(process.env.PORT || '3000', 10);

const adjectives = ['Happy', 'Lucky', 'Sunny', 'Clever', 'Swift', 'Brave', 'Calm', 'Eager'];
const nouns = ['Panda', 'Tiger', 'Eagle', 'Dolphin', 'Fox', 'Wolf', 'Bear', 'Hawk'];

function generateNickname(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}${Math.floor(Math.random() * 100)}`;
}

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);
  const io = new Server(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
  });

  // In-memory state
  const users = new Map<string, User>();
  const rooms = new Map<string, Room>();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('login_guest', (callback) => {
      const user: User = {
        id: socket.id,
        nickname: generateNickname(),
        avatar: '👤', // Simplify for now
      };
      users.set(socket.id, user);
      callback(user);
      io.emit('stats_update', { online: users.size, rooms: rooms.size }); // Broadcast stats
    });

    socket.on('get_lobby_state', (callback) => {
      // Return online users count, rooms list
      callback({
        onlineUsers: Array.from(users.values()),
        rooms: Array.from(rooms.values())
      });
    });

    socket.on('create_room', ({ name, gameType }: { name: string, gameType: GameType }, callback) => {
      const socketId = socket.id;
      const user = users.get(socketId);
      if (!user) return callback({ error: 'Not logged in' });

      // Default to renju if not specified (backward compatibility)
      const type = gameType || 'renju';

      const roomId = Math.random().toString(36).substring(2, 9);
      const room: Room = {
        id: roomId,
        name: name || `${user.nickname}'s Room`,
        gameType: type,
        players: [{ ...user, ready: false, color: undefined }],
        spectators: [],
        status: 'waiting',
        createdAt: Date.now(),
      };

      rooms.set(roomId, room);
      socket.join(roomId);
      callback({ roomId });
      io.emit('room_list_update', Array.from(rooms.values()));
    });

    socket.on('join_room', (roomId: string, callback) => {
      const user = users.get(socket.id);
      if (!user) return callback({ error: 'Not logged in' });

      const room = rooms.get(roomId);
      if (!room) return callback({ error: 'Room not found' });

      // Check if already in
      if (room.players.find(p => p.id === user.id)) {
        return callback({ room }); // Already joined
      }

      if (room.players.length < 2) {
        room.players.push({ ...user, ready: false });
        socket.join(roomId);
        // Notify others in room
        io.to(roomId).emit('room_state_update', room);
        callback({ room });
      } else {
        // Spectator
        room.spectators.push(user);
        socket.join(roomId);
        io.to(roomId).emit('room_state_update', room);
        callback({ room });
      }
      io.emit('room_list_update', Array.from(rooms.values()));
    });

    socket.on('player_ready', ({ roomId, ready }: { roomId: string, ready: boolean }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.ready = ready;
        io.to(roomId).emit('room_state_update', room);

        // Check start
        if (room.players.length === 2 && room.players.every(p => p.ready)) {
          startGame(room);
        }
      }
    });

    socket.on('make_move', (moveData) => {
      const { roomId } = moveData;
      const room = rooms.get(roomId);
      if (!room || room.status !== 'playing' || !room.gameState) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player || !player.color) return;

      // Validation based on game type
      if (room.gameType === 'renju' && room.gameState.type === 'renju') {
        // Renju Logic
        const { x, y } = moveData;
        if (player.color !== room.gameState.currentPlayer) return;
        if (isValidMove(room.gameState, x, y)) {
          // Apply move
          room.gameState.board[y][x] = player.color;
          room.gameState.history.push({ x, y, color: player.color });

          // Check win
          const win = checkWin(room.gameState.board, x, y, player.color);
          if (win) {
            room.gameState.winner = win;
            room.status = 'ended';
          } else {
            room.gameState.currentPlayer = room.gameState.currentPlayer === 'black' ? 'white' : 'black';
          }

          io.to(roomId).emit('game_state_update', room.gameState);
          if (room.gameState.winner) {
            io.to(roomId).emit('room_state_update', room);
          }
        }
      } else if (room.gameType === 'chess' && room.gameState.type === 'chess') {
        // Chess Logic
        const { from, to, promotion } = moveData;
        // Verify turn
        if ((room.gameState.turn === 'w' && player.color !== 'white') ||
          (room.gameState.turn === 'b' && player.color !== 'black')) {
          return;
        }

        const newState = makeChessMove(room.gameState, { from, to, promotion });
        if (newState !== room.gameState) {
          room.gameState = newState;
          if (room.gameState.winner) {
            room.status = 'ended';
            io.to(roomId).emit('room_state_update', room);
          }
          io.to(roomId).emit('game_state_update', room.gameState);
        }
      } else if (room.gameType === 'go' && room.gameState.type === 'go') {
        // Go Logic
        const { x, y } = moveData;
        // Check turn
        if (player.color !== room.gameState.currentPlayer) return;

        if (isValidGoMove(room.gameState, x, y, player.color)) {
          const newState = makeGoMove(room.gameState, x, y, player.color);
          if (newState !== room.gameState) {
            room.gameState = newState;
            io.to(roomId).emit('game_state_update', room.gameState);
          }
        }
      }
    });

    socket.on('leave_room', (roomId) => {
      const user = users.get(socket.id);
      const room = rooms.get(roomId);
      if (user && room) {
        socket.leave(roomId);
        room.players = room.players.filter(p => p.id !== user.id);
        room.spectators = room.spectators.filter(p => p.id !== user.id);

        if (room.players.length === 0) {
          rooms.delete(roomId);
          io.emit('room_list_update', Array.from(rooms.values()));
        } else {
          io.to(roomId).emit('room_state_update', room);
          if (room.status === 'playing') {
            room.status = 'ended'; // Opponent disconnected
            io.to(roomId).emit('room_state_update', room);
          }
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      users.delete(socket.id);

      rooms.forEach((room, roomId) => {
        if (room.players.find(p => p.id === socket.id) || room.spectators.find(p => p.id === socket.id)) {
          room.players = room.players.filter(p => p.id !== socket.id);
          room.spectators = room.spectators.filter(p => p.id !== socket.id);
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else {
            io.to(roomId).emit('room_state_update', room);
          }
        }
      });
      io.emit('stats_update', { online: users.size, rooms: rooms.size });
      io.emit('room_list_update', Array.from(rooms.values()));
    });
  });

  function startGame(room: Room) {
    room.status = 'playing';
    const isFirstPlayerFirst = Math.random() < 0.5;

    // Assign colors
    if (room.gameType === 'chess') {
      room.players[0].color = isFirstPlayerFirst ? 'white' : 'black';
      room.players[1].color = isFirstPlayerFirst ? 'black' : 'white';
      room.gameState = createInitialChessState();
    } else if (room.gameType === 'go') {
      // Go: Black goes first
      room.players[0].color = isFirstPlayerFirst ? 'black' : 'white';
      room.players[1].color = isFirstPlayerFirst ? 'white' : 'black';
      room.gameState = createInitialGoState();
    } else {
      // Renju: Black goes first
      room.players[0].color = isFirstPlayerFirst ? 'black' : 'white';
      room.players[1].color = isFirstPlayerFirst ? 'white' : 'black';
      room.gameState = createInitialState();
    }

    io.to(room.id).emit('room_state_update', room);
    io.to(room.id).emit('game_start', room.gameState);
  }

  server.use((req, res) => {
    const parsedUrl = parse(req.url!, true);
    return handle(req, res, parsedUrl);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
