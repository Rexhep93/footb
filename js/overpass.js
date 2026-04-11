window.App = window.App || {};
(function () {
  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

  // Elke categorie kan meerdere tags matchen
  const CATEGORIES = {
    supermarkt: {
      label: 'Supermarkt',
      color: '#2d7a3e',
      tags: ['shop=supermarket', 'shop=convenience'],
    },
    huisarts: {
      label: 'Huisarts',
      color: '#c2424c',
      tags: ['amenity=doctors', 'healthcare=doctor'],
    },
    apotheek: {
      label: 'Apotheek',
      color: '#d9832f',
      tags: ['amenity=pharmacy'],
    },
    school: {
      label: 'School',
      color: '#2c5fa8',
      tags: ['amenity=school', 'amenity=kindergarten'],
    },
    park: {
      label: 'Buitenplekken',
      color: '#4a8c3a',
      tags: ['leisure=park', 'leisure=playground', 'leisure=garden'],
    },
    eten: {
      label: 'Eten & drinken',
      color: '#8a4fa0',
      tags: ['amenity=restaurant', 'amenity=cafe', 'amenity=fast_food', 'amenity=bar'],
    },
  };

  function buildQuery(lat, lng, radius) {
    const parts = [];
    for (const c of Object.values(CATEGORIES)) {
      for (const tag of c.tags) {
        const [k, v] = tag.split('=');
        parts.push(`node[${k}=${v}](around:${radius},${lat},${lng});`);
        parts.push(`way[${k}=${v}](around:${radius},${lat},${lng});`);
        parts.push(`relation[${k}=${v}](around:${radius},${lat},${lng});`);
      }
    }
    return `[out:json][timeout:25];(${parts.join('')});out center tags;`;
  }

  function categorize(tags) {
    if (!tags) return null;
    for (const [catKey, cat] of Object.entries(CATEGORIES)) {
      for (const tag of cat.tags) {
        const [k, v] = tag.split('=');
        if (tags[k] === v) return catKey;
      }
    }
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

      let lat2, lng2;
      if (el.type === 'node') { lat2 = el.lat; lng2 = el.lon; }
      else if (el.center) { lat2 = el.center.lat; lng2 = el.center.lon; }
      else continue;

      const rawName = el.tags?.name || null;
      const key = `${cat}|${rawName || 'noname'}|${lat2.toFixed(4)}|${lng2.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      points.push({
        id: `${el.type}${el.id}`,
        lat: lat2,
        lng: lng2,
        name: rawName,  // null als geen naam
        category: cat,
      });
    }
    return points;
  }

  window.App.overpass = { fetchNearby, CATEGORIES };
})();
