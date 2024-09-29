#!/usr/bin/env node --loader ts-node/esm

// Usage
//
// <ts_exec> samples/simple-ts/index.ts <ping_or_pong>
//
// Examples
//
// node --loader tsx samples/simple-ts/index.ts ping
// node --loader ts-node/esm samples/simple-ts/index.ts ping

import { argv } from "node:process";
import engine from "./engine.js";
import plugin from "./plugin.js";

const app = engine([plugin]);

const args = argv.slice(2);
if (!args.length) console.error("Expect one or multiple arguments.");

const command = args.shift();

switch (command) {
  case "ping":
    await app.call({
      name: `on:ping`,
      args: args,
      handler: () => console.info("pong"),
    });
    break;
  case "pong":
    await app.call({
      name: `on:pong`,
      args: args,
      handler: () => console.info("ping"),
    });
    break;
  default:
    console.error(`Wrong command, got ${command} instead of ping or pong.`);
}
