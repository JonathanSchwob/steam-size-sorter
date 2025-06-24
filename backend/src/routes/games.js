import express from 'express';
import { User } from '../models/User.js';

const router = express.Router();

// Mark game as completed
router.post('/:gameId/complete', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const user = await User.findById(userId);
    if (!user || user.isAnonymous) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const result = await User.updateOne(
      { _id: userId, completedGames: { $ne: gameId } },
      { $push: { completedGames: gameId } }
    );
    
    res.json({ success: result.modifiedCount > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark game as completed' });
  }
});

// Get user's completed games
router.get('/completed', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const user = await User.findById(userId, { completedGames: 1 });
    if (!user || user.isAnonymous) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    res.json({ completedGames: user.completedGames || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch completed games' });
  }
});

// Get user's owned games (from Steam)
router.get('/owned', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const user = await User.findById(userId, { steamId: 1, ownedGames: 1 });
    if (!user || user.isAnonymous) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // TODO: Implement Steam API call to get owned games
    // For now, return the cached list
    res.json({ ownedGames: user.ownedGames || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch owned games' });
  }
});

export const gamesRouter = router;
