import cds from "@sap/cds";

const { SELECT } = cds.ql;

export async function recordExists(entity, conditions) {
  const record = await SELECT.one.from(entity).columns("ID").where(conditions);

  return record != null;
}

export async function otherRecordExists(entity, conditions, ownId) {
  const query = SELECT.one.from(entity).columns("ID").where(conditions);

  if (ownId != null) query.where({ ID: { "!=": ownId } });

  return (await query) != null;
}

export async function otherRecordWithNameExists(
  entity,
  name,
  conditions,
  ownId,
) {
  const query = SELECT.one.from(entity).columns("ID")
    .where`tolower(name) = ${String(name).toLowerCase()}`.where(conditions);

  if (ownId != null) query.where({ ID: { "!=": ownId } });

  return (await query) != null;
}

export async function withStoredValues(req, entity, columns) {
  if (req.event === "CREATE") return req.data;

  const stored = await SELECT.one
    .from(entity)
    .columns(columns)
    .where({ ID: req.data.ID });

  return { ...stored, ...req.data };
}

export async function findHotelRoomIds(Rooms, hotelId) {
  const rooms = await SELECT.from(Rooms).columns("ID").where({
    hotel_ID: hotelId,
  });

  return rooms.map((room) => room.ID);
}

export async function roomsHaveBookings(Bookings, roomIds) {
  if (roomIds.length === 0) return false;

  return recordExists(Bookings, { room_ID: roomIds });
}

export async function upcomingBookingExceedsCapacity(
  Bookings,
  roomId,
  capacity,
  today,
) {
  const booking = await SELECT.one.from(Bookings).columns("ID").where`
      room_ID = ${roomId}
      and guestCount > ${capacity}
      and status in ('AwaitingPayment', 'Confirmed')
      and checkOutDate > ${today}
    `;

  return booking != null;
}
