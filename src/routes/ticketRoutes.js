const router = require("express").Router();

const authMiddleware =
  require("../middleware/authMiddleware");

const roleMiddleware =
  require("../middleware/roleMiddleware");

const {
  purchaseTicket,
  getUserTickets,
  getTicketByNumber,
  validateTicket,
  transferTicket
} = require("../controllers/ticketController");

router.post(
  "/purchase",
  authMiddleware,
  purchaseTicket
);

router.post(
  "/validate",
  authMiddleware,
  roleMiddleware("ORGANIZER", "ADMIN"),
  validateTicket
);

router.post(
  "/transfer",
  authMiddleware,
  transferTicket
);

router.get(
  "/user/tickets",
  authMiddleware,
  getUserTickets
);

router.get(
  "/:ticketNumber",
  authMiddleware,
  getTicketByNumber
);

module.exports = router;
