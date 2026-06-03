import { JOGOS_OPCOES } from "./bolao-scoring.js";

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

  JOGOS_OPCOES.forEach((jogo) => {
    const opt = document.createElement("option");
    opt.value = jogo;
    opt.textContent = jogo;
    if (jogo === current) opt.selected = true;
    selectEl.appendChild(opt);
  });
}
