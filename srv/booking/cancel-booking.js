import cds from "@sap/cds";

import {
  calculateCalendarDaysBetween,
  isDeadlineReached,
  parseDateOnly,
  toUtcCalendarDate,
} from "./date-time.js";
import { calculatePercentageAmount, subtractAmounts } from "./money.js";

const { SELECT, UPDATE } = cds.ql;

const FREE_CANCELLATION_DAYS = 3;
const LATE_CANCELLATION_FEE_PERCENTAGE = 10;

export function registerTravelerBookingCancellation(service) {
  registerCancellationHandler(service, determineTravelerCancellation);
}

export function registerHotelBookingCancellation(service) {
  registerCancellationHandler(service, determineHotelCancellation);
}

function registerCancellationHandler(service, determineCancellation) {
  const { Bookings } = service.entities;
  const { Bookings: BookingRecords } = cds.entities("galactic.stays");

  service.on("cancel", Bookings, (req) =>
    cancelBooking(req, Bookings, BookingRecords, determineCancellation),
  );
}

async function cancelBooking(
  req,
  Bookings,
  BookingRecords,
  determineCancellation,
) {
  const [{ ID: bookingId }] = req.params;

  const booking = await findBookingForUpdate(BookingRecords, bookingId);

  if (!booking) {
    req.reject(404, "BOOKING_NOT_FOUND");
  }

  const cancellation = determineCancellation(booking, req.timestamp);

  if (cancellation.error) req.reject(cancellation.error);

  await UPDATE(BookingRecords)
    .set({
      ...cancellation.changes,
      status: "Cancelled",
      cancelledAt: req.timestamp,
    })
    .where({ ID: bookingId });

  return SELECT.one.from(Bookings).where({ ID: bookingId });
}

async function findBookingForUpdate(Bookings, bookingId) {
  return SELECT.one
    .from(Bookings)
    .columns(
      "status",
      "paymentStatus",
      "paymentExpiresAt",
      "checkInDate",
      "checkOutDate",
      "totalAmount",
    )
    .where({ ID: bookingId })
    .forUpdate();
}

function determineTravelerCancellation(booking, referenceDate) {
  return determineCancellation(
    booking,
    referenceDate,
    determineTravelerPaidCancellation,
  );
}

function determineHotelCancellation(booking, referenceDate) {
  return determineCancellation(
    booking,
    referenceDate,
    determineHotelPaidCancellation,
  );
}

function determineCancellation(
  booking,
  referenceDate,
  determinePaidCancellation,
) {
  if (booking.status === "Cancelled") {
    return {
      error: {
        status: 409,
        message: "BOOKING_ALREADY_CANCELLED",
      },
    };
  }

  if (booking.status === "Expired") {
    return {
      error: {
        status: 409,
        message: "PAYMENT_WINDOW_EXPIRED",
      },
    };
  }

  if (booking.status === "AwaitingPayment") {
    return determineUnpaidCancellation(booking, referenceDate);
  }

  if (booking.status === "Confirmed" && booking.paymentStatus === "Paid") {
    return determinePaidCancellation(booking, referenceDate);
  }

  return {
    error: {
      status: 409,
      message: "BOOKING_NOT_CANCELLABLE",
    },
  };
}

function determineUnpaidCancellation(booking, referenceDate) {
  if (booking.paymentStatus !== "Unpaid") {
    return {
      error: {
        status: 409,
        message: "BOOKING_NOT_CANCELLABLE",
      },
    };
  }

  if (isDeadlineReached(booking.paymentExpiresAt, referenceDate)) {
    return {
      error: {
        status: 409,
        message: "PAYMENT_WINDOW_EXPIRED",
      },
    };
  }

  return createUnpaidCancellation();
}

function determineTravelerPaidCancellation(booking, referenceDate) {
  const daysUntilCheckIn = calculateDaysUntil(
    booking.checkInDate,
    referenceDate,
  );

  if (daysUntilCheckIn <= 0) {
    return {
      error: {
        status: 409,
        message: "CANCELLATION_PERIOD_ENDED",
      },
    };
  }

  if (daysUntilCheckIn >= FREE_CANCELLATION_DAYS) {
    return createFullRefundCancellation(booking.totalAmount);
  }

  const cancellationFee = calculatePercentageAmount(
    booking.totalAmount,
    LATE_CANCELLATION_FEE_PERCENTAGE,
  );

  return {
    changes: {
      paymentStatus: "PartiallyRefunded",
      refundAmount: subtractAmounts(booking.totalAmount, cancellationFee),
      cancellationFee,
    },
  };
}

function determineHotelPaidCancellation(booking, referenceDate) {
  const daysUntilCheckOut = calculateDaysUntil(
    booking.checkOutDate,
    referenceDate,
  );

  if (daysUntilCheckOut <= 0) {
    return {
      error: {
        status: 409,
        message: "CANCELLATION_PERIOD_ENDED",
      },
    };
  }

  return createFullRefundCancellation(booking.totalAmount);
}

function calculateDaysUntil(dateValue, referenceDate) {
  const date = parseDateOnly(dateValue);

  if (!date) {
    throw new TypeError(`Stored booking date is invalid: ${dateValue}`);
  }

  return calculateCalendarDaysBetween(toUtcCalendarDate(referenceDate), date);
}

function createUnpaidCancellation() {
  return {
    changes: {
      paymentStatus: "Unpaid",
      refundAmount: null,
      cancellationFee: null,
    },
  };
}

function createFullRefundCancellation(totalAmount) {
  return {
    changes: {
      paymentStatus: "Refunded",
      refundAmount: totalAmount,
      cancellationFee: "0.00",
    },
  };
}
