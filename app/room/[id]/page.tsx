"use client";

import GridBoard from '@/components/GridBoard';
import ChessBoard from '@/components/ChessBoard';
import { useUser } from '@/lib/UserContext';
import { getSocket } from '@/lib/socket';
import { GameState, Room, Player, BOARD_SIZE, RenjuGameState, ChessGameState, GoGameState, GO_BOARD_SIZE } from '@/lib/types';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

export default function RoomPage() {
    const { user } = useUser();
    const { id } = useParams();
    const router = useRouter();
    const [room, setRoom] = useState<Room | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const historyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }

        const socket = getSocket();
        const roomId = Array.isArray(id) ? id[0] : id;

        socket.emit('join_room', roomId, (response: { room?: Room, error?: string }) => {
            if (response.error) {
                alert(response.error);
                router.push('/lobby');
                return;
            }
            if (response.room) {
                setRoom(response.room);
                if (response.room.gameState) {
                    setGameState(response.room.gameState);
                }
            }
        });

        socket.on('room_state_update', (updatedRoom: Room) => {
            setRoom(updatedRoom);
            if (updatedRoom.gameState) {
                setGameState(updatedRoom.gameState);
            }
        });

        socket.on('game_state_update', (newGameState: GameState) => {
            setGameState(newGameState);
        });

        socket.on('game_start', (initialGameState: GameState) => {
            setGameState(initialGameState);
        });

        return () => {
            socket.emit('leave_room', roomId);
            socket.off('room_state_update');
            socket.off('game_state_update');
            socket.off('game_start');
        };
    }, [user, id, router]);

    // Scroll history to bottom
    useEffect(() => {
        if (historyRef.current) {
            historyRef.current.scrollTop = historyRef.current.scrollHeight;
        }
    }, [gameState?.history]);

    const toggleReady = () => {
        if (!room) return;
        const me = room.players.find(p => p.id === user?.id);
        if (me) {
            getSocket().emit('player_ready', { roomId: room.id, ready: !me.ready });
        }
    };

    const onRenjuMove = (x: number, y: number) => {
        if (!room || !gameState) return;
        getSocket().emit('make_move', { roomId: room.id, x, y });
    };

    const onGoMove = (x: number, y: number) => {
        if (!room || !gameState) return;
        getSocket().emit('make_move', { roomId: room.id, x, y });
    };

    const onChessMove = (move: { from: string; to: string; promotion?: string }) => {
        if (!room || !gameState) return;
        getSocket().emit('make_move', { roomId: room.id, ...move });
    };

    if (!user || !room) return <div className="flex h-screen items-center justify-center">Loading Room...</div>;

    const me = room.players.find(p => p.id === user.id);
    const isSpectator = !me;
    const opponent = room.players.find(p => p.id !== user.id);

    // Determine turn
    let isMyTurn = false;
    if (gameState && me?.color) {
        if ((gameState.type === 'renju' || gameState.type === 'go') && gameState.currentPlayer === me.color) {
            isMyTurn = true;
        } else if (gameState.type === 'chess') {
            const myChessColor = me.color === 'white' ? 'w' : 'b';
            isMyTurn = gameState.turn === myChessColor;
        }
    }

    const gameType = room.gameType || 'renju';

    return (
        <div className="min-h-screen bg-neutral-100 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow p-4 flex justify-between items-center z-20">
                <button onClick={() => router.push('/lobby')} className="text-gray-600 hover:text-black">
                    &larr; Leave Room
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="font-bold text-xl">{room.name}</h1>
                    <span className="text-xs uppercase tracking-widest text-gray-500">{gameType}</span>
                </div>
                <div className="w-20" />
            </header>

            <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 gap-6">
                {/* Left: Game Board */}
                <div className="flex-1 flex flex-col items-center justify-center min-h-[600px]">
                    <div className="relative w-full max-w-[800px] flex justify-center">
                        {gameType === 'chess' ? (
                            <div className="w-full max-w-[600px] relative">
                                {gameState ? (
                                    <ChessBoard
                                        gameState={gameState as ChessGameState}
                                        isMyTurn={!isSpectator && isMyTurn && room.status === 'playing'}
                                        myColor={me?.color}
                                        onMove={onChessMove}
                                    />
                                ) : (
                                    <div className="aspect-square bg-[#b58863] flex items-center justify-center rounded-sm shadow-2xl w-full">
                                        <div className="text-white font-bold opacity-50">Waiting for start...</div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Renju or Go
                            <div className="w-full relative">
                                <GridBoard
                                    board={gameState ? (gameState as RenjuGameState | GoGameState).board :
                                        (gameType === 'go' ? Array(19).fill(null).map(() => Array(19).fill(null)) : Array(15).fill(null).map(() => Array(15).fill(null)))
                                    }
                                    size={gameType === 'go' ? 19 : 15}
                                    isMyTurn={!isSpectator && isMyTurn && room.status === 'playing'}
                                    myColor={me?.color}
                                    onMove={gameType === 'go' ? onGoMove : onRenjuMove}
                                    lastMove={(gameState as RenjuGameState | GoGameState)?.history?.slice(-1)[0]}
                                />
                                {!gameState && (
                                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center rounded-sm backdrop-blur-[1px]">
                                        <div className="bg-white/90 p-4 rounded-lg shadow-lg text-center">
                                            <p className="font-bold text-gray-800">Waiting for game to start...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {gameState?.winner && (
                        <div className="mt-6 p-4 bg-white rounded-lg shadow-lg text-center animate-bounce z-30">
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-orange-500">
                                {gameState.winner === 'draw' ? 'Draw!' :
                                    (gameType === 'chess' ?
                                        (gameState.winner === 'w' ? 'White Won!' : 'Black Won!') :
                                        (gameState.winner === me?.color ? 'You Won!' : `${gameState.winner?.toUpperCase()} Won!`)
                                    )}
                            </h2>
                        </div>
                    )}
                </div>

                {/* Right: Info Panel + History */}
                <div className="w-full lg:w-96 flex flex-col gap-4">
                    {/* Players Card */}
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                        <h3 className="font-semibold mb-4 text-gray-500 text-sm uppercase tracking-wider">Players</h3>
                        <div className="space-y-4">
                            {/* Me */}
                            <div className={`p-3 rounded-lg border-2 transition ${isMyTurn ? 'border-blue-400 bg-blue-50' : 'border-transparent bg-gray-50'}`}>
                                <div className="flex items-center space-x-3">
                                    <span className="text-2xl">{me?.avatar || user.avatar}</span>
                                    <div className="flex-1">
                                        <div className="font-medium">{me?.nickname || user.nickname} (You)</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            {me?.color && (
                                                <span className={`w-3 h-3 rounded-full border border-gray-300 ${me.color === 'black' ? 'bg-black' : 'bg-white'}`} />
                                            )}
                                            {me?.ready ? 'Ready' : 'Not Ready'}
                                        </div>
                                    </div>
                                    {/* Capture Counts for Go? */}
                                </div>
                            </div>

                            {/* Opponent */}
                            <div className={`p-3 rounded-lg border-2 transition ${gameState && !isMyTurn && room.status === 'playing' ? 'border-blue-400 bg-blue-50' : 'border-transparent bg-gray-50'}`}>
                                {opponent ? (
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">{opponent.avatar}</span>
                                        <div className="flex-1">
                                            <div className="font-medium">{opponent.nickname}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                {opponent.color && (
                                                    <span className={`w-3 h-3 rounded-full border border-gray-300 ${opponent.color === 'black' ? 'bg-black' : 'bg-white'}`} />
                                                )}
                                                {opponent.ready ? 'Ready' : 'Not Ready'}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-gray-400 text-center py-2 italic">Waiting for opponent...</div>
                                )}
                            </div>
                        </div>

                        {!isSpectator && room.status === 'waiting' && me && (
                            <button
                                onClick={toggleReady}
                                className={`mt-4 w-full py-3 rounded-lg font-semibold transition ${me.ready
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                    : 'bg-green-600 text-white hover:bg-green-700 shadow-md transform active:scale-95'
                                    }`}
                            >
                                {me.ready ? 'Cancel Ready' : 'Ready to Play'}
                            </button>
                        )}
                    </div>

                    {/* Game History */}
                    {gameState && (
                        <div className="bg-white p-4 rounded-xl shadow-sm flex-1 flex flex-col min-h-[300px]">
                            <h3 className="font-semibold mb-2 text-gray-500 text-sm uppercase tracking-wider">Game History</h3>
                            <div ref={historyRef} className="flex-1 overflow-y-auto space-y-1 pr-2 max-h-[400px]">
                                {gameState.history.length === 0 ? (
                                    <p className="text-gray-400 text-sm italic text-center py-10">No moves yet</p>
                                ) : (
                                    gameType === 'chess' ? (
                                        // Chess History
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            {(gameState as ChessGameState).history.map((move, i) => {
                                                if (i % 2 === 0) {
                                                    return (
                                                        <div key={i} className="flex items-center space-x-2 p-1 bg-gray-50 rounded">
                                                            <span className="text-gray-400 w-6 text-right">{(i / 2) + 1}.</span>
                                                            <span className="font-bold">{move}</span>
                                                            {(gameState as ChessGameState).history[i + 1] && <span className="font-bold">{(gameState as ChessGameState).history[i + 1]}</span>}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                    ) : (
                                        // Renju/Go History
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-500 bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-2 py-1">#</th>
                                                    <th className="px-2 py-1">Player</th>
                                                    <th className="px-2 py-1">Pos</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(gameState as RenjuGameState | GoGameState).history.map((move, i) => (
                                                    <tr key={i} className={`border-b border-gray-100/50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                                        <td className="px-2 py-1 text-gray-500">{i + 1}</td>
                                                        <td className="px-2 py-1 flex items-center gap-1">
                                                            <div className={`w-2 h-2 rounded-full ${move.color === 'black' ? 'bg-black' : 'bg-white border border-gray-300'}`} />
                                                            {move.color === 'black' ? 'Black' : 'White'}
                                                        </td>
                                                        <td className="px-2 py-1 font-mono">
                                                            {String.fromCharCode(65 + move.x + (gameType === 'go' && move.x >= 8 ? 1 : 0))}
                                                            {gameType === 'go' ? 19 - move.y : 15 - move.y}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    {/* Go Capture Info & Pass Button */}
                    {gameType === 'go' && gameState && (
                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                            <h3 className="font-semibold text-gray-500 text-sm uppercase tracking-wider">Go Controls</h3>
                            <div className="flex justify-between text-sm">
                                <div>Black Captured: <span className="font-bold">{(gameState as GoGameState).captured?.black || 0}</span></div>
                                <div>White Captured: <span className="font-bold">{(gameState as GoGameState).captured?.white || 0}</span></div>
                            </div>
                            {isMyTurn && room.status === 'playing' && (
                                <button
                                    onClick={() => onGoMove(-1, -1)}
                                    className="w-full py-2 bg-slate-600 text-white rounded hover:bg-slate-700 transition font-medium"
                                >
                                    Pass Turn
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
