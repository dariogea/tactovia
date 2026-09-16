import { eventMetric } from "./basketball.js";
export const shotZones = [
  {
    id: "restricted",
    name: "Zona restringida",
    shortName: "Aro",
    points: 2,
    path: "M210 10H290V60.4A40 40 0 0 1 210 60.4Z",
    labelX: 250,
    labelY: 81,
  },
  {
    id: "paint",
    name: "Pintura",
    shortName: "Pintura",
    points: 2,
    path: "M171.6 10H210V60.4A40 40 0 0 0 290 60.4V10H328.4V195.6H171.6Z",
    labelX: 250,
    labelY: 151,
  },
  {
    id: "mid-left",
    name: "Media distancia izquierda",
    shortName: "Media izq.",
    points: 2,
    path: "M38.8 10H171.6V195.6L97.265 213.135A216 216 0 0 1 38.8 105.684Z",
    labelX: 108,
    labelY: 154,
  },
  {
    id: "mid-right",
    name: "Media distancia derecha",
    shortName: "Media der.",
    points: 2,
    path: "M328.4 10H461.2V105.684A216 216 0 0 1 402.735 213.135L328.4 195.6Z",
    labelX: 392,
    labelY: 154,
  },
  {
    id: "mid-center",
    name: "Media distancia frontal",
    shortName: "Media centro",
    points: 2,
    path: "M171.6 195.6H328.4L402.735 213.135A216 216 0 0 1 97.265 213.135Z",
    labelX: 250,
    labelY: 241,
  },
  {
    id: "corner-left",
    name: "Triple esquina izquierda",
    shortName: "Izq.",
    points: 3,
    path: "M10 10H38.8V105.684H10Z",
    labelX: 22,
    labelY: 58,
  },
  {
    id: "corner-right",
    name: "Triple esquina derecha",
    shortName: "Der.",
    points: 3,
    path: "M461.2 10H490V105.684H461.2Z",
    labelX: 478,
    labelY: 58,
  },
  {
    id: "wing-left",
    name: "Triple lateral izquierdo",
    shortName: "Ala izq.",
    points: 3,
    path: "M10 105.684H38.8A216 216 0 0 0 97.265 213.135L10 300.4Z",
    labelX: 45,
    labelY: 222,
  },
  {
    id: "wing-right",
    name: "Triple lateral derecho",
    shortName: "Ala der.",
    points: 3,
    path: "M461.2 105.684H490V300.4L402.735 213.135A216 216 0 0 0 461.2 105.684Z",
    labelX: 455,
    labelY: 222,
  },
  {
    id: "top",
    name: "Triple frontal",
    shortName: "Triple frontal",
    points: 3,
    path: "M97.265 213.135A216 216 0 0 0 402.735 213.135L490 300.4V458H10V300.4Z",
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
