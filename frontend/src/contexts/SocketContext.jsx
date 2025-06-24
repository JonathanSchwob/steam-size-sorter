import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const newSocket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3000', {
      auth: {
        userId: user.id,
        steamId: user.steamId
      },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}
