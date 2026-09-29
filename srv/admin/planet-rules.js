import cds from "@sap/cds";

import { otherRecordWithNameExists, recordExists } from "./records.js";

export function registerPlanetRules(service) {
  const { Planets } = service.entities;
  const {
    Planets: PlanetRecords,
    Hotels: HotelRecords,
    Travelers: TravelerRecords,
  } = cds.entities("galactic.stays");

  service.before(["CREATE", "UPDATE"], Planets, async (req) => {
    if (!Object.hasOwn(req.data, "name")) return;

    req.data.name = req.data.name.trim();

    const nameIsTaken = await otherRecordWithNameExists(
      PlanetRecords,
      req.data.name,
      {},
      req.data.ID,
    );

    if (nameIsTaken) {
      req.reject(409, "PLANET_NAME_EXISTS", "name");
    }
  });

  service.before("DELETE", Planets, async (req) => {
    const planetId = req.data.ID;

    const planetIsUsed =
      (await recordExists(HotelRecords, { planet_ID: planetId })) ||
      (await recordExists(TravelerRecords, { birthPlanet_ID: planetId }));

    if (planetIsUsed) {
      req.reject(409, "PLANET_IN_USE");
    }
  });
}
