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

export function registerBookingCancellation(service) {
  const { Bookings } = service.entities;
  const { Bookings: BookingRecords } = cds.entities("galactic.stays");

  service.on("cancel", Bookings, (req) =>
    cancelBooking(req, Bookings, BookingRecords, determineTravelerCancellation),
  );

  service.on("cancelByAdmin", Bookings, (req) =>
    cancelBooking(req, Bookings, BookingRecords, determineAdminCancellation),
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
    req.reject({
      status: 404,
      code: "BOOKING_NOT_FOUND",
      message: "Booking was not found.",
    });
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
      "totalAmount",
    )
    .where({ ID: bookingId })
    .forUpdate();
}

function determineTravelerCancellation(booking, referenceDate) {
  if (booking.status === "Cancelled") {
    return {
      error: {
        status: 409,
        code: "BOOKING_ALREADY_CANCELLED",
        message: "Booking has already been cancelled.",
      },
    };
  }

  if (booking.status === "Expired") {
    return {
      error: {
        status: 409,
        code: "PAYMENT_WINDOW_EXPIRED",
        message: "The payment window has expired.",
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
      code: "BOOKING_NOT_CANCELLABLE",
      message: "Booking is not in a cancellable state.",
    },
  };
}

function determineAdminCancellation(booking) {
  if (booking.status === "Cancelled") {
    return {
      error: {
        status: 409,
        code: "BOOKING_ALREADY_CANCELLED",
        message: "Booking has already been cancelled.",
      },
    };
  }

  if (
    booking.status === "AwaitingPayment" &&
    booking.paymentStatus === "Unpaid"
  ) {
    return createUnpaidCancellation();
  }

  if (booking.status === "Confirmed" && booking.paymentStatus === "Paid") {
    return createFullRefundCancellation(booking.totalAmount);
  }

  return {
    error: {
      status: 409,
      code: "BOOKING_NOT_CANCELLABLE",
      message: "Booking is not in a cancellable state.",
    },
  };
}

function determineUnpaidCancellation(booking, referenceDate) {
  if (booking.paymentStatus !== "Unpaid") {
    return {
      error: {
        status: 409,
        code: "BOOKING_NOT_CANCELLABLE",
        message: "Booking is not in a cancellable state.",
      },
    };
  }

  if (isDeadlineReached(booking.paymentExpiresAt, referenceDate)) {
    return {
      error: {
        status: 409,
        code: "PAYMENT_WINDOW_EXPIRED",
        message: "The payment window has expired.",
      },
    };
  }

  return createUnpaidCancellation();
}

function determinePaidCancellation(booking, referenceDate) {
  const currentDate = toUtcCalendarDate(referenceDate);
  const checkInDate = parseDateOnly(booking.checkInDate);

  if (!checkInDate) {
    throw new TypeError("Stored booking check-in date is invalid.");
  }

  const daysUntilCheckIn = calculateCalendarDaysBetween(
    currentDate,
    checkInDate,
  );

  if (daysUntilCheckIn <= 0) {
    return {
      error: {
        status: 409,
        code: "CANCELLATION_PERIOD_ENDED",
        message: "A booking cannot be cancelled on or after its check-in date.",
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
