export function madridWeek(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (key: string) => Number(parts.find((p) => p.type === key)?.value);
  const local = new Date(
    Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')),
  );
  const monday = new Date(local);
  monday.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  const cutoff = (day: number, hour = 23, minute = 59) => {
    const wall = new Date(monday);
    wall.setUTCDate(wall.getUTCDate() + day);
    wall.setUTCHours(hour, minute);
    const probe = new Date(wall.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
    const utcProbe = new Date(wall.toLocaleString('en-US', { timeZone: 'UTC' }));
    return new Date(wall.getTime() - (probe.getTime() - utcProbe.getTime())).toISOString();
  };
  const dayOfWeek = local.getUTCDay();
  const saturdayAfterClose = dayOfWeek === 6 && local.getUTCHours() >= 1;
  const sundayAfterClose = dayOfWeek === 0;
  const marketMonday = new Date(monday);
  if (saturdayAfterClose || sundayAfterClose) {
    marketMonday.setUTCDate(marketMonday.getUTCDate() + 7);
  }
  const marketMondayOffset = Math.round(
    (marketMonday.getTime() - monday.getTime()) / 86400000,
  );

  return {
    week: marketMonday.toISOString().slice(0, 10),
    marketClose: cutoff(marketMondayOffset + 5, 1, 0),
    lineupClose: cutoff(marketMondayOffset + 6, 18, 0),
    // The next market opens as soon as Saturday's settlement finishes.
    marketOpen: true,
  };
}
