sap.ui.require(
  [
    "sap/fe/test/JourneyRunner",
    "galactic/stays/travelerbookings/test/integration/BookingJourney",
    "galactic/stays/travelerbookings/test/integration/pages/BookingsList",
    "galactic/stays/travelerbookings/test/integration/pages/BookingsObjectPage",
  ],
  function (JourneyRunner, BookingJourney, BookingsList, BookingsObjectPage) {
    "use strict";

    new JourneyRunner({
      launchUrl:
        sap.ui.require.toUrl("galactic/stays/travelerbookings") + "/index.html",
      launchParameters: { "sap-ui-language": "EN" },
    }).run(
      {
        pages: {
          onTheBookingsList: BookingsList,
          onTheBookingsObjectPage: BookingsObjectPage,
        },
      },
      BookingJourney.run,
    );
  },
);
