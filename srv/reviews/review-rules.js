import cds from "@sap/cds";

const { SELECT } = cds.ql;

export function registerReviewRules(service) {
  const { Reviews } = service.entities;
  const {
    Travelers: TravelerRecords,
    Bookings: BookingRecords,
    Reviews: ReviewRecords,
  } = cds.entities("galactic.stays");

  service.before("CREATE", Reviews, async (req) => {
    const traveler = await findActiveTraveler(req, TravelerRecords);
    const hotelId = req.data.hotel_ID;

    const stayIsCompleted = await completedStayExists(
      BookingRecords,
      traveler.ID,
      hotelId,
    );

    if (!stayIsCompleted) {
      req.reject({
        status: 409,
        code: "COMPLETED_STAY_REQUIRED",
        message: "Only guests with a completed stay can review this hotel.",
        target: "hotel_ID",
      });
    }

    const reviewExists = await SELECT.one
      .from(ReviewRecords)
      .columns("ID")
      .where({ traveler_ID: traveler.ID, hotel_ID: hotelId });

    if (reviewExists) {
      req.reject({
        status: 409,
        code: "REVIEW_ALREADY_EXISTS",
        message:
          "You have already reviewed this hotel. Edit your review instead.",
        target: "hotel_ID",
      });
    }

    req.data.traveler_ID = traveler.ID;
    normalizeComment(req.data);
  });

  service.before("UPDATE", Reviews, async (req) => {
    await findActiveTraveler(req, TravelerRecords);
    normalizeComment(req.data);
  });
}

async function findActiveTraveler(req, Travelers) {
  const traveler = await SELECT.one
    .from(Travelers)
    .columns("ID", "isActive")
    .where({ userId: req.user.id });

  if (!traveler) {
    req.reject({
      status: 409,
      code: "TRAVELER_PROFILE_REQUIRED",
      message: "Create a traveler profile before reviewing a hotel.",
    });
  }

  if (!traveler.isActive) {
    req.reject({
      status: 403,
      code: "TRAVELER_INACTIVE",
      message: "An inactive traveler cannot write reviews.",
    });
  }

  return traveler;
}

async function completedStayExists(Bookings, travelerId, hotelId) {
  const booking = await SELECT.one.from(Bookings).columns("ID").where`
      traveler_ID = ${travelerId}
      and status = 'Completed'
      and room.hotel_ID = ${hotelId}
    `;

  return booking != null;
}

function normalizeComment(data) {
  if (typeof data.comment !== "string") return;

  const comment = data.comment.trim();
  data.comment = comment === "" ? null : comment;
}
