const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PostSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, trim: true },
  images: [{ type: String }],
  videos: [{ type: String }],
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
  shares: { type: Number, default: 0 },
  visibility: { type: String, enum: ['public', 'private', 'friends-only'], default: 'public' },
  editHistory: [{ content: String, editedAt: Date }],
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

PostSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', PostSchema);
