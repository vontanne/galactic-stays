import cds from "@sap/cds";

import {
  otherRecordExists,
  recordExists,
  roomsHaveBookings,
  withStoredValues,
} from "./records.js";

export function registerRoomRules(service) {
  const { Rooms } = service.entities;
  const {
    Hotels: HotelRecords,
    Rooms: RoomRecords,
    Bookings: BookingRecords,
  } = cds.entities("galactic.stays");

  service.before("CREATE", Rooms, async (req) => {
    const hotelId = req.data.hotel_ID;

    const hotelExists =
      hotelId != null && (await recordExists(HotelRecords, { ID: hotelId }));

    if (!hotelExists) {
      req.reject({
        status: 400,
        code: "INVALID_HOTEL",
        message: "Room must belong to an existing hotel.",
        target: "hotel_ID",
      });
    }
  });

  service.before(["CREATE", "UPDATE"], Rooms, async (req) => {
    if (!Object.hasOwn(req.data, "number")) return;

    const room = await withStoredValues(req, RoomRecords, ["hotel_ID"]);

    const numberIsTaken = await otherRecordExists(
      RoomRecords,
      { hotel_ID: room.hotel_ID, number: room.number },
      req.data.ID,
    );

    if (numberIsTaken) {
      req.reject({
        status: 409,
        code: "ROOM_NUMBER_EXISTS",
        message: "Room numbers must be unique within a hotel.",
        target: "number",
      });
    }
  });

  service.before("DELETE", Rooms, async (req) => {
    if (await roomsHaveBookings(BookingRecords, [req.data.ID])) {
      req.reject({
        status: 409,
        code: "ROOM_HAS_BOOKINGS",
        message:
          "A room with bookings cannot be deleted. Deactivate it instead.",
      });
    }
  });
}
