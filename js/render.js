window.App = window.App || {};
(function () {
  const I = window.App.icons;
  const nf = new Intl.NumberFormat('nl-NL');
  const nf1 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 });

  function n(v) { return typeof v === 'number' ? nf.format(Math.round(v)) : '—'; }
  function n1(v) { return typeof v === 'number' ? nf1.format(v) : '—'; }
  function pct(v) { return typeof v === 'number' ? `${nf1.format(v)}%` : '—'; }
  function has(v) { return v !== null && v !== undefined && v !== ''; }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function formatDistance(km) {
    if (typeof km !== 'number' || isNaN(km)) return '—';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${nf1.format(km)}km`;
  }

  // ============================================================
  // BUURT-TAB
  // ============================================================

  function avgAge(s) {
    const a0 = Number(s.k_0Tot15Jaar_8);
    const a1 = Number(s.k_15Tot25Jaar_9);
    const a2 = Number(s.k_25Tot45Jaar_10);
    const a3 = Number(s.k_45Tot65Jaar_11);
    const a4 = Number(s.k_65JaarOfOuder_12);
    if ([a0, a1, a2, a3, a4].some(v => isNaN(v))) return null;
    const total = a0 + a1 + a2 + a3 + a4;
    if (total <= 0) return null;
    return (a0 * 7.5 + a1 * 20 + a2 * 35 + a3 * 55 + a4 * 75) / total;
  }

  function buildCharacterLabels(s) {
    const labels = [];
    const koop = Number(s.Koopwoningen_47);
    const huishoudensgrootte = Number(s.GemiddeldeHuishoudensgrootte_33);
    const senior = Number(s.k_65JaarOfOuder_12);
    const young = Number(s.k_0Tot15Jaar_8);
    const inkomen = Number(s.GemiddeldInkomenPerInwoner_78);
    const eengezins = Number(s.PercentageEengezinswoning_40);
    const zonnepanelen = Number(s.WoningenMetZonnestroom_59);

    if (huishoudensgrootte > 2.3 || young > 18) labels.push('Gezinsbuurt');
    else if (huishoudensgrootte > 0 && huishoudensgrootte < 1.9) labels.push('Veel alleenstaanden');

    if (koop > 70) labels.push('Eigenaren');
    else if (koop > 0 && koop < 40) labels.push('Huurbuurt');

    if (senior > 25) labels.push('Oudere buurt');
    else if (senior > 0 && senior < 12 && young > 18) labels.push('Jonge buurt');

    if (inkomen > 32) labels.push('Hoger inkomen');
    else if (inkomen > 0 && inkomen < 22) labels.push('Lager inkomen');

    if (eengezins > 80) labels.push('Eengezinswoningen');
    else if (eengezins > 0 && eengezins < 30) labels.push('Appartementen');

    if (zonnepanelen > 35) labels.push('Duurzaam');

    return labels.slice(0, 4);
  }

  const METRICS = [
    {
      key: 'inwoners', label: 'Inwoners', icon: 'users',
      getValue: s => Number(s.AantalInwoners_5),
      getNl: nl => null,
      format: v => n(v),
      noCompare: true,
    },
    {
      key: 'leeftijd', label: 'Gem. leeftijd', icon: 'cake',
      getValue: s => avgAge(s),
      getNl: nl => avgAge(nl),
      format: v => `${nf1.format(v)} jaar`,
    },
    {
      key: 'inkomen', label: 'Inkomen per persoon', icon: 'euro',
      getValue: s => {
        const v = Number(s.GemiddeldInkomenPerInwoner_78);
        return (isNaN(v) || v <= 0) ? null : v;
      },
      getNl: nl => {
        const v = Number(nl?.GemiddeldInkomenPerInwoner_78);
        return (isNaN(v) || v <= 0) ? null : v;
      },
      format: v => `€${nf.format(Math.round(v * 1000))}`,
    },
    {
      key: 'woz', label: 'WOZ-waarde', icon: 'tag',
      getValue: s => {
        const v = Number(s.GemiddeldeWOZWaardeVanWoningen_39);
        return (isNaN(v) || v <= 0) ? null : v;
      },
      getNl: nl => {
        const v = Number(nl?.GemiddeldeWOZWaardeVanWoningen_39);
        return (isNaN(v) || v <= 0) ? null : v;
      },
      format: v => `€${nf.format(Math.round(v * 1000))}`,
    },
    {
      key: 'koop', label: 'Koopwoningen', icon: 'key',
      getValue: s => Number(s.Koopwoningen_47),
      getNl: nl => Number(nl?.Koopwoningen_47),
      format: v => `${nf1.format(v)}%`,
    },
    {
      key: 'huishouden', label: 'Personen per huishouden', icon: 'family',
      getValue: s => Number(s.GemiddeldeHuishoudensgrootte_33),
      getNl: nl => Number(nl?.GemiddeldeHuishoudensgrootte_33),
      format: v => nf1.format(v),
    },
    {
      key: 'zon', label: 'Zonnepanelen', icon: 'sun',
      getValue: s => Number(s.WoningenMetZonnestroom_59),
      getNl: nl => Number(nl?.WoningenMetZonnestroom_59),
      format: v => `${nf1.format(v)}%`,
    },
    {
      key: 'auto', label: "Auto's per huishouden", icon: 'auto',
      getValue: s => Number(s.PersonenautoSPerHuishouden_107),
      getNl: nl => Number(nl?.PersonenautoSPerHuishouden_107),
      format: v => nf1.format(v),
    },
  ];

  function computeMetric(metric, stats, nl) {
    const value = metric.getValue(stats);
    if (value === null || value === undefined || isNaN(value)) return null;

    const nlValue = nl ? metric.getNl(nl) : null;
    let diffPct = null;
    if (!metric.noCompare && nlValue !== null && !isNaN(nlValue) && nlValue !== 0) {
      diffPct = ((value - nlValue) / nlValue) * 100;
    }

    let barBuurt = 0, barNl = 0;
    if (!metric.noCompare && nlValue !== null && !isNaN(nlValue)) {
      const max = Math.max(value, nlValue) * 1.3 || 1;
      barBuurt = (value / max) * 100;
      barNl = (nlValue / max) * 100;
    }

    return {
      value, nlValue, diffPct, barBuurt, barNl,
      formatted: metric.format(value),
      nlFormatted: nlValue !== null && !isNaN(nlValue) ? metric.format(nlValue) : null
    };
  }

  function renderMetricCard(metric, computed, onTap) {
    const card = el('button', 'metric-card');
    card.type = 'button';

    let diffHtml = '';
    if (computed.diffPct !== null) {
      const up = computed.diffPct > 0;
      const sign = up ? '+' : '';
      const cls = up ? 'diff-up' : 'diff-down';
      const arrow = up ? '↑' : '↓';
      diffHtml = `<span class="metric-diff ${cls}">${arrow} ${sign}${nf1.format(computed.diffPct)}% t.o.v. NL</span>`;
    } else if (metric.noCompare) {
      diffHtml = '<span class="metric-diff metric-diff-none">in jouw buurt</span>';
    } else {
      diffHtml = '<span class="metric-diff metric-diff-none">NL-data niet beschikbaar</span>';
    }

    let barHtml = '';
    if (!metric.noCompare && computed.nlValue !== null) {
      barHtml = `
        <div class="metric-bars">
          <div class="metric-bar-row">
            <span class="metric-bar-label">Buurt</span>
            <div class="metric-bar-track"><div class="metric-bar-fill metric-bar-buurt" style="width:${computed.barBuurt}%"></div></div>
          </div>
          <div class="metric-bar-row">
            <span class="metric-bar-label">NL</span>
            <div class="metric-bar-track"><div class="metric-bar-fill metric-bar-nl" style="width:${computed.barNl}%"></div></div>
          </div>
        </div>
      `;
    }

    const iconHtml = metric.icon && I[metric.icon] ? `<div class="metric-icon">${I[metric.icon]}</div>` : '';

    card.innerHTML = `
      <div class="metric-top">
        ${iconHtml}
        <div class="metric-label">${metric.label}</div>
      </div>
      <div class="metric-value">${computed.formatted}</div>
      ${diffHtml}
      ${barHtml}
    `;

    card.addEventListener('click', onTap);
    return card;
  }

  function buildDetailContent(metric, stats, nl) {
    const lines = [];
    const computed = computeMetric(metric, stats, nl);
    if (!computed) return '<p>Geen gegevens beschikbaar.</p>';

    if (metric.key === 'inwoners' && has(stats.Mannen_6) && has(stats.Vrouwen_7)) {
      lines.push(`<p>Daarvan ${n(stats.Mannen_6)} man en ${n(stats.Vrouwen_7)} vrouw, verdeeld over ${n(stats.HuishoudensTotaal_29)} huishoudens.</p>`);
    }
    if (metric.key === 'leeftijd') {
      const total = Number(stats.AantalInwoners_5);
      const parts = [];
      if (has(stats.k_0Tot15Jaar_8) && total > 0) {
        parts.push(`${pct((Number(stats.k_0Tot15Jaar_8) / total) * 100)} jonger dan 15`);
      }
      if (has(stats.k_65JaarOfOuder_12) && total > 0) {
        parts.push(`${pct((Number(stats.k_65JaarOfOuder_12) / total) * 100)} 65-plus`);
      }
      if (parts.length) lines.push(`<p>${parts.join(', ')}.</p>`);
    }
    if (metric.key === 'inkomen') {
      if (has(stats.k_40PersonenMetLaagsteInkomen_79) && has(stats.k_20PersonenMetHoogsteInkomen_80)) {
        lines.push(`<p>${pct(stats.k_40PersonenMetLaagsteInkomen_79)} behoort tot de 40% laagste inkomens van Nederland, ${pct(stats.k_20PersonenMetHoogsteInkomen_80)} tot de 20% hoogste.</p>`);
      }
      if (has(stats.PersonenInArmoede_81)) {
        lines.push(`<p>${pct(stats.PersonenInArmoede_81)} van de inwoners leeft onder de armoedegrens.</p>`);
      }
    }
    if (metric.key === 'woz' && has(stats.PercentageEengezinswoning_40)) {
      lines.push(`<p>${pct(stats.PercentageEengezinswoning_40)} van de woningen is een eengezinswoning.</p>`);
    }
    if (metric.key === 'koop' && has(stats.HuurwoningenTotaal_48)) {
      lines.push(`<p>Huurwoningen: ${pct(stats.HuurwoningenTotaal_48)} van het totaal.</p>`);
    }
    if (metric.key === 'zon' && has(stats.AardgasvrijeWoningen_57)) {
      lines.push(`<p>${pct(stats.AardgasvrijeWoningen_57)} van de woningen is volledig aardgasvrij.</p>`);
    }
    if (metric.key === 'auto') {
      if (has(stats.PersonenautoSTotaal_104)) lines.push(`<p>${n(stats.PersonenautoSTotaal_104)} personenauto's in de buurt.</p>`);
      if (has(stats.AantalPubliekeLaadpalen_61)) lines.push(`<p>${n(stats.AantalPubliekeLaadpalen_61)} publieke laadpalen.</p>`);
    }

    return lines.join('');
  }

  function openDetailSheet(metric, stats, nl) {
    const existing = document.getElementById('sheet-root');
    if (existing) existing.remove();

    const sheetRoot = el('div');
    sheetRoot.id = 'sheet-root';
    const backdrop = el('div', 'sheet-backdrop');
    const sheet = el('div', 'sheet');

    const computed = computeMetric(metric, stats, nl);
    const iconHtml = metric.icon && I[metric.icon] ? `<div class="sheet-hero-icon">${I[metric.icon]}</div>` : '';

    let heroHtml = '';
    let compareHtml = '';
    if (computed) {
      heroHtml = `<div class="sheet-hero-value">${computed.formatted}</div>`;
      if (computed.diffPct !== null) {
        const up = computed.diffPct > 0;
        const sign = up ? '+' : '';
        const cls = up ? 'diff-up' : 'diff-down';
        const arrow = up ? '↑' : '↓';
        heroHtml += `<div class="sheet-hero-diff ${cls}">${arrow} ${sign}${nf1.format(computed.diffPct)}% t.o.v. Nederland</div>`;
      }
      if (!metric.noCompare && computed.nlFormatted) {
        compareHtml = `
          <div class="sheet-compare">
            <div class="sheet-compare-row">
              <span class="sheet-compare-label">Jouw buurt</span>
              <span class="sheet-compare-value">${computed.formatted}</span>
              <div class="sheet-compare-track"><div class="sheet-compare-fill sheet-compare-buurt" style="width:${computed.barBuurt}%"></div></div>
            </div>
            <div class="sheet-compare-row">
              <span class="sheet-compare-label">Nederland</span>
              <span class="sheet-compare-value">${computed.nlFormatted}</span>
              <div class="sheet-compare-track"><div class="sheet-compare-fill sheet-compare-nl" style="width:${computed.barNl}%"></div></div>
            </div>
          </div>
        `;
      }
    }

    const body = buildDetailContent(metric, stats, nl);

    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <div class="sheet-hero">
        ${iconHtml}
        <div class="sheet-hero-label">${metric.label}</div>
        ${heroHtml}
      </div>
      ${compareHtml}
      <div class="sheet-body">${body}</div>
    `;

    sheetRoot.appendChild(backdrop);
    sheetRoot.appendChild(sheet);
    document.body.appendChild(sheetRoot);

    requestAnimationFrame(() => {
      backdrop.classList.add('open');
      sheet.classList.add('open');
    });

    const close = () => {
      backdrop.classList.remove('open');
      sheet.classList.remove('open');
      setTimeout(() => sheetRoot.remove(), 250);
    };
    backdrop.addEventListener('click', close);
  }

  function renderBuurtTab(content, addr, stats, nl) {
    const sub = el('div', 'sub-header');
    sub.innerHTML = `
      <div class="sub-header-label">Jouw buurt</div>
      <div class="sub-header-address">${addr.street} ${addr.houseNumber}, ${addr.neighborhood.name || addr.city}</div>
      <div class="sub-header-meta">${addr.municipality.name}</div>`;
    content.appendChild(sub);

    const container = el('div', 'container buurt-wrap');

    if (stats === null) {
      container.appendChild(el('div', 'state-msg', 'Buurtgegevens laden…'));
      content.appendChild(container); return;
    }
    if (stats === false) {
      container.appendChild(el('div', 'state-msg', 'Buurtgegevens zijn tijdelijk niet beschikbaar.'));
      content.appendChild(container); return;
    }

    const labels = buildCharacterLabels(stats);
    if (labels.length) {
      const charCard = el('section', 'char-card');
      charCard.innerHTML = `
        <div class="char-title">Buurtprofiel</div>
        <div class="char-labels">
          ${labels.map(l => `<span class="char-label">${escapeHtml(l)}</span>`).join('')}
        </div>
      `;
      container.appendChild(charCard);
    }

    const gridHeader = el('div', 'metric-section-title');
    gridHeader.textContent = nl ? 'Vergeleken met Nederland' : 'Kerncijfers';
    container.appendChild(gridHeader);

    const grid = el('div', 'metric-grid');
    for (const metric of METRICS) {
      const computed = computeMetric(metric, stats, nl);
      if (!computed) continue;
      const card = renderMetricCard(metric, computed, () => openDetailSheet(metric, stats, nl));
      grid.appendChild(card);
    }
    container.appendChild(grid);

    if (!nl) {
      const note = el('div', 'buurt-note', 'Landelijke vergelijking is tijdelijk niet beschikbaar.');
      container.appendChild(note);
    }

    content.appendChild(container);
  }

  // ============================================================
  // THUIS-TAB — dashboard met preview blokken
  // ============================================================

  function distanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }

const _thuisCache = {
  addrKey: null,
  stats: undefined,
  nl: undefined,
  news: undefined,
  publicaties: undefined,
  voorzieningen: undefined,
  vandaag: undefined,  // NIEUW: { items: [...allItems...] }
};
 
function resetThuisCache(addrKey) {
  _thuisCache.addrKey = addrKey;
  _thuisCache.stats = undefined;
  _thuisCache.nl = undefined;
  _thuisCache.news = undefined;
  _thuisCache.publicaties = undefined;
  _thuisCache.voorzieningen = undefined;
  _thuisCache.vandaag = undefined;  // NIEUW
}
  
  function buildStatsPreview(stats, nl) {
    if (!stats || !nl) return [];
    const scored = [];
    for (const metric of METRICS) {
      if (metric.noCompare) continue;
      const c = computeMetric(metric, stats, nl);
      if (!c || c.diffPct === null) continue;
      scored.push({ metric, computed: c, score: Math.abs(c.diffPct) });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  }

  function renderStatsPreviewBlock(stats, nl, onTapBlock) {
    const block = el('section', 'thuis-block thuis-block-clickable');
    block.innerHTML = `
      <div class="thuis-block-header">
        <div class="thuis-block-title">Jouw buurt in het kort</div>
        <span class="thuis-block-arrow">${I.arrow_right}</span>
      </div>
    `;

    if (stats === undefined || nl === undefined) {
      const list = el('div', 'thuis-stats-preview');
      for (let i = 0; i < 3; i++) list.appendChild(el('div', 'thuis-stat-row skeleton-row'));
      block.appendChild(list);
    } else if (!stats || !nl) {
      block.appendChild(el('div', 'thuis-block-empty', 'Vergelijking tijdelijk niet beschikbaar.'));
    } else {
      const top = buildStatsPreview(stats, nl);
      if (top.length === 0) {
        block.appendChild(el('div', 'thuis-block-empty', 'Geen vergelijking mogelijk.'));
      } else {
        const list = el('div', 'thuis-stats-preview');
        for (const { metric, computed } of top) {
          const up = computed.diffPct > 0;
          const sign = up ? '+' : '';
          const cls = up ? 'diff-up' : 'diff-down';
          const arrow = up ? '↑' : '↓';
          const iconHtml = metric.icon && I[metric.icon] ? `<span class="thuis-stat-icon">${I[metric.icon]}</span>` : '';
          const row = el('div', 'thuis-stat-row');
          row.innerHTML = `
            ${iconHtml}
            <div class="thuis-stat-text">
              <div class="thuis-stat-label">${metric.label}</div>
              <div class="thuis-stat-value">${computed.formatted}</div>
            </div>
            <div class="thuis-stat-diff ${cls}">${arrow} ${sign}${nf1.format(computed.diffPct)}%</div>
          `;
          list.appendChild(row);
        }
        block.appendChild(list);
      }
    }

    block.addEventListener('click', () => onTapBlock());
    return block;
  }

  function buildVoorzieningenPreview(points, coords) {
    if (!points || !coords) return [];
    const CATEGORIES = window.App.map?.CATEGORIES || window.App.overpass?.CATEGORIES || {};
    const perCat = {};
    for (const key of Object.keys(CATEGORIES)) perCat[key] = null;

    for (const p of points) {
      if (!CATEGORIES[p.category]) continue;
      const d = distanceKm(coords.lat, coords.lng, p.lat, p.lng);
      if (!perCat[p.category] || d < perCat[p.category].distance) {
        perCat[p.category] = { point: p, distance: d };
      }
    }

    const out = [];
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      if (!perCat[key]) continue;
      out.push({ key, label: cat.label, color: cat.color, distance: perCat[key].distance, name: perCat[key].point.name });
    }
    out.sort((a, b) => a.distance - b.distance);
    return out;
  }

  function renderDichtbijBlock(voorzieningen, onTapBlock) {
    const block = el('section', 'thuis-block thuis-block-clickable');
    block.innerHTML = `
      <div class="thuis-block-header">
        <div class="thuis-block-title">Dichtbij</div>
        <span class="thuis-block-arrow">${I.arrow_right}</span>
      </div>
    `;

    if (voorzieningen === undefined) {
      const strip = el('div', 'thuis-voorz-strip');
      for (let i = 0; i < 4; i++) strip.appendChild(el('div', 'thuis-voorz-chip skeleton-chip'));
      block.appendChild(strip);
    } else if (!voorzieningen || voorzieningen.length === 0) {
      block.appendChild(el('div', 'thuis-block-empty', 'Geen voorzieningen gevonden.'));
    } else {
      const strip = el('div', 'thuis-voorz-strip');
      for (const v of voorzieningen) {
        const chip = el('div', 'thuis-voorz-chip');
        chip.innerHTML = `
          <span class="thuis-voorz-dot" style="background:${v.color}"></span>
          <span class="thuis-voorz-label">${escapeHtml(v.label)}</span>
          <span class="thuis-voorz-dist">${formatDistance(v.distance)}</span>
        `;
        strip.appendChild(chip);
      }
      block.appendChild(strip);
    }

    block.addEventListener('click', () => onTapBlock());
    return block;
  }

  function renderNieuwsBlock(news, onTapBlock) {
    const block = el('section', 'thuis-block thuis-block-clickable');
    block.innerHTML = `
      <div class="thuis-block-header">
        <div class="thuis-block-title">Laatste nieuws</div>
        <span class="thuis-block-arrow">${I.arrow_right}</span>
      </div>
    `;

    if (news === undefined) {
      const skel = el('div', 'thuis-news-preview');
      skel.innerHTML = `
        <div class="thuis-news-image skeleton-img"></div>
        <div class="thuis-news-body">
          <div class="skeleton-line skeleton-line-short"></div>
          <div class="skeleton-line skeleton-line-long"></div>
        </div>
      `;
      block.appendChild(skel);
    } else if (!news || news.length === 0) {
      block.appendChild(el('div', 'thuis-block-empty', 'Geen recent nieuws.'));
    } else {
      const item = news[0];
      const preview = el('div', 'thuis-news-preview');
      const img = item.image ? `<div class="thuis-news-image" style="background-image:url('${item.image}')"></div>` : '<div class="thuis-news-image thuis-news-image-empty"></div>';
      preview.innerHTML = `
        ${img}
        <div class="thuis-news-body">
          <div class="thuis-news-meta">${escapeHtml(item.source)} · ${window.App.news.formatDate(item.pubDate)}</div>
          <div class="thuis-news-title">${escapeHtml(item.title)}</div>
        </div>
      `;
      block.appendChild(preview);
    }

    block.addEventListener('click', () => onTapBlock());
    return block;
  }

  function renderPublicatiesBlock(publicaties, onTapBlock) {
    const block = el('section', 'thuis-block thuis-block-clickable');
    block.innerHTML = `
      <div class="thuis-block-header">
        <div class="thuis-block-title">Publicaties</div>
        <span class="thuis-block-arrow">${I.arrow_right}</span>
      </div>
    `;

    if (publicaties === undefined) {
      const skel = el('div', 'thuis-pub-skeleton');
      skel.innerHTML = `
        <div class="skeleton-line skeleton-line-short"></div>
        <div class="thuis-pub-row skeleton-row"></div>
        <div class="thuis-pub-row skeleton-row"></div>
      `;
      block.appendChild(skel);
    } else if (!publicaties || !publicaties.records || publicaties.records.length === 0) {
      block.appendChild(el('div', 'thuis-block-empty', 'Geen publicaties binnen 500 m.'));
    } else {
      const { records, total } = publicaties;
      const summary = el('div', 'thuis-pub-summary');
      summary.textContent = `${total} ${total === 1 ? 'publicatie' : 'publicaties'} binnen 500 m`;
      block.appendChild(summary);

      const list = el('div', 'thuis-pub-list');
      for (const r of records.slice(0, 2)) {
        const row = el('div', 'thuis-pub-row');
        row.innerHTML = `
          <span class="thuis-pub-type">${escapeHtml(r.typeLabel)}</span>
          <span class="thuis-pub-title">${escapeHtml(r.title)}</span>
        `;
        list.appendChild(row);
      }
      block.appendChild(list);
    }

    block.addEventListener('click', () => onTapBlock());
    return block;
  }

  function renderVandaagBlock(vandaag) {
  // Block verbergen als geen items (alleen tonen tijdens loading of als er iets is)
  const block = el('section', 'thuis-block thuis-vandaag');
 
  const today = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  block.innerHTML = `
    <div class="thuis-vandaag-header">
      <div class="thuis-vandaag-label">Vandaag in jouw buurt</div>
      <div class="thuis-vandaag-date">${today.charAt(0).toUpperCase() + today.slice(1)}</div>
    </div>
  `;
 
  if (vandaag === undefined) {
    // Skeleton
    const list = el('div', 'thuis-vandaag-list');
    for (let i = 0; i < 3; i++) list.appendChild(el('div', 'thuis-vandaag-item skeleton-row'));
    block.appendChild(list);
    return block;
  }
 
  if (!vandaag || !vandaag.items || vandaag.items.length === 0) {
    block.appendChild(el('div', 'thuis-vandaag-empty', 'Niks bijzonders vandaag.'));
    return block;
  }
 
  const list = el('div', 'thuis-vandaag-list');
  for (const item of vandaag.items) {
    const row = el('div', `thuis-vandaag-item urgency-${item.urgency || 'info'}`);
    const iconHtml = item.icon && I[item.icon] ? `<span class="thuis-vandaag-icon">${I[item.icon]}</span>` : '';
    row.innerHTML = `
      ${iconHtml}
      <div class="thuis-vandaag-text">
        <div class="thuis-vandaag-title">${escapeHtml(item.title)}</div>
        ${item.subtitle ? `<div class="thuis-vandaag-subtitle">${escapeHtml(item.subtitle)}</div>` : ''}
      </div>
    `;
    if (item.tapAction) {
      row.classList.add('thuis-vandaag-clickable');
      row.addEventListener('click', item.tapAction);
    }
    list.appendChild(row);
  }
  block.appendChild(list);
  return block;
}

  function loadThuisData(addr, stats, nl) {
    const addrKey = addr.bag?.nummeraanduidingId || `${addr.coords?.lat},${addr.coords?.lng}`;
    if (_thuisCache.addrKey !== addrKey) resetThuisCache(addrKey);

    _thuisCache.stats = stats;
    _thuisCache.nl = nl;

    const coords = addr.coords;
    const tasks = [];

    if (_thuisCache.news === undefined) {
      tasks.push((async () => {
        try {
          const province = addr.province?.name;
          if (!province) { _thuisCache.news = null; return; }
          const { items } = await window.App.news.fetchForRegion(
            province, addr.municipality?.name, addr.neighborhood?.name, addr.district?.name
          );
          _thuisCache.news = items || [];
        } catch (e) { console.error('[thuis news]', e); _thuisCache.news = null; }
      })());
    }

    if (_thuisCache.publicaties === undefined && coords) {
      tasks.push((async () => {
        try {
          const { records, total } = await window.App.meldingen.fetchPage(coords.lat, coords.lng, 0.5, 1);
          _thuisCache.publicaties = { records, total };
        } catch (e) { console.error('[thuis pub]', e); _thuisCache.publicaties = null; }
      })());
    }

    if (_thuisCache.voorzieningen === undefined && coords) {
      tasks.push((async () => {
        try {
          const points = await window.App.overpass.fetchNearby(coords.lat, coords.lng, 1000);
          _thuisCache.voorzieningen = buildVoorzieningenPreview(points, coords);
        } catch (e) { console.error('[thuis voorz]', e); _thuisCache.voorzieningen = null; }
      })());
    }

    if (_thuisCache.vandaag === undefined) {
  tasks.push((async () => {
    try {
      const allItems = [];
      // Sequentieel om volgorde te garanderen, maar elke fetcher mag faillen
      for (const source of window.App.vandaag.SOURCES) {
        try {
          const result = await source.fetch(addr);
          if (result && result.items) allItems.push(...result.items);
        } catch (e) {
          console.error(`[vandaag ${source.key}]`, e);
        }
      }
      _thuisCache.vandaag = { items: allItems };
    } catch (e) {
      console.error('[vandaag]', e);
      _thuisCache.vandaag = null;
    }
  })());
}

    return tasks;
  }

  function renderThuisTab(content, addr, stats, nl, handlers) {
    const wrap = el('div', 'container thuis-wrap');
    wrap.innerHTML = `
      <div class="thuis-header">
        <div class="thuis-label">Welkom thuis</div>
        <div class="thuis-title">${escapeHtml(addr.street)} ${escapeHtml(addr.houseNumber || '')}</div>
        <div class="thuis-sub">${escapeHtml(addr.neighborhood?.name || addr.city)}${addr.municipality?.name ? ', ' + escapeHtml(addr.municipality.name) : ''}</div>
      </div>
      <div id="thuis-blocks"></div>
    `;
    content.appendChild(wrap);

    const blocksEl = wrap.querySelector('#thuis-blocks');

function rerender() {
  blocksEl.innerHTML = '';
  blocksEl.appendChild(renderVandaagBlock(_thuisCache.vandaag));  // NIEUW: bovenaan
  blocksEl.appendChild(renderStatsPreviewBlock(_thuisCache.stats, _thuisCache.nl, () => handlers.onTab('buurt')));
  blocksEl.appendChild(renderDichtbijBlock(_thuisCache.voorzieningen, () => handlers.onTab('kaart')));
  blocksEl.appendChild(renderNieuwsBlock(_thuisCache.news, () => handlers.onTab('nieuws')));
  blocksEl.appendChild(renderPublicatiesBlock(_thuisCache.publicaties, () => handlers.onTab('meldingen')));
}

    rerender();

    const tasks = loadThuisData(addr, stats, nl);
    for (const task of tasks) {
      task.then(() => {
        if (document.getElementById('thuis-blocks') === blocksEl) rerender();
      });
    }
  }

  // ============================================================
  // Chrome, onboarding, settings, overige tabs
  // ============================================================

  function renderChrome(activeTab, onTabChange, onSettings) {
    const root = document.getElementById('app');
    root.innerHTML = '';
    const header = el('div', 'app-header');
    header.innerHTML = `
      <div class="app-header-inner">
        <div class="logo">Dichtbij</div>
        <button class="icon-btn" id="settings-btn" aria-label="Instellingen">${I.settings}</button>
      </div>`;
    root.appendChild(header);
    header.querySelector('#settings-btn').addEventListener('click', onSettings);
    const content = el('div');
    content.id = 'tab-content';
    root.appendChild(content);
    const tabs = [
      { id: 'thuis', label: 'Thuis', icon: I.nav_home },
      { id: 'buurt', label: 'Buurt', icon: I.nav_neighbourhood },
      { id: 'kaart', label: 'Kaart', icon: I.nav_map },
      { id: 'nieuws', label: 'Nieuws', icon: I.nav_news },
      { id: 'meldingen', label: 'Publicaties', icon: I.nav_bell },
    ];
    const nav = el('nav', 'bottom-nav');
    const inner = el('div', 'bottom-nav-inner');
    for (const t of tabs) {
      const btn = el('button', 'nav-tab' + (t.id === activeTab ? ' active' : ''));
      btn.innerHTML = `${t.icon}<span>${t.label}</span>`;
      btn.addEventListener('click', () => onTabChange(t.id));
      inner.appendChild(btn);
    }
    nav.appendChild(inner);
    root.appendChild(nav);
    return content;
  }

  function renderSettingsSheet(onClose, onChangeAddress) {
    const existing = document.getElementById('sheet-root');
    if (existing) existing.remove();
    const sheetRoot = el('div');
    sheetRoot.id = 'sheet-root';
    const backdrop = el('div', 'sheet-backdrop');
    const sheet = el('div', 'sheet');
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Instellingen</h2>
      <div class="sheet-item" data-action="change"><span class="sheet-item-label">Wijzig mijn buurt</span><span class="sheet-item-arrow">${I.arrow_right}</span></div>
      <div class="sheet-item"><span class="sheet-item-label">Voeg een buurt toe</span><span class="sheet-item-arrow">${I.arrow_right}</span></div>
      <div class="sheet-item"><span class="sheet-item-label">Publicaties</span><span class="sheet-item-arrow">${I.arrow_right}</span></div>
      <div class="sheet-item"><span class="sheet-item-label">Feedback</span><span class="sheet-item-arrow">${I.arrow_right}</span></div>
      <div class="sheet-item"><span class="sheet-item-label">De kleine lettertjes</span><span class="sheet-item-arrow">${I.arrow_right}</span></div>`;
    sheetRoot.appendChild(backdrop);
    sheetRoot.appendChild(sheet);
    document.body.appendChild(sheetRoot);
    requestAnimationFrame(() => {
      backdrop.classList.add('open');
      sheet.classList.add('open');
    });
    const close = () => {
      backdrop.classList.remove('open');
      sheet.classList.remove('open');
      setTimeout(() => sheetRoot.remove(), 250);
      onClose && onClose();
    };
    backdrop.addEventListener('click', close);
    sheet.querySelector('[data-action="change"]').addEventListener('click', () => { close(); onChangeAddress(); });
  }

  function renderKaartTab(content, addr) {
    const { CATEGORIES } = window.App.map;
    const wrap = el('div', 'map-wrap');
    wrap.innerHTML = `
      <div class="map-filters" id="map-filters"></div>
      <div class="map-status" id="map-status">Kaart laden…</div>
      <div class="map-container" id="leaflet-map"></div>
    `;
    content.appendChild(wrap);
    const filters = wrap.querySelector('#map-filters');
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      const chip = el('button', 'filter-chip active');
      chip.dataset.key = key;
      chip.innerHTML = `<span class="chip-dot" style="background:${cat.color}"></span>${cat.label}`;
      chip.addEventListener('click', () => {
        window.App.map.toggleFilter(key);
        chip.classList.toggle('active');
      });
      filters.appendChild(chip);
    }
    const statusEl = wrap.querySelector('#map-status');
    setTimeout(() => {
      window.App.map.init('leaflet-map', addr, (state, info) => {
        if (state === 'loading') statusEl.textContent = 'Voorzieningen laden…';
        else if (state === 'ready') statusEl.textContent = `${info} plekken in de buurt gevonden`;
        else if (state === 'error') statusEl.textContent = info;
      });
    }, 50);
  }

  async function renderNieuwsTab(content, addr) {
    const provinceName = addr.province?.name || null;
    const municipalityName = addr.municipality?.name || '';
    const wrap = el('div', 'container news-wrap');
    wrap.innerHTML = `
      <div class="news-header">
        <div class="news-title">Nieuws uit ${municipalityName}</div>
        <div class="news-sub" id="news-sub">Laden…</div>
      </div>
      <div id="news-list"></div>
    `;
    content.appendChild(wrap);
    const listEl = wrap.querySelector('#news-list');
    const subEl = wrap.querySelector('#news-sub');
    if (!provinceName) {
      subEl.textContent = 'Provinciegegevens ontbreken. Voer je adres opnieuw in via Instellingen.';
      return;
    }
    try {
      const { items, hasSource } = await window.App.news.fetchForRegion(
        provinceName,
        municipalityName,
        addr.neighborhood?.name,
        addr.district?.name
      );
      if (!hasSource) {
        subEl.textContent = `Nog geen nieuwsbron beschikbaar voor ${addr.province.name}.`;
        return;
      }
      if (!items.length) {
        subEl.textContent = 'Geen recent nieuws gevonden voor jouw gemeente.';
        return;
      }
      subEl.textContent = `${items.length} artikel${items.length === 1 ? '' : 'en'} gevonden`;
      for (const item of items) {
        const card = el('a', 'news-card');
        card.href = item.link;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        const img = item.image ? `<div class="news-image" style="background-image:url('${item.image}')"></div>` : '';
        card.innerHTML = `
          ${img}
          <div class="news-body">
            <div class="news-meta">${item.source} · ${window.App.news.formatDate(item.pubDate)}</div>
            <div class="news-headline">${item.title}</div>
            <div class="news-desc">${item.description.slice(0, 140)}${item.description.length > 140 ? '…' : ''}</div>
          </div>
        `;
        listEl.appendChild(card);
      }
    } catch (e) {
      console.error(e);
      subEl.textContent = 'Nieuws tijdelijk niet beschikbaar.';
    }
  }

  const _meldingenState = {
    addrKey: null,
    radiusM: 200,
    page: 1,
    total: 0,
    records: [],
    loading: false,
    error: null
  };

  function formatRadius(m) {
    if (m < 1000) return `${m} m`;
    const km = m / 1000;
    return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`;
  }

  async function renderMeldingenTab(content, addr) {
    const coords = addr.coords;
    const addrKey = addr.bag?.nummeraanduidingId || `${coords?.lat},${coords?.lng}`;

    if (_meldingenState.addrKey !== addrKey) {
      _meldingenState.addrKey = addrKey;
      _meldingenState.radiusM = 200;
      _meldingenState.page = 1;
      _meldingenState.total = 0;
      _meldingenState.records = [];
      _meldingenState.error = null;
    }

    const wrap = el('div', 'container meldingen-wrap');
    wrap.innerHTML = `
      <div class="meldingen-header">
        <div class="meldingen-title">Publicaties</div>
        <div class="meldingen-sub" id="meldingen-sub">Officiële publicaties binnen een straal rondom jouw adres</div>
      </div>

      <div class="radius-card">
        <div class="radius-map" id="meldingen-map"></div>
        <div class="radius-controls">
          <div class="radius-label">
            <span>Straal</span>
            <strong id="meldingen-radius-value">${formatRadius(_meldingenState.radiusM)}</strong>
          </div>
          <input type="range" id="meldingen-radius" min="100" max="5000" step="100" value="${_meldingenState.radiusM}">
          <div class="radius-ticks"><span>100 m</span><span>1 km</span><span>2,5 km</span><span>5 km</span></div>
        </div>
      </div>

      <div id="meldingen-list"></div>
      <button class="btn meldingen-more" id="meldingen-more" style="display:none">Meer laden</button>
    `;
    content.appendChild(wrap);

    if (!coords) {
      wrap.querySelector('#meldingen-sub').textContent = 'Locatie ontbreekt. Voer je adres opnieuw in via Instellingen.';
      return;
    }

    const listEl = wrap.querySelector('#meldingen-list');
    const subEl = wrap.querySelector('#meldingen-sub');
    const moreBtn = wrap.querySelector('#meldingen-more');
    const slider = wrap.querySelector('#meldingen-radius');
    const radiusValEl = wrap.querySelector('#meldingen-radius-value');

    let mapInstance = null;
    let radiusCircle = null;

    function initMap() {
      setTimeout(() => {
        mapInstance = L.map('meldingen-map', {
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
          boxZoom: false,
          keyboard: false
        }).setView([coords.lat, coords.lng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapInstance);

        L.circleMarker([coords.lat, coords.lng], {
          radius: 5, color: '#fff', weight: 2, fillColor: '#1a2e28', fillOpacity: 1
        }).addTo(mapInstance);

        radiusCircle = L.circle([coords.lat, coords.lng], {
          radius: _meldingenState.radiusM,
          color: '#1a2e28', weight: 2, fillColor: '#1a2e28', fillOpacity: 0.12
        }).addTo(mapInstance);

        fitMap();
      }, 50);
    }

    function fitMap() {
      if (!mapInstance || !radiusCircle) return;
      mapInstance.fitBounds(radiusCircle.getBounds(), { padding: [20, 20] });
    }

    function updateMapRadius(m) {
      if (!radiusCircle) return;
      radiusCircle.setRadius(m);
      fitMap();
    }

    function renderList() {
      if (_meldingenState.error && _meldingenState.records.length === 0) {
        listEl.innerHTML = '<div class="state-msg">Publicaties tijdelijk niet beschikbaar.</div>';
        subEl.textContent = '';
        moreBtn.style.display = 'none';
        return;
      }
      if (_meldingenState.records.length === 0 && _meldingenState.loading) {
        listEl.innerHTML = '<div class="state-msg">Laden…</div>';
        subEl.textContent = `Binnen ${formatRadius(_meldingenState.radiusM)}`;
        moreBtn.style.display = 'none';
        return;
      }
      if (_meldingenState.records.length === 0) {
        listEl.innerHTML = `<div class="state-msg">Geen publicaties binnen ${formatRadius(_meldingenState.radiusM)}.</div>`;
        subEl.textContent = '';
        moreBtn.style.display = 'none';
        return;
      }

      listEl.innerHTML = _meldingenState.records.map(r => `
        <a class="melding-card" href="${r.url}" target="_blank" rel="noopener noreferrer">
          <div class="melding-meta">
            <span class="melding-type">${r.typeLabel}</span>
            <span class="melding-date">${window.App.meldingen.formatDate(r.date)}</span>
          </div>
          <div class="melding-title">${escapeHtml(r.title)}</div>
          ${r.location ? `<div class="melding-loc">${escapeHtml(r.location)}</div>` : ''}
        </a>
      `).join('');

      subEl.textContent = `${_meldingenState.records.length} van ${_meldingenState.total} binnen ${formatRadius(_meldingenState.radiusM)}`;
      const hasMore = _meldingenState.records.length < _meldingenState.total;
      moreBtn.style.display = hasMore ? 'block' : 'none';
      moreBtn.disabled = _meldingenState.loading;
      moreBtn.textContent = _meldingenState.loading ? 'Laden…' : 'Meer laden';
    }

    async function loadNext() {
      if (_meldingenState.loading) return;
      _meldingenState.loading = true;
      renderList();
      try {
        const { records, total } = await window.App.meldingen.fetchPage(
          coords.lat, coords.lng, _meldingenState.radiusM / 1000, _meldingenState.page
        );
        _meldingenState.total = total;
        _meldingenState.records = _meldingenState.records.concat(records);
        _meldingenState.page += 1;
        _meldingenState.error = null;
      } catch (err) {
        console.error('[meldingen]', err);
        _meldingenState.error = err;
      } finally {
        _meldingenState.loading = false;
        renderList();
      }
    }

    async function resetAndLoad() {
      _meldingenState.page = 1;
      _meldingenState.total = 0;
      _meldingenState.records = [];
      _meldingenState.error = null;
      await loadNext();
    }

    let sliderTimer = null;
    slider.addEventListener('input', e => {
      const m = parseInt(e.target.value, 10);
      _meldingenState.radiusM = m;
      radiusValEl.textContent = formatRadius(m);
      updateMapRadius(m);
      if (sliderTimer) clearTimeout(sliderTimer);
      sliderTimer = setTimeout(() => resetAndLoad(), 400);
    });

    moreBtn.addEventListener('click', loadNext);

    initMap();
    renderList();
    if (_meldingenState.records.length === 0 && !_meldingenState.error) {
      loadNext();
    }
  }

  window.App.render = {
    onboarding(onSubmit) {
      const root = document.getElementById('app');
      root.innerHTML = '';
      const wrap = el('div', 'onboarding');
      wrap.innerHTML = `
        <div class="onboarding-inner">
          <h1 class="brand">Dichtbij</h1>
          <p class="tagline">Ontdek wat er speelt in jouw buurt.</p>
          <div class="form-row">
            <div class="field field-pc"><label>Postcode</label><input id="pc" placeholder="1234 AB" autocomplete="postal-code"></div>
            <div class="field"><label>Nr.</label><input id="hn" placeholder="22" inputmode="numeric"></div>
          </div>
          <button class="btn" id="go">Bekijk mijn buurt</button>
          <div class="error" id="err" style="display:none"></div>
        </div>`;
      root.appendChild(wrap);
      const btn = wrap.querySelector('#go');
      const err = wrap.querySelector('#err');
      btn.addEventListener('click', async () => {
        const pc = wrap.querySelector('#pc').value;
        const hn = wrap.querySelector('#hn').value;
        if (!pc.trim() || !hn.trim()) { err.textContent = 'Vul postcode en huisnummer in.'; err.style.display = 'block'; return; }
        btn.disabled = true; btn.textContent = 'Zoeken…'; err.style.display = 'none';
        try { await onSubmit(pc, hn); }
        catch (e) { err.textContent = 'Dit adres kunnen we niet vinden. Controleer postcode en huisnummer.'; err.style.display = 'block'; btn.disabled = false; btn.textContent = 'Bekijk mijn buurt'; }
      });
      wrap.querySelector('#pc').focus();
    },
    shell(activeTab, addr, stats, nl, handlers) {
      const content = renderChrome(activeTab, handlers.onTab, handlers.onSettings);
      if (activeTab === 'thuis') renderThuisTab(content, addr, stats, nl, handlers);
      else if (activeTab === 'buurt') renderBuurtTab(content, addr, stats, nl);
      else if (activeTab === 'kaart') renderKaartTab(content, addr);
      else if (activeTab === 'nieuws') renderNieuwsTab(content, addr);
      else if (activeTab === 'meldingen') renderMeldingenTab(content, addr);
    },
    openSettings(onChangeAddress) {
      renderSettingsSheet(null, onChangeAddress);
    },
  };
})();
