import cds from "@sap/cds";

const { SELECT } = cds.ql;

const MINIMUM_AGE = 18;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export class TravelerService extends cds.ApplicationService {
  init() {
    const { Travelers } = this.entities;
    const { Travelers: TravelerProfiles, Planets } =
      cds.entities("galactic.stays");

    this.before("CREATE", Travelers, async (req) => {
      const userId = req.user.id;
      const { dateOfBirth, birthPlanet_ID: birthPlanetId } = req.data;

      const age = calculateAge(dateOfBirth, req.timestamp);

      if (age !== undefined && age < MINIMUM_AGE) {
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

async function activePlanetExists(Planets, planetId) {
  const planet = await SELECT.one.from(Planets).columns("ID").where({
    ID: planetId,
    isActive: true,
  });

  return planet != null;
}

function calculateAge(dateOfBirth, referenceDate) {
  if (typeof dateOfBirth !== "string") return undefined;

  const match = ISO_DATE_PATTERN.exec(dateOfBirth);
  if (!match) return undefined;

  const [, yearValue, monthValue, dayValue] = match;
  const birthYear = Number(yearValue);
  const birthMonth = Number(monthValue);
  const birthDay = Number(dayValue);

  const birthDate = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));

  const dateIsValid =
    birthDate.getUTCFullYear() === birthYear &&
    birthDate.getUTCMonth() === birthMonth - 1 &&
    birthDate.getUTCDate() === birthDay;

  if (!dateIsValid) return undefined;

  let age = referenceDate.getUTCFullYear() - birthYear;

  const currentMonth = referenceDate.getUTCMonth() + 1;
  const currentDay = referenceDate.getUTCDate();

  const birthdayHasNotOccurred =
    currentMonth < birthMonth ||
    (currentMonth === birthMonth && currentDay < birthDay);

  if (birthdayHasNotOccurred) age -= 1;

  return age;
}
