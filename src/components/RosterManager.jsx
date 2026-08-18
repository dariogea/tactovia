import { useEffect, useMemo, useState } from "react";
import {
  createPlayerDraft,
  createTeamDraft,
  sortPlayersByNumber,
  teamTemplates
} from "../lib/roster.js";
import { PlayerJersey } from "./PlayerJersey.jsx";

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const maximum = 512;
        const scale = Math.min(1, maximum / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.84));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function ImagePicker({ value, label, initials, color, onChange, round = false }) {
  return (
    <div className={`profile-image-picker ${round ? "round" : ""}`}>
      <div className="profile-image-preview" style={{ "--profile-color": color }}>
        {value ? <img src={value} alt="" /> : <span>{initials || "—"}</span>}
      </div>
      <label className="mini-button image-upload-button">
        {value ? "Cambiar" : `Añadir ${label}`}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) onChange(await resizeImage(file));
            event.target.value = "";
          }}
        />
      </label>
      {value && (
        <button className="mini-button danger-text" onClick={() => onChange("")}>
          Quitar
        </button>
      )}
    </div>
  );
}

function DetailField({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value || ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function RosterManager({
  teams,
  competitions = [],
  folders = [],
  freeAgents = [],
  onChange,
  onCompetitionsChange,
  onFoldersChange,
  onFreeAgentsChange
}) {
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || "");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [teamViewMode, setTeamViewMode] = useState("simple");
  const [playerViewMode, setPlayerViewMode] = useState("simple");
  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) || teams[0],
    [teams, selectedTeamId]
  );
  const orderedPlayers = useMemo(
    () => sortPlayersByNumber(selectedTeam?.players || []),
    [selectedTeam?.players]
  );
  const selectedPlayer =
    selectedTeam?.players.find((player) => player.id === selectedPlayerId) ||
    orderedPlayers[0] ||
    null;

  useEffect(() => {
    if (teams.length > 0 && !teams.some((team) => team.id === selectedTeamId)) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  useEffect(() => {
    if (selectedPlayer && selectedPlayer.id !== selectedPlayerId) {
      setSelectedPlayerId(selectedPlayer.id);
    }
    if (!selectedPlayer) setSelectedPlayerId("");
  }, [selectedPlayer, selectedPlayerId]);

  function updateTeam(patch) {
    onChange(
      teams.map((team) =>
        team.id === selectedTeam.id ? { ...team, ...patch } : team
      )
    );
  }

  function updatePlayer(playerId, patch) {
    updateTeam({
      players: selectedTeam.players.map((player) =>
        player.id === playerId ? { ...player, ...patch } : player
      )
    });
  }

  function addTeam() {
    const team = createTeamDraft();
    onChange([...teams, team]);
    setSelectedTeamId(team.id);
    setSelectedPlayerId("");
    setTeamViewMode("detailed");
  }

  function addTeamFromTemplate(template) {
    const team = template.create();
    onChange([...teams, team]);
    setSelectedTeamId(team.id);
    setSelectedPlayerId("");
    setTeamViewMode("detailed");
  }

  function addCompetition() {
    const name = window.prompt("Nombre de la competición")?.trim();
    if (!name) return;
    const season = window.prompt("Temporada", "2026/27")?.trim() || "";
    const competition = {
      id: crypto.randomUUID(),
      name,
      shortName: name.slice(0, 5).toUpperCase(),
      season,
      description: "",
      folderId: ""
    };
    onCompetitionsChange([...competitions, competition]);
  }

  function addFolder() {
    const name = window.prompt("Nombre de la carpeta")?.trim();
    if (!name) return;
    onFoldersChange?.([
      ...folders,
      { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }
    ]);
  }

  function movePlayer(player, destinationTeamId) {
    const remaining = selectedTeam.players.filter((item) => item.id !== player.id);
    if (destinationTeamId === "free-agent") {
      updateTeam({ players: remaining });
      onFreeAgentsChange([
        ...freeAgents.filter((item) => item.id !== player.id),
        { ...player, previousTeamId: selectedTeam.id }
      ]);
      setSelectedPlayerId("");
      return;
    }
    onChange(
      teams.map((team) => {
        if (team.id === selectedTeam.id) return { ...team, players: remaining };
        if (team.id === destinationTeamId) {
          return {
            ...team,
            players: [
              ...team.players.filter((item) => item.id !== player.id),
              player
            ]
          };
        }
        return team;
      })
    );
    setSelectedPlayerId("");
  }

  function signFreeAgent(player, teamId) {
    onFreeAgentsChange(freeAgents.filter((item) => item.id !== player.id));
    onChange(
      teams.map((team) =>
        team.id === teamId
          ? { ...team, players: [...team.players, player] }
          : team
      )
    );
  }

  function addPlayer() {
    const player = createPlayerDraft();
    updateTeam({ players: [...selectedTeam.players, player] });
    setSelectedPlayerId(player.id);
    setPlayerViewMode("detailed");
  }

  function deleteTeam() {
    if (!selectedTeam || teams.length <= 1) return;
    if (!window.confirm(`¿Eliminar ${selectedTeam.name}? Los eventos existentes conservarán su nombre.`)) {
      return;
    }
    onChange(teams.filter((team) => team.id !== selectedTeam.id));
  }

  function deletePlayer(player) {
    if (!window.confirm(`¿Eliminar a ${player.name}?`)) return;
    updateTeam({
      players: selectedTeam.players.filter((item) => item.id !== player.id)
    });
  }

  return (
    <section className="roster-view">
      <aside className="team-sidebar">
        <div className="section-heading">
          <h2>Equipos</h2>
          <button className="mini-button" onClick={addTeam}>+ Equipo</button>
        </div>
        <div className="team-list">
          {teams.map((team) => (
            <button
              key={team.id}
              className={`team-list-item ${selectedTeam?.id === team.id ? "active" : ""}`}
              style={{ "--team-color": team.primaryColor }}
              onClick={() => {
                setSelectedTeamId(team.id);
                setSelectedPlayerId("");
              }}
            >
              {team.logo ? (
                <img className="team-list-logo" src={team.logo} alt="" />
              ) : (
                <i style={{ background: team.primaryColor }} />
              )}
              <span>
                <strong>{team.name}</strong>
                <small>{team.players.length} jugadores · {team.shortName}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="team-template-panel">
          <span className="eyebrow">4 plantillas iniciales</span>
          {teamTemplates.map((template) => (
            <button key={template.id} onClick={() => addTeamFromTemplate(template)}>
              <i style={{ background: template.primaryColor }} />
              <span><strong>{template.name}</strong><small>{template.size} jugadores</small></span>
              <em>＋</em>
            </button>
          ))}
        </div>
        <div className="competition-manager-mini">
          <div><strong>Competiciones</strong><span>{competitions.length}</span></div>
          <button className="mini-button" onClick={addCompetition}>+ Crear competición</button>
          <button className="mini-button" onClick={addFolder}>+ Crear carpeta</button>
          {competitions.map((competition) => (
            <label key={competition.id} className="competition-folder-row">
              <span>{competition.name}</span>
              <select
                value={competition.folderId || ""}
                onChange={(event) =>
                  onCompetitionsChange(
                    competitions.map((item) =>
                      item.id === competition.id
                        ? { ...item, folderId: event.target.value }
                        : item
                    )
                  )
                }
              >
                <option value="">Sin carpeta</option>
                {folders.map((folder) => (
                  <option value={folder.id} key={folder.id}>{folder.name}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {freeAgents.length > 0 && (
          <div className="free-agent-pool">
            <span className="eyebrow">Agentes libres</span>
            {freeAgents.map((player) => (
              <div key={player.id}>
                <strong>#{player.number || "—"} {player.name}</strong>
                <select
                  defaultValue=""
                  onChange={(event) =>
                    event.target.value && signFreeAgent(player, event.target.value)
                  }
                >
                  <option value="">Fichar por…</option>
                  {teams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </aside>

      {selectedTeam && (
        <div className="roster-editor" style={{ "--team-primary": selectedTeam.primaryColor, "--team-secondary": selectedTeam.secondaryColor }}>
          <div className="roster-team-header">
            <div className="roster-title-with-logo">
              {selectedTeam.logo ? (
                <img src={selectedTeam.logo} alt="" />
              ) : (
                <span style={{ background: selectedTeam.primaryColor }}>
                  {selectedTeam.shortName?.slice(0, 3)}
                </span>
              )}
              <div>
                <span className="eyebrow">Base de datos</span>
                <h1>{selectedTeam.name}</h1>
              </div>
            </div>
            <div className="segmented-control">
              <button className={teamViewMode === "simple" ? "active" : ""} onClick={() => setTeamViewMode("simple")}>
                Vista rápida
              </button>
              <button className={teamViewMode === "detailed" ? "active" : ""} onClick={() => setTeamViewMode("detailed")}>
                Vista detallada
              </button>
            </div>
          </div>

          {teamViewMode === "simple" ? (
            <div className="team-summary-card">
              <ImagePicker
                value={selectedTeam.logo}
                label="logo"
                initials={selectedTeam.shortName}
                color={selectedTeam.primaryColor}
                onChange={(logo) => updateTeam({ logo })}
              />
              <div className="team-summary-fields">
                <DetailField label="Nombre" value={selectedTeam.name} onChange={(name) => updateTeam({ name })} />
                <DetailField
                  label="Abreviatura"
                  value={selectedTeam.shortName}
                  onChange={(shortName) => updateTeam({ shortName: shortName.toUpperCase().slice(0, 5) })}
                />
                <label className="field color-field">
                  <span>Color principal</span>
                  <input type="color" value={selectedTeam.primaryColor} onChange={(event) => updateTeam({ primaryColor: event.target.value })} />
                </label>
                <label className="field color-field">
                  <span>Color secundario</span>
                  <input type="color" value={selectedTeam.secondaryColor} onChange={(event) => updateTeam({ secondaryColor: event.target.value })} />
                </label>
              </div>
            </div>
          ) : (
            <div className="detailed-card team-detailed-card">
              <ImagePicker
                value={selectedTeam.logo}
                label="logo"
                initials={selectedTeam.shortName}
                color={selectedTeam.primaryColor}
                onChange={(logo) => updateTeam({ logo })}
              />
              <div className="detail-fields-grid">
                <DetailField label="Nombre deportivo" value={selectedTeam.name} onChange={(name) => updateTeam({ name })} />
                <DetailField label="Nombre del club" value={selectedTeam.clubName} onChange={(clubName) => updateTeam({ clubName })} />
                <DetailField label="Abreviatura" value={selectedTeam.shortName} onChange={(shortName) => updateTeam({ shortName: shortName.toUpperCase().slice(0, 5) })} />
                <DetailField label="Categoría" value={selectedTeam.category} onChange={(category) => updateTeam({ category })} />
                <DetailField label="Temporada" value={selectedTeam.season} onChange={(season) => updateTeam({ season })} />
                <label className="field">
                  <span>Competición</span>
                  <select
                    value={selectedTeam.competitionId || ""}
                    onChange={(event) => updateTeam({ competitionId: event.target.value })}
                  >
                    <option value="">Sin competición</option>
                    {competitions.map((competition) => (
                      <option key={competition.id} value={competition.id}>
                        {competition.name} · {competition.season || "sin temporada"}
                      </option>
                    ))}
                  </select>
                </label>
                <DetailField label="País" value={selectedTeam.country} onChange={(country) => updateTeam({ country })} />
                <DetailField label="Ciudad" value={selectedTeam.city} onChange={(city) => updateTeam({ city })} />
                <DetailField label="Pabellón" value={selectedTeam.arena} onChange={(arena) => updateTeam({ arena })} />
                <DetailField label="Entrenador" value={selectedTeam.coach} onChange={(coach) => updateTeam({ coach })} />
                <DetailField label="Entrenador asistente" value={selectedTeam.assistantCoach} onChange={(assistantCoach) => updateTeam({ assistantCoach })} />
                <DetailField label="Año de fundación" value={selectedTeam.founded} onChange={(founded) => updateTeam({ founded })} />
                <DetailField label="Sitio web" value={selectedTeam.website} onChange={(website) => updateTeam({ website })} />
                <label className="field color-field"><span>Color principal</span><input type="color" value={selectedTeam.primaryColor} onChange={(event) => updateTeam({ primaryColor: event.target.value })} /></label>
                <label className="field color-field"><span>Color secundario</span><input type="color" value={selectedTeam.secondaryColor} onChange={(event) => updateTeam({ secondaryColor: event.target.value })} /></label>
                <label className="field detail-notes"><span>Notas del equipo</span><textarea value={selectedTeam.notes || ""} onChange={(event) => updateTeam({ notes: event.target.value })} /></label>
              </div>
            </div>
          )}

          <div className="section-heading roster-players-heading">
            <div>
              <span className="eyebrow">Plantilla</span>
              <h2>Jugadores</h2>
            </div>
            <div className="roster-heading-actions">
              <div className="segmented-control">
                <button className={playerViewMode === "simple" ? "active" : ""} onClick={() => setPlayerViewMode("simple")}>
                  Fichas rápidas
                </button>
                <button className={playerViewMode === "detailed" ? "active" : ""} onClick={() => setPlayerViewMode("detailed")}>
                  Ficha detallada
                </button>
              </div>
              <button className="button ghost danger-text" onClick={deleteTeam} disabled={teams.length <= 1}>Eliminar equipo</button>
              <button className="button secondary" onClick={addPlayer}>+ Añadir jugador</button>
            </div>
          </div>

          {playerViewMode === "simple" ? (
            <div className="player-simple-grid">
              {orderedPlayers.length === 0 ? (
                <div className="empty-inline">Añade jugadores a la plantilla.</div>
              ) : orderedPlayers.map((player) => (
                <PlayerJersey
                  key={player.id}
                  player={player}
                  team={selectedTeam}
                  onClick={() => {
                    setSelectedPlayerId(player.id);
                    setPlayerViewMode("detailed");
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="player-detail-layout">
              <div className="player-detail-list">
                {orderedPlayers.map((player) => (
                  <button
                    key={player.id}
                    className={selectedPlayer?.id === player.id ? "active" : ""}
                    onClick={() => setSelectedPlayerId(player.id)}
                  >
                    {player.photo ? <img src={player.photo} alt="" /> : <span>#{player.number || "—"}</span>}
                    <strong>{player.name}</strong>
                    <small>{player.position || "Sin posición"}</small>
                  </button>
                ))}
              </div>
              {selectedPlayer ? (
                <div className="detailed-card player-detailed-card">
                  <ImagePicker
                    value={selectedPlayer.photo}
                    label="foto"
                    initials={selectedPlayer.number ? `#${selectedPlayer.number}` : selectedPlayer.name.slice(0, 2)}
                    color={selectedTeam.primaryColor}
                    round
                    onChange={(photo) => updatePlayer(selectedPlayer.id, { photo })}
                  />
                  <div className="detail-fields-grid">
                    <DetailField label="Nombre completo" value={selectedPlayer.name} onChange={(name) => updatePlayer(selectedPlayer.id, { name })} />
                    <DetailField label="Dorsal" value={selectedPlayer.number} onChange={(number) => updatePlayer(selectedPlayer.id, { number })} />
                    <label className="field"><span>Posición principal</span><select value={selectedPlayer.position || ""} onChange={(event) => updatePlayer(selectedPlayer.id, { position: event.target.value })}><option value="">Sin indicar</option><option>Base</option><option>Escolta</option><option>Alero</option><option>Ala-pívot</option><option>Pívot</option></select></label>
                    <label className="field"><span>Segunda posición</span><select value={selectedPlayer.secondaryPosition || ""} onChange={(event) => updatePlayer(selectedPlayer.id, { secondaryPosition: event.target.value })}><option value="">Sin indicar</option><option>Base</option><option>Escolta</option><option>Alero</option><option>Ala-pívot</option><option>Pívot</option></select></label>
                    <DetailField label="Altura (cm)" value={selectedPlayer.height} onChange={(height) => updatePlayer(selectedPlayer.id, { height })} />
                    <DetailField label="Peso (kg)" value={selectedPlayer.weight} onChange={(weight) => updatePlayer(selectedPlayer.id, { weight })} />
                    <DetailField label="Envergadura (cm)" value={selectedPlayer.wingspan} onChange={(wingspan) => updatePlayer(selectedPlayer.id, { wingspan })} />
                    <DetailField label="Fecha de nacimiento" type="date" value={selectedPlayer.birthDate} onChange={(birthDate) => updatePlayer(selectedPlayer.id, { birthDate })} />
                    <DetailField label="Nacionalidad" value={selectedPlayer.nationality} onChange={(nationality) => updatePlayer(selectedPlayer.id, { nationality })} />
                    <label className="field"><span>Mano dominante</span><select value={selectedPlayer.dominantHand || ""} onChange={(event) => updatePlayer(selectedPlayer.id, { dominantHand: event.target.value })}><option value="">Sin indicar</option><option>Derecha</option><option>Izquierda</option><option>Ambas</option></select></label>
                    <DetailField label="Rol" value={selectedPlayer.role} onChange={(role) => updatePlayer(selectedPlayer.id, { role })} placeholder="Titular, capitán…" />
                    <label className="field"><span>Estado</span><select value={selectedPlayer.status || "Activo"} onChange={(event) => updatePlayer(selectedPlayer.id, { status: event.target.value })}><option>Activo</option><option>Lesionado</option><option>Inactivo</option><option>Baja</option></select></label>
                    <DetailField label="Email" type="email" value={selectedPlayer.email} onChange={(email) => updatePlayer(selectedPlayer.id, { email })} />
                    <DetailField label="Teléfono" value={selectedPlayer.phone} onChange={(phone) => updatePlayer(selectedPlayer.id, { phone })} />
                    <label className="field detail-notes"><span>Notas de scouting</span><textarea value={selectedPlayer.notes || ""} onChange={(event) => updatePlayer(selectedPlayer.id, { notes: event.target.value })} /></label>
                  </div>
                  <button className="button ghost danger-text player-delete" onClick={() => deletePlayer(selectedPlayer)}>Eliminar jugador</button>
                  <label className="field player-transfer-field">
                    <span>Cambiar situación deportiva</span>
                    <select
                      value=""
                      onChange={(event) => {
                        if (event.target.value) movePlayer(selectedPlayer, event.target.value);
                      }}
                    >
                      <option value="">Mover a…</option>
                      <option value="free-agent">Agente libre</option>
                      {teams
                        .filter((team) => team.id !== selectedTeam.id)
                        .map((team) => (
                          <option value={team.id} key={team.id}>{team.name}</option>
                        ))}
                    </select>
                  </label>
                </div>
              ) : (
                <div className="empty-inline">Selecciona o añade un jugador.</div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
