sap.ui.define(["sap/ui/test/opaQunit"], function (opaTest) {
  "use strict";

  const checkInDate = displayDate(40);
  const checkOutDate = displayDate(42);
  const newBooking = {
    Room: "501",
    "Check-In Date": checkInDate,
    Status: "AwaitingPayment",
  };
  const pay = { service: "BookingService", action: "pay" };
  const cancel = { service: "BookingService", action: "cancel" };
  const payment = { section: "payment", fieldGroup: "payment" };

  return {
    run: function () {
      opaTest("Shows the traveler's bookings", function (Given, When, Then) {
        Given.iStartMyApp();

        Then.onTheBookingsList.iSeeThisPage();
        Then.onTheBookingsList.onTable().iCheckRows({
          Hotel: "Mos Espa Grand",
          Status: "Completed",
        });
      });

      opaTest(
        "Books a room through the creation dialog",
        function (Given, When, Then) {
          When.onTheBookingsList.onTable().iExecuteCreate();
          When.onTheBookingsList
            .onCreateDialog()
            .iChangeDialogField(bookingField("room_ID"), "501");
          When.onTheBookingsList
            .onCreateDialog()
            .iChangeDialogField(bookingField("checkInDate"), checkInDate);
          When.onTheBookingsList
            .onCreateDialog()
            .iChangeDialogField(bookingField("checkOutDate"), checkOutDate);
          When.onTheBookingsList
            .onCreateDialog()
            .iChangeDialogField(bookingField("guestCount"), "2");
          When.onTheBookingsList.onCreateDialog().iConfirm();

          Then.onTheBookingsList.onTable().iCheckRows(newBooking, 1);
        },
      );

      opaTest("Pays the new booking", function (Given, When, Then) {
        When.onTheBookingsList.onTable().iPressRow(newBooking);
        Then.onTheBookingsObjectPage.iSeeThisPage();
        Then.onTheBookingsObjectPage
          .onForm(payment)
          .iCheckField({ property: "paymentStatus" }, "Unpaid");
        Then.onTheBookingsObjectPage.onHeader().iCheckAction(pay, {
          enabled: true,
        });

        When.onTheBookingsObjectPage.onHeader().iExecuteAction(pay);

        Then.onTheBookingsObjectPage
          .onForm(payment)
          .iCheckField({ property: "paymentStatus" }, "Paid");
        Then.onTheBookingsObjectPage.onHeader().iCheckAction(pay, {
          enabled: false,
        });
      });

      opaTest(
        "Cancels the paid booking with a full refund",
        function (Given, When, Then) {
          When.onTheBookingsObjectPage.onHeader().iExecuteAction(cancel);

          Then.onTheBookingsObjectPage
            .onForm(payment)
            .iCheckField({ property: "paymentStatus" }, "Refunded");
          Then.onTheBookingsObjectPage.onHeader().iCheckAction(cancel, {
            enabled: false,
          });
        },
      );

      opaTest("Closes the app", function (Given) {
        Given.iTearDownMyApp();
      });
    },
  };

  function bookingField(property) {
    return { property: `Bookings/${property}` };
  }

  function displayDate(daysFromToday) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + daysFromToday);

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }
});
