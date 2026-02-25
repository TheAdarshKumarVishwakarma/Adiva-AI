import Chat from '../models/Chat.js';
import User from '../models/User.js';
import AdminSettings from '../models/AdminSettings.js';

const chatRepository = {
  findUserById(userId) {
    return User.findById(userId);
  },

  getAdminSettings() {
    return AdminSettings.getSettings();
  },

  findChatByConversationId(conversationId, userId) {
    return Chat.findOne({ conversationId, user: userId });
  },

  createChat(chatData) {
    const chat = new Chat(chatData);
    return chat.save();
  },

  countUserChats(userId, includeArchived) {
    return Chat.countDocuments({
      user: userId,
      ...(includeArchived !== 'true' ? { isArchived: false } : {})
    });
  },

  getUserChats(userId, options) {
    return Chat.getUserChats(userId, options);
  },

  findUserChatById(chatId, userId) {
    return Chat.findOne({ _id: chatId, user: userId });
  },

  findUserChatByIdWithUser(chatId, userId) {
    return Chat.findOne({ _id: chatId, user: userId })
      .populate('user', 'name email avatar');
  },

  searchUserChats(userId, query, options) {
    return Chat.searchUserChats(userId, query, options);
  }
};

export default chatRepository;
