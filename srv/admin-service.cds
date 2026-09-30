using {galactic.stays as db} from '../db/schema';

@requires: 'Admin'
service AdminService @(path: 'admin') {
  @odata.draft.enabled
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

  @odata.draft.enabled
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
      reviews,
      rating.averageRating as averageRating,
      coalesce(
        rating.reviewCount, 0
      )                    as reviewCount : Integer,
      isActive
    };

  @restrict: [{
    grant: [
      'READ',
      'DELETE'
    ],
    to   : 'Admin'
  }]
  entity Reviews                    as
    projection on db.Reviews {
      ID,
      hotel,
      traveler,
      rating,
      comment,
      createdAt,
      modifiedAt
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
  action expireUnpaidBookings() returns Integer;
}
