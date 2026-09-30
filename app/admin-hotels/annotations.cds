using AdminService from '../../srv/admin-service';

annotate AdminService.Hotels with @(
  UI.HeaderInfo         : {
    TypeName      : '{i18n>Hotel}',
    TypeNamePlural: '{i18n>Hotels}',
    Title         : {Value: name},
    Description   : {Value: planet.name}
  },
  UI.SelectionFields    : [
    planet_ID,
    isActive
  ],
  UI.LineItem           : [
    {Value: name},
    {Value: planet_ID},
    {
      $Type             : 'UI.DataFieldForAnnotation',
      Target            : '@UI.DataPoint#rating',
      Label             : '{i18n>AverageRating}',
      @HTML5.CssDefaults: {width: '9rem'}
    },
    {Value: reviewCount},
    {Value: isActive}
  ],
  UI.DataPoint #rating  : {
    Title        : '{i18n>AverageRating}',
    Value        : averageRating,
    Visualization: #Rating,
    TargetValue  : 5
  },
  UI.HeaderFacets       : [{
    $Type      : 'UI.ReferenceFacet',
    Target     : '@UI.DataPoint#rating',
    @UI.Hidden : {$edmJson: {$Eq: [
      {$Path: 'reviewCount'},
      0
    ]}}
  }],
  UI.FieldGroup #general: {Data: [
    {Value: name},
    {Value: planet_ID},
    {Value: address},
    {Value: phoneNumber},
    {Value: checkInTime},
    {Value: checkOutTime},
    {Value: description},
    {Value: isActive}
  ]},
  UI.Facets             : [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'general',
      Label : '{i18n>General}',
      Target: '@UI.FieldGroup#general'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'rooms',
      Label : '{i18n>Rooms}',
      Target: 'rooms/@UI.LineItem'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'reviews',
      Label : '{i18n>Reviews}',
      Target: 'reviews/@UI.LineItem'
    }
  ]
);

annotate AdminService.Hotels with {
  ID @Core.Computed;
};

annotate AdminService.Rooms with @(UI.LineItem: [
  {Value: number},
  {Value: type},
  {Value: capacity},
  {Value: pricePerNight},
  {Value: isActive}
]);

annotate AdminService.Reviews with @(
  UI.DataPoint #rating: {
    Value        : rating,
    Visualization: #Rating,
    TargetValue  : 5
  },
  UI.LineItem         : [
    {
      $Type             : 'UI.DataFieldForAnnotation',
      Target            : '@UI.DataPoint#rating',
      Label             : '{i18n>Rating}',
      @HTML5.CssDefaults: {width: '9rem'}
    },
    {Value: comment},
    {
      Value: traveler.firstName,
      Label: '{i18n>Author}'
    },
    {Value: createdAt}
  ]
);
