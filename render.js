window.App = window.App || {};
(function () {
  const { GROUP_ORDER } = window.App.config;

  function fmtNumber(value, decimals) {
    if (typeof value !== 'number') return String(value);
    return value.toLocaleString('nl-NL', {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals,
    });
  }

  function fmtUnit(unit) {
    if (!unit || unit === 'aantal') return '';
    const map = { '%': '%', 'per km2': '/ km²', 'km': 'km', 'x 1 000': '×1.000' };
    return map[unit] || unit;
  }

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

    dashboard(addr, groups, onChange) {
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

      if (!groups) {
        container.appendChild(el('div', 'state-msg', 'Buurtgegevens zijn tijdelijk niet beschikbaar.'));
        dash.appendChild(container); root.appendChild(dash); return;
      }

      const ordered = [...GROUP_ORDER.filter(g => groups[g]), ...Object.keys(groups).filter(g => !GROUP_ORDER.includes(g))];

      for (const name of ordered) {
        const stats = groups[name]; if (!stats || !stats.length) continue;
        const section = el('section', 'group');
        section.appendChild(el('h2', 'group-title', name));
        for (const s of stats) {
          const item = el('div', 'stat');
          item.innerHTML = `<div class="stat-value">${fmtNumber(s.value, s.decimals)}<span class="stat-unit">${fmtUnit(s.unit)}</span></div><div class="stat-label">${s.title}</div>`;
          section.appendChild(item);
        }
        container.appendChild(section);
      }
      dash.appendChild(container);
      root.appendChild(dash);
    },
  };
})();
