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
  buildSetorRanking,
  buildDuplicateSet,
  medalForRank,
  resultadosToMap,
  JOGOS_OPCOES,
} from "./bolao-scoring.js";
import { fillJogoSelect, setJogosCustomizados } from "./jogos-select.js";
import { fillSetorSelect } from "./setores.js";
import { renderFlagHtml, setFlagInElement } from "./team-flags.js";
import { initNomeAutocomplete } from "./nome-autocomplete.js";
import { initPacotinho } from "./pacotinho.js";
import { initPlayerCard, openPlayerCard } from "./card-palpiteiro.js";
import {
  findFigureByName,
  figureThumbPath,
  figureImagePath,
} from "./figurinhas-data.js";

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
  { key: "popcorn", emoji: "🍿", label: "Vai pipocar" },
];

const dupModal = {
  el:    document.getElementById("duplicate-modal"),
  bar:   document.getElementById("dup-modal-bar"),
  close: document.getElementById("dup-modal-close"),
  _timer: null,
};

function showDuplicateModal() {
  dupModal.el.setAttribute("aria-hidden", "false");
  dupModal.el.classList.add("is-visible");
  dupModal.bar.classList.remove("is-running");
  void dupModal.bar.offsetWidth; // força reflow para reiniciar a animação
  dupModal.bar.classList.add("is-running");
  clearTimeout(dupModal._timer);
  dupModal._timer = setTimeout(closeDuplicateModal, 15000);
}

function closeDuplicateModal() {
  clearTimeout(dupModal._timer);
  dupModal.el.classList.remove("is-visible");
  dupModal.el.setAttribute("aria-hidden", "true");
  dupModal.bar.classList.remove("is-running");
}

dupModal.close?.addEventListener("click", closeDuplicateModal);
dupModal.el?.addEventListener("click", (e) => {
  if (e.target === dupModal.el) closeDuplicateModal();
});

const els = {
  form: document.getElementById("form-palpite"),
  lista: document.getElementById("lista-palpites"),
  empty: document.getElementById("empty-state"),
  emptyTitle: document.querySelector("#empty-state .empty-state__title"),
  emptyHint: document.querySelector("#empty-state .empty-state__hint"),
  tabs: document.querySelectorAll(".bets-tab"),
  countAberto: document.getElementById("count-aberto"),
  countEncerrado: document.getElementById("count-encerrado"),
  countExatos: document.getElementById("count-exatos"),
  toast: document.getElementById("toast"),
  statTotal: document.getElementById("stat-total"),
  btnSort: document.getElementById("btn-sort"),
  buscaNome: document.getElementById("busca-nome"),
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
  rankingClassic: document.getElementById("ranking-classic"),
  rankingTable: document.getElementById("ranking-table"),
  rankingModeToggle: document.getElementById("ranking-mode-toggle"),
  pacotinhoSection: document.getElementById("pacotinho-section"),
  filtroJogo: document.getElementById("filtro-jogo"),
  setorRankingTable: document.getElementById("setor-ranking-table"),
  setorRankingEmpty: document.getElementById("setor-ranking-empty"),
};

const RANKING_MODE_KEY = "bolao-ranking-mode";
let sortNewestFirst = true;
let activeTab = "aberto";
let activeJogo = "";
let activeSearch = "";
let palpites = [];
let resultadosMap = new Map();
let lastLeaderKey = null;
let rankingMode =
  localStorage.getItem(RANKING_MODE_KEY) === "classic" ? "classic" : "table";
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
  showToast._t = setTimeout(() => els.toast.classList.remove("is-visible"), 5000);
}

