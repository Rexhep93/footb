window.App = window.App || {};
(function () {
  const CORS_PROXY = 'https://corsproxy.io/?url=';

  // ============================================================
  // BUIENRADAR — neerslag volgende 2 uur per 5 min
  // ============================================================

  const RAIN_THRESHOLD = 77;

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
        return { icon: 'rain', title: `Regen tot ${stopPoint.time}`, subtitle: `Nu ${describeIntensity(valueToMmPerHour(maxVal))}`, urgency: 'info' };
      }
      const maxVal = Math.max(...rainPoints.map(p => p.value));
      return { icon: 'rain', title: 'Regen', subtitle: `${describeIntensity(valueToMmPerHour(maxVal))}, blijft aanhouden`, urgency: 'warn' };
    }

    const startIdx = rainPoints.findIndex(p => p.isRain);
    if (startIdx === -1) return null;

    const startPoint = rainPoints[startIdx];
    const endIdx = rainPoints.findIndex((p, i) => i > startIdx && !p.isRain);
    const sliceEnd = endIdx === -1 ? rainPoints.length : endIdx;
    const durationMin = (sliceEnd - startIdx) * 5;
    const maxVal = Math.max(...rainPoints.slice(startIdx, sliceEnd).map(p => p.value));
    const minsUntil = startPoint.minutesFromNow;

    let subtitle;
    if (durationMin >= 115) subtitle = `${describeIntensity(valueToMmPerHour(maxVal))}, houdt aan`;
    else subtitle = `~${durationMin} min, ${describeIntensity(valueToMmPerHour(maxVal))}`;

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
    } catch (e) {}
    if (!text) {
      try {
        const res = await fetch(CORS_PROXY + encodeURIComponent(url));
        if (res.ok) text = await res.text();
      } catch (e) { console.error('[buienradar] proxy failed', e); return null; }
    }
    if (!text) return null;
    const points = parseBuienradarResponse(text);
    const item = analyzeRain(points);
    if (!item) return null;
    return { items: [item] };
  }

  // ============================================================
  // POLITIE.NL — gemeente RSS, nieuws-items laatste 24u
  // ============================================================
  // URL: https://rss.politie.nl/rss/ab/gemeenten/{provincie}/{gemeente}.xml
  // 'ab' bevat nieuws + gezocht + vermist. Wij tonen alleen nieuws (incidenten e.d.)

  const PROVINCE_SLUGS = {
    'Drenthe': 'drenthe',
    'Flevoland': 'flevoland',
    'Friesland': 'fryslan',
    'Fryslân': 'fryslan',
    'Gelderland': 'gelderland',
    'Groningen': 'groningen',
    'Limburg': 'limburg',
    'Noord-Brabant': 'noord-brabant',
    'Noord-Holland': 'noord-holland',
    'Overijssel': 'overijssel',
    'Utrecht': 'utrecht',
    'Zeeland': 'zeeland',
    'Zuid-Holland': 'zuid-holland',
  };

  // Gemeente-slug uitzonderingen (als politie.nl afwijkende slug heeft)
  const GEMEENTE_SLUG_OVERRIDES = {
    "'s-Hertogenbosch": 'den-bosch',
    'Bergen (L)': 'bergen-lb',
    'Bergen (NH)': 'bergen-nh',
    'Land van Cuijk': 'land-van-cuijck',
  };

  function slugifyGemeente(name) {
    if (GEMEENTE_SLUG_OVERRIDES[name]) return GEMEENTE_SLUG_OVERRIDES[name];
    return name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function getXmlText(parent, tag) {
    const el = parent.getElementsByTagName(tag)[0];
    return el ? (el.textContent || '').trim() : '';
  }

  function parsePolitieRss(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) return [];
    const items = Array.from(doc.getElementsByTagName('item'));
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    return items
      .map(it => {
        const title = getXmlText(it, 'title');
        const link = getXmlText(it, 'link');
        const pubDateStr = getXmlText(it, 'pubDate');
        const category = getXmlText(it, 'category');
        const pubDate = pubDateStr ? new Date(pubDateStr) : null;
        return { title, link, pubDate, category };
      })
      .filter(item => {
        if (!item.pubDate || isNaN(item.pubDate)) return false;
        if (now - item.pubDate.getTime() > DAY) return false;
        const link = (item.link || '').toLowerCase();
        if (link.includes('/gezocht/') || link.includes('/vermist/')) return false;
        if (item.category && /gezocht|vermist/i.test(item.category)) return false;
        return true;
      });
  }

  function formatRelativeTime(date) {
    const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
    if (diffMin < 60) return `${diffMin} min geleden`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `${diffH} uur geleden`;
    return 'gisteren';
  }

  async function fetchVeiligheid(addr) {
    const provName = addr.province?.name;
    const gemName = addr.municipality?.name;
    if (!provName || !gemName) return null;

    const provSlug = PROVINCE_SLUGS[provName];
    if (!provSlug) {
      console.warn('[politie] onbekende provincie:', provName);
      return null;
    }
    const gemSlug = slugifyGemeente(gemName);
    const url = `https://rss.politie.nl/rss/ab/gemeenten/${provSlug}/${gemSlug}.xml`;

    let xmlText = null;
    try {
      const res = await fetch(url);
      if (res.ok) xmlText = await res.text();
    } catch (e) {}
    if (!xmlText) {
      try {
        const res = await fetch(CORS_PROXY + encodeURIComponent(url));
        if (res.ok) xmlText = await res.text();
      } catch (e) { console.error('[politie] proxy failed', e); return null; }
    }
    if (!xmlText) return null;

    const items = parsePolitieRss(xmlText);
    if (items.length === 0) return null;

    // Max 2 meest recente
    const topItems = items.slice(0, 2);

    return {
      items: topItems.map(item => ({
        icon: 'shield',
        title: item.title,
        subtitle: `Politie ${gemName} · ${formatRelativeTime(item.pubDate)}`,
        urgency: 'alert',
        tapAction: () => window.open(item.link, '_blank', 'noopener'),
      })),
    };
  }

  // ============================================================
  // STUBS — volgt per bron
  // ============================================================

  async function fetchAfval(addr) { return null; }
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
