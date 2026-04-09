/* ============================================
   PITCH — script.js
   API: football-data.org v4
   ============================================ */

const API_TOKEN = 'a5121338cb264baaa294099596feaf92';
const API_BASE  = 'https://api.football-data.org/v4';

// League IDs for football-data.org
const LEAGUES = {
  PL:  { id: 'PL',  name: 'Premier League',    short: 'PL'  },
  DED: { id: 'DED', name: 'Eredivisie',         short: 'ERE' },
  CL:  { id: 'CL',  name: 'Champions League',   short: 'UCL' },
  BL1: { id: 'BL1', name: 'Bundesliga',         short: 'BL'  },
  PD:  { id: 'PD',  name: 'La Liga',            short: 'LL'  },
  SA:  { id: 'SA',  name: 'Serie A',            short: 'SA'  },
};

// State
const state = {
  matches: [],
  activeLeague: 'all',
  activeMatchId: null,
  refreshTimer: null,
};

// ---- DOM refs ----
const $ = id => document.getElementById(id);
const loadingState     = $('loadingState');
const errorState       = $('errorState');
const matchesContainer = $('matchesContainer');
const liveMatchesEl    = $('liveMatches');
const todayMatchesEl   = $('todayMatches');
const finishedMatchesEl= $('finishedMatches');
const liveSection      = $('liveSection');
const todaySection     = $('todaySection');
const finishedSection  = $('finishedSection');
const emptyState       = $('emptyState');
const detailOverlay    = $('detailOverlay');
const detailPanel      = $('detailPanel');
const detailBackdrop   = $('detailBackdrop');

// ---- API fetch ----
async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'X-Auth-Token': API_TOKEN }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ---- Fetch today's matches across all leagues ----
async function fetchMatches() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  // Fetch from multiple leagues in parallel
  const leagueIds = Object.keys(LEAGUES).join(',');
  const data = await apiFetch(`/matches?competitions=${leagueIds}&dateFrom=${dateStr}&dateTo=${dateStr}`);
  return data.matches || [];
}

// ---- Load all data ----
async function loadData() {
  showLoading();
  try {
    const matches = await fetchMatches();
    state.matches = matches;
    renderMatches();
    showContent();
    scheduleAutoRefresh();
  } catch (err) {
    console.error('Load error:', err);
    showError();
  }
}

// ---- Render matches ----
function renderMatches() {
  const filtered = state.activeLeague === 'all'
    ? state.matches
    : state.matches.filter(m => m.competition?.code === state.activeLeague);

  // Separate by status
  const live     = filtered.filter(m => ['IN_PLAY','PAUSED','HALFTIME'].includes(m.status));
  const today    = filtered.filter(m => m.status === 'TIMED' || m.status === 'SCHEDULED');
  const finished = filtered.filter(m => m.status === 'FINISHED');

  // Render each section
  liveMatchesEl.innerHTML     = live.map(renderMatchCard).join('');
  todayMatchesEl.innerHTML    = today.map(renderMatchCard).join('');
  finishedMatchesEl.innerHTML = finished.map(renderMatchCard).join('');

  // Show/hide sections
  liveSection.classList.toggle('hidden', live.length === 0);
  todaySection.classList.toggle('hidden', today.length === 0);
  finishedSection.classList.toggle('hidden', finished.length === 0);

  const total = live.length + today.length + finished.length;
  emptyState.classList.toggle('hidden', total > 0);

  // Attach click handlers
  document.querySelectorAll('.match-card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.matchId));
  });
}

// ---- Calculate intensity score ----
function calcIntensity(match) {
  let score = 0;
  const goals = (match.score?.fullTime?.home || 0) + (match.score?.fullTime?.away || 0);
  score += Math.min(goals * 15, 45);

  // Live matches get bonus
  if (['IN_PLAY','PAUSED'].includes(match.status)) score += 20;

  // Close score = more intense
  const diff = Math.abs(
    (match.score?.fullTime?.home || 0) - (match.score?.fullTime?.away || 0)
  );
  if (diff === 0) score += 20;
  else if (diff === 1) score += 10;

  return Math.min(score, 100);
}

function intensityClass(score) {
  if (score >= 60) return 'high';
  if (score >= 30) return 'mid';
  return 'low';
}

function intensityDesc(score, match) {
  const isLive = ['IN_PLAY','PAUSED','HALFTIME'].includes(match.status);
  if (score >= 70) return isLive ? 'Hete wedstrijd — veel spanning op het veld' : 'Doelpuntenrijke wedstrijd';
  if (score >= 40) return isLive ? 'Spannend duel' : 'Goede wedstrijd';
  return isLive ? 'Rustig verloop' : 'Weinig actie';
}

