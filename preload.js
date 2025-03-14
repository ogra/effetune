const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    // File system operations
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
    readFile: (filePath, binary = false) => ipcRenderer.invoke('read-file', filePath, binary),
    
    // Documentation operations
    openDocumentation: (path) => ipcRenderer.invoke('open-documentation', path),
    openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
    
    // Audio device operations
    getAudioDevices: () => ipcRenderer.invoke('get-audio-devices'),
    saveAudioPreferences: (preferences) => ipcRenderer.invoke('save-audio-preferences', preferences),
    loadAudioPreferences: () => ipcRenderer.invoke('load-audio-preferences'),
    // First launch flag for audio workaround - use IPC instead of window property
    isFirstLaunch: () => {
      // Return a Promise that resolves to a boolean
      return ipcRenderer.invoke('get-first-launch-flag')
        .then(result => {
          return Boolean(result);
        })
        .catch(error => {
          return false;
        });
    },
    
    // Listen for events from main process
    onExportPreset: (callback) => {
      ipcRenderer.on('export-preset', () => callback());
    },
    onImportPreset: (callback) => {
      ipcRenderer.on('import-preset', () => callback());
    },
    onOpenPresetFile: (callback) => {
      ipcRenderer.on('open-preset-file', (_, filePath) => callback(filePath));
    },
    onProcessAudioFiles: (callback) => {
      ipcRenderer.on('process-audio-files', () => callback());
    },
    onSavePreset: (callback) => {
      ipcRenderer.on('save-preset', () => callback());
    },
    onSavePresetAs: (callback) => {
      ipcRenderer.on('save-preset-as', () => callback());
    },
    onConfigAudio: (callback) => {
      ipcRenderer.on('config-audio', () => callback());
    },
    onShowAboutDialog: (callback) => {
      ipcRenderer.on('show-about-dialog', (_, data) => callback(data));
    },
    
    // Get app version
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    
    // Reload window
    reloadWindow: () => ipcRenderer.invoke('reload-window'),
    
    // Update application menu with translations
    updateApplicationMenu: (menuTemplate) => ipcRenderer.invoke('update-application-menu', menuTemplate),
    
    // Get path
    getPath: (name) => ipcRenderer.invoke('getPath', name),
    
    // Join paths (platform-specific)
    joinPaths: (basePath, ...paths) => ipcRenderer.invoke('joinPaths', basePath, ...paths),
    
    // Check if file exists
    fileExists: (filePath) => ipcRenderer.invoke('fileExists', filePath),
    
    // Save pipeline state to file
    savePipelineStateToFile: (pipelineState) => ipcRenderer.invoke('save-pipeline-state-to-file', pipelineState)
  }
);

// Remove global drag and drop event listeners to allow proper drag and drop functionality
