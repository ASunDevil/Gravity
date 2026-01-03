import 'dotenv/config'; // Load env vars
import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { GameState, Player, Room, User, BOARD_SIZE, GameType, RenjuGameState, ChessGameState, GoGameState, PlayerColor } from './lib/types';
import { createInitialState as createInitialRenjuState, isValidMove, checkWin, makeRenjuMove } from './lib/game/renju';
import { createInitialChessState, makeChessMove } from './lib/game/chess';
import { createInitialGoState, makeGoMove, isValidGoMove, GO_BOARD_SIZE } from './lib/game/go';
import { getAiMove } from './lib/ai';

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

    socket.on('create_room', ({ name, gameType, vsAi, playerColor }: { name: string, gameType: GameType, vsAi?: boolean, playerColor?: 'black' | 'white' | 'random' }, callback) => {
      const socketId = socket.id;
      const user = users.get(socketId);
      if (!user) return callback({ error: 'Not logged in' });

      // Default to renju if not specified (backward compatibility)
      const type = gameType || 'renju';

      // Determine colors
      let myColor: PlayerColor | undefined;
      if (playerColor && playerColor !== 'random') {
        myColor = playerColor;
      }
      // If random, keep undefined and let startGame decide

      const roomId = Math.random().toString(36).substring(2, 9);
      const room: Room = {
        id: roomId,
        name: name || `${user.nickname}'s Room`,
        gameType: type,
        players: [{ ...user, ready: false, color: myColor }],
        spectators: [],
        status: 'waiting',
        createdAt: Date.now(),
        vsAi: !!vsAi
      };

      if (vsAi) {
        const aiUser: User = {
          id: `ai_${Math.random().toString(36).substring(7)}`,
          nickname: 'Gravity Bot',
          avatar: '🤖',
          isAi: true
        };
        // If user has color, AI gets opposite
        let aiColor: PlayerColor | undefined;
        if (myColor) {
          aiColor = myColor === 'black' ? 'white' : 'black';
        }
        room.players.push({ ...aiUser, ready: true, color: aiColor });
        room.name = `${user.nickname} vs Bot`;
      }

      rooms.set(roomId, room);
      socket.join(roomId);
      callback({ roomId });

      if (vsAi) {
        // Auto start for AI games
        startGame(room);
      }

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
        // Assign opposite color if creator has one
        let joinerColor: PlayerColor | undefined;
        const p1Color = room.players[0].color;
        if (p1Color) {
          joinerColor = p1Color === 'black' ? 'white' : 'black';
        }
        room.players.push({ ...user, ready: false, color: joinerColor });
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
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      if (applyMove(room, player, moveData)) {
        // Check Ai
        if (room.status === 'playing' && room.gameState) {
          let nextColor: 'white' | 'black';
          if (room.gameState.type === 'chess') {
            nextColor = room.gameState.turn === 'w' ? 'white' : 'black';
          } else {
            nextColor = (room.gameState as RenjuGameState | GoGameState).currentPlayer;
          }

          const nextPlayer = room.players.find(p => p.color === nextColor);
          if (nextPlayer && nextPlayer.isAi) {
            setTimeout(() => executeAiTurn(roomId), 100);
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

  function applyMove(room: Room, player: Player, moveData: any): boolean {
    if (!room || room.status !== 'playing' || !room.gameState) return false;

    // Validation based on game type
    if (room.gameType === 'renju' && room.gameState.type === 'renju') {
      const { x, y } = moveData;
      if (player.color !== room.gameState.currentPlayer) return false;

      if (isValidMove(room.gameState, x, y)) {
        const now = Date.now();
        const duration = now - room.gameState.lastMoveTime;

        room.gameState.board[y][x] = player.color;
        room.gameState.history.push({ x, y, color: player.color, duration });

        const win = checkWin(room.gameState.board, x, y, player.color);
        if (win) {
          room.gameState.winner = win;
          room.status = 'ended';
        } else {
          room.gameState.currentPlayer = room.gameState.currentPlayer === 'black' ? 'white' : 'black';
        }
        room.gameState.lastMoveTime = now;

        room.gameState.lastMoveTime = Date.now();
        io.to(room.id).emit('game_state_update', room.gameState);
        if (room.gameState.winner) {
          io.to(room.id).emit('room_state_update', room);
        }
        return true;
      }
    } else if (room.gameType === 'chess' && room.gameState.type === 'chess') {
      const { from, to, promotion } = moveData;
      if ((room.gameState.turn === 'w' && player.color !== 'white') ||
        (room.gameState.turn === 'b' && player.color !== 'black')) {
        return false;
      }

      const newState = makeChessMove(room.gameState, { from, to, promotion });
      if (newState !== room.gameState) {
        room.gameState = newState;
        room.gameState.lastMoveTime = Date.now();
        if (room.gameState.winner) {
          room.status = 'ended';
          io.to(room.id).emit('room_state_update', room);
        }
        io.to(room.id).emit('game_state_update', room.gameState);
        return true;
      }
    } else if (room.gameType === 'go' && room.gameState.type === 'go') {
      const { x, y } = moveData;
      if (player.color !== room.gameState.currentPlayer) return false;

      if (isValidGoMove(room.gameState, x, y, player.color)) {
        const newState = makeGoMove(room.gameState, x, y, player.color);
        if (newState !== room.gameState) {
          room.gameState = newState;
          room.gameState.lastMoveTime = Date.now();
          io.to(room.id).emit('game_state_update', room.gameState);
          return true;
        }
      }
    }
    return false;
  }

  async function executeAiTurn(roomId: string) {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing' || !room.gameState) return;

    let currentPlayerColor: 'white' | 'black';
    if (room.gameState.type === 'chess') {
      currentPlayerColor = room.gameState.turn === 'w' ? 'white' : 'black';
    } else {
      currentPlayerColor = (room.gameState as RenjuGameState | GoGameState).currentPlayer;
    }

    const aiPlayer = room.players.find(p => p.isAi && p.color === currentPlayerColor);
    if (!aiPlayer) return;

    const move = await getAiMove(room.gameState, room.gameType);
    if (move) {
      if (applyMove(room, aiPlayer, move)) {
        // Check if next is also AI
        if (room.gameState) {
          let nextColor: 'white' | 'black';
          if (room.gameState.type === 'chess') {
            nextColor = room.gameState.turn === 'w' ? 'white' : 'black';
          } else {
            nextColor = (room.gameState as RenjuGameState | GoGameState).currentPlayer;
          }

          const nextPlayer = room.players.find(p => p.color === nextColor);
          if (nextPlayer && nextPlayer.isAi && room.status === 'playing') {
            setTimeout(() => executeAiTurn(roomId), 100);
          }
        }
      }
    }
  }

  function startGame(room: Room) {
    room.status = 'playing';

    // Assign colors only if not already assigned
    if (!room.players[0].color || !room.players[1].color) {
      const isFirstPlayerFirst = Math.random() < 0.5;

      if (room.gameType === 'chess') {
        room.players[0].color = isFirstPlayerFirst ? 'white' : 'black';
        room.players[1].color = isFirstPlayerFirst ? 'black' : 'white';
      } else {
        // Renju/Go: Black goes first
        room.players[0].color = isFirstPlayerFirst ? 'black' : 'white';
        room.players[1].color = isFirstPlayerFirst ? 'white' : 'black';
      }
    }

    if (room.gameType === 'chess') {
      room.gameState = createInitialChessState();
    } else if (room.gameType === 'go') {
      room.gameState = createInitialGoState();
    } else {
      room.gameState = createInitialRenjuState();
    }

    io.to(room.id).emit('room_state_update', room);
    io.to(room.id).emit('game_start', room.gameState);

    // AI Check
    let firstColor: 'white' | 'black';
    if (room.gameState.type === 'chess') {
      firstColor = room.gameState.turn === 'w' ? 'white' : 'black';
    } else {
      firstColor = (room.gameState as RenjuGameState | GoGameState).currentPlayer;
    }

    const firstPlayer = room.players.find(p => p.color === firstColor);
    if (firstPlayer && firstPlayer.isAi) {
      setTimeout(() => executeAiTurn(room.id), 100);
    }
  }

  server.use((req, res) => {
    const parsedUrl = parse(req.url!, true);
    return handle(req, res, parsedUrl);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
