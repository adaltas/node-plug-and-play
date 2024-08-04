import { plugandplay } from "../src/index.js";

describe("plugandplay.register", function () {
  it("register an object", function () {
    plugandplay()
      .register({
        hooks: {
          "my:hook": () => 1,
        },
      })
      .get({ name: "my:hook" })
      .map((hook) => hook.handler(undefined, () => {}))
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
      .map((hook) => hook.handler(undefined, () => {}))
      .should.eql([1]);
  });
});
