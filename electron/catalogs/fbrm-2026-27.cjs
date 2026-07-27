const fs = require("node:fs");
const path = require("node:path");

const FBRM_CATALOG_VERSION = "2026-27.5";
const FBRM_COMPETITION_SEASON_ID = "competition-season-fbrm-1dm-2026-27";
const FBRM_CALENDAR_URL =
  "https://www.fbrm.org/resultados-club-624/asoc-club-jairis";
const VERIFIED_AT = "2026-07-27";

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function provisionalLogo(label, primaryColor, secondaryColor) {
  const safeLabel = escapeXml(label);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${primaryColor}"/>
          <stop offset="1" stop-color="${secondaryColor}"/>
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="54" fill="url(#g)"/>
      <circle cx="120" cy="120" r="88" fill="none" stroke="white" stroke-width="7" opacity=".92"/>
      <path d="M54 120h132M120 54c35 28 35 104 0 132M120 54c-35 28-35 104 0 132"
        fill="none" stroke="white" stroke-width="5" opacity=".34"/>
      <text x="120" y="136" text-anchor="middle" fill="white"
        font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="800"
        letter-spacing="2">${safeLabel}</text>
      <text x="120" y="203" text-anchor="middle" fill="white"
        font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700"
        letter-spacing="2" opacity=".78">FBRM 26/27</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function bundledLogo(fileName, fallback) {
  if (!fileName) return fallback;
  const filePath = path.join(__dirname, "assets", fileName);
  try {
    const extension = path.extname(fileName).slice(1).toLowerCase();
    const mime = extension === "jpg" || extension === "jpeg"
      ? "image/jpeg"
      : "image/png";
    return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
  } catch {
    return fallback;
  }
}

const DEMO_PLAYER_BLUEPRINTS = [
  { number: "4", position: "Base", secondaryPosition: "Escolta", height: "178" },
  { number: "5", position: "Base", secondaryPosition: "Escolta", height: "183" },
  { number: "6", position: "Escolta", secondaryPosition: "Base", height: "186" },
  { number: "7", position: "Escolta", secondaryPosition: "Alero", height: "190" },
  { number: "8", position: "Alero", secondaryPosition: "Escolta", height: "193" },
  { number: "9", position: "Alero", secondaryPosition: "Ala-pívot", height: "196" },
  { number: "10", position: "Alero", secondaryPosition: "Escolta", height: "191" },
  { number: "11", position: "Ala-pívot", secondaryPosition: "Alero", height: "198" },
  { number: "12", position: "Ala-pívot", secondaryPosition: "Pívot", height: "201" },
  { number: "13", position: "Pívot", secondaryPosition: "Ala-pívot", height: "204" },
  { number: "14", position: "Pívot", secondaryPosition: "Ala-pívot", height: "207" },
  { number: "15", position: "Ala-pívot", secondaryPosition: "Pívot", height: "200" }
];

const DEMO_FIRST_NAMES = [
  "Álex", "Adrián", "Bruno", "Carlos", "Darío", "Diego", "Edu", "Gabriel",
  "Hugo", "Iván", "Javier", "Leo", "Lucas", "Marcos", "Mario", "Pablo",
  "Raúl", "Rubén", "Samuel", "Sergio", "Víctor", "Yago", "Álvaro", "Nicolás"
];

const DEMO_LAST_NAMES = [
  "Alarcón", "Belmonte", "Cánovas", "Carrillo", "Celdrán", "Conesa",
  "Egea", "Fernández", "Gálvez", "García", "Gil", "Guillén", "Hernández",
  "López", "Marín", "Martínez", "Molina", "Moreno", "Navarro", "Ortega",
  "Pérez", "Riquelme", "Sánchez", "Soler", "Torres", "Vidal"
];

function deterministicIndex(seed, size) {
  return [...String(seed)].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) % size,
    7
  );
}

