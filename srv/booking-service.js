import cds from "@sap/cds";

import { registerTravelerBookingCancellation } from "./booking/cancel-booking.js";
import { registerBookingCreation } from "./booking/create-booking.js";
import { registerUnpaidBookingExpiration } from "./booking/expire-unpaid-bookings.js";
import { registerBookingPayment } from "./booking/pay-booking.js";

export class BookingService extends cds.ApplicationService {
  init() {
    registerBookingCreation(this);
    registerBookingPayment(this);
    registerTravelerBookingCancellation(this);
    registerUnpaidBookingExpiration(this);

    return super.init();
  }
}
