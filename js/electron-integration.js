/**
 * Electron integration module for EffeTune
 * Provides desktop-specific functionality when running in Electron
 */

// Import path module for file operations
const path = window.require ? window.require('path') : { basename: (p, ext) => p.split('/').pop().replace(ext, '') };

class ElectronIntegration {
  constructor() {
    // More robust detection of Electron environment
    const userAgent = navigator.userAgent.toLowerCase();
    const isElectronUA = userAgent.indexOf(' electron/') > -1;
    this.isElectron = window.electronAPI !== undefined || isElectronUA;
    this.audioPreferences = null;
    
    // Initialize event listeners if running in Electron
    if (this.isElectron) {
      console.log('Running in Electron environment, initializing event listeners');
      this.initEventListeners();
      this.loadAudioPreferences();
      this.patchDocumentationLinks();
    }
  }

  /**
   * Update the application menu with translated labels
   * This method is called when translations are loaded
   */
  updateApplicationMenu() {
    if (!this.isElectron || !window.uiManager) return;
    
    try {
      // Get the t function from UIManager
      const t = window.uiManager.t.bind(window.uiManager);
      
      // Create a menu template with translated labels
      const menuTemplate = {
        file: {
          label: t('menu.file'),
          submenu: [
            { label: t('menu.file.save') },
            { label: t('menu.file.saveAs') },
            { type: 'separator' },
            { label: t('menu.file.processAudioFiles') },
            { type: 'separator' },
            { label: t('menu.file.exportPreset') },
            { label: t('menu.file.importPreset') },
            { type: 'separator' },
            { label: t('menu.file.quit') }
          ]
        },
        edit: {
          label: t('menu.edit'),
          submenu: [
            { label: t('menu.edit.undo') },
            { label: t('menu.edit.redo') },
            { type: 'separator' },
            { label: t('menu.edit.cut') },
            { label: t('menu.edit.copy') },
            { label: t('menu.edit.paste') },
            { type: 'separator' },
            { label: t('menu.edit.delete') },
            { label: t('menu.edit.selectAll') }
          ]
        },
        view: {
          label: t('menu.view'),
          submenu: [
            { label: t('menu.view.reload') },
            { type: 'separator' },
            { label: t('menu.view.resetZoom') },
            { label: t('menu.view.zoomIn') },
            { label: t('menu.view.zoomOut') },
            { type: 'separator' },
            { label: t('menu.view.toggleFullscreen') }
          ]
        },
        settings: {
          label: t('menu.settings'),
          submenu: [
            { label: t('menu.settings.audioDevices') }
          ]
        },
        help: {
          label: t('menu.help'),
          submenu: [
            { label: t('menu.help.help') },
            { type: 'separator' },
            { label: t('menu.help.about') }
          ]
        }
      };
      
      // Send the translated menu template to the main process
      if (window.electronAPI) {
        window.electronAPI.updateApplicationMenu(menuTemplate)
          .catch(error => {
            // Only log errors, not success
            console.error('Failed to update application menu:', error);
          });
      }
    } catch (error) {
      console.error('Error updating application menu:', error);
    }
  }

