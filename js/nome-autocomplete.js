import { USUARIOS } from "./usuarios.js";

const MAX_SUGESTOES = 8;

function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Liga um autocomplete de nomes (origem: USUARIOS) a um input.
 * @param {object} cfg
 * @param {HTMLInputElement} cfg.input  Campo de texto do nome
 * @param {HTMLElement} cfg.list        Elemento <ul> que recebe as sugestões
 * @param {(usuario: {nome: string, setor: string}) => void} [cfg.onSelect]
 * @param {number} [cfg.minChars=2]
 */
export function initNomeAutocomplete({ input, list, onSelect, minChars = 2 }) {
  if (!input || !list) return;

  let matches = [];
  let activeIndex = -1;

  function close() {
    list.classList.add("d-none");
    list.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    matches = [];
    activeIndex = -1;
  }

  function highlight() {
    list.querySelectorAll(".autocomplete__item").forEach((el, i) => {
      const active = i === activeIndex;
      el.classList.toggle("is-active", active);
      el.setAttribute("aria-selected", active ? "true" : "false");
      if (active) el.scrollIntoView({ block: "nearest" });
    });
  }

  function select(index) {
    const usuario = matches[index];
    if (!usuario) return;
    input.value = usuario.nome;
    if (typeof onSelect === "function") onSelect(usuario);
    close();
  }

  function open(termo) {
    const alvo = normalizar(termo);
    matches = USUARIOS.filter((u) => normalizar(u.nome).includes(alvo)).slice(
      0,
      MAX_SUGESTOES
    );

    if (matches.length === 0) {
      close();
      return;
    }

    list.innerHTML = matches
      .map((u, i) => {
        const setor =
          u.setor && u.setor !== "Sem setor"
            ? `<span class="autocomplete__setor">${u.setor}</span>`
            : "";
        return `<li class="autocomplete__item" role="option" id="nome-sugestao-${i}" data-index="${i}" aria-selected="false">
          <span class="autocomplete__name">${u.nome}</span>
          ${setor}
        </li>`;
      })
      .join("");

    list.classList.remove("d-none");
    input.setAttribute("aria-expanded", "true");
    activeIndex = -1;

    list.querySelectorAll(".autocomplete__item").forEach((el) => {
      el.addEventListener("mousedown", (event) => {
        event.preventDefault();
        select(Number(el.dataset.index));
      });
    });
  }

  input.addEventListener("input", () => {
    const termo = input.value.trim();
    if (termo.length < minChars) {
      close();
      return;
    }
    open(termo);
  });

  input.addEventListener("keydown", (event) => {
    if (list.classList.contains("d-none")) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = Math.min(matches.length - 1, activeIndex + 1);
      highlight();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = Math.max(0, activeIndex - 1);
      highlight();
    } else if (event.key === "Enter") {
      if (activeIndex >= 0) {
        event.preventDefault();
        select(activeIndex);
      }
    } else if (event.key === "Escape") {
      close();
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(close, 120);
  });
}
