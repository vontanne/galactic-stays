import cds from "@sap/cds";

import { registerBookingCreation } from "./booking/create-booking.js";
import { registerBookingPayment } from "./booking/pay-booking.js";

export class BookingService extends cds.ApplicationService {
  init() {
    registerBookingCreation(this);
    registerBookingPayment(this);

    return super.init();
  }
}
