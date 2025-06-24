import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import passport from 'passport';
import expressSession from 'express-session';
import { Strategy as SteamStrategy } from 'passport-steam';
import { rateLimit } from 'express-rate-limit';
import { setupSocketHandlers } from './socket/index.js';
import { authRouter } from './routes/auth.js';
import { chatRouter, handleSocketEvents } from './routes/chat.js';
import { gamesRouter } from './routes/games.js';
import { steamRouter } from './routes/steam.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Redis client for rate limiting and caching
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pixel-chat')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(expressSession({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Steam authentication setup
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new SteamStrategy({
  returnURL: `${BACKEND_URL}/api/auth/steam/return`,
  realm: BACKEND_URL,
  apiKey: process.env.STEAM_API_KEY || 'YOUR_STEAM_API_KEY'
}, (identifier, profile, done) => {
  // Ensure we have the required profile data
  if (!profile || !profile.id) {
    return done(new Error('Invalid Steam profile'));
  }
  return done(null, profile);
}));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api', limiter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/games', gamesRouter);
app.use('/api/steam', steamRouter);

// Socket.io setup
setupSocketHandlers(io, redis);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err.name === 'AuthenticationError') {
    return res.status(401).json({ error: 'Authentication failed' });
  }
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
