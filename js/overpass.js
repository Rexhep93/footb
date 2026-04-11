window.App = window.App || {};
(function () {
  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

  // Category → Overpass tag queries. Radius in meters.
  const CATEGORIES = {
    supermarkt: { label: 'Supermarkt', color: '#2d7a3e', query: 'node[shop=supermarket]' },
    huisarts:   { label: 'Huisarts',   color: '#c2424c', query: 'node[amenity=doctors]' },
    apotheek:   { label: 'Apotheek',   color: '#d9832f', query: 'node[amenity=pharmacy]' },
    school:     { label: 'School',     color: '#2c5fa8', query: 'node[amenity=school]' },
    park:       { label: 'Park',       color: '#4a8c3a', query: 'node[leisure=park]' },
    restaurant: { label: 'Restaurant', color: '#8a4fa0', query: 'node[amenity=restaurant]' },
  };

  function buildQuery(lat, lng, radius) {
    const parts = Object.entries(CATEGORIES).map(([key, c]) =>
      `${c.query}(around:${radius},${lat},${lng});`
    ).join('\n');
    return `[out:json][timeout:25];(${parts});out body;`;
  }

  function categorize(tags) {
    if (tags.shop === 'supermarket') return 'supermarkt';
    if (tags.amenity === 'doctors') return 'huisarts';
    if (tags.amenity === 'pharmacy') return 'apotheek';
    if (tags.amenity === 'school') return 'school';
    if (tags.leisure === 'park') return 'park';
    if (tags.amenity === 'restaurant') return 'restaurant';
    return null;
  }

  async function fetchNearby(lat, lng, radius = 1000) {
    const body = 'data=' + encodeURIComponent(buildQuery(lat, lng, radius));
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error('overpass_' + res.status);
    const data = await res.json();
    const elements = data.elements || [];
    const points = [];
    for (const el of elements) {
      if (el.type !== 'node') continue;
      const cat = categorize(el.tags || {});
      if (!cat) continue;
      points.push({
        id: el.id,
        lat: el.lat,
        lng: el.lon,
        name: el.tags?.name || CATEGORIES[cat].label,
        category: cat,
      });
    }
    return points;
  }

  window.App.overpass = { fetchNearby, CATEGORIES };
})();