// ---- Render a single match card ----
function renderMatchCard(match) {
  const intensity = calcIntensity(match);
  const intClass  = intensityClass(intensity);
  const isLive    = ['IN_PLAY','PAUSED','HALFTIME'].includes(match.status);
  const isFinished = match.status === 'FINISHED';

  const homeGoals = match.score?.fullTime?.home;
  const awayGoals = match.score?.fullTime?.away;
  const hasScore  = homeGoals !== null && homeGoals !== undefined;

  const homeWin = isFinished && homeGoals > awayGoals;
  const awayWin = isFinished && awayGoals > homeGoals;

  const homeName = match.homeTeam?.shortName || match.homeTeam?.name || '—';
  const awayName = match.awayTeam?.shortName || match.awayTeam?.name || '—';

  const homeCrest = match.homeTeam?.crest
    ? `<img class="team-badge" src="${match.homeTeam.crest}" alt="${homeName}" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="team-badge-placeholder">${homeName.slice(0,2)}</div>`;

  const awayCrest = match.awayTeam?.crest
    ? `<img class="team-badge" src="${match.awayTeam.crest}" alt="${awayName}" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="team-badge-placeholder">${awayName.slice(0,2)}</div>`;

  // Score display
  let scoreHtml = '';
  if (hasScore) {
    const scoreClass = isLive ? 'score-num live-score' : 'score-num';
    scoreHtml = `
      <span class="${scoreClass}">${homeGoals}</span>
      <span class="score-divider">–</span>
      <span class="${scoreClass}">${awayGoals}</span>
    `;
  } else {
    const kickoff = match.utcDate ? formatKickoff(match.utcDate) : '—';
    scoreHtml = `<span class="match-time">${kickoff}</span>`;
  }

  // Status indicator
  let metaHtml = '';
  if (isLive) {
    const min = match.minute || '';
    metaHtml = `<span class="match-minute">${min ? min + "'" : 'Live'}</span>`;
  } else if (isFinished) {
    metaHtml = `<span class="match-finished">FT</span>`;
  } else {
    metaHtml = `<span class="match-league-badge">${match.competition?.code || ''}</span>`;
  }

  return `
    <div class="match-card intensity-${intClass}" data-match-id="${match.id}">
      <div class="match-teams">
        <div class="match-team-row">
          ${homeCrest}
          <span class="team-name-text ${homeWin ? 'winner' : awayWin ? 'loser' : ''}">${homeName}</span>
        </div>
        <div class="match-team-row">
          ${awayCrest}
          <span class="team-name-text ${awayWin ? 'winner' : homeWin ? 'loser' : ''}">${awayName}</span>
        </div>
      </div>
      <div class="match-score">${scoreHtml}</div>
      <div class="match-meta">${metaHtml}</div>
    </div>
  `;
}

