const cloudinaryLib = require("cloudinary");
const cloudinary = cloudinaryLib.v2;
const CloudinaryStorage = require("multer-storage-cloudinary");
const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = require("../config/env");

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// Pass the full cloudinary module (which contains .v2) to multer-storage-cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinaryLib,
  params: (req, file, cb) => {
    const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    cb(undefined, {
      folder: "chatApp/profilePics",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      public_id: uniqueId,
    });
  },
});

module.exports = { cloudinary, storage };
