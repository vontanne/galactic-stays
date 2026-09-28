import cds from "@sap/cds";

const MAXIMUM_PAGES = 20;
const UNKNOWN_VALUE = "unknown";

export class SwapiError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.code = code;
  }
}

export async function fetchSwapiPlanets() {
  const swapi = await cds.connect.to("swapi");
  const planets = [];

  for (let page = 1; page <= MAXIMUM_PAGES; page++) {
    const response = await requestPage(swapi, page);

    if (Array.isArray(response)) {
      planets.push(...response);
      return normalizePlanets(planets);
    }

    if (!Array.isArray(response?.results)) {
      throw new SwapiError(
        "SWAPI_INVALID_RESPONSE",
        `Page ${page} has no planet list.`,
      );
    }

    planets.push(...response.results);

    if (!response.next) return normalizePlanets(planets);
  }

  throw new SwapiError(
    "SWAPI_INVALID_RESPONSE",
    `More than ${MAXIMUM_PAGES} pages of planets.`,
  );
}

async function requestPage(swapi, page) {
  try {
    return await swapi.get(`/planets/?page=${page}`);
  } catch (error) {
    throw new SwapiError(
      "SWAPI_UNAVAILABLE",
      `Request for page ${page} failed: ${error.message}`,
      { cause: error },
    );
  }
}

function normalizePlanets(planets) {
  return planets
    .map((planet) => ({
      name: normalizeText(planet?.name),
      climate: normalizeText(planet?.climate),
      terrain: normalizeText(planet?.terrain),
    }))
    .filter((planet) => planet.name != null);
}

function normalizeText(value) {
  if (typeof value !== "string") return null;

  const text = value.trim();

  if (text === "" || text.toLowerCase() === UNKNOWN_VALUE) return null;

  return text;
}
