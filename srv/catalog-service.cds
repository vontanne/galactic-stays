using {galactic.stays as db} from '../db/schema';

service CatalogService @(path: 'catalog') {
  @readonly
  entity Planets as
    projection on db.Planets {
      ID,
      name,
      region,
      climate,
      terrain
    }
    where
      isActive = true;

  @readonly
  entity Hotels  as
    projection on db.Hotels {
      ID,
      name,
      planet,
      address,
      description,
      phoneNumber,
      checkInTime,
      checkOutTime,
      rooms,
      reviews,
      rating.averageRating as averageRating,
      coalesce(
        rating.reviewCount, 0
      )                    as reviewCount : Integer
    }
    where
          isActive        = true
      and planet.isActive = true;

  @readonly
  entity Reviews as
    projection on db.Reviews {
      ID,
      hotel,
      rating,
      comment,
      traveler.firstName as authorName,
      createdAt,
      modifiedAt
    }
    where
          hotel.isActive        = true
      and hotel.planet.isActive = true;

  @readonly
  entity Rooms   as
    projection on db.Rooms {
      ID,
      hotel,
      number,
      type,
      capacity,
      pricePerNight,
      currency
    }
    where
          isActive              = true
      and hotel.isActive        = true
      and hotel.planet.isActive = true;
}
