import cds from "@sap/cds";

import { fetchSwapiPlanets, SwapiError } from "./swapi-planets.js";

const { SELECT, INSERT, UPDATE } = cds.ql;

const LOG = cds.log("swapi");

export function registerPlanetSync(service) {
  const { Planets: PlanetRecords } = cds.entities("galactic.stays");

  service.on("syncPlanetsFromSwapi", async (req) => {
    let swapiPlanets;

    try {
      swapiPlanets = await fetchSwapiPlanets();
    } catch (error) {
      if (!(error instanceof SwapiError)) throw error;

      LOG.warn(`Planet sync aborted: ${error.message}`);

      return req.reject(502, error.code);
    }

    return synchronizePlanets(PlanetRecords, swapiPlanets);
  });
}

async function synchronizePlanets(Planets, swapiPlanets) {
  const storedPlanets = await SELECT.from(Planets).columns(
    "ID",
    "name",
    "climate",
    "terrain",
  );

  const storedByName = new Map(
    storedPlanets.map((planet) => [planet.name.toLowerCase(), planet]),
  );

  const newPlanets = [];
  const planetUpdates = [];

  for (const swapiPlanet of swapiPlanets) {
    const storedPlanet = storedByName.get(swapiPlanet.name.toLowerCase());

    if (!storedPlanet) {
      const newPlanet = { ID: cds.utils.uuid(), ...swapiPlanet };
      newPlanets.push(newPlanet);
      storedByName.set(swapiPlanet.name.toLowerCase(), newPlanet);
      continue;
    }

    const missingValues = findMissingValues(storedPlanet, swapiPlanet);

    if (Object.keys(missingValues).length > 0) {
      planetUpdates.push({ ID: storedPlanet.ID, changes: missingValues });
    }
  }

  if (newPlanets.length > 0) await INSERT.into(Planets).entries(newPlanets);

  for (const { ID, changes } of planetUpdates) {
    await UPDATE(Planets).set(changes).where({ ID });
  }

  return {
    fetched: swapiPlanets.length,
    created: newPlanets.length,
    updated: planetUpdates.length,
    unchanged: swapiPlanets.length - newPlanets.length - planetUpdates.length,
  };
}

function findMissingValues(storedPlanet, swapiPlanet) {
  const missingValues = {};

  for (const field of ["climate", "terrain"]) {
    if (storedPlanet[field] == null && swapiPlanet[field] != null) {
      missingValues[field] = swapiPlanet[field];
    }
  }

  return missingValues;
}
