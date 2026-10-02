import cds from "@sap/cds";

import { seed } from "./helpers.js";

const { POST, PATCH, expect, data, defaults } = cds.test(
  import.meta.dirname + "/..",
);
defaults.auth = { username: "lando", password: "lando" };

const { UPDATE } = cds.ql;

const rooms = "/odata/v4/hotel-management/Rooms";

describe("HotelManagementService OData APIs", () => {
  beforeEach(data.reset);

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

    it("still lets the manager change prices in an inactive hotel", async () => {
      await UPDATE("galactic.stays.Hotels")
        .set({ isActive: false })
        .where({ ID: seed.hotels.galacticCityHotel });

      const { data: room } = await PATCH(
        `${rooms}(ID=${seed.rooms.galacticCity101},IsActiveEntity=true)`,
        { pricePerNight: 500 },
      );

      expect(room.pricePerNight).to.equal("500.00");
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
