window.App = window.App || {};
(function () {
  const { CATEGORIES } = window.App.overpass;

  let mapInstance = null;
  let markerLayer = null;
  let activeFilters = new Set(Object.keys(CATEGORIES));
  let allPoints = [];

  function makeIcon(color, isHome = false) {
    const size = isHome ? 32 : 24;
    const inner = isHome
      ? `<circle cx="12" cy="12" r="10" fill="${color}" stroke="#fff" stroke-width="3"/><circle cx="12" cy="12" r="3" fill="#fff"/>`
      : `<circle cx="12" cy="12" r="9" fill="${color}" stroke="#fff" stroke-width="2.5"/>`;
    const html = `<svg width="${size}" height="${size}" viewBox="0 0 24 24">${inner}</svg>`;
    return L.divIcon({
      html,
      className: 'custom-pin',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  function renderMarkers() {
    if (!markerLayer) return;
    markerLayer.clearLayers();
    for (const p of allPoints) {
      if (!activeFilters.has(p.category)) continue;
      const cat = CATEGORIES[p.category];
      const marker = L.marker([p.lat, p.lng], { icon: makeIcon(cat.color) });
      marker.bindPopup(`<strong>${p.name}</strong><br><span style="color:#6b6b6b;font-size:12px">${cat.label}</span>`);
      marker.addTo(markerLayer);
    }
  }

  async function init(containerId, addr, onStatus) {
    if (!addr.coords) { onStatus('error', 'Locatie ontbreekt'); return; }
    const { lat, lng } = addr.coords;

    // Clean up previous instance
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }

    mapInstance = L.map(containerId, {
      zoomControl: true,
      attributionControl: true,
    }).setView([lat, lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapInstance);

    // Home pin
    L.marker([lat, lng], { icon: makeIcon('#1a2e28', true) })
      .bindPopup(`<strong>${addr.street} ${addr.houseNumber}</strong>`)
      .addTo(mapInstance);

    markerLayer = L.layerGroup().addTo(mapInstance);

    // Load Overpass data
    onStatus('loading');
    try {
      allPoints = await window.App.overpass.fetchNearby(lat, lng, 1000);
      renderMarkers();
      onStatus('ready', allPoints.length);
    } catch (e) {
      console.error(e);
      allPoints = [];
      onStatus('error', 'Voorzieningen tijdelijk niet beschikbaar');
    }
  }

  function toggleFilter(key) {
    if (activeFilters.has(key)) activeFilters.delete(key);
    else activeFilters.add(key);
    renderMarkers();
  }

  function isActive(key) { return activeFilters.has(key); }

  window.App.map = { init, toggleFilter, isActive, CATEGORIES };
})();
