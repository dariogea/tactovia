const fs = require("node:fs");
const path = require("node:path");
const ExcelJS = require("exceljs");

async function main() {
  const { createAnalysisWorkbook } = require("../electron/reports.cjs");

  const project = {
    id: "qa-project",
    projectName: "Partido de verificación",
    analysisNotes: "Verificar anotaciones del analista.",
    video: { name: "partido.mp4", duration: 3600 },
    template: {
      tags: [
        { id: "shot", name: "Canasta", color: "#2DD4BF" },
        { id: "turnover", name: "Pérdida", color: "#FB7185" },
      ],
    },
    match: {
      homeTeamId: "team-a",
      awayTeamId: "team-b",
    },
    teams: [
      {
        id: "team-a",
        name: "Equipo A",
        shortName: "EQA",
        primaryColor: "#2DD4BF",
        secondaryColor: "#0F766E",
        clubName: "Club Baloncesto A",
        category: "Senior",
        season: "2026/27",
        country: "España",
        city: "Madrid",
        arena: "Pabellón Central",
        coach: "Andrea Coach",
        assistantCoach: "Mario Assistant",
        website: "https://example.com",
        founded: "1998",
        notes: "Local",
        players: [
          {
            id: "player-7",
            number: "7",
            name: "Ana Base",
            position: "Base",
            secondaryPosition: "Escolta",
            height: 171,
            weight: 64,
            wingspan: 177,
            birthDate: "2000-04-14",
            nationality: "Española",
            dominantHand: "Derecha",
            role: "Capitana",
            status: "Activo",
            email: "ana@example.com",
            phone: "600000000",
            notes: "",
          },
        ],
      },
      {
        id: "team-b",
        name: "Equipo B",
        shortName: "EQB",
        primaryColor: "#FF6B35",
        secondaryColor: "#9A3412",
        players: [],
      },
    ],
    events: [
      {
        id: "event-1",
        teamId: "team-a",
        playerId: "player-7",
        metric: "made3",
        period: "2",
        favorite: true,
        start: 12.5,
        end: 20.25,
        tagId: "shot",
        tagName: "Canasta",
        mode: "point",
        team: "Equipo A",
        player: "#7 Ana Base",
        notes: "Triple frontal",
      },
    ],
  };

  const outputDirectory = "/private/tmp/scout-xlsx-qa";
  fs.mkdirSync(outputDirectory, { recursive: true });
  const buffer = await createAnalysisWorkbook(project);
  const outputPath = path.join(outputDirectory, "scout-analyzer-qa.xlsx");
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  const verified = new ExcelJS.Workbook();
  await verified.xlsx.load(buffer);
  const assert = require("node:assert/strict");
  assert.equal(verified.getWorksheet("Eventos").getCell("L2").value, "2");
  assert.equal(verified.getWorksheet("Eventos").getCell("M2").value, "Sí");
  assert.equal(verified.getWorksheet("Box score").getCell("C2").value, 3);
  assert.equal(
    verified.getWorksheet("Cuaderno").getCell("A3").value,
    project.analysisNotes,
  );
  const bi = new ExcelJS.Workbook();
  await bi.xlsx.load(await createAnalysisWorkbook(project, { powerBi: true }));
  assert.equal(bi.getWorksheet("DimEtiquetas").rowCount, 3);
  assert.equal(bi.getWorksheet("Eventos").getCell("O2").value, "team-a");
  assert.ok(bi.getWorksheet("Modelo BI"));
  process.stdout.write(
    `XLSX_OK sheets=${verified.worksheets.length} file=${outputPath}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(error.stack || error.message);
  process.exitCode = 1;
});
