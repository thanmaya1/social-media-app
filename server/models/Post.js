const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PostSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, trim: true },
    images: [{ type: String }],
    imageThumbs: [
      {
        small: { type: String },
        medium: { type: String },
        large: { type: String },
      },
    ],
    tags: { type: [String], default: [] },
    videos: [{ type: String }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    shares: { type: Number, default: 0 },
    visibility: { type: String, enum: ['public', 'private', 'friends-only'], default: 'public' },
    editHistory: [{ content: String, editedAt: Date }],
    isDeleted: { type: Boolean, default: false },
    isDraft: { type: Boolean, default: false },
    scheduledAt: { type: Date },
    scheduledProcessed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PostSchema.index({ createdAt: -1 });
PostSchema.index({ tags: 1 });

module.exports = mongoose.model('Post', PostSchema);
