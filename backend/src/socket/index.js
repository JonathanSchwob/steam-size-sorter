import { ChatRoom } from '../models/ChatRoom.js';
import { User } from '../models/User.js';
import { generateUsername } from '../utils/username.js';
import { getGameDetails } from '../routes/chat.js';
import fetch from 'node-fetch';

const ANONYMOUS_RATE_LIMIT = 1; // temp no rate limit
const MESSAGE_HISTORY_LIMIT = 999;

// Track active users per room
const roomUsers = new Map();

// Make room user count function globally accessible
global.getRoomUserCount = (roomId) => {
  return roomUsers.get(roomId)?.size || 0;
};

export const setupSocketHandlers = (io, redis) => {
  // Middleware to attach user data
  io.use(async (socket, next) => {
    const { userId, steamId } = socket.handshake.auth;
    
    if (!userId) {
      const username = generateUsername();
      socket.user = { 
        id: socket.id, 
        username, 
        isAnonymous: true,
        toObject: () => ({ id: socket.id, username, isAnonymous: true })
      };
    } else {
      const user = await User.findById(userId);
      if (!user) {
        return next(new Error('User not found'));
      }
      socket.user = user;
    }
    
    next();
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id}`);
    
    // Join a game's chatroom
    socket.on('join_room', async (gameId) => {
      try {
        // Leave previous room if any
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room !== socket.id) {
            // Remove user from room tracking
            const users = roomUsers.get(room);
            if (users) {
              users.delete(socket.user.id);
              if (users.size === 0) {
                roomUsers.delete(room);
              }
            }
            socket.leave(room);
          }
        });

        // Find or create chat room
        let chatRoom = await ChatRoom.findOne({ gameId });
        
        if (!chatRoom) {
          const details = await getGameDetails(gameId);
          chatRoom = await ChatRoom.findOneAndUpdate(
            { gameId },
            {
              $setOnInsert: {
                gameId,
                gameName: details.name,
                logoUrl: details.logoUrl,
                messages: [],
                lastActive: new Date(),
                isArchived: false
              }
            },
            { upsert: true, new: true }
          );
        }

        socket.join(gameId);
        
        // Track user in room
        if (!roomUsers.has(gameId)) {
          roomUsers.set(gameId, new Set());
        }
        roomUsers.get(gameId).add(socket.user.id);

        // Emit updated user count and member list
        const userCount = roomUsers.get(gameId).size;
        io.to(gameId).emit('user_count', userCount);

        // Send member list to all clients in the room
        const memberList = Array.from(roomUsers.get(gameId)).map(id => {
          const member = id === socket.user.id ? socket.user : { id, username: 'Anonymous' };
          return member.toObject ? member.toObject() : member;
        });
        io.to(gameId).emit('member_list', memberList);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', 'Failed to join room');
      }
      
      // Notify all clients about updated user count
      io.to(gameId).emit('room_users_updated', {
        count: getRoomUserCount(gameId)
      });
      
      // Get recent messages
      try {
        let chatRoom = await ChatRoom.findOne({ gameId })
          .slice('messages', -MESSAGE_HISTORY_LIMIT);
        
        if (!chatRoom) {
          // Fetch game details from Steam API
          try {
            const response = await fetch(`http://store.steampowered.com/api/appdetails?appids=${gameId}`);
            const data = await response.json();
            const gameName = data[gameId]?.data?.name || `Game ${gameId}`;
            
            // Create new chatroom if it doesn't exist
            chatRoom = new ChatRoom({
              gameId,
              gameName,
              messages: [],
              lastActive: new Date(),
              isArchived: false
            });
            await chatRoom.save();
          } catch (error) {
            console.error('Error fetching game details:', error);
            chatRoom = new ChatRoom({
              gameId,
              gameName: `Game ${gameId}`,
              messages: [],
              lastActive: new Date(),
              isArchived: false
            });
            await chatRoom.save();
          }
        }
        
        socket.emit('message_history', {
          channel: 'main',
          history: chatRoom.messages || []
        });
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle new messages
    socket.on('send_message', async (data) => {
      const { gameId, channel, content } = data;
      
      // Validate required fields
      if (!gameId || !content) {
        socket.emit('error', 'Missing required fields');
        return;
      }
      
      try {
        // Check rate limit for anonymous users
        if (socket.user.isAnonymous) {
          const lastMessage = await redis.get(`last_message:${socket.user.id}`);
          if (lastMessage) {
            const timeElapsed = Date.now() - parseInt(lastMessage);
            if (timeElapsed < ANONYMOUS_RATE_LIMIT) {
              socket.emit('error', {
                message: `Please wait ${Math.ceil((ANONYMOUS_RATE_LIMIT - timeElapsed) / 1000)} seconds before sending another message`
              });
              return;
            }
          }
        }

        const message = {
          userId: socket.user.id,
          username: socket.user.username || socket.user.displayName || 'Anonymous',
          content,
          isSteamUser: !socket.user.isAnonymous,
          createdAt: new Date()
        };

        // Save message and update room's active status
        await ChatRoom.findOneAndUpdate(
          { gameId },
          { 
            $push: { 
              messages: {
                $each: [message],
                $slice: -1000 // Keep last 1000 messages
              }
            },
            lastActive: new Date(),
            isArchived: false
          },
          { new: true, upsert: true }
        );

        // Set rate limit for anonymous users
        if (socket.user.isAnonymous) {
          await redis.set(`last_message:${socket.user.id}`, Date.now());
          await redis.expire(`last_message:${socket.user.id}`, 60); // Expire after 60 seconds
        }

        // Broadcast message to room
        io.to(gameId).emit('new_message', {
          channel: 'main',
          message
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
      if (socket.user.isAnonymous) {
        redis.del(`last_message:${socket.user.id}`).catch(console.error);
      }
    });
  });
};
