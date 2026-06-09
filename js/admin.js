import { db, auth } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  avaliarPalpite,
  buildRanking,
  medalForRank,
  resultadosToMap,
  jogoDocId,
} from "./bolao-scoring.js";
import {
  fillJogoSelect,
  setJogosCustomizados,
  getJogosAtuais,
} from "./jogos-select.js";
import { fillSetorSelect } from "./setores.js";

const COLLECTION = "palpites";
const COLLECTION_RESULTADOS = "resultados";
const COLLECTION_CONFIG = "config";
const FEATURES_DOC = "features";
const JOGOS_DOC = "jogos";
const FEATURE_KEYS = ["figurinhaSurpresa", "reactions", "confetti"];

const els = {
  loginScreen: document.getElementById("login-screen"),
  adminPanel: document.getElementById("admin-panel"),
  formLogin: document.getElementById("form-login"),
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  loginError: document.getElementById("login-error"),
  btnLogin: document.getElementById("btn-login"),
  btnLogout: document.getElementById("btn-logout"),
  adminEmail: document.getElementById("admin-email"),
  adminCount: document.getElementById("admin-count"),
  adminSearch: document.getElementById("admin-search"),
  adminLoading: document.getElementById("admin-loading"),
  adminEmpty: document.getElementById("admin-empty"),
  adminTableWrap: document.getElementById("admin-table-wrap"),
  adminTbody: document.getElementById("admin-tbody"),
  formEdit: document.getElementById("form-edit"),
  editId: document.getElementById("edit-id"),
  editNome: document.getElementById("edit-nome"),
  editSetor: document.getElementById("edit-setor"),
  editJogo: document.getElementById("edit-jogo"),
  editTimeHome: document.getElementById("edit-time-home"),
  editTimeAway: document.getElementById("edit-time-away"),
  editGolsHome: document.getElementById("edit-gols-home"),
  editGolsAway: document.getElementById("edit-gols-away"),
  btnSaveEdit: document.getElementById("btn-save-edit"),
  formResultado: document.getElementById("form-resultado"),
  resultadoJogo: document.getElementById("resultado-jogo"),
  resultadoGolsHome: document.getElementById("resultado-gols-home"),
  resultadoGolsAway: document.getElementById("resultado-gols-away"),
  btnSaveResultado: document.getElementById("btn-save-resultado"),
  btnCancelResultado: document.getElementById("btn-cancel-resultado"),
  resultadoEditDocId: document.getElementById("resultado-edit-doc-id"),
  resultadosSalvos: document.getElementById("resultados-salvos"),
  adminRanking: document.getElementById("admin-ranking"),
  toast: document.getElementById("toast"),
  formEditResultado: document.getElementById("form-edit-resultado"),
  editResultadoDocId: document.getElementById("edit-resultado-doc-id"),
  editResultadoJogoLabel: document.getElementById("edit-resultado-jogo-label"),
  editResultadoGolsHome: document.getElementById("edit-resultado-gols-home"),
  editResultadoGolsAway: document.getElementById("edit-resultado-gols-away"),
  btnSaveEditResultado: document.getElementById("btn-save-edit-resultado"),
  btnFeatures: document.getElementById("btn-features"),
  featureSwitches: document.querySelectorAll(".feature-switch"),
  btnClearReactions: document.getElementById("btn-clear-reactions"),
  formJogo: document.getElementById("form-jogo"),
  jogoTimeHome: document.getElementById("jogo-time-home"),
  jogoTimeAway: document.getElementById("jogo-time-away"),
  jogoDetalhe: document.getElementById("jogo-detalhe"),
  btnAddJogo: document.getElementById("btn-add-jogo"),
  jogosList: document.getElementById("jogos-list"),
};

const modalEdit = new bootstrap.Modal(document.getElementById("modal-edit"));
const modalEditResultado = new bootstrap.Modal(
  document.getElementById("modal-edit-resultado")
);
const modalFeatures = new bootstrap.Modal(document.getElementById("modal-features"));

