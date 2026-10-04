import cds from "@sap/cds";

import { auth, seed } from "./helpers.js";

const { GET, POST, PATCH, DELETE, expect, data } = cds.test(
  import.meta.dirname + "/..",
);

const services = {
  catalog: "/odata/v4/catalog/Hotels",
  traveler: "/odata/v4/traveler/Travelers",
  booking: "/odata/v4/booking/Bookings",
  "hotel-management": "/odata/v4/hotel-management/Bookings",
  admin: "/odata/v4/admin/Planets",
};

const accessMatrix = [
  [
    null,
    {
      catalog: 200,
      traveler: 401,
      booking: 401,
      "hotel-management": 401,
      admin: 401,
    },
  ],
  [
    "anakin",
    {
      catalog: 200,
      traveler: 200,
      booking: 200,
      "hotel-management": 403,
      admin: 403,
    },
  ],
  [
    "lando",
    {
      catalog: 200,
      traveler: 403,
      booking: 403,
      "hotel-management": 200,
      admin: 403,
    },
  ],
  [
    "admin",
    {
      catalog: 200,
      traveler: 403,
      booking: 403,
      "hotel-management": 200,
      admin: 200,
    },
  ],
];

const travelerProfile = `/odata/v4/traveler/Travelers(ID=${seed.travelers.anakin},IsActiveEntity=true)`;
const travelerBooking = `/odata/v4/booking/Bookings(ID=${seed.bookings.B1},IsActiveEntity=true)`;
const travelerReview = `/odata/v4/booking/Reviews(ID=${seed.reviews.anakinMosEspa},IsActiveEntity=true)`;
const hotelManagement = "/odata/v4/hotel-management";
const bobasBooking = `${hotelManagement}/Bookings(${seed.bookings.B2})`;
const bobasRoom = `${hotelManagement}/Rooms(ID=${seed.rooms.mosEspa101},IsActiveEntity=true)`;

describe("Authorization", () => {
  beforeEach(data.reset);

  describe("service access by role", () => {
    for (const [user, expectedStatuses] of accessMatrix) {
      for (const [service, expectedStatus] of Object.entries(
        expectedStatuses,
      )) {
        it(`answers ${expectedStatus} to ${user ?? "an anonymous user"} on the ${service} service`, async () => {
          const response = await GET(
            services[service],
            user ? auth(user) : {},
          ).catch((error) => error);

          expect(response.status).to.equal(expectedStatus);
        });
      }
    }
  });

  describe("traveler data", () => {
    it("hides another traveler's profile, bookings and reviews", async () => {
      for (const path of [travelerProfile, travelerBooking, travelerReview]) {
        const error = await GET(path, auth("padme")).catch((error) => error);

        expect(error).to.containSubset({ status: 404 });
      }
    });

    it("rejects changes to another traveler's profile, bookings and reviews", async () => {
      const changes = [
        () => PATCH(travelerProfile, { lastName: "Naberrie" }, auth("padme")),
        () => POST(`${travelerBooking}/BookingService.pay`, {}, auth("padme")),
        () =>
          POST(`${travelerBooking}/BookingService.cancel`, {}, auth("padme")),
        () => PATCH(travelerReview, { rating: 1 }, auth("padme")),
        () => DELETE(travelerReview, auth("padme")),
      ];

      for (const change of changes) {
        const error = await change().catch((error) => error);

        expect(error).to.containSubset({ status: 403 });
      }
    });

    it("does not let travelers delete their profile", async () => {
      const error = await DELETE(travelerProfile, auth("anakin")).catch(
        (error) => error,
      );

      expect(error).to.containSubset({ status: 405 });
    });
  });

  describe("hotel manager scope", () => {
    it("hides other hotels' bookings, rooms, hotels and reviews", async () => {
      for (const path of [
        bobasBooking,
        bobasRoom,
        `${hotelManagement}/Hotels(${seed.hotels.mosEspaGrand})`,
        `${hotelManagement}/Reviews(${seed.reviews.anakinMosEspa})`,
      ]) {
        const error = await GET(path, auth("lando")).catch((error) => error);

        expect(error).to.containSubset({ status: 404 });
      }
    });

    it("rejects actions and changes in other hotels", async () => {
      const changes = [
        () =>
          POST(
            `${bobasBooking}/HotelManagementService.cancel`,
            {},
            auth("lando"),
          ),
        () =>
          POST(
            `${bobasBooking}/HotelManagementService.complete`,
            {},
            auth("lando"),
          ),
        () => PATCH(bobasRoom, { pricePerNight: 1 }, auth("lando")),
      ];

      for (const change of changes) {
        const error = await change().catch((error) => error);

        expect(error).to.containSubset({ status: 403 });
      }
    });

    it("does not expose a guest's bookings or the hotel's manager assignment", async () => {
      for (const path of [
        `${hotelManagement}/Travelers?$expand=bookings`,
        `${hotelManagement}/Travelers(${seed.travelers.anakin})/bookings`,
        `${hotelManagement}/Hotels?$expand=managementAssignment`,
      ]) {
        const error = await GET(path, auth("lando")).catch((error) => error);

        expect(error).to.containSubset({ status: 400 });
      }
    });
  });

  describe("bookings", () => {
    it("cannot be changed or deleted in any service", async () => {
      const travelerChange = await PATCH(
        travelerBooking,
        { guestCount: 1 },
        auth("anakin"),
      ).catch((error) => error);
      const changes = [
        () => DELETE(travelerBooking, auth("anakin")),
        () => PATCH(bobasBooking, { guestCount: 1 }, auth("admin")),
        () => DELETE(bobasBooking, auth("admin")),
      ];

      expect(travelerChange).to.containSubset({ status: 403 });
      for (const change of changes) {
        const error = await change().catch((error) => error);

        expect(error).to.containSubset({ status: 405 });
      }
    });
  });
});
