"use client";

import { useUser } from '@/lib/UserContext';
import { getSocket } from '@/lib/socket';
import { Room, User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Lobby() {
    const { user } = useUser();
    const router = useRouter();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [onlineCount, setOnlineCount] = useState(0);

    // Create Room State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomType, setNewRoomType] = useState<'renju' | 'chess' | 'go'>('renju');
    const [isCreating, setIsCreating] = useState(false);

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
        socket.emit('create_room', { name: newRoomName, gameType: newRoomType }, (response: { roomId: string, error?: string }) => {
            setIsCreating(false);
            if (response.roomId) {
                router.push(`/room/${response.roomId}`);
            }
        });
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Gravity Lobby
                    </h1>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <span className="text-2xl">{user.avatar}</span>
                            <span className="font-medium">{user.nickname}</span>
                        </div>
                        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {onlineCount} Online
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-semibold">Active Rooms</h2>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
                    >
                        Create Room
                    </button>
                </div>

                {rooms.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                        <p>No active rooms. Create one to start playing!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map(room => (
                            <div key={room.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col">
                                        <h3 className="font-semibold text-lg">{room.name}</h3>
                                        <span className="text-xs text-gray-500 uppercase tracking-wide font-bold">{room.gameType || 'renju'}</span>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded-full ${room.status === 'playing' ? 'bg-red-100 text-red-600' :
                                        room.status === 'waiting' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {room.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="space-y-2 mb-6">
                                    <div className="flex -space-x-2 overflow-hidden">
                                        {room.players.map(p => (
                                            <div key={p.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-xs" title={p.nickname}>
                                                {p.avatar}
                                            </div>
                                        ))}
                                        {Array.from({ length: 2 - room.players.length }).map((_, i) => (
                                            <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-50 border-2 border-dashed border-gray-300" />
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        {room.players.length}/2 Players • {room.spectators.length} Spectators
                                    </p>
                                </div>
                                <button
                                    onClick={() => router.push(`/room/${room.id}`)}
                                    className="w-full py-2 text-blue-600 font-medium bg-blue-50 rounded-lg hover:bg-blue-100 transition"
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-6">Create New Room</h2>

                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Room Name</label>
                            <input
                                type="text"
                                value={newRoomName}
                                onChange={e => setNewRoomName(e.target.value)}
                                placeholder="e.g. Epic Battle"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                autoFocus
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Game Type</label>
                            <div className="grid grid-cols-3 gap-4">
                                <button
                                    onClick={() => setNewRoomType('renju')}
                                    className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${newRoomType === 'renju' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <span className="text-2xl mb-1">⚫️</span>
                                    <span className="font-medium">Renju</span>
                                </button>
                                <button
                                    onClick={() => setNewRoomType('chess')}
                                    className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${newRoomType === 'chess' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <span className="text-2xl mb-1">♟️</span>
                                    <span className="font-medium">Chess</span>
                                </button>
                                <button
                                    onClick={() => setNewRoomType('go')}
                                    className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${newRoomType === 'go' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <span className="text-2xl mb-1">⚪️</span>
                                    <span className="font-medium">Go</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateRoom}
                                disabled={isCreating}
                                className="flex-1 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                            >
                                {isCreating ? 'Creating...' : 'Create Room'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
