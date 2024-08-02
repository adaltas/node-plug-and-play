import { plugandplay } from "../lib/index.js";

describe("option.chain", function () {
  it("with option.plugin", async function () {
    await (function () {
      const engine = {};
      engine.plugins = plugandplay({
        chain: engine,
      });
      engine.chain = () => engine;
      return engine;
    })()
      .plugins.register({
        hooks: { "my:hook": (args) => ++args.count },
      })
      .chain()
      .plugins.register({
        hooks: { "my:hook": (args) => ++args.count },
      })
      .chain()
      .plugins.call({
        name: "my:hook",
        args: { count: 0 },
        handler: (args) => ++args.count,
      })
      .should.finally.eql(3);
  });
});
