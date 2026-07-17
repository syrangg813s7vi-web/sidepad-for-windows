const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('sidepad', {
  enter: () => ipcRenderer.send('panel-enter'),
  collapse: () => ipcRenderer.send('panel-collapse'),
  close: () => ipcRenderer.send('window-close'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  pickFiles: () => ipcRenderer.invoke('pick-files'),
  importFiles: (filePaths) => ipcRenderer.invoke('import-files', filePaths),
  pathForFile: (file) => webUtils.getPathForFile(file),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  revealFile: (filePath) => ipcRenderer.invoke('reveal-file', filePath),
  authorizeFile: (filePath) => ipcRenderer.invoke('authorize-file', filePath),
  onPanelState: (callback) => ipcRenderer.on('panel-state', (_, state) => callback(state)),
});
