const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wallet', {
  getAddress: () => ipcRenderer.invoke('get-address')
});

contextBridge.exposeInMainWorld('api', {
  getBalance: addr => ipcRenderer.invoke('get-balance', addr),
  getChain: () => ipcRenderer.invoke('get-chain')
});

contextBridge.exposeInMainWorld('electron', {
  on: (channel, listener) => ipcRenderer.on(channel, listener)
});
