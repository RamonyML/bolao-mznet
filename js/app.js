import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  doc,
  increment,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  avaliarPalpite,
  buildRanking,
  medalForRank,
  resultadosToMap,
} from "./bolao-scoring.js";
import { fillJogoSelect, setJogosCustomizados } from "./jogos-select.js";
import { fillSetorSelect } from "./setores.js";
import { renderFlagHtml, setFlagInElement } from "./team-flags.js";
import { initNomeAutocomplete } from "./nome-autocomplete.js";
import { initPacotinho } from "./pacotinho.js";
import { initPlayerCard, openPlayerCard } from "./card-palpiteiro.js";

const COLLECTION_PALPITES = "palpites";
const COLLECTION_RESULTADOS = "resultados";
const COLLECTION_CONFIG = "config";
const FEATURES_DOC = "features";
const JOGOS_DOC = "jogos";
const REACTIONS = [
  { key: "fire", emoji: "🔥", label: "Esse palpite é brabo" },
  { key: "laugh", emoji: "😂", label: "Achei engraçado" },
  { key: "clap", emoji: "👏", label: "Boa aposta" },
  { key: "chicken", emoji: "🐔", label: "Pipocou" },
];

const els = {
  form: document.getElementById("form-palpite"),
  lista: document.getElementById("lista-palpites"),
  empty: document.getElementById("empty-state"),
  emptyTitle: document.querySelector("#empty-state .empty-state__title"),
  emptyHint: document.querySelector("#empty-state .empty-state__hint"),
  tabs: document.querySelectorAll(".bets-tab"),
  countAberto: document.getElementById("count-aberto"),
  countEncerrado: document.getElementById("count-encerrado"),
  toast: document.getElementById("toast"),
  statTotal: document.getElementById("stat-total"),
  btnSort: document.getElementById("btn-sort"),
  submitBtn: document.querySelector(".btn-submit"),
  nome: document.getElementById("nome"),
  nomeSuggestions: document.getElementById("nome-suggestions"),
  setor: document.getElementById("setor"),
  jogo: document.getElementById("jogo"),
  timeHome: document.getElementById("time-home"),
  timeAway: document.getElementById("time-away"),
  golsHome: document.getElementById("gols-home"),
  golsAway: document.getElementById("gols-away"),
  previewHome: document.getElementById("preview-home"),
  previewAway: document.getElementById("preview-away"),
  previewHomeFlag: document.getElementById("preview-home-flag"),
  previewAwayFlag: document.getElementById("preview-away-flag"),
  rankingList: document.getElementById("ranking-list"),
  rankingEmpty: document.getElementById("ranking-empty"),
  rankingPodium: document.getElementById("ranking-podium"),
  pacotinhoSection: document.getElementById("pacotinho-section"),
};

let sortNewestFirst = true;
let activeTab = "aberto";
let palpites = [];
let resultadosMap = new Map();
let lastLeaderKey = null;
const featureFlags = {
  figurinhaSurpresa: true,
  reactions: true,
  confetti: true,
};

function toIsoDate(value) {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (value.toDate) return value.toDate().toISOString();
  return new Date(value).toISOString();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("is-visible"), 3200);
}

function setSubmitLoading(loading) {
  if (!els.submitBtn) return;
  els.submitBtn.disabled = loading;
  els.submitBtn.style.opacity = loading ? "0.7" : "";
  els.submitBtn.style.cursor = loading ? "wait" : "";
}

function clampScoreInput(input) {
  if (!input) return;
  input.addEventListener("input", () => {
    input.value = Math.max(0, Math.min(20, parseInt(input.value, 10) || 0));
  });
}

function bindScoreSync() {
  clampScoreInput(els.golsHome);
  clampScoreInput(els.golsAway);
}

function updatePreview() {
  const home = els.timeHome.value || "Brasil";
  const away = els.timeAway.value || "Adversário";
  els.previewHome.textContent = home;
  els.previewAway.textContent = away;
  setFlagInElement(els.previewHomeFlag, home, "lg");
  setFlagInElement(els.previewAwayFlag, away, "lg");
}

