import cds from "@sap/cds";

import { auth, insertBooking, isoDate, seed } from "./helpers.js";

const { GET, POST, PATCH, DELETE, expect, data, defaults } = cds.test(
  import.meta.dirname + "/..",
);
defaults.auth = { username: "admin", password: "admin" };

const { SELECT, UPDATE } = cds.ql;

const admin = "/odata/v4/admin";
const planets = `${admin}/Planets`;
const hotels = `${admin}/Hotels`;
const assignments = `${admin}/HotelManagementAssignments`;
const planet = (ID) => `${planets}(ID=${ID},IsActiveEntity=true)`;
const hotel = (ID) => `${hotels}(ID=${ID},IsActiveEntity=true)`;
const room = (ID) => `${admin}/Rooms(ID=${ID},IsActiveEntity=true)`;

describe("AdminService OData APIs", () => {
  beforeEach(data.reset);

  describe("planets", () => {
    it("creates a planet with a trimmed name", async () => {
      const { status, data: created } = await POST(planets, {
        name: " Hoth ",
        IsActiveEntity: true,
      });

      expect(status).to.equal(201);
      expect(created).to.containSubset({ name: "Hoth", isActive: true });
    });

    it("rejects a planet name that exists in any letter case or spacing", async () => {
      for (const name of ["tatooine", " Naboo "]) {
        const error = await POST(planets, { name, IsActiveEntity: true }).catch(
          (error) => error,
        );

        expect(error).to.containSubset({
          status: 409,
          code: "PLANET_NAME_EXISTS",
          target: "name",
        });
      }
    });

    it("lets a planet keep its own name in another letter case", async () => {
      const { data: renamed } = await PATCH(planet(seed.planets.tatooine), {
        name: "TATOOINE",
      });

      expect(renamed.name).to.equal("TATOOINE");
    });

    it("deletes an unused planet", async () => {
      const { data: created } = await POST(planets, {
        name: "Hoth",
        IsActiveEntity: true,
      });

      const { status } = await DELETE(planet(created.ID));

      expect(status).to.equal(204);
    });

    it("rejects deleting a planet that hotels or travelers reference", async () => {
      const { data: kamino } = await POST(planets, {
        name: "Kamino",
        IsActiveEntity: true,
      });
      await UPDATE("galactic.stays.Travelers")
        .set({ birthPlanet_ID: kamino.ID })
        .where({ ID: seed.travelers.anakin });

      for (const planetId of [seed.planets.coruscant, kamino.ID]) {
        const error = await DELETE(planet(planetId)).catch((error) => error);

        expect(error).to.containSubset({ status: 409, code: "PLANET_IN_USE" });
      }
    });

    it("deactivates a planet so that the catalog hides it", async () => {
      await PATCH(planet(seed.planets.naboo), { isActive: false });

      const { data: catalogPlanets } = await GET(
        "/odata/v4/catalog/Planets?$select=name",
      );

      expect(catalogPlanets.value.map((row) => row.name)).to.not.include(
        "Naboo",
      );
    });
  });

  describe("hotels", () => {
    it("creates a hotel with its rooms and trims names and room numbers", async () => {
      const { status, data: created } = await POST(
        hotels,
        newHotel({
          name: " Cloud City Lodge ",
          rooms: [newRoom({ number: " 11 " }), newRoom({ number: "12" })],
        }),
      );

      const { data: stored } = await GET(
        `${hotel(created.ID)}?$expand=rooms($select=number)`,
      );

      expect(status).to.equal(201);
      expect(stored.name).to.equal("Cloud City Lodge");
      expect(stored.rooms.map((row) => row.number)).to.have.members([
        "11",
        "12",
      ]);
    });

    it("requires an active planet", async () => {
      await UPDATE("galactic.stays.Planets")
        .set({ isActive: false })
        .where({ ID: seed.planets.coruscant });

      for (const planetId of [seed.planets.coruscant, cds.utils.uuid()]) {
        const error = await POST(
          hotels,
          newHotel({ planet_ID: planetId }),
        ).catch((error) => error);

        expect(error).to.containSubset({
          status: 400,
          code: "INVALID_PLANET",
          target: "planet_ID",
        });
      }
    });

    it("rejects a hotel name that exists on the same planet", async () => {
      const samePlanet = await POST(
        hotels,
        newHotel({
          name: "galactic city hotel",
          planet_ID: seed.planets.coruscant,
        }),
      ).catch((error) => error);
      const { status: otherPlanet } = await POST(
        hotels,
        newHotel({ name: "Galactic City Hotel" }),
      );

      expect(samePlanet).to.containSubset({
        status: 409,
        code: "HOTEL_NAME_EXISTS",
        target: "name",
      });
      expect(otherPlanet).to.equal(201);
    });

    it("rejects moving a hotel to a planet with a hotel of the same name", async () => {
      const { data: namesake } = await POST(
        hotels,
        newHotel({ name: "Galactic City Hotel" }),
      );

      const error = await PATCH(hotel(namesake.ID), {
        planet_ID: seed.planets.coruscant,
      }).catch((error) => error);

      expect(error).to.containSubset({
        status: 409,
        code: "HOTEL_NAME_EXISTS",
      });
    });

    it("rejects duplicate room numbers within a hotel", async () => {
      const newDuplicates = await POST(
        hotels,
        newHotel({
          rooms: [newRoom({ number: "13" }), newRoom({ number: " 13 " })],
        }),
      ).catch((error) => error);
      const renumbered = await PATCH(hotel(seed.hotels.mosEspaGrand), {
        rooms: [
          { ID: seed.rooms.mosEspa101 },
          { ID: seed.rooms.mosEspa201, number: "101" },
        ],
      }).catch((error) => error);

      for (const error of [newDuplicates, renumbered]) {
        expect(error).to.containSubset({
          status: 409,
          code: "ROOM_NUMBER_EXISTS",
          target: "rooms",
        });
      }
    });

    it("adds and removes rooms through the hotel", async () => {
      await PATCH(hotel(seed.hotels.mosEspaGrand), {
        rooms: [
          { ID: seed.rooms.mosEspa101 },
          { ID: seed.rooms.mosEspa201 },
          newRoom({ number: "102" }),
        ],
      });
      const added = await hotelRoomNumbers(seed.hotels.mosEspaGrand);

      const added102 = await SELECT.one
        .from("galactic.stays.Rooms")
        .columns("ID")
        .where({ hotel_ID: seed.hotels.mosEspaGrand, number: "102" });
      await PATCH(hotel(seed.hotels.mosEspaGrand), {
        rooms: [{ ID: seed.rooms.mosEspa101 }, { ID: added102.ID }],
      });
      const remaining = await hotelRoomNumbers(seed.hotels.mosEspaGrand);

      expect(added).to.have.members(["101", "102", "201"]);
      expect(remaining).to.have.members(["101", "102"]);
    });

    it("keeps rooms that have bookings", async () => {
      const error = await PATCH(hotel(seed.hotels.mosEspaGrand), {
        rooms: [{ ID: seed.rooms.mosEspa201 }],
      }).catch((error) => error);

      expect(error).to.containSubset({
        status: 409,
        code: "ROOM_HAS_BOOKINGS",
        target: "rooms",
      });
    });

    it("rejects a capacity below the guest count of an upcoming booking", async () => {
      await insertBooking({
        room_ID: seed.rooms.galacticCity501,
        guestCount: 6,
        checkInDate: isoDate(5),
        checkOutDate: isoDate(7),
      });

      const error = await PATCH(hotel(seed.hotels.galacticCityHotel), {
        rooms: [
          { ID: seed.rooms.galacticCity101 },
          { ID: seed.rooms.galacticCity501, capacity: 4 },
        ],
      }).catch((error) => error);

      expect(error).to.containSubset({
        status: 409,
        code: "ROOM_CAPACITY_TOO_LOW",
        target: "rooms",
      });
    });

    it("lowers a capacity that only past or cancelled stays exceed", async () => {
      await insertBooking({ status: "Cancelled", paymentStatus: "Refunded" });

      const { status } = await PATCH(hotel(seed.hotels.galacticCityHotel), {
        rooms: [
          { ID: seed.rooms.galacticCity101, capacity: 1 },
          { ID: seed.rooms.galacticCity501 },
        ],
      });

      expect(status).to.equal(200);
    });

    it("rejects a fractional room capacity", async () => {
      const error = await POST(
        hotels,
        newHotel({ rooms: [newRoom({ capacity: 2.5 })] }),
      ).catch((error) => error);

      expect(error).to.containSubset({
        status: 400,
        code: "WHOLE_NUMBER_REQUIRED",
      });
    });

    it("rejects deleting a hotel with bookings", async () => {
      const error = await DELETE(hotel(seed.hotels.galacticCityHotel)).catch(
        (error) => error,
      );

      expect(error).to.containSubset({
        status: 409,
        code: "HOTEL_HAS_BOOKINGS",
      });
    });

    it("deletes a hotel without bookings together with its rooms and manager", async () => {
      const { data: created } = await POST(
        hotels,
        newHotel({ rooms: [newRoom()] }),
      );
      await POST(assignments, { hotel_ID: created.ID, userId: "han" });

      const { status } = await DELETE(hotel(created.ID));

      expect(status).to.equal(204);
      expect(await hotelRoomNumbers(created.ID)).to.have.length(0);
      expect(
        await SELECT.from("galactic.stays.HotelManagementAssignments").where({
          hotel_ID: created.ID,
        }),
      ).to.have.length(0);
    });
  });

  describe("rooms", () => {
    it("changes rooms only through their hotel", async () => {
      const created = await POST(`${admin}/Rooms`, {
        ...newRoom(),
        hotel_ID: seed.hotels.theedRoyalHotel,
        IsActiveEntity: true,
      }).catch((error) => error);
      const changed = await PATCH(room(seed.rooms.theed101), {
        pricePerNight: 200,
      }).catch((error) => error);

      for (const error of [created, changed]) {
        expect(error).to.containSubset({
          status: 422,
          code: "DRAFT_MODIFICATION_ONLY_VIA_ROOT",
        });
      }
    });

    it("deletes a room only when it has no bookings", async () => {
      const bookedRoom = await DELETE(room(seed.rooms.theed101)).catch(
        (error) => error,
      );
      const { status } = await DELETE(room(seed.rooms.mosEspa201));

      expect(bookedRoom).to.containSubset({
        status: 409,
        code: "ROOM_HAS_BOOKINGS",
      });
      expect(status).to.equal(204);
    });
  });

  describe("manager assignments", () => {
    it("assigns a manager with a trimmed user ID", async () => {
      const { status, data: assignment } = await POST(assignments, {
        hotel_ID: seed.hotels.theedRoyalHotel,
        userId: " han ",
      });

      expect(status).to.equal(201);
      expect(assignment.userId).to.equal("han");
    });

    it("allows one manager per hotel and one hotel per manager", async () => {
      const secondHotel = await POST(assignments, {
        hotel_ID: seed.hotels.theedRoyalHotel,
        userId: "lando",
      }).catch((error) => error);

      await POST(assignments, {
        hotel_ID: seed.hotels.theedRoyalHotel,
        userId: "han",
      });
      const secondManager = await POST(assignments, {
        hotel_ID: seed.hotels.theedRoyalHotel,
        userId: "leia",
      }).catch((error) => error);

      expect(secondHotel).to.containSubset({
        status: 409,
        code: "MANAGER_ALREADY_ASSIGNED",
        target: "userId",
      });
      expect(secondManager).to.containSubset({
        status: 409,
        code: "HOTEL_ALREADY_MANAGED",
        target: "hotel_ID",
      });
    });

    it("rejects a traveler as manager", async () => {
      const error = await POST(assignments, {
        hotel_ID: seed.hotels.theedRoyalHotel,
        userId: "anakin",
      }).catch((error) => error);

      expect(error).to.containSubset({
        status: 409,
        code: "MANAGER_IS_TRAVELER",
        target: "userId",
      });
    });

    it("rejects an unknown hotel", async () => {
      const error = await POST(assignments, {
        hotel_ID: cds.utils.uuid(),
        userId: "han",
      }).catch((error) => error);

      expect(error).to.containSubset({ status: 400, code: "ASSERT_TARGET" });
    });

    it("applies the same rules when an assignment changes", async () => {
      const bobasAssignment = `${assignments}(${seed.assignments.boba})`;

      const takenHotel = await PATCH(bobasAssignment, {
        hotel_ID: seed.hotels.galacticCityHotel,
      }).catch((error) => error);
      const takenManager = await PATCH(bobasAssignment, {
        userId: "lando",
      }).catch((error) => error);

      expect(takenHotel).to.containSubset({
        status: 409,
        code: "HOTEL_ALREADY_MANAGED",
      });
      expect(takenManager).to.containSubset({
        status: 409,
        code: "MANAGER_ALREADY_ASSIGNED",
      });
    });

    it("moves the manager's access together with the assignment", async () => {
      await PATCH(`${assignments}(${seed.assignments.boba})`, {
        hotel_ID: seed.hotels.theedRoyalHotel,
      });
      await DELETE(`${assignments}(${seed.assignments.lando})`);

      const { data: bobasBookings } = await GET(
        "/odata/v4/hotel-management/Bookings?$select=ID",
        auth("boba"),
      );
      const { data: landosBookings } = await GET(
        "/odata/v4/hotel-management/Bookings?$select=ID",
        auth("lando"),
      );

      expect(bobasBookings.value.map((row) => row.ID)).to.have.members([
        seed.bookings.B3,
        seed.bookings.B5,
      ]);
      expect(landosBookings.value).to.have.length(0);
    });
  });

  describe("travelers", () => {
    it("deactivates a traveler who then cannot book", async () => {
      const { data: traveler } = await PATCH(
        `${admin}/Travelers(${seed.travelers.anakin})`,
        { isActive: false, firstName: "Darth" },
      );

      const error = await POST(
        "/odata/v4/booking/Bookings",
        {
          room_ID: seed.rooms.galacticCity101,
          checkInDate: isoDate(10),
          checkOutDate: isoDate(12),
          guestCount: 2,
          IsActiveEntity: true,
        },
        auth("anakin"),
      ).catch((error) => error);

      expect(traveler).to.containSubset({
        isActive: false,
        firstName: "Anakin",
      });
      expect(error).to.containSubset({
        status: 403,
        code: "TRAVELER_INACTIVE",
      });
    });

    it("neither creates nor deletes travelers", async () => {
      const created = await POST(`${admin}/Travelers`, {
        userId: "leia",
        firstName: "Leia",
        lastName: "Organa",
        dateOfBirth: "1990-01-01",
        species: "Human",
        birthPlanet_ID: seed.planets.naboo,
      }).catch((error) => error);
      const deleted = await DELETE(
        `${admin}/Travelers(${seed.travelers.anakin})`,
      ).catch((error) => error);

      expect(created).to.containSubset({ status: 403 });
      expect(deleted).to.containSubset({ status: 403 });
    });
  });

  describe("reviews", () => {
    it("deletes a review for moderation and updates the hotel rating", async () => {
      const { status } = await DELETE(
        `${admin}/Reviews(${seed.reviews.anakinMosEspa})`,
      );

      const { data: catalogHotel } = await GET(
        `/odata/v4/catalog/Hotels(${seed.hotels.mosEspaGrand})?$select=averageRating,reviewCount`,
      );

      expect(status).to.equal(204);
      expect(catalogHotel).to.containSubset({
        averageRating: null,
        reviewCount: 0,
      });
    });

    it("neither creates nor changes reviews", async () => {
      const created = await POST(`${admin}/Reviews`, {
        hotel_ID: seed.hotels.theedRoyalHotel,
        traveler_ID: seed.travelers.anakin,
        rating: 5,
      }).catch((error) => error);
      const changed = await PATCH(
        `${admin}/Reviews(${seed.reviews.anakinMosEspa})`,
        { rating: 1 },
      ).catch((error) => error);

      expect(created).to.containSubset({ status: 403 });
      expect(changed).to.containSubset({ status: 403 });
    });
  });

  describe("expiring unpaid bookings", () => {
    it("expires only unpaid bookings whose payment deadline has passed", async () => {
      const lapsed = await insertBooking(unpaidHold(-1));
      const open = await insertBooking({
        ...unpaidHold(10),
        room_ID: seed.rooms.galacticCity501,
      });

      const { data: result } = await POST(`${admin}/expireUnpaidBookings`, {});

      expect(result.value).to.equal(1);
      expect(await bookingState(lapsed)).to.containSubset({
        status: "Expired",
        paymentStatus: "Unpaid",
      });
      expect(await bookingState(open)).to.containSubset({
        status: "AwaitingPayment",
      });
    });

    it("changes nothing when run again", async () => {
      await insertBooking(unpaidHold(-1));
      await POST(`${admin}/expireUnpaidBookings`, {});

      const { data: secondRun } = await POST(
        `${admin}/expireUnpaidBookings`,
        {},
      );

      expect(secondRun.value).to.equal(0);
    });
  });
});

function newHotel(values) {
  return {
    name: "Cloud City Lodge",
    planet_ID: seed.planets.naboo,
    address: "1 Lake Road, Cloud City",
    phoneNumber: "+999 404 400 404",
    checkInTime: "15:00:00",
    checkOutTime: "11:00:00",
    IsActiveEntity: true,
    ...values,
  };
}

function newRoom(values) {
  return {
    number: "11",
    type: "Standard",
    capacity: 2,
    pricePerNight: 150,
    ...values,
  };
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

async function hotelRoomNumbers(hotelId) {
  const rows = await SELECT.from("galactic.stays.Rooms")
    .columns("number")
    .where({ hotel_ID: hotelId });

  return rows.map((row) => row.number);
}

function bookingState(bookingId) {
  return SELECT.one
    .from("galactic.stays.Bookings")
    .columns("status", "paymentStatus")
    .where({ ID: bookingId });
}
