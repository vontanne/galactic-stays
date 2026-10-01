using AdminService from '../../srv/admin-service';

annotate AdminService.Planets with @(
  UI.HeaderInfo         : {
    TypeName      : '{i18n>Planet}',
    TypeNamePlural: '{i18n>Planets}',
    Title         : {Value: name},
    Description   : {Value: region}
  },
  UI.LineItem           : [
    {Value: name},
    {Value: region},
    {Value: isActive},
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'AdminService.EntityContainer/syncPlanetsFromSwapi',
      Label : '{i18n>SyncFromSwapi}'
    }
  ],
  UI.PresentationVariant: {
    SortOrder     : [{Property: name}],
    Visualizations: ['@UI.LineItem']
  },
  UI.FieldGroup #planet : {Data: [
    {Value: name},
    {Value: region},
    {Value: climate},
    {Value: terrain},
    {Value: isActive}
  ]},
  UI.Facets             : [{
    $Type : 'UI.ReferenceFacet',
    ID    : 'planet',
    Label : '{i18n>Planet}',
    Target: '@UI.FieldGroup#planet'
  }]
);

annotate AdminService.Planets with {
  ID @Core.Computed;
};

annotate AdminService.syncPlanetsFromSwapi with @Common.SideEffects: {TargetEntities: ['/AdminService.EntityContainer/Planets']};
