 const _meldingenState = {
    addrKey: null,
    radiusKm: 1,
    page: 1,
    total: 0,
    records: [],
    loading: false,
    error: null
  };
 
  async function renderMeldingenTab(content, addr) {
    const coords = addr.coords;
    const addrKey = addr.bag?.nummeraanduidingId || `${coords?.lat},${coords?.lng}`;
 
    // Reset bij nieuw adres
    if (_meldingenState.addrKey !== addrKey) {
      _meldingenState.addrKey = addrKey;
      _meldingenState.radiusKm = 1;
      _meldingenState.page = 1;
      _meldingenState.total = 0;
      _meldingenState.records = [];
      _meldingenState.error = null;
    }
 
    const wrap = el('div', 'container meldingen-wrap');
    wrap.innerHTML = `
      <div class="meldingen-header">
        <div class="meldingen-title">Bekendmakingen</div>
        <div class="meldingen-sub" id="meldingen-sub">Officiële publicaties binnen een straal rondom jouw adres</div>
      </div>
 
      <div class="radius-card">
        <div class="radius-map" id="meldingen-map"></div>
        <div class="radius-controls">
          <div class="radius-label">
            <span>Straal</span>
            <strong id="meldingen-radius-value">${_meldingenState.radiusKm} km</strong>
          </div>
          <input type="range" id="meldingen-radius" min="1" max="5" step="1" value="${_meldingenState.radiusKm}">
          <div class="radius-ticks"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
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
 
    // ----- Map -----
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
          radius: _meldingenState.radiusKm * 1000,
          color: '#1a2e28', weight: 2, fillColor: '#1a2e28', fillOpacity: 0.12
        }).addTo(mapInstance);
 
        fitMap();
      }, 50);
    }
 
    function fitMap() {
      if (!mapInstance || !radiusCircle) return;
      mapInstance.fitBounds(radiusCircle.getBounds(), { padding: [20, 20] });
    }
 
    function updateMapRadius(km) {
      if (!radiusCircle) return;
      radiusCircle.setRadius(km * 1000);
      fitMap();
    }
 
    // ----- List -----
    function renderList() {
      if (_meldingenState.error && _meldingenState.records.length === 0) {
        listEl.innerHTML = '<div class="state-msg">Bekendmakingen tijdelijk niet beschikbaar.</div>';
        subEl.textContent = '';
        moreBtn.style.display = 'none';
        return;
      }
      if (_meldingenState.records.length === 0 && _meldingenState.loading) {
        listEl.innerHTML = '<div class="state-msg">Laden…</div>';
        subEl.textContent = `Binnen ${_meldingenState.radiusKm} km`;
        moreBtn.style.display = 'none';
        return;
      }
      if (_meldingenState.records.length === 0) {
        listEl.innerHTML = `<div class="state-msg">Geen bekendmakingen binnen ${_meldingenState.radiusKm} km.</div>`;
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
 
      subEl.textContent = `${_meldingenState.records.length} van ${_meldingenState.total} binnen ${_meldingenState.radiusKm} km`;
      const hasMore = _meldingenState.records.length < _meldingenState.total;
      moreBtn.style.display = hasMore ? 'block' : 'none';
      moreBtn.disabled = _meldingenState.loading;
      moreBtn.textContent = _meldingenState.loading ? 'Laden…' : 'Meer laden';
    }
 
    function escapeHtml(s) {
      if (!s) return '';
      return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
 
    async function loadNext() {
      if (_meldingenState.loading) return;
      _meldingenState.loading = true;
      renderList();
      try {
        const { records, total } = await window.App.meldingen.fetchPage(
          coords.lat, coords.lng, _meldingenState.radiusKm, _meldingenState.page
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
 
    // Debounced slider handler
    let sliderTimer = null;
    slider.addEventListener('input', e => {
      const km = parseInt(e.target.value, 10);
      _meldingenState.radiusKm = km;
      radiusValEl.textContent = `${km} km`;
      updateMapRadius(km);
      if (sliderTimer) clearTimeout(sliderTimer);
      sliderTimer = setTimeout(() => resetAndLoad(), 300);
    });
 
    moreBtn.addEventListener('click', loadNext);
 
    initMap();
    renderList();
    if (_meldingenState.records.length === 0 && !_meldingenState.error) {
      loadNext();
    }
  }
 
