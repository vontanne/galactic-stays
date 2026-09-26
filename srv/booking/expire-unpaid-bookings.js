import cds from "@sap/cds";

const { UPDATE } = cds.ql;

const EXPIRATION_JOB_INTERVAL_MS = 60_000;
const LOG = cds.log("booking-expiration");

export function registerUnpaidBookingExpiration(service) {
  const { Bookings: BookingRecords } = cds.entities("galactic.stays");

  service.on("expireUnpaidBookings", (req) => {
    return expireUnpaidBookings(BookingRecords, req.timestamp);
  });

  const job = cds.spawn(
    {
      user: cds.User.privileged,
      every: EXPIRATION_JOB_INTERVAL_MS,
    },
    async () => {
      const expiredCount = await expireUnpaidBookings(
        BookingRecords,
        cds.context.timestamp,
      );

      if (expiredCount > 0) {
        LOG.info(`Expired ${expiredCount} unpaid booking(s).`);
      }
    },
  );

  job.on("failed", (error) => {
    LOG.error("Failed to expire unpaid bookings.", error);
  });
}

async function expireUnpaidBookings(Bookings, referenceDate) {
  const expiredCount = await UPDATE(Bookings).set({ status: "Expired" }).where`
      status = 'AwaitingPayment'
      and paymentStatus = 'Unpaid'
      and paymentExpiresAt <= ${referenceDate}
    `;

  return expiredCount;
}
