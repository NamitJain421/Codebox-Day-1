const path = require('node:path');
// Scope the official filesystem server to source code; .env and .data are outside it.
process.argv = [process.execPath, require.resolve('@modelcontextprotocol/server-filesystem/dist/index.js'), path.resolve(__dirname, '../src')];
import('@modelcontextprotocol/server-filesystem/dist/index.js');
