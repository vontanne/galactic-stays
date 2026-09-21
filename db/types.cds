namespace galactic.stays;

@assert.range
type Species       : String(20) enum {
  Human;
  Wookiee;
  TwiLek;
  Rodian;
  Zabrak;
  Togruta;
  MonCalamari;
};

@assert.range
type RoomType      : String(20) enum {
  Standard;
  Deluxe;
  Suite;
  Family;
  Diplomatic;
};

@assert.range
type BookingStatus : String(20) enum {
  AwaitingPayment;
  Confirmed;
  Cancelled;
  Expired;
  Completed;
};

@assert.range
type PaymentStatus : String(20) enum {
  Unpaid;
  Paid;
  Refunded;
};
