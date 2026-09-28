import cds from "@sap/cds";

import { registerAssignmentRules } from "./admin/assignment-rules.js";
import { registerHotelRules } from "./admin/hotel-rules.js";
import { registerPlanetRules } from "./admin/planet-rules.js";
import { registerRoomRules } from "./admin/room-rules.js";

export class AdminService extends cds.ApplicationService {
  init() {
    registerPlanetRules(this);
    registerHotelRules(this);
    registerRoomRules(this);
    registerAssignmentRules(this);

    return super.init();
  }
}
