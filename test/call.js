import { plugandplay } from "../lib/index.js";

describe("plugandplay.call", function () {
  describe("api", function () {
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

    it("no aguments", async function () {
      let count = 0;
      await plugandplay()
        .register({ hooks: { "my:hook": () => count++ } })
        .call({
          name: "my:hook",
          handler: () => {},
        });
      count.should.eql(1);
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

  describe("property `args`", function () {
    it("is passed to handlers", async function () {
      const stack = [];
      await plugandplay({
        plugins: [
          {
            hooks: { "my:hook": (args) => stack.push(args) },
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
      const test = {};
      await plugandplay()
        .register({
          hooks: {
            "my:hook": (test) => {
              // Alter `test` with `a_key`
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
      const test = {};
      await plugandplay()
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
      test.a_key.should.eql("a value");
    });

    it("async handler with handler argument", async function () {
      const test = [];
      await plugandplay()
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
      const test = [];
      await plugandplay()
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
                resolve();
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
              const res = handler.call(null, args, handler);
              res.push("alter_1");
              return res;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (args, handler) => () => {
              const res = handler.call(null, args, handler);
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
        .should.be.resolvedWith(["origin", "alter_1", "alter_2"]);
    });

    it("async", async function () {
      await plugandplay()
        .register({
          hooks: {
            "my:hook": (args, handler) => async () => {
              const res = await handler.call(null, args);
              res.push("alter_1");
              await new Promise((resolve) => setImmediate(resolve));
              return res;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (args, handler) => async () => {
              const res = await handler.call(null, args);
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
        .should.be.resolvedWith(["origin", "alter_1", "alter_2"]);
    });
  });

  describe("continue with `undefined`", function () {
    it("when `undefined` is returned, sync mode", async function () {
      const test = [];
      await plugandplay()
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
            "my:hook": (args, handler) => {
              args.push("hook 2", typeof handler);
              return undefined;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (args, handler) => {
              args.push("hook 3", typeof handler);
              return handler;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (args, handler) => {
              args.push("hook 4", typeof handler);
              return handler;
            },
          },
        })
        .call({
          name: "my:hook",
          args: test,
          handler: (args) => args.push("origin"),
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
  });

  describe("stop with `null`", function () {
    it("when `null` is returned, sync mode", async function () {
      const test = [];
      await plugandplay()
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

    it("when `null` is fulfilled, async mode", async function () {
      const test = [];
      await plugandplay()
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
                resolve();
              }, 100),
            ),
        });
      test.should.eql(["hook 1", "hook 2"]);
    });
  });
});