function demoPlayerName(teamKey, index) {
  const firstIndex = (deterministicIndex(teamKey, DEMO_FIRST_NAMES.length) + index * 5)
    % DEMO_FIRST_NAMES.length;
  const lastIndex = (deterministicIndex(`${teamKey}-apellido`, DEMO_LAST_NAMES.length) + index * 7)
    % DEMO_LAST_NAMES.length;
  const secondLastIndex = (lastIndex + 9 + index * 3) % DEMO_LAST_NAMES.length;
  return `${DEMO_FIRST_NAMES[firstIndex]} ${DEMO_LAST_NAMES[lastIndex]} ${DEMO_LAST_NAMES[secondLastIndex]}`;
}

function demoPlayers(teamKey) {
  return DEMO_PLAYER_BLUEPRINTS.map((player, index) => ({
    id: `player-demo-fbrm-2026-27-${teamKey}-${player.number}`,
    externalId: `DEMO-FBRM-2026-27-${teamKey.toUpperCase()}-${player.number}`,
    number: player.number,
    name: demoPlayerName(teamKey, index),
    position: player.position,
    secondaryPosition: player.secondaryPosition,
    height: player.height,
    nationality: "Sin definir",
    status: "Demo",
    source: "demo-generated",
    isDemo: true,
    dataStatus: "demo",
    verifiedAt: VERIFIED_AT,
    notes:
      "Ficha ficticia para probar etiquetado, estadísticas e informes. Sustituir por la plantilla oficial cuando la publique la FBRM o el club."
  }));
}

