const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const app = express();
const corsOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowAllOrigins = corsOrigins.includes("*");

if (process.env.NODE_ENV === "production" && corsOrigins.length === 0) {
  console.warn("CORS_ORIGIN is not set in production; defaulting to allow all origins for deploy/testing.");
}

app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowAllOrigins ||
      corsOrigins.length === 0 ||
      corsOrigins.includes(origin)
    ) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  }
}));
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX || 100),
  standardHeaders: "draft-8",
  legacyHeaders: false
}));

app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});


app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/events", require("./src/routes/eventRoutes"));
app.use("/api/tickets", require("./src/routes/ticketRoutes"));
app.use("/api/payments", require("./src/routes/paymentRoutes"));
app.use("/api/refunds", require("./src/routes/refundRoutes"));
app.use("/uploads", express.static("uploads"));
app.use("/api/uploads", require("./src/routes/uploadRoutes"));
app.use("/api/users", require("./src/routes/userRoutes"));
app.use("/api/analytics", require("./src/routes/analyticsRoutes"));
app.use("/api/organizers", require("./src/routes/organizerRoutes"));


app.use("/api/favorites", require("./src/routes/favoriteRoutes"));
app.use("/api/reviews", require("./src/routes/reviewRoutes"));
app.use("/api/ticket-categories", require("./src/routes/ticketCategoryRoutes"));
app.use("/api/seats", require("./src/routes/seatRoutes"));
app.use("/api/ticket-transfers", require("./src/routes/ticketTransferRoutes"));
app.use("/api/event-categories", require("./src/routes/eventCategoryRoutes"));
app.use("/api/bulk-operations", require("./src/routes/bulkOperationRoutes"));
app.use("/api/capacity", require("./src/routes/capacityRoutes"));
app.use("/api/attendance", require("./src/routes/attendanceRoutes"));

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message
  });
});

module.exports = app;
