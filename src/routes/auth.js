const { Router } = require("express");
const { rateLimit } = require("express-rate-limit");
const { hashPassword, verifyPassword } = require("../services/passwords");
const {
  createSession,
  revokeSession,
  requireAuth,
} = require("../middleware/auth");

const publicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
});
function authRoutes(db) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many attempts. Please try again in 15 minutes." },
  });
  router.post("/register", limiter, async (req, res) => {
    const { name, email, password } = req.body || {};
    if (typeof name !== "string" || !name.trim() || name.trim().length > 60)
      return res
        .status(400)
        .json({ error: "Enter a name between 1 and 60 characters." });
    if (
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    )
      return res.status(400).json({ error: "Enter a valid email address." });
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    )
      return res
        .status(400)
        .json({ error: "Use a password between 8 and 128 characters." });
    const user = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: await hashPassword(password),
      createdAt: new Date(),
    };
    try {
      const { insertedId } = await db.collection("users").insertOne(user);
      user._id = insertedId;
    } catch (error) {
      if (error.code === 11000)
        return res
          .status(409)
          .json({
            error:
              "An account with this email already exists. Sign in instead.",
          });
      throw error;
    }
    await revokeSession(db, req, res);
    await createSession(db, res, user._id);
    return res.status(201).json({ user: publicUser(user) });
  });
  router.post("/login", limiter, async (req, res) => {
    const { email, password } = req.body || {};
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 254 ||
      password.length > 128
    )
      return res.status(400).json({ error: "Enter your email and password." });
    const user = await db
      .collection("users")
      .findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await verifyPassword(password, user.passwordHash)))
      return res.status(401).json({ error: "Email or password is incorrect." });
    await revokeSession(db, req, res);
    await createSession(db, res, user._id);
    return res.json({ user: publicUser(user) });
  });
  router.get("/me", requireAuth(db), (req, res) =>
    res.json({ user: publicUser(req.user) }),
  );
  router.post("/logout", async (req, res) => {
    await revokeSession(db, req, res);
    res.json({ message: "Signed out." });
  });
  return router;
}
module.exports = { authRoutes };
