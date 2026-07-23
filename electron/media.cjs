const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");

function videoMimeType(filePath) {
  const types = {
    ".mp4": "video/mp4",
    ".m4v": "video/x-m4v",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".ogv": "video/ogg"
  };
  return types[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function parseMediaRange(rangeHeader, fileSize) {
  if (!Number.isInteger(fileSize) || fileSize <= 0) return null;
  if (!rangeHeader) return { start: 0, end: fileSize - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) return null;

  let start;
  let end;
  if (match[1] === "") {
    const suffixLength = Number(match[2]);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, fileSize - suffixLength);
    end = fileSize - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? fileSize - 1 : Number(match[2]);
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    start >= fileSize
  ) {
    return null;
  }
  return { start, end: Math.min(end, fileSize - 1), partial: true };
}

function createMediaResponse(request, filePath) {
  const fileSize = fs.statSync(filePath).size;
  const range = parseMediaRange(request.headers.get("range"), fileSize);
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes */${fileSize}`
      }
    });
  }

  const headers = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Content-Length": String(range.end - range.start + 1),
    "Content-Type": videoMimeType(filePath)
  };
  if (range.partial) {
    headers["Content-Range"] = `bytes ${range.start}-${range.end}/${fileSize}`;
  }
  if (request.method === "HEAD") {
    return new Response(null, { status: range.partial ? 206 : 200, headers });
  }

  const nodeStream = fs.createReadStream(filePath, {
    start: range.start,
    end: range.end
  });
  return new Response(Readable.toWeb(nodeStream), {
    status: range.partial ? 206 : 200,
    headers
  });
}

module.exports = { createMediaResponse, parseMediaRange, videoMimeType };
