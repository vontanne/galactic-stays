namespace galactic.stays;

using {
  cuid,
  managed,
  User
} from '@sap/cds/common';

using {galactic.stays.Species} from './types';

@assert.unique: {planetName: [name]}
entity Planets : cuid, managed {
  name     : String(100) not null;
  region   : String(100);
  climate  : String(255);
  terrain  : String(255);
  isActive : Boolean not null default true;
}

@assert.unique: {userId: [userId]}
entity Travelers : cuid, managed {
  userId      : User not null;
  firstName   : String(100) not null;
  lastName    : String(100) not null;
  dateOfBirth : Date not null;
  species     : Species not null;
  birthPlanet : Association to one Planets not null;
  isActive    : Boolean not null default true;
}

@assert.unique: {hotelNamePerPlanet: [
  planet,
  name
]}
entity Hotels : cuid, managed {
  name         : String(150) not null;
  planet       : Association to one Planets not null;
  address      : String(255) not null;
  description  : String(1000);
  phoneNumber  : String(30) not null;
  checkInTime  : Time not null;
  checkOutTime : Time not null;
  isActive     : Boolean not null default true;
}
