#!/usr/bin/env node --loader ts-node/esm

// Usage
//
// <ts_exec> samples/advanced-ts/index.ts <ping_or_pong> <message>
//
// Examples
//
// node --import tsx samples/advanced-ts/index.ts ping <message>
// node --loader ts-node/esm samples/advanced-ts/index.ts ping <message>

import { argv } from "node:process";
import engine from "./engine.js";
import ping from "./plugin-ping.js";
import pong from "./plugin-pong.js";
import report from "./plugin-report.js";

const app = engine([ping, pong, report]);

const args = argv.slice(2);
const command = args.shift();
if (command === undefined) {
  console.error("Expect one or multiple arguments.");
  process.exit(1);
} else if (!["ping", "pong"].includes(command)) {
  console.error(`Wrong command, got ${command} instead of ping or pong.`);
  process.exit(1);
}

await app.plugins.call({
  name: `app:command`,
  args: {
    command: command,
    message: args,
    app: app,
  },
  handler: () => console.info(`Command ${command} was processed.`),
});
