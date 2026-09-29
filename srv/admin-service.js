import cds from "@sap/cds";

import { registerAssignmentRules } from "./admin/assignment-rules.js";
import { registerHotelRules } from "./admin/hotel-rules.js";
import { registerPlanetRules } from "./admin/planet-rules.js";
import { registerPlanetSync } from "./admin/planet-sync.js";
import { registerRoomRules } from "./admin/room-rules.js";
import { registerUnpaidBookingExpiration } from "./booking/expire-unpaid-bookings.js";

export class AdminService extends cds.ApplicationService {
  init() {
    registerPlanetRules(this);
    registerHotelRules(this);
    registerRoomRules(this);
    registerAssignmentRules(this);
    registerPlanetSync(this);
    registerUnpaidBookingExpiration(this);

    return super.init();
  }
}
