import { plugandplay } from "../lib/index.js";

describe("plugandplay.register", function () {
  it("register an object", function () {
    plugandplay()
      .register({
        hooks: {
          "my:hook": () => 1,
        },
      })
      .get({ name: "my:hook" })
      .map((hook) => hook.handler.call())
      .should.eql([1]);
  });

  it("register a function", function () {
    plugandplay()
      .register(() => ({
        hooks: {
          "my:hook": () => 1,
        },
      }))
      .get({ name: "my:hook" })
      .map((hook) => hook.handler.call())
      .should.eql([1]);
  });

  describe("errors", function () {
    it("when plugin not an nor a function", function () {
      (() => plugandplay().register("abc")).should.throw(
        [
          "PLUGINS_REGISTER_INVALID_ARGUMENT:",
          "a plugin must be an object literal or a function returning an object literal",
          "with keys such as `name`, `required` and `hooks`,",
          'got "abc" instead.',
        ].join(" "),
      );
    });

    it("when hooks is neither a function nor a object literal", function () {
      (() =>
        plugandplay().register({ hooks: { "my:hook": "ohno" } })).should.throw(
        [
          "PLUGINS_HOOK_INVALID_HANDLER:",
          "no hook handler function could be found,",
          "a hook must be defined as a function or as an object with an handler property,",
          'got "ohno" instead.',
        ].join(" "),
      );
    });

    it("when require not a string or an array", function () {
      (() => plugandplay().register({ require: true })).should.throw(
        [
          "PLUGINS_REGISTER_INVALID_REQUIRE:",
          "the `require` property must be a string or an array,",
          "got true.",
        ].join(" "),
      );
    });
  });
});
