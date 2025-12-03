const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  profilePicture: { type: String },
  profilePictureThumbs: {
    small: { type: String },
    medium: { type: String },
    large: { type: String },
  },
  bio: { type: String },
  coverImage: { type: String },
  coverImageThumbs: {
    small: { type: String },
    medium: { type: String },
    large: { type: String },
  },
  location: { type: String },
  website: { type: String },
  roles: { type: [String], default: ['user'] },
  followers: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  following: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  blockedUsers: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  mutedUsers: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  mutedConversations: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  refreshTokens: { type: [String], default: [] },
  isVerified: { type: Boolean, default: false },
  verificationRequested: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true },
  notificationPreferences: {
    emailLikes: { type: Boolean, default: true },
    emailComments: { type: Boolean, default: true },
    emailFollows: { type: Boolean, default: true },
    pushMessages: { type: Boolean, default: true },
    emailMentions: { type: Boolean, default: true },
    emailMessages: { type: Boolean, default: true },
    pushMentions: { type: Boolean, default: true },
    pushMessagesAll: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);
