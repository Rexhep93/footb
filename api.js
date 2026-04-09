const API_KEY = 'a5121338cb264baaa294099596feaf92';
const BASE_URL = 'https://api.football-data.org/v4';

const COMPETITIONS = [2021, 2014, 2015, 2019, 2002, 2003, 2013, 2016, 2022, 2017, 2018, 2001];

export async function fetchTodaysMatches() {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  const url = `${BASE_URL}/matches?dateFrom=${today}&dateTo=${tomorrow}&competitions=${COMPETITIONS.join(',')}`;
  
  try {
    const response = await fetch(url, {
      headers: { 'X-Auth-Token': API_KEY }
    });
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.matches || [];
  } catch (error) {
    console.error('API fetch failed:', error);
    throw error;
  }
}

export function transformMatch(match) {
  return {
    id: match.id,
    competition: match.competition?.name || 'Unknown',
    homeTeam: match.homeTeam?.name || 'Home',
    awayTeam: match.awayTeam?.name || 'Away',
    homeScore: match.score?.fullTime?.home ?? null,
    awayScore: match.score?.fullTime?.away ?? null,
    status: match.status,
    minute: match.minute,
    utcDate: match.utcDate
  };
}
