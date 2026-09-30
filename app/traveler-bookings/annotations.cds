using BookingService from '../../srv/booking-service';

annotate BookingService.Bookings with @(
  UI.UpdateHidden                : true,
  Capabilities.DeleteRestrictions: {Deletable: false},
  UI.HeaderInfo                  : {
    TypeName      : '{i18n>Booking}',
    TypeNamePlural: '{i18n>Bookings}',
    Title         : {Value: room.hotel.name},
    Description   : {Value: checkInDate}
  },
  UI.SelectionFields             : [
    status,
    checkInDate
  ],
  UI.LineItem                    : [
    {
      Value: room.hotel.name,
      Label: '{i18n>Hotel}'
    },
    {Value: room_ID},
    {Value: checkInDate},
    {Value: checkOutDate},
    {Value: guestCount},
    {Value: totalAmount},
    {
      Value         : status,
      Criticality   : statusCriticality,
      @UI.Importance: #High
    },
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'BookingService.pay',
      Label : '{i18n>Pay}'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'BookingService.cancel',
      Label : '{i18n>Cancel}'
    }
  ],
  UI.Identification              : [
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'BookingService.pay',
      Label : '{i18n>Pay}'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'BookingService.cancel',
      Label : '{i18n>Cancel}'
    }
  ],
  UI.DataPoint #status           : {
    Title      : '{i18n>Status}',
    Value      : status,
    Criticality: statusCriticality
  },
  UI.DataPoint #totalAmount      : {
    Title: '{i18n>TotalAmount}',
    Value: totalAmount
  },
  UI.HeaderFacets                : [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.DataPoint#status'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.DataPoint#totalAmount'
    }
  ],
  UI.FieldGroup #stay            : {Data: [
    {
      Value: room.hotel.name,
      Label: '{i18n>Hotel}'
    },
    {Value: room_ID},
    {Value: checkInDate},
    {Value: checkInTime},
    {Value: checkOutDate},
    {Value: checkOutTime},
    {Value: guestCount},
    {Value: specialRequests}
  ]},
  UI.FieldGroup #payment         : {Data: [
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
  UI.Facets                      : [
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
  pay                                 @(
    Core.OperationAvailable: {$edmJson: {$And: [
      {$Path: 'in/IsActiveEntity'},
      {$Eq: [
        {$Path: 'in/status'},
        'AwaitingPayment'
      ]}
    ]}},
    Common.SideEffects     : {TargetEntities: ['in']}
  );
  cancel                              @(
    Core.OperationAvailable: {$edmJson: {$And: [
      {$Path: 'in/IsActiveEntity'},
      {$Or: [
        {$Eq: [
          {$Path: 'in/status'},
          'AwaitingPayment'
        ]},
        {$Eq: [
          {$Path: 'in/status'},
          'Confirmed'
        ]}
      ]}
    ]}},
    Common.SideEffects     : {TargetEntities: ['in']}
  );
};

annotate BookingService.Bookings with {
  room @Common.ValueList: {
    CollectionPath: 'Rooms',
    Parameters    : [
      {
        $Type            : 'Common.ValueListParameterInOut',
        LocalDataProperty: room_ID,
        ValueListProperty: 'ID'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'hotel_ID'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'type'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'capacity'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'pricePerNight'
      }
    ]
  };
};

annotate BookingService.Rooms with @UI.SelectionFields: [
  hotel_ID,
  type,
  capacity
];