function aplicarSetorUsuario(setor) {
  const sel = els.setor;
  if (!sel) return;

  if (!setor || setor === "Sem setor") {
    sel.value = "";
    return;
  }

  let opt = [...sel.options].find((o) => o.value === setor);
  if (!opt) {
    opt = document.createElement("option");
    opt.value = setor;
    opt.textContent = setor;
    sel.appendChild(opt);
  }
  sel.value = setor;
}

function parseJogoSelect() {
  const opt = els.jogo.options[els.jogo.selectedIndex];
  if (!opt || !opt.value) return;
  const match = opt.text.match(/^(.+?)\s+x\s+(.+?)(?:\s+—.*)?$/i);
  if (match) {
    els.timeHome.value = match[1].trim();
    els.timeAway.value = match[2].trim();
    updatePreview();
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function winnerClass(golsH, golsA, side) {
  if (golsH === golsA) return "";
  const homeWins = golsH > golsA;
  const wins = side === "home" ? homeWins : !homeWins;
  return wins ? "is-winner" : "";
}

function renderReactions(reactions = {}) {
  return REACTIONS.map((reaction) => {
    const count = Number(reactions[reaction.key]) || 0;
    return `
      <button
        type="button"
        class="reaction-btn"
        data-reaction="${reaction.key}"
        title="${reaction.label}"
        aria-label="${reaction.label}"
      >
        <span aria-hidden="true">${reaction.emoji}</span>
        <b>${count}</b>
      </button>
    `;
  }).join("");
}

async function reactToPalpite(palpiteId, reactionKey, button) {
  if (!palpiteId || !REACTIONS.some((r) => r.key === reactionKey)) return;

  button.disabled = true;
  try {
    await updateDoc(doc(db, COLLECTION_PALPITES, palpiteId), {
      [`reactions.${reactionKey}`]: increment(1),
    });
  } catch (error) {
    console.error(error);
    showToast("Não foi possível reagir agora.");
    button.disabled = false;
  }
}

function fireConfetti() {
  if (!featureFlags.confetti) return;
  if (typeof window.confetti !== "function") return;
  window.confetti({
    particleCount: 90,
    spread: 72,
    startVelocity: 38,
    origin: { y: 0.35 },
    colors: ["#ffdf00", "#166635", "#002776", "#ffffff"],
  });
}

function renderPodium(top) {
  els.rankingPodium.innerHTML = "";
  // Ordem visual: 2º, 1º, 3º (pódio clássico)
  [1, 0, 2].forEach((idx) => {
    const row = top[idx];
    if (!row) return;
    const place = idx + 1;
    const spot = document.createElement("button");
    spot.type = "button";
    spot.className = `podium__spot podium__spot--${place}`;
    spot.setAttribute("aria-label", `Ver figurinha de ${row.nome}`);
    spot.innerHTML = `
      <span class="podium__medal">${medalForRank(idx)}</span>
      <span class="podium__name">${escapeHtml(row.nome)}</span>
      <span class="podium__pts">${row.pontos} pts</span>
      <span class="podium__bar">${place}º</span>
    `;
    spot.addEventListener("click", () => openPlayerCard(row, place));
    els.rankingPodium.appendChild(spot);
  });
}

function renderRanking() {
  const ranking = buildRanking(palpites, resultadosMap);
  els.rankingList.querySelectorAll(".ranking-item").forEach((el) => el.remove());

  if (ranking.length === 0) {
    els.rankingEmpty.classList.remove("d-none");
    els.rankingPodium.classList.add("d-none");
    els.rankingPodium.innerHTML = "";
    lastLeaderKey = null;
    return;
  }

  els.rankingEmpty.classList.add("d-none");

  renderPodium(ranking.slice(0, 3));
  els.rankingPodium.classList.remove("d-none");

  ranking.slice(3).forEach((row, i) => {
    const posicao = i + 4;
    const item = document.createElement("button");
    item.type = "button";
    item.className = "ranking-item";
    item.setAttribute("aria-label", `Ver figurinha de ${row.nome}`);
    item.innerHTML = `
      <span class="ranking-item__pos">${posicao}º</span>
      <div class="ranking-item__body">
        <span class="ranking-item__name">${escapeHtml(row.nome)}</span>
        <span class="ranking-item__stats text-muted small">
          ${row.exatos} exato(s) · ${row.acertos} acerto(s) · ${row.palpites} palpite(s)
        </span>
      </div>
      <span class="ranking-item__pts">${row.pontos} pts</span>
    `;
    item.addEventListener("click", () => openPlayerCard(row, posicao));
    els.rankingList.appendChild(item);
  });

  const leaderKey = (ranking[0].nome || "").trim().toLowerCase();
  if (leaderKey && leaderKey !== lastLeaderKey) {
    lastLeaderKey = leaderKey;
    fireConfetti();
  }
}

function renderCard(p, index) {
  const gH = Number(p.golsHome);
  const gA = Number(p.golsAway);
  const createdAt = toIsoDate(p.createdAt);
  const av = avaliarPalpite(p, resultadosMap);

  const card = document.createElement("article");
  card.className = "bet-card";
  if (av.status === "exact") card.classList.add("bet-card--exact");
  else if (av.status === "result") card.classList.add("bet-card--hit");
  card.role = "listitem";
  card.style.animationDelay = `${index * 0.05}s`;

  let badge = "";
  if (av.label) {
    badge = `<span class="bet-badge bet-badge--${av.status}">${escapeHtml(av.label)}</span>`;
  }

  const lateBadge = av.registeredAfterResult
    ? '<span class="bet-badge bet-badge--late" title="Palpite registrado depois do resultado oficial">⚠ Após o resultado</span>'
    : "";

  let oficialLine = "";
  if (av.oficial) {
    oficialLine = `<p class="bet-card__oficial small mb-2 mb-0">Resultado oficial: <strong>${av.oficial.golsHome} : ${av.oficial.golsAway}</strong></p>`;
  }

  const setorBadge = p.setor
    ? `<span class="bet-card__setor">${escapeHtml(p.setor)}</span>`
    : "";

  card.innerHTML = `
    <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
      <div>
        <span class="bet-card__name">${escapeHtml(p.nome)}</span>
        ${setorBadge}
      </div>
      <div class="d-flex align-items-center gap-2 flex-wrap">
        ${badge}
        ${lateBadge}
        <time class="bet-card__meta" datetime="${createdAt}">${formatDate(createdAt)}</time>
      </div>
    </div>
    <p class="bet-card__match mb-1">${escapeHtml(p.jogo)}</p>
    ${oficialLine}
    <div class="bet-card__scoreline">
      <span class="bet-card__team ${winnerClass(gH, gA, "home")}">
        ${renderFlagHtml(p.timeHome, "sm")}<span class="bet-card__team-name">${escapeHtml(p.timeHome)}</span>
      </span>
      <span class="bet-card__placar">${gH} : ${gA}</span>
      <span class="bet-card__team ${winnerClass(gH, gA, "away")}">
        ${renderFlagHtml(p.timeAway, "sm")}<span class="bet-card__team-name">${escapeHtml(p.timeAway)}</span>
      </span>
    </div>
    ${
      featureFlags.reactions
        ? `<div class="reaction-row" aria-label="Reações ao palpite">${renderReactions(p.reactions)}</div>`
        : ""
    }
  `;
  card.querySelectorAll(".reaction-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      reactToPalpite(p.id, btn.dataset.reaction, btn)
    );
  });
  return card;
}

