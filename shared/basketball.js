// Shared definitions: all views derive their numbers from the same event data.
export const periods = ["1", "2", "3", "4", "OT1", "OT2"];
export const periodLabel = (value) =>
  !value
    ? "Sin periodo"
    : String(value).startsWith("OT")
      ? `Prórroga ${String(value).slice(2)}`
      : `${value}º cuarto`;

export function eventMetric(event) {
  if (event.metric) return event.metric;
  const id = event.tagId || event.id || "";
  const known = {
    "tag-shot-made-2": "made2",
    "tag-shot-made-3": "made3",
    "tag-shot-missed-2": "missed2",
    "tag-shot-missed-3": "missed3",
    "tag-free-made": "made1",
    "tag-free-missed": "missed1",
    "tag-off-rebound": "oreb",
    "tag-def-rebound": "dreb",
    "tag-turnover": "turnover",
    "tag-steal": "steal",
    "tag-assist": "assist",
    "tag-block": "block",
    "tag-foul": "foul",
  };
  if (known[id]) return known[id];
  const name = String(event.tagName || event.name || "").toLowerCase();
  const points = Number(event.shotPoints) || (/3/.test(name) ? 3 : 2);
  if (name.includes("canasta")) return `made${points}`;
  if (name.includes("tiro fallado")) return `missed${points}`;
  return "custom";
}

export function boxScore(events = []) {
  const result = {
    actions: events.length,
    made1: 0,
    missed1: 0,
    made2: 0,
    missed2: 0,
    made3: 0,
    missed3: 0,
    oreb: 0,
    dreb: 0,
    turnover: 0,
    steal: 0,
    assist: 0,
    block: 0,
    foul: 0,
  };
  for (const event of events) {
    const metric = eventMetric(event);
    if (Object.hasOwn(result, metric) && metric !== "actions") result[metric]++;
  }
  result.fga = result.made2 + result.missed2 + result.made3 + result.missed3;
  result.fgm = result.made2 + result.made3;
  result.points = result.made1 + result.made2 * 2 + result.made3 * 3;
  result.rebounds = result.oreb + result.dreb;
  result.fg = result.fga ? (result.fgm / result.fga) * 100 : null;
  result.efg = result.fga
    ? ((result.fgm + result.made3 * 0.5) / result.fga) * 100
    : null;
  result.threeShare = result.fga
    ? ((result.made3 + result.missed3) / result.fga) * 100
    : null;
  return result;
}

export function coveredSeconds(events = []) {
  const intervals = events
    .map((e) => [
      Math.max(0, Number(e.start) || 0),
      Math.max(0, Number(e.end) || 0),
    ])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  let total = 0,
    right = 0;
  for (const [start, end] of intervals) {
    total += Math.max(0, end - Math.max(start, right));
    right = Math.max(right, end);
  }
  return total;
}

export function filterEvents(
  events,
  {
    query = "",
    teamId = "",
    tagId = "",
    playerId = "",
    period = "",
    favorites = false,
  } = {},
) {
  const normalize = (value) =>
    String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return events.filter(
    (event) =>
      (!teamId || event.teamId === teamId) &&
      (!tagId || event.tagId === tagId) &&
      (!playerId || event.playerId === playerId) &&
      (!period ||
        (period === "unassigned"
          ? !event.period
          : String(event.period) === String(period))) &&
      (!favorites || event.favorite) &&
      words.every((word) =>
        normalize(
          [event.tagName, event.team, event.player, event.notes].join(" "),
        ).includes(word),
      ),
  );
}
