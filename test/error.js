import error from "../lib/error.js";

describe("plugandplay.error", function () {
  it("join code with messsage", function () {
    error("CATCH_ME", "catch me").message.should.eql("CATCH_ME: catch me");
  });

  it("merge multiple context", function () {
    const err = error(
      "CATCH_ME",
      "catch me",
      { a_key: "a value" },
      { b_key: "b value" },
    );
    err.a_key.should.eql("a value");
    err.b_key.should.eql("b value");
  });
});