const TEAM_DEFINITIONS = [
  {
    key: "villa-fortuna",
    clubId: "661",
    name: "RENESUR VILLA DE FORTUNA",
    shortName: "FOR",
    clubName: "Villa de Fortuna",
    sponsorName: "Renesur",
    city: "Fortuna",
    arena: "Pabellón Deportivo Satur",
    arenaAddress: "C/ José Antonio Camacho, s/n · 30620 Fortuna",
    primaryColor: "#173B67",
    secondaryColor: "#F3B21A",
    website: "",
    founded: "",
    notes: "Campeón de Segunda División Masculina GESA 2025/26 y ascendido para 2026/27."
  },
  {
    key: "cb-cartagena",
    clubId: "631",
    name: "GRUPO CAESA CB CARTAGENA",
    shortName: "CBC",
    clubName: "Club Basket Cartagena",
    sponsorName: "Grupo Caesa",
    city: "Cartagena",
    arena: "Pabellón Los Dolores de Cartagena",
    arenaAddress: "Los Dolores · Cartagena",
    primaryColor: "#0077B8",
    secondaryColor: "#FFFFFF",
    website: "",
    founded: "",
    notes:
      "Denominación oficial del calendario FBRM 2026/27. El club presentó una nueva identidad corporativa en junio de 2026."
  },
  {
    key: "jairis",
    clubId: "624",
    name: "HOZONO GLOBAL JAIRIS",
    shortName: "JAI",
    clubName: "Club Baloncesto Jairis",
    sponsorName: "Hozono Global",
    city: "Alcantarilla",
    arena: "Pabellón Fausto Vicent",
    arenaAddress: "Carretera de Mula, s/n · 30820 Alcantarilla",
    primaryColor: "#F2C300",
    secondaryColor: "#111111",
    website: "https://www.hozonojairis.com/",
    founded: "1954",
    logoAsset: "jairis.png",
    officialLogoUrl:
      "https://www.hozonojairis.com/img/escudos_liga/HOZONO%20GLOBAL%20JAIRIS%20v2.png",
    notes: "Club decano del baloncesto de la Región de Murcia."
  },
  {
    key: "molina",
    clubId: "643",
    name: "GARGIL SUMINISTROS MB",
    shortName: "MOL",
    clubName: "Ciudad Molina Basket",
    sponsorName: "Gargil Suministros",
    city: "Molina de Segura",
    arena: "Pabellón Serrerías",
    arenaAddress: "Avenida Serrerías, s/n · Molina de Segura",
    primaryColor: "#125B9A",
    secondaryColor: "#FFFFFF",
    website: "https://www.molinabasket.es/es",
    founded: "2010",
    logoAsset: "molina.png",
    officialLogoUrl: "https://api.clupik.com/clubs/618/images/splash.png",
    notes: "Equipo sénior regional vinculado a la estructura de Ciudad Molina Basket."
  },
  {
    key: "basket-las-torres",
    clubId: "663",
    name: "JAM ESCAYOLAS - BASKET LAS TORRES",
    shortName: "BLT",
    clubName: "Basket Las Torres",
    sponsorName: "JAM Escayolas",
    city: "Las Torres de Cotillas",
    arena: "Pabellón Mireia Belmonte",
    arenaAddress: "Las Torres de Cotillas",
    primaryColor: "#172B4D",
    secondaryColor: "#F28C28",
    website: "https://adeliocroca.es/",
    founded: "1976",
    logoAsset: "eliocroca.png",
    officialLogoUrl:
      "https://adeliocroca.es/wp-content/uploads/2025/02/encabezado-1-1.png",
    notes:
      "El club presentó en marzo de 2026 una estructura próxima a cien deportistas entre escuela y equipos federados."
  },
  {
    key: "cieza",
    clubId: "629",
    name: "CARWASH BENEDICTO CEB",
    shortName: "CIE",
    clubName: "Cieza Escuela de Baloncesto",
    sponsorName: "Carwash Benedicto",
    city: "Cieza",
    arena: "Pabellón Juan José Angosto",
    arenaAddress: "Avenida Blas de Otero, s/n · Cieza",
    primaryColor: "#F2C500",
    secondaryColor: "#171717",
    website: "https://ciezaeb.es/",
    founded: "1994",
    logoAsset: "cieza.png",
    officialLogoUrl: "https://ciezaeb.es/storage/images/logo.png",
    notes: "Denominación abreviada CEB empleada en el calendario FBRM 2026/27."
  },
  {
    key: "lumbreras",
    clubId: "651",
    name: "MANIBUS C.B. LUMBRERAS",
    shortName: "LUM",
    clubName: "Club Baloncesto Lumbreras",
    sponsorName: "Manibus",
    city: "Puerto Lumbreras",
    arena: "Centro Deportivo Municipal",
    arenaAddress: "Carretera de Almería, s/n · Puerto Lumbreras",
    primaryColor: "#D62828",
    secondaryColor: "#F6C445",
    website: "https://cblumbreras.wixsite.com/cblumbreras",
    founded: "1992",
    notes:
      "Fundado en marzo de 1992. El club identifica su cultura con el lema LUA: Lucha, Unión y Actitud."
  },
  {
    key: "santomera",
    clubId: "652",
    name: "C.B. SANTOMERA",
    shortName: "SAN",
    clubName: "Club Baloncesto Santomera",
    sponsorName: "",
    city: "Santomera",
    arena: "Pabellón Municipal Santomera",
    arenaAddress: "C/ Calvario, s/n · 30140 Santomera",
    primaryColor: "#287A3B",
    secondaryColor: "#F3CF37",
    website: "",
    founded: "",
    notes: ""
  },
  {
    key: "marme",
    clubId: "625",
    name: "MARME SAN JAVIER",
    shortName: "MAR",
    clubName: "A.D. Marme",
    sponsorName: "",
    city: "San Javier",
    arena: "Pabellón Municipal San Javier 'Príncipe Felipe'",
    arenaAddress: "C/ Maestre, s/n · San Javier",
    primaryColor: "#174A7E",
    secondaryColor: "#54A9D8",
    website: "https://www.marme.com/",
    founded: "",
    notes: ""
  },
  {
    key: "estudiantes-cartagena",
    clubId: "644",
    name: "C.B. ESTUDIANTES CARTAGENA",
    shortName: "EST",
    clubName: "Club Baloncesto Estudiantes Cartagena",
    sponsorName: "",
    city: "Cartagena",
    arena: "Palacio de Deportes Cartagena",
    arenaAddress: "Cartagena",
    primaryColor: "#172033",
    secondaryColor: "#E53935",
    website: "https://www.cbestudiantescartagena.com/",
    founded: "",
    logoAsset: "estudiantes-cartagena.png",
    officialLogoUrl:
      "https://www.cbestudiantescartagena.com/wp-content/uploads/go-x/u/d8d47b8f-1d6c-4ba2-9cd2-25ef045c1168/image-455x347.png",
    notes: "La entidad mantiene estructura sénior y de formación en Cartagena."
  },
  {
    key: "el-carmen",
    clubId: "662",
    name: "MESÓN DE MURCIA CB EL CARMEN",
    shortName: "CAR",
    clubName: "Club Baloncesto El Carmen",
    sponsorName: "Mesón de Murcia",
    city: "Murcia",
    arena: "Pabellón Félix Rodríguez de la Fuente",
    arenaAddress: "Murcia",
    primaryColor: "#6D3A8C",
    secondaryColor: "#FFFFFF",
    website: "https://cbelcarmen.wordpress.com/",
    founded: "2012",
    notes: "El club surgió a principios de 2012 en el barrio murciano de El Carmen."
  },
  {
    key: "begastri",
    clubId: "638",
    name: "C.B. 3RS BEGASTRI",
    shortName: "BEG",
    clubName: "Club Baloncesto Begastri",
    sponsorName: "3RS",
    city: "Cehegín",
    arena: "Pabellón Ana Carrasco",
    arenaAddress: "Avenida de los Deportes, s/n · Cehegín",
    primaryColor: "#B51E2E",
    secondaryColor: "#FFFFFF",
    website: "https://cbbegastri.wordpress.com/",
    founded: "",
    logoAsset: "begastri.png",
    officialLogoUrl:
      "https://cbbegastri.wordpress.com/wp-content/uploads/2022/07/cropped-logo_begastri-removebg-preview-1.png",
    notes: ""
  },
  {
    key: "murcia-baloncesto",
    clubId: "724",
    name: "MURCIA BALONCESTO",
    shortName: "MUR",
    clubName: "Club Deportivo Murcia Baloncesto",
    sponsorName: "",
    city: "Murcia",
    arena: "Pabellón Príncipe de Asturias",
    arenaAddress: "Avenida Juan Carlos I · Murcia",
    primaryColor: "#7A1734",
    secondaryColor: "#D8B45A",
    website: "",
    founded: "",
    notes: ""
  },
  {
    key: "eliocroca",
    clubId: "630",
    name: "BALONCESTO ELIOCROCA",
    shortName: "ELI",
    clubName: "A.D. Eliocroca",
    sponsorName: "",
    city: "Lorca",
    arena: "Complejo Deportivo Felipe VI",
    arenaAddress: "Avenida de Europa, s/n · Lorca",
    primaryColor: "#1368A8",
    secondaryColor: "#D94343",
    website: "",
    founded: "",
    notes: "Subcampeón de Segunda División Masculina GESA 2025/26 y ascendido para 2026/27."
  },
  {
    key: "ucam-junior",
    clubId: "626",
    name: "UCAM MURCIA (JUNIOR)",
    shortName: "UCM",
    clubName: "UCAM Murcia Club Baloncesto S.A.D.",
    sponsorName: "UCAM",
    city: "Murcia",
    arena: "Pabellón Narciso Yepes",
    arenaAddress: "Avenida Antoñete Gálvez · Murcia",
    primaryColor: "#B30D2F",
    secondaryColor: "#111111",
    website: "https://www.ucammurcia.com/",
    founded: "1985",
    logoAsset: "ucam-logo.png",
    officialLogoUrl: "https://t.resfu.com/img_data/shields_basket/49.png",
    notes: "Equipo júnior inscrito en la competición sénior regional."
  },
  {
    key: "costera-sur",
    clubId: "645",
    name: "ABM TECHNICAL DENTAL BARCELÓ A.D. COSTERA SUR",
    shortName: "COS",
    clubName: "A.D. Costera Sur",
    sponsorName: "ABM Technical Dental Barceló",
    city: "San José de la Vega",
    arena: "Pabellón Juan Martínez Marín",
    arenaAddress: "Travesía Mayor, 3-6 · San José de la Vega",
    primaryColor: "#6F2C91",
    secondaryColor: "#F4D03F",
    website: "",
    founded: "",
    notes: ""
  }
];

