const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("scoutDesktop", {
  selectVideo: () => ipcRenderer.invoke("video:select"),
  authorizeVideo: (filePath) => ipcRenderer.invoke("video:authorize", filePath),
  openProject: () => ipcRenderer.invoke("project:open"),
  saveProject: (payload) => ipcRenderer.invoke("project:save", payload),
  exportCsv: (payload) => ipcRenderer.invoke("export:csv", payload),
  exportXlsx: (payload) => ipcRenderer.invoke("export:xlsx", payload),
  exportClips: (payload) => ipcRenderer.invoke("export:clips", payload),
  exportReportPdf: (payload) => ipcRenderer.invoke("export:report-pdf", payload),
  exportPlaybookPng: (payload) => ipcRenderer.invoke("export:playbook-png", payload),
  exportPlaybookPdf: (payload) => ipcRenderer.invoke("export:playbook-pdf", payload),
  revealFile: (filePath) => ipcRenderer.invoke("file:reveal", filePath)
});
