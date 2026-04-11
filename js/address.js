// js/address.js
// Handles address lookup via PDOK Locatieserver
// Docs: https://api.pdok.nl/bzk/locatieserver/search/v3_1/ui/

const PDOK_BASE = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1';

/**
 * Parse a PDOK "POINT(lng lat)" WKT string into {lng, lat}
 */
function parsePoint(wkt) {
  if (!wkt) return null;
  const match = wkt.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
  if (!match) return null;
  return {
    lng: parseFloat(match[1]),
    lat: parseFloat(match[2])
  };
}

/**
 * Normalize a PDOK address document into our internal Address shape.
 * This is the ONLY place that knows about PDOK's field names — the rest
 * of the app uses our clean shape.
 */
function normalizeAddress(doc) {
  const ll = parsePoint(doc.centroide_ll);
  const rd = parsePoint(doc.centroide_rd);

  return {
    // Display
    displayName: doc.weergavenaam,
    street: doc.straatnaam,
    houseNumber: doc.huis_nlt,       // "22", "18A", "36B" — always use this, not huisnummer
    postcode: doc.postcode,
    city: doc.woonplaatsnaam,

    // Coordinates
    coords: ll,                       // { lng, lat } for OSM, Overpass, Open-Meteo
    coordsRD: rd,                     // { lng: x, lat: y } for PDOK RD services

    // Administrative hierarchy
    neighborhood: {
      name: doc.buurtnaam,
      code: doc.buurtcode             // "BU09833101" — used for CBS
    },
    district: {
      name: doc.wijknaam,
      code: doc.wijkcode              // "WK098331" — used for CBS
    },
    municipality: {
      name: doc.gemeentenaam,
      code: doc.gemeentecode          // "0983" — used for CBS + bekendmakingen
    },
    province: {
      name: doc.provincienaam,        // "Limburg"
      code: doc.provinciecode,        // "PV31"
      abbr: doc.provincieafkorting    // "LB"
    },
    waterBoard: {
      name: doc.waterschapsnaam,
      code: doc.waterschapscode
    },

    // BAG identifiers — the keys to unlock deeper data
    bag: {
      addressableObjectId: doc.adresseerbaarobject_id,  // → BAG building details
      nummeraanduidingId: doc.nummeraanduiding_id,      // → WOZ-waardeloket
      pdokId: doc.id                                     // → PDOK lookup for geometry
    }
  };
}

/**
 * Look up an address by postcode + house number.
 * Returns the normalized Address object, or null if not found.
 *
 */
export async function lookupAddress(postcode, houseNumber) {
  // Normalize: strip spaces from postcode, uppercase
  const pc = postcode.replace(/\s+/g, '').toUpperCase();
  const hn = String(houseNumber).trim();

  // Use fq filters for precision — much more reliable than free-text q
  const url = `${PDOK_BASE}/free?` +
    `q=${encodeURIComponent(`${pc} ${hn}`)}` +
    `&fq=${encodeURIComponent('type:adres')}` +
    `&fq=${encodeURIComponent(`postcode:${pc}`)}` +
    `&rows=5`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('PDOK error:', res.status, res.statusText);
      return null;
    }
    const data = await res.json();
    const docs = data?.response?.docs || [];

    if (docs.length === 0) return null;

    // Best match is always first (Solr scores exact matches much higher)
    // But double-check the house number actually matches, since fuzzy
    // matching will return 18A, 36B etc. for a query of "22"
    const exact = docs.find(d => String(d.huisnummer) === hn) || docs[0];
    return normalizeAddress(exact);

  } catch (err) {
    console.error('Address lookup failed:', err);
    return null;
  }
}

/**
 * Autocomplete suggestions as the user types.
 * Uses the lightweight /suggest endpoint for fast UX.
 *
 */
export async function suggestAddresses(query) {
  if (!query || query.length < 3) return [];

  const url = `${PDOK_BASE}/suggest?` +
    `q=${encodeURIComponent(query)}` +
    `&fq=${encodeURIComponent('type:adres')}` +
    `&rows=8`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.response?.docs || []).map(d => ({
      id: d.id,
      label: d.weergavenaam,
      type: d.type
    }));
  } catch (err) {
    console.error('Suggest failed:', err);
    return [];
  }
}