let palpites = [];
let resultados = [];
let resultadosMap = new Map();
let jogosCustomizados = [];
let unsubscribeList = null;
let unsubscribeResultados = null;
let unsubscribeConfig = null;
let unsubscribeJogos = null;
let searchTerm = "";

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("is-visible"), 3200);
}

function showLoginError(message) {
  if (!message) {
    els.loginError.classList.add("d-none");
    els.loginError.textContent = "";
    return;
  }
  els.loginError.textContent = message;
  els.loginError.classList.remove("d-none");
}

function authErrorMessage(code) {
  const map = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-disabled": "Usuário desativado.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco.",
  };
  return map[code] || "Não foi possível entrar. Tente novamente.";
}

function toIsoDate(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.toDate) return value.toDate().toISOString();
  return new Date(value).toISOString();
}

function formatDate(iso) {
  if (!iso) return "—";
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
  div.textContent = str ?? "";
  return div.innerHTML;
}

function setView(loggedIn) {
  els.loginScreen.classList.toggle("d-none", loggedIn);
  els.adminPanel.classList.toggle("d-none", !loggedIn);
}

function filteredPalpites() {
  const q = searchTerm.trim().toLowerCase();
  if (!q) return palpites;
  return palpites.filter(
    (p) =>
      (p.nome || "").toLowerCase().includes(q) ||
      (p.setor || "").toLowerCase().includes(q) ||
      (p.jogo || "").toLowerCase().includes(q) ||
      (p.timeHome || "").toLowerCase().includes(q) ||
      (p.timeAway || "").toLowerCase().includes(q)
  );
}

function resetResultadoForm() {
  els.resultadoEditDocId.value = "";
  els.resultadoJogo.disabled = false;
  els.btnSaveResultado.textContent = "Salvar resultado";
  els.btnCancelResultado.classList.add("d-none");
  els.resultadoGolsHome.value = "0";
  els.resultadoGolsAway.value = "0";
  if (els.resultadoJogo.options.length) els.resultadoJogo.selectedIndex = 0;
}

function loadResultadoIntoForm(r) {
  els.resultadoEditDocId.value = r.id;
  els.resultadoJogo.value = r.jogo;
  els.resultadoJogo.disabled = true;
  els.resultadoGolsHome.value = Number(r.golsHome);
  els.resultadoGolsAway.value = Number(r.golsAway);
  els.btnSaveResultado.textContent = "Atualizar resultado";
  els.btnCancelResultado.classList.remove("d-none");
}

function openEditResultadoModal(r) {
  els.editResultadoDocId.value = r.id;
  els.editResultadoJogoLabel.textContent = r.jogo || "";
  els.editResultadoGolsHome.value = Number(r.golsHome);
  els.editResultadoGolsAway.value = Number(r.golsAway);
  modalEditResultado.show();
}

function renderResultadosChips() {
  els.resultadosSalvos.innerHTML = "";
  if (resultados.length === 0) {
    els.resultadosSalvos.innerHTML =
      '<span class="text-muted small">Nenhum resultado definido ainda.</span>';
    return;
  }

  resultados.forEach((r) => {
    const item = document.createElement("div");
    item.className = "resultado-item";
    item.innerHTML = `
      <div class="resultado-item__info">
        <span class="resultado-item__jogo">${escapeHtml(r.jogo)}</span>
        <span class="resultado-item__placar">Oficial: ${Number(r.golsHome)} : ${Number(r.golsAway)}</span>
      </div>
      <div class="admin-actions">
        <button type="button" class="btn btn-outline-primary rounded-pill btn-edit-resultado">Editar</button>
        <button type="button" class="btn btn-outline-danger rounded-pill btn-delete-resultado">Apagar</button>
      </div>
    `;
    item.querySelector(".btn-edit-resultado").addEventListener("click", () =>
      openEditResultadoModal(r)
    );
    item.querySelector(".btn-delete-resultado").addEventListener("click", () =>
      confirmDeleteResultado(r)
    );
    els.resultadosSalvos.appendChild(item);
  });
}

