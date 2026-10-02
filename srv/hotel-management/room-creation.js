import cds from "@sap/cds";

import { validateRoomNumber } from "../admin/room-rules.js";

const { SELECT } = cds.ql;

export function registerManagerRoomCreation(service) {
  const { Rooms } = service.entities;
  const { HotelManagementAssignments: AssignmentRecords } =
    cds.entities("galactic.stays");

  service.before("CREATE", Rooms, async (req) => {
    const assignment = await SELECT.one
      .from(AssignmentRecords)
      .columns(
        "hotel_ID",
        "hotel.isActive as hotelIsActive",
        "hotel.planet.isActive as planetIsActive",
      )
      .where({ userId: req.user.id });

    if (!assignment) {
      req.reject(403, "HOTEL_NOT_ASSIGNED");
    }

    if (!assignment.hotelIsActive || !assignment.planetIsActive) {
      req.reject(409, "HOTEL_INACTIVE");
    }

    req.data.hotel_ID = assignment.hotel_ID;

    await validateRoomNumber(req);
  });
}
