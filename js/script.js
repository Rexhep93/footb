import { fetchTodaysMatches } from './api.js';

let allMatches = [];
let currentFilter = 'all';

const matchesList = document.getElementById('matches-list');
const emptyState = document.getElementById('empty-state');
const lastUpdated = document.getElementById('last-updated');
const refreshBtn = document.getElementById('refresh-btn');
const tabs = document.querySelectorAll('.tab');
const toast = document.getElementById('toast');

function formatStatus(match) {
    const status = match.status;
    const minute = match.minute || '';
    
    if (status === 'LIVE' || status === 'IN_PLAY') {
        return `<span class="live-dot"></span>LIVE${minute ? ` • ${minute}'` : ''}`;
    }
    if (status === 'FINISHED' || status === 'FT') return 'FT';
    if (status === 'PAUSED') return 'HT';
    if (status === 'SCHEDULED' || status === 'TIMED') {
        const date = new Date(match.utcDate);
        return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    }
    return status;
}

function createMatchCard(match) {
    const home = match.homeTeam;
    const away = match.awayTeam;
    const isLive = match.status === 'LIVE' || match.status === 'IN_PLAY';
    
    const card = document.createElement('div');
    card.className = `match-card ${isLive ? 'live' : ''}`;
    
    const scoreHTML = match.score && match.score.fullTime 
        ? `<div class="score">${match.score.fullTime.home ?? '-'} - ${match.score.fullTime.away ?? '-'}</div>`
        : `<div class="score">– –</div>`;
    
    card.innerHTML = `
        <div class="competition">
            <img src="${match.competition.emblem}" alt="">
            ${match.competition.name}
        </div>
        <div class="match-content">
            <div class="team">
                <img src="${home.crest || 'https://crests.football-data.org/blank.png'}" class="crest" alt="">
                <div class="team-name">${home.name}</div>
            </div>
            
            <div class="score-container">
                ${scoreHTML}
                <div class="status">${formatStatus(match)}</div>
            </div>
            
            <div class="team right">
                <div class="team-name">${away.name}</div>
                <img src="${away.crest || 'https://crests.football-data.org/blank.png'}" class="crest" alt="">
            </div>
        </div>
    `;
    return card;
}

function renderMatches(matches) {
    matchesList.innerHTML = '';
    
    const filtered = currentFilter === 'live' 
        ? matches.filter(m => m.status === 'LIVE' || m.status === 'IN_PLAY')
        : matches;
    
    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    // Sorteer: live eerst, dan tijd
    filtered.sort((a, b) => {
        const aLive = a.status === 'LIVE' || a.status === 'IN_PLAY';
        const bLive = b.status === 'LIVE' || b.status === 'IN_PLAY';
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;
        return new Date(a.utcDate) - new Date(b.utcDate);
    });
    
    filtered.forEach(match => {
        matchesList.appendChild(createMatchCard(match));
    });
}

async function loadMatches() {
    try {
        refreshBtn.style.opacity = '0.3';
        const matches = await fetchTodaysMatches();
        allMatches = matches;
        renderMatches(allMatches);
        
        const now = new Date();
        lastUpdated.textContent = `Bijgewerkt ${now.getHours()}:${now.getMinutes().toString().padStart(2,'0')}`;
        
        showToast('Wedstrijden geladen');
    } catch (e) {
        console.error(e);
        showToast('Fout: controleer API-sleutel', true);
    } finally {
        refreshBtn.style.opacity = '1';
    }
}

function showToast(msg, error = false) {
    toast.textContent = msg;
    toast.style.background = error ? '#ff3b30' : '#1c1c1e';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// Event listeners
refreshBtn.addEventListener('click', loadMatches);

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderMatches(allMatches);
    });
});

// Service worker registratie + initial load
async function init() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js');
    }
    await loadMatches();
    // Poll elke 60 seconden (binnen free tier limiet)
    setInterval(loadMatches, 60000);
}

document.addEventListener('DOMContentLoaded', init);
