const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

//what type of request should be accepted for each route
router.post("/verify-signup", authController.checkIfUsernameExists);
router.post("/signup", authController.signUp);
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);
//this one needs the authentication middleware since we don't want people who don't have a token to get user data
router.get("/me", authMiddleware, authController.me);

//export the router
module.exports = router;
