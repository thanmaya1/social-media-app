const cloudinary = require('cloudinary').v2;

// Configure using CLOUDINARY_URL or individual env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function uploadFile(filePath, options = {}) {
  // options can include folder, resource_type etc.
  const resourceType = options.resource_type || 'auto';
  const uploadOptions = { resource_type: resourceType };
  if (options.folder) uploadOptions.folder = options.folder;
  const res = await cloudinary.uploader.upload(filePath, uploadOptions);
  return res;
}

module.exports = { uploadFile, cloudinary };
