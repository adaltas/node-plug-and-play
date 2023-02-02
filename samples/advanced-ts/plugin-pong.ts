import { appendFile } from "node:fs/promises";
import { Plugin } from "../../src/index.js";
import { Config } from "./engine.js";

export default {
  name: "log",
  hooks: {
    "app:command": ({command, message, app}) => {
      if (command !== "pong") return;
      app.log(command, message);
      app.plugins.call({
        name: "pong:report",
        args: {
          event: "app:command",
          message: message,
        },
      });
    },
  },
} as Plugin<{
  [N in keyof Config]: Config[N];
}>;
