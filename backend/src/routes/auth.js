import express from 'express';
import passport from 'passport';
import { User } from '../models/User.js';
import { generateUsername } from '../utils/username.js';

const router = express.Router();

// Steam authentication
router.get('/steam', passport.authenticate('steam', { session: false }));

router.get('/steam/return', (req, res, next) => {
  passport.authenticate('steam', { session: false }, async (err, user) => {
    if (err) {
      console.error('Steam auth return error:', err);
      return res.status(500).json({ error: 'Steam authentication failed' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Steam authentication failed' });
    }
    try {
      // Steam profile is in the user parameter, not req.user
      const steamId = user.id;
      let dbUser = await User.findOne({ steamId });
      
      if (!dbUser) {
        dbUser = new User({
          steamId,
          username: user.displayName,
          isAnonymous: false,
          ownedGames: [],
          completedGames: []
        });
        await dbUser.save();
      }
      
      const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${FRONTEND_URL}?userId=${dbUser._id}&steamId=${steamId}`);
    } catch (error) {
      console.error('Auth error:', error);
      const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(FRONTEND_URL);
    }
  })(req, res, next);
});

// Generate anonymous username
router.post('/anonymous', async (req, res) => {
  try {
    const username = generateUsername();
    const user = new User({
      username,
      isAnonymous: true,
      ownedGames: [],
      completedGames: []
    });
    await user.save();
    res.json({ userId: user._id, username });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create anonymous user' });
  }
});

// Get user details
router.get('/user/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user._id,
      username: user.username,
      steamId: user.steamId,
      isAnonymous: user.isAnonymous
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

export const authRouter = router;
