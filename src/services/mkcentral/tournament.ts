export const TOURNAMENT = {
  id: 743,
  url: 'https://mkcentral.com/es/tournaments/details?id=743',
  registrationsUrl:
    'https://mkcentral.com/api/tournaments/743/registrations?eligible_only=false&hosts_only=false&is_approved=true',
} as const;
// Used only by the explicit refresh script, never scraped from React components.
export async function fetchRegistrations(): Promise<unknown> {
  const response = await fetch(TOURNAMENT.registrationsUrl, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok)
    throw new Error(
      `MKCentral respondió HTTP ${response.status}. Importa un JSON descargado si el acceso no está disponible.`,
    );
  return response.json();
}
