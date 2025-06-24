import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  PaperAirplaneIcon, 
  HashtagIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon
} from '@heroicons/react/24/solid';
import axios from 'axios';

export default function ChatRoom() {
  const { gameId } = useParams();
  const socket = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState({ main: [], offtopic: [] });
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [gameDetails, setGameDetails] = useState(null);
  const [members, setMembers] = useState([]);
  const [activeChannel, setActiveChannel] = useState('main');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const { scrollHeight, clientHeight } = messagesContainerRef.current;
      messagesContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  };

  // Fetch game details
  useEffect(() => {
    const fetchGameDetails = async () => {
      try {
        const response = await axios.get(`/api/chat/game/${gameId}`);
        setGameDetails(response.data);
      } catch (error) {
        console.error('Failed to fetch game details:', error);
        setError('Failed to load game details');
      }
    };
    fetchGameDetails();
  }, [gameId]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join_room', gameId);

    socket.on('message_history', ({ channel, history }) => {
      setMessages(prev => ({ ...prev, [channel]: history }));
      scrollToBottom();
    });

    socket.on('new_message', ({ channel, message }) => {
      setMessages(prev => ({
        ...prev,
        [channel]: [...prev[channel], message]
      }));
      scrollToBottom();
    });

    socket.on('member_list', (memberList) => {
      setMembers(memberList);
    });

    socket.on('error', (error) => {
      const errorMessage = typeof error === 'string' ? error : error.message;
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    });

    return () => {
      socket.off('message_history');
      socket.off('new_message');
      socket.off('member_list');
      socket.off('error');
    };
  }, [socket, gameId, activeChannel]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    socket.emit('send_message', {
      gameId,
      channel: activeChannel,
      content: newMessage.trim()
    });

    setNewMessage('');
  };

  const handleChannelChange = (channel) => {
    setActiveChannel(channel);
    socket.emit('join_room', gameId);
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-game-darker">
      <div className="flex h-full overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-game-dark">
          {/* Game Header */}
          {gameDetails && (
            <div className="bg-game-darker p-4 flex items-center justify-between border-b border-game-accent">
              <div className="flex items-center space-x-4">
                <img 
                  src={gameDetails.logoUrl} 
                  alt={gameDetails.name} 
                  className="h-12 w-24 object-cover rounded"
                />
                <h1 className="text-xl font-bold text-white">{gameDetails.name}</h1>
              </div>
            </div>
          )}

          {/* Channel Tabs */}
          <div className="flex border-b border-game-accent">
            <button
              onClick={() => handleChannelChange('main')}
              className={`flex items-center space-x-2 px-4 py-2 ${
                activeChannel === 'main'
                  ? 'bg-game-accent text-white'
                  : 'text-gray-400 hover:bg-game-light'
              }`}
            >
              <HashtagIcon className="h-5 w-5" />
              <span>Main</span>
            </button>
            <button
              onClick={() => handleChannelChange('offtopic')}
              className={`flex items-center space-x-2 px-4 py-2 ${
                activeChannel === 'offtopic'
                  ? 'bg-game-accent text-white'
                  : 'text-gray-400 hover:bg-game-light'
              }`}
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              <span>Off-Topic</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-500 text-white p-2 text-center">
              {error}
            </div>
          )}

          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages[activeChannel]?.map((message, index) => (
              <div
                key={index}
                className={`flex items-start space-x-2 ${
                  message.userId === user?.id ? 'justify-end' : ''
                }`}
              >
                <div
                  className={`max-w-[70%] break-words ${
                    message.userId === user?.id
                      ? 'bg-game-accent text-white'
                      : 'bg-gray-700 text-gray-100'
                  } rounded-lg px-4 py-2`}
                >
                  <div className="text-sm font-medium mb-1">
                    {message.username}
                    {message.isSteamUser && (
                      <span className="ml-2 text-xs bg-[#1b2838] px-2 py-0.5 rounded">
                        Steam
                      </span>
                    )}
                  </div>
                  <div className="text-sm">{message.content}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSubmit} className="p-4 bg-game-darker border-t border-game-accent">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message #${activeChannel}`}
                className="flex-1 bg-game-dark text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-game-accent"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-game-accent text-white rounded p-2 hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-game-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>

        {/* Member List */}
        <div className="w-64 bg-game-darker border-l border-game-accent p-4">
          <div className="text-game-accent font-medium mb-4 flex items-center">
            <UsersIcon className="h-5 w-5 mr-2" />
            <span>Members — {members.length}</span>
          </div>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center space-x-2 text-gray-300">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>{member.username}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
