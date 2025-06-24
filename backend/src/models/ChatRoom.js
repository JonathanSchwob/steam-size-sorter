import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  content: { type: String, required: true },
  isSteamUser: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const chatRoomSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  gameName: { type: String, required: true },
  logoUrl: { type: String },
  messages: [messageSchema],
  lastActive: { type: Date, default: Date.now },
  isArchived: { type: Boolean, default: false }
});

// Index for querying messages
chatRoomSchema.index({ gameId: 1, 'messages.createdAt': -1 });

// Update lastActive timestamp when new messages are added
chatRoomSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.lastActive = new Date();
  }
  next();
});

export const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
