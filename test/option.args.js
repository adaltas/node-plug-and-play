import { plugandplay } from "../lib/index.js";

describe("option.args", function () {
  it("with option.plugin", function () {
    plugandplay({
      args: ["a", "b"],
      plugins: [
        (a, b) => ({
          hooks: { "my:hook": () => [a, b] },
        }),
      ],
    })
      // Test the registered hooks
      .get({ name: "my:hook" })
      .map((hook) => hook.handler.call())
      .should.eql([["a", "b"]]);
  });

  it("with register", function () {
    plugandplay({
      args: ["a", "b"],
    })
      .register((a, b) => ({
        hooks: { "my:hook": () => [a, b] },
      }))
      // Test the registered hooks
      .get({ name: "my:hook" })
      .map((hook) => hook.handler.call())
      .should.eql([["a", "b"]]);
  });
});
