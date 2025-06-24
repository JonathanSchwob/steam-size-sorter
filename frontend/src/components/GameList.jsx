import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import debounce from 'lodash/debounce';

export default function GameList() {
  const [games, setGames] = useState([]);
  const [activeRooms, setActiveRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchActiveRooms();
  }, []);

  const fetchActiveRooms = async () => {
    try {
      const response = await axios.get('/api/chat/active');
      setActiveRooms(response.data.rooms);
    } catch (error) {
      console.error('Failed to fetch active rooms:', error);
    }
  };

  const searchGames = useCallback(
    debounce(async (query) => {
      if (!query) {
        setGames([]);
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get(`/api/steam/search?query=${encodeURIComponent(query)}`);
        setGames(response.data.games);
      } catch (error) {
        console.error('Failed to search games:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    searchGames(searchQuery);
  }, [searchQuery, searchGames]);

  const isRoomActive = (gameId) => {
    return activeRooms.some(room => room.gameId === gameId.toString());
  };

  const refreshActiveRooms = useCallback(async () => {
    await fetchActiveRooms();
  }, []);

  useEffect(() => {
    // Refresh active rooms every minute
    const interval = setInterval(refreshActiveRooms, 60000);
    return () => clearInterval(interval);
  }, [refreshActiveRooms]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search games to find a chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-game-light rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-game-accent"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400">Searching games...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <Link
              key={game.id}
              to={`/chat/${game.id}`}
              className="block p-4 bg-game-light rounded-lg hover:bg-game-light-hover transition-all duration-200 ease-in-out relative overflow-hidden group"
            >
              {game.imageUrl && (
                <img
                  src={game.imageUrl}
                  alt={game.name}
                  className="w-full h-32 object-cover rounded mb-2"
                />
              )}
              <h3 className="text-lg font-semibold text-white mb-2">{game.name}</h3>
              {game.released && (
                <p className="text-sm text-gray-400 mb-2">Released: {game.released}</p>
              )}
              {game.price !== null && (
                <p className="text-sm text-gray-400">${game.price.toFixed(2)}</p>
              )}
              {isRoomActive(game.id) && (
                <div className="absolute top-2 right-2 bg-game-accent text-white text-xs px-2 py-1 rounded">
                  Active Chat
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {!loading && games.length === 0 && searchQuery && (
        <div className="text-center text-gray-400">
          No games found. Try a different search term.
        </div>
      )}

      {activeRooms.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-white mb-4">Most Active Chats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRooms.map((room) => (
              <Link
                key={room.gameId}
                to={`/chat/${room.gameId}`}
                className="block bg-game-dark rounded-lg hover:bg-game-dark-hover transition-all duration-200 ease-in-out overflow-hidden"
              >
                {room.logoUrl && (
                  <img
                    src={room.logoUrl}
                    alt={room.gameName}
                    className="w-full h-32 object-cover rounded-t-lg mb-3"
                  />
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-white pr-4">{room.gameName}</h3>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-xs bg-game-accent text-white px-2 py-1 rounded-full">
                      {room.userCount} {room.userCount === 1 ? 'user' : 'users'}
                    </span>
                    <span className="text-xs bg-game-light text-white px-2 py-1 rounded-full">
                      {room.messageCount} {room.messageCount === 1 ? 'message' : 'messages'}
                    </span>
                  </div>
                </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
