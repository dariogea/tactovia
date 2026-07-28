import { useState } from "react";
import { DatabaseLibrary } from "./DatabaseLibrary.jsx";
import { RosterManager } from "./RosterManager.jsx";

export function ScoutingLibrary({
  snapshot,
  loading,
  error,
  teams,
  competitions,
  freeAgents,
  onTeamsChange,
  onCompetitionsChange,
  onFreeAgentsChange,
  onRefresh,
  onBackup,
  onDeleteRecord,
  onExportHistory
}) {
  const [workspace, setWorkspace] = useState("directory");
  return (
    <section className="scouting-library-view">
      <header className="library-unified-header">
        <div>
          <span className="eyebrow">Centro de datos</span>
          <h1>Competiciones, equipos y jugadores</h1>
          <p>
            Navega por categorías, prepara partidos y edita plantillas desde un
            único lugar.
          </p>
        </div>
        <div className="segmented-control library-mode-switch">
          <button
            className={workspace === "directory" ? "active" : ""}
            onClick={() => setWorkspace("directory")}
          >
            Explorar biblioteca
          </button>
          <button
            className={workspace === "manage" ? "active" : ""}
            onClick={() => setWorkspace("manage")}
          >
            Editar equipos
          </button>
        </div>
      </header>
      {workspace === "directory" ? (
        <DatabaseLibrary
          snapshot={snapshot}
          teams={teams}
          competitions={competitions}
          freeAgents={freeAgents}
          loading={loading}
          error={error}
          onRefresh={onRefresh}
          onBackup={onBackup}
          onDeleteRecord={onDeleteRecord}
          onExportHistory={onExportHistory}
          onManageTeams={() => setWorkspace("manage")}
        />
      ) : (
        <RosterManager
          teams={teams}
          competitions={competitions}
          freeAgents={freeAgents}
          onChange={onTeamsChange}
          onCompetitionsChange={onCompetitionsChange}
          onFreeAgentsChange={onFreeAgentsChange}
        />
      )}
    </section>
  );
}
