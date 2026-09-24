export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export const isoDateOf = (d: Date) => d.toISOString().slice(0, 10);

export const dateColumn = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
