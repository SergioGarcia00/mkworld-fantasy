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
  const marketDate = new Date(local);
  marketDate.setUTCHours(0, 0, 0, 0);
  const cutoff = (offset: number, hour = 23, minute = 59) => {
    const wall = new Date(marketDate);
    wall.setUTCDate(wall.getUTCDate() + offset);
    wall.setUTCHours(hour, minute);
    const probe = new Date(wall.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
    const utcProbe = new Date(wall.toLocaleString('en-US', { timeZone: 'UTC' }));
    return new Date(wall.getTime() - (probe.getTime() - utcProbe.getTime())).toISOString();
  };
  return {
    week: marketDate.toISOString().slice(0, 10),
    marketClose: cutoff(1, 0, 0),
    lineupClose: cutoff(1, 18, 0),
    marketOpen: local.getUTCHours() > 1 || (local.getUTCHours() === 1 && local.getUTCMinutes() >= 0),
  };
}
