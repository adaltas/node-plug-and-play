import { plugandplay } from "../lib/index.js";

describe("plugandplay.get", function () {
  describe("option `name`", function () {
    it("root level", function () {
      plugandplay()
        .register({ hooks: { "my:hook": () => 1 } })
        .register({ hooks: { "my:hook": () => 2 } })
        .register({ hooks: { "another:hook": () => 2 } })
        .get({ name: "my:hook" })
        .map((hook) => hook.handler.call())
        .should.eql([1, 2]);
    });

    it("after and before as function", function () {
      plugandplay()
        .register({
          name: "module/after",
          hooks: { "my:hook": () => {} },
        })
        .register({
          name: "module/before",
          hooks: { "my:hook": () => {} },
        })
        .register({
          name: "module/origin",
          hooks: {
            "my:hook": {
              after: "module/after",
              before: "module/before",
              handler: () => {},
            },
          },
        })
        .get({ name: "my:hook" })
        .map((hook) => hook.plugin)
        .should.eql(["module/after", "module/origin", "module/before"]);
    });

    it("refer to an optional and missing dependency", function () {
      plugandplay()
        .register({
          name: "module/origin",
          hooks: {
            "my:hook": {
              after: "module/after",
              before: "module/before",
              handler: () => {},
            },
          },
        })
        .get({ name: "my:hook" })
        .map((hook) => hook.plugin)
        .should.eql(["module/origin"]);
    });
  });

  describe("require", function () {
    it("refer to registered plugin", function () {
      plugandplay()
        .register({
          name: "module/required",
        })
        .register({
          name: "module/parent",
          require: "module/required",
          hooks: {
            "my:hook": {
              handler: () => {},
            },
          },
        })
        .get({ name: "my:hook" })
        .should.match([{ name: "my:hook" }]);
    });

    it("refer to unregistered plugin", function () {
      (() =>
        plugandplay()
          .register({
            name: "module/parent",
            require: "module/required",
            hooks: {
              "my:hook": {
                handler: () => {},
              },
            },
          })
          .get({ name: "my:hook" })).should.throw(
        'REQUIRED_PLUGIN: the plugin "module/parent" requires a plugin named "module/required" which is not unregistered.',
      );
    });
  });

  describe("errors", function () {
    it("after plugin exists but contains no hooks", function () {
      (() => {
        plugandplay()
          .register({
            name: "module/after",
          })
          .register({
            hooks: {
              "my:hook": {
                after: "module/after",
                handler: () => {},
              },
            },
          })
          .get({ name: "my:hook" });
      }).should.throw(
        [
          "PLUGINS_HOOK_AFTER_INVALID:",
          'the hook "my:hook"',
          "references an after dependency",
          'in plugin "module/after" which does not exists.',
        ].join(" "),
      );
    });

    it("before plugin exists but contains no matching hooks", function () {
      (() => {
        plugandplay()
          .register({
            name: "module/before",
            hooks: {
              "non:matching:hook": {
                handler: () => {},
              },
            },
          })
          .register({
            hooks: {
              "my:hook": {
                before: "module/before",
                handler: () => {},
              },
            },
          })
          .get({ name: "my:hook" });
      }).should.throw(
        [
          "PLUGINS_HOOK_BEFORE_INVALID:",
          'the hook "my:hook"',
          "references a before dependency",
          'in plugin "module/before" which does not exists.',
        ].join(" "),
      );
    });
  });
});
