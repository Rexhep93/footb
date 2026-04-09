const KEY='a5121338cb264baaa294099596feaf92';
// football-data.org blokkeert browser-CORS → proxy nodig.
// corsproxy.io forwardt custom headers (X-Auth-Token).
const PROXY='https://corsproxy.io/?';
const BASE='https://api.football-data.org/v4';

export const ALLOWED=['PL','BL1','SA','PD','FL1','DED','PPL','ELC','BSA','CL','EC','WC'];

export async function getMatches(date){
  const url=`${BASE}/matches?dateFrom=${date}&dateTo=${date}`;
  const r=await fetch(PROXY+encodeURIComponent(url),{headers:{'X-Auth-Token':KEY}});
  if(!r.ok)throw new Error('API '+r.status);
  const d=await r.json();
  return d.matches||[];
}
