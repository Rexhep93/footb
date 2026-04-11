// js/address.js
window.App = window.App || {};
(function () {
  const PDOK_BASE = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1';

  function parsePoint(wkt) {
    if (!wkt) return null;
    const match = wkt.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
    if (!match) return null;
    return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
  }

  function normalizeAddress(doc) {
    const ll = parsePoint(doc.centroide_ll);
    const rd = parsePoint(doc.centroide_rd);
    return {
      displayName: doc.weergavenaam,
      street: doc.straatnaam,
      houseNumber: doc.huis_nlt,
      postcode: doc.postcode,
      city: doc.woonplaatsnaam,
      coords: ll,
      coordsRD: rd,
      neighborhood: { name: doc.buurtnaam, code: doc.buurtcode },
      district: { name: doc.wijknaam, code: doc.wijkcode },
      municipality: { name: doc.gemeentenaam, code: doc.gemeentecode },
      province: {
        name: doc.provincienaam,
        code: doc.provinciecode,
        abbr: doc.provincieafkorting
      },
      waterBoard: { name: doc.waterschapsnaam, code: doc.waterschapscode },
      bag: {
        addressableObjectId: doc.adresseerbaarobject_id,
        nummeraanduidingId: doc.nummeraanduiding_id,
        pdokId: doc.id
      }
    };
  }

  async function lookup(postcode, houseNumber) {
    const pc = postcode.replace(/\s+/g, '').toUpperCase();
    const hn = String(houseNumber).trim();
    const url = `${PDOK_BASE}/free?` +
      `q=${encodeURIComponent(`${pc} ${hn}`)}` +
      `&fq=${encodeURIComponent('type:adres')}` +
      `&fq=${encodeURIComponent(`postcode:${pc}`)}` +
      `&rows=5`;
    try {
      const res = await fetch(url);
      if (!res.ok) { console.error('PDOK error:', res.status); return null; }
      const data = await res.json();
      const docs = data?.response?.docs || [];
      if (docs.length === 0) return null;
      const exact = docs.find(d => String(d.huisnummer) === hn) || docs[0];
      return normalizeAddress(exact);
    } catch (err) {
      console.error('Address lookup failed:', err);
      return null;
    }
  }

  async function suggest(query) {
    if (!query || query.length < 3) return [];
    const url = `${PDOK_BASE}/suggest?q=${encodeURIComponent(query)}&fq=${encodeURIComponent('type:adres')}&rows=8`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return (data?.response?.docs || []).map(d => ({ id: d.id, label: d.weergavenaam, type: d.type }));
    } catch (err) {
      console.error('Suggest failed:', err);
      return [];
    }
  }

  window.App.address = { lookup, suggest };
})();
