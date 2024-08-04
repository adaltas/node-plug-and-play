
import { Plugin } from "../../src/index.js";
import { Config } from "./engine.js";

declare module "./engine.js" {
  interface Config {
    "ping:report": { event: string, message: string[]};
    "pong:report": { event: string, message: string[]};
  }
}

export default {
  name: "log",
  hooks: {
    "ping:report": ({ event, message }) => {
      console.log(`Pluging ping receive message "${message}" in "${event}"`);
    },
    "pong:report": ({ event, message }) => {
      console.log(`Pluging pong receive message "${message}" in "${event}"`);
    },
  },
} as Plugin<{
  [N in keyof Config]: Config[N];
}>;
