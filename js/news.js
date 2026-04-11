window.App = window.App || {};
(function () {
  // CORS proxy — TODO: vervangen door GitHub Action aggregator
  const PROXY = 'https://corsproxy.io/?url=';

  // Nieuwsbronnen per provincie. Breid uit naar andere regio's later.
  const SOURCES = {
    'Limburg': [
      { name: 'L1', url: 'https://www.l1nieuws.nl/rss/index.xml' },
    ],
    // 'Noord-Brabant': [{ name: 'Omroep Brabant', url: '...' }],
    // 'Noord-Holland': [{ name: 'NH Nieuws', url: '...' }],
  };

  function parseRSS(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const items = doc.querySelectorAll('item');
    const results = [];
    for (const item of items) {
      const title = item.querySelector('title')?.textContent?.trim() || '';
      const link = item.querySelector('link')?.textContent?.trim() || '';
      const desc = item.querySelector('description')?.textContent?.trim() || '';
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
      // Extract image from description or enclosure
      let image = null;
      const enclosure = item.querySelector('enclosure');
      if (enclosure && enclosure.getAttribute('type')?.startsWith('image/')) {
        image = enclosure.getAttribute('url');
      }
      if (!image) {
        const imgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/);
        if (imgMatch) image = imgMatch[1];
      }
      // Strip HTML from description
      const cleanDesc = desc.replace(/<[^>]*>/g, '').trim();
      results.push({ title, link, description: cleanDesc, pubDate, image });
    }
    return results;
  }

  async function fetchFeed(url) {
    const proxied = PROXY + encodeURIComponent(url);
    const res = await fetch(proxied);
    if (!res.ok) throw new Error('news_' + res.status);
    const text = await res.text();
    return parseRSS(text);
  }

  // Filter items waarin de gemeentenaam voorkomt in titel of beschrijving
  function filterByMunicipality(items, municipalityName) {
    if (!municipalityName) return items;
    const needle = municipalityName.toLowerCase();
    return items.filter(item => {
      const haystack = (item.title + ' ' + item.description).toLowerCase();
      return haystack.includes(needle);
    });
  }

  async function fetchForRegion(province, municipalityName) {
    const sources = SOURCES[province];
    if (!sources || !sources.length) return { items: [], hasSource: false };

    const all = [];
    for (const src of sources) {
      try {
        const items = await fetchFeed(src.url);
        for (const i of items) all.push({ ...i, source: src.name });
      } catch (e) {
        console.error('Feed failed:', src.name, e);
      }
    }
    const filtered = filterByMunicipality(all, municipalityName);
    // Sort newest first
    filtered.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    return { items: filtered, hasSource: true };
  }

  function formatDate(pubDate) {
    if (!pubDate) return '';
    const d = new Date(pubDate);
    if (isNaN(d)) return '';
    const now = new Date();
    const diffMs = now - d;
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 1) return 'zojuist';
    if (diffHours < 24) return `${Math.round(diffHours)} uur geleden`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} dag${diffDays > 1 ? 'en' : ''} geleden`;
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
  }

  window.App.news = { fetchForRegion, formatDate };
})();
