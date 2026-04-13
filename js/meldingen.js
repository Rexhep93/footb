window.App = window.App || {};
(function () {
  const PROXY = 'https://corsproxy.io/?url=';
  const SRU_BASE = 'https://repository.overheid.nl/sru';
  const PAGE_SIZE = 25;

  const ALLOWED_TYPES = [
    'omgevingsvergunning',
    'verkeersbesluit of -mededeling',
    'ruimtelijk plan of omgevingsdocument',
    'evenementenvergunning',
    'andere vergunning',
    'beleidsregel'
  ];

  const TYPE_LABELS = {
    'omgevingsvergunning': 'Omgevingsvergunning',
    'verkeersbesluit of -mededeling': 'Verkeer',
    'ruimtelijk plan of omgevingsdocument': 'Ruimtelijk plan',
    'evenementenvergunning': 'Evenement',
    'andere vergunning': 'Vergunning',
    'beleidsregel': 'Beleid'
  };

  function buildQuery(gemeente) {
    const typeFilter = ALLOWED_TYPES.map(t => `dt.type=="${t}"`).join(' OR ');
    return `c.product-area==officielepublicaties AND dt.creator=="${gemeente}" AND (${typeFilter})`;
  }

  function getText(parent, localName) {
    const els = parent.getElementsByTagName('*');
    for (let i = 0; i < els.length; i++) {
      if (els[i].localName === localName) return els[i].textContent.trim();
    }
    return null;
  }
  function getAll(parent, localName) {
    const out = [];
    const els = parent.getElementsByTagName('*');
    for (let i = 0; i < els.length; i++) {
      if (els[i].localName === localName) out.push(els[i]);
    }
    return out;
  }

  function parseSruXml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('meldingen_parse');

    const totalEl = getAll(doc, 'numberOfRecords')[0];
    const total = totalEl ? parseInt(totalEl.textContent, 10) : 0;

    const records = getAll(doc, 'record').map(rec => {
      const title = getText(rec, 'title');
      const type = getText(rec, 'type');
      const modified = getText(rec, 'modified');
      const geometrielabel = getText(rec, 'geometrielabel');
      const preferredUrl = getText(rec, 'preferredUrl');
      const identifier = getText(rec, 'identifier');

      const pcSource = geometrielabel || title || '';
      const pcMatch = pcSource.match(/\b(\d{4})\s?[A-Z]{2}\b/);
      const postcodePrefix = pcMatch ? pcMatch[1] : null;

      return {
        id: identifier,
        title: title || '(geen titel)',
        type,
        typeLabel: TYPE_LABELS[type] || type,
        date: modified,
        location: geometrielabel || '',
        url: preferredUrl,
        postcodePrefix
      };
    }).filter(r => r.id);

    return { records, total };
  }

  async function fetchPage(gemeente, page) {
    const startRecord = (page - 1) * PAGE_SIZE + 1;
    const query = buildQuery(gemeente);
    const sruUrl = `${SRU_BASE}?query=${encodeURIComponent(query)} sortBy dt.modified/sort.descending&maximumRecords=${PAGE_SIZE}&startRecord=${startRecord}`;
    const res = await fetch(PROXY + encodeURIComponent(sruUrl));
    if (!res.ok) throw new Error('meldingen_' + res.status);
    const xml = await res.text();
    return parseSruXml(xml);
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const now = new Date();
    const diffMs = now - d;
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 1) return 'zojuist';
    if (diffHours < 24) return `${Math.round(diffHours)} uur geleden`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} dag${diffDays > 1 ? 'en' : ''} geleden`;
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
  }

  window.App.meldingen = { fetchPage, formatDate, PAGE_SIZE };
})();
