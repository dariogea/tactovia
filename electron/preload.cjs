const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("scoutDesktop", {
  initializeDatabase: (payload) =>
    ipcRenderer.invoke("database:initialize", payload),
  syncProjectToDatabase: (payload) =>
    ipcRenderer.invoke("database:sync-project", payload),
  getDatabaseSnapshot: (payload) =>
    ipcRenderer.invoke("database:snapshot", payload),
  finalizeProject: (payload) =>
    ipcRenderer.invoke("database:finalize-project", payload),
  deleteGameRecord: (payload) =>
    ipcRenderer.invoke("database:delete-game-record", payload),
  backupDatabase: () => ipcRenderer.invoke("database:backup"),
  selectVideo: () => ipcRenderer.invoke("video:select"),
  selectPlaybookAttachment: () =>
    ipcRenderer.invoke("playbook:select-attachment"),
  authorizeVideo: (filePath) => ipcRenderer.invoke("video:authorize", filePath),
  openProject: () => ipcRenderer.invoke("project:open"),
  saveProject: (payload) => ipcRenderer.invoke("project:save", payload),
  exportCsv: (payload) => ipcRenderer.invoke("export:csv", payload),
  exportXlsx: (payload) => ipcRenderer.invoke("export:xlsx", payload),
  exportPowerBi: (payload) => ipcRenderer.invoke("export:powerbi", payload),
  exportClips: (payload) => ipcRenderer.invoke("export:clips", payload),
  exportReportPdf: (payload) => ipcRenderer.invoke("export:report-pdf", payload),
  exportPlaybookPng: (payload) => ipcRenderer.invoke("export:playbook-png", payload),
  exportPlaybookPdf: (payload) => ipcRenderer.invoke("export:playbook-pdf", payload),
  exportPlaybookVideo: (payload) =>
    ipcRenderer.invoke("export:playbook-video", payload),
  revealFile: (filePath) => ipcRenderer.invoke("file:reveal", filePath)
});
