const names = new Intl.DisplayNames(['en'], { type: 'region' });
const codes = new Map<string, string>();
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
  const code = String.fromCharCode(a, b);
  const name = names.of(code);
  if (name && name !== code) codes.set(name.toLowerCase(), code.toLowerCase());
}
codes.set('turkey', 'tr');
codes.set('south korea', 'kr');
codes.set('czech republic', 'cz');
export function countryCode(country: string | null | undefined) {
  return country ? codes.get(country.trim().toLowerCase()) : undefined;
}
