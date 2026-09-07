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
  const cutoff = (day: number) => {
    const wall = new Date(monday);
    wall.setUTCDate(wall.getUTCDate() + day);
    wall.setUTCHours(23, 59);
    const probe = new Date(wall.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
    const utcProbe = new Date(wall.toLocaleString('en-US', { timeZone: 'UTC' }));
    return new Date(wall.getTime() - (probe.getTime() - utcProbe.getTime())).toISOString();
  };
  return {
    week: monday.toISOString().slice(0, 10),
    marketClose: cutoff(4),
    lineupClose: cutoff(5),
    marketOpen:
      local.getTime() >= monday.getTime() + 3600000 &&
      local.getTime() < monday.getTime() + (4 * 24 + 23) * 3600000 + 59 * 60000,
  };
}
