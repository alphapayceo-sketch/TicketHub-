const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // support a file path (absolute or relative to project root) or a module path
    const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    // resolve relative paths against the project root (process.cwd())
    const resolved = envPath.startsWith("/") || envPath.match(/^[A-Za-z]:\\/) ? envPath : path.resolve(process.cwd(), envPath);
    if (fs.existsSync(resolved)) {
      const raw = fs.readFileSync(resolved, "utf8");
      serviceAccount = JSON.parse(raw);
    } else {
      // fallback: try to require as a module (may throw)
      serviceAccount = require(envPath);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const gPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const resolvedG = gPath.startsWith("/") || gPath.match(/^[A-Za-z]:\\/) ? gPath : path.resolve(process.cwd(), gPath);
    if (fs.existsSync(resolvedG)) {
      const raw = fs.readFileSync(resolvedG, "utf8");
      serviceAccount = JSON.parse(raw);
    }
  }

  if (serviceAccount && Object.keys(serviceAccount).length > 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Initialized");
  } else {
    console.warn(
      "Firebase service account not configured - Firebase features disabled"
    );
  }
} catch (err) {
  console.warn(
    "Firebase service account could not be loaded - Firebase features disabled",
    err && err.message ? `Error: ${err.message}` : ""
  );
}

module.exports = admin;