function renderAdminRanking() {
  const ranking = buildRanking(palpites, resultadosMap);
  els.adminRanking.innerHTML = "";

  if (ranking.length === 0) {
    els.adminRanking.innerHTML =
      '<p class="text-muted small text-center py-2 mb-0">Defina resultados para ver o ranking.</p>';
    return;
  }

  ranking.forEach((row, i) => {
    const item = document.createElement("div");
    item.className = "ranking-item" + (i === 0 ? " ranking-item--leader" : "");
    item.innerHTML = `
      <span class="ranking-item__pos">${medalForRank(i)}</span>
      <div class="ranking-item__body">
        <span class="ranking-item__name">${escapeHtml(row.nome)}</span>
        <span class="ranking-item__stats text-muted small">${row.pontos} pts · ${row.exatos} exatos</span>
      </div>
    `;
    els.adminRanking.appendChild(item);
  });
}

function renderTable() {
  const list = filteredPalpites();
  els.adminCount.textContent = String(palpites.length);
  els.adminTbody.innerHTML = "";
  els.adminLoading.classList.add("d-none");

  renderResultadosChips();
  renderAdminRanking();

  if (list.length === 0) {
    els.adminTableWrap.classList.add("d-none");
    els.adminEmpty.classList.remove("d-none");
    return;
  }

  els.adminEmpty.classList.add("d-none");
  els.adminTableWrap.classList.remove("d-none");

  list.forEach((p) => {
    const createdAt = toIsoDate(p.createdAt);
    const av = avaliarPalpite(p, resultadosMap);
    let rowClass = "";
    let statusCell = '<span class="text-muted small">Aguardando</span>';

    if (av.status === "exact") {
      rowClass = "admin-row--exact";
      statusCell = '<span class="admin-status admin-status--exact">Placar exato</span>';
    } else if (av.status === "result") {
      rowClass = "admin-row--hit";
      statusCell = '<span class="admin-status admin-status--hit">Acertou resultado</span>';
    } else if (av.status === "miss") {
      statusCell = '<span class="admin-status admin-status--miss">Não pontuou</span>';
    }

    if (av.registeredAfterResult) {
      statusCell +=
        ' <span class="admin-status admin-status--late" title="Registrado depois do resultado oficial">⚠ Após o resultado</span>';
    }

    const tr = document.createElement("tr");
    if (rowClass) tr.className = rowClass;
    tr.innerHTML = `
      <td data-label="Nome">${escapeHtml(p.nome)}</td>
      <td data-label="Setor">${escapeHtml(p.setor || "—")}</td>
      <td data-label="Jogo">${escapeHtml(p.jogo)}</td>
      <td data-label="Placar" class="text-center placar-cell">${Number(p.golsHome)} : ${Number(p.golsAway)}</td>
      <td data-label="Status">${statusCell}</td>
      <td data-label="Data" class="text-muted small">${formatDate(createdAt)}</td>
      <td data-label="Ações">
        <div class="admin-actions">
          <button type="button" class="btn btn-outline-primary rounded-pill btn-edit" data-id="${p.id}">Editar</button>
          <button type="button" class="btn btn-outline-danger rounded-pill btn-delete" data-id="${p.id}">Apagar</button>
        </div>
      </td>
    `;
    els.adminTbody.appendChild(tr);
  });

  els.adminTbody.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => openEdit(btn.dataset.id));
  });
  els.adminTbody.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => confirmDelete(btn.dataset.id));
  });
}

function subscribePalpites() {
  if (unsubscribeList) unsubscribeList();
  els.adminLoading.classList.remove("d-none");

  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  unsubscribeList = onSnapshot(
    q,
    (snapshot) => {
      palpites = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderTable();
    },
    (error) => {
      console.error(error);
      els.adminLoading.classList.add("d-none");
      showToast("Erro ao carregar palpites.");
    }
  );
}

function subscribeResultados() {
  if (unsubscribeResultados) unsubscribeResultados();

  unsubscribeResultados = onSnapshot(
    collection(db, COLLECTION_RESULTADOS),
    (snapshot) => {
      resultados = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      resultadosMap = resultadosToMap(resultados);
      renderTable();
    },
    (error) => console.error(error)
  );
}

