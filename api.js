const BASE = 'https://score-app.rexhep93.workers.dev';

export const ALLOWED = ['PL','BL1','SA','PD','FL1','DED','PPL','ELC','BSA','CL','EC','WC','CLI'];

export async function getMatches(date) {
  const r = await fetch(`${BASE}/day?date=${date}`);
  if (!r.ok) throw new Error('API ' + r.status);
  const d = await r.json();
  return d.matches || [];
}
