namespace galactic.stays;

using {
  cuid,
  managed,
  User,
  Currency
} from '@sap/cds/common';

using {
  galactic.stays.Species,
  galactic.stays.RoomType,
  galactic.stays.BookingStatus,
  galactic.stays.PaymentStatus
} from './types';

@assert.unique: {planetName: [name]}
entity Planets : cuid, managed {
  name     : String(100) not null;
  region   : String(100);
  climate  : String(255);
  terrain  : String(255);
  isActive : Boolean not null default true;
}

@assert.unique: {userId: [userId]}
entity Travelers : cuid, managed {
  userId      : User not null;
  firstName   : String(100) not null;
  lastName    : String(100) not null;
  dateOfBirth : Date not null;

  @assert.range: true
  species     : Species not null;

  birthPlanet : Association to one Planets not null;
  isActive    : Boolean not null default true;
}

@assert.unique: {hotelNamePerPlanet: [
  planet,
  name
]}
entity Hotels : cuid, managed {
  name         : String(150) not null;
  planet       : Association to one Planets not null;
  address      : String(255) not null;
  description  : String(1000);
  phoneNumber  : String(30) not null;
  checkInTime  : Time not null;
  checkOutTime : Time not null;
  rooms        : Composition of many Rooms
                   on rooms.hotel = $self;
  isActive     : Boolean not null default true;
}

@assert.unique: {roomNumberPerHotel: [
  hotel,
  number
]}
entity Rooms : cuid, managed {
  hotel         : Association to one Hotels not null;
  number        : String(20) not null;

  @assert.range: true
  type          : RoomType not null;

  @assert.range: [
    1,
    12
  ]
  capacity      : Integer not null;

  @assert.range: [
    (0),
    100000
  ]
  pricePerNight : Decimal(12, 2) not null;

  @assert.target
  currency      : Currency not null default 'GCR';

  isActive      : Boolean not null default true;
}

entity Bookings : cuid, managed {
  traveler         : Association to one Travelers not null;

  room             : Association to one Rooms not null;

  checkInDate      : Date not null;
  checkInTime      : Time not null;
  checkOutDate     : Date not null;
  checkOutTime     : Time not null;

  @assert.range: [
    1,
    12
  ]
  guestCount       : Integer not null;

  specialRequests  : String(1000);

  @assert.range: true
  status           : BookingStatus not null default #AwaitingPayment;

  @assert.range: true
  paymentStatus    : PaymentStatus not null default #Unpaid;

  paymentExpiresAt : Timestamp not null;

  @assert.range: [
    (0),
    100000
  ]
  nightlyRate      : Decimal(12, 2) not null;

  @assert.range: [
    (0),
    _
  ]
  totalAmount      : Decimal(12, 2) not null;

  @assert.target
  currency         : Currency not null;

  paidAt           : Timestamp;
  cancelledAt      : Timestamp;
  completedAt      : Timestamp;

  @assert.range: [
    0,
    _
  ]
  refundAmount     : Decimal(12, 2);

  @assert.range: [
    0,
    _
  ]
  cancellationFee  : Decimal(12, 2);
}
