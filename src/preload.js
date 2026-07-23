const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('sidepad', {
  enter: () => ipcRenderer.send('panel-enter'),
  pin: () => ipcRenderer.send('panel-pin'),
  leave: () => ipcRenderer.send('panel-leave'),
  collapse: () => ipcRenderer.send('panel-collapse'),
  close: () => ipcRenderer.send('window-close'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  pickFiles: () => ipcRenderer.invoke('pick-files'),
  importFiles: (filePaths) => ipcRenderer.invoke('import-files', filePaths),
  pathForFile: (file) => webUtils.getPathForFile(file),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  revealFile: (filePath) => ipcRenderer.invoke('reveal-file', filePath),
  authorizeFile: (filePath) => ipcRenderer.invoke('authorize-file', filePath),
  terminal: {
    listShells: () => ipcRenderer.invoke('terminal-list-shells'),
    create: (request) => ipcRenderer.invoke('terminal-create', request),
    write: (id, data) => ipcRenderer.send('terminal-write', id, data),
    resize: (id, cols, rows) => ipcRenderer.send('terminal-resize', id, cols, rows),
    close: (id) => ipcRenderer.invoke('terminal-close', id),
    onData: (callback) => {
      const listener = (_, payload) => callback(payload);
      ipcRenderer.on('terminal-data', listener);
      return () => ipcRenderer.removeListener('terminal-data', listener);
    },
    onExit: (callback) => {
      const listener = (_, payload) => callback(payload);
      ipcRenderer.on('terminal-exit', listener);
      return () => ipcRenderer.removeListener('terminal-exit', listener);
    },
  },
  onPanelState: (callback) => ipcRenderer.on('panel-state', (_, state) => callback(state)),
});
