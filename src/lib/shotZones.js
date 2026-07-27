export const shotZones = [
  {
    id: "restricted",
    name: "Zona restringida",
    shortName: "Aro",
    points: 2,
    x: 41,
    y: 8,
    width: 18,
    height: 15
  },
  {
    id: "paint",
    name: "Pintura",
    shortName: "Pintura",
    points: 2,
    x: 34,
    y: 21,
    width: 32,
    height: 22
  },
  {
    id: "mid-left",
    name: "Media distancia izquierda",
    shortName: "Media izq.",
    points: 2,
    x: 9,
    y: 22,
    width: 24,
    height: 25
  },
  {
    id: "mid-right",
    name: "Media distancia derecha",
    shortName: "Media der.",
    points: 2,
    x: 67,
    y: 22,
    width: 24,
    height: 25
  },
  {
    id: "mid-center",
    name: "Media distancia frontal",
    shortName: "Media centro",
    points: 2,
    x: 34,
    y: 44,
    width: 32,
    height: 18
  },
  {
    id: "corner-left",
    name: "Triple esquina izquierda",
    shortName: "Esquina izq.",
    points: 3,
    x: 1,
    y: 3,
    width: 8,
    height: 46
  },
  {
    id: "corner-right",
    name: "Triple esquina derecha",
    shortName: "Esquina der.",
    points: 3,
    x: 91,
    y: 3,
    width: 8,
    height: 46
  },
  {
    id: "wing-left",
    name: "Triple lateral izquierdo",
    shortName: "Ala izq.",
    points: 3,
    x: 5,
    y: 50,
    width: 27,
    height: 25
  },
  {
    id: "wing-right",
    name: "Triple lateral derecho",
    shortName: "Ala der.",
    points: 3,
    x: 68,
    y: 50,
    width: 27,
    height: 25
  },
  {
    id: "top",
    name: "Triple frontal",
    shortName: "Triple frontal",
    points: 3,
    x: 32,
    y: 63,
    width: 36,
    height: 28
  }
];

export function shotZoneById(id) {
  return shotZones.find((zone) => zone.id === id) || null;
}

export function isShotTag(tagOrEvent) {
  const id = String(tagOrEvent?.tagId || tagOrEvent?.id || "").toLowerCase();
  const name = String(tagOrEvent?.tagName || tagOrEvent?.name || "").toLowerCase();
  return (
    id.includes("shot") ||
    id.includes("basket") ||
    name.includes("canasta") ||
    name.includes("tiro")
  );
}

export function zoneStats(events) {
  return shotZones.map((zone) => {
    const attempts = events.filter(
      (event) => event.shotZoneId === zone.id && isShotTag(event)
    );
    const made = attempts.filter((event) =>
      String(event.tagName || "").toLowerCase().includes("canasta")
    );
    return {
      ...zone,
      attempts: attempts.length,
      made: made.length,
      percentage:
        attempts.length > 0 ? Math.round((made.length / attempts.length) * 100) : 0
    };
  });
}
