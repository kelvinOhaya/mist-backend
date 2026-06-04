const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../config/cloudinary");
const authMiddleware = require("../middleware/authMiddleware");
const uploadController = require("../controllers/uploadController");
const upload = multer({ storage });

router.post(
  "/profile-picture",
  authMiddleware,
  upload.single("image"),
  uploadController.updateProfilePicture,
);
router.post(
  "/group-profile-picture",
  authMiddleware,
  upload.single("image"),
  uploadController.updateGroupProfilePicture,
);

module.exports = router;
