import {
  ACTION_TYPES,
  DEFAULT_COURT_STYLE,
  actionLabel,
  courtDimensions
} from "../../lib/playbook.js";

const imageCache = new Map();

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundedRectangle(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height
  );
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function colorChannels(color) {
  const normalized = String(color || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return [232, 191, 135];
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16)
  ];
}

function shade(color, amount) {
  const channels = colorChannels(color).map((channel) =>
    clamp(Math.round(channel + amount), 0, 255)
  );
  return `rgb(${channels.join(",")})`;
}

function drawPlanks(ctx, x, y, width, height, color, seedOffset = 0) {
  const plankWidth = Math.max(16, Math.round(width / 32));
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  for (let index = 0; index < Math.ceil(width / plankWidth); index += 1) {
    const plankX = x + index * plankWidth;
    const currentWidth = Math.min(plankWidth, x + width - plankX);
    const tone = ((index * 17 + seedOffset) % 5 - 2) * 3;
    ctx.fillStyle = shade(color, tone);
    ctx.fillRect(plankX, y, currentWidth, height);

    let segmentY = y + ((index * 47 + seedOffset * 13) % 72);
    let segment = 0;
    while (segmentY < y + height) {
      const segmentHeight = 62 + ((index * 29 + segment * 37) % 74);
      const highlight =
        ((index + segment + seedOffset) % 3 === 0 ? 1 : -1) *
        (3 + ((index * 7 + segment) % 4));
      ctx.fillStyle = shade(color, tone + highlight);
      ctx.fillRect(
        plankX + 1,
        segmentY,
        Math.max(0, currentWidth - 2),
        Math.min(segmentHeight, y + height - segmentY)
      );
      segmentY += segmentHeight + 1;
      segment += 1;
    }

    ctx.fillStyle = "rgba(106, 68, 32, 0.075)";
    ctx.fillRect(plankX, y, 1, height);
  }
}

function courtInset(spacing) {
  return clamp(Number(spacing) || 14, 8, 40) + 24;
}

function drawCourtSurface(ctx, width, height, style, spacing) {
  const edge = courtInset(spacing);
  ctx.save();
  roundedRectangle(ctx, 0, 0, width, height, 24);
  ctx.clip();
  drawPlanks(ctx, 0, 0, width, height, style.outOfBounds, 4);
  drawPlanks(
    ctx,
    edge,
    edge,
    width - edge * 2,
    height - edge * 2,
    style.background,
    11
  );
  ctx.restore();

  ctx.save();
  roundedRectangle(ctx, 1.5, 1.5, width - 3, height - 3, 23);
  ctx.strokeStyle = "rgba(98, 62, 29, 0.12)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  return edge;
}

