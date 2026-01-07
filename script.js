let cards = [];
let availableRarities = {};
let collection = {};
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

const startScreen = document.getElementById("start-screen");
const app = document.getElementById("app");
const loading = document.getElementById("loading");
const packDiv = document.getElementById("pack");
const collectionDiv = document.getElementById("collection");

/* ---------- SET LOADING ---------- */
document.getElementById("loadDefault").onclick = () => {
  loadSet("sets/Z-Genesis_Melemele.json");
};

document.getElementById("importSet").onclick = () => {
  document.getElementById("fileInput").click();
};

document.getElementById("fileInput").addEventListener("change", e => {
  const reader = new FileReader();
  reader.onload = ev => {
    const json = JSON.parse(ev.target.result);
    initSet(json.data);
  };
  reader.readAsText(e.target.files[0]);
});

function loadSet(path) {
  loading.style.display = "block";
  fetch(path)
    .then(r => r.json())
    .then(j => initSet(j.data))
    .catch(() => alert("Failed to load set"));
}

function initSet(data) {
  cards = data;
  collection = {};
  availableRarities = {};

  cards.forEach(c => {
    if (!availableRarities[c.rarity]) {
      availableRarities[c.rarity] = [];
    }
    availableRarities[c.rarity].push(c);
  });

  startScreen.classList.add("hidden");
  app.classList.remove("hidden");
  document.getElementById("openPack").disabled = false;
  loading.style.display = "none";

  renderCollection();
  updateStats();
}

/* ---------- HELPERS ---------- */
function randomFrom(arr) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function pullWeighted(table) {
  const filtered = table.filter(e => availableRarities[e.rarity]?.length);
  const total = filtered.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;

  for (let e of filtered) {
    if (roll < e.weight) return randomFrom(availableRarities[e.rarity]);
    roll -= e.weight;
  }
  return randomFrom(cards);
}

function isGodPack() {
  return Math.random() < 0.001;
}

/* ---------- OPEN PACK ---------- */
document.getElementById("openPack").onclick = () => {
  packDiv.innerHTML = "";
  const pulls = [];
  const god = isGodPack();

  for (let i = 0; i < 4; i++) pulls.push(randomFrom(availableRarities["Common"] || cards));
  for (let i = 0; i < 3; i++) pulls.push(randomFrom(availableRarities["Uncommon"] || cards));

  pulls.push(pullWeighted([
    { rarity: "Common", weight: 55 },
    { rarity: "Uncommon", weight: 32 },
    { rarity: "Rare", weight: 11 },
    { rarity: "Illustration Rare", weight: 2 }
  ]));

  pulls.push(pullWeighted([
    { rarity: "Common", weight: 35 },
    { rarity: "Uncommon", weight: 43 },
    { rarity: "Rare", weight: 18 },
    { rarity: "Illustration Rare", weight: 12 }
  ]));

  pulls.push(god
    ? randomFrom(availableRarities["Illustration Rare"] || cards)
    : pullWeighted([
        { rarity: "Rare", weight: 72 },
        { rarity: "Double Rare", weight: 21 },
        { rarity: "Ultra Rare", weight: 6 },
        { rarity: "Special Illustration Rare", weight: 1.5 },
        { rarity: "Hyper Rare", weight: 0.5 }
      ])
  );

  stats.packsOpened++;
  stats.totalCards += pulls.length;

  pulls.forEach(card => {
    stats.rarities[card.rarity] = (stats.rarities[card.rarity] || 0) + 1;

    const key = card.name + "_" + card.number;
    if (!collection[key]) collection[key] = { ...card, count: 0 };
    collection[key].count++;
  });

  saveStats();
  renderPack(pulls);
  renderCollection();
  updateStats();
};

/* ---------- RENDER ---------- */
function renderPack(pulls) {
  pulls.forEach((card, i) => {
    const div = document.createElement("div");
    const cls = card.rarity.replace(/\s+/g, "-");
    div.className = `card rarity-${cls}`;
    div.innerHTML = `<img src="${card.image}">`;
    packDiv.appendChild(div);
    setTimeout(() => div.classList.add("show"), i * 250);
  });
}

function renderCollection() {
  collectionDiv.innerHTML = "";
  Object.values(collection).forEach(card => {
    const cls = card.rarity.replace(/\s+/g, "-");
    const div = document.createElement("div");
    div.className = `card rarity-${cls} show`;
    div.innerHTML = `<img src="${card.image}"><div>${card.name} ×${card.count}</div>`;
    collectionDiv.appendChild(div);
  });
}

/* ---------- STATS ---------- */
function updateStats() {
  const statsDiv = document.getElementById("stats");
  let html = `<h3>Packs: ${stats.packsOpened}</h3>
              <h3>Total Cards: ${stats.totalCards}</h3><ul>`;
  rarityOrder.forEach(r => {
    html += `<li>${r}: ${stats.rarities[r] || 0}</li>`;
  });
  html += "</ul>";
  statsDiv.innerHTML = html;
}

function saveStats() {
  localStorage.setItem("packStats", JSON.stringify(stats));
}

/* ---------- NAV ---------- */
document.getElementById("backToStart").onclick = () => {
  app.classList.add("hidden");
  startScreen.classList.remove("hidden");
};

document.getElementById("resetData").onclick = () => {
  if (!confirm("Reset all data?")) return;
  localStorage.clear();
  stats = { packsOpened: 0, totalCards: 0, rarities: {} };
  collection = {};
  renderCollection();
  updateStats();
};
