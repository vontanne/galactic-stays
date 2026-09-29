import cds from "@sap/cds";

import {
  otherRecordExists,
  recordExists,
  roomsHaveBookings,
  upcomingBookingExceedsCapacity,
  withStoredValues,
} from "./records.js";

export function registerRoomRules(service) {
  const { Rooms } = service.entities;
  const { Bookings: BookingRecords } = cds.entities("galactic.stays");

  service.before("CREATE", Rooms, async (req) => {
    await validateRoomHotel(req);
    await validateRoomNumber(req);
  });

  service.before("UPDATE", Rooms, validateRoomNumber);

  service.before("UPDATE", Rooms, async (req) => {
    if (req.data.capacity == null) return;

    const capacityIsTooLow = await upcomingBookingExceedsCapacity(
      BookingRecords,
      req.data.ID,
      req.data.capacity,
      req.timestamp.toISOString().slice(0, 10),
    );

    if (capacityIsTooLow) {
      req.reject(409, "ROOM_CAPACITY_TOO_LOW", "capacity");
    }
  });

  service.before("DELETE", Rooms, async (req) => {
    if (await roomsHaveBookings(BookingRecords, [req.data.ID])) {
      req.reject(409, "ROOM_HAS_BOOKINGS");
    }
  });
}

async function validateRoomHotel(req) {
  const { Hotels: HotelRecords } = cds.entities("galactic.stays");
  const hotelId = req.data.hotel_ID;

  const hotelExists =
    hotelId != null && (await recordExists(HotelRecords, { ID: hotelId }));

  if (!hotelExists) {
    req.reject(400, "INVALID_HOTEL", "hotel_ID");
  }
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
