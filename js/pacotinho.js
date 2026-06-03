import { FIGURINHAS, figureImagePath } from "./figurinhas-data.js";

function pickRandomFigure(currentFile) {
  if (FIGURINHAS.length <= 1) return FIGURINHAS[0];

  let next = FIGURINHAS[Math.floor(Math.random() * FIGURINHAS.length)];
  while (next.file === currentFile) {
    next = FIGURINHAS[Math.floor(Math.random() * FIGURINHAS.length)];
  }
  return next;
}

function firePackConfetti() {
  if (typeof window.confetti !== "function") return;
  window.confetti({
    particleCount: 45,
    spread: 58,
    startVelocity: 30,
    origin: { y: 0.55 },
    colors: ["#ffdf00", "#166635", "#002776"],
  });
}

export function initPacotinho() {
  const btn = document.getElementById("btn-open-pack");
  const pack = document.getElementById("sticker-pack");
  const result = document.getElementById("pack-result");
  const image = document.getElementById("pack-image");
  const name = document.getElementById("pack-name");
  const sector = document.getElementById("pack-sector");

  if (!btn || !pack || !result || !image || !name || !sector) return;

  let currentFile = "";

  btn.addEventListener("click", () => {
    const figure = pickRandomFigure(currentFile);
    currentFile = figure.file;

    btn.disabled = true;
    pack.classList.add("is-opening");
    result.classList.remove("is-visible");

    window.setTimeout(() => {
      image.src = figureImagePath(figure.file);
      image.alt = `Figurinha de ${figure.nome}`;
      name.textContent = figure.nome;
      sector.textContent = figure.setor || "Sem setor";

      result.classList.add("is-visible");
      pack.classList.remove("is-opening");
      btn.disabled = false;
      btn.textContent = "Abrir outro pacotinho";
      firePackConfetti();
    }, 680);
  });
}
