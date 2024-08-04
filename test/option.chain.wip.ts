import { plugandplay } from "../src/index.js";

describe("option.args", function () {
  it.skip("with option.plugin", async function () {
    class Engine {
      plugins = plugandplay<{ "my:hook": { count: number } }, Engine>({
        chain: this,
      });
      chain = () => this;
    }
    const e = new Engine();
    e.plugins
      .register({
        hooks: { "my:hook": () => {} },
      })
      // .chain()
      // .plugins.register({
      //   hooks: { "my:hook": () => {} },
      // });
  });
});
