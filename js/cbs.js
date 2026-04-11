window.App = window.App || {};
(function () {
  const { CBS_BASE, CBS_DATASET } = window.App.config;
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

  window.App.cbs = {
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
