# Pitchside ⚽

Video link: https://1drv.ms/p/c/2d08763aeba81a74/IQA1nwjid4eVQ7zVHQVEDtwMAbUeK9STGd1NY2vMQZatalU

A soccer training planner built for Codebox Bootcamp. Create a private account, plan training sessions, and track the work you put in on the pitch.

## Run the website

Requires Node.js 22 or newer and npm.

```sh
npm install
npm start
```

Open **http://localhost:3000**. Create an account or sign in to your existing account. Keep the terminal running while using the site. Stop it with Ctrl+C. Use only one app terminal at a time.

The first start downloads the official MongoDB binary and generates local database credentials in `.env`. Later starts use the cached binary. The site and database both run on your computer; an internet connection is not required after installation and the initial download.

For automatic restarts while changing backend code:

```sh
npm run dev
```

Refresh the browser after changing frontend files. If port 3000 is already in use, stop the previous server with Ctrl+C before starting another copy.

## Features

- Account creation, sign-in, sign-out, and persistent login sessions.
- Private training plans: each account sees only its own sessions.
- Create, read, edit, complete/reopen, and delete training sessions.
- Training focus: ball control, passing, shooting, fitness, or match preparation.
- Date, duration, intensity, location, and drill notes for each session.
- Weekly calendar, search, planned/completed filters, and date/intensity sorting.
- Total sessions, planned/completed counts, and minutes trained.
- Editable drill starters for ball control, shooting, and fitness.
- Responsive desktop and mobile layouts.

## Database and credentials

This is a real MongoDB process using the WiredTiger storage engine. A development launcher (`mongodb-memory-server-core`) starts it automatically, but **data is persisted to `.data/mongodb`**, rather than discarded. Accounts, sessions, and training plans survive restarts.

`.env` contains configuration and a randomly generated database password. `.env`, `.data/`, and `.cache/` are excluded from Git. `.env.example` is safe to share. Do not delete `.data/` or change the local database password without migrating the database users.

You can optionally connect to MongoDB Atlas by setting `MONGODB_URI` in `.env`; this disables the local database launcher. `MONGODB_DB` selects the database. Existing local records are not automatically copied to Atlas.

The local demo is served over HTTP on the loopback interface. A public deployment needs HTTPS, a managed MongoDB deployment, environment variables, and hosting-specific proxy configuration. Vercel deployment was a bonus in the slides and is not included in this local demo.

## JSON API routes

All training routes require a signed-in session cookie. The frontend calls them on the same origin.

| Method | Route                | Purpose                              |
| ------ | -------------------- | ------------------------------------ |
| POST   | `/api/auth/register` | Create an account                    |
| POST   | `/api/auth/login`    | Sign in                              |
| GET    | `/api/auth/me`       | Read the signed-in user              |
| POST   | `/api/auth/logout`   | Sign out and revoke the session      |
| GET    | `/api/health`        | Check the database connection        |
| GET    | `/api/training`      | Read your training plan              |
| GET    | `/api/training/:id`  | Read one session                     |
| POST   | `/api/training`      | Create a session                     |
| PATCH  | `/api/training/:id`  | Update a session or mark it complete |
| DELETE | `/api/training/:id`  | Delete a session                     |

Example session body:

```json
{
  "title": "First touch & passing",
  "focus": "passing",
  "duration": 45,
  "priority": "medium",
  "dueDate": "2026-10-01",
  "location": "Local soccer field",
  "notes": "Work on receiving and passing with both feet."
}
```

`priority` is the API field for training intensity (`low`, `medium`, `high`). `completed` is a boolean. Successful reads return `{ "sessions": [...] }` or `{ "session": {...} }`; errors return `{ "error": "..." }` with an appropriate HTTP status.

## Project structure

```text
index.js                     Startup and graceful shutdown
public/                      Webpage, styles, browser logic, pitch illustration
src/app.js                   Express app, security headers, JSON handling
src/db/database.js           Shared MongoDB connection and indexes
src/routes/auth.js           Registration and login routes
src/routes/training.js       Training CRUD routes
src/services/                Password hashing and input validation
src/middleware/auth.js       Private session-cookie authentication
scripts/setup-env.js         Local configuration setup
scripts/mcp-filesystem.js    Source-only filesystem MCP launcher
scripts/check-mcp.mjs        MCP connection/read/scope verification
.agents/skills/codebox-api/  Project API convention skill
.codex/config.toml           Project-local MCP configuration
AGENTS.md                    Project development guidance
test/api.test.js             Isolated MongoDB integration tests
docs/                        Deliverable checklist, exercise notes, demo script
```

## Verify

```sh
npm test
npm run mcp:check
npm audit
```

Tests use a separate temporary MongoDB database. They verify registration/login/logout, JSON CRUD, validation, cross-account isolation, and persistence after restarting both the server and database. They do not modify your training plan.

See [the bootcamp checklist](docs/BOOTCAMP.md) and [the demo walkthrough](docs/DEMO.md).
