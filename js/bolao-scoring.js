/** Pontuação e comparação de palpites com resultados oficiais */

export const PONTOS_PLACAR_EXATO = 5;
export const PONTOS_RESULTADO = 2;

export const JOGOS_OPCOES = [
  "Brasil x Egito — Amistoso",
  "Brasil x Marrocos — 13/06 — Fase de grupos",
  "Brasil x Haiti — 19/06 — Fase de grupos",
  "Escócia x Brasil — 24/06 — Fase de grupos",
  "Oitavas de final",
  "Quartas de final",
  "Semifinal",
  "Final",
];

export function jogoDocId(jogo) {
  return String(jogo).replace(/\//g, "_");
}

export function getOutcome(golsHome, golsAway) {
  const h = Number(golsHome);
  const a = Number(golsAway);
  if (h > a) return "home";
  if (a > h) return "away";
  return "draw";
}

/** Converte Timestamp do Firestore / ISO / Date / número em milissegundos. */
export function toMillis(value) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return null;
}

/** Momento em que o resultado oficial foi publicado (1ª publicação). */
function resultadoPublishedMillis(oficial) {
  const created = toMillis(oficial.createdAt);
  return created != null ? created : toMillis(oficial.updatedAt);
}

/**
 * @param {object} palpite
 * @param {Map<string, {golsHome, golsAway}>} resultadosMap
 */
export function avaliarPalpite(palpite, resultadosMap) {
  const oficial = resultadosMap.get(palpite.jogo);
  if (!oficial) {
    return { status: "pending", points: 0, label: null, registeredAfterResult: false };
  }

  const pH = Number(palpite.golsHome);
  const pA = Number(palpite.golsAway);
  const oH = Number(oficial.golsHome);
  const oA = Number(oficial.golsAway);

  const publishedMs = resultadoPublishedMillis(oficial);
  const palpiteMs = toMillis(palpite.createdAt);
  const registeredAfterResult =
    publishedMs != null && palpiteMs != null && palpiteMs > publishedMs;

  const oficialResumo = { golsHome: oH, golsAway: oA };

  if (pH === oH && pA === oA) {
    return {
      status: "exact",
      points: PONTOS_PLACAR_EXATO,
      label: "Placar exato!",
      oficial: oficialResumo,
      registeredAfterResult,
    };
  }

  if (getOutcome(pH, pA) === getOutcome(oH, oA)) {
    return {
      status: "result",
      points: PONTOS_RESULTADO,
      label: "Acertou o resultado",
      oficial: oficialResumo,
      registeredAfterResult,
    };
  }

  return {
    status: "miss",
    points: 0,
    label: null,
    oficial: oficialResumo,
    registeredAfterResult,
  };
}

export function resultadosToMap(docs) {
  const map = new Map();
  docs.forEach((d) => {
    if (d.jogo) map.set(d.jogo, d);
  });
  return map;
}

/**
 * Returns the earliest palpite per (normalizedNome + jogo) pair.
 * Used to enforce the "1 palpite per person per game" rule.
 */
function getEarliestPerPersonGame(palpites) {
  const earliest = new Map();
  palpites.forEach((p) => {
    const key = `${(p.nome || "").trim().toLowerCase()}||${p.jogo || ""}`;
    const ms = toMillis(p.createdAt);
    const prev = earliest.get(key);
    if (!prev || (ms != null && (prev.ms == null || ms < prev.ms))) {
      earliest.set(key, { palpite: p, ms });
    }
  });
  return earliest;
}

/**
 * Returns a Set of palpite IDs that are duplicates — i.e. not the earliest
 * bet registered for their (nome + jogo) combination.
 */
export function buildDuplicateSet(palpites) {
  const earliest = getEarliestPerPersonGame(palpites);
  const firstIds = new Set([...earliest.values()].map((v) => v.palpite.id));
  const duplicates = new Set();
  palpites.forEach((p) => {
    if (p.id && !firstIds.has(p.id)) duplicates.add(p.id);
  });
  return duplicates;
}

/**
 * Ranking por nome (soma de pontos de todos os palpites com resultado definido).
 * Palpites registrados depois do resultado oficial são ignorados (anti-trapaça).
 * Apenas o primeiro palpite por pessoa/jogo é contabilizado.
 */
export function buildRanking(palpites, resultadosMap) {
  const earliest = getEarliestPerPersonGame(palpites);
  const deduped = [...earliest.values()].map((v) => v.palpite);

  const byNome = new Map();

  deduped.forEach((p) => {
    const av = avaliarPalpite(p, resultadosMap);
    if (av.status === "pending") return;
    if (av.registeredAfterResult) return;

    const key = (p.nome || "").trim().toLowerCase();
    const display = (p.nome || "").trim();
    if (!key) return;

    if (!byNome.has(key)) {
      byNome.set(key, {
        nome: display,
        pontos: 0,
        exatos: 0,
        acertos: 0,
        palpites: 0,
        primeiroRegistroMs: Infinity,
      });
    }

    const row = byNome.get(key);
    row.palpites += 1;
    row.pontos += av.points;
    if (av.status === "exact") row.exatos += 1;
    if (av.status === "exact" || av.status === "result") row.acertos += 1;

    const ms = toMillis(p.createdAt);
    if (ms != null && ms < row.primeiroRegistroMs) row.primeiroRegistroMs = ms;
  });

  return [...byNome.values()].sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.exatos !== a.exatos) return b.exatos - a.exatos;
    if (a.primeiroRegistroMs !== b.primeiroRegistroMs) {
      return a.primeiroRegistroMs - b.primeiroRegistroMs;
    }
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

export function medalForRank(index) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}º`;
}
