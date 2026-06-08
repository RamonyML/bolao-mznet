const FIGURE_FILES = [
  "00-Dione_Diretor.png",
  "01-Marcelo_Diretor.png",
  "02-Zé-Renato_Diretor.png",
  "04-Hael_Cadastro.png",
  "05-Andressa_Cadastro.png",
  "06-Marcella-Eduarda_Cadastro.png",
  "07-Josilene_Comercial.png",
  "08-Thauanny_Comercial.png",
  "09-Luiz-Henrique_Comercial.png",
  "10-Ana-Luiza_Comercial.png",
  "11-Raiane_Comercial.png",
  "12-Larissa_Comercial.png",
  "13-Aldecilene_Comercial.png",
  "14-Thayane_Comercial.png",
  "15-Carol_Comercial.png",
  "16-Hianca_Comercial.png",
  "17-Bruna-Stefani_Financeiro.png",
  "18-Daniela_Financeiro.png",
  "19-Joicy_Financeiro.png",
  "20-Luiz-Gustavo_Financeiro.png",
  "21-Maria-Eduarda_Financeiro.png",
  "22-Josy_Financeiro.png",
  "23-Vitor-Cosmo_Financeiro.png",
  "24-José-Gabriel_Instalação.png",
  "25-Leandro_Instalação.png",
  "26-Priscila_Instalação.png",
  "27-Maria-Betania_Instalação.png",
  "28-Jorge_Instalação.png",
  "29-Elias_Estoque.png",
  "30-Murilo_Redes.png",
  "31-Felipe_Cadastro.png",
  "32-LIli.png",
  "33-Hiago Alves_Suporte.png",
  "34-Karolayne_Suporte.png",
  "35-Gabriel-Martins_Suporte.png",
  "36-Victor-Hugo_suporte.png",
  "37-Ramony-Lima_Suporte.png",
  "38-Luis_Suporte.png",
  "39-Vagner_Suporte.png",
  "40-Vitor-Manoel_Suporte.png",
  "41-Pedro_Suporte.png",
  "42-Izabela_Suporte.png",
  "43-Eduardo_Suporte.png",
  "44-Bruna-Cristina_Suporte.png",
  "45-Andreza_Suporte.png",
  "46-Renata_Suporte.png",
  "47-Hiorrana_Suporte.png",
  "48-Lauren-Lanes_Suporte.png",
  "49-Ronald_Suporte.png",
  "50-Jhonatan_Suporte.png",
  "51-José-Junior_Suporte.png",
  "52-Halysson_Suporte.png",
  "53-Vitor-Dornelas_Suporte.png",
  "54-Fabio-Alves_Estoque.jpeg",
  "55-Halen_Financeiro.jpeg",
  "56-Maxson.jpeg",
  "56-Vitoria_Financeiro.jpeg",
  "57-Thalyta_Financeiro.jpeg",
];

const GRID_PAGE_SIZE = 8;
const INITIAL_EAGER_COUNT = GRID_PAGE_SIZE;
const PRELOAD_BATCH_SIZE = 4;
const isMobile = () => window.matchMedia("(max-width: 767px)").matches;

const els = {
  count: document.getElementById("album-count"),
  tabs: document.querySelectorAll(".album-tab"),
  gridView: document.getElementById("album-grid-view"),
  singleView: document.getElementById("album-single-view"),
  grid: document.getElementById("album-grid"),
  gridPrev: document.getElementById("grid-prev"),
  gridNext: document.getElementById("grid-next"),
  gridPageLabel: document.getElementById("grid-page-label"),
  singlePrev: document.getElementById("single-prev"),
  singleNext: document.getElementById("single-next"),
  singlePageLabel: document.getElementById("single-page-label"),
  carouselTrack: document.getElementById("album-carousel-track"),
  modal: document.getElementById("album-modal"),
  modalClose: document.getElementById("modal-close"),
  modalDownload: document.getElementById("modal-download"),
  modalImage: document.getElementById("modal-image"),
  modalName: document.getElementById("modal-name"),
  modalSector: document.getElementById("modal-sector"),
  modalPrev: document.getElementById("modal-prev"),
  modalNext: document.getElementById("modal-next"),
};

const figures = FIGURE_FILES.map(parseFigure);
const initialParams = new URLSearchParams(window.location.search);

let currentView = "grid";
let gridPage = 0;
let singleIndex = clampIndex(parseInt(initialParams.get("start") || "0", 10) || 0);
let modalIndex = 0;
let singleDirection = 0;
let preloadStarted = false;
let modalLoadToken = 0;
let modalOpenedAt = 0;
const preloadedFullImages = new Set();

