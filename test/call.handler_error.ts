import { plugandplay } from "../src/index.js";

describe("plugandplay.call.handler_error", function () {
  it("thrown error, no handler", async function () {
    await plugandplay({
      plugins: [
        {
          name: "my:plugin",
          hooks: {
            "my:hook": {
              handler: (args: string) => {
                throw Error(args);
              },
            },
          },
        },
      ],
    })
      .call({
        name: "my:hook",
        args: "catchme",
        handler: () => new Promise((resolve) => setImmediate(resolve)),
      })
      .should.be.rejectedWith("catchme");
  });

  it("throw error, before handler", async function () {
    await plugandplay({
      plugins: [
        {
          name: "my:plugin",
          hooks: {
            "my:hook": {
              handler: (args: string) => {
                throw Error(args);
              },
            },
          },
        },
      ],
    })
      .call({
        name: "my:hook",
        args: "catchme",
        handler: () => new Promise((resolve) => setImmediate(resolve)),
      })
      .should.be.rejectedWith("catchme");
  });

  it("throw error in returned handler, before parent handler", async function () {
    await plugandplay<{
      "my:hook": string
    }>({
      plugins: [
        {
          name: "my:plugin",
          hooks: {
            "my:hook": {
              handler: (args: string, handler) => () => {
                handler; // not used
                throw Error(args);
              },
            },
          },
        },
      ],
    })
      .call({
        name: "my:hook",
        args: "catchme",
        handler: () => new Promise((resolve) => setImmediate(resolve)),
      })
      .should.be.rejectedWith("catchme");
  });

  it("throw error in returned handler, after parent handler", async function () {
    await plugandplay<{
      "my:hook": string
    }>({
      plugins: [
        {
          name: "my:plugin",
          hooks: {
            "my:hook": {
              handler: (args: string, handler) => async () => {
                await handler("", () => {});
                throw Error(args);
              },
            },
          },
        },
      ],
    })
      .call({
        name: "my:hook",
        args: "catchme",
        handler: () => new Promise((resolve) => setImmediate(resolve)),
      })
      .should.be.rejectedWith("catchme");
  });
});
