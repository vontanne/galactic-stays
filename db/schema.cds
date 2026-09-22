namespace galactic.stays;

using {
  cuid,
  managed
} from '@sap/cds/common';

@assert.unique: {planetName: [name]}
entity Planets : cuid, managed {
  name     : String(100) not null;
  region   : String(100);
  climate  : String(255);
  terrain  : String(255);
  isActive : Boolean not null default true;
};
