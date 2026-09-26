import cds from "@sap/cds";

const { SELECT, UPDATE } = cds.ql;

export function registerBookingPayment(service) {
  const { Bookings } = service.entities;
  const { Bookings: BookingRecords } = cds.entities("galactic.stays");

  service.on("pay", Bookings, async (req) => {
    const [{ ID: bookingId }] = req.params;

    const booking = await findBookingForUpdate(BookingRecords, bookingId);

    if (!booking) {
      req.reject({
        status: 404,
        code: "BOOKING_NOT_FOUND",
        message: "Booking was not found.",
      });
    }

    if (booking.paymentStatus === "Paid") {
      req.reject({
        status: 409,
        code: "BOOKING_ALREADY_PAID",
        message: "Booking has already been paid.",
      });
    }

    if (booking.status === "Expired") {
      req.reject({
        status: 409,
        code: "PAYMENT_WINDOW_EXPIRED",
        message: "The payment window has expired.",
      });
    }

    if (
      booking.status !== "AwaitingPayment" ||
      booking.paymentStatus !== "Unpaid"
    ) {
      req.reject({
        status: 409,
        code: "BOOKING_NOT_PAYABLE",
        message: "Booking is not in a payable state.",
      });
    }

    if (hasPaymentWindowExpired(booking.paymentExpiresAt, req.timestamp)) {
      req.reject({
        status: 409,
        code: "PAYMENT_WINDOW_EXPIRED",
        message: "The payment window has expired.",
      });
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

function hasPaymentWindowExpired(paymentExpiresAt, referenceDate) {
  return new Date(paymentExpiresAt).getTime() <= referenceDate.getTime();
}
