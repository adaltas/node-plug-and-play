import { appendFile } from "node:fs/promises";
import { Plugin } from "../../src/index.js";
import { Engine } from "./engine.js";

const log = (message: string[]): void => {
  appendFile(
    `${import.meta.dirname}/debug.log`,
    `${new Date().toISOString()} - Got message "${message.join(" ")}"\n`,
  );
};

export default {
  name: "log",
  hooks: {
    "on:ping": (message) => {
      log(message);
    },
    "on:pong": (message) => {
      log(message);
    },
  },
} as Plugin<Engine>;
