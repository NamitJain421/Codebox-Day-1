---
name: codebox-api
description: Implement or review authenticated training routes in the Pitchside soccer app, including session validation, per-user MongoDB queries, and JSON errors.
---

# Pitchside training API

Use the shared MongoClient from `src/db/database.js`; do not open a database connection per request.

For session reads, edits, and deletes, include the authenticated `userId` in the MongoDB query. An unknown session and a session belonging to somebody else both return 404.

Accept only the documented editable fields (`title`, `notes`, `priority`, `dueDate`, `completed`, `focus`, `duration`, `location`). Build update documents explicitly so request data never becomes a MongoDB operator. Reject invalid field types and empty titles before writing.

Return session objects without internal ownership fields. Never return password hashes, session tokens, or database credentials in JSON responses.

For an update feature, verify that a second account cannot change the first account's session and that invalid input does not modify the stored document. Run `npm test` after route changes.
