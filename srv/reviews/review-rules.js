import cds from "@sap/cds";

const { SELECT } = cds.ql;

export function registerReviewRules(service) {
  const { Reviews } = service.entities;
  const {
    Travelers: TravelerRecords,
    Bookings: BookingRecords,
    Hotels: HotelRecords,
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
      req.reject(409, "COMPLETED_STAY_REQUIRED", "hotel_ID");
    }

    const hotelIsActive = await activeHotelExists(HotelRecords, hotelId);

    if (!hotelIsActive) {
      req.reject(409, "HOTEL_INACTIVE", "hotel_ID");
    }

    const reviewExists = await SELECT.one
      .from(ReviewRecords)
      .columns("ID")
      .where({ traveler_ID: traveler.ID, hotel_ID: hotelId });

    if (reviewExists) {
      req.reject(409, "REVIEW_ALREADY_EXISTS", "hotel_ID");
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
    req.reject(409, "TRAVELER_PROFILE_REQUIRED");
  }

  if (!traveler.isActive) {
    req.reject(403, "TRAVELER_INACTIVE");
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

async function activeHotelExists(Hotels, hotelId) {
  const hotel = await SELECT.one.from(Hotels).columns("ID").where`
      ID = ${hotelId}
      and isActive = true
      and planet.isActive = true
    `;

  return hotel != null;
}

function normalizeComment(data) {
  if (typeof data.comment !== "string") return;

  const comment = data.comment.trim();
  data.comment = comment === "" ? null : comment;
}