function assetPath(file) {
  return `figures/${encodeURIComponent(file)}`;
}

function thumbPath(file) {
  const webpFile = file.replace(/\.[^.]+$/, ".webp");
  return `figures/thumbs/${encodeURIComponent(webpFile)}`;
}

function titleCase(value) {
  return value
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => {
      const upperWords = ["MZNET"];
      if (upperWords.includes(word.toUpperCase())) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function parseFigure(file, index) {
  const clean = file.replace(/\.[^.]+$/, "").replace(/^\d+-/, "");
  const [rawName, rawSector = ""] = clean.split("_");
  return {
    id: index,
    file,
    src: assetPath(file),
    thumbSrc: thumbPath(file),
    name: titleCase(rawName),
    sector: rawSector ? titleCase(rawSector) : "",
  };
}

function createFigureCard(figure, options = {}) {
  const priorityAttr = options.priority ? ' fetchpriority="high"' : "";
  const displaySrc = options.fullImage ? figure.src : figure.thumbSrc;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "figure-card" + (options.center ? " is-center" : "");
  button.setAttribute("aria-label", `Ver figurinha de ${figure.name}`);
  button.innerHTML = `
    <span class="figure-card__image">
      <img src="${displaySrc}" alt="Figurinha de ${figure.name}" loading="${options.eager ? "eager" : "lazy"}" decoding="async"${priorityAttr}>
    </span>
    <span class="figure-card__caption">
      <span class="figure-card__name">${figure.name}</span>
      ${figure.sector ? `<span class="figure-card__sector">${figure.sector}</span>` : ""}
    </span>
  `;
  button.addEventListener("click", () => openModal(figure.id));
  button.addEventListener("pointerenter", () => preloadFullFigure(figure));
  button.addEventListener("focus", () => preloadFullFigure(figure));
  return button;
}

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = resolve;
    img.decoding = "async";
    img.src = src;
  });
}

async function preloadFiguresInBackground() {
  if (preloadStarted) return;
  preloadStarted = true;

  const remainingThumbs = figures.slice(INITIAL_EAGER_COUNT);
  for (let i = 0; i < remainingThumbs.length; i += PRELOAD_BATCH_SIZE) {
    const batch = remainingThumbs.slice(i, i + PRELOAD_BATCH_SIZE);
    await Promise.all(batch.map((figure) => preloadImage(figure.thumbSrc)));
  }

  for (let i = 0; i < figures.length; i += PRELOAD_BATCH_SIZE) {
    const batch = figures.slice(i, i + PRELOAD_BATCH_SIZE);
    await Promise.all(batch.map((figure) => preloadFullFigure(figure)));
  }
}

function preloadFullFigure(figure) {
  if (preloadedFullImages.has(figure.src)) return Promise.resolve();
  preloadedFullImages.add(figure.src);
  return preloadImage(figure.src);
}

function loadModalImage(figure) {
  const token = ++modalLoadToken;
  const img = els.modalImage;
  img.alt = `Figurinha de ${figure.name}`;
  img.onerror = null;
  img.src = figure.thumbSrc;

  const fullImage = new Image();
  fullImage.onload = () => {
    if (token !== modalLoadToken) return;
    img.src = figure.src;
  };
  fullImage.onerror = () => {
    if (token !== modalLoadToken) return;
    img.src = figure.thumbSrc;
  };
  img.onerror = () => {
    if (token !== modalLoadToken) return;
    img.onerror = null;
    img.src = figure.thumbSrc;
  };
  fullImage.decoding = "async";
  fullImage.src = figure.src;
}

function scheduleFigurePreload() {
  const start = () => preloadFiguresInBackground();
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(start, { timeout: 1800 });
    return;
  }
  window.setTimeout(start, 900);
}

function maxGridPage() {
  return Math.max(0, Math.ceil(figures.length / GRID_PAGE_SIZE) - 1);
}

function renderGrid() {
  const mobile = isMobile();
  const list = mobile
    ? figures
    : figures.slice(gridPage * GRID_PAGE_SIZE, gridPage * GRID_PAGE_SIZE + GRID_PAGE_SIZE);

  els.grid.innerHTML = "";
  list.forEach((figure, index) => {
    els.grid.appendChild(
      createFigureCard(figure, {
        eager: true,
        priority: true,
      })
    );
  });

  const totalPages = maxGridPage() + 1;
  els.gridPageLabel.textContent = `Página ${gridPage + 1} de ${totalPages}`;
  els.gridPrev.disabled = gridPage === 0;
  els.gridNext.disabled = gridPage >= maxGridPage();
}

