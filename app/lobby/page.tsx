"use client";

import { useUser } from '@/lib/UserContext';
import { getSocket } from '@/lib/socket';
import { Room, User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

export default function Lobby() {
    const { user } = useUser();
    const router = useRouter();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [onlineCount, setOnlineCount] = useState(0);

    // Create Room State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomType, setNewRoomType] = useState<'renju' | 'chess' | 'go'>('renju');
    const [playerColor, setPlayerColor] = useState<'black' | 'white' | 'random'>('random');
    const [isCreating, setIsCreating] = useState(false);
    const [isAiMode, setIsAiMode] = useState(false);

    useEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }

        const socket = getSocket();

        socket.emit('get_lobby_state', (data: { onlineUsers: User[], rooms: Room[] }) => {
            setRooms(data.rooms);
            setOnlineCount(data.onlineUsers.length);
        });

        socket.on('room_list_update', (updatedRooms: Room[]) => {
            setRooms(updatedRooms);
        });

        socket.on('stats_update', (stats: { online: number, rooms: number }) => {
            setOnlineCount(stats.online);
        });

        return () => {
            socket.off('room_list_update');
            socket.off('stats_update');
        };
    }, [user, router]);

    const handleCreateRoom = () => {
        if (!newRoomName.trim()) {
            // Optional: require name or just let server partial default
        }
        setIsCreating(true);
        const socket = getSocket();
        socket.emit('create_room', { name: newRoomName, gameType: newRoomType, vsAi: isAiMode, playerColor }, (response: { roomId: string, error?: string }) => {
            setIsCreating(false);
            if (response.roomId) {
                router.push(`/room/${response.roomId}`);
            }
        });
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <header className="bg-card border-b border-border sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
                        Gravity Lobby
                    </h1>
                    <div className="flex items-center space-x-4">
                        <ThemeSwitcher />
                        <div className="flex items-center space-x-2">
                            <span className="text-2xl">{user.avatar}</span>
                            <span className="font-medium text-foreground">{user.nickname}</span>
                        </div>
                        <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            {onlineCount} Online
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-semibold">Active Rooms</h2>
                    <div className="flex gap-4">
                        <button
                            onClick={() => { setIsAiMode(true); setShowCreateModal(true); }}
                            className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition shadow-md border border-border"
                        >
                            Practice vs AI
                        </button>
                        <button
                            onClick={() => { setIsAiMode(false); setShowCreateModal(true); }}
                            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition shadow-md"
                        >
                            Create Room
                        </button>
                    </div>
                </div>

                {rooms.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                        <p>No active rooms. Create one to start playing!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map(room => (
                            <div key={room.id} className="bg-card p-6 rounded-xl shadow-sm border border-border hover:shadow-md transition">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col">
                                        <h3 className="font-semibold text-lg text-card-foreground">{room.name}</h3>
                                        <span className="text-xs text-muted-foreground uppercase tracking-wide font-bold">{room.gameType || 'renju'}</span>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded-full ${room.status === 'playing' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                                        room.status === 'waiting' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'
                                        }`}>
                                        {room.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="space-y-2 mb-6">
                                    <div className="flex -space-x-2 overflow-hidden">
                                        {room.players.map(p => (
                                            <div key={p.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-card bg-muted flex items-center justify-center text-xs" title={p.nickname}>
                                                {p.avatar}
                                            </div>
                                        ))}
                                        {Array.from({ length: 2 - room.players.length }).map((_, i) => (
                                            <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-card bg-muted border-2 border-dashed border-border" />
                                        ))}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {room.players.length}/2 Players • {room.spectators.length} Spectators
                                    </p>
                                </div>
                                <button
                                    onClick={() => router.push(`/room/${room.id}`)}
                                    className="w-full py-2 text-primary font-medium bg-primary/10 rounded-lg hover:bg-primary/20 transition"
                                >
                                    {room.status === 'playing' ? 'Spectate' : 'Join Room'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Room Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 border border-border">
                        <h2 className="text-xl font-bold mb-6 text-card-foreground">{isAiMode ? 'Start AI Game' : 'Create New Room'}</h2>

                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-muted-foreground mb-2">Room Name</label>
                            <input
                                type="text"
                                value={newRoomName}
                                onChange={e => setNewRoomName(e.target.value)}
                                placeholder="e.g. Epic Battle"
                                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition"
                                autoFocus
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-muted-foreground mb-2">Game Type</label>
                            <div className="grid grid-cols-3 gap-4">
                                <button
                                    onClick={() => setNewRoomType('renju')}
                                    className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${newRoomType === 'renju' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50 text-muted-foreground'}`}
                                >
                                    <span className="text-2xl mb-1">⚫️</span>
                                    <span className="font-medium">Renju</span>
                                </button>
                                <button
                                    onClick={() => setNewRoomType('chess')}
                                    className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${newRoomType === 'chess' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50 text-muted-foreground'}`}
                                >
                                    <span className="text-2xl mb-1">♟️</span>
                                    <span className="font-medium">Chess</span>
                                </button>
                                <button
                                    onClick={() => setNewRoomType('go')}
                                    className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${newRoomType === 'go' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50 text-muted-foreground'}`}
                                >
                                    <span className="text-2xl mb-1">⚪️</span>
                                    <span className="font-medium">Go</span>
                                </button>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-muted-foreground mb-2">Your Side</label>
                            <div className="grid grid-cols-3 gap-4">
                                <button
                                    onClick={() => setPlayerColor('black')}
                                    className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${playerColor === 'black' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50 text-muted-foreground'}`}
                                >
                                    <span className="text-xl mb-1">⚫️</span>
                                    <span className="font-medium">Black</span>
                                </button>
                                <button
                                    onClick={() => setPlayerColor('random')}
                                    className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${playerColor === 'random' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50 text-muted-foreground'}`}
                                >
                                    <span className="text-xl mb-1">🎲</span>
                                    <span className="font-medium">Random</span>
                                </button>
                                <button
                                    onClick={() => setPlayerColor('white')}
                                    className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${playerColor === 'white' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50 text-muted-foreground'}`}
                                >
                                    <span className="text-xl mb-1">⚪️</span>
                                    <span className="font-medium">White</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 py-3 text-muted-foreground font-medium hover:bg-muted rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateRoom}
                                disabled={isCreating}
                                className="flex-1 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                            >
                                {isCreating ? 'Creating...' : (isAiMode ? 'Start Game' : 'Create Room')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
