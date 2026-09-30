import cds from "@sap/cds";

import {
  otherRecordExists,
  roomsHaveBookings,
  withStoredValues,
} from "./records.js";

export function registerRoomRules(service) {
  const { Rooms } = service.entities;
  const { Bookings: BookingRecords } = cds.entities("galactic.stays");

  service.before("DELETE", Rooms, async (req) => {
    if (await roomsHaveBookings(BookingRecords, [req.data.ID])) {
      req.reject(409, "ROOM_HAS_BOOKINGS");
    }
  });
}

export async function validateRoomNumber(req) {
  if (!Object.hasOwn(req.data, "number")) return;

  req.data.number = req.data.number.trim();

  const { Rooms: RoomRecords } = cds.entities("galactic.stays");
  const room = await withStoredValues(req, RoomRecords, ["hotel_ID"]);

  const numberIsTaken = await otherRecordExists(
    RoomRecords,
    { hotel_ID: room.hotel_ID, number: room.number },
    req.data.ID,
  );

  if (numberIsTaken) {
    req.reject(409, "ROOM_NUMBER_EXISTS", "number");
  }
}
