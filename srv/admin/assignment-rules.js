import cds from "@sap/cds";

import { otherRecordExists, withStoredValues } from "./records.js";

export function registerAssignmentRules(service) {
  const { HotelManagementAssignments } = service.entities;
  const { HotelManagementAssignments: AssignmentRecords } =
    cds.entities("galactic.stays");

  service.before(
    ["CREATE", "UPDATE"],
    HotelManagementAssignments,
    async (req) => {
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
    },
  );
}
