import cds from "@sap/cds";

import { parseDateOnly, toUtcCalendarDate } from "./date-time.js";

const { SELECT, UPDATE } = cds.ql;

export function registerBookingCompletion(service) {
  const { Bookings } = service.entities;
  const { Bookings: BookingRecords } = cds.entities("galactic.stays");

  service.on("complete", Bookings, async (req) => {
    const [{ ID: bookingId }] = req.params;

    const booking = await findBookingForUpdate(BookingRecords, bookingId);

    if (!booking) {
      req.reject({
        status: 404,
        code: "BOOKING_NOT_FOUND",
        message: "Booking was not found.",
      });
    }

    if (booking.status === "Completed") {
      req.reject({
        status: 409,
        code: "BOOKING_ALREADY_COMPLETED",
        message: "Booking has already been completed.",
      });
    }

    if (booking.status !== "Confirmed" || booking.paymentStatus !== "Paid") {
      req.reject({
        status: 409,
        code: "BOOKING_NOT_COMPLETABLE",
        message: "Only confirmed and paid bookings can be completed.",
      });
    }

    const checkOutDate = parseDateOnly(booking.checkOutDate);

    if (!checkOutDate) {
      throw new TypeError("Stored booking check-out date is invalid.");
    }

    if (toUtcCalendarDate(req.timestamp) < checkOutDate) {
      req.reject({
        status: 409,
        code: "STAY_NOT_FINISHED",
        message:
          "A booking can only be completed on or after its check-out date.",
      });
    }

    await UPDATE(BookingRecords)
      .set({
        status: "Completed",
        completedAt: req.timestamp,
      })
      .where({ ID: bookingId });

    return SELECT.one.from(Bookings).where({ ID: bookingId });
  });
}

async function findBookingForUpdate(Bookings, bookingId) {
  return SELECT.one
    .from(Bookings)
    .columns("status", "paymentStatus", "checkOutDate")
    .where({ ID: bookingId })
    .forUpdate();
}
