# Pitchside soccer project

The app is a Node.js/Express server with a static browser frontend and MongoDB.

For authenticated training route work, use `.agents/skills/codebox-api/SKILL.md`.

Run `npm test` for the isolated MongoDB-backed integration suite. Tests must not use the user's database. Run `npm start` to serve the app and its persistent local MongoDB process.

Keep `.env`, `.data/`, and `.cache/` out of Git. Keep database access in `src/db/`, routes in `src/routes/`, and browser code in `public/`.