function team(definition) {
  const clubSourceUrl = `https://www.fbrm.org/resultados-club-${definition.clubId}`;
  const fallbackLogo = provisionalLogo(
    definition.shortName,
    definition.primaryColor,
    definition.secondaryColor
  );
  return {
    id: `team-fbrm-1dm-2026-27-${definition.key}`,
    externalId: `FBRM-CLUB-${definition.clubId}-1DM-2026-27`,
    name: definition.name,
    shortName: definition.shortName,
    clubName: definition.clubName,
    sponsorName: definition.sponsorName,
    city: definition.city,
    municipality: definition.city,
    province: "Murcia",
    country: "España",
    arena: definition.arena,
    arenaAddress: definition.arenaAddress,
    category: "Primera División Masculina GESA",
    season: "2026/27",
    primaryColor: definition.primaryColor,
    secondaryColor: definition.secondaryColor,
    logo: bundledLogo(definition.logoAsset, fallbackLogo),
    logoStatus: definition.logoAsset ? "official-bundled" : "provisional",
    officialLogoUrl: definition.officialLogoUrl || "",
    colorStatus: "brand-derived",
    website: definition.website,
    founded: definition.founded,
    source: "official-fbrm-2026-27",
    sourceLabel: "Calendario oficial FBRM 2026/27",
    sourceUrl: FBRM_CALENDAR_URL,
    clubExternalId: definition.clubId,
    clubSourceUrl,
    detailSources: [
      {
        label: "Calendario oficial Primera División Masculina GESA 2026/27",
        url: FBRM_CALENDAR_URL
      },
      {
        label: "Ficha de club FBRM",
        url: clubSourceUrl
      },
      ...(definition.website
        ? [{ label: "Web del club", url: definition.website }]
        : [])
    ],
    dataStatus: "official-team",
    verifiedAt: VERIFIED_AT,
    notes: definition.notes,
    players: demoPlayers(definition.key)
  };
}

