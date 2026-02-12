import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: function() {
      return !this.isGoogleUser; // Only required if not a Google user
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  isGoogleUser: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  return this.updateOne({
    $set: { lastLogin: new Date() },
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to get user settings
userSchema.methods.getSettings = async function() {
  const UserSettings = mongoose.model('UserSettings');
  return await UserSettings.getOrCreateUserSettings(this._id);
};

// Method to get user analytics
userSchema.methods.getAnalytics = async function() {
  const UserAnalytics = mongoose.model('UserAnalytics');
  return await UserAnalytics.getOrCreateUserAnalytics(this._id);
};

// Method to get user chats
userSchema.methods.getChats = async function(options = {}) {
  const Chat = mongoose.model('Chat');
  return await Chat.getUserChats(this._id, options);
};

// Method to create a new chat
userSchema.methods.createChat = async function(title, conversationId) {
  const Chat = mongoose.model('Chat');
  const chat = new Chat({
    user: this._id,
    title,
    conversationId
  });
  return await chat.save();
};

// Method to get user profile with all related data
userSchema.methods.getFullProfile = async function() {
  const [settings, analytics, recentChats] = await Promise.all([
    this.getSettings(),
    this.getAnalytics(),
    this.getChats({ limit: 5 })
  ]);

  return {
    user: this.toJSON(),
    settings: settings.toJSON(),
    analytics: analytics.toJSON(),
    recentChats: recentChats
  };
};

// Method to delete user and all related data
userSchema.methods.deleteUserData = async function() {
  const Chat = mongoose.model('Chat');
  const UserSettings = mongoose.model('UserSettings');
  const UserAnalytics = mongoose.model('UserAnalytics');

  // Delete all related data
  await Promise.all([
    Chat.deleteMany({ user: this._id }),
    UserSettings.deleteOne({ user: this._id }),
    UserAnalytics.deleteOne({ user: this._id })
  ]);

  // Delete the user
  return await this.deleteOne();
};

// Method to export all user data
userSchema.methods.exportAllData = async function() {
  const [settings, analytics, chats] = await Promise.all([
    this.getSettings(),
    this.getAnalytics(),
    this.getChats({ limit: 1000, includeArchived: true })
  ]);

  return {
    user: this.toJSON(),
    settings: settings.exportSettings(),
    analytics: analytics.toJSON(),
    chats: chats.map(chat => chat.toJSON()),
    exportedAt: new Date(),
    version: '1.0'
  };
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.loginAttempts;
  delete userObject.lockUntil;
  return userObject;
};

const User = mongoose.model('User', userSchema);

export default User;
