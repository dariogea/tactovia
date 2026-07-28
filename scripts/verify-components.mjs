import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent"
});

try {
  const [
    { StatsPanel },
    { RosterManager },
    { SettingsPanel },
    { Playbook },
    { MatchSetup },
    { DatabaseLibrary },
    { ScoutingLibrary },
    { AccessFlow },
    { ProfilePanel },
    { ReportCenter },
    defaults
  ] =
    await Promise.all([
      vite.ssrLoadModule("/src/components/StatsPanel.jsx"),
      vite.ssrLoadModule("/src/components/RosterManager.jsx"),
      vite.ssrLoadModule("/src/components/SettingsPanel.jsx"),
      vite.ssrLoadModule("/src/components/Playbook.jsx"),
      vite.ssrLoadModule("/src/components/MatchSetup.jsx"),
      vite.ssrLoadModule("/src/components/DatabaseLibrary.jsx"),
      vite.ssrLoadModule("/src/components/ScoutingLibrary.jsx"),
      vite.ssrLoadModule("/src/components/AccessFlow.jsx"),
      vite.ssrLoadModule("/src/components/ProfilePanel.jsx"),
      vite.ssrLoadModule("/src/components/ReportCenter.jsx"),
      vite.ssrLoadModule("/src/lib/defaults.js")
    ]);

  const project = defaults.createBlankProject();
  const views = [
    React.createElement(StatsPanel, { project }),
    React.createElement(RosterManager, { teams: project.teams, onChange() {} }),
    React.createElement(SettingsPanel, {
      preferences: defaults.defaultPreferences,
      tags: project.template.tags,
      onChange() {},
      themeMode: "system",
      resolvedTheme: "dark",
      onThemeModeChange() {},
      paletteMode: "tactovia",
      onPaletteModeChange() {}
    }),
    React.createElement(Playbook, {
      playbook: project.playbook,
      teams: project.teams,
      onChange() {},
      onExport() {}
    }),
    React.createElement(MatchSetup, {
      teams: project.teams,
      initialMatch: null,
      onTeamsChange() {},
      onConfirm() {},
      onManageTeams() {}
    }),
    React.createElement(DatabaseLibrary, {
      snapshot: {
        totals: {
          teams: 2,
          players: 1,
          matches: 1,
          analyses: 1,
          events: 1,
          pendingSync: 1
        },
        competitions: [],
        teams: [],
        players: [],
        rosters: [],
        matches: [],
        gameRecords: []
      },
      teams: project.teams,
      competitions: project.competitions,
      freeAgents: project.freeAgents,
      loading: false,
      error: "",
      onRefresh() {},
      onBackup() {},
      onManageTeams() {},
      onDeleteRecord() {},
      onExportHistory() {}
    }),
    React.createElement(ScoutingLibrary, {
      snapshot: {
        totals: { teams: 2, players: 1, matches: 0, analyses: 0, events: 0 },
        competitions: [],
        competitionTeams: [],
        teams: [],
        players: [],
        rosters: [],
        matches: [],
        gameRecords: []
      },
      teams: project.teams,
      competitions: project.competitions,
      freeAgents: project.freeAgents,
      onTeamsChange() {},
      onCompetitionsChange() {},
      onFreeAgentsChange() {},
      onRefresh() {},
      onBackup() {},
      onDeleteRecord() {},
      onExportHistory() {}
    }),
    React.createElement(AccessFlow, {
      account: null,
      authenticated: false,
      sport: "",
      project,
      canContinue: false,
      onAccountChange() {},
      onAuthenticated() {},
      onSelectSport() {},
      onDemo() {},
      onNew() {},
      onContinue() {},
      onOpen() {}
    }),
    React.createElement(ProfilePanel, {
      appVersion: "0.11.0",
      account: {
        id: "local",
        name: "Analista",
        email: "analista@example.com",
        role: "Analista",
        passwordHash: "hash"
      },
      onAccountChange() {},
      onLogout() {},
      preferences: defaults.defaultPreferences,
      onPreferencesChange() {},
      tags: project.template.tags,
      themeMode: "system",
      resolvedTheme: "dark",
      onThemeModeChange() {},
      paletteMode: "tactovia",
      onPaletteModeChange() {}
    }),
    React.createElement(ReportCenter, {
      project,
      stats: [],
      selectedEventIds: new Set(),
      dataExportFormat: "xlsx",
      onDataExportFormat() {},
      onExportData() {},
      onToggleSelectAll() {},
      onConfigureClips() {},
      onExportReport() {},
      onCopySummary() {}
    })
  ];

  for (const view of views) {
    assert.ok(renderToString(view).length > 100);
  }
  process.stdout.write(`Componentes renderizados: ${views.length}\n`);
} finally {
  await vite.close();
}
