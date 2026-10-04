import cds from "@sap/cds";

import { auth, seed } from "./helpers.js";

const { GET, POST, expect, data } = cds.test(import.meta.dirname + "/..");

const { INSERT, UPDATE } = cds.ql;

const catalog = "/odata/v4/catalog";

describe("CatalogService OData APIs", () => {
  beforeEach(data.reset);

  it("serves active hotels with planet and rating to anonymous users", async () => {
    const { data: hotels } = await GET(
      `${catalog}/Hotels?$select=name,averageRating,reviewCount&$expand=planet($select=name)&$orderby=name`,
    );

    expect(hotels.value).to.have.length(3);
    expect(hotels.value).to.containSubset([
      {
        name: "Galactic City Hotel",
        averageRating: null,
        reviewCount: 0,
        planet: { name: "Coruscant" },
      },
      {
        name: "Mos Espa Grand",
        averageRating: "4.0",
        reviewCount: 1,
        planet: { name: "Tatooine" },
      },
      {
        name: "Theed Royal Hotel",
        averageRating: null,
        reviewCount: 0,
        planet: { name: "Naboo" },
      },
    ]);
  });

  it("calculates the average rating from all reviews of a hotel", async () => {
    const [leiaId, lukeId] = [cds.utils.uuid(), cds.utils.uuid()];

    await INSERT.into("galactic.stays.Travelers").entries(
      traveler(leiaId, "leia", "Leia"),
      traveler(lukeId, "luke", "Luke"),
    );
    await INSERT.into("galactic.stays.Reviews").entries(
      review(leiaId, 5),
      review(lukeId, 5),
    );

    const { data: hotel } = await GET(
      `${catalog}/Hotels(${seed.hotels.mosEspaGrand})?$select=averageRating,reviewCount`,
    );

    expect(hotel).to.containSubset({ averageRating: "4.7", reviewCount: 3 });
  });

  it("lists only the active rooms of a hotel", async () => {
    const { data: rooms } = await GET(
      `${catalog}/Rooms?$select=number,pricePerNight&$filter=hotel_ID eq ${seed.hotels.mosEspaGrand}`,
    );

    expect(rooms.value).to.have.length(1);
    expect(rooms.value).to.containSubset([
      { number: "101", pricePerNight: "120.00" },
    ]);
  });

  it("expands a hotel with its active rooms and public reviews", async () => {
    const { data: hotel } = await GET(
      `${catalog}/Hotels(${seed.hotels.mosEspaGrand})?$select=name&$expand=rooms($select=number),reviews($select=rating,authorName)`,
    );

    expect(hotel.rooms).to.have.length(1);
    expect(hotel).to.containSubset({
      name: "Mos Espa Grand",
      rooms: [{ number: "101" }],
      reviews: [{ rating: 4, authorName: "Anakin" }],
    });
  });

  it("does not reveal the traveler behind a review", async () => {
    const { data: reviews } = await GET(`${catalog}/Reviews`);

    expect(reviews.value).to.containSubset([{ authorName: "Anakin" }]);
    expect(reviews.value[0]).to.not.have.any.keys("traveler", "traveler_ID");
  });

  it("hides a deactivated hotel with its rooms and reviews", async () => {
    await UPDATE("galactic.stays.Hotels")
      .set({ isActive: false })
      .where({ ID: seed.hotels.mosEspaGrand });

    const { data: hotels } = await GET(`${catalog}/Hotels?$select=name`);
    const { data: rooms } = await GET(
      `${catalog}/Rooms?$filter=hotel_ID eq ${seed.hotels.mosEspaGrand}`,
    );
    const { data: reviews } = await GET(`${catalog}/Reviews`);

    expect(hotels.value.map((hotel) => hotel.name)).to.not.include(
      "Mos Espa Grand",
    );
    expect(rooms.value).to.have.length(0);
    expect(reviews.value).to.have.length(0);
  });

  it("hides a deactivated planet together with its hotels, rooms and reviews", async () => {
    await UPDATE("galactic.stays.Planets")
      .set({ isActive: false })
      .where({ ID: seed.planets.tatooine });

    const { data: planets } = await GET(`${catalog}/Planets?$select=name`);
    const { data: hotels } = await GET(`${catalog}/Hotels?$select=name`);
    const { data: rooms } = await GET(
      `${catalog}/Rooms?$filter=hotel_ID eq ${seed.hotels.mosEspaGrand}`,
    );
    const { data: reviews } = await GET(`${catalog}/Reviews`);

    expect(planets.value.map((planet) => planet.name)).to.have.members([
      "Naboo",
      "Coruscant",
    ]);
    expect(hotels.value.map((hotel) => hotel.name)).to.have.members([
      "Galactic City Hotel",
      "Theed Royal Hotel",
    ]);
    expect(rooms.value).to.have.length(0);
    expect(reviews.value).to.have.length(0);
  });

  it("rejects writes for anonymous and authenticated users", async () => {
    const newHotel = { name: "Cloud City Lodge" };

    const anonymousError = await POST(`${catalog}/Hotels`, newHotel).catch(
      (error) => error,
    );
    const adminError = await POST(
      `${catalog}/Hotels`,
      newHotel,
      auth("admin"),
    ).catch((error) => error);

    for (const error of [anonymousError, adminError]) {
      expect(error).to.containSubset({
        code: "ENTITY_IS_READ_ONLY",
        status: 405,
      });
    }
  });
});

function traveler(ID, userId, firstName) {
  return {
    ID,
    userId,
    firstName,
    lastName: "Skywalker",
    dateOfBirth: "1990-01-01",
    species: "Human",
    birthPlanet_ID: seed.planets.tatooine,
  };
}

function review(travelerId, rating) {
  return {
    ID: cds.utils.uuid(),
    hotel_ID: seed.hotels.mosEspaGrand,
    traveler_ID: travelerId,
    rating,
  };
}
