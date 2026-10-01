import cds from "@sap/cds";

import {
  addMinutes,
  calculateCalendarDaysBetween,
  isDeadlineReached,
  parseDateOnly,
  toUtcCalendarDate,
} from "../srv/booking/date-time.js";

const { expect } = cds.test;

describe("Date and time helpers", () => {
  describe("parseDateOnly", () => {
    it("parses a real ISO date as midnight UTC", () => {
      expect(parseDateOnly("2026-10-20").toISOString()).to.equal(
        "2026-10-20T00:00:00.000Z",
      );
    });

    it("accepts 29 February in a leap year", () => {
      expect(parseDateOnly("2028-02-29").toISOString()).to.equal(
        "2028-02-29T00:00:00.000Z",
      );
    });

    it("rejects impossible calendar dates", () => {
      for (const value of [
        "2001-02-30",
        "2026-02-29",
        "2026-04-31",
        "2026-13-01",
      ]) {
        expect(parseDateOnly(value)).to.equal(undefined);
      }
    });

    it("rejects values that are not YYYY-MM-DD strings", () => {
      for (const value of [
        "2026-1-01",
        "20261001",
        "2026-10-01T00:00:00Z",
        "",
        null,
        20261001,
      ]) {
        expect(parseDateOnly(value)).to.equal(undefined);
      }
    });
  });

  it("toUtcCalendarDate drops the time of day in UTC", () => {
    const lateEvening = new Date("2026-10-01T23:59:59.999Z");

    expect(toUtcCalendarDate(lateEvening).toISOString()).to.equal(
      "2026-10-01T00:00:00.000Z",
    );
  });

  it("calculateCalendarDaysBetween counts calendar days across month ends", () => {
    const days = (start, end) =>
      calculateCalendarDaysBetween(parseDateOnly(start), parseDateOnly(end));

    expect(days("2026-10-20", "2026-10-23")).to.equal(3);
    expect(days("2028-02-28", "2028-03-01")).to.equal(2);
    expect(days("2026-10-23", "2026-10-20")).to.equal(-3);
  });

  it("addMinutes adds the 15-minute payment hold", () => {
    const createdAt = new Date("2026-10-01T10:00:00.000Z");

    expect(addMinutes(createdAt, 15).toISOString()).to.equal(
      "2026-10-01T10:15:00.000Z",
    );
  });

  describe("isDeadlineReached", () => {
    const now = new Date("2026-10-01T10:15:00.000Z");

    it("is false before the deadline", () => {
      expect(isDeadlineReached("2026-10-01T10:15:00.001Z", now)).to.equal(
        false,
      );
    });

    it("is true when the deadline equals the current time", () => {
      expect(isDeadlineReached("2026-10-01T10:15:00.000Z", now)).to.equal(true);
    });

    it("is true after the deadline", () => {
      expect(isDeadlineReached("2026-10-01T10:14:59.999Z", now)).to.equal(true);
    });
  });
});
