window.App = window.App || {};
(function () {
  // Elke fetcher retourneert: { items: [...] } of null als niks relevants vandaag
  // items: { icon, title, subtitle, urgency: 'info'|'warn'|'alert', tapAction? }

  async function fetchBuienradar(coords) {
    // STUB: implementatie volgt zodra Buienradar/KNMI API gekozen is
    // Verwacht: regen binnen 2u → {icon:'rain', title:'Regen om 14:20', subtitle:'~30 min, matig', urgency:'info'}
    return null;
  }

  async function fetchAfval(addr) {
    // STUB: per gemeente andere API (Cyclus/RMN/AVU/Avalex/...)
    // Verwacht: morgen GFT → {icon:'trash', title:'Morgen GFT buiten zetten', subtitle:'Vóór 7:30', urgency:'warn'}
    return null;
  }

  async function fetchVeiligheid(addr) {
    // STUB: politie.nl RSS per gemeente
    // Verwacht: incidenten laatste 24u in gemeente
    return null;
  }

  async function fetchWegwerk(addr) {
    // STUB: NDW/Melvin API, filter op straat/postcode
    return null;
  }

  async function fetchLokaalNieuws(addr) {
    // STUB: hergebruik news.js maar filter op vandaag/gisteren
    return null;
  }

  async function fetchPublicatiesImpact(addr) {
    // STUB: hergebruik meldingen.js, filter <200m + impactvolle types vandaag/gisteren
    return null;
  }

  // Volgorde zoals afgesproken
  const SOURCES = [
    { key: 'buienradar', label: 'Weer', fetch: fetchBuienradar },
    { key: 'afval', label: 'Afval', fetch: fetchAfval },
    { key: 'veiligheid', label: 'Veiligheid', fetch: fetchVeiligheid },
    { key: 'wegwerk', label: 'Wegwerkzaamheden', fetch: fetchWegwerk },
    { key: 'nieuws', label: 'Nieuws', fetch: fetchLokaalNieuws },
    { key: 'publicaties', label: 'Publicaties', fetch: fetchPublicatiesImpact },
  ];

  window.App.vandaag = { SOURCES };
})();
