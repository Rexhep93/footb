window.App = window.App || {};
(function () {
  const I = window.App.icons;
  const nf = new Intl.NumberFormat('nl-NL');
  const nf1 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 });

  function n(v) { return typeof v === 'number' ? nf.format(Math.round(v)) : '—'; }
  function n1(v) { return typeof v === 'number' ? nf1.format(v) : '—'; }
  function pct(v) { return typeof v === 'number' ? `${nf1.format(v)}%` : '—'; }
  function eur(v) { return typeof v === 'number' ? `€${nf.format(Math.round(v * 1000))}` : '—'; }
  function km(v) {
    if (typeof v !== 'number') return '—';
    return v < 1 ? `${Math.round(v * 1000)} m` : `${n1(v)} km`;
  }
  function has(v) { return v !== null && v !== undefined && v !== ''; }
  function b(t) { return `<strong>${t}</strong>`; }

  function themeBevolking(s) {
    const p = [];
    if (has(s.AantalInwoners_5)) {
      let line = `In jouw buurt wonen ${b(n(s.AantalInwoners_5) + ' mensen')}.`;
      if (has(s.Mannen_6) && has(s.Vrouwen_7)) {
        line += ` Daarvan zijn er ${b(n(s.Mannen_6))} man en ${b(n(s.Vrouwen_7))} vrouw.`;
      }
      p.push(line);
    }
    if (has(s.k_65JaarOfOuder_12) && has(s.AantalInwoners_5)) {
      const senior = (s.k_65JaarOfOuder_12 / s.AantalInwoners_5) * 100;
      const young = has(s.k_0Tot15Jaar_8) ? (s.k_0Tot15Jaar_8 / s.AantalInwoners_5) * 100 : null;
      let line = `${b(pct(senior))} van de buurt is 65-plusser`;
      if (young !== null) line += `, en ${b(pct(young))} is jonger dan 15 jaar`;
      p.push(line + '.');
    }
    if (has(s.HuishoudensTotaal_29) && has(s.GemiddeldeHuishoudensgrootte_33)) {
      p.push(`Samen vormen ze ${b(n(s.HuishoudensTotaal_29) + ' huishoudens')}, gemiddeld ${b(n1(s.GemiddeldeHuishoudensgrootte_33) + ' personen')} per huishouden.`);
    }
    if (has(s.Nederland_17) && has(s.AantalInwoners_5)) {
      const nl = (s.Nederland_17 / s.AantalInwoners_5) * 100;
      p.push(`${b(pct(nl))} heeft een Nederlandse achtergrond.`);
    }
    return { title: 'Bevolking', subtitle: 'De mensen om je heen', icon: I.people, lines: p };
  }

  function themeWonen(s) {
    const p = [];
    if (has(s.Woningvoorraad_35)) {
      let line = `Jouw buurt telt ${b(n(s.Woningvoorraad_35) + ' woningen')}.`;
      if (has(s.Koopwoningen_47) && has(s.HuurwoningenTotaal_48)) {
        line += ` Daarvan is ${b(pct(s.Koopwoningen_47))} een koopwoning en ${b(pct(s.HuurwoningenTotaal_48))} een huurwoning.`;
      }
      p.push(line);
    }
    if (has(s.GemiddeldeWOZWaardeVanWoningen_39)) {
      p.push(`De gemiddelde WOZ-waarde ligt op ${b(eur(s.GemiddeldeWOZWaardeVanWoningen_39))}.`);
    }
    if (has(s.PercentageEengezinswoning_40)) {
      p.push(`De meeste woningen zijn eengezinswoningen: ${b(pct(s.PercentageEengezinswoning_40))} van het totaal.`);
    }
    if (has(s.BouwjaarMeerDanTienJaarGeleden_51) && s.BouwjaarMeerDanTienJaarGeleden_51 > 90) {
      p.push(`Vrijwel alle woningen staan er al ${b('langer dan tien jaar')}.`);
    } else if (has(s.BouwjaarAfgelopenTienJaar_52)) {
      p.push(`${b(pct(s.BouwjaarAfgelopenTienJaar_52))} van de woningen is in de afgelopen tien jaar gebouwd.`);
    }
    return { title: 'Wonen', subtitle: 'De huizen in jouw straat en omgeving', icon: I.home, lines: p };
  }

  function themeInkomen(s) {
    const p = [];
    if (has(s.GemiddeldInkomenPerInwoner_78)) {
      p.push(`Het gemiddelde inkomen per inwoner is ${b(eur(s.GemiddeldInkomenPerInwoner_78))} per jaar.`);
    }
    if (has(s.k_40PersonenMetLaagsteInkomen_79) && has(s.k_20PersonenMetHoogsteInkomen_80)) {
      p.push(`${b(pct(s.k_40PersonenMetLaagsteInkomen_79))} van de buurt behoort tot de 40% laagste inkomens van Nederland, en ${b(pct(s.k_20PersonenMetHoogsteInkomen_80))} tot de 20% hoogste.`);
    }
    if (has(s.PersonenInArmoede_81)) {
      p.push(`${b(pct(s.PersonenInArmoede_81))} van de inwoners leeft onder de armoedegrens.`);
    }
    if (has(s.Nettoarbeidsparticipatie_71)) {
      p.push(`${b(pct(s.Nettoarbeidsparticipatie_71))} van de werkzame bevolking heeft betaald werk.`);
    }
    return { title: 'Inkomen', subtitle: 'Wat mensen verdienen en doen', icon: I.wallet, lines: p };
  }

  function themeVoorzieningen(s) {
    const p = [];
    const afstanden = [];
    if (has(s.AfstandTotHuisartsenpraktijk_110)) afstanden.push(`een huisarts op ${b(km(s.AfstandTotHuisartsenpraktijk_110))}`);
    if (has(s.AfstandTotGroteSupermarkt_111)) afstanden.push(`een supermarkt op ${b(km(s.AfstandTotGroteSupermarkt_111))}`);
    if (has(s.AfstandTotSchool_113)) afstanden.push(`een basisschool op ${b(km(s.AfstandTotSchool_113))}`);
    if (has(s.AfstandTotKinderdagverblijf_112)) afstanden.push(`een kinderdagverblijf op ${b(km(s.AfstandTotKinderdagverblijf_112))}`);
    if (afstanden.length) p.push(`Vanuit jouw buurt vind je ${afstanden.join(', ')}.`);
    if (has(s.ScholenBinnen3Km_114)) {
      p.push(`Binnen drie kilometer liggen ongeveer ${b(n1(s.ScholenBinnen3Km_114) + ' scholen')}.`);
    }
    return { title: 'Voorzieningen', subtitle: 'Wat je dichtbij kunt vinden', icon: I.pin, lines: p };
  }

  function themeMobiliteit(s) {
    const p = [];
    if (has(s.PersonenautoSTotaal_104)) {
      let line = `Er staan ${b(n(s.PersonenautoSTotaal_104) + ' personenauto\'s')} in de buurt`;
      if (has(s.PersonenautoSPerHuishouden_107)) line += `, gemiddeld ${b(n1(s.PersonenautoSPerHuishouden_107))} per huishouden`;
      p.push(line + '.');
    }
    if (has(s.Motorfietsen_109)) {
      p.push(`Daarnaast zijn er ${b(n(s.Motorfietsen_109) + ' motorfietsen')} geregistreerd.`);
    }
    if (has(s.AantalPubliekeLaadpalen_61)) {
      p.push(`Voor elektrisch rijden zijn er ${b(n(s.AantalPubliekeLaadpalen_61) + ' publieke laadpalen')}.`);
    }
    return { title: 'Mobiliteit', subtitle: 'Hoe de buurt zich verplaatst', icon: I.car, lines: p };
  }

  function themeEnergie(s) {
    const p = [];
    if (has(s.GemiddeldAardgasverbruik_55)) {
      p.push(`Een gemiddelde woning verbruikt ${b(n(s.GemiddeldAardgasverbruik_55) + ' m³')} aardgas per jaar.`);
    }
    if (has(s.GemiddeldeElektriciteitslevering_53)) {
      p.push(`Het gemiddelde elektriciteitsverbruik ligt op ${b(n(s.GemiddeldeElektriciteitslevering_53) + ' kWh')} per woning.`);
    }
    if (has(s.WoningenMetZonnestroom_59)) {
      p.push(`${b(pct(s.WoningenMetZonnestroom_59))} van de woningen heeft zonnepanelen op het dak.`);
    }
    if (has(s.AardgasvrijeWoningen_57)) {
      p.push(`${b(pct(s.AardgasvrijeWoningen_57))} van de woningen is al volledig aardgasvrij.`);
    }
    return { title: 'Energie', subtitle: 'Hoe de buurt woont en verwarmt', icon: I.leaf, lines: p };
  }

  const THEMES = [themeBevolking, themeWonen, themeInkomen, themeVoorzieningen, themeMobiliteit, themeEnergie];

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

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
  { id: 'meldingen', label: 'Meldingen', icon: I.nav_bell },
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

  function renderBuurtTab(content, addr, stats) {
    const sub = el('div', 'sub-header');
    sub.innerHTML = `
      <div class="sub-header-label">Jouw buurt</div>
      <div class="sub-header-address">${addr.street} ${addr.houseNumber}, ${addr.neighborhood.name || addr.city}</div>
      <div class="sub-header-meta">${addr.municipality.name}</div>`;
    content.appendChild(sub);
    const container = el('div', 'container dashboard');
    if (stats === null) {
      container.appendChild(el('div', 'state-msg', 'Buurtgegevens laden…'));
      content.appendChild(container); return;
    }
    if (stats === false) {
      container.appendChild(el('div', 'state-msg', 'Buurtgegevens zijn tijdelijk niet beschikbaar.'));
      content.appendChild(container); return;
    }
    for (const themeFn of THEMES) {
      const { title, subtitle, icon, lines } = themeFn(stats);
      if (!lines.length) continue;
      const card = el('section', 'card');
      const headerHtml = `
        <div class="card-header">
          <div class="card-header-icon">${icon}</div>
          <div class="card-header-text">
            <div class="card-header-title">${title}</div>
            <div class="card-header-subtitle">${subtitle}</div>
          </div>
          <div class="card-chevron">${I.chevron}</div>
        </div>
        <div class="card-body">${lines.map(l => `<p>${l}</p>`).join('')}</div>`;
      card.innerHTML = headerHtml;
      card.querySelector('.card-header').addEventListener('click', () => {
        card.classList.toggle('collapsed');
      });
      container.appendChild(card);
    }
    content.appendChild(container);
  }

  function renderPlaceholder(content, icon, title, text) {
    const wrap = el('div', 'placeholder');
    wrap.innerHTML = `
      <div class="placeholder-icon">${icon}</div>
      <div class="placeholder-title">${title}</div>
      <div class="placeholder-text">${text}</div>`;
    content.appendChild(wrap);
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
      <div class="sheet-item"><span class="sheet-item-label">Meldingen</span><span class="sheet-item-arrow">${I.arrow_right}</span></div>
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

  function renderThuisTab(content, addr, handlers) {
  const wrap = el('div', 'container thuis-wrap');
  wrap.innerHTML = `
    <div class="thuis-header">
      <div class="thuis-label">Welkom thuis</div>
      <div class="thuis-title">Jouw buurt in een overzicht</div>
      <div class="thuis-sub">${addr.neighborhood?.name || addr.city}, ${addr.municipality?.name || ''}</div>
    </div>

    <section class="thuis-block">
      <div class="thuis-block-title">In het kort</div>
      <div class="thuis-block-body">Binnenkort: visuele statistieken vergeleken met de rest van Nederland.</div>
      <button class="thuis-link" data-go="buurt">Lees meer over jouw buurt →</button>
    </section>

    <section class="thuis-block">
      <div class="thuis-block-title">Laatste nieuws</div>
      <div class="thuis-block-body">Binnenkort: het meest recente artikel uit jouw gemeente.</div>
      <button class="thuis-link" data-go="nieuws">Meer nieuws over jouw buurt →</button>
    </section>

    <section class="thuis-block">
      <div class="thuis-block-title">Meldingen</div>
      <div class="thuis-block-body">Binnenkort: officiële bekendmakingen uit jouw omgeving.</div>
      <button class="thuis-link" data-go="meldingen">Bekijk alle meldingen →</button>
    </section>

    <section class="thuis-block">
      <div class="thuis-block-title">Dichtbij</div>
      <div class="thuis-block-body">Binnenkort: dichtstbijzijnde supermarkt, buitenplek en eetgelegenheid.</div>
      <button class="thuis-link" data-go="kaart">Open de kaart →</button>
    </section>
  `;
  content.appendChild(wrap);

  wrap.querySelectorAll('[data-go]').forEach(btn => {
    btn.addEventListener('click', () => handlers.onTab(btn.dataset.go));
  });
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
shell(activeTab, addr, stats, handlers) {
  const content = renderChrome(activeTab, handlers.onTab, handlers.onSettings);
  if (activeTab === 'thuis') renderThuisTab(content, addr, handlers);
  else if (activeTab === 'buurt') renderBuurtTab(content, addr, stats);
  else if (activeTab === 'kaart') renderKaartTab(content, addr);
  else if (activeTab === 'nieuws') renderNieuwsTab(content, addr);
  else if (activeTab === 'meldingen') renderPlaceholder(content, I.nav_bell, 'Meldingen', 'Hier komen officiële bekendmakingen en meldingen uit jouw omgeving.');
},
    openSettings(onChangeAddress) {
      renderSettingsSheet(null, onChangeAddress);
    },
  };
})();
