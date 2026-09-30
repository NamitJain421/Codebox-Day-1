const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { once } = require("node:events");
const { randomBytes } = require("node:crypto");
const { connectDatabase } = require("../src/db/database");
const { createApp } = require("../src/app");

// Isolated data and credentials. Never use a real account or the app's database.
process.env.LOCAL_MONGO_USER = "test_admin";
process.env.LOCAL_MONGO_PASSWORD = randomBytes(24).toString("hex");
delete process.env.MONGODB_URI;

test(
  "MongoDB-backed app: auth, CRUD, isolation, validation, restart persistence",
  { timeout: 120000 },
  async (t) => {
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), "codebox-test-"));
    let database, server, base;
    const options = { dbName: "codebox_test", dbPath: folder, port: 0 };
    async function start() {
      database = await connectDatabase(options);
      server = createApp(database).listen(0, "127.0.0.1");
      await once(server, "listening");
      base = `http://127.0.0.1:${server.address().port}`;
    }
    async function stop() {
      if (server) {
        server.closeIdleConnections();
        await new Promise((resolve) => server.close(resolve));
        server = null;
      }
      if (database) {
        await database.close();
        database = null;
      }
    }
    function client() {
      let cookie = "";
      return async (url, method = "GET", body, extra = {}) => {
        const res = await fetch(base + url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
            ...extra,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const cookies = res.headers.getSetCookie();
        if (cookies.length) cookie = cookies.at(-1).split(";")[0];
        return {
          status: res.status,
          headers: res.headers,
          body: (res.headers.get("content-type") || "").includes(
            "application/json",
          )
            ? await res.json()
            : await res.text(),
        };
      };
    }
    const alice = client(),
      bob = client(),
      anonymous = client();
    let taskId, cookie;
    try {
      await start();
      await t.test("homepage and database health", async () => {
        const page = await anonymous("/");
        assert.equal(page.status, 200);
        assert.match(page.body, /Create my account/);
        const health = await anonymous("/api/health");
        assert.equal(health.body.database, "connected");
        assert.equal((await anonymous("/.env")).status, 404);
        assert.equal((await anonymous("/api/training")).status, 401);
      });
      await t.test(
        "register, reject duplicates, hash passwords and protect cookies",
        async () => {
          const first = await alice("/api/auth/register", "POST", {
            name: "Alice",
            email: "alice@example.test",
            password: "Test-password-123",
          });
          assert.equal(first.status, 201);
          assert.equal(first.body.user.passwordHash, undefined);
          cookie = first.headers.getSetCookie().at(-1);
          assert.match(cookie, /HttpOnly/);
          assert.match(cookie, /SameSite=Strict/i);
          assert.equal(
            (
              await bob("/api/auth/register", "POST", {
                name: "Bob",
                email: "bob@example.test",
                password: "Test-password-456",
              })
            ).status,
            201,
          );
          assert.equal(
            (
              await anonymous("/api/auth/register", "POST", {
                name: "Alice",
                email: "ALICE@example.test",
                password: "Test-password-123",
              })
            ).status,
            409,
          );
          const stored = await database.db
            .collection("users")
            .findOne({ email: "alice@example.test" });
          assert.notEqual(stored.passwordHash, "Test-password-123");
          assert.match(stored.passwordHash, /^[a-f0-9]+:[a-f0-9]+$/);
          const storedSession = await database.db
            .collection("sessions")
            .findOne({ userId: stored._id });
          assert.ok(!cookie.includes(storedSession._id));
        },
      );
      await t.test("create and read JSON task", async () => {
        const res = await alice("/api/training", "POST", {
          title: "  Finishing practice  ",
          notes: "20 shots per foot",
          priority: "high",
          dueDate: "2026-10-01",
          focus: "shooting",
          duration: 60,
          location: "North field",
        });
        assert.equal(res.status, 201);
        taskId = res.body.session.id;
        assert.equal(res.body.session.title, "Finishing practice");
        assert.equal(res.body.session.userId, undefined);
        assert.equal(res.body.session.focus, "shooting");
        assert.equal(res.body.session.duration, 60);
        assert.equal(res.body.session.location, "North field");
        assert.equal((await alice("/api/training")).body.sessions.length, 1);

        assert.equal(
          (await alice("/api/training/" + taskId)).body.session.title,
          "Finishing practice",
        );
      });
      await t.test(
        "another account cannot read, update, or delete tasks",
        async () => {
          assert.deepEqual((await bob("/api/training")).body.sessions, []);
          assert.equal((await bob("/api/training/" + taskId)).status, 404);
          assert.equal(
            (await bob("/api/training/" + taskId, "PATCH", { title: "Stolen" }))
              .status,
            404,
          );
          assert.equal(
            (await bob("/api/training/" + taskId, "DELETE")).status,
            404,
          );
        },
      );
      await t.test("reject bad input without changing the task", async () => {
        for (const payload of [
          { title: "" },
          { completed: "yes" },
          { priority: "urgent" },
          { focus: "invalid" },
          { duration: 0 },
          { duration: 1.5 },
          { duration: 241 },
          { location: 42 },
          { dueDate: "2026-02-30" },
          { userId: "anything" },
          { $set: { title: "oops" } },
          {},
        ]) {
          assert.equal(
            (await alice("/api/training/" + taskId, "PATCH", payload)).status,
            400,
          );
        }
        assert.equal(
          (await alice("/api/training/" + taskId)).body.session.title,
          "Finishing practice",
        );
        assert.equal(
          (await alice("/api/training", "POST", { title: "x".repeat(20000) }))
            .status,
          413,
        );
        assert.equal(
          (
            await alice(
              "/api/training",
              "POST",
              { title: "No CSRF" },
              { Origin: "https://other-site.test" },
            )
          ).status,
          403,
        );
        const malformed = await fetch(base + "/api/training", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{",
        });
        assert.equal(malformed.status, 400);
        assert.equal((await alice("/api/training/not-an-id")).status, 404);
      });
      await t.test("update title and mark complete", async () => {
        const result = await alice("/api/training/" + taskId, "PATCH", {
          title: "Ready for demo",
          completed: true,
        });
        assert.equal(result.status, 200);
        assert.equal(result.body.session.completed, true);
        assert.equal(result.body.session.title, "Ready for demo");
      });
      await t.test(
        "tasks and sessions survive a database/server restart",
        async () => {
          await stop();
          await start();
          assert.equal((await alice("/api/auth/me")).status, 200);
          const saved = await alice("/api/training/" + taskId);
          assert.equal(saved.body.session.title, "Ready for demo");
          assert.equal(saved.body.session.completed, true);
        },
      );
      await t.test(
        "logout revokes session; wrong password fails; correct login works",
        async () => {
          assert.equal(
            (await alice("/api/auth/logout", "POST", {})).status,
            200,
          );
          assert.equal((await alice("/api/training")).status, 401);
          assert.equal(
            (
              await alice("/api/auth/login", "POST", {
                email: "alice@example.test",
                password: "wrong-password",
              })
            ).status,
            401,
          );
          assert.equal(
            (
              await alice("/api/auth/login", "POST", {
                email: "alice@example.test",
                password: "Test-password-123",
              })
            ).status,
            200,
          );
        },
      );
      await t.test("delete persists and repeated delete is 404", async () => {
        assert.equal(
          (await alice("/api/training/" + taskId, "DELETE")).status,
          200,
        );
        assert.equal(
          (await alice("/api/training/" + taskId, "DELETE")).status,
          404,
        );
        assert.deepEqual((await alice("/api/training")).body.sessions, []);
      });
    } finally {
      await stop();
      await fs.rm(folder, { recursive: true, force: true });
    }
  },
);