function fillPaint(ctx, x, y, width, height, style) {
  if (style.paint === style.background) return;
  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = style.paint;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

function prepareCourtLines(ctx, style) {
  ctx.strokeStyle = style.lines;
  ctx.lineWidth = Number(style.lineWidth) || 3;
  ctx.lineCap = "square";
  ctx.lineJoin = "round";
}

function drawReferenceHalfCourt(
  ctx,
  width,
  height,
  requestedStyle,
  spacing
) {
  const style = { ...DEFAULT_COURT_STYLE, ...requestedStyle };
  const edge = drawCourtSurface(ctx, width, height, style, spacing);
  const left = edge;
  const right = width - edge;
  const top = edge;
  const bottom = height - edge;
  const courtWidth = right - left;
  const courtHeight = bottom - top;
  const centerX = width / 2;
  const laneWidth = courtWidth * 0.255;
  const laneLength = courtHeight * 0.405;
  const laneLeft = centerX - laneWidth / 2;
  const laneTop = top;
  const freeThrowY = top + laneLength;
  const backboardY = top + courtHeight * 0.085;
  const rimY = backboardY + courtHeight * 0.027;
  const rimRadius = Math.max(10, courtWidth * 0.018);
  const restrictedRadius = laneWidth * 0.31;

  prepareCourtLines(ctx, style);
  ctx.strokeRect(left, top, courtWidth, courtHeight);
  fillPaint(ctx, laneLeft, laneTop, laneWidth, laneLength, style);
  ctx.strokeRect(laneLeft, laneTop, laneWidth, laneLength);

  ctx.beginPath();
  ctx.arc(centerX, freeThrowY, laneWidth / 2, 0, Math.PI);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - laneWidth * 0.31, backboardY);
  ctx.lineTo(centerX + laneWidth * 0.31, backboardY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, rimY, rimRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, rimY, restrictedRadius, 0, Math.PI);
  ctx.stroke();

  const threePointRadius = courtWidth * 0.444;
  const cornerOffset = courtWidth * 0.065;
  const leftCornerX = left + cornerOffset;
  const rightCornerX = right - cornerOffset;
  const horizontalDistance = centerX - leftCornerX;
  const joinOffset = Math.sqrt(
    Math.max(0, threePointRadius ** 2 - horizontalDistance ** 2)
  );
  const joinY = rimY + joinOffset;
  const leftAngle = Math.atan2(joinY - rimY, leftCornerX - centerX);
  const rightAngle = Math.atan2(joinY - rimY, rightCornerX - centerX);

  ctx.beginPath();
  ctx.moveTo(leftCornerX, top);
  ctx.lineTo(leftCornerX, joinY);
  ctx.arc(
    centerX,
    rimY,
    threePointRadius,
    leftAngle,
    rightAngle,
    true
  );
  ctx.lineTo(rightCornerX, top);
  ctx.stroke();

  const hashLength = courtWidth * 0.018;
  for (const ratio of [0.42, 0.6, 0.79]) {
    const y = top + laneLength * ratio;
    ctx.beginPath();
    ctx.moveTo(laneLeft - hashLength, y);
    ctx.lineTo(laneLeft, y);
    ctx.moveTo(laneLeft + laneWidth, y);
    ctx.lineTo(laneLeft + laneWidth + hashLength, y);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(centerX, bottom, courtWidth * 0.125, Math.PI, Math.PI * 2);
  ctx.stroke();
}

function drawFullHorizontalCourt(
  ctx,
  width,
  height,
  requestedStyle,
  spacing
) {
  const style = { ...DEFAULT_COURT_STYLE, ...requestedStyle };
  const edge = drawCourtSurface(ctx, width, height, style, spacing);
  prepareCourtLines(ctx, style);
  ctx.strokeRect(edge, edge, width - edge * 2, height - edge * 2);

  function basketSide(x, direction) {
    const baseline = direction === 1 ? x + 72 : x - 72;
    const laneWidth = Math.min(205, width * 0.26);
    const laneX = direction === 1 ? x : x - laneWidth;
    fillPaint(ctx, laneX, height / 2 - 112, laneWidth, 224, style);
    ctx.strokeStyle = style.lines;
    ctx.strokeRect(laneX, height / 2 - 112, laneWidth, 224);
    ctx.beginPath();
    ctx.moveTo(baseline, height / 2 - 48);
    ctx.lineTo(baseline, height / 2 + 48);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(
      direction === 1 ? baseline + 19 : baseline - 19,
      height / 2,
      17,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(
      direction === 1 ? x + laneWidth : x - laneWidth,
      height / 2,
      112,
      -Math.PI / 2,
      Math.PI / 2,
      direction !== 1
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(
      direction === 1 ? x + 38 : x - 38,
      height / 2,
      Math.min(255, width * 0.36),
      -1.08,
      1.08,
      direction !== 1
    );
    ctx.stroke();
  }

  basketSide(edge, 1);
  basketSide(width - edge, -1);
  ctx.beginPath();
  ctx.moveTo(width / 2, edge);
  ctx.lineTo(width / 2, height - edge);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 78, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawCourt(ctx, play, options = {}) {
  const { width, height } = courtDimensions(play.court);
  const style = {
    ...DEFAULT_COURT_STYLE,
    ...play.courtStyle
  };
  if (options.courtColor) {
    const paintFollowedBackground =
      !play.courtStyle?.paint ||
      play.courtStyle.paint === play.courtStyle.background;
    style.background = options.courtColor;
    style.outOfBounds = options.courtColor;
    if (paintFollowedBackground) style.paint = options.courtColor;
  }
  if (play.court === "half") {
    drawReferenceHalfCourt(
      ctx,
      width,
      height,
      style,
      options.outOfBoundsSpacing
    );
    return;
  }
  if (play.court === "full-vertical") {
    ctx.save();
    ctx.translate(width, 0);
    ctx.rotate(Math.PI / 2);
    drawFullHorizontalCourt(
      ctx,
      height,
      width,
      style,
      options.outOfBoundsSpacing
    );
    ctx.restore();
    return;
  }
  drawFullHorizontalCourt(ctx, width, height, style, options.outOfBoundsSpacing);
}

function drawSelection(ctx, x, y, width, height) {
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 5]);
  ctx.strokeRect(x, y, width, height);
  ctx.restore();
}

function objectScale(object, globalScale = 100) {
  return (Math.max(40, Number(object.scale) || 100) / 100) *
    (Math.max(50, Number(globalScale) || 100) / 100);
}

function playerRadius(object, globalScale) {
  return 28 * objectScale(object, globalScale);
}

function drawPlayer(ctx, object, selected, globalScale) {
  const radius = playerRadius(object, globalScale);
  ctx.save();
  ctx.translate(object.x, object.y);
  ctx.fillStyle = object.color || (object.role === "defense" ? "#dc3545" : "#0f766e");
  ctx.strokeStyle = selected ? "#ffffff" : object.borderColor || "#10243a";
  ctx.lineWidth = selected ? 6 : 3;
  ctx.beginPath();
  if (object.role === "defense") {
    ctx.moveTo(0, -radius);
    ctx.lineTo(radius, 0);
    ctx.lineTo(0, radius);
    ctx.lineTo(-radius, 0);
    ctx.closePath();
  } else {
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${Math.max(12, 18 * objectScale(object, globalScale))}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(object.label || "P", 0, 1);
  if (object.hasBall) {
    const ballRadius = Math.max(7, radius * 0.32);
    ctx.fillStyle = "#f97316";
    ctx.strokeStyle = "#351507";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(radius * 0.82, -radius * 0.82, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawBall(ctx, object, selected, globalScale) {
  const radius = 17 * objectScale(object, globalScale);
  ctx.save();
  ctx.fillStyle = "#f97316";
  ctx.strokeStyle = selected ? "#ffffff" : "#351507";
  ctx.lineWidth = selected ? 5 : 3;
  ctx.beginPath();
  ctx.arc(object.x, object.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(object.x - radius, object.y);
  ctx.lineTo(object.x + radius, object.y);
  ctx.moveTo(object.x, object.y - radius);
  ctx.lineTo(object.x, object.y + radius);
  ctx.stroke();
  ctx.restore();
}

function drawCone(ctx, object, selected, globalScale) {
  const scale = objectScale(object, globalScale);
  const width = 24 * scale;
  const height = 34 * scale;
  ctx.save();
  ctx.fillStyle = object.color || "#f97316";
  ctx.strokeStyle = selected ? "#ffffff" : "#7c2d12";
  ctx.lineWidth = selected ? 4 : 2;
  ctx.beginPath();
  ctx.moveTo(object.x, object.y - height / 2);
  ctx.lineTo(object.x + width / 2, object.y + height / 2);
  ctx.lineTo(object.x - width / 2, object.y + height / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawHoop(ctx, object, selected, globalScale) {
  const radius = 22 * objectScale(object, globalScale);
  ctx.save();
  ctx.strokeStyle = selected ? "#ffffff" : object.color || "#ef4444";
  ctx.lineWidth = selected ? 6 : 4;
  ctx.beginPath();
  ctx.arc(object.x, object.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(object.x - radius * 1.4, object.y - radius * 1.55);
  ctx.lineTo(object.x + radius * 1.4, object.y - radius * 1.55);
  ctx.stroke();
  ctx.restore();
}

function drawText(ctx, object, selected, globalScale) {
  const fontSize = (Number(object.fontSize) || 24) * objectScale(object, globalScale);
  ctx.save();
  ctx.font = `700 ${fontSize}px system-ui`;
  ctx.fillStyle = object.color || "#10243a";
  ctx.fillText(object.text || "Texto", object.x, object.y);
  if (selected) {
    const width = ctx.measureText(object.text || "Texto").width;
    drawSelection(ctx, object.x - 5, object.y - fontSize, width + 10, fontSize + 10);
  }
  ctx.restore();
}

function drawLineObject(ctx, object, selected) {
  ctx.save();
  ctx.strokeStyle = object.color || "#10243a";
  ctx.fillStyle = object.color || "#10243a";
  ctx.lineWidth = Number(object.width) || 6;
  ctx.lineCap = "round";
  if (object.dashed) ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(object.x1, object.y1);
  ctx.lineTo(object.x2, object.y2);
  ctx.stroke();
  if (object.kind === "arrow") {
    drawArrowHead(ctx, object.x1, object.y1, object.x2, object.y2, 22);
  }
  if (selected) {
    drawSelection(
      ctx,
      Math.min(object.x1, object.x2) - 10,
      Math.min(object.y1, object.y2) - 10,
      Math.abs(object.x2 - object.x1) + 20,
      Math.abs(object.y2 - object.y1) + 20
    );
  }
  ctx.restore();
}

function drawShape(ctx, object, selected, globalScale) {
  const scale = objectScale(object, globalScale);
  const x1 = Number(object.x1 ?? object.x - 40) || 0;
  const y1 = Number(object.y1 ?? object.y - 30) || 0;
  const x2 = Number(object.x2 ?? object.x + 40) || 0;
  const y2 = Number(object.y2 ?? object.y + 30) || 0;
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1) * scale;
  const height = Math.abs(y2 - y1) * scale;
  ctx.save();
  ctx.globalAlpha = Number(object.opacity) || 0.35;
  ctx.fillStyle = object.fillColor || object.color || "#38bdf8";
  ctx.strokeStyle = selected ? "#ffffff" : object.color || "#0f4c75";
  ctx.lineWidth = selected ? 5 : Number(object.width) || 3;
  ctx.beginPath();
  if (object.kind === "circle") {
    ctx.ellipse(
      left + width / 2,
      top + height / 2,
      Math.max(2, width / 2),
      Math.max(2, height / 2),
      0,
      0,
      Math.PI * 2
    );
  } else if (object.kind === "triangle") {
    ctx.moveTo(left + width / 2, top);
    ctx.lineTo(left + width, top + height);
    ctx.lineTo(left, top + height);
    ctx.closePath();
  } else {
    ctx.rect(left, top, width, height);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
  ctx.restore();
}

function drawImage(ctx, object, selected, globalScale) {
  const image = imageCache.get(object.imageData);
  const width = (Number(object.width) || 130) * objectScale(object, globalScale);
  const height = (Number(object.height) || 90) * objectScale(object, globalScale);
  if (image?.complete) {
    ctx.drawImage(image, object.x - width / 2, object.y - height / 2, width, height);
  } else {
    ctx.save();
    ctx.fillStyle = "#172a3b";
    ctx.fillRect(object.x - width / 2, object.y - height / 2, width, height);
    ctx.fillStyle = "#9fb0c0";
    ctx.font = "700 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Imagen", object.x, object.y + 5);
    ctx.restore();
  }
  if (selected) {
    drawSelection(ctx, object.x - width / 2, object.y - height / 2, width, height);
  }
}

export function drawObject(ctx, object, selected = false, globalScale = 100) {
  if (!object) return;
  if (object.kind === "player") return drawPlayer(ctx, object, selected, globalScale);
  if (object.kind === "ball") return drawBall(ctx, object, selected, globalScale);
  if (object.kind === "cone") return drawCone(ctx, object, selected, globalScale);
  if (object.kind === "hoop") return drawHoop(ctx, object, selected, globalScale);
  if (object.kind === "text") return drawText(ctx, object, selected, globalScale);
  if (object.kind === "line" || object.kind === "arrow") {
    return drawLineObject(ctx, object, selected);
  }
  if (["rectangle", "circle", "triangle"].includes(object.kind)) {
    return drawShape(ctx, object, selected, globalScale);
  }
  if (object.kind === "image") return drawImage(ctx, object, selected, globalScale);
}

function drawArrowHead(ctx, x1, y1, x2, y2, size = 20) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawWavyLine(ctx, x1, y1, x2, y2, progress) {
  const dx = (x2 - x1) * progress;
  const dy = (y2 - y1) * progress;
  const length = Math.max(1, Math.hypot(dx, dy));
  const segments = Math.max(4, Math.round(length / 14));
  const normalX = -dy / length;
  const normalY = dx / length;
  ctx.beginPath();
  for (let index = 0; index <= segments; index += 1) {
    const ratio = index / segments;
    const wave =
      index === 0 || index === segments
        ? 0
        : (index % 2 === 0 ? -1 : 1) * 7;
    const x = x1 + dx * ratio + normalX * wave;
    const y = y1 + dy * ratio + normalY * wave;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function drawAction(ctx, action, progress = 1, selected = false) {
  const safeProgress = clamp(progress, 0, 1);
  if (safeProgress <= 0) return;
  const x2 = action.x1 + (action.x2 - action.x1) * safeProgress;
  const y2 = action.y1 + (action.y2 - action.y1) * safeProgress;
  const color =
    action.color ||
    ACTION_TYPES.find((item) => item.id === action.kind)?.color ||
    "#22c55e";
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = selected ? 9 : 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (action.kind === "pass" || action.kind === "shot") {
    ctx.setLineDash(action.kind === "pass" ? [16, 11] : [6, 9]);
  }
  if (action.kind === "dribble") {
    drawWavyLine(ctx, action.x1, action.y1, action.x2, action.y2, safeProgress);
  } else {
    ctx.beginPath();
    ctx.moveTo(action.x1, action.y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  if (action.kind === "screen") {
    const angle = Math.atan2(y2 - action.y1, x2 - action.x1);
    const normalX = Math.cos(angle + Math.PI / 2) * 16;
    const normalY = Math.sin(angle + Math.PI / 2) * 16;
    ctx.beginPath();
    ctx.moveTo(x2 - normalX, y2 - normalY);
    ctx.lineTo(x2 + normalX, y2 + normalY);
    ctx.stroke();
  } else {
    drawArrowHead(ctx, action.x1, action.y1, x2, y2, 20);
  }
  if (action.kind === "handoff") {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(action.x1, action.y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.font = "800 12px system-ui";
  ctx.fillStyle = selected ? "#ffffff" : color;
  ctx.fillText(actionLabel(action.kind), action.x1 + 8, action.y1 - 10);
  ctx.restore();
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const ratio = clamp(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) /
      (dx * dx + dy * dy),
    0,
    1
  );
  return Math.hypot(
    point.x - (start.x + ratio * dx),
    point.y - (start.y + ratio * dy)
  );
}

export function hitObject(objects, point) {
  return [...objects].reverse().find((object) => {
    if (["line", "arrow"].includes(object.kind)) {
      return distanceToSegment(
        point,
        { x: object.x1, y: object.y1 },
        { x: object.x2, y: object.y2 }
      ) < 18;
    }
    if (["rectangle", "circle", "triangle"].includes(object.kind)) {
      const left = Math.min(object.x1, object.x2);
      const right = Math.max(object.x1, object.x2);
      const top = Math.min(object.y1, object.y2);
      const bottom = Math.max(object.y1, object.y2);
      return point.x >= left - 12 && point.x <= right + 12 &&
        point.y >= top - 12 && point.y <= bottom + 12;
    }
    const radius = object.kind === "text" || object.kind === "image" ? 60 : 38;
    return Math.hypot(point.x - object.x, point.y - object.y) < radius;
  });
}

export function hitAction(actions, point) {
  return [...actions].reverse().find(
    (action) =>
      distanceToSegment(
        point,
        { x: action.x1, y: action.y1 },
        { x: action.x2, y: action.y2 }
      ) < 20
  );
}

function clearCanvas(canvas, play) {
  const { width, height } = courtDimensions(play.court);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  return ctx;
}

export function renderEditorScene(canvas, play, phase, options = {}) {
  if (!canvas || !play || !phase) return;
  const ctx = clearCanvas(canvas, play);
  drawCourt(ctx, play, options.outputSettings);
  for (const action of phase.actions || []) {
    drawAction(
      ctx,
      action,
      1,
      options.selected?.type === "action" && options.selected.id === action.id
    );
  }
  for (const object of phase.objects || []) {
    drawObject(
      ctx,
      object,
      options.selected?.type === "object" && options.selected.id === object.id,
      options.outputSettings?.objectScale
    );
  }
  if (options.draft) {
    if (options.draft.type === "action") drawAction(ctx, options.draft.value, 1, true);
    else drawObject(ctx, options.draft.value, true);
  }
}

function actionProgress(action, time) {
  return clamp(
    (time - (Number(action.delay) || 0)) /
      Math.max(0.2, Number(action.duration) || 1.2),
    0,
    1
  );
}

function animatedObjects(phase, time) {
  const objects = (phase.objects || []).map((object) => ({ ...object }));
  const actions = [...(phase.actions || [])].sort(
    (left, right) => left.order - right.order
  );
  for (const action of actions) {
    const progress = actionProgress(action, time);
    const actor = objects.find(
      (object) =>
        (object.trackId || object.id) === action.actorTrackId ||
        object.id === action.actorId
    );
    if (
      actor &&
      ["dribble", "cut", "screen", "handoff"].includes(action.kind)
    ) {
      actor.x = action.x1 + (action.x2 - action.x1) * progress;
      actor.y = action.y1 + (action.y2 - action.y1) * progress;
    }
    if (progress >= 1 && ["pass", "handoff"].includes(action.kind)) {
      const target = objects.find(
        (object) =>
          (object.trackId || object.id) === action.targetTrackId ||
          object.id === action.targetId
      );
      if (actor) actor.hasBall = false;
      if (target) target.hasBall = true;
    }
    if (progress >= 1 && action.kind === "shot" && actor) actor.hasBall = false;
  }
  return objects;
}

export function renderAnimationScene(canvas, play, phase, time, options = {}) {
  if (!canvas || !play || !phase) return;
  const ctx = clearCanvas(canvas, play);
  drawCourt(ctx, play, options.outputSettings);
  for (const action of [...(phase.actions || [])].sort(
    (left, right) => left.order - right.order
  )) {
    const progress = actionProgress(action, time);
    drawAction(ctx, action, progress);
    if (
      ["pass", "shot", "handoff"].includes(action.kind) &&
      progress > 0 &&
      progress < 1
    ) {
      drawBall(
        ctx,
        {
          kind: "ball",
          x: action.x1 + (action.x2 - action.x1) * progress,
          y: action.y1 + (action.y2 - action.y1) * progress
        },
        false,
        options.outputSettings?.objectScale
      );
    }
  }
  for (const object of animatedObjects(phase, time)) {
    drawObject(ctx, object, false, options.outputSettings?.objectScale);
  }
  if (phase.showTitle !== false && options.showTitle !== false) {
    ctx.save();
    ctx.fillStyle = "rgba(5, 14, 23, 0.78)";
    ctx.fillRect(18, 18, Math.min(360, canvas.width - 36), 48);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 20px system-ui";
    ctx.fillText(phase.name || "Fase", 34, 49);
    ctx.restore();
  }
}

export function renderPhaseToDataUrl(play, phase, options = {}) {
  const canvas = document.createElement("canvas");
  renderEditorScene(canvas, play, phase, {
    outputSettings: options.outputSettings || play.outputSettings
  });
  return canvas.toDataURL("image/png");
}

export function preloadCourtImages(objects, onReady) {
  for (const object of objects || []) {
    if (object.kind !== "image" || !object.imageData || imageCache.has(object.imageData)) {
      continue;
    }
    const image = new Image();
    image.onload = onReady;
    image.src = object.imageData;
    imageCache.set(object.imageData, image);
  }
}
