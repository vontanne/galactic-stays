import cds from "@sap/cds";

import { seed } from "./helpers.js";

const { POST, expect, data, defaults } = cds.test(import.meta.dirname + "/..");
defaults.auth = { username: "admin", password: "admin" };

const { SELECT, UPDATE } = cds.ql;

const sync = "/odata/v4/admin/syncPlanetsFromSwapi";

let swapiPages;

describe("Planet sync from SWAPI", () => {
  beforeAll(async () => {
    cds.env.requires.swapi.credentials.url = "http://127.0.0.1:9";
    const swapi = await cds.connect.to("swapi");
    swapi.prepend(() => swapi.on("GET", (req) => swapiPage(req.path)));
  });

  beforeEach(data.reset);

  it("creates the planets of all SWAPI pages", async () => {
    swapiPages = [
      { next: "page=2", results: [{ name: "Hoth" }, { name: "Dagobah" }] },
      { next: null, results: [{ name: "Bespin" }] },
    ];

    const { data: result } = await POST(sync, {});

    expect(result).to.containSubset({
      fetched: 3,
      created: 3,
      updated: 0,
      unchanged: 0,
    });
    expect(await planetNames()).to.include.members([
      "Hoth",
      "Dagobah",
      "Bespin",
    ]);
  });

  it("trims names and treats unknown values as empty", async () => {
    swapiPages = [
      {
        next: null,
        results: [
          { name: " Hoth ", climate: "unknown", terrain: " tundra " },
          { name: "unknown", climate: "temperate" },
        ],
      },
    ];

    const { data: result } = await POST(sync, {});

    expect(result).to.containSubset({ fetched: 1, created: 1 });
    expect(await storedPlanet("Hoth")).to.containSubset({
      climate: null,
      terrain: "tundra",
      isActive: true,
    });
  });

  it("fills only the empty climate and terrain of existing planets", async () => {
    await UPDATE("galactic.stays.Planets")
      .set({ climate: null })
      .where({ ID: seed.planets.tatooine });
    const { terrain } = await storedPlanet("Tatooine");
    swapiPages = [
      {
        next: null,
        results: [{ name: "tatooine", climate: "arid", terrain: "desert" }],
      },
    ];

    const { data: result } = await POST(sync, {});

    expect(result).to.containSubset({ created: 0, updated: 1 });
    expect(await storedPlanet("Tatooine")).to.containSubset({
      climate: "arid",
      terrain,
      region: "Outer Rim Territories",
    });
  });

  it("changes nothing when run again", async () => {
    swapiPages = [
      { next: null, results: [{ name: "Hoth" }, { name: "Naboo" }] },
    ];
    await POST(sync, {});

    const { data: secondRun } = await POST(sync, {});

    expect(secondRun).to.containSubset({
      fetched: 2,
      created: 0,
      updated: 0,
      unchanged: 2,
    });
  });

  it("creates a planet once when its name repeats in the feed", async () => {
    swapiPages = [
      { next: "page=2", results: [{ name: "Hoth", climate: "frozen" }] },
      { next: null, results: [{ name: "Hoth", terrain: "tundra" }] },
    ];

    const { data: result } = await POST(sync, {});

    expect(result).to.containSubset({
      fetched: 2,
      created: 1,
      updated: 1,
      unchanged: 0,
    });
    expect(
      (await planetNames()).filter((name) => name === "Hoth"),
    ).to.have.length(1);
    expect(await storedPlanet("Hoth")).to.containSubset({
      climate: "frozen",
      terrain: "tundra",
    });
  });

  it("accepts the plain planet list of the swapi.info mirror", async () => {
    swapiPages = [[{ name: "Endor", climate: "temperate" }]];

    const { data: result } = await POST(sync, {});

    expect(result).to.containSubset({ fetched: 1, created: 1 });
  });

  it("reports an unreachable SWAPI and changes no planets", async () => {
    swapiPages = [new Error("connect ECONNREFUSED")];

    const error = await POST(sync, {}).catch((error) => error);

    expect(error).to.containSubset({ status: 502, code: "SWAPI_UNAVAILABLE" });
    expect(await planetNames()).to.have.length(3);
  });

  it("changes no planets when a later page fails", async () => {
    swapiPages = [
      { next: "page=2", results: [{ name: "Hoth" }] },
      new Error("timeout"),
    ];

    const error = await POST(sync, {}).catch((error) => error);

    expect(error).to.containSubset({ status: 502, code: "SWAPI_UNAVAILABLE" });
    expect(await planetNames()).to.not.include("Hoth");
  });

  it("reports an unexpected SWAPI response", async () => {
    swapiPages = [{ count: 1 }];

    const error = await POST(sync, {}).catch((error) => error);

    expect(error).to.containSubset({
      status: 502,
      code: "SWAPI_INVALID_RESPONSE",
    });
  });
});

function swapiPage(path) {
  const page = Number(new URL(path, "http://swapi").searchParams.get("page"));
  const response = swapiPages[page - 1];

  if (response instanceof Error) throw response;

  return response;
}

async function planetNames() {
  const planets = await SELECT.from("galactic.stays.Planets").columns("name");

  return planets.map((planet) => planet.name);
}

function storedPlanet(name) {
  return SELECT.one
    .from("galactic.stays.Planets")
    .columns("climate", "terrain", "region", "isActive")
    .where({ name });
}
