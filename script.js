let cards = [];
let availableRarities = {};

let stats = JSON.parse(localStorage.getItem("packStats")) || {
  packsOpened: 0,
  totalCards: 0,
  rarities: {}
};

let collection = JSON.parse(localStorage.getItem("collection")) || {};

/* ---------------- DOM ---------------- */
const startScreen = document.getElementById("startScreen");
const openPackPage = document.getElementById("openPackPage");
const collectionPage = document.getElementById("collectionPage");

const openPackBtn = document.getElementById("openPack");
const viewCollectionBtn = document.getElementById("viewCollection");
const backToOpenPackBtn = document.getElementById("backToOpenPack");
const backToStartBtn = document.getElementById("backToStart");
const resetBtn = document.getElementById("resetData");

const packDiv = document.getElementById("pack");
const collectionDiv = document.getElementById("collection");
const statsDiv = document.getElementById("stats");
const loadingDiv = document.getElementById("loading");

const availableSetsDiv = document.getElementById("availableSets");
const importSetBtn = document.getElementById("importSet");
const jsonInput = document.getElementById("jsonInput");

/* ---------------- SAVE ---------------- */
const saveStats = () =>
  localStorage.setItem("packStats", JSON.stringify(stats));
const saveCollection = () =>
  localStorage.setItem("collection", JSON.stringify(collection));

/* ---------------- HELPERS ---------------- */
function randomFrom(arr) {
  return arr && arr.length
    ? arr[Math.floor(Math.random() * arr.length)]
    : null;
}

function getByRarity(r) {
  return availableRarities[r] || [];
}

function weightedRoll(table) {
  const valid = table.filter(e => getByRarity(e.rarity).length);
  if (!valid.length) return null;

  const total = valid.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;

  for (const e of valid) {
    if (roll < e.weight) return e.rarity;
    roll -= e.weight;
  }
  return valid.at(-1).rarity;
}

function pullWeighted(table) {
  const rarity = weightedRoll(table);
  return randomFrom(getByRarity(rarity)) || randomFrom(cards);
}

/* ---------------- SET LOAD ---------------- */
function buildAvailableRarities() {
  availableRarities = {};
  cards.forEach(c => {
    if (!availableRarities[c.rarity]) {
      availableRarities[c.rarity] = [];
    }
    availableRarities[c.rarity].push(c);
  });
}

function loadSet(source) {
  loadingDiv.style.display = "block";

  const finish = json => {
    cards = json.data;
    buildAvailableRarities();
    loadingDiv.style.display = "none";
    openPackBtn.disabled = false;
    startScreen.classList.add("hidden");
    openPackPage.classList.remove("hidden");
  };

  if (typeof source === "string") {
    fetch(source).then(r => r.json()).then(finish);
  } else {
    finish(JSON.parse(source));
  }
}

/* ---------------- PACK OPEN ---------------- */
function openPack() {
  packDiv.innerHTML = "";

  const pulls = [];

  for (let i = 0; i < 4; i++)
    pulls.push(randomFrom(getByRarity("Common")) || randomFrom(cards));

  for (let i = 0; i < 3; i++)
    pulls.push(randomFrom(getByRarity("Uncommon")) || randomFrom(cards));

  pulls.push(pullWeighted([
    { rarity: "Common", weight: 55 },
    { rarity: "Uncommon", weight: 32 },
    { rarity: "Rare", weight: 11 },
    { rarity: "Illustration Rare", weight: 1.5 },
    { rarity: "Special Illustration Rare", weight: 0.4 },
    { rarity: "Hyper Rare", weight: 0.1 }
  ]));

  pulls.push(pullWeighted([
    { rarity: "Common", weight: 35 },
    { rarity: "Uncommon", weight: 43 },
    { rarity: "Rare", weight: 18 },
    { rarity: "Illustration Rare", weight: 12 },
    { rarity: "Special Illustration Rare", weight: 2.3 },
    { rarity: "Hyper Rare", weight: 0.7 }
  ]));

  pulls.push(pullWeighted([
    { rarity: "Rare", weight: 11 },
    { rarity: "Double Rare", weight: 3 },
    { rarity: "Ultra Rare", weight: 1 }
  ]));

  stats.packsOpened++;
  stats.totalCards += pulls.length;

  pulls.forEach(c => {
    stats.rarities[c.rarity] = (stats.rarities[c.rarity] || 0) + 1;
    const key = `${c.name}_${c.number}`;
    if (!collection[key]) collection[key] = { ...c, count: 0 };
    collection[key].count++;
  });

  saveStats();
  saveCollection();

  pulls.forEach((c, i) => {
    const div = document.createElement("div");
    div.className = `card rarity-${c.rarity.replace(/\s+/g, "-")}`;
    div.innerHTML = `<img src="${c.image}">`;
    packDiv.appendChild(div);
    setTimeout(() => div.classList.add("show"), i * 300);
  });
}

