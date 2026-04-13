window.App = window.App || {};
(function () {
  // Elke fetcher retourneert: { items: [...] } of null als niks relevants vandaag
  // items: { icon, title, subtitle, urgency: 'info'|'warn'|'alert', tapAction? }

  const CORS_PROXY = 'https://corsproxy.io/?url=';

  // ============================================================
  // BUIENRADAR — neerslag volgende 2 uur per 5 min
  // ============================================================
  // API: https://gps.buienradar.nl/getrr.php?lat=X&lon=Y
  // Response: 24 regels "waarde|HH:MM"
  // Waarde 0 = droog, 255 = zwaar. Intensiteit = 10^((waarde-109)/32) mm/u
  // Drempels: 77 = 0.1 mm/u, 100 = ~1 mm/u, 140 = ~10 mm/u

  const RAIN_THRESHOLD = 77; // vanaf hier zeggen we "regen"

  function valueToMmPerHour(v) {
    if (v <= 0) return 0;
    return Math.pow(10, (v - 109) / 32);
  }

  function describeIntensity(mmh) {
    if (mmh < 0.3) return 'lichte motregen';
    if (mmh < 1) return 'motregen';
    if (mmh < 3) return 'lichte regen';
    if (mmh < 10) return 'regen';
    return 'zware regen';
  }

  function parseBuienradarResponse(text) {
    const lines = text.trim().split(/\r?\n/);
    const now = new Date();
    const points = [];
    for (const line of lines) {
      const m = line.match(/^(\d+)\|(\d{2}):(\d{2})$/);
      if (!m) continue;
      const value = parseInt(m[1], 10);
      const hh = parseInt(m[2], 10);
      const mm = parseInt(m[3], 10);
      const t = new Date(now);
      t.setHours(hh, mm, 0, 0);
      // Als tijdstip > 30 min voor nu ligt, is het morgen
      if (t.getTime() < now.getTime() - 30 * 60 * 1000) t.setDate(t.getDate() + 1);
      const minutesFromNow = Math.round((t.getTime() - now.getTime()) / 60000);
      points.push({ time: `${m[2]}:${m[3]}`, value, minutesFromNow });
    }
    return points;
  }

  function analyzeRain(points) {
    if (!points || points.length === 0) return null;

    const rainPoints = points.map(p => ({ ...p, isRain: p.value >= RAIN_THRESHOLD }));
    const nowRaining = rainPoints[0]?.isRain;

    if (nowRaining) {
      const stopIdx = rainPoints.findIndex((p, i) => i > 0 && !p.isRain);
      if (stopIdx > 0) {
        const stopPoint = rainPoints[stopIdx];
        const maxVal = Math.max(...rainPoints.slice(0, stopIdx).map(p => p.value));
        return {
          icon: 'rain',
          title: `Regen tot ${stopPoint.time}`,
          subtitle: `Nu ${describeIntensity(valueToMmPerHour(maxVal))}`,
          urgency: 'info',
        };
      }
      const maxVal = Math.max(...rainPoints.map(p => p.value));
      return {
        icon: 'rain',
        title: 'Regen',
        subtitle: `${describeIntensity(valueToMmPerHour(maxVal))}, blijft aanhouden`,
        urgency: 'warn',
      };
    }

    const startIdx = rainPoints.findIndex(p => p.isRain);
    if (startIdx === -1) return null; // 2u droog, geen item

    const startPoint = rainPoints[startIdx];
    const endIdx = rainPoints.findIndex((p, i) => i > startIdx && !p.isRain);
    const sliceEnd = endIdx === -1 ? rainPoints.length : endIdx;
    const durationMin = (sliceEnd - startIdx) * 5;
    const maxVal = Math.max(...rainPoints.slice(startIdx, sliceEnd).map(p => p.value));
    const minsUntil = startPoint.minutesFromNow;

    let subtitle;
    if (durationMin >= 115) {
      subtitle = `${describeIntensity(valueToMmPerHour(maxVal))}, houdt aan`;
    } else {
      subtitle = `~${durationMin} min, ${describeIntensity(valueToMmPerHour(maxVal))}`;
    }

    return {
      icon: 'rain',
      title: minsUntil <= 5 ? 'Regen komt eraan' : `Regen om ${startPoint.time}`,
      subtitle,
      urgency: minsUntil <= 30 ? 'warn' : 'info',
    };
  }

  async function fetchBuienradar(addr) {
    const coords = addr.coords;
    if (!coords) return null;

    const url = `https://gps.buienradar.nl/getrr.php?lat=${coords.lat.toFixed(3)}&lon=${coords.lng.toFixed(3)}`;

    let text = null;
    try {
      const res = await fetch(url);
      if (res.ok) text = await res.text();
    } catch (e) {
      // CORS of netwerk — probeer proxy
    }
    if (!text) {
      try {
        const res = await fetch(CORS_PROXY + encodeURIComponent(url));
        if (res.ok) text = await res.text();
      } catch (e) {
        console.error('[buienradar] proxy failed', e);
        return null;
      }
    }
    if (!text) return null;

    const points = parseBuienradarResponse(text);
    const item = analyzeRain(points);
    if (!item) return null;
    return { items: [item] };
  }

  // ============================================================
  // STUBS — per bron invullen
  // ============================================================

  async function fetchAfval(addr) { return null; }
  async function fetchVeiligheid(addr) { return null; }
  async function fetchWegwerk(addr) { return null; }
  async function fetchLokaalNieuws(addr) { return null; }
  async function fetchPublicatiesImpact(addr) { return null; }

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
