window.App = window.App || {};
(function () {
  const { PDOK_BASE } = window.App.config;

  function parsePoint(wkt) {
    if (!wkt) return null;
    const m = wkt.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
    return m ? { lng: parseFloat(m[1]), lat: parseFloat(m[2]) } : null;
  }

  function normalize(doc) {
    return {
      displayName: doc.weergavenaam,
      street: doc.straatnaam,
      houseNumber: doc.huis_nlt,
      postcode: doc.postcode,
      city: doc.woonplaatsnaam,
      coords: parsePoint(doc.centroide_ll),
      neighborhood: { name: doc.buurtnaam, code: doc.buurtcode },
      district: { name: doc.wijknaam, code: doc.wijkcode },
      municipality: { name: doc.gemeentenaam, code: doc.gemeentecode },
    };
  }

  window.App.address = {
    async lookup(postcode, houseNumber) {
      const pc = postcode.replace(/\s+/g, '').toUpperCase();
      const hn = String(houseNumber).trim();
      const url = `${PDOK_BASE}/free?q=${encodeURIComponent(pc + ' ' + hn)}&fq=${encodeURIComponent('type:adres')}&fq=${encodeURIComponent('postcode:' + pc)}&rows=5`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('pdok_http_' + res.status);
      const data = await res.json();
      const docs = data?.response?.docs || [];
      if (!docs.length) return null;
      const exact = docs.find(d => String(d.huisnummer) === hn) || docs[0];
      return normalize(exact);
    },
  };
})();
