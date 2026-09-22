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
}
