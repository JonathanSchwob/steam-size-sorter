import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import GameList from './components/GameList';
import ChatRoom from './components/ChatRoom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="min-h-screen bg-game-dark">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<GameList />} />
              <Route path="/chat/:gameId" element={<ChatRoom />} />
            </Routes>
          </main>
        </div>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