function isEncerrado(palpite) {
  return resultadosMap.has(palpite.jogo);
}

function setEmptyState(tab) {
  if (tab === "encerrado") {
    els.emptyTitle.textContent = "Nenhum palpite encerrado";
    els.emptyHint.textContent =
      "Os palpites aparecem aqui quando o jogo tiver resultado oficial.";
  } else {
    els.emptyTitle.textContent = "Nenhum palpite em aberto";
    els.emptyHint.textContent = "Seja o primeiro a registrar o seu.";
  }
}

function renderList() {
  const sorted = [...palpites].sort((a, b) => {
    const ta = new Date(toIsoDate(a.createdAt)).getTime();
    const tb = new Date(toIsoDate(b.createdAt)).getTime();
    return sortNewestFirst ? tb - ta : ta - tb;
  });

  els.statTotal.textContent = String(sorted.length);

  const abertos = sorted.filter((p) => !isEncerrado(p));
  const encerrados = sorted.filter((p) => isEncerrado(p));
  els.countAberto.textContent = String(abertos.length);
  els.countEncerrado.textContent = String(encerrados.length);

  const atual = activeTab === "encerrado" ? encerrados : abertos;

  els.lista.querySelectorAll(".bet-card").forEach((c) => c.remove());

  if (atual.length === 0) {
    setEmptyState(activeTab);
    els.empty.classList.remove("d-none");
  } else {
    els.empty.classList.add("d-none");
    atual.forEach((p, i) => els.lista.appendChild(renderCard(p, i)));
  }

  renderRanking();
}

