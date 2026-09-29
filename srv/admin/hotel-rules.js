import cds from "@sap/cds";

import {
  findHotelRoomIds,
  otherRecordWithNameExists,
  recordExists,
  roomsHaveBookings,
  upcomingBookingExceedsCapacity,
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
      req.reject(400, "INVALID_PLANET", "planet_ID");
    }
  });

  service.before(["CREATE", "UPDATE"], Hotels, async (req) => {
    if (
      !Object.hasOwn(req.data, "name") &&
      !Object.hasOwn(req.data, "planet_ID")
    ) {
      return;
    }

    if (Object.hasOwn(req.data, "name")) req.data.name = req.data.name.trim();

    const hotel = await withStoredValues(req, HotelRecords, [
      "name",
      "planet_ID",
    ]);

    const nameIsTaken = await otherRecordWithNameExists(
      HotelRecords,
      hotel.name,
      { planet_ID: hotel.planet_ID },
      req.data.ID,
    );

    if (nameIsTaken) {
      req.reject(409, "HOTEL_NAME_EXISTS", "name");
    }
  });

  service.before(["CREATE", "UPDATE"], Hotels, async (req) => {
    if (!Array.isArray(req.data.rooms)) return;

    for (const room of req.data.rooms) {
      if (typeof room.number === "string") room.number = room.number.trim();
    }

    const roomNumbers = await resolveRoomNumbers(RoomRecords, req.data.rooms);

    if (new Set(roomNumbers).size !== roomNumbers.length) {
      req.reject(409, "ROOM_NUMBER_EXISTS", "rooms");
    }
  });

  service.before("UPDATE", Hotels, async (req) => {
    if (!Array.isArray(req.data.rooms)) return;

    const keptRoomIds = new Set(req.data.rooms.map((room) => room.ID));
    const hotelRoomIds = await findHotelRoomIds(RoomRecords, req.data.ID);
    const removedRoomIds = hotelRoomIds.filter((id) => !keptRoomIds.has(id));

    if (await roomsHaveBookings(BookingRecords, removedRoomIds)) {
      req.reject(409, "ROOM_HAS_BOOKINGS", "rooms");
    }
  });

  service.before("UPDATE", Hotels, async (req) => {
    if (!Array.isArray(req.data.rooms)) return;

    const today = req.timestamp.toISOString().slice(0, 10);

    for (const room of req.data.rooms) {
      if (room.ID == null || room.capacity == null) continue;

      const capacityIsTooLow = await upcomingBookingExceedsCapacity(
        BookingRecords,
        room.ID,
        room.capacity,
        today,
      );

      if (capacityIsTooLow) {
        req.reject(409, "ROOM_CAPACITY_TOO_LOW", "rooms");
      }
    }
  });

  service.before("DELETE", Hotels, async (req) => {
    const hotelId = req.data.ID;
    const hotelRoomIds = await findHotelRoomIds(RoomRecords, hotelId);

    if (await roomsHaveBookings(BookingRecords, hotelRoomIds)) {
      req.reject(409, "HOTEL_HAS_BOOKINGS");
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
