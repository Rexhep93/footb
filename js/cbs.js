window.App = window.App || {};
(function () {
  const { CBS_BASE, CBS_DATASET } = window.App.config;
  const NL_CACHE_KEY = 'dichtbij:cbs_nl:v1';
  const NL_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dagen
  let metaCache = null;

  const trim = v => (typeof v === 'string' ? v.trim() : v);

  async function fetchMeta() {
    if (metaCache) return metaCache;
    const res = await fetch(`${CBS_BASE}/${CBS_DATASET}/DataProperties`);
    if (!res.ok) throw new Error('cbs_meta_' + res.status);
    const data = await res.json();
    const items = data.value || [];
    const groups = {};
    for (const i of items) if (i.Type === 'TopicGroup') groups[i.ID] = i;
    const topGroup = pid => {
      while (pid != null) {
        const p = groups[pid]; if (!p) return null;
        if (p.ParentID == null) return p.Title?.trim();
        pid = p.ParentID;
      }
      return null;
    };
    const result = {};
    for (const i of items) {
      if (i.Type !== 'Topic') continue;
      result[i.Key] = {
        title: i.Title?.trim(),
        unit: i.Unit,
        decimals: i.Decimals || 0,
        group: topGroup(i.ParentID) || 'Overig',
      };
    }
    metaCache = result;
    return result;
  }

  async function fetchStats(code) {
    const filter = `startswith(WijkenEnBuurten,'${code}')`;
    const url = `${CBS_BASE}/${CBS_DATASET}/TypedDataSet?$filter=${encodeURIComponent(filter)}&$format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('cbs_stats_' + res.status);
    const data = await res.json();
    const rows = data.value || [];
    if (!rows.length) return null;
    const out = {};
    for (const [k, v] of Object.entries(rows[0])) out[k] = trim(v);
    return out;
  }

  // Velden die we nationaal aggregeren — alleen wat de Buurt-tab gebruikt
  const NL_FIELDS_WEIGHTED_BY_INWONERS = [
    // percentages/ratios per persoon → gewogen gemiddelde op inwoners
    'k_0Tot15Jaar_8',
    'k_15Tot25Jaar_9',
    'k_25Tot45Jaar_10',
    'k_45Tot65Jaar_11',
    'k_65JaarOfOuder_12',
    'GemiddeldInkomenPerInwoner_78',
    'k_40PersonenMetLaagsteInkomen_79',
    'k_20PersonenMetHoogsteInkomen_80',
    'PersonenInArmoede_81',
    'Nettoarbeidsparticipatie_71',
  ];
  const NL_FIELDS_WEIGHTED_BY_HUISHOUDENS = [
    'GemiddeldeHuishoudensgrootte_33',
    'PersonenautoSPerHuishouden_107',
  ];
  const NL_FIELDS_WEIGHTED_BY_WONINGEN = [
    'GemiddeldeWOZWaardeVanWoningen_39',
    'PercentageEengezinswoning_40',
    'Koopwoningen_47',
    'HuurwoningenTotaal_48',
    'BouwjaarMeerDanTienJaarGeleden_51',
    'BouwjaarAfgelopenTienJaar_52',
    'GemiddeldAardgasverbruik_55',
    'GemiddeldeElektriciteitslevering_53',
    'WoningenMetZonnestroom_59',
    'AardgasvrijeWoningen_57',
  ];
  const NL_FIELDS_SUM = [
    'AantalInwoners_5',
    'Mannen_6',
    'Vrouwen_7',
    'HuishoudensTotaal_29',
    'Woningvoorraad_35',
    'PersonenautoSTotaal_104',
    'Motorfietsen_109',
    'AantalPubliekeLaadpalen_61',
  ];

  function cacheGetNl() {
    try {
      const raw = localStorage.getItem(NL_CACHE_KEY);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > NL_CACHE_TTL_MS) return null;
      return data;
    } catch { return null; }
  }
  function cacheSetNl(data) {
    try {
      localStorage.setItem(NL_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch {}
  }

  // Haal alle gemeente-records op (code start met 'GM') en aggregeer tot NL-gemiddeldes
  async function fetchNlAverages() {
    const cached = cacheGetNl();
    if (cached) return cached;

    const filter = `startswith(WijkenEnBuurten,'GM')`;
    const url = `${CBS_BASE}/${CBS_DATASET}/TypedDataSet?$filter=${encodeURIComponent(filter)}&$format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('cbs_nl_' + res.status);
    const data = await res.json();
    const rows = data.value || [];
    if (!rows.length) return null;

    const out = {};
    let totalInwoners = 0;
    let totalHuishoudens = 0;
    let totalWoningen = 0;

    // Eerst totalen verzamelen
    for (const row of rows) {
      totalInwoners += Number(row.AantalInwoners_5) || 0;
      totalHuishoudens += Number(row.HuishoudensTotaal_29) || 0;
      totalWoningen += Number(row.Woningvoorraad_35) || 0;
    }

    // Sommaties
    for (const field of NL_FIELDS_SUM) {
      let sum = 0;
      for (const row of rows) sum += Number(row[field]) || 0;
      out[field] = sum;
    }

    // Gewogen gemiddeldes — inwoners
    for (const field of NL_FIELDS_WEIGHTED_BY_INWONERS) {
      let num = 0, den = 0;
      for (const row of rows) {
        const val = Number(row[field]);
        const w = Number(row.AantalInwoners_5);
        if (!isNaN(val) && !isNaN(w) && w > 0) { num += val * w; den += w; }
      }
      out[field] = den > 0 ? num / den : null;
    }

    // Gewogen gemiddeldes — huishoudens
    for (const field of NL_FIELDS_WEIGHTED_BY_HUISHOUDENS) {
      let num = 0, den = 0;
      for (const row of rows) {
        const val = Number(row[field]);
        const w = Number(row.HuishoudensTotaal_29);
        if (!isNaN(val) && !isNaN(w) && w > 0) { num += val * w; den += w; }
      }
      out[field] = den > 0 ? num / den : null;
    }

    // Gewogen gemiddeldes — woningen
    for (const field of NL_FIELDS_WEIGHTED_BY_WONINGEN) {
      let num = 0, den = 0;
      for (const row of rows) {
        const val = Number(row[field]);
        const w = Number(row.Woningvoorraad_35);
        if (!isNaN(val) && !isNaN(w) && w > 0) { num += val * w; den += w; }
      }
      out[field] = den > 0 ? num / den : null;
    }

    cacheSetNl(out);
    return out;
  }

  window.App.cbs = {
    async getStats(code) {
      return await fetchStats(code);
    },
    async getNlAverages() {
      try { return await fetchNlAverages(); }
      catch (e) { console.error('[cbs] NL averages failed:', e); return null; }
    },
    async getDashboard(code) {
      const [stats, meta] = await Promise.all([fetchStats(code), fetchMeta()]);
      if (!stats) return null;
      const byGroup = {};
      for (const [key, value] of Object.entries(stats)) {
        const m = meta[key]; if (!m) continue;
        if (value === null || value === '' || value === undefined) continue;
        (byGroup[m.group] = byGroup[m.group] || []).push({
          title: m.title, value, unit: m.unit, decimals: m.decimals,
        });
      }
      return byGroup;
    },
  };
})();
