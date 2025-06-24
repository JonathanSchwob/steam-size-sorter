import express from 'express';
import { ChatRoom } from '../models/ChatRoom.js';
import { redis } from '../index.js';
import fetch from 'node-fetch';

const router = express.Router();

// Get game details
router.get('/game/:gameId', async (req, res) => {
  try {
    const gameDetails = await getGameDetails(req.params.gameId);
    res.json(gameDetails);
  } catch (error) {
    console.error('Error fetching game details:', error);
    res.status(500).json({ error: 'Failed to fetch game details' });
  }
});

// Get recent messages for a game
router.get('/:gameId/messages', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { limit = 50 } = req.query;
    
    const chatRoom = await ChatRoom.findOne({ gameId })
      .slice('messages', -parseInt(limit));
    
    if (!chatRoom) {
      return res.json({ messages: [] });
    }
    
    res.json({ messages: chatRoom.messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Helper function to fetch game details from Steam with Redis caching
export async function getGameDetails(gameId) {
  try {
    // Check Redis cache first
    const cachedData = await redis.get(`game:${gameId}`);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // If not in cache, fetch from Steam API
    const response = await fetch(`http://store.steampowered.com/api/appdetails?appids=${gameId}`);
    const data = await response.json();
    const gameData = data[gameId]?.data;
    const details = {
      name: gameData?.name || `Unknown Game ${gameId}`,
      logoUrl: gameData?.header_image || null
    };

    // Cache the result in Redis (expire after 7 days)
    await redis.set(`game:${gameId}`, JSON.stringify(details), 'EX', 7 * 24 * 60 * 60);
    return details;
  } catch (error) {
    console.error('Error fetching game details:', error);
    return {
      name: `Unknown Game ${gameId}`,
      logoUrl: null
    };
  }
}

// Get most active chatrooms
router.get('/active', async (req, res) => {
  try {
    const activeRooms = await ChatRoom.aggregate([
      {
        $match: {
          lastActive: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          },
          isArchived: false
        }
      },
      {
        $project: {
          gameId: 1,
          gameName: 1,
          lastActive: 1,
          messageCount: {
            $cond: {
              if: { $isArray: "$messages" },
              then: { $size: { $ifNull: ["$messages", []] } },
              else: 0
            }
          }
        }
      },
      { $sort: { messageCount: -1, lastActive: -1 } },
      { $limit: 6 } // Show top 6 most active rooms
    ]);

    // Get user counts and update game names
    const roomsWithDetails = await Promise.all(
      activeRooms.map(async (room) => {
        // Only fetch game details if name is not set or is default
        let gameName = room.gameName;
        let logoUrl = room.logoUrl;
        if (!gameName || gameName.startsWith('Game ') || gameName.startsWith('Unknown Game ') || !logoUrl) {
          const details = await getGameDetails(room.gameId);
          gameName = details.name;
          logoUrl = details.logoUrl;
          // Update the game details in the database
          await ChatRoom.findByIdAndUpdate(room._id, { gameName, logoUrl });
        }
        
        return {
          ...room,
          gameName,
          logoUrl,
          userCount: global.getRoomUserCount?.(room.gameId) || 0
        };
      })
    );
    
    res.json({ rooms: roomsWithDetails });
  } catch (error) {
    console.error('Error fetching active rooms:', error);
    res.status(500).json({ error: 'Failed to fetch active rooms' });
  }
});

// Archive inactive rooms
router.post('/archive-inactive', async (req, res) => {
  try {
    const inactiveThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const result = await ChatRoom.updateMany(
      {
        lastActive: { $lt: inactiveThreshold },
        isArchived: false
      },
      { $set: { isArchived: true } }
    );
    
    res.json({ archivedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to archive inactive rooms' });
  }
});

// Socket.io event handlers
export const handleSocketEvents = (socket) => {
  socket.on('join room', async (gameId) => {
    try {
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
      socket.gameId = gameId;

      // Update user count
      if (global.getRoomUserCount) {
        const count = global.getRoomUserCount(gameId);
        socket.to(gameId).emit('user count', count);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', 'Failed to join room');
    }
  });
};

export const chatRouter = router;
