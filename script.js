let cards = [];
let availableRarities = {};
let collection = JSON.parse(localStorage.getItem("collection")) || {};
let currentSetName = "";

/* ---------- START ---------- */
function goToStart() {
  document.getElementById("app").classList.add("hidden");
  document.getElementById("start-screen").classList.remove("hidden");
}

function enterApp() {
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
}

/* ---------- LOAD ---------- */
function loadPredefinedSet(name) {
  currentSetName = name;
  fetch(`sets/${name}.json`)
    .then(r => r.json())
    .then(j => initSet(j.data));
}

document.getElementById("jsonInput").addEventListener("change", e => {
  const reader = new FileReader();
  reader.onload = ev => initSet(JSON.parse(ev.target.result).data);
  reader.readAsText(e.target.files[0]);
});

function initSet(data) {
  cards = data;
  buildRarities();
  buildFilter();
  document.getElementById("openPack").disabled = false;
  enterApp();
  renderCollection();
  updateCompletion();
}

/* ---------- HELPERS ---------- */
function buildRarities() {
  availableRarities = {};
  cards.forEach(c => {
    if (!availableRarities[c.rarity]) availableRarities[c.rarity] = [];
    availableRarities[c.rarity].push(c);
  });
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pullWeighted(table) {
  const filtered = table.filter(e => availableRarities[e.rarity]);
  let total = filtered.reduce((s,e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (let e of filtered) {
    if (roll < e.weight) return randomFrom(availableRarities[e.rarity]);
    roll -= e.weight;
  }
}

/* ---------- GOD PACK ---------- */
function isGodPack() {
  return Math.random() < 0.0008; // ~1 in 1250
}

/* ---------- OPEN PACK ---------- */
function openPack() {
  const pack = document.getElementById("pack");
  pack.innerHTML = "";

  const pulls = [];
  const god = isGodPack();

  for (let i = 0; i < 10; i++) {
    pulls.push(
      god
        ? pullWeighted([{ rarity: "Illustration Rare", weight: 1 }])
        : randomFrom(cards)
    );
  }

  pulls.forEach((card, i) => {
    const key = `${card.name}_${card.number}`;
    if (!collection[key]) collection[key] = { ...card, count: 0 };
    collection[key].count++;

    const rarityClass = card.rarity.replace(/\s+/g, "-");

    const cardDiv = document.createElement("div");
    cardDiv.className = `card rarity-${rarityClass}`;

    cardDiv.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back"></div>
        <div class="card-face card-front">
          <img src="${card.image}">
        </div>
      </div>
    `;

    pack.appendChild(cardDiv);

    setTimeout(() => {
      cardDiv.classList.add("flipped");
      if (i >= 7) cardDiv.classList.add("reveal-hit");
    }, i * 200);
  });

  saveCollection();
  renderCollection();
  updateCompletion();
}

/* ---------- COLLECTION ---------- */
function renderCollection() {
  const filter = document.getElementById("rarityFilter").value;
  const col = document.getElementById("collection");
  col.innerHTML = "";

  Object.values(collection)
    .filter(c => filter === "ALL" || c.rarity === filter)
    .forEach(card => {
      const r = card.rarity.replace(/\s+/g, "-");
      const d = document.createElement("div");
      d.className = `card show rarity-${r}`;
      d.innerHTML = `<img src="${card.image}"><div>${card.name} ×${card.count}</div>`;
      col.appendChild(d);
    });
}

/* ---------- FILTER ---------- */
function buildFilter() {
  const s = document.getElementById("rarityFilter");
  s.innerHTML = `<option value="ALL">All</option>`;
  Object.keys(availableRarities).forEach(r => {
    const o = document.createElement("option");
    o.value = r;
    o.textContent = r;
    s.appendChild(o);
  });
}
document.getElementById("rarityFilter").onchange = renderCollection;

/* ---------- COMPLETION ---------- */
function updateCompletion() {
  const total = cards.length;
  const owned = Object.keys(collection).length;
  const percent = Math.floor((owned / total) * 100);

  document.getElementById("completion").innerHTML = `
    <h3>${currentSetName}</h3>
    <div class="progress"><div class="progress-bar" style="width:${percent}%"></div></div>
    <p>${owned}/${total} (${percent}%)</p>
  `;
}

/* ---------- STORAGE ---------- */
function saveCollection() {
  localStorage.setItem("collection", JSON.stringify(collection));
}

document.getElementById("openPack").onclick = openPack;
document.getElementById("resetData").onclick = () => {
  if (!confirm("Reset all data?")) return;
  localStorage.clear();
  collection = {};
  renderCollection();
  updateCompletion();
};

goToStart();
