import { execFile as _execFile } from "node:child_process";
import { promisify } from "node:util";
import dedent from "dedent";
const execFile = promisify(_execFile);

describe("plugandplay.samples", function () {
  it("Simple js", async function () {
    const { stdout } = await execFile("node", ["./samples/simple-js/index.js"]);
    stdout.trim().should.eql(dedent`
    >>>>>>>>>>>
    Hello World
    <<<<<<<<<<<
    `);
  });
});
