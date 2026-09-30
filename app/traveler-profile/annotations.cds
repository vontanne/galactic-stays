using TravelerService from '../../srv/traveler-service';

annotate TravelerService.Travelers with @(
  Capabilities.DeleteRestrictions: {Deletable: false},
  UI.HeaderInfo                  : {
    TypeName      : '{i18n>TravelerProfile}',
    TypeNamePlural: '{i18n>TravelerProfiles}',
    Title         : {Value: firstName},
    Description   : {Value: lastName}
  },
  UI.LineItem                    : [
    {Value: firstName},
    {Value: lastName},
    {Value: species},
    {Value: birthPlanet_ID}
  ],
  UI.FieldGroup #personal        : {Data: [
    {Value: firstName},
    {Value: lastName},
    {Value: dateOfBirth},
    {Value: species},
    {Value: birthPlanet_ID}
  ]},
  UI.FieldGroup #account         : {Data: [
    {Value: userId},
    {Value: isActive}
  ]},
  UI.Facets                      : [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'personal',
      Label : '{i18n>PersonalData}',
      Target: '@UI.FieldGroup#personal'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'account',
      Label : '{i18n>Account}',
      Target: '@UI.FieldGroup#account'
    }
  ]
);
