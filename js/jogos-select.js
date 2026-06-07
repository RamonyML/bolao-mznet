import { JOGOS_OPCOES } from "./bolao-scoring.js";

/** Jogos extras criados pelo admin (carregados do Firestore). */
let jogosCustomizados = [];

/** Lista combinada: jogos fixos do código + jogos criados pelo admin (sem duplicar). */
export function getJogosAtuais() {
  const extras = jogosCustomizados.filter(
    (jogo) => jogo && !JOGOS_OPCOES.includes(jogo)
  );
  return [...JOGOS_OPCOES, ...extras];
}

/** Atualiza a lista de jogos personalizados vinda do Firestore. */
export function setJogosCustomizados(lista = []) {
  jogosCustomizados = Array.isArray(lista) ? lista.filter(Boolean) : [];
}

export function fillJogoSelect(selectEl, placeholder = "Selecione o jogo") {
  if (!selectEl) return;
  const current = selectEl.value;
  selectEl.innerHTML = "";

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.disabled = true;
  opt0.selected = !current;
  opt0.textContent = placeholder;
  selectEl.appendChild(opt0);

  getJogosAtuais().forEach((jogo) => {
    const opt = document.createElement("option");
    opt.value = jogo;
    opt.textContent = jogo;
    if (jogo === current) opt.selected = true;
    selectEl.appendChild(opt);
  });
}
