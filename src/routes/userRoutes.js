const router = require("express").Router();

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  getMe,
  updateProfile,
  saveFcmToken
} = require("../controllers/userController");

router.get(
  "/me",
  authMiddleware,
  getMe
);

router.put(
  "/profile",
  authMiddleware,
  updateProfile
);

router.post(
  "/fcm-token",
  authMiddleware,
  saveFcmToken
);

module.exports = router;