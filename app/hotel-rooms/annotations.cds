using HotelManagementService from '../../srv/hotel-management-service';

annotate HotelManagementService.Rooms with @(
  Capabilities.DeleteRestrictions: {Deletable: false},
  UI.HeaderInfo                  : {
    TypeName      : '{i18n>Room}',
    TypeNamePlural: '{i18n>Rooms}',
    Title         : {Value: number},
    Description   : {Value: hotel.name}
  },
  UI.LineItem                    : [
    {Value: hotel_ID},
    {Value: number},
    {Value: type},
    {Value: capacity},
    {Value: pricePerNight},
    {Value: isActive}
  ],
  UI.FieldGroup #room            : {Data: [
    {Value: hotel_ID},
    {Value: number},
    {Value: type},
    {Value: capacity},
    {Value: pricePerNight},
    {Value: isActive}
  ]},
  UI.Facets                      : [{
    $Type : 'UI.ReferenceFacet',
    ID    : 'room',
    Label : '{i18n>Room}',
    Target: '@UI.FieldGroup#room'
  }]
);

annotate HotelManagementService.Rooms with {
  ID @Core.Computed;
};
