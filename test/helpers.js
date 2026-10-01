export const seed = {
  planets: {
    tatooine: "10f11185-ee89-4caf-8cb0-5c8c37a6cdfa",
    naboo: "66d1b81e-3edc-46ce-b5e1-ff0e88cdfa54",
    coruscant: "12a56c0e-f617-4dc6-b331-49b17baa2c6a",
  },
  hotels: {
    mosEspaGrand: "7a6f63c8-7208-4ab8-9b91-785f746c9398",
    galacticCityHotel: "9054d54f-b5fb-4727-aa47-186696d62e81",
    theedRoyalHotel: "61f98a7e-bdd1-4e39-857d-a657ec28bd42",
  },
  rooms: {
    mosEspa101: "8d1c5e71-4f37-49c8-b9a8-6f2b04e67101",
    mosEspa201: "ac734402-0c3a-40a3-98d9-85cf71937201",
    galacticCity101: "cf925216-09dc-48a1-a30b-bd7ea6e36101",
    galacticCity501: "e7f3b261-d14e-43ca-8d04-2cb88ee36501",
    theed101: "15be86d4-2f4f-4b67-9295-f5ff2eb77101",
    theed301: "699ddf2a-d3c8-493c-ab42-3e6f2d217301",
  },
  travelers: {
    anakin: "5fc24eca-01ba-42c0-998f-c14b1e8509ab",
  },
  bookings: {
    B1: "e6195205-0ed5-463c-83fe-1475a14605d1",
    B2: "ba6357d4-8363-4273-84b3-12530f2006f3",
    B3: "502b8bd6-f05e-4a30-b847-e60904b1f100",
    B4: "7b979110-275a-4454-87b1-52376185752c",
    B5: "65f54b60-0545-4b4a-a7e1-901909ea5da3",
  },
  reviews: {
    anakinMosEspa: "9b2f4c61-7d3e-4a85-b1c9-2e6f8a0d5c47",
  },
  assignments: {
    lando: "1b16d845-b3e2-431c-8da9-481997b8caa7",
    boba: "3fe947f1-8307-4fb5-beed-016d83738612",
  },
};

export function auth(username) {
  return { auth: { username, password: username } };
}
