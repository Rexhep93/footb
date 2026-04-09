export const API_BASE = 'https://api.football-data.org/v4';
export const API_KEY = 'a5121338cb264baaa294099596feaf92';

export async function fetchTodaysMatches() {
    const response = await fetch(`${API_BASE}/matches`, {
        headers: {
            'X-Auth-Token': API_KEY
        }
    });
    
    if (!response.ok) {
        throw new Error('API-limiet of sleutel ongeldig');
    }
    
    const data = await response.json();
    return data.matches || [];
}
