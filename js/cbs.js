// js/cbs.js
// Handles CBS Open Data API for neighborhood statistics
// Docs: https://www.cbs.nl/nl-nl/onze-diensten/open-data

const CBS_BASE = 'https://opendata.cbs.nl/ODataApi/OData';

// Dataset IDs for Kerncijfers Wijken en Buurten per year
// Update these once a year when new datasets are published
const DATASETS = {
  2024: '85984NED',
  2025: '86165NED'
  // 2026: '8XXXXXXX' // add when published
};

// Which dataset to use as primary source for now
const PRIMARY_DATASET = DATASETS[2024];

/**
 * Trim trailing/leading whitespace from CBS string values.
 * CBS stores strings with fixed-width padding (e.g. "Venlo     ").
 */
function trimCbsString(value) {
  if (typeof value !== 'string') return value;
  return value.trim();
}

/**
 * Metadata cache: fetched once per session, describes each field.
 * { "AantalInwoners_5": { title: "Aantal inwoners", unit: "aantal", description: "...", group: "Bevolking" } }
 */
let metadataCache = null;

/**
 * Fetch and build the metadata lookup table.
 * Walks the DataProperties tree to map each Topic to its parent TopicGroup.
 */
export async function fetchMetadata(datasetId = PRIMARY_DATASET) {
  if (metadataCache) return metadataCache;

  const url = `${CBS_BASE}/${datasetId}/DataProperties`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CBS metadata fetch failed: ${res.status}`);
  const data = await res.json();
  const items = data.value || [];

  // Build a map of groups by ID for parent lookup
  const groupsById = {};
  for (const item of items) {
    if (item.Type === 'TopicGroup') {
      groupsById[item.ID] = item;
    }
  }

  // Walk up the parent chain to find the top-level group name
  function getTopGroup(parentId) {
    while (parentId != null) {
      const parent = groupsById[parentId];
      if (!parent) return null;
      if (parent.ParentID == null) return parent.Title;
      parentId = parent.ParentID;
    }
    return null;
  }

  // Now map each Topic (actual data field) to its metadata
  const result = {};
  for (const item of items) {
    if (item.Type !== 'Topic') continue;
    result[item.Key] = {
      key: item.Key,
      title: item.Title?.trim(),
      unit: item.Unit,
      description: item.Description?.trim() || null,
      datatype: item.Datatype,
      decimals: item.Decimals || 0,
      presentationType: item.PresentationType, // 'Absolute' or 'Relative'
      group: getTopGroup(item.ParentID)
    };
  }

  metadataCache = result;
  return result;
}

/**
 * Fetch statistics for a specific buurt/wijk/gemeente code.
 * Uses startswith() to avoid CBS's space-padding gotcha in filters.
 *
 * @param {string} code - e.g. 'BU09833101', 'WK098331', 'GM0983'
 * @param {string} datasetId - optional, defaults to primary
 * @returns {Object|null} cleaned data object, or null if not found
 */
export async function fetchBuurtStats(code, datasetId = PRIMARY_DATASET) {
  const url = `${CBS_BASE}/${datasetId}/TypedDataSet` +
    `?$filter=${encodeURIComponent(`startswith(WijkenEnBuurten,'${code}')`)}` +
    `&$format=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`CBS data fetch failed: ${res.status}`);
  const data = await res.json();
  const rows = data.value || [];

  if (rows.length === 0) return null;

  // Use the first match (should be exact since we filter by full code)
  const raw = rows[0];

  // Clean up: trim string values, keep numbers as-is, null stays null
  const cleaned = {};
  for (const [key, value] of Object.entries(raw)) {
    cleaned[key] = typeof value === 'string' ? trimCbsString(value) : value;
  }

  return cleaned;
}

/**
 * Combine raw stats with metadata into a display-ready structure,
 * grouped by theme. Useful for rendering a dashboard.
 *
 * Returns: { "Bevolking": [ { title, value, unit, description, key }, ... ], ... }
 */
export async function getBuurtDashboard(code) {
  const [stats, meta] = await Promise.all([
    fetchBuurtStats(code),
    fetchMetadata()
  ]);

  if (!stats) return null;

  const byGroup = {};
  for (const [key, value] of Object.entries(stats)) {
    const fieldMeta = meta[key];
    if (!fieldMeta) continue; // skip fields without metadata (e.g. ID, Codering_3)

    const group = fieldMeta.group || 'Overig';
    if (!byGroup[group]) byGroup[group] = [];

    byGroup[group].push({
      key,
      title: fieldMeta.title,
      value, // can be null — UI must handle
      unit: fieldMeta.unit,
      description: fieldMeta.description,
      decimals: fieldMeta.decimals,
      isRelative: fieldMeta.presentationType === 'Relative'
    });
  }

  return byGroup;
}
