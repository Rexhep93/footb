const BASE = 'https://score-app.rexhep93.workers.dev/v4';

export const ALLOWED = ['PL','BL1','SA','PD','FL1','DED','PPL','ELC','BSA','CL','EC','WC','CLI'];

export async function getMatches(date) {
  const comps = ALLOWED.join(',');
  const r = await fetch(`${BASE}/matches?dateFrom=${date}&dateTo=${date}&competitions=${comps}`);
  if (!r.ok) throw new Error('API ' + r.status);
  const d = await r.json();
  return d.matches || [];
}
