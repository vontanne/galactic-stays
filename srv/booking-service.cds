using {galactic.stays as db} from '../db/schema';

@requires: 'Traveler'
service BookingService @(path: 'booking') {
  @restrict: [
    {grant: 'CREATE'},
    {
      grant: [
        'READ',
        'pay',
        'cancel'
      ],
      where: (traveler.userId = $user)
    }
  ]
  entity Bookings  as
    projection on db.Bookings {
      ID,

      @readonly
      traveler,

      @mandatory
      @Core.Immutable
      room,

      @mandatory
      @Core.Immutable
      checkInDate,

      @readonly
      checkInTime,

      @mandatory
      @Core.Immutable
      checkOutDate,

      @readonly
      checkOutTime,

      @mandatory
      @Core.Immutable
      @assert: (case
                  when guestCount > room.capacity
                       then 'GUEST_COUNT_EXCEEDS_CAPACITY'
                end)
      guestCount,

      @Core.Immutable
      specialRequests,

      @readonly
      status,
      statusCriticality,

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
      action pay()    returns Bookings;
      action cancel() returns Bookings;
    };

  @restrict: [{
    grant: 'READ',
    where: (userId = $user)
  }]
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

  @restrict: [
    {grant: 'CREATE'},
    {
      grant: [
        'READ',
        'UPDATE',
        'DELETE'
      ],
      where: (traveler.userId = $user)
    }
  ]
  entity Reviews   as
    projection on db.Reviews {
      ID,

      @mandatory
      @Core.Immutable
      hotel,

      @readonly
      traveler,

      @mandatory
      rating,

      comment,
      createdAt,
      modifiedAt
    };
}