function stopSubscriptions() {
  if (unsubscribeList) {
    unsubscribeList();
    unsubscribeList = null;
  }
  if (unsubscribeResultados) {
    unsubscribeResultados();
    unsubscribeResultados = null;
  }
  if (unsubscribeConfig) {
    unsubscribeConfig();
    unsubscribeConfig = null;
  }
  if (unsubscribeJogos) {
    unsubscribeJogos();
    unsubscribeJogos = null;
  }
  palpites = [];
  resultados = [];
  resultadosMap = new Map();
}

function openEdit(id) {
  const p = palpites.find((x) => x.id === id);
  if (!p) return;

  fillJogoSelect(els.editJogo);
  fillSetorSelect(els.editSetor);
  els.editId.value = id;
  els.editNome.value = p.nome || "";
  els.editSetor.value = p.setor || "";
  els.editJogo.value = p.jogo || "";
  els.editTimeHome.value = p.timeHome || "";
  els.editTimeAway.value = p.timeAway || "";
  els.editGolsHome.value = Number(p.golsHome) || 0;
  els.editGolsAway.value = Number(p.golsAway) || 0;
  modalEdit.show();
}

async function saveEdit(e) {
  e.preventDefault();
  const id = els.editId.value;
  if (!id) return;

  els.btnSaveEdit.disabled = true;
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      nome: els.editNome.value.trim(),
      setor: els.editSetor.value,
      jogo: els.editJogo.value,
      timeHome: els.editTimeHome.value.trim(),
      timeAway: els.editTimeAway.value.trim(),
      golsHome: Math.max(0, Math.min(20, parseInt(els.editGolsHome.value, 10) || 0)),
      golsAway: Math.max(0, Math.min(20, parseInt(els.editGolsAway.value, 10) || 0)),
    });
    modalEdit.hide();
    showToast("Palpite atualizado.");
  } catch (error) {
    console.error(error);
    showToast("Sem permissão para editar.");
  } finally {
    els.btnSaveEdit.disabled = false;
  }
}

