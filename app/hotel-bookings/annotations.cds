using HotelManagementService from '../../srv/hotel-management-service';

annotate HotelManagementService.Bookings with @(
  UI.HeaderInfo            : {
    TypeName      : '{i18n>Booking}',
    TypeNamePlural: '{i18n>Bookings}',
    Title         : {Value: room.hotel.name},
    Description   : {Value: checkInDate}
  },
  UI.SelectionFields       : [
    status,
    checkInDate
  ],
  UI.LineItem              : [
    {
      Value: room.hotel.name,
      Label: '{i18n>Hotel}'
    },
    {Value: room_ID},
    {
      Value: traveler.lastName,
      Label: '{i18n>Guest}'
    },
    {Value: checkInDate},
    {Value: checkOutDate},
    {Value: totalAmount},
    {
      Value      : status,
      Criticality: statusCriticality
    },
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'HotelManagementService.cancel',
      Label : '{i18n>Cancel}'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'HotelManagementService.complete',
      Label : '{i18n>Complete}'
    }
  ],
  UI.Identification        : [
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'HotelManagementService.cancel',
      Label : '{i18n>Cancel}'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'HotelManagementService.complete',
      Label : '{i18n>Complete}'
    }
  ],
  UI.DataPoint #status     : {
    Title      : '{i18n>Status}',
    Value      : status,
    Criticality: statusCriticality
  },
  UI.DataPoint #totalAmount: {
    Title: '{i18n>TotalAmount}',
    Value: totalAmount
  },
  UI.HeaderFacets          : [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.DataPoint#status'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.DataPoint#totalAmount'
    }
  ],
  UI.FieldGroup #guest     : {Data: [
    {
      Value: traveler.firstName,
      Label: '{i18n>GuestFirstName}'
    },
    {
      Value: traveler.lastName,
      Label: '{i18n>GuestLastName}'
    },
    {Value: guestCount},
    {Value: specialRequests}
  ]},
  UI.FieldGroup #stay      : {Data: [
    {
      Value: room.hotel.name,
      Label: '{i18n>Hotel}'
    },
    {Value: room_ID},
    {Value: checkInDate},
    {Value: checkInTime},
    {Value: checkOutDate},
    {Value: checkOutTime}
  ]},
  UI.FieldGroup #payment   : {Data: [
    {Value: paymentStatus},
    {Value: paymentExpiresAt},
    {Value: nightlyRate},
    {Value: totalAmount},
    {Value: paidAt},
    {Value: cancelledAt},
    {Value: cancellationFee},
    {Value: refundAmount},
    {Value: completedAt}
  ]},
  UI.Facets                : [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'guest',
      Label : '{i18n>Guest}',
      Target: '@UI.FieldGroup#guest'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'stay',
      Label : '{i18n>Stay}',
      Target: '@UI.FieldGroup#stay'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'payment',
      Label : '{i18n>Payment}',
      Target: '@UI.FieldGroup#payment'
    }
  ]
) actions {
  cancel                                      @(
    Core.OperationAvailable: {$edmJson: {$Or: [
      {$Eq: [
        {$Path: 'in/status'},
        'AwaitingPayment'
      ]},
      {$Eq: [
        {$Path: 'in/status'},
        'Confirmed'
      ]}
    ]}},
    Common.SideEffects     : {TargetEntities: ['in']}
  );
  complete                                    @(
    Core.OperationAvailable: {$edmJson: {$Eq: [
      {$Path: 'in/status'},
      'Confirmed'
    ]}},
    Common.SideEffects     : {TargetEntities: ['in']}
  );
};
