import cds from "@sap/cds";

import {
  otherRecordExists,
  recordExists,
  withStoredValues,
} from "./records.js";

export function registerAssignmentRules(service) {
  const { HotelManagementAssignments } = service.entities;
  const {
    HotelManagementAssignments: AssignmentRecords,
    Travelers: TravelerRecords,
  } = cds.entities("galactic.stays");

  service.before(
    ["CREATE", "UPDATE"],
    HotelManagementAssignments,
    async (req) => {
      if (Object.hasOwn(req.data, "userId")) {
        req.data.userId = req.data.userId.trim();
      }

      const assignment = await withStoredValues(req, AssignmentRecords, [
        "hotel_ID",
        "userId",
      ]);

      const hotelIsManaged = await otherRecordExists(
        AssignmentRecords,
        { hotel_ID: assignment.hotel_ID },
        req.data.ID,
      );

      if (hotelIsManaged) {
        req.reject(409, "HOTEL_ALREADY_MANAGED", "hotel_ID");
      }

      const managerIsAssigned = await otherRecordExists(
        AssignmentRecords,
        { userId: assignment.userId },
        req.data.ID,
      );

      if (managerIsAssigned) {
        req.reject(409, "MANAGER_ALREADY_ASSIGNED", "userId");
      }

      const userIsTraveler = await recordExists(TravelerRecords, {
        userId: assignment.userId,
      });

      if (userIsTraveler) {
        req.reject(409, "MANAGER_IS_TRAVELER", "userId");
      }
    },
  );
}