/* ---------------- COLLECTION + PROGRESS ---------------- */
function renderCollection() {
  collectionDiv.innerHTML = "";

  const arr = Object.values(collection).sort((a, b) => {
    const pa = a.number.match(/^(\d+)([a-z]?)$/i);
    const pb = b.number.match(/^(\d+)([a-z]?)$/i);
    if (+pa[1] !== +pb[1]) return +pa[1] - +pb[1];
    return (pa[2] || "").localeCompare(pb[2] || "");
  });

  arr.forEach(c => {
    const div = document.createElement("div");
    div.className = `card rarity-${c.rarity.replace(/\s+/g, "-")}`;
    div.innerHTML = `<img src="${c.image}"><div>${c.name} ×${c.count}</div>`;
    collectionDiv.appendChild(div);
  });
}

function renderStatsAndProgress() {
  const totalSet = cards.length;
  const owned = new Set(Object.values(collection).map(c => c.name)).size;

  const regularRarities = [
    "Common", "Uncommon", "Rare", "Double Rare"
  ];

  const regularTotal = cards.filter(c =>
    regularRarities.includes(c.rarity)
  ).length;

  const regularOwned = Object.values(collection).filter(c =>
    regularRarities.includes(c.rarity)
  ).length;

  statsDiv.innerHTML = `
    <h3>Packs Opened: ${stats.packsOpened}</h3>
    <h3>Total Cards: ${stats.totalCards}</h3>

    <div class="progress">
      <label>Regular Set</label>
      <div class="bar"><div style="width:${(regularOwned/regularTotal)*100}%"></div></div>
    </div>

    <div class="progress">
      <label>Master Set</label>
      <div class="bar"><div style="width:${(owned/totalSet)*100}%"></div></div>
    </div>
  `;
}

/* ---------------- NAV ---------------- */
viewCollectionBtn.onclick = () => {
  openPackPage.classList.add("hidden");
  collectionPage.classList.remove("hidden");
  renderCollection();
  renderStatsAndProgress();
};

backToOpenPackBtn.onclick = () => {
  collectionPage.classList.add("hidden");
  openPackPage.classList.remove("hidden");
};

backToStartBtn.onclick = () => {
  openPackPage.classList.add("hidden");
  startScreen.classList.remove("hidden");
};

/* ---------------- RESET ---------------- */
resetBtn.onclick = () => {
  if (!confirm("Erase all data?")) return;
  localStorage.clear();
  stats = { packsOpened: 0, totalCards: 0, rarities: {} };
  collection = {};
  renderCollection();
  renderStatsAndProgress();
};

/* ---------------- START SCREEN ---------------- */
["Z-Genesis_Melemele", "Soaring_Titans"].forEach(s => {
  const b = document.createElement("button");
  b.textContent = s;
  b.onclick = () => loadSet(`sets/${s}.json`);
  availableSetsDiv.appendChild(b);
});

importSetBtn.onclick = () => jsonInput.click();
jsonInput.onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = ev => loadSet(ev.target.result);
  r.readAsText(f);
};

openPackBtn.onclick = openPack;

/* ---------------- INIT ---------------- */
startScreen.classList.remove("hidden");
openPackPage.classList.add("hidden");
collectionPage.classList.add("hidden");
