using {galactic.stays as db} from '../db/schema';

@requires: 'Admin'
service AdminService @(path: 'admin') {
  entity Planets                    as
    projection on db.Planets {
      ID,

      @mandatory
      name,

      region,
      climate,
      terrain,
      isActive
    };

  entity Hotels                     as
    projection on db.Hotels {
      ID,

      @mandatory
      name,

      @mandatory
      planet,

      @mandatory
      address,

      description,

      @mandatory
      phoneNumber,

      @mandatory
      checkInTime,

      @mandatory
      checkOutTime,

      rooms,
      managementAssignment,
      isActive
    };

  entity Rooms                      as
    projection on db.Rooms {
      ID,

      @Core.Immutable
      hotel,

      @mandatory
      number,

      @mandatory
      type,

      @mandatory
      capacity,

      @mandatory
      pricePerNight,

      currency,
      isActive
    };

  entity HotelManagementAssignments as
    projection on db.HotelManagementAssignments {
      ID,

      @mandatory
      @assert.target
      hotel,

      @mandatory
      userId
    };

  @restrict: [{
    grant: [
      'READ',
      'UPDATE'
    ],
    to   : 'Admin'
  }]
  entity Travelers                  as
    projection on db.Travelers {
      ID,

      @readonly
      userId,

      @readonly
      firstName,

      @readonly
      lastName,

      @readonly
      dateOfBirth,

      @readonly
      species,

      @readonly
      birthPlanet,

      isActive
    };

  type PlanetSyncResult {
    fetched   : Integer;
    created   : Integer;
    updated   : Integer;
    unchanged : Integer;
  }

  action syncPlanetsFromSwapi() returns PlanetSyncResult;
}