const TEAM_ID_BY_KEY = Object.fromEntries(
  TEAM_DEFINITIONS.map((definition) => [
    definition.key,
    `team-fbrm-1dm-2026-27-${definition.key}`
  ])
);

const FIRST_ROUND = [
  ["villa-fortuna", "cb-cartagena", "2026-09-27T20:00:00+02:00", "Pabellón Deportivo Satur"],
  ["jairis", "molina", "2026-09-26T19:00:00+02:00", "Pabellón Fausto Vicent"],
  ["basket-las-torres", "cieza", "2026-09-26T19:00:00+02:00", "Pabellón Mireia Belmonte"],
  ["lumbreras", "santomera", "2026-09-27T20:00:00+02:00", "Centro Deportivo Municipal"],
  ["marme", "estudiantes-cartagena", "2026-09-26T19:00:00+02:00", "Pabellón Municipal San Javier 'Príncipe Felipe'"],
  ["el-carmen", "begastri", "2026-09-27T12:00:00+02:00", "Pabellón Félix Rodríguez de la Fuente"],
  ["murcia-baloncesto", "eliocroca", "2026-09-27T12:00:00+02:00", "Pabellón Príncipe de Asturias"],
  ["ucam-junior", "costera-sur", "2026-09-27T10:00:00+02:00", "Pabellón Narciso Yepes"]
];

function createFbrmCatalog() {
  return {
    version: FBRM_CATALOG_VERSION,
    competitionSeasonId: FBRM_COMPETITION_SEASON_ID,
    source: "official-fbrm-2026-27",
    sourceLabel: "Calendario oficial FBRM 2026/27",
    sourceUrl: FBRM_CALENDAR_URL,
    verifiedAt: VERIFIED_AT,
    teams: TEAM_DEFINITIONS.map(team),
    matches: FIRST_ROUND.map(([homeKey, awayKey, scheduledAt, venue], index) => ({
      id: `match-fbrm-1dm-2026-27-j01-${String(index + 1).padStart(2, "0")}`,
      externalId: `FBRM-1DM-2026-27-J01-${String(index + 1).padStart(2, "0")}`,
      roundName: "Jornada 1",
      scheduledAt,
      venue,
      homeTeamId: TEAM_ID_BY_KEY[homeKey],
      awayTeamId: TEAM_ID_BY_KEY[awayKey],
      homeScore: null,
      awayScore: null,
      status: "scheduled"
    }))
  };
}

module.exports = {
  FBRM_CALENDAR_URL,
  FBRM_CATALOG_VERSION,
  FBRM_COMPETITION_SEASON_ID,
  TEAM_DEFINITIONS,
  createFbrmCatalog
};
