const { contextBridge, ipcMain } = require('electron');

// Expose limited API to renderer process
contextBridge.exposeInMainWorld('electron', {
  // App version
  getVersion: () => ipcMain.invoke('get-version'),
  
  // Any other safe APIs you want to expose
  platform: process.platform,
  
  // You can add more APIs here as needed for your app
});

// If you need IPC communication, you can set it up here
const { ipcRenderer } = require('electron');

// Example: Listen for messages from main process
ipcRenderer.on('app-version', (event, arg) => {
  console.log('App version:', arg.version);
});
