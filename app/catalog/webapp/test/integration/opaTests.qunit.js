sap.ui.require(
  [
    "sap/fe/test/JourneyRunner",
    "galactic/stays/catalog/test/integration/CatalogJourney",
    "galactic/stays/catalog/test/integration/pages/HotelsList",
    "galactic/stays/catalog/test/integration/pages/HotelsObjectPage",
  ],
  function (JourneyRunner, CatalogJourney, HotelsList, HotelsObjectPage) {
    "use strict";

    new JourneyRunner({
      launchUrl: sap.ui.require.toUrl("galactic/stays/catalog") + "/index.html",
      launchParameters: { "sap-ui-language": "EN" },
    }).run(
      {
        pages: {
          onTheHotelsList: HotelsList,
          onTheHotelsObjectPage: HotelsObjectPage,
        },
      },
      CatalogJourney.run,
    );
  },
);
