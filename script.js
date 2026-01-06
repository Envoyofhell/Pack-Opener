let cards = [];
let availableRarities = {};

/* ---------------- STATS ---------------- */
let stats = JSON.parse(localStorage.getItem("packStats")) || {
  packsOpened: 0,
  totalCards: 0,
  rarities: {}
};

const rarityOrder = [
  "Common",
  "Uncommon",
  "Rare",
  "Double Rare",
  "Illustration Rare",
  "Ultra Rare",
  "Special Illustration Rare",
  "Hyper Rare"
];

function saveStats() {
  localStorage.setItem("packStats", JSON.stringify(stats));
}

function updateStatsDisplay() {
  const statsDiv = document.getElementById("stats");
  let html = `
    <h3>Packs Opened: ${stats.packsOpened}</h3>
    <h3>Total cards: ${stats.totalCards}</h3>
    <ul>
  `;

  rarityOrder.forEach(r => {
    html += `<li>${r}: ${stats.rarities[r] || 0}</li>`;
  });

  html += "</ul>";
  statsDiv.innerHTML = html;
}

/* ---------------- COLLECTION ---------------- */
let collection = JSON.parse(localStorage.getItem("collection")) || {};

function saveCollection() {
  localStorage.setItem("collection", JSON.stringify(collection));
}

function normalizeRarity(rarity) {
  return rarity.replace(/\s+/g, "-");
}

function renderCollection() {
  const colDiv = document.getElementById("collection");
  colDiv.innerHTML = "";

  const collectionArray = Object.values(collection);

  collectionArray.sort((a, b) => {
    const ma = a.number.match(/^(\d+)([a-z]?)$/i);
    const mb = b.number.match(/^(\d+)([a-z]?)$/i);
    const na = parseInt(ma[1]);
    const nb = parseInt(mb[1]);
    if (na !== nb) return na - nb;
    return (ma[2] || "").localeCompare(mb[2] || "");
  });

  collectionArray.forEach(card => {
    const rarityClass = normalizeRarity(card.rarity);
    const div = document.createElement("div");
    div.className = `card show rarity-${rarityClass}`;
    div.innerHTML = `
      <img src="${card.image}" alt="${card.name}">
      <div>${card.name} ×${card.count}</div>
    `;
    colDiv.appendChild(div);
  });
}

/* ---------------- LOAD SET ---------------- */
function buildAvailableRarities() {
  availableRarities = {};
  cards.forEach(card => {
    if (!availableRarities[card.rarity]) {
      availableRarities[card.rarity] = [];
    }
    availableRarities[card.rarity].push(card);
  });
}

function loadSetFromUrl(set) {
  fetch(`sets/${set}.json`)
    .then(res => res.json())
    .then(json => {
      cards = json.data;
      buildAvailableRarities();
      document.getElementById("openPack").disabled = false;
      document.getElementById("loading").style.display = "none";
    });
}

/* ---------------- FILE LOAD ---------------- */
document.getElementById("loadPackFromFile").onclick = () =>
  document.getElementById("jsonInput").click();

document.getElementById("jsonInput").onchange = e => {
  const file = e.target.files[0];
  if (!file || !file.name.endsWith(".json")) return alert("Invalid JSON file");

  const reader = new FileReader();
  reader.onload = ev => {
    cards = JSON.parse(ev.target.result).data;
    buildAvailableRarities();
    document.getElementById("openPack").disabled = false;
    document.getElementById("loading").style.display = "none";
  };
  reader.readAsText(file);
};

/* ---------------- HELPERS ---------------- */
function randomFrom(arr) {
  return arr?.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

function getByRarity(r) {
  return availableRarities[r] || [];
}

function weightedRoll(table) {
  const valid = table.filter(e => getByRarity(e.rarity).length);
  if (!valid.length) return null;

  const total = valid.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;

  for (let e of valid) {
    if (roll < e.weight) return e.rarity;
    roll -= e.weight;
  }
  return valid.at(-1).rarity;
}

function pullWeighted(table) {
  const rarity = weightedRoll(table);
  return randomFrom(getByRarity(rarity)) || randomFrom(cards);
}

/* ---------------- OPEN PACK ---------------- */
function openPack() {
  if (!cards.length) return alert("Set not loaded.");

  const pack = document.getElementById("pack");
  pack.innerHTML = "";
  const pulls = [];

  for (let i = 0; i < 4; i++)
    pulls.push(randomFrom(getByRarity("Common")) || randomFrom(cards));

  for (let i = 0; i < 3; i++)
    pulls.push(randomFrom(getByRarity("Uncommon")) || randomFrom(cards));

  pulls.push(pullWeighted([
    { rarity: "Common", weight: 33 },
    { rarity: "Uncommon", weight: 133 },
    { rarity: "Illustration Rare", weight: 6.25 },
    { rarity: "Special Illustration Rare", weight: 1.75 },
    { rarity: "Hyper Rare", weight: 1 }
  ]));

  pulls.push(pullWeighted([
    { rarity: "Common", weight: 85 },
    { rarity: "Uncommon", weight: 232 },
    { rarity: "Illustration Rare", weight: 17 },
    { rarity: "Special Illustration Rare", weight: 3.8 },
    { rarity: "Hyper Rare", weight: 2.2 }
  ]));

  pulls.push(pullWeighted([
    { rarity: "Rare", weight: 11 },
    { rarity: "Double Rare", weight: 3 },
    { rarity: "Ultra Rare", weight: 1 }
  ]));

  stats.packsOpened++;
  stats.totalCards += pulls.length;

  pulls.forEach(card => {
    stats.rarities[card.rarity] = (stats.rarities[card.rarity] || 0) + 1;
    const key = `${card.name}_${card.number}`;
    collection[key] ??= { ...card, count: 0 };
    collection[key].count++;
  });

  saveCollection();
  renderCollection();

  pulls.forEach((card, i) => {
    const rarityClass = normalizeRarity(card.rarity);
    const div = document.createElement("div");
    div.className = `card rarity-${rarityClass}`;
    div.innerHTML = `<img src="${card.image}" alt="${card.name}">`;
    pack.appendChild(div);
    setTimeout(() => div.classList.add("show"), i * 350);
  });

  saveStats();
  updateStatsDisplay();
}

/* ---------------- RESET ---------------- */
document.getElementById("resetData").onclick = () => {
  if (!confirm("Erase all data?")) return;
  localStorage.clear();
  stats = { packsOpened: 0, totalCards: 0, rarities: {} };
  collection = {};
  updateStatsDisplay();
  renderCollection();
};

document.getElementById("openPack").onclick = openPack;

/* ---------------- INIT ---------------- */
loadSetFromUrl("Z-Genesis_Melemele");
updateStatsDisplay();
renderCollection();