// ---- Format kickoff time (local) ----
function formatKickoff(utcDate) {
  const d = new Date(utcDate);
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

// ---- Open match detail ----
async function openDetail(matchId) {
  state.activeMatchId = matchId;
  const match = state.matches.find(m => String(m.id) === String(matchId));
  if (!match) return;

  renderDetailPanel(match);
  detailOverlay.classList.remove('hidden');
  requestAnimationFrame(() => {
    detailBackdrop.classList.add('open');
    detailPanel.classList.add('open');
  });

  // Try to fetch detailed match data (head events etc)
  try {
    const detailed = await apiFetch(`/matches/${matchId}`);
    if (detailed && detailed.match) {
      renderTimeline(detailed.match);
    } else if (detailed && detailed.id) {
      renderTimeline(detailed);
    }
  } catch (e) {
    // Use basic match data from list
    renderTimeline(match);
  }
}

// ---- Render detail panel ----
function renderDetailPanel(match) {
  const homeName  = match.homeTeam?.name || '—';
  const awayName  = match.awayTeam?.name || '—';
  const homeGoals = match.score?.fullTime?.home;
  const awayGoals = match.score?.fullTime?.away;
  const hasScore  = homeGoals !== null && homeGoals !== undefined;
  const isLive    = ['IN_PLAY','PAUSED','HALFTIME'].includes(match.status);

  // Crests
  const homeCrestEl = $('homeCrest');
  const awayCrestEl = $('awayCrest');

  if (match.homeTeam?.crest) {
    homeCrestEl.innerHTML = `<img src="${match.homeTeam.crest}" alt="${homeName}" onerror="this.parentNode.innerHTML='<div class=team-crest-placeholder>${homeName.slice(0,3)}</div>'">`;
  } else {
    homeCrestEl.innerHTML = `<div class="team-crest-placeholder">${homeName.slice(0,3)}</div>`;
  }

  if (match.awayTeam?.crest) {
    awayCrestEl.innerHTML = `<img src="${match.awayTeam.crest}" alt="${awayName}" onerror="this.parentNode.innerHTML='<div class=team-crest-placeholder>${awayName.slice(0,3)}</div>'">`;
  } else {
    awayCrestEl.innerHTML = `<div class="team-crest-placeholder">${awayName.slice(0,3)}</div>`;
  }

  $('homeTeam').textContent = homeName;
  $('awayTeam').textContent = awayName;
  $('detailLeague').textContent = match.competition?.name || '';

  // Score
  if (hasScore) {
    $('scoreDisplay').textContent = `${homeGoals} – ${awayGoals}`;
  } else {
    const kickoff = match.utcDate ? formatKickoff(match.utcDate) : '—';
    $('scoreDisplay').textContent = kickoff;
    $('scoreDisplay').style.fontSize = '32px';
  }

  // Status
  const statusEl = $('matchStatus');
  if (isLive) {
    const min = match.minute || '';
    statusEl.textContent = min ? `${min}'` : 'Live';
    statusEl.classList.add('live');
  } else if (match.status === 'HALFTIME') {
    statusEl.textContent = 'Rust';
    statusEl.classList.add('live');
  } else if (match.status === 'FINISHED') {
    statusEl.textContent = 'Voltooid';
    statusEl.classList.remove('live');
  } else {
    const d = new Date(match.utcDate);
    statusEl.textContent = d.toLocaleDateString('nl-NL', { weekday:'short', day:'numeric', month:'short' });
    statusEl.classList.remove('live');
  }

  // Intensity
  const intensity = calcIntensity(match);
  const intClass  = intensityClass(intensity);
  $('intensityValue').textContent = `${intensity}%`;
  $('intensityFill').style.width = `${intensity}%`;
  $('intensityFill').className = `intensity-fill ${intClass}`;
  $('intensityDesc').textContent = intensityDesc(intensity, match);

  // Clear timeline
  $('timelineFeed').innerHTML = `<div class="timeline-empty">Wedstrijdgegevens laden…</div>`;

  // Scroll detail panel to top
  detailPanel.scrollTop = 0;
}

// ---- Render timeline from match events ----
function renderTimeline(match) {
  const events = match.goals || [];
  const bookings = match.bookings || [];
  const subs = match.substitutions || [];

  // Combine and sort all events
  let allEvents = [];

  events.forEach(g => allEvents.push({
    minute: g.minute || 0,
    type: g.type || 'GOAL',
    team: g.team,
    scorer: g.scorer,
    assist: g.assist,
    scoreHome: null,
    scoreAway: null,
  }));

  bookings.forEach(b => allEvents.push({
    minute: b.minute || 0,
    type: b.card || 'YELLOW',
    team: b.team,
    player: b.player,
  }));

  subs.forEach(s => allEvents.push({
    minute: s.minute || 0,
    type: 'SUBSTITUTION',
    team: s.team,
    playerOut: s.playerOut,
    playerIn: s.playerIn,
  }));

  allEvents.sort((a, b) => b.minute - a.minute);

  // Add kickoff + halftime markers
  if (match.score?.halfTime) {
    const ht = match.score.halfTime;
    if (ht.home !== null) {
      allEvents.push({ minute: 45, type: 'HALFTIME', label: `Rust — ${ht.home}–${ht.away}` });
    }
  }
  allEvents.push({ minute: 0, type: 'KICKOFF', label: 'Aftrap' });
  allEvents.sort((a, b) => b.minute - a.minute);

  if (allEvents.length === 0 || allEvents.every(e => e.type === 'KICKOFF')) {
    $('timelineFeed').innerHTML = `<div class="timeline-empty">Nog geen gebeurtenissen</div>`;
    return;
  }

  const homeTeamId = match.homeTeam?.id;

  $('timelineFeed').innerHTML = allEvents.map((ev, i) => {
    const isLast = i === allEvents.length - 1;
    return renderTimelineRow(ev, homeTeamId, !isLast);
  }).join('');
}

function renderTimelineRow(ev, homeTeamId, showLine) {
  let dotClass = 'halftime';
  let mainText = '';
  let subText  = '';

  switch (ev.type) {
    case 'GOAL':
    case 'NORMAL_GOAL':
    case 'PENALTY':
    case 'OWN_GOAL': {
      dotClass = 'goal';
      const scorer = ev.scorer?.name || 'Onbekend';
      const isOwn = ev.type === 'OWN_GOAL';
      const isHome = ev.team?.id === homeTeamId;
      const sideEmoji = isHome ? '←' : '→';
      mainText = `<strong>${scorer}</strong>${isOwn ? ' (eigen doelpunt)' : ''}`;
      if (ev.assist?.name) subText = `Assist: ${ev.assist.name}`;
      if (ev.type === 'PENALTY') subText = 'Strafschop' + (subText ? ' · ' + subText : '');
      break;
    }
    case 'YELLOW_CARD':
    case 'YELLOW': {
      dotClass = 'yellow-card';
      mainText = `Gele kaart — ${ev.player?.name || ''}`;
      mainText += `<span style="display:inline-block;width:10px;height:14px;background:#f5c842;border-radius:2px;margin-left:6px;vertical-align:middle;"></span>`;
      break;
    }
    case 'RED_CARD':
    case 'RED': {
      dotClass = 'red-card';
      mainText = `Rode kaart — ${ev.player?.name || ''}`;
      mainText += `<span style="display:inline-block;width:10px;height:14px;background:#ff4d4d;border-radius:2px;margin-left:6px;vertical-align:middle;"></span>`;
      break;
    }
    case 'YELLOW_RED_CARD': {
      dotClass = 'red-card';
      mainText = `2e geel → rood — ${ev.player?.name || ''}`;
      break;
    }
    case 'SUBSTITUTION': {
      dotClass = 'substitution';
      const out = ev.playerOut?.name || '—';
      const inn = ev.playerIn?.name || '—';
      mainText = `Wissel`;
      subText  = `▼ ${out} &nbsp; ▲ ${inn}`;
      break;
    }
    case 'VAR_DECISION': {
      dotClass = 'var';
      mainText = `VAR beslissing`;
      break;
    }
    case 'HALFTIME': {
      dotClass = 'halftime';
      mainText = `<span style="color:var(--text-secondary)">${ev.label || 'Rust'}</span>`;
      break;
    }
    case 'KICKOFF': {
      dotClass = 'kickoff';
      mainText = `<span style="color:var(--text-muted)">Aftrap</span>`;
      break;
    }
    default: {
      dotClass = 'halftime';
      mainText = ev.type?.replace(/_/g,' ').toLowerCase() || '—';
    }
  }

  return `
    <div class="tl-row">
      <div class="tl-minute">${ev.minute ? ev.minute + "'" : ''}</div>
      <div class="tl-icon-col">
        <div class="tl-dot ${dotClass}"></div>
        ${showLine ? '<div class="tl-line"></div>' : ''}
      </div>
      <div class="tl-body">
        <div class="tl-main">${mainText}</div>
        ${subText ? `<div class="tl-sub">${subText}</div>` : ''}
      </div>
    </div>
  `;
}

// ---- Close detail ----
function closeDetail() {
  detailBackdrop.classList.remove('open');
  detailPanel.classList.remove('open');
  setTimeout(() => {
    detailOverlay.classList.add('hidden');
    state.activeMatchId = null;
  }, 400);
}

// ---- Auto refresh ----
function scheduleAutoRefresh() {
  clearInterval(state.refreshTimer);
  state.refreshTimer = setInterval(async () => {
    try {
      const matches = await fetchMatches();
      state.matches = matches;
      renderMatches();
    } catch (e) { /* silent */ }
  }, 60_000); // every 60s
}

// ---- UI state helpers ----
function showLoading() {
  loadingState.classList.remove('hidden');
  errorState.classList.add('hidden');
  matchesContainer.classList.add('hidden');
}

function showContent() {
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  matchesContainer.classList.remove('hidden');
}

function showError() {
  loadingState.classList.add('hidden');
  errorState.classList.remove('hidden');
  matchesContainer.classList.add('hidden');
}

// ---- Event listeners ----

// League tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeLeague = btn.dataset.league;
    renderMatches();
  });
});

// Refresh button
$('refreshBtn').addEventListener('click', async () => {
  const btn = $('refreshBtn');
  btn.classList.add('spinning');
  try {
    const matches = await fetchMatches();
    state.matches = matches;
    renderMatches();
  } catch (e) { showError(); }
  finally {
    setTimeout(() => btn.classList.remove('spinning'), 700);
  }
});

// Close detail
$('closeBtn').addEventListener('click', closeDetail);
$('detailBackdrop').addEventListener('click', closeDetail);

// Retry button
$('retryBtn').addEventListener('click', loadData);

// Bottom nav (placeholder behaviour)
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Swipe down to close detail panel
let touchStartY = 0;
detailPanel.addEventListener('touchstart', e => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

detailPanel.addEventListener('touchmove', e => {
  const dy = e.touches[0].clientY - touchStartY;
  if (dy > 0 && detailPanel.scrollTop === 0) {
    detailPanel.style.transform = `translateY(${dy * 0.5}px)`;
  }
}, { passive: true });

detailPanel.addEventListener('touchend', e => {
  const dy = e.changedTouches[0].clientY - touchStartY;
  detailPanel.style.transform = '';
  if (dy > 80) closeDetail();
}, { passive: true });

// ---- Init ----
loadData();
