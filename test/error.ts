import error, { PlugableError } from "../src/error.js";

// https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
declare module "../src/error.js" {
  interface PlugableError {
    a_key: string;
    b_key: string;
  }
}
describe("plugandplay.error", function () {
  it("join code with messsage", function () {
    error("CATCH_ME", "catch me").message.should.eql("CATCH_ME: catch me");
  });

  it("merge multiple context", function () {
    // class PlugableError {
    //   public a_key: string;
    //   public b_key: string;
    // }
    const err: PlugableError = error(
      "CATCH_ME",
      "catch me",
      { a_key: "a value" },
      { b_key: "b value" },
    );
    err.a_key.should.eql("a value");
    err.b_key.should.eql("b value");
  });
});
