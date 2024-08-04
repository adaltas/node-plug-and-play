import { plugandplay, Api, Plugin } from "../../src/index.js";
import { appendFile } from "node:fs/promises";

export interface Config {
  "app:command": { command: string, message: string[]; app: Engine<Config> };
}

interface Engine<T> {
  plugins: Api<{
    [N in keyof T]: T[N]
  }>;
  log: (command: string, message: string[]) => void
}

export default function <T>(plugins: Plugin<T>[] = []): Engine<T> {
  const engine: Engine<T> = {
    plugins: plugandplay<{
      [N in keyof T]: T[N]
    }>({
      plugins: plugins,
    }),
    log: (command, message) => {
      appendFile(
        `${import.meta.dirname}/debug.log`,
        `${new Date().toISOString()} - Got command ${command} with message "${message.join(" ")}"\n`,
      );
    }
  }
  return engine
}
