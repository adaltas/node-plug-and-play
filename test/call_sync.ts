import { plugandplay } from "../src/index.js";

describe("plugandplay.call_sync", function () {
  describe("api", function () {
    it("no aguments", function () {
      let count = 0;
      const plugins = plugandplay();
      plugins.register({ hooks: { "my:hook": () => count++ } });
      plugins.call_sync({
        name: "my:hook",
        args: undefined,
        handler: () => {},
      });
      count.should.eql(1);
    });
  });

  describe("handler alter args", function () {
    it("synch handler without handler argument", function () {
      const test = {
        a_key: "overwrite"
      };
      plugandplay<{
        "my:hook": {a_key: string}
      }>()
        .register({
          hooks: {
            "my:hook": (test) => {
              // Alter `test` with `a_key`
              test.a_key = "a value";
            },
          },
        }).call_sync({
          name: "my:hook",
          args: test,
          handler: () => {},
        });
      test.a_key.should.eql("a value");
    });

    it("synch handler with handler argument", function () {
      const test: { a_key?: string } = {};
      plugandplay<{
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
        .call_sync({
          name: "my:hook",
          args: test,
          handler: () => {},
        });
      test.a_key?.should.eql("a value");
    });
  });
  describe("alter result", function () {
    it("sync", async function () {
      await plugandplay()
        .register({
          hooks: {
            "my:hook": (args, handler) => () => {
              const res = handler(args, handler) as string[];
              res.push("alter_1");
              return res;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (args, handler) => () => {
              const res = handler(args, handler) as string[];
              res.push("alter_2");
              return res;
            },
          },
        })
        .call_sync({
          name: "my:hook",
          args: ["origin"],
          handler: (args) => args,
        })
        ?.should.eql(["origin", "alter_1", "alter_2"]);
    });
  });

  describe("flow", function () {
    it("continue when `undefined` is returned", async function () {
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
        .call_sync({
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

    it("stop when `null` is returned, sync mode", function () {
      type Test = string[];
      const test: Test = [];
      plugandplay<{
        "my:hook": string[]
      }>()
        .register({
          hooks: {
            "my:hook": (test: Test, handler) => {
              test.push("hook 1");
              return handler;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (test: Test, handler) => {
              test.push("hook 2");
              handler; // not used
              return null;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (test: Test, handler) => {
              test.push("hook 3");
              return handler;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (test: Test, handler) => {
              test.push("hook 4");
              return handler;
            },
          },
        })
        .call_sync({
          name: "my:hook",
          args: test,
          handler: (test: string[]) => test.push("origin"),
        });
      test.should.eql(["hook 1", "hook 2"]);
    });
  });
});
