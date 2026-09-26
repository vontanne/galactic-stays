import cds from "@sap/cds";

import { registerBookingCreation } from "./booking/create-booking.js";

export class BookingService extends cds.ApplicationService {
  init() {
    registerBookingCreation(this);

    return super.init();
  }
}
