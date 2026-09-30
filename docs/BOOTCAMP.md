# Bootcamp deliverables and verification

Reviewed against the provided Day 1 (slide 15), Day 2 (slide 38), and Day 3 (slide 32) PDFs, plus the demo-day recap requiring routes, a database, and CRUD.

## Required app deliverables

| Requirement                                    | Implementation / evidence                                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Run a Node.js app; package.json and dev script | `npm start`, `npm run dev`                                                                                     |
| Change the app's message                       | Pitchside soccer homepage and account screen                                                                   |
| Add a file or route                            | Frontend, authentication, database, and training-route modules                                                 |
| At least three API routes                      | Ten routes documented in README                                                                                |
| JSON responses                                 | All API successes and errors return JSON                                                                       |
| MongoDB or Supabase credentials                | MongoDB credentials generated locally in `.env`                                                                |
| `.env` file; keep secrets out of Git           | `.env.example` plus `.gitignore`; local DB/cache ignored                                                       |
| Clean folder structure                         | `public`, `src/db`, `src/routes`, `src/services`, `src/middleware`, `test`, `docs`                             |
| Running website                                | Homepage at http://localhost:3000                                                                              |
| Database connection                            | `/api/health` checks a real MongoDB connection                                                                 |
| Authentication                                 | Registration, login, logout, private cookie sessions                                                           |
| Website CRUD                                   | New session; list/calendar; edit/complete/reopen; delete confirmation                                          |
| Git checkpoint and push                        | See repository history for the Pitchside implementation commit                                                 |
| Bonus: Vercel deployment                       | Not deployed; local MongoDB requires persistent storage. Public hosting needs a managed DB and provider setup. |

## Verification performed

`npm test` runs isolated MongoDB integration tests for the homepage, database connectivity, registration, unique accounts, password hashing, secure cookie attributes, authenticated CRUD, cross-account isolation, validation, logout/login, deletion, and persistence through a full server/database restart.

Browser walkthrough verified create, read, edit, completion, completed filtering, drill starter forms, deletion, and reload persistence. Responsive inspection at 390px showed no horizontal overflow and an accessible session form. The two remaining “Demo:” sessions are explicitly labeled sample data.

`npm audit` reported no known vulnerabilities at verification time. This is a bootcamp local demo, not a claim of a complete production security audit.

## Day 3 skill exercise

Created the project skill `.agents/skills/codebox-api/SKILL.md`, with a discovery description for authenticated training-route work. `AGENTS.md` points future task-route work to it.

The skill's purpose is to keep MongoDB updates explicit and account-scoped. It accepts route implementation/review work as input. Correct output includes server-side validation, private ownership queries, safe JSON responses, and tests rejecting cross-account changes.

Applied those conventions to the `PATCH /api/training/:id` feature: accepted fields are allowlisted, query conditions include `userId`, unknown/foreign IDs return 404, and invalid input is rejected before writing. Tests cover these behaviors. Skill discovery is configured for future project tasks; automatic selection in a separate fresh Codex task has not been independently observed.

## Day 3 MCP exercise

Configured the official `@modelcontextprotocol/server-filesystem` server in `.codex/config.toml`, with read-only tools enabled in Codex. Its allowed directory is limited to `src/`, so `.env`, database records, and other home-directory files are outside its scope.

Tool used: Codex with the official MCP JavaScript SDK as a stdio client. Connected successfully, inspected `tools/list`, and called `read_text_file` on `src/routes/training.js`.

Plain-language question investigated: **“Which route edits a soccer session, and can it edit another player's session?”**

Answer from the MCP-returned source: `PATCH /api/training/:id` applies validated fields. It requires authentication, and its MongoDB filter includes both the session ID and authenticated user ID, so another player's session is not matched.

`npm run mcp:check` repeats the protocol connection, source-file read, and a check that `.env` access is denied. The project configuration loads in a trusted Codex project; the already-open task did not hot-load it, so verification was performed through the SDK rather than claiming a native MCP-panel connection.

The Playwright todo-site walkthrough in slide 30 is presented as an example. The general “connect and use one real MCP server” exercise was completed using the filesystem server instead.

## Review notes

- Kept one shared MongoClient and reused connections.
- Verified all CRUD queries enforce account ownership.
- Verified the frontend inserts user text with `textContent`, not HTML.
- Added JSON input limits, authentication rate limiting, security headers, and origin checks.
- Kept database files and credentials out of Git.
- Replaced conflicting old development watchers with one server for the demo.

Official references used for implementation: [MongoDB Node driver](https://www.mongodb.com/docs/drivers/node/current/connect/connection-targets/), [local MongoDB launcher](https://github.com/typegoose/mongodb-memory-server), [filesystem MCP server](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem), and [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).