function subscribePalpites() {
  const q = query(collection(db, COLLECTION_PALPITES), orderBy("createdAt", "desc"));
  onSnapshot(
    q,
    (snapshot) => {
      palpites = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderList();
    },
    (error) => {
      console.error(error);
      showToast("Não foi possível carregar os palpites.");
    }
  );
}

function subscribeResultados() {
  onSnapshot(
    collection(db, COLLECTION_RESULTADOS),
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      resultadosMap = resultadosToMap(docs);
      renderList();
    },
    (error) => console.error(error)
  );
}

function applyFeatureFlags() {
  if (els.pacotinhoSection) {
    els.pacotinhoSection.classList.toggle("d-none", !featureFlags.figurinhaSurpresa);
  }
}

function subscribeJogos() {
  onSnapshot(
    doc(db, COLLECTION_CONFIG, JOGOS_DOC),
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : {};
      setJogosCustomizados(data.lista || []);
      fillJogoSelect(els.jogo);
    },
    (error) => console.error(error)
  );
}

function subscribeConfig() {
  onSnapshot(
    doc(db, COLLECTION_CONFIG, FEATURES_DOC),
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : {};
      featureFlags.figurinhaSurpresa = data.figurinhaSurpresa !== false;
      featureFlags.reactions = data.reactions !== false;
      featureFlags.confetti = data.confetti !== false;
      applyFeatureFlags();
      renderList();
    },
    (error) => console.error(error)
  );
}

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!els.form.checkValidity()) {
    e.stopPropagation();
    els.form.classList.add("was-validated");
    return;
  }

  setSubmitLoading(true);

  try {
    await addDoc(collection(db, COLLECTION_PALPITES), {
      nome: els.nome.value.trim(),
      setor: els.setor.value,
      jogo: els.jogo.value,
      timeHome: els.timeHome.value.trim(),
      timeAway: els.timeAway.value.trim(),
      golsHome: parseInt(els.golsHome.value, 10) || 0,
      golsAway: parseInt(els.golsAway.value, 10) || 0,
      createdAt: serverTimestamp(),
    });

    els.form.reset();
    els.form.classList.remove("was-validated");
    fillJogoSelect(els.jogo);
    fillSetorSelect(els.setor);
    els.timeHome.value = "Brasil";
    els.timeAway.value = "Marrocos";
    els.golsHome.value = "0";
    els.golsAway.value = "0";
    updatePreview();

    showToast("Palpite registrado com sucesso!");
    els.nome.focus();
  } catch (error) {
    console.error(error);
    showToast("Erro ao salvar. Tente de novo em instantes.");
  } finally {
    setSubmitLoading(false);
  }
});

els.btnSort.addEventListener("click", () => {
  sortNewestFirst = !sortNewestFirst;
  els.btnSort.textContent = sortNewestFirst ? "Recentes ↓" : "Antigos ↑";
  renderList();
});

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    if (activeTab === tab.dataset.tab) return;
    activeTab = tab.dataset.tab;
    els.tabs.forEach((t) => {
      const isActive = t === tab;
      t.classList.toggle("is-active", isActive);
      t.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    renderList();
  });
});

[els.timeHome, els.timeAway].forEach((el) =>
  el.addEventListener("input", updatePreview)
);
els.jogo.addEventListener("change", parseJogoSelect);

fillJogoSelect(els.jogo);
fillSetorSelect(els.setor);
initNomeAutocomplete({
  input: els.nome,
  list: els.nomeSuggestions,
  onSelect: (usuario) => aplicarSetorUsuario(usuario.setor),
});
initPacotinho();
initPlayerCard();
bindScoreSync();
updatePreview();
subscribeJogos();
subscribeConfig();
subscribePalpites();
subscribeResultados();
