"use client";

import { useUser } from '@/lib/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loginGuest, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/lobby');
    }
  }, [user, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#1e3c72] to-[#2a5298] text-white p-4">
      <div className="max-w-md w-full text-center space-y-8 p-10 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20">
        <h1 className="text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-cyan-200">
          GRAVITY
        </h1>
        <p className="text-blue-100 text-lg">
          Experience the elegance of board games.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={() => loginGuest()}
            disabled={isLoading}
            className="w-full py-4 text-xl font-semibold rounded-full bg-white text-blue-900 hover:bg-blue-50 transition transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading ? 'Connecting...' : 'Play as Guest'}
          </button>
        </div>
      </div>
    </main>
  );
}
