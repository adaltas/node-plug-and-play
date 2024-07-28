import { plugandplay } from "../lib/index.js";

describe("option.parent", function () {
  it("call child then parent hooks", function () {
    plugandplay({
      parent: plugandplay().register({ hooks: { "my:hook": () => 3 } }),
    })
      .register({ hooks: { "my:hook": () => 1 } })
      .register({ hooks: { "my:hook": () => 2 } })
      .get({ name: "my:hook" })
      .map((hook) => hook.handler.call())
      .should.eql([1, 2, 3]);
  });
});