function clampIndex(index) {
  return Math.max(0, Math.min(figures.length - 1, index));
}

function renderSingle() {
  if (singleDirection !== 0) {
    els.carouselTrack.classList.remove("is-sliding-prev", "is-sliding-next");
    void els.carouselTrack.offsetWidth;
    els.carouselTrack.classList.add(
      singleDirection > 0 ? "is-sliding-next" : "is-sliding-prev"
    );
  }

  els.carouselTrack.innerHTML = "";
  [-1, 0, 1].forEach((offset) => {
    const index = singleIndex + offset;
    if (index < 0 || index >= figures.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "figure-card figure-card--empty";
      placeholder.setAttribute("aria-hidden", "true");
      els.carouselTrack.appendChild(placeholder);
      return;
    }
    els.carouselTrack.appendChild(
      createFigureCard(figures[index], {
        center: offset === 0,
        eager: true,
        fullImage: true,
      })
    );
  });
  els.singlePageLabel.textContent = `${singleIndex + 1} de ${figures.length}`;
  els.singlePrev.disabled = singleIndex === 0;
  els.singleNext.disabled = singleIndex === figures.length - 1;
  singleDirection = 0;
}

function setView(view) {
  currentView = isMobile() ? "grid" : view;
  els.gridView.classList.toggle("d-none", currentView !== "grid");
  els.singleView.classList.toggle("d-none", currentView !== "single");
  els.tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === currentView);
  });
  render();
}

function render() {
  els.count.textContent = `${figures.length} figurinhas`;
  if (currentView === "single" && !isMobile()) {
    renderSingle();
  } else {
    renderGrid();
  }
}

function openModal(index) {
  modalIndex = clampIndex(index);
  const figure = figures[modalIndex];
  loadModalImage(figure);
  els.modalName.textContent = figure.name;
  els.modalSector.textContent = figure.sector;
  els.modal.classList.add("is-open");
  els.modal.setAttribute("aria-hidden", "false");
  modalOpenedAt = Date.now();
  els.modalPrev.disabled = modalIndex === 0;
  els.modalNext.disabled = modalIndex === figures.length - 1;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  els.modal.classList.remove("is-open");
  els.modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function moveModal(direction) {
  openModal(modalIndex + direction);
}

function downloadFileName(figure) {
  const ext = (figure.file.match(/\.[^.]+$/) || [".png"])[0];
  const base = [figure.name, figure.sector]
    .filter(Boolean)
    .join(" - ")
    .replace(/\s+/g, "-");
  return `${base || "figurinha"}${ext}`;
}

async function downloadCurrentFigure() {
  const figure = figures[modalIndex];
  if (!figure) return;
  const fileName = downloadFileName(figure);
  els.modalDownload.disabled = true;
  try {
    const response = await fetch(figure.src);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    const link = document.createElement("a");
    link.href = figure.src;
    link.download = fileName;
    link.target = "_blank";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    els.modalDownload.disabled = false;
  }
}

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

els.gridPrev.addEventListener("click", () => {
  gridPage = Math.max(0, gridPage - 1);
  renderGrid();
});

els.gridNext.addEventListener("click", () => {
  gridPage = Math.min(maxGridPage(), gridPage + 1);
  renderGrid();
});

els.singlePrev.addEventListener("click", () => {
  if (singleIndex === 0) return;
  singleDirection = -1;
  singleIndex = clampIndex(singleIndex - 1);
  renderSingle();
});

els.singleNext.addEventListener("click", () => {
  if (singleIndex === figures.length - 1) return;
  singleDirection = 1;
  singleIndex = clampIndex(singleIndex + 1);
  renderSingle();
});

els.modalClose.addEventListener("click", closeModal);
els.modalDownload.addEventListener("click", downloadCurrentFigure);
els.modalPrev.addEventListener("click", () => moveModal(-1));
els.modalNext.addEventListener("click", () => moveModal(1));
els.modal.addEventListener("click", (event) => {
  if (event.target !== els.modal) return;
  if (Date.now() - modalOpenedAt < 400) return;
  closeModal();
});

document.addEventListener("keydown", (event) => {
  if (!els.modal.classList.contains("is-open")) return;
  if (event.key === "Escape") closeModal();
  if (event.key === "ArrowLeft") moveModal(-1);
  if (event.key === "ArrowRight") moveModal(1);
});

window.addEventListener("resize", () => {
  if (isMobile() && currentView !== "grid") currentView = "grid";
  render();
});

setView(initialParams.get("view") === "single" ? "single" : "grid");
scheduleFigurePreload();
