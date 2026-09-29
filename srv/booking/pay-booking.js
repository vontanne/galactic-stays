import cds from "@sap/cds";

import { isDeadlineReached } from "./date-time.js";

const { SELECT, UPDATE } = cds.ql;

export function registerBookingPayment(service) {
  const { Bookings } = service.entities;
  const { Bookings: BookingRecords } = cds.entities("galactic.stays");

  service.on("pay", Bookings, async (req) => {
    const [{ ID: bookingId }] = req.params;

    const booking = await findBookingForUpdate(BookingRecords, bookingId);

    if (!booking) {
      req.reject(404, "BOOKING_NOT_FOUND");
    }

    if (booking.paymentStatus === "Paid") {
      req.reject(409, "BOOKING_ALREADY_PAID");
    }

    if (booking.status === "Expired") {
      req.reject(409, "PAYMENT_WINDOW_EXPIRED");
    }

    if (
      booking.status !== "AwaitingPayment" ||
      booking.paymentStatus !== "Unpaid"
    ) {
      req.reject(409, "BOOKING_NOT_PAYABLE");
    }

    if (isDeadlineReached(booking.paymentExpiresAt, req.timestamp)) {
      req.reject(409, "PAYMENT_WINDOW_EXPIRED");
    }

    await UPDATE(BookingRecords)
      .set({
        status: "Confirmed",
        paymentStatus: "Paid",
        paidAt: req.timestamp,
      })
      .where({ ID: bookingId });

    return SELECT.one.from(Bookings).where({ ID: bookingId });
  });
}

async function findBookingForUpdate(Bookings, bookingId) {
  return SELECT.one
    .from(Bookings)
    .columns("status", "paymentStatus", "paymentExpiresAt")
    .where({ ID: bookingId })
    .forUpdate();
}
