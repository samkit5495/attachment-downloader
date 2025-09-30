const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectCompanyFile: () => ipcRenderer.invoke('select-company-file'),
    startDownload: (data) => ipcRenderer.invoke('start-download', data),
    getDownloadStatus: () => ipcRenderer.invoke('get-download-status'),
    stopDownload: () => ipcRenderer.invoke('stop-download'),
    resetDownloadState: () => ipcRenderer.invoke('reset-download-state'),
    openDownloadsFolder: () => ipcRenderer.invoke('open-downloads-folder'),
    openAuthUrl: (url) => ipcRenderer.invoke('open-auth-url', url),    // Listen to download progress
    onDownloadProgress: (callback) => {
        ipcRenderer.on('download-progress', (event, data) => callback(data));
    },

    onDownloadComplete: (callback) => {
        ipcRenderer.on('download-complete', (event, data) => callback(data));
    },

    // Listen to auth events
    onAuthUrlReceived: (callback) => {
        ipcRenderer.on('auth-url-received', (event, url) => callback(url));
    },

    onAuthStatusUpdate: (callback) => {
        ipcRenderer.on('auth-status-update', (event, status) => callback(status));
    },

    onAuthSuccess: (callback) => {
        ipcRenderer.on('auth-success', (event) => callback());
    },

    onAuthError: (callback) => {
        ipcRenderer.on('auth-error', (event, error) => callback(error));
    },    // Remove listeners
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});