import { execFile as _execFile } from "node:child_process";
import util from "node:util";
import dedent from "dedent";
const execFile = util.promisify(_execFile);

describe("plugandplay.sample", function () {
  it("validate", async function () {
    const { stdout } = await execFile("node", ["./sample"]);
    stdout.trim().should.eql(dedent`
    >>>>>>>>>>>
    Hello World
    <<<<<<<<<<<
    `);
  });
});
