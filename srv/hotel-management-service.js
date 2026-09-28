import cds from "@sap/cds";

import { registerHotelBookingCancellation } from "./booking/cancel-booking.js";
import { registerBookingCompletion } from "./booking/complete-booking.js";
import { registerManagerRoomCreation } from "./hotel-management/room-creation.js";

export class HotelManagementService extends cds.ApplicationService {
  init() {
    registerHotelBookingCancellation(this);
    registerBookingCompletion(this);
    registerManagerRoomCreation(this);

    return super.init();
  }
}
