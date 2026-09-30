const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { authRoutes } = require("./routes/auth");
const { trainingRoutes } = require("./routes/training");

function createApp(database) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "upgrade-insecure-requests": null,
          "script-src": ["'self'"],
          "style-src": ["'self'"],
          "img-src": ["'self'", "data:"],
        },
      },
      strictTransportSecurity:
        process.env.NODE_ENV === "production" ? undefined : false,
    }),
  );
  // The browser sends an Origin on mutations. Only same-origin pages may change data.
  app.use((req, res, next) => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
      const origin = req.headers.origin;
      if (origin && origin !== `${req.protocol}://${req.get("host")}`)
        return res
          .status(403)
          .json({ error: "Request origin is not allowed." });
      if (req.headers["sec-fetch-site"] === "cross-site")
        return res
          .status(403)
          .json({ error: "Cross-site request is not allowed." });
      if (
        req.method !== "DELETE" &&
        req.path !== "/api/auth/logout" &&
        !req.is("application/json")
      )
        return res
          .status(415)
          .json({ error: "Use Content-Type: application/json." });
    }
    next();
  });
  app.use(express.json({ limit: "16kb" }));
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait a minute." },
  });
  app.use(["/api", "/tasks"], limiter, (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.get("/api/health", async (req, res) => {
    try {
      await database.db.command({ ping: 1 });
      res.json({ status: "ok", database: "connected", storage: database.mode });
    } catch {
      res.status(503).json({ status: "unavailable", database: "disconnected" });
    }
  });
  app.use("/api/auth", authRoutes(database.db));
  app.use("/api/training", trainingRoutes(database.db));
  app.use(express.static(path.join(__dirname, "../public")));
  app.use((req, res) => res.status(404).json({ error: "Route not found." }));
  app.use((error, req, res, next) => {
    if (error.type === "entity.parse.failed")
      return res.status(400).json({ error: "Send valid JSON." });
    if (error.type === "entity.too.large")
      return res.status(413).json({ error: "Request body is too large." });
    console.error("Request failed:", error.name);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  });
  return app;
}
module.exports = { createApp };
