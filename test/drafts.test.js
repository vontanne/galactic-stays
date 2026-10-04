import cds from "@sap/cds";

import { auth, isoDate, seed } from "./helpers.js";

const { GET, POST, PATCH, DELETE, expect, data } = cds.test(
  import.meta.dirname + "/..",
);

const hotels = "/odata/v4/admin/Hotels";
const travelers = "/odata/v4/traveler/Travelers";
const bookings = "/odata/v4/booking/Bookings";
const managerRooms = "/odata/v4/hotel-management/Rooms";

const active = (collection, ID) =>
  `${collection}(ID=${ID},IsActiveEntity=true)`;
const draft = (collection, ID) =>
  `${collection}(ID=${ID},IsActiveEntity=false)`;

describe("Fiori draft editing", () => {
  beforeEach(data.reset);

  describe("creating through a draft", () => {
    it("creates a hotel with its rooms through a draft", async () => {
      const { data: newDraft } = await POST(hotels, {}, auth("admin"));
      await PATCH(draft(hotels, newDraft.ID), hotelFields(), auth("admin"));
      await POST(
        `${draft(hotels, newDraft.ID)}/rooms`,
        newRoom(),
        auth("admin"),
      );

      const { status, data: saved } = await POST(
        `${draft(hotels, newDraft.ID)}/AdminService.draftActivate`,
        {},
        auth("admin"),
      );
      const { data: savedRooms } = await GET(
        `${active(hotels, newDraft.ID)}/rooms`,
        auth("admin"),
      );

      expect(status).to.equal(201);
      expect(saved).to.containSubset({
        name: "Cloud City Lodge",
        IsActiveEntity: true,
      });
      expect(savedRooms.value).to.containSubset([{ number: "11" }]);
    });

    it("checks mandatory fields only when the draft is saved", async () => {
      const { status: draftStatus, data: emptyDraft } = await POST(
        hotels,
        {},
        auth("admin"),
      );

      const error = await POST(
        `${draft(hotels, emptyDraft.ID)}/AdminService.draftActivate`,
        {},
        auth("admin"),
      ).catch((error) => error);

      expect(draftStatus).to.equal(201);
      expect(error).to.containSubset({ status: 400 });
    });

    it("applies the business rules when the draft is saved", async () => {
      const { data: newDraft } = await POST(hotels, {}, auth("admin"));
      await PATCH(draft(hotels, newDraft.ID), hotelFields(), auth("admin"));
      for (const number of ["11", " 11 "]) {
        await POST(
          `${draft(hotels, newDraft.ID)}/rooms`,
          newRoom({ number }),
          auth("admin"),
        );
      }

      const error = await POST(
        `${draft(hotels, newDraft.ID)}/AdminService.draftActivate`,
        {},
        auth("admin"),
      ).catch((error) => error);

      expect(error).to.containSubset({
        status: 409,
        code: "ROOM_NUMBER_EXISTS",
      });
    });

    it("sets the date of birth only when the profile draft is created", async () => {
      const { data: newDraft } = await POST(
        travelers,
        {
          firstName: "Padme",
          lastName: "Amidala",
          dateOfBirth: "1990-01-01",
          species: "Human",
          birthPlanet_ID: seed.planets.naboo,
        },
        auth("padme"),
      );
      await PATCH(
        draft(travelers, newDraft.ID),
        { dateOfBirth: "1980-01-01" },
        auth("padme"),
      );

      const { data: saved } = await POST(
        `${draft(travelers, newDraft.ID)}/TravelerService.draftActivate`,
        {},
        auth("padme"),
      );

      expect(saved).to.containSubset({
        userId: "padme",
        dateOfBirth: "1990-01-01",
      });
    });

    it("starts the payment hold when the booking draft is saved", async () => {
      const { data: newDraft } = await POST(
        bookings,
        {
          room_ID: seed.rooms.galacticCity101,
          checkInDate: isoDate(10),
          checkOutDate: isoDate(12),
          guestCount: 2,
        },
        auth("anakin"),
      );
      const savedAt = Date.now();

      const { data: saved } = await POST(
        `${draft(bookings, newDraft.ID)}/BookingService.draftActivate`,
        {},
        auth("anakin"),
      );

      expect(newDraft.paymentExpiresAt).to.equal(null);
      expect(saved).to.containSubset({
        status: "AwaitingPayment",
        totalAmount: "900.00",
      });
      expect(
        (new Date(saved.paymentExpiresAt).getTime() - savedAt) / 60_000,
      ).to.be.within(14.9, 15.1);
    });

    it("creates a manager's room through a draft in the manager's hotel", async () => {
      const { data: newDraft } = await POST(
        managerRooms,
        { number: "702", type: "Suite", capacity: 4, pricePerNight: 900 },
        auth("lando"),
      );

      const { data: saved } = await POST(
        `${draft(managerRooms, newDraft.ID)}/HotelManagementService.draftActivate`,
        {},
        auth("lando"),
      );

      expect(saved).to.containSubset({
        number: "702",
        hotel_ID: seed.hotels.galacticCityHotel,
      });
    });
  });

  describe("editing through a draft", () => {
    it("saves the changes made in an edit draft", async () => {
      await editHotel(seed.hotels.mosEspaGrand);
      await PATCH(
        draft(hotels, seed.hotels.mosEspaGrand),
        { description: "Renovated podrace suites." },
        auth("admin"),
      );

      await POST(
        `${draft(hotels, seed.hotels.mosEspaGrand)}/AdminService.draftActivate`,
        {},
        auth("admin"),
      );
      const { data: saved } = await GET(
        active(hotels, seed.hotels.mosEspaGrand),
        auth("admin"),
      );

      expect(saved.description).to.equal("Renovated podrace suites.");
    });

    it("discards an edit draft without changing the hotel", async () => {
      await editHotel(seed.hotels.mosEspaGrand);
      await PATCH(
        draft(hotels, seed.hotels.mosEspaGrand),
        { name: "Renamed Hotel" },
        auth("admin"),
      );

      const { status } = await DELETE(
        draft(hotels, seed.hotels.mosEspaGrand),
        auth("admin"),
      );
      const { data: unchanged } = await GET(
        active(hotels, seed.hotels.mosEspaGrand),
        auth("admin"),
      );

      expect(status).to.equal(204);
      expect(unchanged.name).to.equal("Mos Espa Grand");
    });

    it("keeps a room with bookings when an edit draft removes it", async () => {
      await editHotel(seed.hotels.mosEspaGrand);
      await DELETE(
        draft("/odata/v4/admin/Rooms", seed.rooms.mosEspa101),
        auth("admin"),
      );

      const error = await POST(
        `${draft(hotels, seed.hotels.mosEspaGrand)}/AdminService.draftActivate`,
        {},
        auth("admin"),
      ).catch((error) => error);
      const { status } = await GET(
        active("/odata/v4/admin/Rooms", seed.rooms.mosEspa101),
        auth("admin"),
      );

      expect(error).to.containSubset({
        status: 409,
        code: "ROOM_HAS_BOOKINGS",
      });
      expect(status).to.equal(200);
    });

    it("keeps an edit draft private to its owner", async () => {
      await POST(
        `${active(travelers, seed.travelers.anakin)}/TravelerService.draftEdit`,
        { PreserveChanges: true },
        auth("anakin"),
      );

      const { status: ownerStatus } = await GET(
        draft(travelers, seed.travelers.anakin),
        auth("anakin"),
      );
      const otherTraveler = await GET(
        draft(travelers, seed.travelers.anakin),
        auth("padme"),
      ).catch((error) => error);

      expect(ownerStatus).to.equal(200);
      expect(otherTraveler).to.containSubset({ status: 404 });
    });

    it("does not let travelers edit a saved booking", async () => {
      const error = await POST(
        `${active(bookings, seed.bookings.B1)}/BookingService.draftEdit`,
        { PreserveChanges: true },
        auth("anakin"),
      ).catch((error) => error);

      expect(error).to.containSubset({ status: 403 });
    });
  });
});

function editHotel(hotelId) {
  return POST(
    `${active(hotels, hotelId)}/AdminService.draftEdit`,
    { PreserveChanges: true },
    auth("admin"),
  );
}

function hotelFields() {
  return {
    name: "Cloud City Lodge",
    planet_ID: seed.planets.naboo,
    address: "1 Lake Road, Cloud City",
    phoneNumber: "+999 404 400 404",
    checkInTime: "15:00:00",
    checkOutTime: "11:00:00",
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
