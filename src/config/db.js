const { Pool } = require("pg");

const requiredEnv = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME"
];

const missingEnv = requiredEnv.filter(
  (name) => !process.env[name]
);

if (missingEnv.length > 0) {
  throw new Error(
    `Missing required database env vars: ${missingEnv.join(", ")}`
  );
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionTimeoutMillis: Number(
    process.env.DB_CONNECTION_TIMEOUT_MS || 5000
  ),
  idleTimeoutMillis: Number(
    process.env.DB_IDLE_TIMEOUT_MS || 30000
  ),
  ssl:
    process.env.DB_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined
});

pool.connect()
  .then((client) => {
    client.release();
    console.log("PostgreSQL Connected");
  })
  .catch((err) => {
    console.error("PostgreSQL Error:", err.message);
  });

module.exports = pool;
