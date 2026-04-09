const BASE = 'https://score-app.rexhep93.workers.dev/v4';

export const ALLOWED = ['PL','BL1','SA','PD','FL1','DED','PPL','ELC','BSA','CL','EC','WC','CLI'];

export async function getMatches(date) {
  const results = await Promise.all(
    ALLOWED.map(code =>
      fetch(`${BASE}/competitions/${code}/matches?dateFrom=${date}&dateTo=${date}`)
        .then(r => r.ok ? r.json() : { matches: [] })
        .then(d => d.matches || [])
        .catch(() => [])
    )
  );
  return results.flat();
}
