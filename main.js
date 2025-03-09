const { app, BrowserWindow, Menu, dialog, ipcMain, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const { systemPreferences } = require('electron');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

// Get app version from package.json
const packageJson = require('./package.json');
const appVersion = packageJson.version;

// Handle file associations and command line arguments
let fileToOpen = null;

// Create the main application window
function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, 'favicon.ico'),
    acceptFirstMouse: true, // Accept mouse events on window activation
    webPreferences: {
      nodeIntegration: false, // Security: Keep Node.js integration disabled
      contextIsolation: true, // Security: Enable context isolation
      preload: path.join(__dirname, 'preload.js'), // Use a preload script for safe IPC
      // Note: The following settings are for development only and should be removed for production
      webSecurity: false, // Allow file drag and drop
      allowRunningInsecureContent: process.env.NODE_ENV === 'development' ? true : false,
      // Disable Electron's built-in zoom functionality
      zoomFactor: 1.0
    }
  });
  
  // Enable file drag and drop for the window
  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    // Download event handler
  });
  
  // Enable file drag and drop explicitly
  mainWindow.webContents.on('did-finish-load', () => {
    // Execute JavaScript to enable file drag and drop
    mainWindow.webContents.executeJavaScript(`
      // Override default drag and drop behavior
      // Only prevent default for file drags, allow UI element drags
      document.addEventListener('dragover', (e) => {
        // Check if this is a file drag
        if (e.dataTransfer && e.dataTransfer.items && Array.from(e.dataTransfer.items).some(item => item.kind === 'file')) {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
          
          // Check for preset files
          const items = Array.from(e.dataTransfer.items);
          const hasPresetFiles = items.some(item =>
            item.kind === 'file' &&
            (item.type === '' || item.type === 'application/octet-stream')
          );
          
          if (hasPresetFiles) {
            // Add visual feedback for preset files
            document.body.classList.add('drag-over');
          }
          
          return false;
        }
      }, true); // Use capture phase
      
      // Handle dragleave for file drags
      document.addEventListener('dragleave', (e) => {
        // Only handle if we're leaving the document and it's a file drag
        if ((!e.relatedTarget || e.relatedTarget === document.documentElement) &&
            document.body.classList.contains('drag-over')) {
          document.body.classList.remove('drag-over');
        }
      }, true); // Use capture phase
      
      // Only prevent default for file drops, allow UI element drops
      document.addEventListener('drop', (e) => {
        // Check if this is a file drop
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          document.body.classList.remove('drag-over');
          return false;
        }
      }, true); // Use capture phase
      
      // Add CSS for drag-over effect if it doesn't exist
      if (!document.getElementById('drag-drop-style')) {
        const style = document.createElement('style');
        style.id = 'drag-drop-style';
        style.textContent = \`
          body.drag-over::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 120, 255, 0.1);
            border: 2px dashed rgba(0, 120, 255, 0.5);
            pointer-events: none;
            z-index: 9999;
          }
        \`;
        document.head.appendChild(style);
      }
      
    `).catch(err => {
      console.error('Failed to initialize drag and drop handlers:', err);
    });
  });
  
  // Register keyboard shortcuts
  const { globalShortcut } = require('electron');
  
  // Register Ctrl+Shift+I to toggle DevTools
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });
  
  // F1 key is now handled in the renderer process (js/app.js)
  // This allows the same behavior in both web and Electron environments

  // Load the app's HTML file
  mainWindow.loadFile('effetune.html');

  // Combined event handler for page load
  mainWindow.webContents.on('did-finish-load', () => {
    // 1. Disable Electron's built-in zoom functionality
    mainWindow.webContents.setZoomFactor(1.0);
    
    // 2. Set initial zoom level to 1.0 (100%) on every page load
    mainWindow.webContents.executeJavaScript(`
      // Ensure zoom is always reset to 100% on page load
      document.body.style.zoom = 1.0;
      
      // Store the initial zoom in localStorage for reference
      localStorage.setItem('initialZoom', '1.0');
      
      // Set first launch flag for audio workaround
      window.isFirstLaunch = ${isFirstLaunch};
      console.log('Setting window.isFirstLaunch to:', ${isFirstLaunch});
    `).catch(err => {
      console.error('Error setting initial zoom:', err);
    });

    // 3. Enable wheel-based zooming by injecting JavaScript
    mainWindow.webContents.executeJavaScript(`
      // Add event listener for wheel events with Ctrl key
      document.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
          // Use an IIFE to create a local scope for variables
          (function() {
            // Prevent the default browser zoom behavior
            e.preventDefault();
            
            // Get the current zoom level from the body's style or default to 1
            const zoom = parseFloat(document.body.style.zoom || '1');
            
            // Calculate new zoom level (zoom in or out based on wheel direction)
            let newZoom = zoom;
            if (e.deltaY < 0) {
              // Zoom in
              newZoom = Math.min(zoom + 0.1, 3.0); // Max zoom: 300%
            } else {
              // Zoom out
              newZoom = Math.max(zoom - 0.1, 0.3); // Min zoom: 30%
            }
            
            // Apply the new zoom level to the body
            document.body.style.zoom = newZoom;
          })();
        }
      });
    `).catch(err => {
      console.error('Error setting up wheel zoom:', err);
    });
  });

  // Enable file drop events
  mainWindow.webContents.on('will-navigate', (e) => {
    e.preventDefault();
  });
  
  // Enable file drag and drop
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Prevent opening new windows
    return { action: 'deny' };
  });

  // Set up the application menu
  createMenu();
  
  // Handle file to open if specified via command line
  if (fileToOpen) {
    mainWindow.webContents.on('did-finish-load', () => {
      // Wait for the page to fully load before sending the file path
      setTimeout(() => {
        mainWindow.webContents.send('open-preset-file', fileToOpen);
        fileToOpen = null; // Reset after use
      }, 1000);
    });
  }

  // Open DevTools in development mode
  // if (process.env.NODE_ENV === 'development') {
  //   mainWindow.webContents.openDevTools();
  // }

  // Handle window close event
  mainWindow.on('closed', () => {
    globalShortcut.unregisterAll();
    mainWindow = null;
  });
}

