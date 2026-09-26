import cds from "@sap/cds";

const { SELECT } = cds.ql;

const MAXIMUM_STAY_NIGHTS = 30;
const PAYMENT_HOLD_MINUTES = 15;
const MILLISECONDS_PER_DAY = 86_400_000;
const MINOR_UNIT_FACTOR = 100n;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export class BookingService extends cds.ApplicationService {
  init() {
    const { Bookings } = this.entities;
    const {
      Bookings: BookingRecords,
      Travelers,
      Rooms,
      Hotels,
      Planets,
    } = cds.entities("galactic.stays");

    this.before("CREATE", Bookings, async (req) => {
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
        req.reject({
          status: 409,
          code: "TRAVELER_PROFILE_REQUIRED",
          message: "Create a traveler profile before booking a room.",
        });
      }

      if (!traveler.isActive) {
        req.reject({
          status: 403,
          code: "TRAVELER_INACTIVE",
          message: "An inactive traveler cannot create bookings.",
        });
      }

      const roomContext = await findActiveRoomContext(
        { Rooms, Hotels, Planets },
        roomId,
      );

      if (!roomContext) {
        req.reject({
          status: 400,
          code: "INVALID_ROOM",
          message: "Room must belong to an active hotel on an active planet.",
          target: "room_ID",
        });
      }

      const roomIsUnavailable = await hasBlockingBooking(
        BookingRecords,
        roomId,
        checkInDateValue,
        checkOutDateValue,
        req.timestamp,
      );

      if (roomIsUnavailable) {
        req.reject({
          status: 409,
          code: "ROOM_NOT_AVAILABLE",
          message: "Room is not available for the selected dates.",
          target: "room_ID",
        });
      }

      const { room, hotel } = roomContext;

      Object.assign(req.data, {
        traveler_ID: traveler.ID,
        checkInTime: hotel.checkInTime,
        checkOutTime: hotel.checkOutTime,
        paymentExpiresAt: addMinutes(req.timestamp, PAYMENT_HOLD_MINUTES),
        nightlyRate: room.pricePerNight,
        totalAmount: calculateTotalAmount(
          room.pricePerNight,
          stay.numberOfNights,
        ),
        currency_code: room.currency_code,
      });
    });

    return super.init();
  }
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
        code: "INVALID_CHECK_IN_DATE",
        message: "Check-in date must be a valid ISO date.",
        target: "checkInDate",
      },
    };
  }

  const checkOutDate = parseDateOnly(checkOutDateValue);

  if (!checkOutDate) {
    return {
      error: {
        status: 400,
        code: "INVALID_CHECK_OUT_DATE",
        message: "Check-out date must be a valid ISO date.",
        target: "checkOutDate",
      },
    };
  }

  const currentDate = getUtcCalendarDate(referenceDate);

  if (checkInDate < currentDate) {
    return {
      error: {
        status: 400,
        code: "CHECK_IN_DATE_IN_PAST",
        message: "Check-in date cannot be in the past.",
        target: "checkInDate",
      },
    };
  }

  const numberOfNights = calculateNumberOfNights(checkInDate, checkOutDate);

  if (numberOfNights <= 0) {
    return {
      error: {
        status: 400,
        code: "CHECK_OUT_AFTER_CHECK_IN",
        message: "Check-out date must be after check-in date.",
        target: "checkOutDate",
      },
    };
  }

  if (numberOfNights > MAXIMUM_STAY_NIGHTS) {
    return {
      error: {
        status: 400,
        code: "MAXIMUM_STAY_EXCEEDED",
        message: `A booking cannot exceed ${MAXIMUM_STAY_NIGHTS} nights.`,
        target: "checkOutDate",
      },
    };
  }

  return { numberOfNights };
}

function parseDateOnly(value) {
  if (typeof value !== "string") return undefined;

  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return undefined;

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(Date.UTC(year, month - 1, day));

  const dateIsValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return dateIsValid ? date : undefined;
}

function getUtcCalendarDate(timestamp) {
  return new Date(
    Date.UTC(
      timestamp.getUTCFullYear(),
      timestamp.getUTCMonth(),
      timestamp.getUTCDate(),
    ),
  );
}

function calculateNumberOfNights(checkInDate, checkOutDate) {
  return (checkOutDate - checkInDate) / MILLISECONDS_PER_DAY;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

function calculateTotalAmount(nightlyRate, numberOfNights) {
  const nightlyRateInMinorUnits = parseMinorUnits(nightlyRate);
  const totalInMinorUnits = nightlyRateInMinorUnits * BigInt(numberOfNights);

  return formatMinorUnits(totalInMinorUnits);
}

function parseMinorUnits(amount) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(amount));

  if (!match) {
    throw new TypeError(`Invalid monetary amount: ${amount}`);
  }

  const [, wholeUnits, fraction = ""] = match;
  const minorUnits = fraction.padEnd(2, "0");

  return BigInt(wholeUnits) * MINOR_UNIT_FACTOR + BigInt(minorUnits);
}

function formatMinorUnits(amount) {
  const wholeUnits = amount / MINOR_UNIT_FACTOR;
  const minorUnits = amount % MINOR_UNIT_FACTOR;

  return `${wholeUnits}.${minorUnits.toString().padStart(2, "0")}`;
}