async function saveResultado(e) {
  e.preventDefault();
  const jogo = els.resultadoJogo.value;
  if (!jogo) return;

  const golsHome = Math.max(0, Math.min(20, parseInt(els.resultadoGolsHome.value, 10) || 0));
  const golsAway = Math.max(0, Math.min(20, parseInt(els.resultadoGolsAway.value, 10) || 0));
  const editDocId = els.resultadoEditDocId.value;

  els.btnSaveResultado.disabled = true;
  try {
    if (editDocId) {
      await updateDoc(doc(db, COLLECTION_RESULTADOS, editDocId), {
        jogo,
        golsHome,
        golsAway,
        updatedAt: serverTimestamp(),
      });
      showToast("Resultado atualizado!");
    } else {
      const ref = doc(db, COLLECTION_RESULTADOS, jogoDocId(jogo));
      const existing = resultados.find((r) => r.id === ref.id);
      await setDoc(ref, {
        jogo,
        golsHome,
        golsAway,
        createdAt: existing?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast("Resultado oficial salvo!");
    }
    resetResultadoForm();
  } catch (error) {
    console.error(error);
    showToast("Erro ao salvar resultado.");
  } finally {
    els.btnSaveResultado.disabled = false;
  }
}

async function saveEditResultado(e) {
  e.preventDefault();
  const docId = els.editResultadoDocId.value;
  if (!docId) return;

  const r = resultados.find((x) => x.id === docId);
  if (!r) return;

  els.btnSaveEditResultado.disabled = true;
  try {
    await updateDoc(doc(db, COLLECTION_RESULTADOS, docId), {
      jogo: r.jogo,
      golsHome: Math.max(
        0,
        Math.min(20, parseInt(els.editResultadoGolsHome.value, 10) || 0)
      ),
      golsAway: Math.max(
        0,
        Math.min(20, parseInt(els.editResultadoGolsAway.value, 10) || 0)
      ),
      updatedAt: serverTimestamp(),
    });
    modalEditResultado.hide();
    showToast("Resultado atualizado!");
  } catch (error) {
    console.error(error);
    showToast("Erro ao atualizar resultado.");
  } finally {
    els.btnSaveEditResultado.disabled = false;
  }
}

async function confirmDeleteResultado(r) {
  const label = r.jogo || "este jogo";
  if (
    !confirm(
      `Apagar o resultado oficial de "${label}" (${Number(r.golsHome)}:${Number(r.golsAway)})? Os palpites voltam ao status "aguardando" para este jogo.`
    )
  ) {
    return;
  }

  try {
    await deleteDoc(doc(db, COLLECTION_RESULTADOS, r.id));
    if (els.resultadoEditDocId.value === r.id) resetResultadoForm();
    showToast("Resultado apagado.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível apagar o resultado.");
  }
}

async function confirmDelete(id) {
  const p = palpites.find((x) => x.id === id);
  const nome = p?.nome || "este palpite";
  if (!confirm(`Apagar o palpite de "${nome}"? Esta ação não pode ser desfeita.`)) return;

  try {
    await deleteDoc(doc(db, COLLECTION, id));
    showToast("Palpite apagado.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível apagar.");
  }
}

function subscribeConfig() {
  if (unsubscribeConfig) unsubscribeConfig();
  unsubscribeConfig = onSnapshot(
    doc(db, COLLECTION_CONFIG, FEATURES_DOC),
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : {};
      els.featureSwitches.forEach((sw) => {
        const key = sw.dataset.feature;
        sw.checked = data[key] !== false;
      });
    },
    (error) => console.error(error)
  );
}

async function saveFeatureFlag(key, enabled, control) {
  if (!FEATURE_KEYS.includes(key)) return;
  control.disabled = true;
  try {
    await setDoc(
      doc(db, COLLECTION_CONFIG, FEATURES_DOC),
      { [key]: enabled, updatedAt: serverTimestamp() },
      { merge: true }
    );
    showToast(enabled ? "Funcionalidade ativada." : "Funcionalidade desativada.");
  } catch (error) {
    console.error(error);
    showToast("Erro ao salvar configuração.");
    control.checked = !enabled;
  } finally {
    control.disabled = false;
  }
}

function refillJogoSelects() {
  fillJogoSelect(els.resultadoJogo);
  fillJogoSelect(els.editJogo);
}

function renderJogosList() {
  els.jogosList.innerHTML = "";
  if (jogosCustomizados.length === 0) {
    els.jogosList.innerHTML =
      '<span class="jogos-empty small">Nenhum novo jogo criado ainda. Os jogos fixos da fase de grupos já estão disponíveis na area de palpites</span>';
    return;
  }

  jogosCustomizados.forEach((jogo) => {
    const item = document.createElement("div");
    item.className = "resultado-item";
    item.innerHTML = `
      <div class="resultado-item__info">
        <span class="resultado-item__jogo">${escapeHtml(jogo)}</span>
        <span class="resultado-item__placar">Criado pelo admin</span>
      </div>
      <div class="admin-actions">
        <button type="button" class="btn btn-outline-danger rounded-pill btn-delete-jogo">Remover</button>
      </div>
    `;
    item
      .querySelector(".btn-delete-jogo")
      .addEventListener("click", () => removeJogo(jogo));
    els.jogosList.appendChild(item);
  });
}

function subscribeJogos() {
  if (unsubscribeJogos) unsubscribeJogos();
  unsubscribeJogos = onSnapshot(
    doc(db, COLLECTION_CONFIG, JOGOS_DOC),
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : {};
      jogosCustomizados = Array.isArray(data.lista)
        ? data.lista.filter(Boolean)
        : [];
      setJogosCustomizados(jogosCustomizados);
      refillJogoSelects();
      renderJogosList();
    },
    (error) => console.error(error)
  );
}

