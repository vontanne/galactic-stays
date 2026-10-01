import cds from "@sap/cds";

import {
  calculatePercentageAmount,
  multiplyAmount,
  subtractAmounts,
} from "../srv/booking/money.js";

const { expect } = cds.test;

describe("Money calculations", () => {
  describe("multiplyAmount", () => {
    it("multiplies a nightly rate by the number of nights", () => {
      expect(multiplyAmount("450.00", 3)).to.equal("1350.00");
      expect(multiplyAmount("2500.00", 2)).to.equal("5000.00");
    });

    it("accepts amounts with fewer than two decimals", () => {
      expect(multiplyAmount("120", 4)).to.equal("480.00");
      expect(multiplyAmount("0.5", 3)).to.equal("1.50");
    });

    it("rejects a negative or fractional multiplier", () => {
      expect(() => multiplyAmount("10.00", -1)).to.throw(RangeError);
      expect(() => multiplyAmount("10.00", 1.5)).to.throw(RangeError);
    });
  });

  describe("calculatePercentageAmount", () => {
    it("calculates the 10% late cancellation fee", () => {
      expect(calculatePercentageAmount("900.00", 10)).to.equal("90.00");
      expect(calculatePercentageAmount("5000.00", 10)).to.equal("500.00");
    });

    it("rounds half up to whole minor units", () => {
      expect(calculatePercentageAmount("0.05", 10)).to.equal("0.01");
      expect(calculatePercentageAmount("0.04", 10)).to.equal("0.00");
    });

    it("rejects percentages outside 0 to 100", () => {
      expect(() => calculatePercentageAmount("10.00", 101)).to.throw(
        RangeError,
      );
      expect(() => calculatePercentageAmount("10.00", -1)).to.throw(RangeError);
    });
  });

  describe("subtractAmounts", () => {
    it("subtracts the cancellation fee from the total", () => {
      expect(subtractAmounts("900.00", "90.00")).to.equal("810.00");
      expect(subtractAmounts("5000.00", "500.00")).to.equal("4500.00");
    });

    it("never produces a negative amount", () => {
      expect(subtractAmounts("10.00", "10.00")).to.equal("0.00");
      expect(() => subtractAmounts("10.00", "10.01")).to.throw(RangeError);
    });
  });

  it("rejects malformed amounts", () => {
    for (const amount of ["12.345", "-1.00", "abc", ""]) {
      expect(() => multiplyAmount(amount, 1)).to.throw(TypeError);
    }
  });
});
