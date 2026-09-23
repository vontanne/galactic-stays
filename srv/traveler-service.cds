using {galactic.stays as db} from '../db/schema';

@requires: 'Traveler'
service TravelerService @(path: 'traveler') {
  @restrict: [
    {grant: 'CREATE'},
    {
      grant: [
        'READ',
        'UPDATE'
      ],
      where: (userId = $user)
    }
  ]
  entity Travelers as
    projection on db.Travelers {
      ID,

      @readonly
      userId,

      @mandatory
      firstName,

      @mandatory
      lastName,

      @mandatory
      @Core.Immutable
      dateOfBirth,

      @mandatory
      species,

      @mandatory
      birthPlanet,

      @readonly
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
}
