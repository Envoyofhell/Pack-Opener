let cards = [], availableRarities = {};
let stats = JSON.parse(localStorage.getItem("packStats")) || { packsOpened:0,totalCards:0,rarities:{} };
let collection = JSON.parse(localStorage.getItem("collection")) || {};

// DOM elements
const startScreen = document.getElementById("startScreen");
const openPackPage = document.getElementById("openPackPage");
const collectionPage = document.getElementById("collectionPage");

const openPackBtn = document.getElementById("openPack");
const viewCollectionBtn = document.getElementById("viewCollection");
const backToStartBtn = document.getElementById("backToStart");
const backToOpenPackBtn = document.getElementById("backToOpenPack");
const resetBtn = document.getElementById("resetData");

const packDiv = document.getElementById("pack");
const collectionDiv = document.getElementById("collection");
const statsDiv = document.getElementById("stats");
const loadingDiv = document.getElementById("loading");

const availableSetsDiv = document.getElementById("availableSets");
const importSetBtn = document.getElementById("importSet");
const jsonInput = document.getElementById("jsonInput");

/* ---------------- STATS & COLLECTION ---------------- */
function saveStats(){ localStorage.setItem("packStats",JSON.stringify(stats)); }
function saveCollection(){ localStorage.setItem("collection",JSON.stringify(collection)); }

function updateStatsDisplay(){
  let html=`<h3>Packs Opened: ${stats.packsOpened}</h3>
            <h3>Total cards: ${stats.totalCards}</h3><ul>`;
  ["Common","Uncommon","Rare","Double Rare","Illustration Rare","Ultra Rare","Special Illustration Rare","Hyper Rare"]
    .forEach(r=>html+=`<li>${r}: ${stats.rarities[r]||0}</li>`);
  html+="</ul>";
  statsDiv.innerHTML=html;
}

function renderCollection(){
  collectionDiv.innerHTML="";
  const arr=Object.values(collection);

  arr.sort((a,b)=>{
    const ma=a.number.match(/^(\d+)([a-z]?)$/i);
    const mb=b.number.match(/^(\d+)([a-z]?)$/i);
    const na=parseInt(ma[1]), nb=parseInt(mb[1]);
    const la=ma[2]||'', lb=mb[2]||'';
    if(na!==nb) return na-nb;
    return la.localeCompare(lb);
  });

  arr.forEach(c=>{
    const div=document.createElement("div");
    div.className=`card show rarity-${c.rarity.replace(/\s+/g,'-')}`;
    div.innerHTML=`<img src="${c.image}"><div>${c.name} ×${c.count}</div>`;
    collectionDiv.appendChild(div);
  });
}

/* ---------------- LOAD SET ---------------- */
function buildAvailableRarities(){
  availableRarities={};
  cards.forEach(c=>{
    if(!availableRarities[c.rarity]) availableRarities[c.rarity]=[];
    availableRarities[c.rarity].push(c);
  });
}

function loadSet(fileOrJSON){
  loadingDiv.style.display="block";

  const finishLoad = (j)=>{
    cards=j.data;
    buildAvailableRarities();
    loadingDiv.style.display="none";
    openPackBtn.disabled=false;
    startScreen.classList.add("hidden");
    openPackPage.classList.remove("hidden");
    updateStatsDisplay();
    renderCollection();
  };

  if(typeof fileOrJSON==="string"){
    fetch(fileOrJSON).then(r=>r.json()).then(finishLoad);
  } else {
    try{ finishLoad(JSON.parse(fileOrJSON)); }
    catch{ alert("Invalid JSON"); }
  }
}

/* ---------------- HELPERS ---------------- */
function randomFrom(arr){ return arr?.length ? arr[Math.floor(Math.random()*arr.length)] : null; }
function getByRarity(r){ return availableRarities[r]||[]; }
function weightedRoll(table){
  const f=table.filter(e=>getByRarity(e.rarity).length);
  let total=f.reduce((s,e)=>s+e.weight,0), roll=Math.random()*total;
  for(let e of f){ if(roll<e.weight) return e.rarity; roll-=e.weight; }
}
function pullWeighted(table){ return randomFrom(getByRarity(weightedRoll(table)))||randomFrom(cards); }

