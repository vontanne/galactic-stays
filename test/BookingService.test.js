import cds from "@sap/cds";

import { auth, insertBooking, isoDate, seed } from "./helpers.js";

const { GET, POST, PATCH, DELETE, expect, data, defaults } = cds.test(
  import.meta.dirname + "/..",
);
defaults.auth = { username: "anakin", password: "anakin" };

const { UPDATE } = cds.ql;

const bookings = "/odata/v4/booking/Bookings";
const reviews = "/odata/v4/booking/Reviews";
const anakinsMosEspaReview = `${reviews}(ID=${seed.reviews.anakinMosEspa},IsActiveEntity=true)`;

describe("BookingService OData APIs", () => {
  beforeEach(data.reset);

  describe("creating a booking", () => {
    it("calculates price, hotel times and payment deadline on the server", async () => {
      const requestedAt = Date.now();

      const { status, data: booking } = await POST(
        bookings,
        newBooking({ checkInDate: isoDate(10), checkOutDate: isoDate(13) }),
      );

      expect(status).to.equal(201);
      expect(booking).to.containSubset({
        traveler_ID: seed.travelers.anakin,
        checkInTime: "14:00:00",
        checkOutTime: "11:00:00",
        nightlyRate: "450.00",
        totalAmount: "1350.00",
        currency_code: "GCR",
        status: "AwaitingPayment",
        paymentStatus: "Unpaid",
      });
      expect(minutesSince(requestedAt, booking.paymentExpiresAt)).to.be.within(
        14.9,
        15.1,
      );
    });

    it("ignores price, status and traveler sent by the client", async () => {
      const { data: booking } = await POST(
        bookings,
        newBooking({
          traveler_ID: cds.utils.uuid(),
          nightlyRate: "1.00",
          totalAmount: "1.00",
          status: "Confirmed",
          paymentStatus: "Paid",
        }),
      );

      expect(booking).to.containSubset({
        traveler_ID: seed.travelers.anakin,
        nightlyRate: "450.00",
        totalAmount: "900.00",
        status: "AwaitingPayment",
        paymentStatus: "Unpaid",
      });
    });

    it("accepts a check-in date of today", async () => {
      const { status } = await POST(
        bookings,
        newBooking({ checkInDate: isoDate(0), checkOutDate: isoDate(1) }),
      );

      expect(status).to.equal(201);
    });

    it("rejects a check-in date in the past", async () => {
      const error = await POST(
        bookings,
        newBooking({ checkInDate: isoDate(-1), checkOutDate: isoDate(1) }),
      ).catch((error) => error);

      expect(error).to.containSubset({
        status: 400,
        code: "CHECK_IN_DATE_IN_PAST",
        target: "checkInDate",
      });
    });

    it("rejects a check-out date that is not after check-in", async () => {
      const error = await POST(
        bookings,
        newBooking({ checkInDate: isoDate(10), checkOutDate: isoDate(10) }),
      ).catch((error) => error);

      expect(error).to.containSubset({
        status: 400,
        code: "CHECK_OUT_AFTER_CHECK_IN",
        target: "checkOutDate",
      });
    });

    it("accepts 30 nights and rejects 31", async () => {
      const { status } = await POST(
        bookings,
        newBooking({ checkInDate: isoDate(10), checkOutDate: isoDate(40) }),
      );
      const error = await POST(
        bookings,
        newBooking({ checkInDate: isoDate(50), checkOutDate: isoDate(81) }),
      ).catch((error) => error);

      expect(status).to.equal(201);
      expect(error).to.containSubset({
        status: 400,
        code: "MAXIMUM_STAY_EXCEEDED",
        target: "checkOutDate",
      });
    });

    it("rejects impossible and malformed dates", async () => {
      const impossibleCheckIn = await POST(
        bookings,
        newBooking({ checkInDate: "2027-02-30", checkOutDate: "2027-03-02" }),
      ).catch((error) => error);
      const impossibleCheckOut = await POST(
        bookings,
        newBooking({ checkInDate: "2027-02-27", checkOutDate: "2027-02-30" }),
      ).catch((error) => error);
      const malformedCheckIn = await POST(
        bookings,
        newBooking({ checkInDate: "x" }),
      ).catch((error) => error);

      expect(impossibleCheckIn).to.containSubset({
        status: 400,
        code: "INVALID_CHECK_IN_DATE",
      });
      expect(impossibleCheckOut).to.containSubset({
        status: 400,
        code: "INVALID_CHECK_OUT_DATE",
      });
      expect(malformedCheckIn).to.containSubset({
        status: 400,
        code: "ASSERT_DATA_TYPE",
      });
    });

    it("rejects more guests than the room holds", async () => {
      const error = await POST(bookings, newBooking({ guestCount: 3 })).catch(
        (error) => error,
      );

      expect(error).to.containSubset({
        status: 400,
        code: "GUEST_COUNT_EXCEEDS_CAPACITY",
        target: "guestCount",
      });
    });

    it("rejects a fractional guest count", async () => {
      const error = await POST(bookings, newBooking({ guestCount: 1.5 })).catch(
        (error) => error,
      );

      expect(error).to.containSubset({
        status: 400,
        code: "WHOLE_NUMBER_REQUIRED",
        target: "guestCount",
      });
    });

    it("rejects unknown rooms and rooms that are not offered", async () => {
      await UPDATE("galactic.stays.Hotels")
        .set({ isActive: false })
        .where({ ID: seed.hotels.theedRoyalHotel });
      await UPDATE("galactic.stays.Planets")
        .set({ isActive: false })
        .where({ ID: seed.planets.coruscant });

      for (const roomId of [
        cds.utils.uuid(),
        seed.rooms.mosEspa201,
        seed.rooms.theed101,
        seed.rooms.galacticCity101,
      ]) {
        const error = await POST(
          bookings,
          newBooking({ room_ID: roomId, guestCount: 1 }),
        ).catch((error) => error);

        expect(error).to.containSubset({
          status: 400,
          code: "INVALID_ROOM",
          target: "room_ID",
        });
      }
    });

    it("rejects a room that is already booked for overlapping dates", async () => {
      await POST(
        bookings,
        newBooking({ checkInDate: isoDate(10), checkOutDate: isoDate(13) }),
      );

      const error = await POST(
        bookings,
        newBooking({ checkInDate: isoDate(12), checkOutDate: isoDate(14) }),
      ).catch((error) => error);

      expect(error).to.containSubset({
        status: 409,
        code: "ROOM_NOT_AVAILABLE",
        target: "room_ID",
      });
    });

    it("lets stays meet on a check-out and check-in day", async () => {
      await POST(
        bookings,
        newBooking({ checkInDate: isoDate(10), checkOutDate: isoDate(13) }),
      );

      const { status: stayAfter } = await POST(
        bookings,
        newBooking({ checkInDate: isoDate(13), checkOutDate: isoDate(15) }),
      );
      const { status: stayBefore } = await POST(
        bookings,
        newBooking({ checkInDate: isoDate(7), checkOutDate: isoDate(10) }),
      );

      expect(stayAfter).to.equal(201);
      expect(stayBefore).to.equal(201);
    });

    it("keeps a paid booking blocking its room but not other rooms", async () => {
      await insertBooking({
        checkInDate: isoDate(10),
        checkOutDate: isoDate(13),
      });

      const error = await POST(
        bookings,
        newBooking({ checkInDate: isoDate(11), checkOutDate: isoDate(12) }),
      ).catch((error) => error);
      const { status: otherRoom } = await POST(
        bookings,
        newBooking({
          room_ID: seed.rooms.galacticCity501,
          checkInDate: isoDate(11),
          checkOutDate: isoDate(12),
        }),
      );

      expect(error).to.containSubset({
        status: 409,
        code: "ROOM_NOT_AVAILABLE",
        target: "room_ID",
      });
      expect(otherRoom).to.equal(201);
    });

    it("frees the room when a booking is cancelled", async () => {
      const bookingId = await createBooking();
      await runAction(bookingId, "cancel");

      const { status } = await POST(bookings, newBooking());

      expect(status).to.equal(201);
    });

    it("does not let a lapsed payment hold block the room", async () => {
      await insertBooking({
        ...lapsedPaymentHold(),
        checkInDate: isoDate(10),
        checkOutDate: isoDate(13),
      });

      const { status } = await POST(
        bookings,
        newBooking({ checkInDate: isoDate(10), checkOutDate: isoDate(13) }),
      );

      expect(status).to.equal(201);
    });

    it("requires a traveler profile", async () => {
      const error = await POST(bookings, newBooking(), auth("padme")).catch(
        (error) => error,
      );

      expect(error).to.containSubset({
        status: 409,
        code: "TRAVELER_PROFILE_REQUIRED",
      });
    });

    it("rejects bookings by an inactive traveler", async () => {
      await UPDATE("galactic.stays.Travelers")
        .set({ isActive: false })
        .where({ ID: seed.travelers.anakin });

      const error = await POST(bookings, newBooking()).catch((error) => error);

      expect(error).to.containSubset({
        status: 403,
        code: "TRAVELER_INACTIVE",
      });
    });

    it("lists only the bookings of the logged-in traveler", async () => {
      const { data: anakinsBookings } = await GET(`${bookings}?$select=ID`);
      const { data: padmesBookings } = await GET(
        `${bookings}?$select=ID`,
        auth("padme"),
      );

      expect(anakinsBookings.value).to.have.length(5);
      expect(padmesBookings.value).to.have.length(0);
    });
  });

  describe("paying a booking", () => {
    it("confirms a booking within the payment window", async () => {
      const bookingId = await createBooking();

      const { data: booking } = await runAction(bookingId, "pay");

      expect(booking).to.containSubset({
        status: "Confirmed",
        paymentStatus: "Paid",
      });
      expect(booking.paidAt).to.be.a("string");
    });

    it("rejects a second payment", async () => {
      const bookingId = await createBooking();
      await runAction(bookingId, "pay");

      const error = await runAction(bookingId, "pay").catch((error) => error);

      expect(error).to.containSubset({
        status: 409,
        code: "BOOKING_ALREADY_PAID",
      });
    });

    it("rejects payment after the deadline, even before the booking is marked expired", async () => {
      const bookingId = await insertBooking(lapsedPaymentHold());

      const error = await runAction(bookingId, "pay").catch((error) => error);

      expect(error).to.containSubset({
        status: 409,
        code: "PAYMENT_WINDOW_EXPIRED",
      });
    });

    it("rejects payment of expired and cancelled bookings", async () => {
      const expiredBooking = await runAction(seed.bookings.B5, "pay").catch(
        (error) => error,
      );
      const cancelledBooking = await runAction(seed.bookings.B4, "pay").catch(
        (error) => error,
      );

      expect(expiredBooking).to.containSubset({
        status: 409,
        code: "PAYMENT_WINDOW_EXPIRED",
      });
      expect(cancelledBooking).to.containSubset({
        status: 409,
        code: "BOOKING_NOT_PAYABLE",
      });
    });
  });

  describe("cancelling a booking", () => {
    it("cancels an unpaid booking within the payment window without a fee", async () => {
      const bookingId = await createBooking();

      const { data: booking } = await runAction(bookingId, "cancel");

      expect(booking).to.containSubset({
        status: "Cancelled",
        paymentStatus: "Unpaid",
        refundAmount: null,
        cancellationFee: null,
      });
      expect(booking.cancelledAt).to.be.a("string");
    });

    it("refunds in full 3 or more days before check-in", async () => {
      const bookingId = await createPaidBooking({
        checkInDate: isoDate(3),
        checkOutDate: isoDate(5),
      });

      const { data: booking } = await runAction(bookingId, "cancel");

      expect(booking).to.containSubset({
        status: "Cancelled",
        paymentStatus: "Refunded",
        refundAmount: "900.00",
        cancellationFee: "0.00",
      });
    });

    it("keeps a 10% fee 1 or 2 days before check-in", async () => {
      const twoDaysAhead = await createPaidBooking({
        checkInDate: isoDate(2),
        checkOutDate: isoDate(4),
      });
      const oneDayAhead = await createPaidBooking({
        room_ID: seed.rooms.galacticCity501,
        checkInDate: isoDate(1),
        checkOutDate: isoDate(2),
      });

      const { data: twoDaysBooking } = await runAction(twoDaysAhead, "cancel");
      const { data: oneDayBooking } = await runAction(oneDayAhead, "cancel");

      expect(twoDaysBooking).to.containSubset({
        paymentStatus: "PartiallyRefunded",
        cancellationFee: "90.00",
        refundAmount: "810.00",
      });
      expect(oneDayBooking).to.containSubset({
        paymentStatus: "PartiallyRefunded",
        cancellationFee: "250.00",
        refundAmount: "2250.00",
      });
    });

    it("rejects cancelling a paid booking on the check-in day", async () => {
      const bookingId = await createPaidBooking({
        checkInDate: isoDate(0),
        checkOutDate: isoDate(1),
      });

      const error = await runAction(bookingId, "cancel").catch(
        (error) => error,
      );

      expect(error).to.containSubset({
        status: 409,
        code: "CANCELLATION_PERIOD_ENDED",
      });
    });

    it("rejects cancelling an unpaid booking after the payment deadline", async () => {
      const bookingId = await insertBooking(lapsedPaymentHold());

      const error = await runAction(bookingId, "cancel").catch(
        (error) => error,
      );

      expect(error).to.containSubset({
        status: 409,
        code: "PAYMENT_WINDOW_EXPIRED",
      });
    });

    it("rejects cancelling cancelled, expired and completed bookings", async () => {
      const cancelled = await runAction(seed.bookings.B4, "cancel").catch(
        (error) => error,
      );
      const expired = await runAction(seed.bookings.B5, "cancel").catch(
        (error) => error,
      );
      const completed = await runAction(seed.bookings.B2, "cancel").catch(
        (error) => error,
      );

      expect(cancelled).to.containSubset({
        status: 409,
        code: "BOOKING_ALREADY_CANCELLED",
      });
      expect(expired).to.containSubset({
        status: 409,
        code: "PAYMENT_WINDOW_EXPIRED",
      });
      expect(completed).to.containSubset({
        status: 409,
        code: "BOOKING_NOT_CANCELLABLE",
      });
    });
  });

  describe("reviewing a hotel", () => {
    it("lets a traveler review a hotel after a completed stay", async () => {
      await UPDATE("galactic.stays.Bookings")
        .set({ status: "Completed" })
        .where({ ID: seed.bookings.B1 });

      const { status, data: review } = await POST(
        reviews,
        newReview({
          hotel_ID: seed.hotels.galacticCityHotel,
          comment: "  Great view of the Senate  ",
        }),
      );

      expect(status).to.equal(201);
      expect(review).to.containSubset({
        traveler_ID: seed.travelers.anakin,
        rating: 5,
        comment: "Great view of the Senate",
      });
    });

    it("requires a completed stay at the hotel", async () => {
      const error = await POST(
        reviews,
        newReview({ hotel_ID: seed.hotels.theedRoyalHotel }),
      ).catch((error) => error);

      expect(error).to.containSubset({
        status: 409,
        code: "COMPLETED_STAY_REQUIRED",
        target: "hotel_ID",
      });
    });

    it("requires a traveler profile to review a hotel", async () => {
      const error = await POST(
        reviews,
        newReview({ hotel_ID: seed.hotels.mosEspaGrand }),
        auth("padme"),
      ).catch((error) => error);

      expect(error).to.containSubset({
        status: 409,
        code: "TRAVELER_PROFILE_REQUIRED",
      });
    });

    it("rejects a review for an inactive hotel", async () => {
      await UPDATE("galactic.stays.Bookings")
        .set({ status: "Completed" })
        .where({ ID: seed.bookings.B1 });
      await UPDATE("galactic.stays.Hotels")
        .set({ isActive: false })
        .where({ ID: seed.hotels.galacticCityHotel });

      const error = await POST(
        reviews,
        newReview({ hotel_ID: seed.hotels.galacticCityHotel }),
      ).catch((error) => error);

      expect(error).to.containSubset({
        status: 409,
        code: "HOTEL_INACTIVE",
        target: "hotel_ID",
      });
    });

    it("rejects a review for a hotel on an inactive planet", async () => {
      await UPDATE("galactic.stays.Bookings")
        .set({ status: "Completed" })
        .where({ ID: seed.bookings.B1 });
      await UPDATE("galactic.stays.Planets")
        .set({ isActive: false })
        .where({ ID: seed.planets.coruscant });

      const error = await POST(
        reviews,
        newReview({ hotel_ID: seed.hotels.galacticCityHotel }),
      ).catch((error) => error);

      expect(error).to.containSubset({
        status: 409,
        code: "HOTEL_INACTIVE",
        target: "hotel_ID",
      });
    });

    it("still lets the author edit a review of a hotel that became inactive", async () => {
      await UPDATE("galactic.stays.Hotels")
        .set({ isActive: false })
        .where({ ID: seed.hotels.mosEspaGrand });

      const { data: review } = await PATCH(anakinsMosEspaReview, { rating: 5 });

      expect(review.rating).to.equal(5);
    });

    it("allows one review per traveler and hotel", async () => {
      const error = await POST(
        reviews,
        newReview({ hotel_ID: seed.hotels.mosEspaGrand }),
      ).catch((error) => error);

      expect(error).to.containSubset({
        status: 409,
        code: "REVIEW_ALREADY_EXISTS",
        target: "hotel_ID",
      });
    });

    it("lets the author change the rating and clear the comment", async () => {
      const { data: review } = await PATCH(anakinsMosEspaReview, {
        rating: 5,
        comment: "   ",
      });

      expect(review).to.containSubset({ rating: 5, comment: null });
    });

    it("keeps the reviewed hotel unchanged", async () => {
      await PATCH(anakinsMosEspaReview, {
        hotel_ID: seed.hotels.theedRoyalHotel,
      });

      const { data: review } = await GET(anakinsMosEspaReview);

      expect(review.hotel_ID).to.equal(seed.hotels.mosEspaGrand);
    });

    it("accepts only ratings from 1 to 5", async () => {
      for (const rating of [0, 6]) {
        const error = await PATCH(anakinsMosEspaReview, { rating }).catch(
          (error) => error,
        );

        expect(error).to.containSubset({
          status: 400,
          code: "ASSERT_RANGE",
          target: "rating",
        });
      }
    });

    it("accepts only whole-number ratings", async () => {
      const error = await PATCH(anakinsMosEspaReview, { rating: 4.5 }).catch(
        (error) => error,
      );

      expect(error).to.containSubset({
        status: 400,
        code: "WHOLE_NUMBER_REQUIRED",
        target: "rating",
      });
    });

    it("lets the author delete a review and review the hotel again", async () => {
      const { status: deleteStatus } = await DELETE(anakinsMosEspaReview);
      const { status: createStatus } = await POST(
        reviews,
        newReview({ hotel_ID: seed.hotels.mosEspaGrand }),
      );

      expect(deleteStatus).to.equal(204);
      expect(createStatus).to.equal(201);
    });

    it("lets an inactive traveler delete but not edit a review", async () => {
      await UPDATE("galactic.stays.Travelers")
        .set({ isActive: false })
        .where({ ID: seed.travelers.anakin });

      const editError = await PATCH(anakinsMosEspaReview, { rating: 5 }).catch(
        (error) => error,
      );
      const { status: deleteStatus } = await DELETE(anakinsMosEspaReview);

      expect(editError).to.containSubset({
        status: 403,
        code: "TRAVELER_INACTIVE",
      });
      expect(deleteStatus).to.equal(204);
    });

    it("updates the hotel rating shown in the catalog", async () => {
      await PATCH(anakinsMosEspaReview, { rating: 2 });

      const { data: hotel } = await GET(
        `/odata/v4/catalog/Hotels(${seed.hotels.mosEspaGrand})?$select=averageRating,reviewCount`,
      );

      expect(hotel).to.containSubset({ averageRating: "2.0", reviewCount: 1 });
    });
  });
});

function newBooking(values) {
  return {
    room_ID: seed.rooms.galacticCity101,
    checkInDate: isoDate(10),
    checkOutDate: isoDate(12),
    guestCount: 2,
    IsActiveEntity: true,
    ...values,
  };
}

function newReview(values) {
  return { rating: 5, IsActiveEntity: true, ...values };
}

async function createBooking(values) {
  const { data: booking } = await POST(bookings, newBooking(values));

  return booking.ID;
}

async function createPaidBooking(values) {
  const bookingId = await createBooking(values);
  await runAction(bookingId, "pay");

  return bookingId;
}

function runAction(bookingId, action) {
  return POST(
    `${bookings}(ID=${bookingId},IsActiveEntity=true)/BookingService.${action}`,
    {},
  );
}

function lapsedPaymentHold() {
  return {
    status: "AwaitingPayment",
    paymentStatus: "Unpaid",
    paymentExpiresAt: new Date(Date.now() - 60_000).toISOString(),
  };
}

function minutesSince(startTime, timestamp) {
  return (new Date(timestamp).getTime() - startTime) / 60_000;
}
