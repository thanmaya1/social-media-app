#!/usr/bin/env node
// Simple backfill script to compute tags for existing posts
// Usage: node server/scripts/backfillTags.js

require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('../models/Post');

async function connect() {
  const url = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/social_test';
  await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
}

function extractTags(txt) {
  if (!txt) return [];
  const m = txt.match(/#[A-Za-z0-9_]+/g);
  if (!m) return [];
  return Array.from(new Set(m.map((t) => t.slice(1).toLowerCase())));
}

async function run({ batchSize = 100, dryRun = false } = {}) {
  try {
    await connect();
    console.log('Connected to MongoDB');
    let updated = 0;
    let processed = 0;

    const cursor = Post.find({}).cursor();
    let batch = [];
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      processed++;
      const tags = extractTags(doc.content || '');
      if (tags.length) batch.push({ id: doc._id, tags });

      if (batch.length >= batchSize) {
        if (!dryRun) {
          for (const b of batch) {
            await Post.updateOne({ _id: b.id }, { $set: { tags: b.tags } }).exec();
            updated++;
          }
        }
        console.log(`Processed ${processed}, updated ${updated}`);
        batch = [];
      }
    }

    // final batch
    if (batch.length) {
      if (!dryRun) {
        for (const b of batch) {
          await Post.updateOne({ _id: b.id }, { $set: { tags: b.tags } }).exec();
          updated++;
        }
      }
    }

    console.log(`Backfill complete. Processed: ${processed}, Updated: ${updated}, dryRun: ${dryRun}`);
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed', err);
    process.exit(2);
  }
}

if (require.main === module) {
  // parse args: --batch=100 --dry
  const argv = process.argv.slice(2);
  const opts = { batchSize: 100, dryRun: false };
  for (const a of argv) {
    if (a.startsWith('--batch=')) opts.batchSize = parseInt(a.split('=')[1], 10) || 100;
    if (a === '--dry') opts.dryRun = true;
  }
  run(opts);
}
