import { plugandplay } from "../src/index.js";

describe("plugandplay.call", function () {
  describe("api", function () {
    it("no aguments", async function () {
      let count = 0;
      await plugandplay<{
        "my:hook": undefined
      }>()
        .register({ hooks: { "my:hook": () => count++ } })
        .call({
          name: "my:hook",
          args: undefined, // TODO, get rid of args when undefined
          handler: () => {},
        });
      count.should.eql(1);
    });
  });

  describe("property `args`", function () {
    it("is passed to handlers", async function () {
      const stack: { a_key: string}[] = [];
      await plugandplay<{
        "my:hook": { a_key: string}
      }>({
        plugins: [
          {
            hooks: { "my:hook": (args) => stack.push(args) && undefined },
          },
          {
            hooks: {
              "my:hook": (args, handler) => {
                stack.push(args);
                return handler;
              },
            },
          },
        ],
      }).call({
        name: "my:hook",
        args: { a_key: "a_value" },
        handler: (args) => stack.push(args),
      });
      stack.should.eql([
        { a_key: "a_value" },
        { a_key: "a_value" },
        { a_key: "a_value" },
      ]);
    });
  });

  describe("handler alter args", function () {

    it("synch handler without handler argument", async function () {
      const test = {
        a_key: 'overwrite'
      };
      await plugandplay<{
        "my:hook": {a_key: string}
      }>()
        .register({
          hooks: {
            "my:hook": (test) => {
              test.a_key = "a value";
            },
          },
        })
        .call({
          name: "my:hook",
          args: test,
          handler: () => {},
        });
      test.a_key.should.eql("a value");
    });

    it("synch handler with handler argument", async function () {
      const test: {a_key?: string} = {};
      await plugandplay<{
        "my:hook": {a_key?: string}
      }>()
        .register({
          hooks: {
            "my:hook": (test, handler) => {
              test.a_key = "a value";
              return handler;
            },
          },
        })
        .call({
          name: "my:hook",
          args: test,
          handler: () => {},
        });
      test.a_key?.should.eql("a value");
    });

    it("async handler with handler argument", async function () {
      const test: string[] = [];
      await plugandplay<{
        "my:hook": string[]
      }>()
        .register({
          hooks: {
            "my:hook": async (test, handler) => {
              test.push("alter 1");
              await new Promise((resolve) => setImmediate(resolve));
              return handler;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": async (test, handler) => {
              test.push("alter 2");
              await new Promise((resolve) => setImmediate(resolve));
              return handler;
            },
          },
        })
        .call({
          name: "my:hook",
          args: test,
          handler: (test) => test.push("origin"),
        });
      test.should.eql(["alter 1", "alter 2", "origin"]);
    });

    it("async handler unordered timeout", async function () {
      const test: string[] = [];
      await plugandplay<{
        "my:hook": string[]
      }>()
        .register({
          hooks: {
            "my:hook": (test, handler) =>
              new Promise((resolve) =>
                setTimeout(() => {
                  test.push("hook 1");
                  resolve(handler);
                }, 300),
              ),
          },
        })
        .register({
          hooks: {
            "my:hook": (test, handler) =>
              new Promise((resolve) =>
                setTimeout(() => {
                  test.push("hook 2");
                  resolve(handler);
                }, 100),
              ),
          },
        })
        .call({
          name: "my:hook",
          args: test,
          handler: (args) =>
            new Promise((resolve) =>
              setTimeout(() => {
                args.push("origin");
                // TODO: it shall instead be:
                // `resolve();`
                // but currently generates error:
                // "Expected 1 arguments, but got 0. Did you forget to include 'void' in your type argument to 'Promise'?ts(2794)"
                // See
                // https://github.com/microsoft/TypeScript/issues/49755
                // https://github.com/microsoft/TypeScript/issues/12871
                resolve(undefined);
              }, 100),
            ),
        });
      test.should.eql(["hook 1", "hook 2", "origin"]);
    });
  });

  describe("alter result", function () {
    it("sync", async function () {
      await plugandplay()
        .register({
          hooks: {
            "my:hook": (args, handler) => () => {
              const res = handler.call(null, args, handler) as string[];
              res.push("alter_1");
              return res;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (args, handler) => () => {
              const res = handler.call(null, args, handler) as string[];
              res.push("alter_2");
              return res;
            },
          },
        })
        .call({
          name: "my:hook",
          args: ["origin"],
          handler: (args) => args,
        })
        .should.finally.eql(["origin", "alter_1", "alter_2"]);
    });

    it("async", async function () {
      await plugandplay()
        .register({
          hooks: {
            "my:hook": (args, handler) => async () => {
              const res = await handler(args, () => {}) as string[];
              res.push("alter_1");
              await new Promise((resolve) => setImmediate(resolve));
              return res;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (args, handler) => async () => {
              const res = await handler(args, () => {}) as string[];
              res.push("alter_2");
              await new Promise((resolve) => setImmediate(resolve));
              return res;
            },
          },
        })
        .call({
          name: "my:hook",
          args: ["origin"],
          handler: (args) => args,
        })
        .should.finally.eql(["origin", "alter_1", "alter_2"]);
    });
  });

  describe("flow", function () {
    it("continue when `undefined` is returned (sync handler)", async function () {
      const test: string[] = [];
      await plugandplay<{
        "my:hook": string[]
      }>()
        .register({
          hooks: {
            "my:hook": (args, handler) => {
              args.push("hook 1", typeof handler);
              return handler;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (args: string[], handler) => {
              args.push("hook 2", typeof handler);
              return undefined;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (args: string[], handler) => {
              args.push("hook 3", typeof handler);
              return handler;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (args: string[], handler) => {
              args.push("hook 4", typeof handler);
              return handler;
            },
          },
        })
        .call({
          name: "my:hook",
          args: test,
          handler: (args: string[]) => args.push("origin"),
        });
      test.should.eql([
        "hook 1",
        "function",
        "hook 2",
        "function",
        "hook 3",
        "undefined",
        "hook 4",
        "undefined",
      ]);
    });
    
    it("stop when `null` is returned (sync handler)", async function () {
      const test: string[] = [];
      await plugandplay<{
        "my:hook": string[]
      }>()
        .register({
          hooks: {
            "my:hook": (args, handler) => {
              args.push("hook 1");
              return handler;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (args, handler) => {
              args.push("hook 2");
              handler; // not used
              return null;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (args, handler) => {
              args.push("hook 3");
              return handler;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (args, handler) => {
              args.push("hook 4");
              return handler;
            },
          },
        })
        .call({
          name: "my:hook",
          args: test,
          handler: (args) => args.push("origin"),
        });
      test.should.eql(["hook 1", "hook 2"]);
    });

    it("stop when `null` is fulfilled (async handler)", async function () {
      const test: string[] = [];
      await plugandplay<{
        "my:hook": string[]
      }>()
        .register({
          hooks: {
            "my:hook": (args, handler) =>
              new Promise((resolve) =>
                setTimeout(() => {
                  args.push("hook 1");
                  resolve(handler);
                }, 300),
              ),
          },
        })
        .register({
          hooks: {
            "my:hook": (args, handler) =>
              new Promise((resolve) =>
                setTimeout(() => {
                  args.push("hook 2");
                  handler; // not used
                  resolve(null);
                }, 100),
              ),
          },
        })
        .register({
          hooks: {
            "my:hook": (args, handler) =>
              new Promise((resolve) =>
                setTimeout(() => {
                  args.push("hook 3");
                  resolve(handler);
                }, 300),
              ),
          },
        })
        .call({
          name: "my:hook",
          args: test,
          handler: (args) =>
            new Promise((resolve) =>
              setTimeout(() => {
                args.push("origin");
                // TODO: see comment above
                resolve(undefined);
              }, 100),
            ),
        });
      test.should.eql(["hook 1", "hook 2"]);
    });
  });
});