/* ---------------- OPEN PACK ---------------- */
function openPack(){
  if(!cards.length) return alert("Set not loaded");
  packDiv.innerHTML="";

  const pulls=[];
  for(let i=0;i<4;i++) pulls.push(randomFrom(getByRarity("Common")));
  for(let i=0;i<3;i++) pulls.push(randomFrom(getByRarity("Uncommon")));
  pulls.push(pullWeighted([
    { rarity:"Common", weight:55},{ rarity:"Uncommon", weight:32},{ rarity:"Rare", weight:11},
    { rarity:"Illustration Rare", weight:1.5},{ rarity:"Special Illustration Rare", weight:0.4},{ rarity:"Hyper Rare", weight:0.1}
  ]));
  pulls.push(pullWeighted([
    { rarity:"Common", weight:35},{ rarity:"Uncommon", weight:43},{ rarity:"Rare", weight:18},
    { rarity:"Illustration Rare", weight:12},{ rarity:"Special Illustration Rare", weight:2.3},{ rarity:"Hyper Rare", weight:0.7}
  ]));
  pulls.push(pullWeighted([{ rarity:"Rare", weight:11},{ rarity:"Double Rare", weight:3},{ rarity:"Ultra Rare", weight:1}]));

  stats.packsOpened++; stats.totalCards+=pulls.length;
  pulls.forEach(c=>stats.rarities[c.rarity]=(stats.rarities[c.rarity]||0)+1);
  pulls.forEach(c=>{
    const k=`${c.name}_${c.number}`;
    if(!collection[k]) collection[k]={...c,count:0};
    collection[k].count++;
  });

  saveCollection(); saveStats(); updateStatsDisplay(); renderCollection();

  pulls.forEach((c,i)=>{
    const div=document.createElement("div");
    div.className=`card rarity-${c.rarity.replace(/\s+/g,'-')}`;
    if(i>=7) div.classList.add("last-three-hidden");
    div.innerHTML=`<img src="${c.image}">`;
    packDiv.appendChild(div);
    if(i<7) setTimeout(()=>div.classList.add("show"),i*300);
  });
}

/* Reveal last 3 */
packDiv.onclick=()=>{
  packDiv.querySelectorAll(".last-three-hidden").forEach(d=>{
    d.classList.remove("last-three-hidden");
    d.classList.add("show");
  });
};

/* ---------------- START SCREEN ---------------- */
["Z-Genesis_Melemele","Soaring_Titans"].forEach(s=>{
  const btn=document.createElement("button");
  btn.textContent=s;
  btn.onclick=()=>loadSet(`sets/${s}.json`);
  availableSetsDiv.appendChild(btn);
});

/* ---------------- IMPORT ---------------- */
importSetBtn.onclick=()=>jsonInput.click();
jsonInput.onchange=e=>{
  const f=jsonInput.files[0];
  if(!f) return;
  const r=new FileReader();
  r.onload=ev=>loadSet(ev.target.result);
  r.readAsText(f);
};

/* ---------------- NAV ---------------- */
viewCollectionBtn.onclick=()=>{
  openPackPage.classList.add("hidden");
  collectionPage.classList.remove("hidden");
  renderCollection(); // ✅ FIX: force render when opening collection
};

backToOpenPackBtn.onclick=()=>{ 
  collectionPage.classList.add("hidden"); 
  openPackPage.classList.remove("hidden"); 
};

backToStartBtn.onclick=()=>{ 
  openPackPage.classList.add("hidden"); 
  startScreen.classList.remove("hidden"); 
};

openPackBtn.onclick=openPack;

/* ---------------- RESET ---------------- */
resetBtn.onclick=()=>{
  if(!confirm("Erase all data?")) return;
  localStorage.clear();
  stats={packsOpened:0,totalCards:0,rarities:{}};
  collection={};
  updateStatsDisplay();
  renderCollection();
};

/* ---------------- INIT ---------------- */
startScreen.classList.remove("hidden");
openPackPage.classList.add("hidden");
collectionPage.classList.add("hidden");
updateStatsDisplay();
renderCollection();
