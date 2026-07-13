const router = require("express").Router();

const authMiddleware =
  require("../middleware/authMiddleware");

const roleMiddleware =
  require("../middleware/roleMiddleware");

const upload =
  require("../middleware/uploadMiddleware");

router.post(
  "/event-banner",
  authMiddleware,
  roleMiddleware("ORGANIZER", "ADMIN"),
  upload.single("image"),
  (req, res) => {

    res.json({
      imageUrl:
        `/uploads/${req.file.filename}`
    });

  }
);

module.exports = router;
