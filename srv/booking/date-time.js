const MILLISECONDS_PER_DAY = 86_400_000;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateOnly(value) {
  if (typeof value !== "string") return undefined;

  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return undefined;

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(Date.UTC(year, month - 1, day));

  const dateIsValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return dateIsValid ? date : undefined;
}

export function toUtcCalendarDate(timestamp) {
  return new Date(
    Date.UTC(
      timestamp.getUTCFullYear(),
      timestamp.getUTCMonth(),
      timestamp.getUTCDate(),
    ),
  );
}

export function calculateCalendarDaysBetween(startDate, endDate) {
  return (endDate - startDate) / MILLISECONDS_PER_DAY;
}

export function addMinutes(timestamp, minutes) {
  return new Date(timestamp.getTime() + minutes * 60_000);
}

export function isDeadlineReached(deadline, referenceTimestamp) {
  return new Date(deadline).getTime() <= referenceTimestamp.getTime();
}