  /**
   * Patch document links to use local markdown files in Electron
   */
  patchDocumentationLinks() {
    // Override the getLocalizedDocPath method in UIManager when it's available
    const waitForUIManager = setInterval(() => {
      if (window.uiManager) {
        const originalGetLocalizedDocPath = window.uiManager.getLocalizedDocPath;
        
        window.uiManager.getLocalizedDocPath = (basePath) => {
          // If we're in Electron, convert paths to local markdown files
          if (this.isElectron) {
            console.log('Converting doc path for Electron:', basePath);
            
            // Handle the main readme
            if (basePath === '/readme.md' || basePath === '/') {
              const language = window.uiManager.userLanguage;
              if (language) {
                return `docs/i18n/${language}/readme.md`;
              }
              return 'readme.md';
            }
            
            // Handle plugin documentation
            if (basePath.startsWith('/plugins/')) {
              const language = window.uiManager.userLanguage;
              // Remove .html extension and any hash
              let cleanPath = basePath.replace('.html', '').split('#')[0];
              // Store the anchor if present
              const anchor = basePath.includes('#') ? basePath.split('#')[1] : '';
              
              if (language) {
                return `docs/i18n/${language}${cleanPath}.md${anchor ? '#' + anchor : ''}`;
              }
              return `docs${cleanPath}.md${anchor ? '#' + anchor : ''}`;
            }
            
            // Handle index.html or empty path
            if (basePath === '/index.html' || basePath === './') {
              const language = window.uiManager.userLanguage;
              if (language) {
                return `docs/i18n/${language}/readme.md`;
              }
              return 'readme.md';
            }
            
            // For other paths, just convert to local path
            const language = window.uiManager.userLanguage;
            if (language && !basePath.includes(`/i18n/${language}/`)) {
              // Make sure the path has a file extension
              if (!basePath.includes('.')) {
                return `docs/i18n/${language}${basePath}/readme.md`;
              }
              return `docs/i18n/${language}${basePath}`;
            }
            
            // Make sure the path has a file extension
            if (!basePath.includes('.')) {
              return `docs${basePath}/readme.md`;
            }
            return `docs${basePath}`;
          }
          
          // If not in Electron, use the original method
          return originalGetLocalizedDocPath(basePath);
        };
        
        // Also patch the PipelineManager's method if it exists
        if (window.uiManager.pipelineManager) {
          window.uiManager.pipelineManager.getLocalizedDocPath = window.uiManager.getLocalizedDocPath.bind(window.uiManager);
        }
        
        clearInterval(waitForUIManager);
      }
    }, 100);
  }

  /**
   * Initialize event listeners for Electron menu actions
   */
  initEventListeners() {
    // Listen for export preset request from main process
    window.electronAPI.onExportPreset(() => {
      this.exportPreset();
    });

    // Listen for import preset request from main process
    window.electronAPI.onImportPreset(() => {
      this.importPreset();
    });
    
    // Listen for open preset file request from main process
    window.electronAPI.onOpenPresetFile((filePath) => {
      this.openPresetFile(filePath);
    });
    
    // Listen for process audio files request from main process
    window.electronAPI.onProcessAudioFiles(() => {
      console.log('Process audio files menu item clicked');
      this.processAudioFiles();
    });
    
    // Listen for save preset request from main process
    window.electronAPI.onSavePreset(() => {
      console.log('Save preset menu item clicked');
      this.exportPreset(); // Reuse export preset functionality
    });
    
    // Listen for save preset as request from main process
    window.electronAPI.onSavePresetAs(() => {
      console.log('Save preset as menu item clicked');
      this.exportPreset(); // Reuse export preset functionality
    });
    
    // Listen for config audio request from main process
    window.electronAPI.onConfigAudio(() => {
      console.log('Config audio menu item clicked');
      this.showAudioConfigDialog();
    });
    
    // Listen for show about dialog request from main process
    window.electronAPI.onShowAboutDialog((data) => {
      console.log('About menu item clicked');
      this.showAboutDialog(data);
    });
    
    console.log('Electron event listeners initialized');
  }
  
