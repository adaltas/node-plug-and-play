import { plugandplay } from "../dist/esm/index.js";

describe("plugandplay.call.handler_error", function () {
  it("throw `ReferenceError: not defined` error, no handler", async function () {
    await plugandplay({
      plugins: [
        {
          name: "my:plugin",
          hooks: {
            "my:hook": {
              handler: () => catchme(), // eslint-disable-line
            },
          },
        },
      ],
    })
      .call({
        name: "my:hook",
        handler: () => new Promise((resolve) => setImmediate(resolve)),
      })
      .should.be.rejectedWith(/not defined/);
  });

  it("throw `ReferenceError: not defined` error in returned handler, after parent handler", async function () {
    await plugandplay({
      plugins: [
        {
          name: "my:plugin",
          hooks: {
            "my:hook": {
              handler: (args, handler) => async () => {
                await handler.apply(null, []);
                catchme(); // eslint-disable-line
              },
            },
          },
        },
      ],
    })
      .call({
        name: "my:hook",
        handler: () => new Promise((resolve) => setImmediate(resolve)),
      })
      .should.be.rejectedWith(/not defined/);
  });
});
