import { plugandplay } from "../lib/index.js";

describe("plugandplay.call_sync", function () {
  describe("api", function () {
    it("expect 1 argument", function () {
      (() => plugandplay().call_sync({}, {})).should.throw({
        code: "PLUGINS_INVALID_ARGUMENTS_NUMBER",
      });
    });

    it("argument must a an object", function () {
      (() => plugandplay().call_sync([])).should.throw({
        code: "PLUGINS_INVALID_ARGUMENT_PROPERTIES",
      });
    });

    it("object must contains `name` and be a string", function () {
      (() =>
        plugandplay().call_sync({
          name: 123,
          handler: () => {},
        })).should.throw({ code: "PLUGINS_INVALID_ARGUMENT_NAME" });
    });

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

    it("more than 2 arguments", function () {
      (() => {
        const plugins = plugandplay();
        plugins.register({ hooks: { "my:hook": (a, b, c) => [a, b, c] } });
        plugins.call_sync({
          name: "my:hook",
          handler: () => {},
        });
      }).should.throw({
        code: "PLUGINS_INVALID_HOOK_HANDLER",
        message: [
          "PLUGINS_INVALID_HOOK_HANDLER:",
          "hook handlers must have 0 to 2 arguments",
          "got 3",
        ].join(" "),
      });
    });
  });

  describe("handler alter args", function () {
    it("synch handler without handler argument", function () {
      const test = {};
      plugandplay()
        .register({
          hooks: {
            "my:hook": (test) => {
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
      test.a_key.should.eql("a value");
    });

    it("synch handler with handler argument", function () {
      const plugins = plugandplay();
      plugins.register({
        hooks: {
          "my:hook": (test, handler) => {
            test.a_key = "a value";
            return handler;
          },
        },
      });
      const test = {};
      plugins.call_sync({
        name: "my:hook",
        args: test,
        handler: () => {},
      });
      test.a_key.should.eql("a value");
    });
  });

  describe("stop with null", function () {
    it("when `null` is returned, sync mode", function () {
      const plugins = plugandplay();
      plugins.register({
        hooks: {
          "my:hook": (ar, handler) => {
            ar.push("hook 1");
            return handler;
          },
        },
      });
      plugins.register({
        hooks: {
          "my:hook": (ar, handler) => {
            ar.push("hook 2");
            handler; // not used
            return null;
          },
        },
      });
      plugins.register({
        hooks: {
          "my:hook": (ar, handler) => {
            ar.push("hook 3");
            return handler;
          },
        },
      });
      plugins.register({
        hooks: {
          "my:hook": (ar, handler) => {
            ar.push("hook 4");
            return handler;
          },
        },
      });
      const ar = [];
      plugins.call_sync({
        name: "my:hook",
        args: ar,
        handler: (ar) => ar.push("origin"),
      });
      ar.should.eql(["hook 1", "hook 2"]);
    });
  });

  describe("alter result", function () {
    it("sync", function () {
      const plugins = plugandplay();
      plugins.register({
        hooks: {
          "my:hook": (args, handler) => () => {
            const res = handler.call(null, args);
            res.push("alter_1");
            return res;
          },
        },
      });
      plugins.register({
        hooks: {
          "my:hook": (args, handler) => () => {
            const res = handler.call(null, args);
            res.push("alter_2");
            return res;
          },
        },
      });
      plugins
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
