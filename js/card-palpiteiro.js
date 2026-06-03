import { figureImagePath, findFigureByName } from "./figurinhas-data.js";

const els = {};
let ready = false;
let currentNome = "";

function cache() {
  els.modal = document.getElementById("card-modal");
  els.close = document.getElementById("card-close");
  els.card = document.getElementById("player-card");
  els.figureWrap = document.getElementById("card-figure-wrap");
  els.figure = document.getElementById("card-figure");
  els.fallback = document.getElementById("card-fallback");
  els.rank = document.getElementById("card-rank");
  els.name = document.getElementById("card-name");
  els.sector = document.getElementById("card-sector");
  els.pts = document.getElementById("card-pts");
  els.exatos = document.getElementById("card-exatos");
  els.acertos = document.getElementById("card-acertos");
  els.palpites = document.getElementById("card-palpites");
  els.share = document.getElementById("card-share");
  return els.modal && els.card && els.share;
}

function iniciais(nome) {
  return (nome || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function close() {
  els.modal.classList.remove("is-open");
  els.modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

export function openPlayerCard(row, posicao) {
  if (!ready) return;

  currentNome = row.nome || "";
  const figura = findFigureByName(currentNome);

  if (figura) {
    els.figure.src = figureImagePath(figura.file);
    els.figure.alt = `Figurinha de ${currentNome}`;
    els.figureWrap.classList.remove("is-empty");
  } else {
    els.figure.removeAttribute("src");
    els.fallback.textContent = iniciais(currentNome);
    els.figureWrap.classList.add("is-empty");
  }

  const medalha = posicao === 1 ? "🥇" : posicao === 2 ? "🥈" : posicao === 3 ? "🥉" : "";
  els.rank.textContent = `${medalha} ${posicao}º lugar`.trim();
  els.name.textContent = currentNome;
  els.sector.textContent = figura?.setor || row.setor || "";
  els.sector.style.display = els.sector.textContent ? "" : "none";
  els.pts.textContent = row.pontos;
  els.exatos.textContent = row.exatos;
  els.acertos.textContent = row.acertos;
  els.palpites.textContent = row.palpites;

  els.modal.classList.add("is-open");
  els.modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

async function compartilhar() {
  if (typeof window.html2canvas !== "function") {
    window.alert("Não foi possível gerar a imagem agora. Tente novamente.");
    return;
  }

  els.share.disabled = true;
  const textoOriginal = els.share.textContent;
  els.share.textContent = "Gerando...";

  try {
    const canvas = await window.html2canvas(els.card, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
    });

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) throw new Error("blob nulo");

    const nomeArquivo = `figurinha-${currentNome.replace(/\s+/g, "-").toLowerCase() || "palpiteiro"}.png`;
    const file = new File([blob], nomeArquivo, { type: "image/png" });

    const shareData = {
      files: [file],
      title: "Bolão MZNET 2026",
      text: `Confira a figurinha de ${currentNome} no Bolão MZNET!`,
    };

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share(shareData);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivo;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error(error);
      window.alert("Não foi possível compartilhar a figurinha.");
    }
  } finally {
    els.share.disabled = false;
    els.share.textContent = textoOriginal;
  }
}

export function initPlayerCard() {
  ready = cache();
  if (!ready) return;

  els.close.addEventListener("click", close);
  els.modal.addEventListener("click", (event) => {
    if (event.target === els.modal) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.modal.classList.contains("is-open")) close();
  });
  els.share.addEventListener("click", compartilhar);
}
