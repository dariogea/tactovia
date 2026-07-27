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
      onThemeModeChange() {}
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
        cloud: { configured: false },
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
        matches: []
      },
      loading: false,
      error: "",
      importReport: null,
      onRefresh() {},
      onImport() {},
      onCreateTemplate() {},
      onBackup() {},
      onUseMatch() {},
      onManageTeams() {}
    }),
    React.createElement(ScoutingLibrary, {
      snapshot: {
        cloud: { configured: false },
        totals: { teams: 2, players: 1, matches: 0, analyses: 0, events: 0 },
        competitions: [],
        competitionTeams: [],
        teams: [],
        players: [],
        rosters: [],
        matches: []
      },
      teams: project.teams,
      onTeamsChange() {},
      onRefresh() {},
      onImport() {},
      onCreateTemplate() {},
      onBackup() {},
      onUseMatch() {}
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
      onNew() {},
      onContinue() {},
      onOpen() {}
    }),
    React.createElement(ProfilePanel, {
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
      onThemeModeChange() {}
    })
  ];

  for (const view of views) {
    assert.ok(renderToString(view).length > 100);
  }
  process.stdout.write(`Componentes renderizados: ${views.length}\n`);
} finally {
  await vite.close();
}
