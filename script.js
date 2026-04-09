import {getMatches,ALLOWED} from './api.js';

const app=document.getElementById('app');
const nav=document.getElementById('dateNav');

const COMP_NAMES={PL:'Premier League',BL1:'Bundesliga',SA:'Serie A',PD:'La Liga',FL1:'Ligue 1',DED:'Eredivisie',PPL:'Primeira Liga',ELC:'Championship',BSA:'Brasileirão',CL:'Champions League',EC:'EK',WC:'WK',CLI:'Copa Libertadores'};

const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const startOfDay=()=>{const d=new Date();d.setHours(0,0,0,0);return d;};
let today=startOfDay();
let activeDate=fmt(today);

function label(d){
  const diff=Math.round((d-today)/86400000);
  if(diff===0)return 'Vandaag';
  if(diff===-1)return 'Gisteren';
  if(diff===1)return 'Morgen';
  return d.toLocaleDateString('nl-NL',{weekday:'short',day:'numeric',month:'short'});
}

function buildNav(){
  const days=[];
  for(let i=-2;i<=4;i++){const d=new Date(today);d.setDate(d.getDate()+i);days.push(d);}
  nav.innerHTML=days.map(d=>{
    const k=fmt(d);
    return `<button class="date-btn${k===activeDate?' active':''}" data-date="${k}">${label(d)}</button>`;
  }).join('');
  nav.querySelectorAll('.date-btn').forEach(b=>{
    b.onclick=()=>{activeDate=b.dataset.date;buildNav();load();};
  });
}

function statusOf(m){
  const s = m.fixture.status.short;
  if (s === '1H' || s === '2H' || s === 'ET' || s === 'LIVE')
    return { txt: m.fixture.status.elapsed ? m.fixture.status.elapsed + "'" : 'LIVE', cls: 'live' };
  if (s === 'HT') return { txt: 'RUST', cls: 'live' };
  if (s === 'FT' || s === 'AET' || s === 'PEN') return { txt: 'FT', cls: 'ft' };
  if (s === 'NS' || s === 'TBD')
    return { txt: new Date(m.fixture.date).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }), cls: '' };
  if (s === 'PST') return { txt: 'UITGEST.', cls: '' };
  if (s === 'CANC') return { txt: 'AFGEL.', cls: '' };
  return { txt: s, cls: '' };
}

function scoreOf(m){
  const h = m.goals.home, a = m.goals.away;
  if (h == null || a == null) return '–';
  return `${h} – ${a}`;
}

function render(matches){
  if (!matches.length) { app.innerHTML = '<div class="empty">Geen wedstrijden op deze dag</div>'; return; }
  const groups = {};
  matches.forEach(m => {
    const code = m.league.code;
    (groups[code] = groups[code] || []).push(m);
  });
  const liveStates = ['1H','2H','HT','ET','LIVE'];
  const order = s => liveStates.includes(s) ? 0 : (s === 'NS' || s === 'TBD' ? 1 : 2);
  Object.values(groups).forEach(g => g.sort((a,b) =>
    order(a.fixture.status.short) - order(b.fixture.status.short) ||
    new Date(a.fixture.date) - new Date(b.fixture.date)
  ));
  const sorted = ALLOWED.filter(c => groups[c]);
  app.innerHTML = sorted.map(c => `
    <section class="comp">
      <h2>${COMP_NAMES[c] || c}</h2>
      <div class="matches">
        ${groups[c].map(m => {
          const st = statusOf(m);
          return `<div class="match">
            <div class="team home">
              ${m.teams.home.logo ? `<img src="${m.teams.home.logo}" alt="">` : ''}
              <span>${m.teams.home.name}</span>
            </div>
            <div class="score">
              <div class="nums">${scoreOf(m)}</div>
              <span class="status ${st.cls}">${st.txt}</span>
            </div>
            <div class="team away">
              <span>${m.teams.away.name}</span>
              ${m.teams.away.logo ? `<img src="${m.teams.away.logo}" alt="">` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </section>`).join('');
}

async function load(){
  app.innerHTML='<div class="loader"></div>';
  try{render(await getMatches(activeDate));}
  catch(e){app.innerHTML=`<div class="empty">Fout: ${e.message}<br><small>Check API-limiet of CORS-proxy</small></div>`;}
}

buildNav();
load();
// auto-refresh elke 60s als je op vandaag staat
setInterval(()=>{if(activeDate===fmt(startOfDay()))load();},90000);

if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
