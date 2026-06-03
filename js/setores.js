export const SETORES = [
  "Cadastro",
  "Comercial",
  "Estoque",
  "Financeiro",
  "Instalação",
  "Redes",
  "Suporte",
  "Outro",
];

export function fillSetorSelect(selectEl) {
  if (!selectEl) return;
  const current = selectEl.value;
  selectEl.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = !current;
  placeholder.textContent = "Selecione seu setor";
  selectEl.appendChild(placeholder);

  SETORES.forEach((setor) => {
    const opt = document.createElement("option");
    opt.value = setor;
    opt.textContent = setor;
    if (setor === current) opt.selected = true;
    selectEl.appendChild(opt);
  });
}
