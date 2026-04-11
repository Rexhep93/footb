window.App = window.App || {};
(function () {

  // ---------- formatting helpers ----------

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
  function b(text) { return `<strong>${text}</strong>`; }

  // ---------- insights engine ----------
  // Each theme takes raw CBS stats and returns { title, lines: [html, ...] }
  // Lines with missing data are skipped silently.

  function themeBevolking(s) {
    const lines = [];
    if (has(s.AantalInwoners_5)) {
      const extra = [];
      if (has(s.Mannen_6) && has(s.Vrouwen_7)) {
        extra.push(`${b(n(s.Mannen_6))} mannen en ${b(n(s.Vrouwen_7))} vrouwen`);
      }
      if (has(s.Bevolkingsdichtheid_34)) {
        extra.push(`${b(n(s.Bevolkingsdichtheid_34) + '/km²')} dichtheid`);
      }
      lines.push(`${b(n(s.AantalInwoners_5) + ' inwoners')}${extra.length ? ' — ' + extra.join(', ') + '.' : '.'}`);
    }
    if (has(s.k_65JaarOfOuder_12) && has(s.AantalInwoners_5)) {
      const senior = (s.k_65JaarOfOuder_12 / s.AantalInwoners_5) * 100;
      const young = has(s.k_0Tot15Jaar_8) ? (s.k_0Tot15Jaar_8 / s.AantalInwoners_5) * 100 : null;
      let line = `${b(pct(senior))} is ${b('65 jaar of ouder')}`;
      if (young !== null) line += `, ${b(pct(young))} is jonger dan 15`;
      lines.push(line + '.');
    }
    if (has(s.Nederland_17) && has(s.AantalInwoners_5)) {
      const nl = (s.Nederland_17 / s.AantalInwoners_5) * 100;
      lines.push(`${b(pct(nl))} heeft een Nederlandse achtergrond.`);
    }
    if (has(s.GemiddeldeHuishoudensgrootte_33) && has(s.HuishoudensTotaal_29)) {
      lines.push(`${b(n(s.HuishoudensTotaal_29) + ' huishoudens')}, gemiddeld ${b(n1(s.GemiddeldeHuishoudensgrootte_33) + ' personen')} per huishouden.`);
    }
    return { title: 'Bevolking', lines };
  }

  function themeWonen(s) {
    const lines = [];
    if (has(s.Woningvoorraad_35)) {
      const bits = [];
      if (has(s.Koopwoningen_47)) bits.push(`${b(pct(s.Koopwoningen_47))} koop`);
      if (has(s.HuurwoningenTotaal_48)) bits.push(`${b(pct(s.HuurwoningenTotaal_48))} huur`);
      lines.push(`${b(n(s.Woningvoorraad_35) + ' woningen')}${bits.length ? ', waarvan ' + bits.join(' en ') + '.' : '.'}`);
    }
    if (has(s.GemiddeldeWOZWaardeVanWoningen_39)) {
      lines.push(`Gemiddelde WOZ-waarde: ${b(eur(s.GemiddeldeWOZWaardeVanWoningen_39))}.`);
    }
    if (has(s.PercentageEengezinswoning_40)) {
      lines.push(`${b(pct(s.PercentageEengezinswoning_40))} is een eengezinswoning.`);
    }
    if (has(s.BouwjaarMeerDanTienJaarGeleden_51) && s.BouwjaarMeerDanTienJaarGeleden_51 > 90) {
      lines.push(`Vrijwel alle woningen zijn ${b('ouder dan tien jaar')}.`);
    } else if (has(s.BouwjaarAfgelopenTienJaar_52)) {
      lines.push(`${b(pct(s.BouwjaarAfgelopenTienJaar_52))} is de afgelopen tien jaar gebouwd.`);
    }
    return { title: 'Wonen', lines };
  }

  function themeInkomen(s) {
    const lines = [];
    if (has(s.GemiddeldInkomenPerInwoner_78)) {
      lines.push(`Gemiddeld inkomen per inwoner: ${b(eur(s.GemiddeldInkomenPerInwoner_78))}.`);
    }
    if (has(s.k_40PersonenMetLaagsteInkomen_79) && has(s.k_20PersonenMetHoogsteInkomen_80)) {
      lines.push(`${b(pct(s.k_40PersonenMetLaagsteInkomen_79))} behoort tot de 40% laagste inkomens, ${b(pct(s.k_20PersonenMetHoogsteInkomen_80))} tot de 20% hoogste.`);
    }
    if (has(s.PersonenInArmoede_81)) {
      lines.push(`${b(pct(s.PersonenInArmoede_81))} leeft onder de ${b('armoedegrens')}.`);
    }
    if (has(s.Nettoarbeidsparticipatie_71)) {
      lines.push(`Netto-arbeidsparticipatie: ${b(pct(s.Nettoarbeidsparticipatie_71))}.`);
    }
    return { title: 'Inkomen', lines };
  }

  function themeVoorzieningen(s) {
    const lines = [];
    const parts = [];
    if (has(s.AfstandTotHuisartsenpraktijk_110)) parts.push(`huisarts op ${b(km(s.AfstandTotHuisartsenpraktijk_110))}`);
    if (has(s.AfstandTotGroteSupermarkt_111)) parts.push(`supermarkt op ${b(km(s.AfstandTotGroteSupermarkt_111))}`);
    if (has(s.AfstandTotSchool_113)) parts.push(`basisschool op ${b(km(s.AfstandTotSchool_113))}`);
    if (has(s.AfstandTotKinderdagverblijf_112)) parts.push(`kinderdagverblijf op ${b(km(s.AfstandTotKinderdagverblijf_112))}`);
    if (parts.length) lines.push(parts.join(', ') + '.');
    if (has(s.ScholenBinnen3Km_114)) {
      lines.push(`${b(n1(s.ScholenBinnen3Km_114) + ' scholen')} binnen 3 km.`);
    }
    return { title: 'Voorzieningen dichtbij', lines };
  }

  function themeMobiliteit(s) {
    const lines = [];
    if (has(s.PersonenautoSTotaal_104)) {
      let line = `${b(n(s.PersonenautoSTotaal_104) + ' personenauto\'s')}`;
      if (has(s.PersonenautoSPerHuishouden_107)) line += `, ${b(n1(s.PersonenautoSPerHuishouden_107))} per huishouden`;
      lines.push(line + '.');
    }
    if (has(s.Motorfietsen_109)) {
      lines.push(`${b(n(s.Motorfietsen_109) + ' motorfietsen')}.`);
    }
    if (has(s.AantalPubliekeLaadpalen_61)) {
      lines.push(`${b(n(s.AantalPubliekeLaadpalen_61) + ' publieke laadpalen')} in de buurt.`);
    }
    return { title: 'Mobiliteit', lines };
  }

  function themeEnergie(s) {
    const lines = [];
    if (has(s.GemiddeldAardgasverbruik_55)) {
      lines.push(`Gemiddeld gasverbruik: ${b(n(s.GemiddeldAardgasverbruik_55) + ' m³')} per woning per jaar.`);
    }
    if (has(s.GemiddeldeElektriciteitslevering_53)) {
      lines.push(`Gemiddeld elektriciteitsverbruik: ${b(n(s.GemiddeldeElektriciteitslevering_53) + ' kWh')}.`);
    }
    if (has(s.WoningenMetZonnestroom_59)) {
      lines.push(`${b(pct(s.WoningenMetZonnestroom_59))} van de woningen heeft ${b('zonnepanelen')}.`);
    }
    if (has(s.AardgasvrijeWoningen_57)) {
      lines.push(`${b(pct(s.AardgasvrijeWoningen_57))} is ${b('aardgasvrij')}.`);
    }
    return { title: 'Energie', lines };
  }

  const THEMES = [themeBevolking, themeWonen, themeInkomen, themeVoorzieningen, themeMobiliteit, themeEnergie];

  // ---------- DOM ----------

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
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

    dashboard(addr, stats, onChange) {
      const root = document.getElementById('app');
      root.innerHTML = '';

      const header = el('div', 'header');
      header.innerHTML = `
        <div class="header-inner">
          <div class="header-label">Jouw buurt</div>
          <div class="header-address">${addr.street} ${addr.houseNumber}, ${addr.neighborhood.name || addr.city}</div>
          <div class="header-meta">${addr.municipality.name} · tik om te wijzigen</div>
        </div>`;
      header.addEventListener('click', onChange);
      root.appendChild(header);

      const dash = el('div', 'dashboard');
      const container = el('div', 'container');

      if (stats === null) {
        container.appendChild(el('div', 'state-msg', 'Buurtgegevens laden…'));
        dash.appendChild(container); root.appendChild(dash); return;
      }
      if (stats === false) {
        container.appendChild(el('div', 'state-msg', 'Buurtgegevens zijn tijdelijk niet beschikbaar.'));
        dash.appendChild(container); root.appendChild(dash); return;
      }

      for (const themeFn of THEMES) {
        const { title, lines } = themeFn(stats);
        if (!lines.length) continue;
        const section = el('section', 'group');
        section.appendChild(el('h2', 'group-title', title));
        for (const line of lines) {
          section.appendChild(el('p', 'insight', line));
        }
        container.appendChild(section);
      }

      dash.appendChild(container);
      root.appendChild(dash);
    },
  };
})();
