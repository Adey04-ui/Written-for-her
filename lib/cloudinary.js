const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadBase64Image(base64String, publicId) {
  const result = await cloudinary.uploader.upload(base64String, {
    public_id: publicId,
    folder: 'for-her-gift',
    overwrite: true,
    resource_type: 'image',
  });
  return result;
}

module.exports = { uploadBase64Image };