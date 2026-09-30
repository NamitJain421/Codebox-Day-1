const { Router } = require("express");
const { ObjectId } = require("mongodb");
const { requireAuth } = require("../middleware/auth");
const { validateSession } = require("../services/training-validation");

function publicSession(session) {
  const { _id, userId, ...fields } = session;
  return { id: _id.toString(), ...fields };
}
function trainingRoutes(db) {
  const router = Router();
  const collection = db.collection("trainingSessions");
  router.use(requireAuth(db));
  router.param("id", (req, res, next, id) => {
    if (!/^[a-f\d]{24}$/i.test(id))
      return res.status(404).json({ error: "Training session not found." });
    req.sessionQuery = { _id: new ObjectId(id), userId: req.user._id };
    next();
  });
  router.get("/", async (req, res) => {
    const sessions = await collection
      .find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ sessions: sessions.map(publicSession) });
  });
  router.get("/:id", async (req, res) => {
    const session = await collection.findOne(req.sessionQuery);
    if (!session)
      return res.status(404).json({ error: "Training session not found." });
    res.json({ session: publicSession(session) });
  });
  router.post("/", async (req, res) => {
    const result = validateSession(req.body);
    if (result.error) return res.status(400).json({ error: result.error });
    const session = {
      notes: "",
      priority: "medium",
      dueDate: null,
      completed: false,
      focus: "ball-control",
      duration: 45,
      location: "",
      ...result.session,
      userId: req.user._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { insertedId } = await collection.insertOne(session);
    session._id = insertedId;
    res.status(201).json({ session: publicSession(session) });
  });
  router.patch("/:id", async (req, res) => {
    const result = validateSession(req.body, true);
    if (result.error) return res.status(400).json({ error: result.error });
    const session = await collection.findOneAndUpdate(
      req.sessionQuery,
      { $set: { ...result.session, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!session)
      return res.status(404).json({ error: "Training session not found." });
    res.json({ session: publicSession(session) });
  });
  router.delete("/:id", async (req, res) => {
    const result = await collection.deleteOne(req.sessionQuery);
    if (!result.deletedCount)
      return res.status(404).json({ error: "Training session not found." });
    res.json({ message: "Training session deleted." });
  });
  return router;
}
module.exports = { trainingRoutes };
