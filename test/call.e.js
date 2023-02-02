import { plugandplay } from "../dist/esm/index.js";

describe("plugandplay.call", function () {
  it("expect 1 argument", async function () {
    await plugandplay().call({}, {}).should.be.rejectedWith({
      code: "PLUGINS_INVALID_ARGUMENTS_NUMBER",
    });
  });

  it("argument must a an object", async function () {
    await plugandplay().call([]).should.be.rejectedWith({
      code: "PLUGINS_INVALID_ARGUMENT_PROPERTIES",
    });
  });

  it("object must contains `name` and be a string", async function () {
    await plugandplay()
      .call({
        name: 123,
        handler: () => {},
      })
      .should.be.rejectedWith({
        code: "PLUGINS_INVALID_ARGUMENT_NAME",
      });
  });

  it("more than 2 arguments", async function () {
    await plugandplay()
      .register({ hooks: { "my:hook": (a, b, c) => [a, b, c] } })
      .call({
        name: "my:hook",
        handler: () => {},
      })
      .should.be.rejectedWith({
        code: "PLUGINS_INVALID_HOOK_HANDLER",
        message: [
          "PLUGINS_INVALID_HOOK_HANDLER:",
          "hook handlers must have 0 to 2 arguments",
          "got 3",
        ].join(" "),
      });
  });
});
