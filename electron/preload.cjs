const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("scoutDesktop", {
  initializeDatabase: (payload) =>
    ipcRenderer.invoke("database:initialize", payload),
  syncProjectToDatabase: (payload) =>
    ipcRenderer.invoke("database:sync-project", payload),
  getDatabaseSnapshot: (payload) =>
    ipcRenderer.invoke("database:snapshot", payload),
  getUserLibrary: (payload) =>
    ipcRenderer.invoke("database:user-library", payload),
  saveUserLibrary: (payload) =>
    ipcRenderer.invoke("database:save-user-library", payload),
  finalizeProject: (payload) =>
    ipcRenderer.invoke("database:finalize-project", payload),
  deleteGameRecord: (payload) =>
    ipcRenderer.invoke("database:delete-game-record", payload),
  backupDatabase: () => ipcRenderer.invoke("database:backup"),
  selectVideo: () => ipcRenderer.invoke("video:select"),
  authorizeVideo: (filePath) => ipcRenderer.invoke("video:authorize", filePath),
  openProject: () => ipcRenderer.invoke("project:open"),
  saveProject: (payload) => ipcRenderer.invoke("project:save", payload),
  exportCsv: (payload) => ipcRenderer.invoke("export:csv", payload),
  exportXlsx: (payload) => ipcRenderer.invoke("export:xlsx", payload),
  exportPowerBi: (payload) => ipcRenderer.invoke("export:powerbi", payload),
  exportClips: (payload) => ipcRenderer.invoke("export:clips", payload),
  exportReportPdf: (payload) => ipcRenderer.invoke("export:report-pdf", payload),
  revealFile: (filePath) => ipcRenderer.invoke("file:reveal", filePath)
});
