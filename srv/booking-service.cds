using {galactic.stays as db} from '../db/schema';

@requires: [
  'Traveler',
  'Admin'
]
service BookingService @(path: 'booking') {
  @restrict: [
    {
      grant: 'CREATE',
      to   : 'Traveler'
    },
    {
      grant: [
        'READ',
        'pay',
        'cancel'
      ],
      to   : 'Traveler',
      where: (traveler.userId = $user)
    },
    {
      grant: [
        'READ',
        'cancelByAdmin',
        'complete'
      ],
      to   : 'Admin'
    }
  ]
  entity Bookings  as
    projection on db.Bookings {
      ID,

      @readonly
      traveler,

      @mandatory
      @Core.Immutable
      @assert.target
      room,

      @mandatory
      @Core.Immutable
      checkInDate,

      @readonly
      checkInTime,

      @mandatory
      @Core.Immutable
      @assert: (case
                  when checkOutDate <= checkInDate
                       then 'Check-out date must be after check-in date.'
                end)
      checkOutDate,

      @readonly
      checkOutTime,

      @mandatory
      @Core.Immutable
      @assert: (case
                  when guestCount > room.capacity
                       then 'Guest count exceeds room capacity.'
                end)
      guestCount,

      @Core.Immutable
      specialRequests,

      @readonly
      status,

      @readonly
      paymentStatus,

      @readonly
      paymentExpiresAt,

      @readonly
      nightlyRate,

      @readonly
      totalAmount,

      @readonly
      currency,

      @readonly
      paidAt,

      @readonly
      cancelledAt,

      @readonly
      completedAt,

      @readonly
      refundAmount,

      @readonly
      cancellationFee
    }
    actions {
      action pay()           returns Bookings;
      action cancel()        returns Bookings;
      action cancelByAdmin() returns Bookings;
      action complete()      returns Bookings;
    };

  @restrict: [
    {
      grant: 'READ',
      to   : 'Traveler',
      where: (userId = $user)
    },
    {
      grant: 'READ',
      to   : 'Admin'
    }
  ]
  entity Travelers as
    projection on db.Travelers {
      ID,
      userId,
      firstName,
      lastName,
      isActive
    };

  @readonly
  entity Planets   as
    projection on db.Planets {
      ID,
      name
    }
    where
      isActive = true;

  @readonly
  entity Hotels    as
    projection on db.Hotels {
      ID,
      name,
      planet,
      address,
      checkInTime,
      checkOutTime,
      rooms
    }
    where
          isActive        = true
      and planet.isActive = true;

  @readonly
  entity Rooms     as
    projection on db.Rooms {
      ID,
      hotel,
      number,
      type,
      capacity,
      pricePerNight,
      currency
    }
    where
          isActive              = true
      and hotel.isActive        = true
      and hotel.planet.isActive = true;

  @requires: 'Admin'
  action expireUnpaidBookings() returns Integer;
}