// Helper function to simulate keyboard shortcuts
function simulateKeyboardShortcut(keyCode, modifiers = []) {
  if (!mainWindow) return;
  
  // Send key down event
  mainWindow.webContents.sendInputEvent({
    type: 'keyDown',
    keyCode: keyCode,
    modifiers: modifiers
  });
  
  // Send key up event
  mainWindow.webContents.sendInputEvent({
    type: 'keyUp',
    keyCode: keyCode,
    modifiers: modifiers
  });
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Save',
          accelerator: 'CommandOrControl+S',
          click: () => simulateKeyboardShortcut('S', ['control'])
        },
        {
          label: 'Save As',
          accelerator: 'CommandOrControl+Shift+S',
          click: () => simulateKeyboardShortcut('S', ['control', 'shift'])
        },
        { type: 'separator' },
        {
          label: 'Process Audio Files with Effects',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('process-audio-files');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Export Preset',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('export-preset');
            }
          }
        },
        {
          label: 'Import Preset',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('import-preset');
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CommandOrControl+Z',
          click: () => simulateKeyboardShortcut('Z', ['control'])
        },
        {
          label: 'Redo',
          accelerator: 'CommandOrControl+Y',
          click: () => simulateKeyboardShortcut('Y', ['control'])
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: 'CommandOrControl+X',
          click: () => simulateKeyboardShortcut('X', ['control'])
        },
        {
          label: 'Copy',
          accelerator: 'CommandOrControl+C',
          click: () => simulateKeyboardShortcut('C', ['control'])
        },
        {
          label: 'Paste',
          accelerator: 'CommandOrControl+V',
          click: () => simulateKeyboardShortcut('V', ['control'])
        },
        { type: 'separator' },
        {
          label: 'Delete',
          accelerator: 'Delete',
          click: () => simulateKeyboardShortcut('Delete')
        },
        {
          label: 'Select All',
          accelerator: 'CommandOrControl+A',
          click: () => simulateKeyboardShortcut('A', ['control'])
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CommandOrControl+R',
          click: () => {
            if (mainWindow) {
              // First ensure we reset any custom zoom
              mainWindow.webContents.executeJavaScript(`
                // Reset zoom before reload
                document.body.style.zoom = 1.0;
              `).catch(err => {
                console.error('Error resetting zoom before reload:', err);
              }).finally(() => {
                // Then reload the window
                mainWindow.reload();
              });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Reset Zoom',
          accelerator: 'CommandOrControl+0',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(`
                (function() {
                  document.body.style.zoom = 1.0;
                })();
              `).catch(err => {
                console.error('Error executing zoom reset script:', err);
              });
            }
          }
        },
        {
          label: 'Zoom In',
          accelerator: 'CommandOrControl+=',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(`
                (function() {
                  const zoom = parseFloat(document.body.style.zoom || '1');
                  const newZoom = Math.min(zoom + 0.1, 3.0);
                  document.body.style.zoom = newZoom;
                })();
              `).catch(err => {
                console.error('Error executing zoom in script:', err);
              });
            }
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CommandOrControl+-',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(`
                (function() {
                  const zoom = parseFloat(document.body.style.zoom || '1');
                  const newZoom = Math.max(zoom - 0.1, 0.3);
                  document.body.style.zoom = newZoom;
                })();
              `).catch(err => {
                console.error('Error executing zoom out script:', err);
              });
            }
          }
        },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Audio Devices...',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('config-audio');
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Help',
          accelerator: 'F1', // Add F1 as the keyboard shortcut
          click: () => {
            // Simply click the "What's this app" link in the renderer process
            // This ensures the same behavior in both web and Electron environments
            if (mainWindow && mainWindow.webContents) {
              mainWindow.webContents.executeJavaScript(`
                const whatsThisLink = document.querySelector('.whats-this');
                if (whatsThisLink) {
                  whatsThisLink.click();
                }
              `).catch(error => {
                console.error('Error executing Help menu action:', error);
              });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'About...',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-about-dialog', {
                version: appVersion,
                icon: path.join(__dirname, 'favicon.ico')
              });
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Disable hardware acceleration to avoid DXGI errors
app.disableHardwareAcceleration();

// Handle file associations on Windows
if (process.platform === 'win32') {
  // Get the first command line argument (excluding the app path and the script path)
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const filePath = args[0];
    if (filePath.endsWith('.effetune_preset')) {
      fileToOpen = filePath;
    }
  }
}

// Register the app as the default handler for effetune:// protocol
app.setAsDefaultProtocolClient('effetune');

// Note: File associations for .effetune_preset should be set in the app installer
// For Windows, this is typically done in the NSIS or Electron Builder configuration
// For macOS, it's set in the Info.plist file

// Handle macOS file open events
app.on('open-file', (event, path) => {
  event.preventDefault();
  if (path.endsWith('.effetune_preset')) {
    if (mainWindow && mainWindow.webContents) {
      // If app is already running, send the file path to the renderer
      mainWindow.webContents.send('open-preset-file', path);
    } else {
      // If app is not yet running, store the path to be opened when the app is ready
      fileToOpen = path;
    }
  }
});

// Flag to track if this is the first launch (for audio workaround)
let isFirstLaunch = true;

// Initialize the app when Electron is ready
app.whenReady().then(() => {
  createWindow();

  // Create splash window with About dialog content
  let splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  // Create HTML content for splash window
  const splashContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>EffeTune</title>
    <style>
      body {
        background-color: rgba(34, 34, 34, 0.9);
        color: #fff;
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        border-radius: 8px;
        overflow: hidden;
      }
      .splash-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
        width: 100%;
      }
      .splash-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 20px;
      }
      .splash-icon {
        width: 64px;
        height: 64px;
        margin-bottom: 10px;
      }
      .splash-header h2 {
        margin: 0;
        font-size: 24px;
      }
      .splash-content {
        text-align: center;
        margin-bottom: 20px;
      }
      .splash-version {
        font-size: 16px;
        margin-bottom: 10px;
      }
      .splash-description {
        font-size: 14px;
        color: #ccc;
        margin-bottom: 5px;
      }
      .splash-copyright {
        font-size: 12px;
        color: #999;
      }
      .splash-loading {
        margin-top: 15px;
        font-size: 12px;
        color: #999;
      }
    </style>
  </head>
  <body>
    <div class="splash-container">
      <div class="splash-header">
        <img src="${path.join(__dirname, 'images/icon_64x64.png')}" class="splash-icon" alt="EffeTune Icon">
        <h2>Frieve EffeTune</h2>
      </div>
      <div class="splash-content">
        <div class="splash-version">Version ${appVersion}</div>
        <div class="splash-description">Desktop Audio Effect Processor</div>
        <div class="splash-copyright">Copyright © Frieve 2025</div>
        <div class="splash-loading">Starting application...</div>
      </div>
    </div>
  </body>
  </html>
  `;
  
  // Write splash content to a temporary file
  const splashPath = path.join(app.getPath('temp'), 'effetune-splash.html');
  fs.writeFileSync(splashPath, splashContent);
  
  // Load the splash window
  splashWindow.loadFile(splashPath);
  
  // Show splash window when ready
  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });
  
  // Workaround for audio issues: reload the window after 3 seconds
  setTimeout(() => {
    if (mainWindow) {
      isFirstLaunch = false;
      
      // Close splash window and reload main window
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      
      mainWindow.reload();
      
      // Clean up temporary splash file
      try {
        fs.unlinkSync(splashPath);
      } catch (error) {
        console.error('Error removing temporary splash file:', error);
      }
    }
  }, 3000);

  // On macOS, recreate window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle IPC messages from renderer process
