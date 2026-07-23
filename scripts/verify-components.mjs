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
  const [{ StatsPanel }, { RosterManager }, { SettingsPanel }, { Playbook }, { MatchSetup }, defaults] =
    await Promise.all([
      vite.ssrLoadModule("/src/components/StatsPanel.jsx"),
      vite.ssrLoadModule("/src/components/RosterManager.jsx"),
      vite.ssrLoadModule("/src/components/SettingsPanel.jsx"),
      vite.ssrLoadModule("/src/components/Playbook.jsx"),
      vite.ssrLoadModule("/src/components/MatchSetup.jsx"),
      vite.ssrLoadModule("/src/lib/defaults.js")
    ]);

  const project = defaults.createBlankProject();
  const views = [
    React.createElement(StatsPanel, { project }),
    React.createElement(RosterManager, { teams: project.teams, onChange() {} }),
    React.createElement(SettingsPanel, {
      preferences: defaults.defaultPreferences,
      tags: project.template.tags,
      onChange() {}
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
    })
  ];

  for (const view of views) {
    assert.ok(renderToString(view).length > 100);
  }
  process.stdout.write(`Componentes renderizados: ${views.length}\n`);
} finally {
  await vite.close();
}

