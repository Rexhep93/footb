import { fetchTodaysMatches, transformMatch } from './api.js';

class LiveScoreApp {
  constructor() {
    this.container = document.getElementById('matchesContainer');
    this.lastUpdatedSpan = document.getElementById('lastUpdated');
    this.liveIndicator = document.getElementById('liveIndicator');
    this.dateDisplay = document.getElementById('dateDisplay');
    this.errorToast = document.getElementById('errorToast');
    this.updateTimer = null;
    
    this.init();
  }

  async init() {
    this.setupServiceWorker();
    this.displayCurrentDate();
    await this.loadMatches();
    this.startLiveRefresh();
  }

  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js');
    }
  }

  displayCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    this.dateDisplay.textContent = now.toLocaleDateString('en-US', options);
  }

  async loadMatches() {
    try {
      this.showLoading();
      const matches = await fetchTodaysMatches();
      const transformed = matches.map(transformMatch);
      this.renderMatches(transformed);
      this.updateLastUpdated();
      this.updateLiveStatus(transformed);
    } catch (error) {
      this.showError('Unable to load matches. Check API key or network.');
      this.container.innerHTML = `<div class="empty-state">⚠️ Could not load matches</div>`;
    }
  }

  showLoading() {
    this.container.innerHTML = '<div class="loading-state">Loading matches...</div>';
  }

  renderMatches(matches) {
    if (!matches.length) {
      this.container.innerHTML = `<div class="empty-state">No matches today</div>`;
      return;
    }

    const sorted = [...matches].sort((a, b) => {
      if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
      if (a.status !== 'LIVE' && b.status === 'LIVE') return 1;
      return 0;
    });

    this.container.innerHTML = sorted.map(m => this.createMatchCard(m)).join('');
  }

  createMatchCard(m) {
    const isLive = m.status === 'LIVE' || m.status === 'IN_PLAY' || m.status === 'PAUSED';
    const isFinished = m.status === 'FINISHED';
    const hasScore = m.homeScore !== null && m.awayScore !== null;
    
    const statusText = isLive ? 'LIVE' : (isFinished ? 'FT' : m.status);
    const statusClass = isLive ? 'live' : (isFinished ? 'finished' : '');
    
    const scoreDisplay = hasScore ? 
      `<span class="team-score">${m.homeScore}</span>
       <span class="score-separator">:</span>
       <span class="team-score">${m.awayScore}</span>` : 
      `<span class="team-score">-</span><span class="score-separator"></span><span class="team-score">-</span>`;

    const timeDisplay = isLive ? `${m.minute || 'LIVE'}'` : 
                       (isFinished ? 'Full Time' : 
                       new Date(m.utcDate).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'}));

    return `
      <div class="match-card">
        <div class="match-competition">
          ${m.competition}
          <span class="status-dot ${statusClass}">${statusText}</span>
        </div>
        <div class="match-teams">
          <div class="team">
            <span class="team-name">${m.homeTeam}</span>
          </div>
          <div style="display: flex; align-items: center;">
            ${scoreDisplay}
          </div>
          <div class="team">
            <span class="team-name">${m.awayTeam}</span>
          </div>
        </div>
        <div class="match-time">${timeDisplay}</div>
      </div>
    `;
  }

  updateLastUpdated() {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    this.lastUpdatedSpan.textContent = `Updated ${time}`;
  }

  updateLiveStatus(matches) {
    const hasLive = matches.some(m => m.status === 'LIVE' || m.status === 'IN_PLAY');
    this.liveIndicator.style.opacity = hasLive ? '1' : '0.5';
  }

  startLiveRefresh() {
    this.updateTimer = setInterval(async () => {
      const matches = await fetchTodaysMatches();
      const transformed = matches.map(transformMatch);
      this.renderMatches(transformed);
      this.updateLastUpdated();
      this.updateLiveStatus(transformed);
    }, 60000);
  }

  showError(msg) {
    this.errorToast.textContent = msg;
    this.errorToast.classList.add('show');
    setTimeout(() => this.errorToast.classList.remove('show'), 3000);
  }
}

new LiveScoreApp();