async function addJogo(e) {
  e.preventDefault();
  const timeHome = els.jogoTimeHome.value.trim();
  const timeAway = els.jogoTimeAway.value.trim();
  const detalhe = els.jogoDetalhe.value.trim();
  if (!timeHome || !timeAway) return;

  const jogo = detalhe
    ? `${timeHome} x ${timeAway} — ${detalhe}`
    : `${timeHome} x ${timeAway}`;

  if (getJogosAtuais().includes(jogo)) {
    showToast("Esse jogo já existe na lista.");
    return;
  }

  els.btnAddJogo.disabled = true;
  try {
    await setDoc(
      doc(db, COLLECTION_CONFIG, JOGOS_DOC),
      { lista: arrayUnion(jogo), updatedAt: serverTimestamp() },
      { merge: true }
    );
    els.formJogo.reset();
    showToast("Jogo adicionado!");
  } catch (error) {
    console.error(error);
    showToast("Erro ao adicionar o jogo.");
  } finally {
    els.btnAddJogo.disabled = false;
  }
}

async function removeJogo(jogo) {
  if (!confirm(`Remover o jogo "${jogo}" do select? Os palpites já registrados continuam salvos.`)) {
    return;
  }
  try {
    await updateDoc(doc(db, COLLECTION_CONFIG, JOGOS_DOC), {
      lista: arrayRemove(jogo),
      updatedAt: serverTimestamp(),
    });
    showToast("Jogo removido.");
  } catch (error) {
    console.error(error);
    showToast("Erro ao remover o jogo.");
  }
}

async function clearAllReactions() {
  if (palpites.length === 0) {
    showToast("Não há palpites para limpar.");
    return;
  }
  if (
    !confirm(
      "Zerar as reações de TODOS os palpites? Esta ação não pode ser desfeita."
    )
  ) {
    return;
  }

  els.btnClearReactions.disabled = true;
  try {
    const zeradas = { fire: 0, laugh: 0, clap: 0, chicken: 0, popcorn: 0 };
    const batch = writeBatch(db);
    palpites.forEach((p) => {
      batch.update(doc(db, COLLECTION, p.id), { reactions: zeradas });
    });
    await batch.commit();
    showToast("Reações zeradas.");
  } catch (error) {
    console.error(error);
    showToast("Erro ao limpar reações.");
  } finally {
    els.btnClearReactions.disabled = false;
  }
}

els.btnFeatures.addEventListener("click", () => modalFeatures.show());
els.btnClearReactions.addEventListener("click", clearAllReactions);
els.featureSwitches.forEach((sw) => {
  sw.addEventListener("change", () =>
    saveFeatureFlag(sw.dataset.feature, sw.checked, sw)
  );
});

els.formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  showLoginError("");
  els.btnLogin.disabled = true;
  try {
    await signInWithEmailAndPassword(
      auth,
      els.loginEmail.value.trim(),
      els.loginPassword.value
    );
  } catch (error) {
    showLoginError(authErrorMessage(error.code));
  } finally {
    els.btnLogin.disabled = false;
  }
});

els.btnLogout.addEventListener("click", async () => {
  try {
    await signOut(auth);
    showToast("Você saiu da área admin.");
  } catch (error) {
    console.error(error);
  }
});

els.adminSearch.addEventListener("input", () => {
  searchTerm = els.adminSearch.value;
  renderTable();
});

els.formEdit.addEventListener("submit", saveEdit);
els.formResultado.addEventListener("submit", saveResultado);
els.formEditResultado.addEventListener("submit", saveEditResultado);
els.formJogo.addEventListener("submit", addJogo);
els.btnCancelResultado.addEventListener("click", resetResultadoForm);

fillJogoSelect(els.resultadoJogo);
fillJogoSelect(els.editJogo);
fillSetorSelect(els.editSetor);

onAuthStateChanged(auth, (user) => {
  if (user) {
    setView(true);
    els.adminEmail.textContent = user.email || "";
    subscribePalpites();
    subscribeResultados();
    subscribeConfig();
    subscribeJogos();
  } else {
    setView(false);
    stopSubscriptions();
    els.loginPassword.value = "";
  }
});
