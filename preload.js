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
    readFileAsBuffer: (filePath) => ipcRenderer.invoke('read-file-as-buffer', filePath),
    
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
    onOpenMusicFile: (callback) => {
      ipcRenderer.on('open-music-file', () => callback());
    },
    onOpenMusicFiles: (callback) => {
      ipcRenderer.on('open-music-files', (_, filePaths) => callback(filePaths));
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
    
    // Clear permission overrides for microphone
    clearMicrophonePermission: () => ipcRenderer.invoke('clear-microphone-permission'),
    
    // Update application menu with translations
    updateApplicationMenu: (menuTemplate) => ipcRenderer.invoke('update-application-menu', menuTemplate),
    
    // Get path
    getPath: (name) => ipcRenderer.invoke('getPath', name),
    
    // Join paths (platform-specific)
    joinPaths: (basePath, ...paths) => ipcRenderer.invoke('joinPaths', basePath, ...paths),
    
    // Check if file exists
    fileExists: (filePath) => ipcRenderer.invoke('fileExists', filePath),
    
    // Save pipeline state to file
    savePipelineStateToFile: (pipelineState) => ipcRenderer.invoke('save-pipeline-state-to-file', pipelineState),
    
    // Expose ipcRenderer for event listeners
    ipcRenderer: ipcRenderer,
    
    // Listen for audio files dropped event
    onAudioFilesDropped: (callback) => {
      ipcRenderer.on('audio-files-dropped', (event, filePaths) => callback(filePaths));
    }
  }
);

// Add methods to get the real path of a file
contextBridge.exposeInMainWorld(
  'electronFileSystem', {
    // Get the real path of a file
    getRealPath: (file) => {
      try {
        // Log the file object for debugging
        console.log('getRealPath file:', file);
        
        // In Electron, we need to use IPC to get the file path
        // because nodeIntegration is false
        return ipcRenderer.invoke('get-file-path', {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        });
      } catch (error) {
        console.error('Error getting real path:', error);
        return Promise.resolve(null);
      }
    },
    
    // Get real paths for multiple files
    getRealPaths: (files) => {
      try {
        // Log the files for debugging
        console.log('getRealPaths files:', files);
        
        // Use IPC to get file paths
        return ipcRenderer.invoke('get-file-paths', Array.from(files).map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        })));
      } catch (error) {
        console.error('Error getting real paths:', error);
        return Promise.resolve([]);
      }
    },
    
    // Handle dropped files
    handleDroppedFiles: (files) => {
      try {
        console.log('Handling dropped files in preload:', files.length);
        
        // Get file paths directly
        const filePaths = Array.from(files).map(file => file.path).filter(Boolean);
        console.log('File paths in preload:', filePaths);
        
        // If we have file paths, send them to main process
        if (filePaths.length > 0) {
          return ipcRenderer.invoke('handle-dropped-files-with-paths', filePaths);
        }
        
        // Fallback: send file info to main process
        return ipcRenderer.invoke('handle-dropped-files', Array.from(files).map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        })));
      } catch (error) {
        console.error('Error handling dropped files:', error);
        return Promise.resolve([]);
      }
    },
    
    // Handle dropped preset file
    handleDroppedPresetFile: (file) => {
      try {
        console.log('Handling dropped preset file in preload:', file.name);
        
        // Send file info to main process to get path
        return ipcRenderer.invoke('handle-dropped-preset-file', {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        });
      } catch (error) {
        console.error('Error handling dropped preset file:', error);
        return Promise.resolve(null);
      }
    }
  }
);

// Note: We're not adding drag and drop event listeners here anymore
// to avoid conflicts with the existing drag and drop functionality
// The existing functionality is implemented in main.js
