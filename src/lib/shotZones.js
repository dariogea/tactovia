import { eventMetric } from "./basketball.js";
export const shotZones = [
  {
    id: "restricted",
    name: "Zona restringida",
    shortName: "Aro",
    points: 2,
    path: "M205 48 Q250 116 295 48 L295 126 L205 126 Z",
    labelX: 250,
    labelY: 91,
  },
  {
    id: "paint",
    name: "Pintura",
    shortName: "Pintura",
    points: 2,
    path: "M170 10 H205 V126 H295 V10 H330 V235 H170 Z",
    labelX: 250,
    labelY: 177,
  },
  {
    id: "mid-left",
    name: "Media distancia izquierda",
    shortName: "Media izq.",
    points: 2,
    path: "M35 95 Q49 184 136 262 L170 235 V10 H35 Z",
    labelX: 108,
    labelY: 154,
  },
  {
    id: "mid-right",
    name: "Media distancia derecha",
    shortName: "Media der.",
    points: 2,
    path: "M330 10 V235 L364 262 Q451 184 465 95 V10 Z",
    labelX: 392,
    labelY: 154,
  },
  {
    id: "mid-center",
    name: "Media distancia frontal",
    shortName: "Media centro",
    points: 2,
    path: "M170 235 H330 L364 262 Q250 318 136 262 Z",
    labelX: 250,
    labelY: 270,
  },
  {
    id: "corner-left",
    name: "Triple esquina izquierda",
    shortName: "Izq.",
    points: 3,
    path: "M10 10 H35 V95 H10 Z",
    labelX: 22,
    labelY: 58,
  },
  {
    id: "corner-right",
    name: "Triple esquina derecha",
    shortName: "Der.",
    points: 3,
    path: "M465 10 H490 V95 H465 Z",
    labelX: 478,
    labelY: 58,
  },
  {
    id: "wing-left",
    name: "Triple lateral izquierdo",
    shortName: "Ala izq.",
    points: 3,
    path: "M10 95 H35 Q49 184 136 262 L91 460 H10 Z",
    labelX: 62,
    labelY: 304,
  },
  {
    id: "wing-right",
    name: "Triple lateral derecho",
    shortName: "Ala der.",
    points: 3,
    path: "M465 95 H490 V460 H409 L364 262 Q451 184 465 95 Z",
    labelX: 438,
    labelY: 304,
  },
  {
    id: "top",
    name: "Triple frontal",
    shortName: "Triple frontal",
    points: 3,
    path: "M136 262 Q250 318 364 262 L409 460 H91 Z",
    labelX: 250,
    labelY: 370,
  },
];

export function shotZoneById(id) {
  return shotZones.find((zone) => zone.id === id) || null;
}

export function isShotTag(tagOrEvent) {
  const metric = eventMetric(tagOrEvent || {});
  if (/^(made|missed)[23]$/.test(metric)) return true;
  if (
    /^(made|missed)1$/.test(metric) ||
    (tagOrEvent?.metric && metric === "custom")
  )
    return false;
  const id = String(tagOrEvent?.tagId || tagOrEvent?.id || "").toLowerCase();
  const name = String(
    tagOrEvent?.tagName || tagOrEvent?.name || "",
  ).toLowerCase();
  return (
    id.includes("shot") ||
    id.includes("basket") ||
    name.includes("canasta") ||
    name.includes("tiro")
  );
}

export function shotTagPoints(tagOrEvent) {
  const metric = eventMetric(tagOrEvent || {});
  if (/^(made|missed)[23]$/.test(metric)) return Number(metric.at(-1));
  if (!isShotTag(tagOrEvent)) return 0;
  const id = String(tagOrEvent?.tagId || tagOrEvent?.id || "").toLowerCase();
  const name = String(
    tagOrEvent?.tagName || tagOrEvent?.name || "",
  ).toLowerCase();
  if (id.endsWith("-3") || name.includes("3p") || name.includes("3 p"))
    return 3;
  if (id.endsWith("-2") || name.includes("2p") || name.includes("2 p"))
    return 2;
  return 0;
}

export function zoneStats(events) {
  return shotZones.map((zone) => {
    const attempts = events.filter(
      (event) => event.shotZoneId === zone.id && isShotTag(event),
    );
    const made = attempts.filter((event) =>
      /^made[23]$/.test(eventMetric(event)),
    );
    return {
      ...zone,
      attempts: attempts.length,
      made: made.length,
      percentage:
        attempts.length > 0
          ? Math.round((made.length / attempts.length) * 100)
          : 0,
    };
  });
}
