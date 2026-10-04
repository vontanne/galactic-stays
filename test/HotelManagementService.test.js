import cds from "@sap/cds";

import { auth, insertBooking, isoDate, seed } from "./helpers.js";

const { GET, POST, PATCH, DELETE, expect, data, defaults } = cds.test(
  import.meta.dirname + "/..",
);
defaults.auth = { username: "lando", password: "lando" };

const { INSERT, UPDATE } = cds.ql;

const hotelManagement = "/odata/v4/hotel-management";
const bookings = `${hotelManagement}/Bookings`;
const rooms = `${hotelManagement}/Rooms`;
const landosRoom = `${rooms}(ID=${seed.rooms.galacticCity101},IsActiveEntity=true)`;

describe("HotelManagementService OData APIs", () => {
  beforeEach(data.reset);

  describe("seeing the own hotel", () => {
    it("shows managers only the bookings of their own hotel", async () => {
      const { data: landosBookings } = await GET(`${bookings}?$select=ID`);
      const { data: bobasBookings } = await GET(
        `${bookings}?$select=ID`,
        auth("boba"),
      );
      const { data: allBookings } = await GET(
        `${bookings}?$select=ID`,
        auth("admin"),
      );

      expect(ids(landosBookings.value)).to.have.members([
        seed.bookings.B1,
        seed.bookings.B4,
      ]);
      expect(ids(bobasBookings.value)).to.have.members([seed.bookings.B2]);
      expect(allBookings.value).to.have.length(5);
    });

    it("shows managers only the guests of their own hotel", async () => {
      const leiaId = cds.utils.uuid();
      await INSERT.into("galactic.stays.Travelers").entries({
        ID: leiaId,
        userId: "leia",
        firstName: "Leia",
        lastName: "Organa",
        dateOfBirth: "1990-01-01",
        species: "Human",
        birthPlanet_ID: seed.planets.naboo,
      });
      await insertBooking({
        traveler_ID: leiaId,
        room_ID: seed.rooms.mosEspa101,
      });

      const { data: landosGuests } = await GET(
        `${hotelManagement}/Travelers?$select=ID`,
      );
      const { data: bobasGuests } = await GET(
        `${hotelManagement}/Travelers?$select=ID`,
        auth("boba"),
      );

      expect(ids(landosGuests.value)).to.have.members([seed.travelers.anakin]);
      expect(ids(bobasGuests.value)).to.have.members([
        seed.travelers.anakin,
        leiaId,
      ]);
    });

    it("shows guests with their names only", async () => {
      const { data: guests } = await GET(`${hotelManagement}/Travelers`);

      expect(guests.value).to.have.length(1);
      expect(guests.value[0]).to.containSubset({
        firstName: "Anakin",
        lastName: "Skywalker",
      });
      expect(guests.value[0]).to.not.have.any.keys(
        "userId",
        "dateOfBirth",
        "birthPlanet_ID",
        "isActive",
      );
    });

    it("shows managers their own hotel and its rooms", async () => {
      const { data: hotels } = await GET(
        `${hotelManagement}/Hotels?$select=ID`,
      );
      const { data: hotelRooms } = await GET(`${rooms}?$select=hotel_ID`);

      expect(ids(hotels.value)).to.have.members([
        seed.hotels.galacticCityHotel,
      ]);
      expect(hotelRooms.value).to.have.length(2);
      expect(
        hotelRooms.value.every(
          (room) => room.hotel_ID === seed.hotels.galacticCityHotel,
        ),
      ).to.equal(true);
    });

    it("shows managers the reviews of their own hotel", async () => {
      const { data: landosReviews } = await GET(`${hotelManagement}/Reviews`);
      const { data: bobasReviews } = await GET(
        `${hotelManagement}/Reviews`,
        auth("boba"),
      );

      expect(landosReviews.value).to.have.length(0);
      expect(bobasReviews.value).to.have.length(1);
      expect(bobasReviews.value).to.containSubset([
        { rating: 4, authorName: "Anakin" },
      ]);
    });
  });

  describe("cancelling a booking as the hotel", () => {
    it("cancels an unpaid booking within the payment window", async () => {
      const bookingId = await insertBooking(unpaidHold(10));

      const { data: booking } = await runAction(bookingId, "cancel");

      expect(booking).to.containSubset({
        status: "Cancelled",
        paymentStatus: "Unpaid",
        refundAmount: null,
        cancellationFee: null,
      });
    });

    it("refunds a paid booking in full until the day before check-out", async () => {
      const dayBeforeCheckIn = await insertBooking({
        checkInDate: isoDate(1),
        checkOutDate: isoDate(3),
      });
      const duringStay = await insertBooking({
        room_ID: seed.rooms.galacticCity501,
        checkInDate: isoDate(-1),
        checkOutDate: isoDate(1),
        nightlyRate: "2500.00",
        totalAmount: "5000.00",
      });

      const { data: beforeStay } = await runAction(dayBeforeCheckIn, "cancel");
      const { data: midStay } = await runAction(duringStay, "cancel");

      expect(beforeStay).to.containSubset({
        status: "Cancelled",
        paymentStatus: "Refunded",
        refundAmount: "900.00",
        cancellationFee: "0.00",
      });
      expect(midStay).to.containSubset({
        paymentStatus: "Refunded",
        refundAmount: "5000.00",
        cancellationFee: "0.00",
      });
    });

    it("rejects cancellation on or after the check-out date", async () => {
      const checkOutToday = await insertBooking({
        checkInDate: isoDate(-2),
        checkOutDate: isoDate(0),
      });

      for (const bookingId of [checkOutToday, seed.bookings.B1]) {
        const error = await runAction(bookingId, "cancel").catch(
          (error) => error,
        );

        expect(error).to.containSubset({
          status: 409,
          code: "CANCELLATION_PERIOD_ENDED",
        });
      }
    });

    it("rejects cancelling an unpaid booking after the payment deadline", async () => {
      const bookingId = await insertBooking(unpaidHold(-1));

      const error = await runAction(bookingId, "cancel").catch(
        (error) => error,
      );

      expect(error).to.containSubset({
        status: 409,
        code: "PAYMENT_WINDOW_EXPIRED",
      });
    });

    it("rejects cancelling cancelled, expired and completed bookings", async () => {
      const cancelled = await runAction(
        seed.bookings.B4,
        "cancel",
        "admin",
      ).catch((error) => error);
      const expired = await runAction(
        seed.bookings.B5,
        "cancel",
        "admin",
      ).catch((error) => error);
      const completed = await runAction(
        seed.bookings.B2,
        "cancel",
        "admin",
      ).catch((error) => error);

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

  describe("completing a stay", () => {
    it("completes a paid stay on or after the check-out date", async () => {
      const checkOutToday = await insertBooking({
        checkInDate: isoDate(-2),
        checkOutDate: isoDate(0),
      });

      const { data: pastStay } = await runAction(seed.bookings.B1, "complete");
      const { data: endingStay } = await runAction(checkOutToday, "complete");

      expect(pastStay).to.containSubset({
        status: "Completed",
        paymentStatus: "Paid",
      });
      expect(pastStay.completedAt).to.be.a("string");
      expect(endingStay.status).to.equal("Completed");
    });

    it("rejects completing a stay before the check-out date", async () => {
      const bookingId = await insertBooking({
        checkInDate: isoDate(-1),
        checkOutDate: isoDate(1),
      });

      const error = await runAction(bookingId, "complete").catch(
        (error) => error,
      );

      expect(error).to.containSubset({
        status: 409,
        code: "STAY_NOT_FINISHED",
      });
    });

    it("rejects completing a stay twice", async () => {
      const error = await runAction(seed.bookings.B2, "complete", "boba").catch(
        (error) => error,
      );

      expect(error).to.containSubset({
        status: 409,
        code: "BOOKING_ALREADY_COMPLETED",
      });
    });

    it("completes only confirmed and paid bookings", async () => {
      const unpaid = await insertBooking({
        ...unpaidHold(10),
        checkInDate: isoDate(-2),
        checkOutDate: isoDate(0),
      });

      for (const bookingId of [unpaid, seed.bookings.B4, seed.bookings.B5]) {
        const error = await runAction(bookingId, "complete", "admin").catch(
          (error) => error,
        );

        expect(error).to.containSubset({
          status: 409,
          code: "BOOKING_NOT_COMPLETABLE",
        });
      }
    });

    it("lets the admin complete stays in a hotel without a manager", async () => {
      const { data: booking } = await runAction(
        seed.bookings.B3,
        "complete",
        "admin",
      );

      expect(booking.status).to.equal("Completed");
    });

    it("reports an unknown booking", async () => {
      const error = await runAction(
        cds.utils.uuid(),
        "complete",
        "admin",
      ).catch((error) => error);

      expect(error).to.containSubset({
        status: 404,
        code: "BOOKING_NOT_FOUND",
      });
    });
  });

  describe("managing rooms", () => {
    it("adds a new room to the manager's own hotel", async () => {
      const { status, data: room } = await POST(
        rooms,
        newRoom({ hotel_ID: seed.hotels.mosEspaGrand }),
      );

      expect(status).to.equal(201);
      expect(room).to.containSubset({
        hotel_ID: seed.hotels.galacticCityHotel,
        number: "702",
      });
    });

    it("rejects a new room in an inactive hotel", async () => {
      await UPDATE("galactic.stays.Hotels")
        .set({ isActive: false })
        .where({ ID: seed.hotels.galacticCityHotel });

      const error = await POST(rooms, newRoom()).catch((error) => error);

      expect(error).to.containSubset({ status: 409, code: "HOTEL_INACTIVE" });
    });

    it("rejects a new room in a hotel on an inactive planet", async () => {
      await UPDATE("galactic.stays.Planets")
        .set({ isActive: false })
        .where({ ID: seed.planets.coruscant });

      const error = await POST(rooms, newRoom()).catch((error) => error);

      expect(error).to.containSubset({ status: 409, code: "HOTEL_INACTIVE" });
    });

    it("rejects a fractional room capacity", async () => {
      const error = await POST(rooms, newRoom({ capacity: 2.5 })).catch(
        (error) => error,
      );

      expect(error).to.containSubset({
        status: 400,
        code: "WHOLE_NUMBER_REQUIRED",
        target: "capacity",
      });
    });

    it("trims the room number and rejects one already used in the hotel", async () => {
      for (const number of ["101", " 101 "]) {
        const error = await POST(rooms, newRoom({ number })).catch(
          (error) => error,
        );

        expect(error).to.containSubset({
          status: 409,
          code: "ROOM_NUMBER_EXISTS",
          target: "number",
        });
      }
    });

    it("allows a room number that another hotel already uses", async () => {
      const { status } = await POST(rooms, newRoom({ number: "201" }));

      expect(status).to.equal(201);
    });

    it("changes only the price and availability of a room", async () => {
      const { data: room } = await PATCH(landosRoom, {
        pricePerNight: 500,
        isActive: false,
        number: "999",
        type: "Suite",
        capacity: 12,
        hotel_ID: seed.hotels.mosEspaGrand,
        currency_code: "EUR",
      });

      expect(room).to.containSubset({
        pricePerNight: "500.00",
        isActive: false,
        number: "101",
        type: "Deluxe",
        capacity: 2,
        hotel_ID: seed.hotels.galacticCityHotel,
        currency_code: "GCR",
      });
    });

    it("still lets the manager change prices in an inactive hotel", async () => {
      await UPDATE("galactic.stays.Hotels")
        .set({ isActive: false })
        .where({ ID: seed.hotels.galacticCityHotel });

      const { data: room } = await PATCH(landosRoom, { pricePerNight: 500 });

      expect(room.pricePerNight).to.equal("500.00");
    });

    it("keeps the booked price when the room price changes", async () => {
      const { data: earlierBooking } = await POST(
        "/odata/v4/booking/Bookings",
        newBooking(isoDate(10), isoDate(12)),
        auth("anakin"),
      );

      await PATCH(landosRoom, { pricePerNight: 500 });

      const { data: bookedEarlier } = await GET(
        `${bookings}(${earlierBooking.ID})`,
      );
      const { data: bookedLater } = await POST(
        "/odata/v4/booking/Bookings",
        newBooking(isoDate(20), isoDate(22)),
        auth("anakin"),
      );

      expect(bookedEarlier).to.containSubset({
        nightlyRate: "450.00",
        totalAmount: "900.00",
      });
      expect(bookedLater).to.containSubset({
        nightlyRate: "500.00",
        totalAmount: "1000.00",
      });
    });

    it("does not let managers delete rooms", async () => {
      const error = await DELETE(landosRoom).catch((error) => error);

      expect(error).to.containSubset({ status: 405 });
    });

    it("lets only managers with an assigned hotel add rooms", async () => {
      const adminError = await POST(rooms, newRoom(), auth("admin")).catch(
        (error) => error,
      );

      await DELETE(
        `/odata/v4/admin/HotelManagementAssignments(${seed.assignments.lando})`,
        auth("admin"),
      );
      const unassignedError = await POST(rooms, newRoom()).catch(
        (error) => error,
      );

      expect(adminError).to.containSubset({ status: 403 });
      expect(unassignedError).to.containSubset({
        status: 403,
        code: "HOTEL_NOT_ASSIGNED",
      });
    });
  });
});

function newRoom(values) {
  return {
    number: "702",
    type: "Suite",
    capacity: 4,
    pricePerNight: 900,
    IsActiveEntity: true,
    ...values,
  };
}

function newBooking(checkInDate, checkOutDate) {
  return {
    room_ID: seed.rooms.galacticCity101,
    checkInDate,
    checkOutDate,
    guestCount: 2,
    IsActiveEntity: true,
  };
}

function runAction(bookingId, action, user = "lando") {
  return POST(
    `${bookings}(${bookingId})/HotelManagementService.${action}`,
    {},
    auth(user),
  );
}

function unpaidHold(minutesFromNow) {
  return {
    status: "AwaitingPayment",
    paymentStatus: "Unpaid",
    paymentExpiresAt: new Date(
      Date.now() + minutesFromNow * 60_000,
    ).toISOString(),
  };
}

function ids(rows) {
  return rows.map((row) => row.ID);
}
