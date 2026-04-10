import {getMatches,ALLOWED} from './api.js';

const app=document.getElementById('app');
const nav=document.getElementById('dateNav');
const tabbar=document.getElementById('tabbar');
const filterRow=document.getElementById('filterRow');

const COMP_NAMES={PL:'Premier League',BL1:'Bundesliga',SA:'Serie A',PD:'La Liga',FL1:'Ligue 1',DED:'Eredivisie',PPL:'Primeira Liga',ELC:'Championship',BSA:'Brasileirão',CL:'Champions League',EC:'EK',WC:'WK',CLI:'Copa Libertadores'};

const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const startOfDay=()=>{const d=new Date();d.setHours(0,0,0,0);return d;};
const today=startOfDay();
const todayKey=fmt(today);
let activeDate=todayKey;
let activeFilter='all';
let cachedMatches=[];

function dayShort(d){
  return d.toLocaleDateString('nl-NL',{weekday:'short'}).replace('.','').toUpperCase();
}

function buildNav(){
  const days=[];
  for(let i=-3;i<=10;i++){const d=new Date(today);d.setDate(d.getDate()+i);days.push(d);}
  nav.innerHTML=days.map(d=>{
    const k=fmt(d);
    const isToday=k===todayKey;
    return `<button class="date-btn${k===activeDate?' active':''}${isToday?' today-marker':''}" data-date="${k}">
      <span class="day">${isToday?'VAN':dayShort(d)}</span>
      <span class="num">${d.getDate()}</span>
    </button>`;
  }).join('');
  nav.querySelectorAll('.date-btn').forEach(b=>{
    b.onclick=()=>{
      if(b.dataset.date===activeDate)return;
      activeDate=b.dataset.date;
      buildNav();
      haptic();
      const active=nav.querySelector('.date-btn.active');
      if(active)active.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
      load();
    };
  });
  setTimeout(()=>{
    const active=nav.querySelector('.date-btn.active');
    if(active)active.scrollIntoView({behavior:'auto',inline:'center',block:'nearest'});
  },0);
}

function statusOf(m){
  const s=m.status;
  if(s==='IN_PLAY'||s==='LIVE')return{txt:m.minute?m.minute+"'":'LIVE',cls:'live'};
  if(s==='PAUSED')return{txt:'RUST',cls:'live'};
  if(s==='FINISHED')return{txt:'FT',cls:'ft'};
  if(s==='SCHEDULED'||s==='TIMED'){
    return{txt:new Date(m.utcDate).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}),cls:''};
  }
  if(s==='POSTPONED')return{txt:'UITG.',cls:''};
  if(s==='CANCELLED')return{txt:'AFG.',cls:''};
  return{txt:s,cls:''};
}

function scoreOf(m){
  const h=m.score?.fullTime?.home,a=m.score?.fullTime?.away;
  if(h==null||a==null)return '–';
  return `${h} – ${a}`;
}

function isLive(m){
  return m.status==='IN_PLAY'||m.status==='LIVE'||m.status==='PAUSED';
}

function applyFilter(matches){
  if(activeFilter==='live')return matches.filter(isLive);
  if(activeFilter==='fav')return [];
  return matches;
}

