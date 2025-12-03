const path = require('path');
const multer = require('multer');
const fs = require('fs');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

function fileFilter(req, file, cb) {
  // accept images and video types
  const allowed = /jpeg|jpg|png|gif|webp|mp4|webm/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) cb(null, true);
  else cb(new Error('Unsupported file type'), false);
}

const limits = { fileSize: 50 * 1024 * 1024 }; // 50MB

const upload = multer({ storage, fileFilter, limits });

// After files are uploaded to disk, generate thumbnails for image files.
async function generateThumbnailsForFile(file) {
  const mimetype = file.mimetype || '';
  if (!mimetype.startsWith('image')) return null;

  const thumbsDir = path.join(uploadDir, 'thumbs');
  if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });

  const srcPath = path.join(uploadDir, file.filename);
  const baseName = `${file.filename}`;
  const smallName = `${baseName}-small.jpg`;
  const mediumName = `${baseName}-medium.jpg`;
  const largeName = `${baseName}-large.jpg`;
  const smallPath = path.join(thumbsDir, smallName);
  const mediumPath = path.join(thumbsDir, mediumName);
  const largePath = path.join(thumbsDir, largeName);

  try {
    await sharp(srcPath).resize({ width: 320 }).jpeg({ quality: 70 }).toFile(smallPath);
    await sharp(srcPath).resize({ width: 1024 }).jpeg({ quality: 80 }).toFile(mediumPath);
    await sharp(srcPath).resize({ width: 1600 }).jpeg({ quality: 82 }).toFile(largePath);
    return {
      small: `/uploads/thumbs/${smallName}`,
      medium: `/uploads/thumbs/${mediumName}`,
      large: `/uploads/thumbs/${largeName}`,
    };
  } catch (e) {
    // swallow thumbnail generation errors so uploads still succeed
    // eslint-disable-next-line no-console
    console.warn('Thumbnail generation failed for', file.filename, e && e.message);
    return null;
  }
}

// Middleware to run after multer upload to populate `.thumbnails` on files
async function createThumbnails(req, _res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files || files.length === 0) return next();

    await Promise.all(
      files.map(async (f) => {
        const thumbs = await generateThumbnailsForFile(f);
        if (thumbs) f.thumbnails = thumbs;
      })
    );

    return next();
  } catch (e) {
    return next(e);
  }
}

module.exports = { upload, createThumbnails };
