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
        req.reject({
          status: 409,
          code: "HOTEL_ALREADY_MANAGED",
          message: "This hotel already has a manager.",
          target: "hotel_ID",
        });
      }

      const managerIsAssigned = await otherRecordExists(
        AssignmentRecords,
        { userId: assignment.userId },
        req.data.ID,
      );

      if (managerIsAssigned) {
        req.reject({
          status: 409,
          code: "MANAGER_ALREADY_ASSIGNED",
          message: "This manager is already assigned to a hotel.",
          target: "userId",
        });
      }

      const userIsTraveler = await recordExists(TravelerRecords, {
        userId: assignment.userId,
      });

      if (userIsTraveler) {
        req.reject({
          status: 409,
          code: "MANAGER_IS_TRAVELER",
          message: "A traveler cannot be assigned as a hotel manager.",
          target: "userId",
        });
      }
    },
  );
}