function populateJogoFilter() {
  if (!els.filtroJogo) return;
  const current = els.filtroJogo.value;
  const jogosNoPalpite = new Set(palpites.map((p) => p.jogo).filter(Boolean));
  const ordered = JOGOS_OPCOES.filter((j) => jogosNoPalpite.has(j));
  jogosNoPalpite.forEach((j) => { if (!ordered.includes(j)) ordered.push(j); });

  els.filtroJogo.innerHTML = '<option value="">Todos os jogos</option>';
  ordered.forEach((j) => {
    const opt = document.createElement("option");
    opt.value = j;
    opt.textContent = j;
    els.filtroJogo.appendChild(opt);
  });
  els.filtroJogo.value = ordered.includes(current) ? current : "";
  activeJogo = els.filtroJogo.value;
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

const RANK_TIERS = ["gold", "silver", "bronze"];

function iniciaisNome(nome) {
  return (nome || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function renderClassicRanking(ranking) {
  els.rankingList.querySelectorAll(".ranking-item").forEach((el) => el.remove());

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
}

function renderTableRanking(ranking) {
  els.rankingTable.innerHTML = "";

  const head = document.createElement("div");
  head.className = "league-row league-row--head";
  head.innerHTML = `
    <span class="league-cell league-cell--pos">#</span>
    <span class="league-cell league-cell--player">Palpiteiro</span>
    <span class="league-cell league-cell--pts">Pts</span>
    <span class="league-cell league-cell--num" title="Placares exatos">E</span>
    <span class="league-cell league-cell--num" title="Acertos">A</span>
    <span class="league-cell league-cell--num" title="Palpites">P</span>
  `;
  els.rankingTable.appendChild(head);

  ranking.forEach((row, i) => {
    const posicao = i + 1;
    const tier = RANK_TIERS[i] || "";
    const figura = findFigureByName(row.nome);

    const item = document.createElement("button");
    item.type = "button";
    item.className = "league-row" + (tier ? ` league-row--${tier}` : "");
    item.setAttribute("aria-label", `Ver figurinha de ${row.nome}`);

    const iconHtml = figura
      ? `<img class="league-figure" src="${figureThumbPath(figura.file)}" alt="" loading="lazy" decoding="async">`
      : `<span class="league-figure league-figure--empty">${escapeHtml(iniciaisNome(row.nome))}</span>`;

    item.innerHTML = `
      <span class="league-cell league-cell--pos">${posicao}</span>
      <span class="league-cell league-cell--player">
        ${iconHtml}
        <span class="league-name">${escapeHtml(row.nome)}</span>
      </span>
      <span class="league-cell league-cell--pts">${row.pontos}</span>
      <span class="league-cell league-cell--num">${row.exatos}</span>
      <span class="league-cell league-cell--num">${row.acertos}</span>
      <span class="league-cell league-cell--num">${row.palpites}</span>
    `;

    item.addEventListener("click", () => openPlayerCard(row, posicao));
    item.addEventListener("mouseenter", () =>
      showRankingPreview(row, tier, item)
    );
    item.addEventListener("mouseleave", hideRankingPreview);
    els.rankingTable.appendChild(item);
  });
}

let rankingPreviewEl = null;

function ensureRankingPreview() {
  if (rankingPreviewEl) return rankingPreviewEl;
  rankingPreviewEl = document.createElement("div");
  rankingPreviewEl.className = "rank-preview";
  rankingPreviewEl.setAttribute("aria-hidden", "true");
  document.body.appendChild(rankingPreviewEl);
  return rankingPreviewEl;
}

function isHoverDesktop() {
  return (
    window.matchMedia("(min-width: 992px)").matches &&
    window.matchMedia("(hover: hover)").matches
  );
}

function positionRankingPreview(anchorEl) {
  const tip = rankingPreviewEl;
  if (!tip) return;
  const rect = anchorEl.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();

  let left = window.scrollX + rect.left - tipRect.width - 12;
  if (rect.left - tipRect.width - 12 < 8) {
    left = window.scrollX + rect.right + 12;
  }

  let top = window.scrollY + rect.top + rect.height / 2 - tipRect.height / 2;
  const minTop = window.scrollY + 8;
  const maxTop = window.scrollY + window.innerHeight - tipRect.height - 8;
  top = Math.max(minTop, Math.min(maxTop, top));

  tip.style.top = `${top}px`;
  tip.style.left = `${left}px`;
}

function showRankingPreview(row, tier, anchorEl) {
  if (!isHoverDesktop()) return;
  const tip = ensureRankingPreview();
  const figura = findFigureByName(row.nome);
  const setor = figura?.setor || row.setor || "";

  tip.className = `rank-preview rank-preview--${tier || "default"}`;
  const imgHtml = figura
    ? `<img class="rank-preview__img" src="${figureImagePath(figura.file)}" alt="">`
    : `<span class="rank-preview__img rank-preview__img--empty">${escapeHtml(iniciaisNome(row.nome))}</span>`;

  tip.innerHTML = `
    ${imgHtml}
    <div class="rank-preview__info">
      <strong class="rank-preview__name">${escapeHtml(row.nome)}</strong>
      ${setor ? `<span class="rank-preview__sector">${escapeHtml(setor)}</span>` : ""}
      <span class="rank-preview__pts">${row.pontos} pts</span>
    </div>
  `;

  tip.classList.add("is-visible");
  positionRankingPreview(anchorEl);
}

function hideRankingPreview() {
  if (rankingPreviewEl) rankingPreviewEl.classList.remove("is-visible");
}

function applyRankingMode() {
  if (els.rankingModeToggle) {
    els.rankingModeToggle.checked = rankingMode === "table";
  }
}

const SETOR_MEDALS = ["🥇", "🥈", "🥉"];

function renderSetorRanking() {
  if (!els.setorRankingTable) return;
  const ranking = buildSetorRanking(palpites, resultadosMap);

  if (ranking.length === 0) {
    els.setorRankingEmpty.classList.remove("d-none");
    els.setorRankingTable.innerHTML = "";
    return;
  }
  els.setorRankingEmpty.classList.add("d-none");

  const rows = ranking.map((row, i) => {
    const medal = SETOR_MEDALS[i] || `${i + 1}º`;
    const isTop = i < 3;
    const media = row.media.toFixed(1);
    return `
      <div class="setor-row${isTop ? ` setor-row--top${i + 1}` : ""}">
        <span class="setor-row__pos">${medal}</span>
        <span class="setor-row__name">${escapeHtml(row.setor)}</span>
        <span class="setor-row__members">${row.membros} membro${row.membros !== 1 ? "s" : ""}</span>
        <span class="setor-row__stats">${row.exatos}E · ${row.acertos}A</span>
        <span class="setor-row__pts" title="${row.pontos} pts total">${media} pts/mb</span>
      </div>`;
  }).join("");

  els.setorRankingTable.innerHTML = rows;
}

function renderRanking() {
  const ranking = buildRanking(palpites, resultadosMap);
  const isTable = rankingMode === "table";

  if (ranking.length === 0) {
    els.rankingEmpty.classList.remove("d-none");
    els.rankingClassic.classList.add("d-none");
    els.rankingTable.classList.add("d-none");
    els.rankingPodium.classList.add("d-none");
    els.rankingPodium.innerHTML = "";
    els.rankingList.querySelectorAll(".ranking-item").forEach((el) => el.remove());
    els.rankingTable.innerHTML = "";
    hideRankingPreview();
    lastLeaderKey = null;
    return;
  }

  els.rankingEmpty.classList.add("d-none");
  els.rankingClassic.classList.toggle("d-none", isTable);
  els.rankingTable.classList.toggle("d-none", !isTable);

  if (isTable) {
    renderTableRanking(ranking);
  } else {
    renderClassicRanking(ranking);
  }

  const leaderKey = (ranking[0].nome || "").trim().toLowerCase();
  if (leaderKey && leaderKey !== lastLeaderKey) {
    lastLeaderKey = leaderKey;
    fireConfetti();
  }

  renderSetorRanking();
}

function renderCard(p, index, isDuplicate = false) {
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

  const duplicateBadge = isDuplicate
    ? '<span class="bet-badge bet-badge--duplicate" title="Palpite duplicado — só o primeiro por jogo conta no ranking">⚠ Duplicado</span>'
    : "";

  const duplicateNotice = isDuplicate
    ? `<p class="bet-card__duplicate-notice">Este palpite não foi considerado no ranking — <strong>${escapeHtml(p.nome)}</strong> já havia registrado um palpite para este jogo anteriormente.</p>`
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
        ${duplicateBadge}
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
    ${duplicateNotice}
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
  } else if (tab === "exatos") {
    els.emptyTitle.textContent = "Nenhum placar exato ainda";
    els.emptyHint.textContent = "Quando alguém acertar o placar exato, aparece aqui.";
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

  populateJogoFilter();

  const abertos = sorted.filter((p) => !isEncerrado(p));
  const encerrados = sorted.filter((p) => isEncerrado(p));
  const exatos = sorted.filter((p) => avaliarPalpite(p, resultadosMap).status === "exact");
  els.countAberto.textContent = String(abertos.length);
  els.countEncerrado.textContent = String(encerrados.length);
  els.countExatos.textContent = String(exatos.length);

  let atual;
  if (activeSearch) {
    const term = activeSearch.toLowerCase();
    atual = sorted.filter((p) => (p.nome || "").toLowerCase().includes(term));
  } else if (activeJogo) {
    atual = sorted.filter((p) => p.jogo === activeJogo);
  } else {
    atual = activeTab === "exatos" ? exatos : activeTab === "encerrado" ? encerrados : abertos;
  }

  els.lista.querySelectorAll(".bet-card").forEach((c) => c.remove());

  if (atual.length === 0) {
    setEmptyState(activeTab);
    els.empty.classList.remove("d-none");
  } else {
    els.empty.classList.add("d-none");
    const duplicateIds = buildDuplicateSet(palpites);
    atual.forEach((p, i) => els.lista.appendChild(renderCard(p, i, duplicateIds.has(p.id))));
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
      fillJogoSelect(els.jogo, undefined, { defaultToLast: true });
      parseJogoSelect();
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

  const nomeNorm = els.nome.value.trim().toLowerCase();
  const jogoVal = els.jogo.value;
  const jaRegistrou = palpites.some(
    (p) => (p.nome || "").trim().toLowerCase() === nomeNorm && (p.jogo || "") === jogoVal
  );
  if (jaRegistrou) {
    showDuplicateModal();
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

els.rankingModeToggle?.addEventListener("change", () => {
  rankingMode = els.rankingModeToggle.checked ? "table" : "classic";
  localStorage.setItem(RANKING_MODE_KEY, rankingMode);
  hideRankingPreview();
  renderRanking();
});

els.filtroJogo?.addEventListener("change", () => {
  activeJogo = els.filtroJogo.value;
  renderList();
});

els.buscaNome?.addEventListener("input", () => {
  activeSearch = els.buscaNome.value.trim();
  renderList();
});

window.addEventListener("scroll", hideRankingPreview, { passive: true });
window.addEventListener("resize", hideRankingPreview);

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
applyRankingMode();
bindScoreSync();
updatePreview();
subscribeJogos();
subscribeConfig();
subscribePalpites();
subscribeResultados();
