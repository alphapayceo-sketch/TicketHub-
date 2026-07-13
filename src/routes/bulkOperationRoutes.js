const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  createBulkOperation,
  getBulkOperation,
  getBulkOperations,
  cancelBulkOperation,
  getBulkOperationStats
} = require("../controllers/bulkOperationController");

// Create bulk operation (admin only)
router.post("/", authMiddleware, roleMiddleware("ADMIN"), createBulkOperation);

// Get bulk operation statistics (admin only)
router.get("/stats/summary", authMiddleware, roleMiddleware("ADMIN"), getBulkOperationStats);

// Get bulk operation details
router.get("/:operationId", authMiddleware, roleMiddleware("ADMIN"), getBulkOperation);

// Get all bulk operations (admin only)
router.get("/", authMiddleware, roleMiddleware("ADMIN"), getBulkOperations);

// Cancel a bulk operation (admin only)
router.post("/:operationId/cancel", authMiddleware, roleMiddleware("ADMIN"), cancelBulkOperation);

module.exports = router;
