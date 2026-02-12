import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: [50000, 'Message content cannot exceed 50,000 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    model: {
      type: String,
      default: 'gpt-4o-mini'
    },
    tokens: {
      type: Number,
      default: 0
    },
    imageUrl: {
      type: String,
      default: null
    },
    isStreaming: {
      type: Boolean,
      default: false
    },
    liked: {
      type: Boolean,
      default: false
    },
    disliked: {
      type: Boolean,
      default: false
    }
  }
});

const chatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: [100, 'Chat title cannot exceed 100 characters'],
    trim: true
  },
  conversationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  messages: [messageSchema],
  settings: {
    model: {
      type: String,
      default: 'gpt-4o-mini'
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1
    },
    maxTokens: {
      type: Number,
      default: 2000,
      min: 1,
      max: 4000
    },
    systemPrompt: {
      type: String,
      default: null,
      maxlength: [5000, 'System prompt cannot exceed 5,000 characters']
    },
    personality: {
      type: String,
      enum: ['friendly', 'logical', 'playful', 'confident'],
      default: 'friendly'
    },
    defensiveMode: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  pinned: {
    type: Boolean,
    default: false,
    index: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  messageCount: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
chatSchema.index({ user: 1, lastMessageAt: -1 });
chatSchema.index({ user: 1, isActive: 1 });
chatSchema.index({ conversationId: 1 }, { unique: true });

// Virtual for message count
chatSchema.virtual('actualMessageCount').get(function() {
  return this.messages ? this.messages.length : 0;
});

// Method to add a message
chatSchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages = (this.messages || []).filter(
    msg => typeof msg.content === 'string' && msg.content.trim().length
  );
  const normalizedContent =
    typeof content === 'string' && content.trim().length
      ? content
      : '[no content]';
  const message = {
    role,
    content: normalizedContent,
    timestamp: new Date(),
    metadata: {
      model: this.settings.model,
      ...metadata
    }
  };
  
  this.messages.push(message);
  this.messageCount = this.messages.length;
  this.lastMessageAt = new Date();
  
  // Update total tokens if provided
  if (metadata.tokens) {
    this.totalTokens += metadata.tokens;
  }
  
  return this.save();
};

// Method to update chat title from first user message
chatSchema.methods.updateTitleFromFirstMessage = function() {
  if (this.messages.length > 0) {
    const firstUserMessage = this.messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      const title = firstUserMessage.content.substring(0, 50);
      this.title = title.length < firstUserMessage.content.length ? title + '...' : title;
    }
  }
};

// Method to archive chat
chatSchema.methods.archive = function() {
  this.isArchived = true;
  this.isActive = false;
  return this.save();
};

// Method to restore chat
chatSchema.methods.restore = function() {
  this.isArchived = false;
  this.isActive = true;
  return this.save();
};

// Static method to get user's chats
chatSchema.statics.getUserChats = function(userId, options = {}) {
  const {
    limit = 20,
    skip = 0,
    includeArchived = false,
    sortBy = 'lastMessageAt',
    sortOrder = -1
  } = options;
  
  const query = { user: userId };
  if (!includeArchived) {
    query.isArchived = false;
  }
  
  return this.find(query)
    .sort({ [sortBy]: sortOrder })
    .limit(limit)
    .skip(skip)
    .populate('user', 'name email avatar');
};

// Static method to search chats
chatSchema.statics.searchUserChats = function(userId, searchTerm, options = {}) {
  const {
    limit = 20,
    skip = 0,
    includeArchived = false
  } = options;
  
  const query = {
    user: userId,
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { 'messages.content': { $regex: searchTerm, $options: 'i' } }
    ]
  };
  
  if (!includeArchived) {
    query.isArchived = false;
  }
  
  return this.find(query)
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Pre-save middleware to update message count
chatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.messageCount = this.messages.length;
  }
  next();
});

export default mongoose.model('Chat', chatSchema);



