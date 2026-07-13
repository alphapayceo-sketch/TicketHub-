const router = require("express").Router();

const {
  firebaseLogin,
  devLogin
} = require("../controllers/authController");

router.post(
  "/firebase-login",
  firebaseLogin
);

router.post(
  "/dev-login",
  devLogin
);

module.exports = router;
