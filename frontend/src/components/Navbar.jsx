import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, loginWithSteam, logout } = useAuth();

  return (
    <nav className="bg-game-light shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2 text-2xl font-bold transition-all duration-200 ease-in-out">
            <div className="w-11 h-11 relative">
              <svg 
                className="w-10 h-10"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M24 4L44 24L24 44L4 24L24 4Z"
                  fill="url(#asteriskGradient)"
                />
                <path 
                  d="M24 16H32V24H40V32H32V40H24V32H16V24H8V16H16V8H24V16Z"
                  fill="url(#hashtagGradient)"
                />
                <defs>
                  <linearGradient id="asteriskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" style={{ stopColor: '#8B5CF6' }} />
                    <stop offset="50%" style={{ stopColor: '#EC4899' }} />
                    <stop offset="100%" style={{ stopColor: '#3B82F6' }} />
                  </linearGradient>
                  <linearGradient id="hashtagGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" style={{ stopColor: '#8B5CF6' }} />
                    <stop offset="50%" style={{ stopColor: '#EC4899' }} />
                    <stop offset="100%" style={{ stopColor: '#3B82F6' }} />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="bg-gradient-to-r from-yellow-600 via-pink-500 to-blue-500 bg-clip-text text-transparent text-4xl">
              Pixl
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            {user?.isAnonymous ? (
              <button
                onClick={loginWithSteam}
                className="bg-[#1b2838] hover:bg-[#2a475e] text-white px-4 py-2 rounded-md flex items-center gap-2 transition-all duration-200 ease-in-out"
              >
                <img src="/steam-icon.svg" alt="Steam" className="w-5 h-5" />
                Sign in with Steam
              </button>
            ) : (
              <div className="relative group">
                <div className="text-white cursor-pointer">
                  Welcome back, {user?.username}!
                </div>
                <div className="absolute right-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out">
                  <button
                    onClick={logout}
                    className="bg-[#1b2838] hover:bg-[#2a475e] text-white px-4 py-2 rounded-md flex items-center gap-2 transition-all duration-200 ease-in-out"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
