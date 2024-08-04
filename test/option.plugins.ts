import { plugandplay } from "../src/index.js";

describe("plugandplay.option.plugin", function () {
  it("instantiate with plugin objects", function () {
    plugandplay({
      plugins: [
        {
          hooks: { "my:hook": () => 1 },
        },
        {
          hooks: { "my:hook": () => 2 },
        },
      ],
    })
      .get({ name: "my:hook" })
      .map((hook) => hook.handler(undefined, () => {}))
      .should.eql([1, 2]);
  });

  it("instantiate with plugin functions", function () {
    plugandplay({
      plugins: [
        () => ({ hooks: { "my:hook": () => 1 } }),
        () => ({ hooks: { "my:hook": () => 2 } }),
      ],
    })
      .get({ name: "my:hook" })
      .map((hook) => hook.handler(undefined, () => {}))
      .should.eql([1, 2]);
  });
});
