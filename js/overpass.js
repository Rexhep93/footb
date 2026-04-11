window.App = window.App || {};
(function () {
  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

  const CATEGORIES = {
    supermarkt: { label: 'Supermarkt', color: '#2d7a3e', tag: 'shop=supermarket' },
    huisarts:   { label: 'Huisarts',   color: '#c2424c', tag: 'amenity=doctors' },
    apotheek:   { label: 'Apotheek',   color: '#d9832f', tag: 'amenity=pharmacy' },
    school:     { label: 'School',     color: '#2c5fa8', tag: 'amenity=school' },
    park:       { label: 'Park',       color: '#4a8c3a', tag: 'leisure=park' },
    restaurant: { label: 'Restaurant', color: '#8a4fa0', tag: 'amenity=restaurant' },
  };

  function buildQuery(lat, lng, radius) {
    // For each category, query node + way + relation
    const parts = Object.values(CATEGORIES).map(c => {
      const [k, v] = c.tag.split('=');
      return `
        node[${k}=${v}](around:${radius},${lat},${lng});
        way[${k}=${v}](around:${radius},${lat},${lng});
        relation[${k}=${v}](around:${radius},${lat},${lng});
      `;
    }).join('');
    return `[out:json][timeout:25];(${parts});out center tags;`;
  }

  function categorize(tags) {
    if (!tags) return null;
    if (tags.shop === 'supermarket') return 'supermarkt';
    if (tags.amenity === 'doctors') return 'huisarts';
    if (tags.amenity === 'pharmacy') return 'apotheek';
    if (tags.amenity === 'school') return 'school';
    if (tags.leisure === 'park') return 'park';
    if (tags.amenity === 'restaurant') return 'restaurant';
    return null;
  }

  async function fetchNearby(lat, lng, radius = 2000) {
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
    const seen = new Set();

    for (const el of elements) {
      const cat = categorize(el.tags);
      if (!cat) continue;

      // Get coordinates: node has lat/lon directly, way/relation has center
      let lat2, lng2;
      if (el.type === 'node') {
        lat2 = el.lat; lng2 = el.lon;
      } else if (el.center) {
        lat2 = el.center.lat; lng2 = el.center.lon;
      } else {
        continue;
      }

      // Dedupe: same name + category within ~50m
      const name = el.tags?.name || CATEGORIES[cat].label;
      const key = `${cat}|${name}|${lat2.toFixed(4)}|${lng2.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      points.push({
        id: `${el.type}${el.id}`,
        lat: lat2,
        lng: lng2,
        name,
        category: cat,
      });
    }
    return points;
  }

  window.App.overpass = { fetchNearby, CATEGORIES };
})();
