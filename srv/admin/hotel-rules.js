import cds from "@sap/cds";

import {
  findHotelRoomIds,
  otherRecordExists,
  recordExists,
  roomsHaveBookings,
  withStoredValues,
} from "./records.js";

const { SELECT, DELETE } = cds.ql;

export function registerHotelRules(service) {
  const { Hotels } = service.entities;
  const {
    Planets: PlanetRecords,
    Hotels: HotelRecords,
    Rooms: RoomRecords,
    Bookings: BookingRecords,
    HotelManagementAssignments: AssignmentRecords,
  } = cds.entities("galactic.stays");

  service.before(["CREATE", "UPDATE"], Hotels, async (req) => {
    if (!Object.hasOwn(req.data, "planet_ID")) return;

    const planetIsActive = await recordExists(PlanetRecords, {
      ID: req.data.planet_ID,
      isActive: true,
    });

    if (!planetIsActive) {
      req.reject({
        status: 400,
        code: "INVALID_PLANET",
        message: "Hotel must be located on an active planet.",
        target: "planet_ID",
      });
    }
  });

  service.before(["CREATE", "UPDATE"], Hotels, async (req) => {
    if (
      !Object.hasOwn(req.data, "name") &&
      !Object.hasOwn(req.data, "planet_ID")
    ) {
      return;
    }

    const hotel = await withStoredValues(req, HotelRecords, [
      "name",
      "planet_ID",
    ]);

    const nameIsTaken = await otherRecordExists(
      HotelRecords,
      { name: hotel.name, planet_ID: hotel.planet_ID },
      req.data.ID,
    );

    if (nameIsTaken) {
      req.reject({
        status: 409,
        code: "HOTEL_NAME_EXISTS",
        message: "A hotel with this name already exists on this planet.",
        target: "name",
      });
    }
  });

  service.before(["CREATE", "UPDATE"], Hotels, async (req) => {
    if (!Array.isArray(req.data.rooms)) return;

    const roomNumbers = await resolveRoomNumbers(RoomRecords, req.data.rooms);

    if (new Set(roomNumbers).size !== roomNumbers.length) {
      req.reject({
        status: 409,
        code: "ROOM_NUMBER_EXISTS",
        message: "Room numbers must be unique within a hotel.",
        target: "rooms",
      });
    }
  });

  service.before("UPDATE", Hotels, async (req) => {
    if (!Array.isArray(req.data.rooms)) return;

    const keptRoomIds = new Set(req.data.rooms.map((room) => room.ID));
    const hotelRoomIds = await findHotelRoomIds(RoomRecords, req.data.ID);
    const removedRoomIds = hotelRoomIds.filter((id) => !keptRoomIds.has(id));

    if (await roomsHaveBookings(BookingRecords, removedRoomIds)) {
      req.reject({
        status: 409,
        code: "ROOM_HAS_BOOKINGS",
        message:
          "A room with bookings cannot be deleted. Deactivate it instead.",
        target: "rooms",
      });
    }
  });

  service.before("DELETE", Hotels, async (req) => {
    const hotelId = req.data.ID;
    const hotelRoomIds = await findHotelRoomIds(RoomRecords, hotelId);

    if (await roomsHaveBookings(BookingRecords, hotelRoomIds)) {
      req.reject({
        status: 409,
        code: "HOTEL_HAS_BOOKINGS",
        message:
          "A hotel with bookings cannot be deleted. Deactivate it instead.",
      });
    }

    await DELETE.from(AssignmentRecords).where({ hotel_ID: hotelId });
  });
}

async function resolveRoomNumbers(Rooms, rooms) {
  const storedRoomIds = rooms
    .filter((room) => room.number == null && room.ID != null)
    .map((room) => room.ID);

  const storedRooms =
    storedRoomIds.length === 0
      ? []
      : await SELECT.from(Rooms)
          .columns("ID", "number")
          .where({ ID: storedRoomIds });

  const storedNumbers = new Map(
    storedRooms.map((room) => [room.ID, room.number]),
  );

  return rooms.map((room) => room.number ?? storedNumbers.get(room.ID));
}
