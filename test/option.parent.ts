import { plugandplay } from "../src/index.js";

describe("option.parent", function () {
  it("call child then parent hooks", function () {
    plugandplay<{
      "my:hook": {}
    }>({
      parent: plugandplay<{
        "my:hook": {}
      }>().register({ hooks: { "my:hook": () => 3 } }),
    })
      .register({ hooks: { "my:hook": () => 1 } })
      .register({ hooks: { "my:hook": () => 2 } })
      .get({ name: "my:hook" })
      .map((hook) => hook.handler({}, () => {}))
      .should.eql([1, 2, 3]);
  });
});
