const Post = require('../models/Post');

let poller = null;

async function publishDue(io) {
  try {
    const now = new Date();
    const due = await Post.find({ isDraft: true, scheduledAt: { $lte: now }, isDeleted: false }).limit(100);
    if (!due || due.length === 0) return;
    for (const p of due) {
      try {
        p.isDraft = false;
        p.scheduledAt = undefined;
        await p.save();
        if (io && io.emit) io.emit('new_post', p);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to publish scheduled post', p._id, e && e.message);
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('publishDue error', e && e.message);
  }
}

// Convenience helper to create a scheduled post
async function schedulePost(postData) {
  // Ensure required defaults for scheduled posts
  const p = await Post.create(Object.assign({ isDraft: true }, postData));
  return p;
}

function startScheduler(app) {
  if (process.env.DISABLE_SCHEDULER) return;
  if (poller) return;
  const io = app && app.get && app.get('io');
  // allow tests to override interval with SCHEDULER_POLL_MS
  const intervalMs = process.env.SCHEDULER_POLL_MS ? parseInt(process.env.SCHEDULER_POLL_MS, 10) : 30 * 1000;
  poller = setInterval(() => publishDue(io), intervalMs);
  // run once immediately
  setImmediate(() => publishDue(io));
}

function stopScheduler() {
  if (poller) clearInterval(poller);
  poller = null;
}

module.exports = { startScheduler, stopScheduler, publishDue, schedulePost };
