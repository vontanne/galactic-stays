import cds from "@sap/cds";

import { auth, seed } from "./helpers.js";

const { GET, POST, PATCH, expect, data, defaults } = cds.test(
  import.meta.dirname + "/..",
);
defaults.auth = { username: "anakin", password: "anakin" };

const { UPDATE } = cds.ql;

const travelers = "/odata/v4/traveler/Travelers";
const anakinProfile = `${travelers}(ID=${seed.travelers.anakin},IsActiveEntity=true)`;

describe("TravelerService OData APIs", () => {
  beforeEach(data.reset);

  describe("creating a profile", () => {
    it("creates the profile for the logged-in user", async () => {
      const { status, data: profile } = await POST(
        travelers,
        newProfile({ userId: "anakin", isActive: false }),
        auth("padme"),
      );

      expect(status).to.equal(201);
      expect(profile).to.containSubset({
        userId: "padme",
        firstName: "Padme",
        isActive: true,
      });
    });

    it("accepts a traveler whose 18th birthday is today", async () => {
      const { status } = await POST(
        travelers,
        newProfile({ dateOfBirth: birthDateForAge(18) }),
        auth("padme"),
      );

      expect(status).to.equal(201);
    });

    it("rejects a traveler whose 18th birthday is tomorrow", async () => {
      const error = await POST(
        travelers,
        newProfile({ dateOfBirth: birthDateForAge(18, 1) }),
        auth("padme"),
      ).catch((error) => error);

      expect(error).to.containSubset({
        status: 400,
        code: "TRAVELER_MINIMUM_AGE",
        target: "dateOfBirth",
      });
      expect(error.message).to.include("18");
    });

    it("rejects an impossible or malformed date of birth", async () => {
      const impossibleDate = await POST(
        travelers,
        newProfile({ dateOfBirth: "2001-02-30" }),
        auth("padme"),
      ).catch((error) => error);
      const malformedDate = await POST(
        travelers,
        newProfile({ dateOfBirth: "x" }),
        auth("padme"),
      ).catch((error) => error);

      expect(impossibleDate).to.containSubset({
        status: 400,
        code: "INVALID_DATE_OF_BIRTH",
        target: "dateOfBirth",
      });
      expect(malformedDate).to.containSubset({
        status: 400,
        code: "ASSERT_DATA_TYPE",
        target: "dateOfBirth",
      });
    });

    it("rejects an unknown or inactive birth planet", async () => {
      await UPDATE("galactic.stays.Planets")
        .set({ isActive: false })
        .where({ ID: seed.planets.naboo });

      for (const planetId of [cds.utils.uuid(), seed.planets.naboo]) {
        const error = await POST(
          travelers,
          newProfile({ birthPlanet_ID: planetId }),
          auth("padme"),
        ).catch((error) => error);

        expect(error).to.containSubset({
          status: 400,
          code: "INVALID_BIRTH_PLANET",
          target: "birthPlanet_ID",
        });
      }
    });

    it("requires the mandatory fields", async () => {
      const error = await POST(
        travelers,
        newProfile({ lastName: undefined }),
        auth("padme"),
      ).catch((error) => error);

      expect(error).to.containSubset({
        status: 400,
        code: "ASSERT_MANDATORY",
        target: "lastName",
      });
    });

    it("accepts only the modeled species", async () => {
      const error = await POST(
        travelers,
        newProfile({ species: "Droid" }),
        auth("padme"),
      ).catch((error) => error);

      expect(error).to.containSubset({
        status: 400,
        code: "ASSERT_ENUM",
        target: "species",
      });
    });

    it("rejects a second profile for the same user", async () => {
      const error = await POST(travelers, newProfile()).catch((error) => error);

      expect(error).to.containSubset({
        status: 409,
        code: "TRAVELER_PROFILE_EXISTS",
      });
    });
  });

  describe("reading and changing a profile", () => {
    it("shows each traveler only their own profile", async () => {
      const { data: anakinsView } = await GET(`${travelers}?$select=userId`);
      const { data: padmesView } = await GET(
        `${travelers}?$select=userId`,
        auth("padme"),
      );

      expect(anakinsView.value).to.have.length(1);
      expect(anakinsView.value).to.containSubset([{ userId: "anakin" }]);
      expect(padmesView.value).to.have.length(0);
    });

    it("updates the names and birth planet of the own profile", async () => {
      const { data: profile } = await PATCH(anakinProfile, {
        lastName: "Vader",
        birthPlanet_ID: seed.planets.coruscant,
      });

      expect(profile).to.containSubset({
        lastName: "Vader",
        birthPlanet_ID: seed.planets.coruscant,
      });
    });

    it("keeps date of birth, user and active flag unchanged", async () => {
      await PATCH(anakinProfile, {
        dateOfBirth: "2000-01-01",
        userId: "padme",
        isActive: false,
      });

      const { data: profile } = await GET(anakinProfile);

      expect(profile).to.containSubset({
        dateOfBirth: "1995-04-12",
        userId: "anakin",
        isActive: true,
      });
    });

    it("rejects a change to an inactive birth planet", async () => {
      await UPDATE("galactic.stays.Planets")
        .set({ isActive: false })
        .where({ ID: seed.planets.naboo });

      const error = await PATCH(anakinProfile, {
        birthPlanet_ID: seed.planets.naboo,
      }).catch((error) => error);

      expect(error).to.containSubset({
        status: 400,
        code: "INVALID_BIRTH_PLANET",
        target: "birthPlanet_ID",
      });
    });

    it("rejects changes to an inactive profile", async () => {
      await UPDATE("galactic.stays.Travelers")
        .set({ isActive: false })
        .where({ ID: seed.travelers.anakin });

      const error = await PATCH(anakinProfile, { lastName: "Vader" }).catch(
        (error) => error,
      );

      expect(error).to.containSubset({
        status: 403,
        code: "TRAVELER_INACTIVE",
      });
    });
  });
});

function newProfile(values) {
  return {
    firstName: "Padme",
    lastName: "Amidala",
    dateOfBirth: "1990-01-01",
    species: "Human",
    birthPlanet_ID: seed.planets.naboo,
    IsActiveEntity: true,
    ...values,
  };
}

function birthDateForAge(years, extraDays = 0) {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  date.setUTCDate(date.getUTCDate() + extraDays);

  return date.toISOString().slice(0, 10);
}
