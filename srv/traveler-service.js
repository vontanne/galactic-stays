import cds from "@sap/cds";

import { parseDateOnly } from "./booking/date-time.js";

const { SELECT } = cds.ql;

const MINIMUM_AGE = 18;

export class TravelerService extends cds.ApplicationService {
  init() {
    const { Travelers } = this.entities;
    const { Travelers: TravelerProfiles, Planets } =
      cds.entities("galactic.stays");

    this.before("CREATE", Travelers, async (req) => {
      const userId = req.user.id;
      const { dateOfBirth, birthPlanet_ID: birthPlanetId } = req.data;

      const age = calculateAge(dateOfBirth, req.timestamp);

      if (age === undefined) {
        req.reject({
          status: 400,
          code: "INVALID_DATE_OF_BIRTH",
          message: "Date of birth must be a valid ISO date.",
          target: "dateOfBirth",
        });
      }

      if (age < MINIMUM_AGE) {
        req.reject({
          status: 400,
          code: "TRAVELER_MINIMUM_AGE",
          message: `Traveler must be at least ${MINIMUM_AGE} years old.`,
          target: "dateOfBirth",
        });
      }

      const profileExists = await travelerProfileExists(
        TravelerProfiles,
        userId,
      );

      if (profileExists) {
        req.reject({
          status: 409,
          code: "TRAVELER_PROFILE_EXISTS",
          message: "A traveler profile already exists for this user.",
        });
      }

      if (birthPlanetId != null) {
        const planetIsActive = await activePlanetExists(Planets, birthPlanetId);

        if (!planetIsActive) {
          req.reject({
            status: 400,
            code: "INVALID_BIRTH_PLANET",
            message: "Birth planet must reference an active planet.",
            target: "birthPlanet_ID",
          });
        }
      }

      req.data.userId = userId;
    });

    this.before("UPDATE", Travelers, async (req) => {
      const travelerIsActive = await activeTravelerExists(
        TravelerProfiles,
        req.data.ID,
      );

      if (!travelerIsActive) {
        req.reject({
          status: 403,
          code: "TRAVELER_INACTIVE",
          message: "An inactive traveler profile cannot be updated.",
        });
      }

      if (!Object.hasOwn(req.data, "birthPlanet_ID")) return;

      const birthPlanetId = req.data.birthPlanet_ID;

      if (birthPlanetId == null) return;

      const planetIsActive = await activePlanetExists(Planets, birthPlanetId);

      if (!planetIsActive) {
        req.reject({
          status: 400,
          code: "INVALID_BIRTH_PLANET",
          message: "Birth planet must reference an active planet.",
          target: "birthPlanet_ID",
        });
      }
    });

    return super.init();
  }
}

async function travelerProfileExists(Travelers, userId) {
  const profile = await SELECT.one
    .from(Travelers)
    .columns("ID")
    .where({ userId });

  return profile != null;
}

async function activeTravelerExists(Travelers, travelerId) {
  const traveler = await SELECT.one.from(Travelers).columns("ID").where({
    ID: travelerId,
    isActive: true,
  });

  return traveler != null;
}

async function activePlanetExists(Planets, planetId) {
  const planet = await SELECT.one.from(Planets).columns("ID").where({
    ID: planetId,
    isActive: true,
  });

  return planet != null;
}

function calculateAge(dateOfBirth, referenceDate) {
  const birthDate = parseDateOnly(dateOfBirth);
  if (!birthDate) return undefined;

  const birthYear = birthDate.getUTCFullYear();
  const birthMonth = birthDate.getUTCMonth();
  const birthDay = birthDate.getUTCDate();

  let age = referenceDate.getUTCFullYear() - birthYear;

  const currentMonth = referenceDate.getUTCMonth();
  const currentDay = referenceDate.getUTCDate();

  const birthdayHasNotOccurred =
    currentMonth < birthMonth ||
    (currentMonth === birthMonth && currentDay < birthDay);

  if (birthdayHasNotOccurred) age -= 1;

  return age;
}
