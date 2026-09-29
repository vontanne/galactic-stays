import cds from "@sap/cds";

import {
  addMinutes,
  calculateCalendarDaysBetween,
  parseDateOnly,
  toUtcCalendarDate,
} from "./date-time.js";
import { multiplyAmount } from "./money.js";

const { SELECT } = cds.ql;

const MAXIMUM_STAY_NIGHTS = 30;
const PAYMENT_HOLD_MINUTES = 15;

export function registerBookingCreation(service) {
  const { Bookings } = service.entities;
  const {
    Bookings: BookingRecords,
    Travelers,
    Rooms,
    Hotels,
    Planets,
  } = cds.entities("galactic.stays");

  service.before("CREATE", Bookings, async (req) => {
    const {
      room_ID: roomId,
      checkInDate: checkInDateValue,
      checkOutDate: checkOutDateValue,
    } = req.data;

    const stay = validateStayPeriod(
      checkInDateValue,
      checkOutDateValue,
      req.timestamp,
    );

    if (stay.error) req.reject(stay.error);

    const traveler = await findTravelerProfile(Travelers, req.user.id);

    if (!traveler) {
      req.reject(409, "TRAVELER_PROFILE_REQUIRED");
    }

    if (!traveler.isActive) {
      req.reject(403, "TRAVELER_INACTIVE");
    }

    const roomContext = await findActiveRoomContext(
      { Rooms, Hotels, Planets },
      roomId,
    );

    if (!roomContext) {
      req.reject(400, "INVALID_ROOM", "room_ID");
    }

    const roomIsUnavailable = await hasBlockingBooking(
      BookingRecords,
      roomId,
      checkInDateValue,
      checkOutDateValue,
      req.timestamp,
    );

    if (roomIsUnavailable) {
      req.reject(409, "ROOM_NOT_AVAILABLE", "room_ID");
    }

    const { room, hotel } = roomContext;

    Object.assign(req.data, {
      traveler_ID: traveler.ID,
      checkInTime: hotel.checkInTime,
      checkOutTime: hotel.checkOutTime,
      paymentExpiresAt: addMinutes(req.timestamp, PAYMENT_HOLD_MINUTES),
      nightlyRate: room.pricePerNight,
      totalAmount: multiplyAmount(room.pricePerNight, stay.numberOfNights),
      currency_code: room.currency_code,
    });
  });
}

async function findTravelerProfile(Travelers, userId) {
  return SELECT.one.from(Travelers).columns("ID", "isActive").where({ userId });
}

async function findActiveRoomContext(entities, roomId) {
  const { Rooms, Hotels, Planets } = entities;

  const room = await SELECT.one
    .from(Rooms)
    .columns("hotel_ID", "pricePerNight", "currency_code", "isActive")
    .where({ ID: roomId })
    .forUpdate();

  if (!room?.isActive) return undefined;

  const hotel = await SELECT.one
    .from(Hotels)
    .columns("planet_ID", "checkInTime", "checkOutTime", "isActive")
    .where({ ID: room.hotel_ID });

  if (!hotel?.isActive) return undefined;

  const planet = await SELECT.one
    .from(Planets)
    .columns("isActive")
    .where({ ID: hotel.planet_ID });

  if (!planet?.isActive) return undefined;

  return { room, hotel };
}

async function hasBlockingBooking(
  Bookings,
  roomId,
  checkInDate,
  checkOutDate,
  referenceDate,
) {
  const booking = await SELECT.one.from(Bookings).columns("ID").where`
      room_ID = ${roomId}
      and checkInDate < ${checkOutDate}
      and checkOutDate > ${checkInDate}
      and (
        status = 'Confirmed'
        or (
          status = 'AwaitingPayment'
          and paymentExpiresAt > ${referenceDate}
        )
      )
    `;

  return booking != null;
}

function validateStayPeriod(
  checkInDateValue,
  checkOutDateValue,
  referenceDate,
) {
  const checkInDate = parseDateOnly(checkInDateValue);

  if (!checkInDate) {
    return {
      error: {
        status: 400,
        message: "INVALID_CHECK_IN_DATE",
        target: "checkInDate",
      },
    };
  }

  const checkOutDate = parseDateOnly(checkOutDateValue);

  if (!checkOutDate) {
    return {
      error: {
        status: 400,
        message: "INVALID_CHECK_OUT_DATE",
        target: "checkOutDate",
      },
    };
  }

  const currentDate = toUtcCalendarDate(referenceDate);

  if (checkInDate < currentDate) {
    return {
      error: {
        status: 400,
        message: "CHECK_IN_DATE_IN_PAST",
        target: "checkInDate",
      },
    };
  }

  const numberOfNights = calculateCalendarDaysBetween(
    checkInDate,
    checkOutDate,
  );

  if (numberOfNights <= 0) {
    return {
      error: {
        status: 400,
        message: "CHECK_OUT_AFTER_CHECK_IN",
        target: "checkOutDate",
      },
    };
  }

  if (numberOfNights > MAXIMUM_STAY_NIGHTS) {
    return {
      error: {
        status: 400,
        message: "MAXIMUM_STAY_EXCEEDED",
        target: "checkOutDate",
        args: [MAXIMUM_STAY_NIGHTS],
      },
    };
  }

  return { numberOfNights };
}
