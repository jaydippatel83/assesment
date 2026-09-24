const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export function parseIsoDate(value: string): CalendarDate | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function isValidIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}

function requireDate(value: string, label: string): CalendarDate {
  const parsed = parseIsoDate(value);
  if (!parsed) throw new RangeError(`${label} must be a valid YYYY-MM-DD date, got "${value}"`);
  return parsed;
}

export function ageLastBirthday(dob: string, asOf: string): number {
  const birth = requireDate(dob, 'dob');
  const on = requireDate(asOf, 'asOf');
  let age = on.year - birth.year;
  const birthdayNotYetReached =
    on.month < birth.month || (on.month === birth.month && on.day < birth.day);
  if (birthdayNotYetReached) age--;
  return age;
}
