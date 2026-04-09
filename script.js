import {getMatches,ALLOWED} from './api.js';

const app=document.getElementById('app');
const nav=document.getElementById('dateNav');

const COMP_NAMES={PL:'Premier League',BL1:'Bundesliga',SA:'Serie A',PD:'La Liga',FL1:'Ligue 1',DED:'Eredivisie',PPL:'Primeira Liga',ELC:'Championship',BSA:'Brasileirão',CL:'Champions League',EC:'EK',WC:'WK',CLI:'Copa Libertadores'};

const fmt=d=>d.toISOString().slice(0,10);
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
  const s=m.status;
  if(s==='IN_PLAY'||s==='PAUSED'||s==='LIVE')return{txt:m.minute?m.minute+"'":'LIVE',cls:'live'};
  if(s==='FINISHED')return{txt:'FT',cls:'ft'};
  if(s==='SCHEDULED'||s==='TIMED'){
    return{txt:new Date(m.utcDate).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}),cls:''};
  }
  return{txt:s,cls:''};
}

function scoreOf(m){
  const h=m.score?.fullTime?.home,a=m.score?.fullTime?.away;
  if(h==null||a==null)return '–';
  return `${h} – ${a}`;
}

function render(matches){
  const filtered=matches.filter(m=>ALLOWED.includes(m.competition?.code));
  if(!filtered.length){app.innerHTML='<div class="empty">Geen wedstrijden op deze dag</div>';return;}
  const groups={};
  filtered.forEach(m=>{(groups[m.competition.code]=groups[m.competition.code]||[]).push(m);});
  const order={IN_PLAY:0,PAUSED:0,LIVE:0,SCHEDULED:1,TIMED:1,FINISHED:2};
  Object.values(groups).forEach(g=>g.sort((a,b)=>(order[a.status]??3)-(order[b.status]??3)||new Date(a.utcDate)-new Date(b.utcDate)));
  const sorted=ALLOWED.filter(c=>groups[c]);
  app.innerHTML=sorted.map(c=>`
    <section class="comp">
      <h2>${COMP_NAMES[c]||c}</h2>
      <div class="matches">
        ${groups[c].map(m=>{
          const st=statusOf(m);
          return `<div class="match">
            <div class="team home">
              ${m.homeTeam.crest?`<img src="${m.homeTeam.crest}" alt="">`:''}
              <span>${m.homeTeam.shortName||m.homeTeam.name}</span>
            </div>
            <div class="score">
              <div class="nums">${scoreOf(m)}</div>
              <span class="status ${st.cls}">${st.txt}</span>
            </div>
            <div class="team away">
              <span>${m.awayTeam.shortName||m.awayTeam.name}</span>
              ${m.awayTeam.crest?`<img src="${m.awayTeam.crest}" alt="">`:''}
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
