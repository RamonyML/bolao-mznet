/**
 * Bandeiras via Twemoji — mesmo visual de emoji em mobile e desktop (Windows).
 * Mapa de nomes (PT/EN) → código ISO para seleções e países da Copa.
 */

function normalizeKey(name) {
  return (name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** @type {Record<string, string>} */
const ALIASES = {
  afeganistao: "af", afghanistan: "af",
  "africa do sul": "za", "south africa": "za",
  albania: "al",
  alemanha: "de", germany: "de", "alemanha ocidental": "de",
  andorra: "ad",
  angola: "ao",
  "antigua e barbuda": "ag",
  "arabia saudita": "sa", "saudi arabia": "sa", arabia: "sa",
  argelia: "dz", algeria: "dz",
  argentina: "ar",
  armenia: "am",
  australia: "au",
  austria: "at",
  azerbaijao: "az", azerbaijan: "az",
  bahamas: "bs",
  bahrein: "bh", bahrain: "bh",
  bangladesh: "bd",
  barbados: "bb",
  belgica: "be", belgium: "be",
  belize: "bz",
  benin: "bj",
  bielorrussia: "by", belarus: "by",
  bolivia: "bo",
  "bosnia e herzegovina": "ba", "bosnia-herzegovina": "ba",
  botsuana: "bw", botswana: "bw",
  brasil: "br", brazil: "br",
  brunei: "bn",
  bulgaria: "bg",
  "burkina faso": "bf",
  burundi: "bi",
  butao: "bt", bhutan: "bt",
  "cabo verde": "cv", "cape verde": "cv",
  camaroes: "cm", cameroon: "cm",
  camboja: "kh", cambodia: "kh",
  canada: "ca",
  catar: "qa", qatar: "qa",
  cazaquistao: "kz", kazakhstan: "kz",
  chade: "td", chad: "td",
  chile: "cl",
  china: "cn",
  chipre: "cy", cyprus: "cy",
  colombia: "co",
  comores: "km", comoros: "km",
  congo: "cg",
  "coreia do norte": "kp", "north korea": "kp",
  "coreia do sul": "kr", "south korea": "kr", coreia: "kr",
  "costa do marfim": "ci", "ivory coast": "ci", "cote d ivoire": "ci",
  "costa rica": "cr",
  croacia: "hr", croatia: "hr",
  cuba: "cu",
  dinamarca: "dk", denmark: "dk",
  djibuti: "dj", djibouti: "dj",
  dominica: "dm",
  egito: "eg", egypt: "eg",
  "el salvador": "sv",
  "emirados arabes unidos": "ae", "united arab emirates": "ae", emirados: "ae",
  equador: "ec", ecuador: "ec",
  eritreia: "er", eritrea: "er",
  eslovaquia: "sk", slovakia: "sk",
  eslovenia: "si", slovenia: "si",
  espanha: "es", spain: "es",
  "estados unidos": "us", eua: "us", usa: "us", "united states": "us",
  estonia: "ee",
  eswatini: "sz", suazilandia: "sz",
  etiopia: "et", ethiopia: "et",
  fiji: "fj",
  filipinas: "ph", philippines: "ph",
  finlandia: "fi", finland: "fi",
  franca: "fr", france: "fr",
  gabao: "ga", gabon: "ga",
  gambia: "gm",
  gana: "gh", ghana: "gh",
  georgia: "ge",
  granada: "gd", grenada: "gd",
  grecia: "gr", greece: "gr",
  guatemala: "gt",
  guiana: "gy", guyana: "gy",
  guine: "gn", guinea: "gn",
  "guine equatorial": "gq", "guine-bissau": "gw", "guine bissau": "gw",
  haiti: "ht",
  honduras: "hn",
  hungria: "hu", hungary: "hu",
  iemen: "ye", yemen: "ye",
  india: "in",
  indonesia: "id",
  inglaterra: "gb-eng", england: "gb-eng", "reino unido": "gb", "united kingdom": "gb", uk: "gb",
  ira: "ir", iran: "ir",
  iraque: "iq", iraq: "iq",
  irlanda: "ie", ireland: "ie",
  "irlanda do norte": "gb",
  islandia: "is", iceland: "is",
  israel: "il",
  italia: "it", italy: "it",
  jamaica: "jm",
  japao: "jp", japan: "jp",
  jordania: "jo", jordan: "jo",
  kuwait: "kw",
  laos: "la",
  lesoto: "ls", lesotho: "ls",
  letonia: "lv", latvia: "lv",
  libano: "lb", lebanon: "lb",
  liberia: "lr",
  libia: "ly", libya: "ly",
  liechtenstein: "li",
  lituania: "lt", lithuania: "lt",
  luxemburgo: "lu", luxembourg: "lu",
  "macedonia do norte": "mk", "north macedonia": "mk",
  madagascar: "mg",
  malasia: "my", malaysia: "my",
  malawi: "mw",
  maldivas: "mv", maldives: "mv",
  mali: "ml",
  malta: "mt",
  marrocos: "ma", morocco: "ma",
  mauritania: "mr",
  mauricio: "mu", mauritius: "mu",
  mexico: "mx",
  mianmar: "mm", myanmar: "mm", birmania: "mm",
  moldavia: "md", moldova: "md",
  monaco: "mc",
  mongolia: "mn",
  montenegro: "me",
  mozambique: "mz",
  namibia: "na",
  nepal: "np",
  nicaragua: "ni",
  niger: "ne",
  nigeria: "ng",
  noruega: "no", norway: "no",
  "nova zelandia": "nz", "new zealand": "nz",
  oma: "om", oman: "om",
  "paises baixos": "nl", holanda: "nl", netherlands: "nl",
  palau: "pw",
  palestina: "ps", palestine: "ps",
  panama: "pa",
  "papua-nova guine": "pg", "papua new guinea": "pg",
  paquistao: "pk", pakistan: "pk",
  paraguai: "py", paraguay: "py",
  peru: "pe",
  polonia: "pl", poland: "pl",
  portugal: "pt",
  quenia: "ke", kenya: "ke",
  quirguistao: "kg", kyrgyzstan: "kg",
  "republica centro-africana": "cf", "central african republic": "cf",
  "republica checa": "cz", "czech republic": "cz", tchequia: "cz",
  "republica democratica do congo": "cd", "dr congo": "cd",
  "republica dominicana": "do", "dominican republic": "do",
  romenia: "ro", romania: "ro",
  ruanda: "rw", rwanda: "rw",
  russia: "ru",
  "san marino": "sm",
  "santa lucia": "lc", "saint lucia": "lc",
  senegal: "sn",
  "serra leoa": "sl", "sierra leone": "sl",
  servia: "rs", serbia: "rs",
  seychelles: "sc",
  singapura: "sg", singapore: "sg",
  siria: "sy", syria: "sy",
  somalia: "so",
  "sri lanka": "lk",
  sudao: "sd", sudan: "sd",
  "sudao do sul": "ss", "south sudan": "ss",
  suecia: "se", sweden: "se",
  suica: "ch", switzerland: "ch",
  suriname: "sr",
  tailandia: "th", thailand: "th",
  taiwan: "tw",
  tajiquistao: "tj", tajikistan: "tj",
  tanzania: "tz",
  "timor-leste": "tl", "timor leste": "tl",
  togo: "tg",
  tonga: "to",
  "trinidad e tobago": "tt", "trinidad and tobago": "tt",
  tunisia: "tn",
  turcomenistao: "tm", turkmenistan: "tm",
  turquia: "tr", turkey: "tr",
  ucrania: "ua", ukraine: "ua",
  uganda: "ug",
  uruguai: "uy", uruguay: "uy",
  uzbequistao: "uz", uzbekistan: "uz",
  vanuatu: "vu",
  vaticano: "va",
  venezuela: "ve",
  vietna: "vn", vietnam: "vn",
  zambia: "zm",
  zimbabue: "zw", zimbabwe: "zw",
  gales: "gb-wls", wales: "gb-wls",
  escocia: "gb-sct", scotland: "gb-sct",
  curacao: "cw",
};

const SUBDIVISION_FLAGS = {
  "gb-eng": {
    emoji: "🏴",
    twemoji: "1f3f4-e0067-e0062-e0065-e006e-e0067-e007f",
  },
  "gb-sct": {
    emoji: "🏴",
    twemoji: "1f3f4-e0067-e0062-e0073-e0063-e0074-e007f",
  },
  "gb-wls": {
    emoji: "🏴",
    twemoji: "1f3f4-e0067-e0062-e0077-e006c-e0073-e007f",
  },
};

export function getTeamIso(teamName) {
  const key = normalizeKey(teamName);
  if (!key) return "un";

  if (ALIASES[key]) return ALIASES[key];

  const words = key.split(" ");
  for (const word of words) {
    if (word.length >= 3 && ALIASES[word]) return ALIASES[word];
  }

  for (const [alias, iso] of Object.entries(ALIASES)) {
    if (key.includes(alias) || alias.includes(key)) return iso;
  }

  return "un";
}

export function isoToFlagEmoji(iso2) {
  const code = (iso2 || "un").toLowerCase();
  if (SUBDIVISION_FLAGS[code]) return SUBDIVISION_FLAGS[code].emoji;

  const iso = code.toUpperCase();
  if (iso.length !== 2) return "🏳️";
  return String.fromCodePoint(
    0x1f1e6 + iso.charCodeAt(0) - 65,
    0x1f1e6 + iso.charCodeAt(1) - 65
  );
}

export function isoToTwemojiUrl(iso2) {
  const iso = (iso2 || "un").toLowerCase();
  if (SUBDIVISION_FLAGS[iso]) {
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${SUBDIVISION_FLAGS[iso].twemoji}.svg`;
  }

  if (iso.length !== 2) {
    return "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f3f3.svg";
  }
  const hex = [...iso.toUpperCase()].map(
    (c) => (0x1f1e6 + c.charCodeAt(0) - 65).toString(16)
  );
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${hex.join("-")}.svg`;
}

/**
 * @param {string} teamName
 * @param {"sm" | "md" | "lg"} [size]
 */
export function renderFlagHtml(teamName, size = "md") {
  const iso = getTeamIso(teamName);
  const emoji = isoToFlagEmoji(iso);
  const url = isoToTwemojiUrl(iso);
  const px = size === "lg" ? 32 : size === "sm" ? 18 : 24;
  const safeName = String(teamName || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");

  return `<img class="team-flag-img team-flag-img--${size}" src="${url}" alt="${emoji} ${safeName}" width="${px}" height="${px}" loading="lazy" decoding="async">`;
}

/** @param {HTMLElement | null} el */
export function setFlagInElement(el, teamName, size = "lg") {
  if (!el) return;
  el.innerHTML = renderFlagHtml(teamName, size);
}

export function getFlagEmoji(teamName) {
  return isoToFlagEmoji(getTeamIso(teamName));
}