ipcMain.handle('get-first-launch-flag', () => {
  return isFirstLaunch;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('save-file', async (event, filePath, content) => {
  try {
    // Check if content is a base64 string (from binary file)
    if (typeof content === 'string' && content.match(/^[A-Za-z0-9+/=]+$/)) {
      // Convert base64 to buffer
      const buffer = Buffer.from(content, 'base64');
      fs.writeFileSync(filePath, buffer);
    } else {
      // Regular text content
      fs.writeFileSync(filePath, content);
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event, filePath, binary = false) => {
  try {
    if (binary) {
      // Read as binary data (Buffer)
      const content = fs.readFileSync(filePath);
      // Convert Buffer to base64 for IPC transfer
      return {
        success: true,
        content: content.toString('base64'),
        isBinary: true
      };
    } else {
      // Read as UTF-8 text
      const content = fs.readFileSync(filePath, 'utf8');
      return { success: true, content };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get audio devices
ipcMain.handle('get-audio-devices', async () => {
  try {
    // Get input devices (microphones)
    const inputDevices = await systemPreferences.getMediaAccessStatus('microphone');
    if (inputDevices !== 'granted') {
      await systemPreferences.askForMediaAccess('microphone');
    }
    
    // Use Electron's built-in method to get audio devices
    const devices = await mainWindow.webContents.executeJavaScript(`
      navigator.mediaDevices.enumerateDevices()
        .then(async devices => {
          // Remove excessive logging
          // console.log('All available devices:', devices);
          
          // Get additional device information including sample rates
          const deviceList = devices
            .filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
            .map(device => ({
              deviceId: device.deviceId,
              kind: device.kind,
              label: device.label || (device.kind === 'audioinput' ? 'Microphone ' : 'Speaker ') + device.deviceId.substring(0, 5)
            }));
          
          // We don't need to try to determine sample rates here
          // The actual sample rate will be determined when the device is opened
          // and the AudioContext is created
          console.log('Device enumeration complete');
          
          return deviceList;
        })
        .catch(err => {
          console.error('Error enumerating devices:', err);
          return [];
        });
    `);
    
    // Remove excessive logging
    // console.log('Available audio devices with sample rates:', devices);
    return { success: true, devices };
  } catch (error) {
    console.error('Error getting audio devices:', error);
    return { success: false, error: error.message };
  }
});

// Save audio device preferences
ipcMain.handle('save-audio-preferences', async (event, preferences) => {
  try {
    // Remove excessive logging
    // console.log('Main process: Saving audio preferences:', preferences);
    const prefsPath = path.join(app.getPath('userData'), 'audio-preferences.json');
    // console.log('Main process: Preferences path:', prefsPath);
    fs.writeFileSync(prefsPath, JSON.stringify(preferences, null, 2));
    // console.log('Main process: Preferences saved successfully');
    return { success: true };
  } catch (error) {
    console.error('Main process: Error saving preferences:', error);
    return { success: false, error: error.message };
  }
});

// Load audio device preferences
ipcMain.handle('load-audio-preferences', async () => {
  try {
    // Remove excessive logging
    // console.log('Main process: Loading audio preferences');
    const prefsPath = path.join(app.getPath('userData'), 'audio-preferences.json');
    // console.log('Main process: Preferences path:', prefsPath);
    
    if (fs.existsSync(prefsPath)) {
      // console.log('Main process: Preferences file exists');
      const content = fs.readFileSync(prefsPath, 'utf8');
      const preferences = JSON.parse(content);
      // console.log('Main process: Loaded preferences:', preferences);
      return { success: true, preferences };
    }
    
    // console.log('Main process: No preferences file found');
    return { success: true, preferences: null };
  } catch (error) {
    console.error('Main process: Error loading preferences:', error);
    return { success: false, error: error.message };
  }
});


// Handle opening external URLs in default browser
ipcMain.handle('open-external-url', async (event, url) => {
  try {
    // Make sure the URL is properly formatted
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Extract anchor if present
      let anchor = '';
      if (url.includes('#')) {
        const parts = url.split('#');
        url = parts[0];
        anchor = '#' + parts[1];
      }
      
      // Remove any existing extension and add .html
      url = url.replace(/\.[^/.]+$/, '') + '.html';
      
      // Add anchor back if it was present
      url = url + anchor;
      
      // Add base URL
      url = 'https://frieve-a.github.io/effetune' + (url.startsWith('/') ? url : '/' + url);
    }
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Error opening external URL:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Handle get app version request
ipcMain.handle('get-app-version', () => {
  return appVersion;
});

// Handle window reload request
ipcMain.handle('reload-window', () => {
  if (mainWindow) {
    mainWindow.reload();
    return { success: true };
  }
  return { success: false, error: 'Main window not available' };
});

// Handle opening documentation
ipcMain.handle('open-documentation', async (event, docPath) => {
  try {
    // For all documentation, use shell.openExternal to open in default browser
    // Convert local path to GitHub Pages URL if needed
    let url = docPath;
    if (!url.startsWith('http')) {
      // Extract anchor if present
      let anchor = '';
      if (docPath.includes('#')) {
        const parts = docPath.split('#');
        docPath = parts[0];
        anchor = '#' + parts[1];
      }
      
      // Remove any existing extension and add .html
      docPath = docPath.replace(/\.[^/.]+$/, '') + '.html';
      
      // Add anchor back if it was present
      docPath = docPath + anchor;
      
      url = `https://frieve-a.github.io/effetune${docPath}`;
      
    }
    await shell.openExternal(url);
    return { success: true };
    
    // Nothing more to do here, we've already opened the URL in the default browser
  } catch (error) {
    console.error('Error opening documentation:', error);
    return {
      success: false,
      error: error.message
    };
  }
});