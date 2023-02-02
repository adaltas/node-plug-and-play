import { plugandplay, Plugin } from "../../src/index.js";

export type Engine = {
  "on:ping": string[];
  "on:pong": string[];
};

export default function (plugins: Plugin<Engine>[] = []) {
  return plugandplay<Engine>({
    plugins: plugins,
  });
}
