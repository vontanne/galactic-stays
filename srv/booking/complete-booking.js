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
      req.reject(404, "BOOKING_NOT_FOUND");
    }

    if (booking.status === "Completed") {
      req.reject(409, "BOOKING_ALREADY_COMPLETED");
    }

    if (booking.status !== "Confirmed" || booking.paymentStatus !== "Paid") {
      req.reject(409, "BOOKING_NOT_COMPLETABLE");
    }

    const checkOutDate = parseDateOnly(booking.checkOutDate);

    if (!checkOutDate) {
      throw new TypeError("Stored booking check-out date is invalid.");
    }

    if (toUtcCalendarDate(req.timestamp) < checkOutDate) {
      req.reject(409, "STAY_NOT_FINISHED");
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
