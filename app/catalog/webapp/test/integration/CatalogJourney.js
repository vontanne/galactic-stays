sap.ui.define(["sap/ui/test/opaQunit"], function (opaTest) {
  "use strict";

  return {
    run: function () {
      opaTest("Shows all active hotels", function (Given, When, Then) {
        Given.iStartMyApp();

        Then.onTheHotelsList.iSeeThisPage();
        Then.onTheHotelsList.onTable().iCheckRows(3);
      });

      opaTest(
        "Finds a hotel with the table search",
        function (Given, When, Then) {
          When.onTheHotelsList.onTable().iChangeSearchField("Theed");

          Then.onTheHotelsList.onTable().iCheckRows(1);
          Then.onTheHotelsList
            .onTable()
            .iCheckRows({ Hotel: "Theed Royal Hotel" });
        },
      );

      opaTest("Opens a hotel with its rooms", function (Given, When, Then) {
        When.onTheHotelsList
          .onTable()
          .iPressRow({ Hotel: "Theed Royal Hotel" });

        Then.onTheHotelsObjectPage.iSeeThisPage();
        Then.onTheHotelsObjectPage
          .onHeader()
          .iCheckTitle("Theed Royal Hotel", "Naboo");
        Then.onTheHotelsObjectPage.onTable({ property: "rooms" }).iCheckRows(2);
      });

      opaTest("Closes the app", function (Given) {
        Given.iTearDownMyApp();
      });
    },
  };
});