  /**
   * Open a preset file from the file system
   * @param {string} filePath - Path to the preset file
   */
  async openPresetFile(filePath) {
    if (!this.isElectron || !window.uiManager) {
      console.error('Cannot open preset file: Electron integration or UI manager not available');
      return;
    }
    
    try {
      console.log('Opening preset file:', filePath);
      
      // Verify file exists and has correct extension
      if (!filePath.endsWith('.effetune_preset')) {
        console.error('Not a preset file:', filePath);
        window.uiManager.setError('Not a valid preset file');
        setTimeout(() => window.uiManager.clearError(), 3000);
        return;
      }
      
      // Read file
      console.log('Reading preset file...');
      const readResult = await window.electronAPI.readFile(filePath);
      
      if (!readResult.success) {
        console.error('Failed to read preset file:', readResult.error);
        window.uiManager.setError(`Failed to read preset file: ${readResult.error}`);
        setTimeout(() => window.uiManager.clearError(), 3000);
        return;
      }
      
      // Parse the file content
      console.log('Parsing preset file content...');
      let fileData;
      try {
        fileData = JSON.parse(readResult.content);
      } catch (parseError) {
        console.error('Failed to parse preset file JSON:', parseError);
        window.uiManager.setError('Invalid preset file format');
        setTimeout(() => window.uiManager.clearError(), 3000);
        return;
      }
      
      let presetData;
      
      // Handle different formats for backward compatibility
      if (Array.isArray(fileData)) {
        console.log('Detected old preset format (array)');
        // Old format: direct array of pipeline plugins
        presetData = {
          name: path.basename(filePath, '.effetune_preset'),
          timestamp: Date.now(),
          pipeline: fileData
        };
      } else if (fileData.pipeline) {
        console.log('Detected new preset format (object with pipeline)');
        // New format: complete preset object
        presetData = fileData;
        // Update timestamp to current time
        presetData.timestamp = Date.now();
        // If no name is provided, use the filename
        if (!presetData.name) {
          presetData.name = path.basename(filePath, '.effetune_preset');
        }
      } else {
        // Unknown format
        console.error('Unknown preset format:', fileData);
        window.uiManager.setError('Unknown preset format');
        setTimeout(() => window.uiManager.clearError(), 3000);
        return;
      }
      
      // Set name to filename for display in UI
      const fileName = path.basename(filePath, '.effetune_preset');
      presetData.name = fileName;
      
      // Load the preset
      console.log('Loading preset into UI:', fileName);
      window.uiManager.loadPreset(presetData);
      
      // Display message with filename
      window.uiManager.setError(`Preset "${fileName}" loaded!`);
      setTimeout(() => window.uiManager.clearError(), 3000);
    } catch (error) {
      console.error('Error opening preset file:', error);
      window.uiManager.setError(`Error opening preset file: ${error.message}`);
      setTimeout(() => window.uiManager.clearError(), 3000);
    }
  }

  /**
   * Load saved audio preferences
   */
  async loadAudioPreferences() {
    if (!this.isElectron) return null;
    
    try {
      const result = await window.electronAPI.loadAudioPreferences();
      if (result.success && result.preferences) {
        this.audioPreferences = result.preferences;
      }
      return this.audioPreferences;
    } catch (error) {
      console.error('Failed to load audio preferences:', error);
      return null;
    }
  }

  /**
   * Save audio preferences
   * @param {Object} preferences - Audio device preferences
   */
  async saveAudioPreferences(preferences) {
    if (!this.isElectron) return false;
    
    try {
      this.audioPreferences = preferences;
      const result = await window.electronAPI.saveAudioPreferences(preferences);
      return result.success;
    } catch (error) {
      console.error('Failed to save audio preferences:', error);
      return false;
    }
  }

  /**
   * Get available audio devices
   * @returns {Promise<Array>} List of audio devices
   */
  async getAudioDevices() {
    if (!this.isElectron) return [];
    
    try {
      const result = await window.electronAPI.getAudioDevices();
      if (result.success) {
        return result.devices;
      }
      return [];
    } catch (error) {
      console.error('Failed to get audio devices:', error);
      return [];
    }
  }

