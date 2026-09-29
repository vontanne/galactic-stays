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
        req.reject(400, "INVALID_DATE_OF_BIRTH", "dateOfBirth");
      }

      if (age < MINIMUM_AGE) {
        req.reject(400, "TRAVELER_MINIMUM_AGE", "dateOfBirth", [MINIMUM_AGE]);
      }

      const profileExists = await travelerProfileExists(
        TravelerProfiles,
        userId,
      );

      if (profileExists) {
        req.reject(409, "TRAVELER_PROFILE_EXISTS");
      }

      if (birthPlanetId != null) {
        const planetIsActive = await activePlanetExists(Planets, birthPlanetId);

        if (!planetIsActive) {
          req.reject(400, "INVALID_BIRTH_PLANET", "birthPlanet_ID");
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
        req.reject(403, "TRAVELER_INACTIVE");
      }

      if (!Object.hasOwn(req.data, "birthPlanet_ID")) return;

      const birthPlanetId = req.data.birthPlanet_ID;

      if (birthPlanetId == null) return;

      const planetIsActive = await activePlanetExists(Planets, birthPlanetId);

      if (!planetIsActive) {
        req.reject(400, "INVALID_BIRTH_PLANET", "birthPlanet_ID");
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
