"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from './types';
import { getSocket } from './socket';

interface UserContextType {
  user: User | null;
  loginGuest: () => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if we can restore session? 
    // For now, fresh login on reload for simplicity.
    // Or we could store in sessionStorage.
  }, []);

  const loginGuest = async () => {
    setIsLoading(true);
    const socket = getSocket();
    if (!socket.connected) {
        socket.connect();
    }
    
    return new Promise<void>((resolve, reject) => {
        socket.emit('login_guest', (response: User) => {
            setUser(response);
            setIsLoading(false);
            resolve();
        });
        
        // Timeout/Error handling could be added
    });
  };

  return (
    <UserContext.Provider value={{ user, loginGuest, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}
