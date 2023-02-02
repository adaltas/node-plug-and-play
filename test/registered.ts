import { plugandplay } from "../src/index.js";

describe("plugandplay.registered", function () {
  it("not registered return false", function () {
    plugandplay().registered("module/unregistered").should.be.false();
  });

  it("not registered in parents hierarchy return false", function () {
    plugandplay({
      parent: plugandplay({
        parent: plugandplay(),
      }),
    })
      .registered("module/unregistered")
      .should.be.false();
  });

  it("registered return true", function () {
    plugandplay({
      plugins: [
        {
          name: "module/registered",
          hooks: {}
        },
      ],
    })
      .registered("module/registered")
      .should.be.true();
  });

  it("registered in parents hierarchy return true", function () {
    plugandplay({
      parent: plugandplay({
        parent: plugandplay({
          plugins: [
            {
              name: "module/registered",
              hooks: {}
            },
          ],
        }),
      }),
    })
      .registered("module/registered")
      .should.be.true();
  });
});
