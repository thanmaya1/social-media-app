const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// If the file at `inputPath` is an image, produce a resized copy and return the
// path to the resized file. If not an image, return the original path.
// Caller should remove temporary files when appropriate.
async function processForUpload(inputPath, mimeType) {
  if (!mimeType || !mimeType.startsWith('image')) return inputPath;
  try {
    const ext = path.extname(inputPath) || '.jpg';
    const out = inputPath.replace(ext, `-resized${ext}`);
    // Resize to max 1600px width preserving aspect ratio and optimize
    await sharp(inputPath).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(out);
    // also produce medium and small thumbnails for convenience
    try {
      const thumbMedium = inputPath.replace(ext, `-medium${ext}`);
      const thumbSmall = inputPath.replace(ext, `-small${ext}`);
      await sharp(inputPath).resize({ width: 1024, withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(thumbMedium);
      await sharp(inputPath).resize({ width: 320, withoutEnlargement: true }).jpeg({ quality: 70 }).toFile(thumbSmall);
    } catch (e) {
      // thumbnail generation failed — non-fatal
    }
    return out;
  } catch (e) {
    // On any failure, fall back to original
    return inputPath;
  }
}

module.exports = { processForUpload };
