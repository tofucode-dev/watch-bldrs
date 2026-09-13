/**
 * Converts a major-unit decimal price string (e.g. "19.99") to integer minor units.
 * Returns null for blank input. Returns NaN for invalid format.
 */
export function parsePriceToMinorUnits(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return Number.NaN;
  }
  const [majorPart, minorPart = ""] = trimmed.split(".");
  const minorPadded = (minorPart + "00").slice(0, 2);
  return parseInt(majorPart, 10) * 100 + parseInt(minorPadded, 10);
}

export function formatMinorUnitsToPrice(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) {
    return "";
  }
  const major = minor / 100;
  return Number.isInteger(major) ? String(major) : major.toFixed(2);
}