  /**
   * Show audio configuration dialog
   * @param {Function} callback - Callback function to be called when devices are selected
   */
  async showAudioConfigDialog(callback) {
    if (!this.isElectron) return;
    
    try {
      // Show "Configuring audio devices..." message
      if (window.uiManager) {
        window.uiManager.setError('status.configuringAudio');
      }
      
      // Get available audio devices
      const devices = await this.getAudioDevices();
      
      // Group devices by kind
      const inputDevices = devices.filter(device => device.kind === 'audioinput');
      const outputDevices = devices.filter(device => device.kind === 'audiooutput');
      
      // Get current sample rate preference or default to 96000
      const currentSampleRate = this.audioPreferences?.sampleRate || 96000;
      
      // Add window close event listener to clear error message
      const clearErrorOnClose = () => {
        if (window.uiManager) {
          window.uiManager.clearError();
        }
        window.removeEventListener('beforeunload', clearErrorOnClose);
      };
      window.addEventListener('beforeunload', clearErrorOnClose);
      
      // Get translation function from UIManager
      if (!window.uiManager) {
        console.error('UIManager not available for translations');
        return;
      }
      const t = window.uiManager.t.bind(window.uiManager);
      
      // Create dialog HTML
      const dialogHTML = `
        <div class="audio-config-dialog">
          <h2>${t('dialog.audioConfig.title')}</h2>
          <div class="device-section">
            <label for="input-device">${t('dialog.audioConfig.inputDevice')}</label>
            <select id="input-device">
              ${inputDevices.map(device =>
                `<option value="${device.deviceId}" ${this.audioPreferences?.inputDeviceId === device.deviceId ? 'selected' : ''}>${device.label}</option>`
              ).join('')}
            </select>
          </div>
          <div class="device-section">
            <label for="output-device">${t('dialog.audioConfig.outputDevice')}</label>
            <select id="output-device">
              ${outputDevices.map(device =>
                `<option value="${device.deviceId}" ${this.audioPreferences?.outputDeviceId === device.deviceId ? 'selected' : ''}>${device.label}</option>`
              ).join('')}
            </select>
          </div>
          <div class="device-section">
            <label for="sample-rate">${t('dialog.audioConfig.sampleRate')}</label>
            <select id="sample-rate">
              <option value="44100" ${currentSampleRate === 44100 ? 'selected' : ''}>44.1 kHz</option>
              <option value="48000" ${currentSampleRate === 48000 ? 'selected' : ''}>48 kHz</option>
              <option value="88200" ${currentSampleRate === 88200 ? 'selected' : ''}>88.2 kHz</option>
              <option value="96000" ${currentSampleRate === 96000 ? 'selected' : ''}>96 kHz (Default)</option>
              <option value="176400" ${currentSampleRate === 176400 ? 'selected' : ''}>176.4 kHz</option>
              <option value="192000" ${currentSampleRate === 192000 ? 'selected' : ''}>192 kHz</option>
              <option value="352800" ${currentSampleRate === 352800 ? 'selected' : ''}>352.8 kHz</option>
              <option value="384000" ${currentSampleRate === 384000 ? 'selected' : ''}>384 kHz</option>
            </select>
          </div>
          <div class="dialog-buttons">
            <button id="cancel-button">${t('dialog.audioConfig.cancel')}</button>
            <button id="apply-button">${t('dialog.audioConfig.apply')}</button>
          </div>
        </div>
      `;
      
      // Create dialog element
      const dialogElement = document.createElement('div');
      dialogElement.className = 'modal-overlay';
      dialogElement.innerHTML = dialogHTML;
      document.body.appendChild(dialogElement);
      
      // Add dialog styles
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .audio-config-dialog {
          background-color: #222;
          border-radius: 8px;
          padding: 20px;
          width: 400px;
          color: #fff;
        }
        .device-section {
          margin-bottom: 15px;
        }
        .device-section label {
          display: block;
          margin-bottom: 5px;
        }
        .device-section select {
          width: 100%;
          padding: 8px;
          background-color: #333;
          color: #fff;
          border: 1px solid #444;
          border-radius: 4px;
        }
        .dialog-buttons {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
        }
        .dialog-buttons button {
          padding: 8px 16px;
          margin-left: 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        #cancel-button {
          background-color: #555;
          color: #fff;
        }
        #apply-button {
          background-color: #007bff;
          color: #fff;
        }
      `;
      document.head.appendChild(styleElement);
      
      // Add event listeners
      const cancelButton = document.getElementById('cancel-button');
      const applyButton = document.getElementById('apply-button');
      const inputSelect = document.getElementById('input-device');
      const outputSelect = document.getElementById('output-device');
      
      // Cancel button
      cancelButton.addEventListener('click', () => {
        document.body.removeChild(dialogElement);
        document.head.removeChild(styleElement);
        // Clear the "Configuring audio devices..." message
        if (window.uiManager) {
          window.uiManager.clearError();
        }
      });
      
      // Apply button
      applyButton.addEventListener('click', async () => {
        const inputDeviceId = inputSelect.value;
        const outputDeviceId = outputSelect.value;
        
        // Get selected device labels
        const inputDevice = inputDevices.find(d => d.deviceId === inputDeviceId);
        const outputDevice = outputDevices.find(d => d.deviceId === outputDeviceId);
        
        // Get selected sample rate
        const sampleRateSelect = document.getElementById('sample-rate');
        const selectedSampleRate = parseInt(sampleRateSelect.value, 10);
        
        const preferences = {
          inputDeviceId,
          outputDeviceId,
          inputDeviceLabel: inputDevice?.label || '',
          outputDeviceLabel: outputDevice?.label || '',
          sampleRate: selectedSampleRate
        };
        
        console.log('Saving audio preferences');
        
        // Save preferences
        const saveResult = await this.saveAudioPreferences(preferences);
        
        // Close dialog
        document.body.removeChild(dialogElement);
        document.head.removeChild(styleElement);
        
        // Clear the "Configuring audio devices..." message
        // Note: We don't clear the error message here because we're about to show a new message
        // and reload the page. The error will be cleared when the page reloads.
        
        // Get translation function from UIManager
        if (!window.uiManager) {
          console.error('UIManager not available for translations');
          return;
        }
        const t = window.uiManager.t.bind(window.uiManager);
        
        // Show message about reloading
        const messageElement = document.createElement('div');
        messageElement.style.position = 'fixed';
        messageElement.style.top = '50%';
        messageElement.style.left = '50%';
        messageElement.style.transform = 'translate(-50%, -50%)';
        messageElement.style.backgroundColor = '#222';
        messageElement.style.color = '#fff';
        messageElement.style.padding = '20px';
        messageElement.style.borderRadius = '8px';
        messageElement.style.zIndex = '1000';
        messageElement.style.textAlign = 'center';
        messageElement.innerHTML = `<h3>${t('dialog.audioConfig.updatedTitle')}</h3><p>${t('dialog.audioConfig.updatedMessage')}</p>`;
        document.body.appendChild(messageElement);
        
        // Wait a moment to show the message, then reload using Electron's API
        setTimeout(() => {
          // Save preferences to localStorage as a backup
          try {
            localStorage.setItem('temp_audio_preferences', JSON.stringify(preferences));
            console.log('Audio preferences saved to localStorage');
          } catch (e) {
            console.error('Failed to save preferences to localStorage:', e);
          }
          
          console.log('Requesting reload via Electron IPC...');
          
          // Use Electron's IPC to request a reload from the main process
          // This is more reliable in Electron than using window.location methods
          if (window.electronAPI) {
            // Send a message to the main process to reload the window
            window.electronAPI.reloadWindow()
              .then(() => {
                console.log('Reload request sent successfully');
              })
              .catch(error => {
                console.error('Error sending reload request:', error);
                
                // As a last resort, try direct reload methods
                console.log('Trying direct reload methods as fallback...');
                try {
                  // Try multiple reload methods as fallbacks
                  window.location.href = window.location.href + '?t=' + Date.now();
                  setTimeout(() => {
                    window.location.reload(true);
                  }, 100);
                } catch (e) {
                  console.error('All reload attempts failed:', e);
                }
              });
          } else {
            // Fallback for non-Electron environment
            console.log('Electron API not available, using direct reload...');
            window.location.reload(true);
          }
        }, 1500);
      });
    } catch (error) {
      console.error('Failed to show audio config dialog:', error);
    }
  }

  /**
   * Export current preset to a file
   */
  async exportPreset() {
    if (!this.isElectron || !window.uiManager) return;

    try {
      // Get current preset data
      const presetData = window.uiManager.getCurrentPresetData();
      if (!presetData) {
        console.error('No preset data available');
        return;
      }

      // Show save dialog
      const result = await window.electronAPI.showSaveDialog({
        title: 'Export Preset',
        defaultPath: `${presetData.name || 'preset'}.effetune_preset`,
        filters: [
          { name: 'EffeTune Preset Files', extensions: ['effetune_preset'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) return;

      // Remove name property from preset data before saving
      const { name, ...presetDataWithoutName } = presetData;
      
      // Save the preset data object without name
      const saveResult = await window.electronAPI.saveFile(
        result.filePath,
        JSON.stringify(presetDataWithoutName, null, 2)
      );

      if (!saveResult.success) {
        console.error('Failed to save preset:', saveResult.error);
      }
    } catch (error) {
      console.error('Error exporting preset:', error);
    }
  }

  /**
   * Import preset from a file
   */
  async importPreset() {
    if (!this.isElectron || !window.uiManager) return;

    try {
      // Show open dialog
      const result = await window.electronAPI.showOpenDialog({
        title: 'Import Preset',
        filters: [
          { name: 'EffeTune Preset Files', extensions: ['effetune_preset'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) return;

      // Read file
      const readResult = await window.electronAPI.readFile(result.filePaths[0]);
      
      if (!readResult.success) {
        console.error('Failed to read preset:', readResult.error);
        return;
      }

      // Parse the file content
      const fileData = JSON.parse(readResult.content);
      
      let presetData;
      
      // Handle different formats for backward compatibility
      if (Array.isArray(fileData)) {
        // Old format: direct array of pipeline plugins
        presetData = {
          name: 'Imported Preset',
          timestamp: Date.now(),
          pipeline: fileData
        };
      } else if (fileData.pipeline) {
        // New format: complete preset object
        presetData = fileData;
        // Update timestamp to current time
        presetData.timestamp = Date.now();
        // If no name is provided, use a default
        if (!presetData.name) {
          presetData.name = 'Imported Preset';
        }
      } else {
        // Unknown format
        console.error('Unknown preset format');
        return;
      }
      
      // Set name to filename for display in UI
      const fileName = path.basename(result.filePaths[0], '.effetune_preset');
      presetData.name = fileName;
      
      // Load the preset
      window.uiManager.loadPreset(presetData);
      
      // Display message with filename
      window.uiManager.setError(`Preset "${fileName}" loaded!`);
      setTimeout(() => window.uiManager.clearError(), 3000);
    } catch (error) {
      console.error('Error importing preset:', error);
    }
  }

  /**
   * Process audio files with current effects
   * This function is called when the user selects "Process Audio Files with Effects" from the File menu
   */
  processAudioFiles() {
    if (!this.isElectron) return;
    
    console.log('Processing audio files from menu...');
    
    try {
      // Use Electron's dialog to select files directly
      // This is a more reliable approach than trying to trigger a click on a DOM element
      window.electronAPI.showOpenDialog({
        title: 'Select Audio Files to Process',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      }).then(result => {
        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
          console.log('File selection canceled or no files selected');
          return;
        }
        
        console.log(`Selected ${result.filePaths.length} files:`, result.filePaths);
        
        // Find the pipeline manager
        if (!window.uiManager || !window.uiManager.pipelineManager) {
          console.error('Could not find pipeline manager');
          if (window.uiManager) {
            window.uiManager.setError('Failed to process audio files: Pipeline manager not found');
          }
          return;
        }
        
        const dropArea = window.uiManager.pipelineManager.dropArea;
        if (!dropArea) {
          console.error('Could not find drop area');
          window.uiManager.setError('Failed to process audio files: Drop area not found');
          return;
        }
        
        // Get the drop area's position
        const dropAreaRect = dropArea.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Calculate the scroll position to make the drop area visible
        // We want the drop area to be in the lower part of the screen, but still fully visible
        const targetScrollPosition = window.scrollY + dropAreaRect.top - (windowHeight * 0.3);
        
        console.log('Scrolling to position:', targetScrollPosition);
        
        // Scroll to the calculated position
        window.scrollTo({
          top: targetScrollPosition,
          behavior: 'smooth'
        });
        
        // Convert file paths to File objects
        Promise.all(result.filePaths.map(async (filePath) => {
          try {
            // Read file content as binary
            const fileResult = await window.electronAPI.readFile(filePath, true); // true for binary
            if (!fileResult.success) {
              throw new Error(`Failed to read file: ${fileResult.error}`);
            }
            
            // Get file name from path
            const fileName = filePath.split(/[\\/]/).pop();
            
            // Convert base64 to ArrayBuffer
            const binaryString = atob(fileResult.content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Create a File object
            const blob = new Blob([bytes.buffer], { type: this.getAudioMimeType(fileName) });
            return new File([blob], fileName, { type: blob.type });
          } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
            window.uiManager.setError(`Error processing file ${filePath}: ${error.message}`);
            return null;
          }
        })).then(files => {
          // Filter out any failed files
          const validFiles = files.filter(file => file);
          
          if (validFiles.length === 0) {
            window.uiManager.setError('No valid audio files selected');
            return;
          }
          
          // Process the files
          setTimeout(() => {
            console.log('Processing files with pipeline manager');
            window.uiManager.pipelineManager.processDroppedAudioFiles(validFiles);
          }, 300);
        }).catch(error => {
          console.error('Error preparing files:', error);
          window.uiManager.setError(`Error preparing files: ${error.message}`);
        });
      }).catch(error => {
        console.error('Error showing open dialog:', error);
        window.uiManager.setError(`Error showing open dialog: ${error.message}`);
      });
    } catch (error) {
      console.error('Error processing audio files:', error);
      if (window.uiManager) {
        window.uiManager.setError(`Error processing audio files: ${error.message}`);
      }
    }
  }
  
  /**
   * Get MIME type for audio file based on extension
   * @param {string} fileName - File name with extension
   * @returns {string} MIME type
   */
  getAudioMimeType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'flac': 'audio/flac',
      'm4a': 'audio/mp4',
      'aac': 'audio/aac'
    };
    
    return mimeTypes[extension] || 'audio/mpeg'; // Default to audio/mpeg
  }

  /**
   * Show about dialog
   * @param {Object} data - Data for the about dialog
   * @param {string} data.version - App version
   * @param {string} data.icon - Path to app icon
   */
  async showAboutDialog(data) {
    if (!this.isElectron) return;
    
    try {
      // Create dialog HTML
      const dialogHTML = `
        <div class="about-dialog">
          <div class="about-header">
            <img src="images/icon_64x64.png" class="about-icon" alt="EffeTune Icon">
            <h2>Frieve EffeTune</h2>
          </div>
          <div class="about-content">
            <div class="about-version">Version ${data.version}</div>
            <div class="about-description">Desktop Audio Effect Processor</div>
            <div class="about-copyright">Copyright © Frieve 2025</div>
          </div>
          <div class="dialog-buttons">
            <button id="close-button">Close</button>
          </div>
        </div>
      `;
      
      // Create dialog element
      const dialogElement = document.createElement('div');
      dialogElement.className = 'modal-overlay';
      dialogElement.innerHTML = dialogHTML;
      document.body.appendChild(dialogElement);
      
      // Add dialog styles
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .about-dialog {
          background-color: #222;
          border-radius: 8px;
          padding: 20px;
          width: 400px;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .about-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 20px;
        }
        .about-icon {
          width: 64px;
          height: 64px;
          margin-bottom: 10px;
        }
        .about-header h2 {
          margin: 0;
          font-size: 24px;
        }
        .about-content {
          text-align: center;
          margin-bottom: 20px;
        }
        .about-version {
          font-size: 16px;
          margin-bottom: 10px;
        }
        .about-description {
          font-size: 14px;
          color: #ccc;
          margin-bottom: 5px;
        }
        .about-copyright {
          font-size: 12px;
          color: #999;
        }
        .dialog-buttons {
          display: flex;
          justify-content: center;
          margin-top: 20px;
        }
        .dialog-buttons button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          background-color: #007bff;
          color: #fff;
        }
        .dialog-buttons button:hover {
          background-color: #0069d9;
        }
      `;
      document.head.appendChild(styleElement);
      
      // Add event listener for close button
      const closeButton = document.getElementById('close-button');
      closeButton.addEventListener('click', () => {
        document.body.removeChild(dialogElement);
        document.head.removeChild(styleElement);
      });
    } catch (error) {
      console.error('Failed to show about dialog:', error);
    }
  }

  /**
   * Get application version from package.json
   * @returns {Promise<string>} Application version
   */
  async getAppVersion() {
    if (!this.isElectron) {
      // If not running in Electron, return empty string
      return '';
    }
    
    try {
      return await window.electronAPI.getAppVersion();
    } catch (error) {
      console.error('Failed to get app version:', error);
      return '';
    }
  }

  /**
   * Check if running in Electron environment
   * @returns {boolean} True if running in Electron
   */
  isElectronEnvironment() {
    // More robust detection of Electron environment
    const userAgent = navigator.userAgent.toLowerCase();
    const isElectronUA = userAgent.indexOf(' electron/') > -1;
    
    // Update isElectron property with more robust detection
    this.isElectron = window.electronAPI !== undefined || isElectronUA;
    console.log('Electron environment detected:', this.isElectron);
    
    return this.isElectron;
  }
}

// Export the ElectronIntegration class
export const electronIntegration = new ElectronIntegration();