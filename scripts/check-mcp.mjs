import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const client = new Client({ name: "pitchside-homework", version: "1.0.0" });
try {
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [path.join(root, "scripts/mcp-filesystem.js")],
      stderr: "pipe",
    }),
  );
  const { tools } = await client.listTools();
  assert.ok(tools.some((tool) => tool.name === "read_text_file"));
  const result = await client.callTool({
    name: "read_text_file",
    arguments: { path: path.join(root, "src/routes/training.js") },
  });
  assert.ok(!result.isError);
  const text = result.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
  assert.match(text, /router\.patch/);
  const denied = await client.callTool({
    name: "read_text_file",
    arguments: { path: path.join(root, ".env") },
  });
  assert.equal(denied.isError, true);
  console.log(
    "PASS: filesystem MCP connected; read the training routes; access to .env was denied.",
  );
} finally {
  await client.close();
}
