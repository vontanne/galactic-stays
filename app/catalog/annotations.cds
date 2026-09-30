using CatalogService from '../../srv/catalog-service';

annotate CatalogService.Hotels with @(
  UI.HeaderInfo      : {
    TypeName      : '{i18n>Hotel}',
    TypeNamePlural: '{i18n>Hotels}',
    Title         : {Value: name},
    Description   : {Value: planet.name}
  },
  UI.SelectionFields : [planet_ID],
  UI.LineItem        : [
    {Value: name},
    {Value: planet_ID},
    {
      $Type             : 'UI.DataFieldForAnnotation',
      Target            : '@UI.DataPoint#rating',
      Label             : '{i18n>AverageRating}',
      @HTML5.CssDefaults: {width: '9rem'}
    },
    {Value: reviewCount},
    {Value: checkInTime},
    {Value: checkOutTime}
  ],
  UI.DataPoint #rating: {
    Title        : '{i18n>AverageRating}',
    Value        : averageRating,
    Visualization: #Rating,
    TargetValue  : 5
  },
  UI.HeaderFacets    : [{
    $Type : 'UI.ReferenceFacet',
    Target: '@UI.DataPoint#rating'
  }],
  UI.FieldGroup #details: {Data: [
    {Value: address},
    {Value: phoneNumber},
    {Value: checkInTime},
    {Value: checkOutTime},
    {Value: description}
  ]},
  UI.Facets          : [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'details',
      Label : '{i18n>Details}',
      Target: '@UI.FieldGroup#details'
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

annotate CatalogService.Rooms with @(UI.LineItem: [
  {Value: number},
  {Value: type},
  {Value: capacity},
  {Value: pricePerNight}
]);

annotate CatalogService.Reviews with @(
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
    {Value: authorName},
    {Value: createdAt}
  ]
);
