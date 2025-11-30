const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  images: [{ type: String }],
  readAt: { type: Date },
  type: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

MessageSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);
