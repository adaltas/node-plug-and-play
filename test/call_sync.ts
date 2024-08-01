import { plugandplay } from "../src/index.js";

describe("plugandplay.call_sync", function () {
  describe("api", function () {
    it("no aguments", function () {
      let count = 0;
      const plugins = plugandplay();
      plugins.register({ hooks: { "my:hook": () => count++ } });
      plugins.call_sync({
        name: "my:hook",
        handler: () => {},
      });
      count.should.eql(1);
    });
  });

  describe("handler alter args", function () {
    it("synch handler without handler argument", function () {
      interface Test {
        a_key?: string;
      }
      const test: Test = {};
      plugandplay()
        .register({
          hooks: {
            "my:hook": (test: Test) => {
              // Alter `test` with `a_key`
              test.a_key = "a value";
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

    it("synch handler with handler argument", function () {
      const plugins = plugandplay();
      plugins.register({
        hooks: {
          "my:hook": (test: Test, handler) => {
            test.a_key = "a value";
            return handler;
          },
        },
      });
      interface Test {
        a_key?: string;
      }
      const test: Test = {};
      plugins.call_sync({
        name: "my:hook",
        args: test,
        handler: () => {},
      });
      test.a_key?.should.eql("a value");
    });
  });

  describe("stop with null", function () {
    it("when `null` is returned, sync mode", function () {
      type Ar = string[];
      const ar: Ar = [];
      plugandplay()
        .register({
          hooks: {
            "my:hook": (ar: Ar, handler) => {
              ar.push("hook 1");
              return handler;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (ar: Ar, handler) => {
              ar.push("hook 2");
              handler; // not used
              return null;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (ar: Ar, handler) => {
              ar.push("hook 3");
              return handler;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (ar: Ar, handler) => {
              ar.push("hook 4");
              return handler;
            },
          },
        })
        .call_sync({
          name: "my:hook",
          args: ar,
          handler: (ar: string[]) => ar.push("origin"),
        });
      ar.should.eql(["hook 1", "hook 2"]);
    });
  });

  describe("alter result", function () {
    it("sync", function () {
      plugandplay()
        .register({
          hooks: {
            "my:hook": (args, handler) => () => {
              const res = handler.call(null, args);
              res.push("alter_1");
              return res;
            },
          },
        })
        .register({
          hooks: {
            "my:hook": (args, handler) => () => {
              const res = handler.call(null, args);
              res.push("alter_2");
              return res;
            },
          },
        })
        .call_sync({
          name: "my:hook",
          args: ["origin"],
          handler: (args) => {
            return args;
          },
        })
        .should.eql(["origin", "alter_1", "alter_2"]);
    });
  });
});
