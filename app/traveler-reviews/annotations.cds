using BookingService from '../../srv/booking-service';

annotate BookingService.Reviews with @(
  UI.HeaderInfo        : {
    TypeName      : '{i18n>Review}',
    TypeNamePlural: '{i18n>Reviews}',
    Title         : {Value: hotel.name}
  },
  UI.LineItem          : [
    {Value: hotel_ID},
    {
      $Type             : 'UI.DataFieldForAnnotation',
      Target            : '@UI.DataPoint#rating',
      Label             : '{i18n>Rating}',
      @HTML5.CssDefaults: {width: '9rem'}
    },
    {Value: comment},
    {Value: modifiedAt}
  ],
  UI.DataPoint #rating : {
    Title        : '{i18n>Rating}',
    Value        : rating,
    Visualization: #Rating,
    TargetValue  : 5
  },
  UI.HeaderFacets      : [{
    $Type : 'UI.ReferenceFacet',
    Target: '@UI.DataPoint#rating'
  }],
  UI.FieldGroup #review: {Data: [
    {Value: hotel_ID},
    {Value: rating},
    {Value: comment}
  ]},
  UI.Facets            : [{
    $Type : 'UI.ReferenceFacet',
    ID    : 'review',
    Label : '{i18n>Review}',
    Target: '@UI.FieldGroup#review'
  }]
);