function render(matches){
  cachedMatches=matches;
  const filtered=applyFilter(matches.filter(m=>ALLOWED.includes(m.competition?.code)));
  if(!filtered.length){
    let icon,title,sub;
    if(activeFilter==='live'){
      icon=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/></svg>`;
      title='Geen live wedstrijden';
      sub='Kom later terug voor de actie';
    }else if(activeFilter==='fav'){
      icon=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.6 5.7 6.2.7-4.6 4.3 1.2 6.1L12 17l-5.4 2.8 1.2-6.1L3.2 9.4l6.2-.7L12 3Z"/></svg>`;
      title='Nog geen favorieten';
      sub='Volg teams om ze hier te zien';
    }else{
      icon=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="3.5"/><path d="M16 3v4M8 3v4M3.5 10h17"/></svg>`;
      title='Geen wedstrijden';
      sub='Probeer een andere datum';
    }
    app.innerHTML=`<div class="empty"><div class="empty-icon">${icon}</div>${title}<span class="sub">${sub}</span></div>`;
    return;
  }
  const groups={};
  filtered.forEach(m=>{(groups[m.competition.code]=groups[m.competition.code]||[]).push(m);});
  const order={IN_PLAY:0,PAUSED:0,LIVE:0,SCHEDULED:1,TIMED:1,FINISHED:2};
  Object.values(groups).forEach(g=>g.sort((a,b)=>(order[a.status]??3)-(order[b.status]??3)||new Date(a.utcDate)-new Date(b.utcDate)));
  const sorted=ALLOWED.filter(c=>groups[c]);
  app.innerHTML=sorted.map(c=>{
    const list=groups[c];
    const liveCount=list.filter(isLive).length;
    return `<section class="comp">
      <div class="comp-head">
        <h2>${COMP_NAMES[c]||c}</h2>
        <span class="meta">${liveCount?`${liveCount} LIVE`:`${list.length} ${list.length===1?'wedstrijd':'wedstrijden'}`}</span>
      </div>
      <div class="matches">
        ${list.map(m=>{
          const st=statusOf(m);
          return `<div class="match${isLive(m)?' live':''}">
            <div class="team home">
              ${m.homeTeam.crest?`<img src="${m.homeTeam.crest}" alt="" loading="lazy">`:''}
              <span>${m.homeTeam.shortName||m.homeTeam.name}</span>
            </div>
            <div class="score">
              <div class="nums">${scoreOf(m)}</div>
              <span class="status ${st.cls}">${st.txt}</span>
            </div>
            <div class="team away">
              <span>${m.awayTeam.shortName||m.awayTeam.name}</span>
              ${m.awayTeam.crest?`<img src="${m.awayTeam.crest}" alt="" loading="lazy">`:''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </section>`;
  }).join('');
}

function showSkeleton(){
  app.innerHTML=`<div id="skeleton">
    ${[1,2,3].map(()=>`<div class="skel-comp">
      <div class="skel-head"></div>
      <div class="skel-card">
        ${[1,2,3].map(()=>`<div class="skel-row"></div>`).join('')}
      </div>
    </div>`).join('')}
  </div>`;
}

let loadId=0;
async function load(){
  const id=++loadId;
  showSkeleton();
  try{
    const matches=await getMatches(activeDate);
    if(id!==loadId)return;
    render(matches);
}catch(e){
    if(id!==loadId)return;
    const icon=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>`;
    app.innerHTML=`<div class="empty"><div class="empty-icon">${icon}</div>Kon wedstrijden niet laden<span class="sub">${e.message}</span></div>`;
  }
}

function haptic(){
  if('vibrate' in navigator)navigator.vibrate(8);
}

function showToast(text){
  let t=document.querySelector('.toast');
  if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}
  t.textContent=text;
  requestAnimationFrame(()=>t.classList.add('show'));
  clearTimeout(t._hide);
  t._hide=setTimeout(()=>t.classList.remove('show'),1800);
}

filterRow.querySelectorAll('.chip').forEach(c=>{
  c.onclick=()=>{
    if(c.classList.contains('active'))return;
    filterRow.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
    c.classList.add('active');
    activeFilter=c.dataset.filter;
    haptic();
    render(cachedMatches);
  };
});

document.querySelectorAll('#tabbar .tab').forEach(tab=>{
  tab.onclick=()=>{
    document.querySelectorAll('#tabbar .tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    haptic();
    const t=tab.dataset.tab;
    if(t==='today'){
      activeDate=todayKey;
      activeFilter='all';
      filterRow.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x.dataset.filter==='all'));
      buildNav();
      load();
    }else if(t==='live'){
      activeFilter='live';
      filterRow.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x.dataset.filter==='live'));
      render(cachedMatches);
    }else{
      showToast('Binnenkort beschikbaar');
    }
  };
});

let lastScroll=0;
let ticking=false;
window.addEventListener('scroll',()=>{
  if(ticking)return;
  ticking=true;
  requestAnimationFrame(()=>{
    const y=window.scrollY;
    if(y>lastScroll+10&&y>120){
      tabbar.classList.add('hidden');
    }else if(y<lastScroll-10||y<60){
      tabbar.classList.remove('hidden');
    }
    lastScroll=y;
    ticking=false;
  });
},{passive:true});

let touchStartY=0,pulling=false;
window.addEventListener('touchstart',e=>{
  if(window.scrollY===0)touchStartY=e.touches[0].clientY;
},{passive:true});
window.addEventListener('touchmove',e=>{
  if(window.scrollY===0&&e.touches[0].clientY-touchStartY>80&&!pulling){
    pulling=true;
    haptic();
    load();
    setTimeout(()=>pulling=false,1500);
  }
},{passive:true});

buildNav();
load();
setInterval(()=>{if(activeDate===todayKey)load();},90000);

if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
