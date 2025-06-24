import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  steamId: { type: String, unique: true, sparse: true },
  username: { type: String, required: true },
  isAnonymous: { type: Boolean, default: true },
  ownedGames: [{ type: String }], // Steam app IDs
  completedGames: [{ type: String }], // Steam app IDs
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
