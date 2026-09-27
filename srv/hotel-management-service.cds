using {galactic.stays as db} from '../db/schema';

@requires: [
  'HotelManager',
  'Admin'
]
service HotelManagementService @(path: 'hotel-management') {
  @readonly
  @restrict: [
    {
      grant: [
        'READ',
        'cancel',
        'complete'
      ],
      to   : 'HotelManager',
      where: (room.hotel.managementAssignment.userId = $user)
    },
    {
      grant: [
        'READ',
        'cancel',
        'complete'
      ],
      to   : 'Admin'
    }
  ]
  entity Bookings  as
    projection on db.Bookings {
      ID,
      traveler,
      room,
      checkInDate,
      checkInTime,
      checkOutDate,
      checkOutTime,
      guestCount,
      specialRequests,
      status,
      paymentStatus,
      paymentExpiresAt,
      nightlyRate,
      totalAmount,
      currency,
      paidAt,
      cancelledAt,
      completedAt,
      refundAmount,
      cancellationFee
    }
    actions {
      action cancel()   returns Bookings;
      action complete() returns Bookings;
    };

  @readonly
  @restrict: [
    {
      grant: 'READ',
      to   : 'HotelManager',
      where: (exists bookings[room.hotel.managementAssignment.userId = $user])
    },
    {
      grant: 'READ',
      to   : 'Admin'
    }
  ]
  entity Travelers as
    projection on db.Travelers {
      ID,
      firstName,
      lastName,
      bookings : redirected to db.Bookings
    };
}
