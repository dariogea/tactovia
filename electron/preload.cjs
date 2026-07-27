const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("scoutDesktop", {
  initializeDatabase: (payload) =>
    ipcRenderer.invoke("database:initialize", payload),
  syncProjectToDatabase: (project) =>
    ipcRenderer.invoke("database:sync-project", project),
  getDatabaseSnapshot: () => ipcRenderer.invoke("database:snapshot"),
  createDatabaseImportTemplate: () =>
    ipcRenderer.invoke("database:create-import-template"),
  importDatabaseCatalog: () =>
    ipcRenderer.invoke("database:import-catalog"),
  backupDatabase: () => ipcRenderer.invoke("database:backup"),
  selectVideo: () => ipcRenderer.invoke("video:select"),
  selectPlaybookAttachment: () =>
    ipcRenderer.invoke("playbook:select-attachment"),
  authorizeVideo: (filePath) => ipcRenderer.invoke("video:authorize", filePath),
  openProject: () => ipcRenderer.invoke("project:open"),
  saveProject: (payload) => ipcRenderer.invoke("project:save", payload),
  exportCsv: (payload) => ipcRenderer.invoke("export:csv", payload),
  exportXlsx: (payload) => ipcRenderer.invoke("export:xlsx", payload),
  exportClips: (payload) => ipcRenderer.invoke("export:clips", payload),
  exportReportPdf: (payload) => ipcRenderer.invoke("export:report-pdf", payload),
  exportPlaybookPng: (payload) => ipcRenderer.invoke("export:playbook-png", payload),
  exportPlaybookPdf: (payload) => ipcRenderer.invoke("export:playbook-pdf", payload),
  exportPlaybookVideo: (payload) =>
    ipcRenderer.invoke("export:playbook-video", payload),
  revealFile: (filePath) => ipcRenderer.invoke("file:reveal", filePath)
});
