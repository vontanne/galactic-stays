const MINOR_UNIT_FACTOR = 100n;
const PERCENT_FACTOR = 100n;

export function multiplyAmount(amount, multiplier) {
  if (!Number.isInteger(multiplier) || multiplier < 0) {
    throw new RangeError("Money multiplier must be a non-negative integer.");
  }

  const amountInMinorUnits = parseMinorUnits(amount);
  const resultInMinorUnits = amountInMinorUnits * BigInt(multiplier);

  return formatMinorUnits(resultInMinorUnits);
}

export function calculatePercentageAmount(amount, percentage) {
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new RangeError("Money percentage must be an integer from 0 to 100.");
  }

  const amountInMinorUnits = parseMinorUnits(amount);
  const numerator = amountInMinorUnits * BigInt(percentage);
  const resultInMinorUnits = divideAndRoundHalfUp(numerator, PERCENT_FACTOR);

  return formatMinorUnits(resultInMinorUnits);
}

export function subtractAmounts(amount, subtrahend) {
  const amountInMinorUnits = parseMinorUnits(amount);
  const subtrahendInMinorUnits = parseMinorUnits(subtrahend);
  const resultInMinorUnits = amountInMinorUnits - subtrahendInMinorUnits;

  if (resultInMinorUnits < 0n) {
    throw new RangeError("Money subtraction cannot produce a negative amount.");
  }

  return formatMinorUnits(resultInMinorUnits);
}

function parseMinorUnits(amount) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(amount));

  if (!match) {
    throw new TypeError(`Invalid monetary amount: ${amount}`);
  }

  const [, wholeUnits, fraction = ""] = match;
  const minorUnits = fraction.padEnd(2, "0");

  return BigInt(wholeUnits) * MINOR_UNIT_FACTOR + BigInt(minorUnits);
}

function formatMinorUnits(amount) {
  const wholeUnits = amount / MINOR_UNIT_FACTOR;
  const minorUnits = amount % MINOR_UNIT_FACTOR;

  return `${wholeUnits}.${minorUnits.toString().padStart(2, "0")}`;
}

function divideAndRoundHalfUp(dividend, divisor) {
  return (dividend + divisor / 2n) / divisor;
}
