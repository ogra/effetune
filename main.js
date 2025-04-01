const { app, BrowserWindow, Menu, dialog, ipcMain, shell, nativeTheme, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { systemPreferences } = require('electron');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

// Get app version from package.json
const packageJson = require('./package.json');
const appVersion = packageJson.version;

// Handle file associations and command line arguments
// commandLinePresetFile is defined below

// Store window state
let windowState = {
  width: 1440,
  height: 900,
  x: undefined,
  y: undefined
};

// Set up logging to file for debugging (disabled for release)
function setupFileLogging() {
  // Disabled for release
}

// Get the actual executable path for packaged apps
function getActualExePath() {
  // In packaged apps, process.execPath points to the actual executable
  return process.execPath;
}

// Get user data path (portable or standard)
function getUserDataPath() {
  // According to the requirements:
  // 1. If there's an effetune_settings folder in the same directory as the exe, use it (portable mode)
  // 2. Otherwise, use the standard userData path (installed mode)
  
  // Check in the executable directory using process.execPath
  const execPath = getActualExePath();
  const execDir = path.dirname(execPath);
  let portableSettingsPath = path.join(execDir, 'effetune_settings');
  
  // If the settings folder exists in the exe directory, use it (portable mode)
  if (fs.existsSync(portableSettingsPath)) {
    return portableSettingsPath;
  }
  
  // If no portable settings folder found, use standard userData path
  return app.getPath('userData');
}

// Load saved window state
function loadWindowState() {
  try {
    const userDataPath = getUserDataPath();
    const stateFilePath = path.join(userDataPath, 'window-state.json');
    
    if (fs.existsSync(stateFilePath)) {
      const savedState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
      
      // Validate the saved state
      if (savedState.width && savedState.height) {
        // Ensure we have a scale factor property
        if (!savedState.scaleFactor) {
          savedState.scaleFactor = 1.0;
        }
        
        windowState = savedState;
      }
    }
  } catch (error) {
    console.error('Failed to load window state:', error);
  }
}

// Get display scaling factor
function getDisplayScaleFactor() {
  if (!mainWindow) return 1.0;
  const currentDisplay = screen.getDisplayMatching(mainWindow.getBounds());
  return currentDisplay.scaleFactor || 1.0;
}

// Save window state
function saveWindowState() {
  if (!mainWindow) return;
  
  try {
    // Only save window state if the window is not maximized
    // This prevents the window from growing on high DPI displays
    if (!mainWindow.isMaximized()) {
      // Get current window bounds
      const bounds = mainWindow.getBounds();
      
      // Get display scaling factor
      const scaleFactor = getDisplayScaleFactor();
      
      // Update window state - store physical pixels by dividing by scale factor
      windowState = {
        width: Math.round(bounds.width / scaleFactor),
        height: Math.round(bounds.height / scaleFactor),
        x: bounds.x,
        y: bounds.y,
        isMaximized: false,
        scaleFactor: scaleFactor // Store the scale factor used when saving
      };
    } else {
      // If window is maximized, just save that state
      windowState = {
        width: windowState.width || 1440,
        height: windowState.height || 900,
        x: windowState.x,
        y: windowState.y,
        isMaximized: true,
        scaleFactor: getDisplayScaleFactor() // Store current scale factor
      };
    }
    
    // Save to file
    const userDataPath = getUserDataPath();
    const stateFilePath = path.join(userDataPath, 'window-state.json');
    
    // Ensure the directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    fs.writeFileSync(stateFilePath, JSON.stringify(windowState, null, 2));
  } catch (error) {
    console.error('Failed to save window state:', error);
  }
}

// Create the main application window
function createWindow() {
  // Load saved window state
  loadWindowState();
  
  // Get current display scaling factor
  const primaryDisplay = screen.getPrimaryDisplay();
  const currentScaleFactor = primaryDisplay.scaleFactor || 1.0;
  
  // Adjust window size based on scale factor difference
  let adjustedWidth = windowState.width;
  let adjustedHeight = windowState.height;
  
  // If we have a saved scale factor and it's different from current
  if (windowState.scaleFactor && windowState.scaleFactor !== currentScaleFactor) {
     // Convert from physical to logical pixels
    adjustedWidth = Math.round(windowState.width * currentScaleFactor);
    adjustedHeight = Math.round(windowState.height * currentScaleFactor);
  }
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: adjustedWidth,
    height: adjustedHeight,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, 'images/favicon.ico'),
    acceptFirstMouse: true, // Accept mouse events on window activation
    show: false, // Don't show the window until it's ready
    webPreferences: {
      nodeIntegration: false, // Security: Keep Node.js integration disabled
      contextIsolation: true, // Security: Enable context isolation
      preload: path.join(__dirname, 'preload.js'), // Use a preload script for safe IPC
      // Note: The following settings are for development only and should be removed for production
      webSecurity: true,
      allowRunningInsecureContent: false,
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
          
          // Check for preset files or music files
          const items = Array.from(e.dataTransfer.items);
          
          // Check for preset files
          const hasPresetFiles = items.some(item =>
            item.kind === 'file' &&
            (item.type === '' || item.type === 'application/octet-stream')
          );
          
          // Check for music files
          const hasMusicFiles = items.some(item => {
            if (item.kind === 'file') {
              const file = item.getAsFile();
              if (!file) return false;
              
              // Check for audio file types
              if (file.type.startsWith('audio/') ||
                  /\\.(mp3|wav|ogg|flac|m4a|aac|aiff|wma|alac)$/i.test(file.name)) {
                return true;
              }
            }
            return false;
          });
          
          // Add visual feedback for preset files or music files
          if (hasPresetFiles || hasMusicFiles) {
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
      
      // Only prevent default for file drops, allow UI element drops and specific drop areas
      document.addEventListener('drop', (e) => {
        // Check if this is a file drop
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          // Check if the target is the file-drop-area or a child of it
          const fileDropArea = e.target.closest('.file-drop-area');
          if (fileDropArea) {
            // Allow the drop event to propagate to the file-drop-area handler
            document.body.classList.remove('drag-over');
            return;
          }
          
          // For other areas, prevent default behavior
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
      console.error('Failed to initialize drag and drop handlers:', err.message || String(err));
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

  // When the window is ready to show
  mainWindow.once('ready-to-show', () => {
    // Restore maximized state if needed
    if (windowState.isMaximized) {
      mainWindow.maximize();
    }
    // Show the window
    mainWindow.show();
  });
  
  // Load the app's HTML file
  mainWindow.loadFile('effetune.html');

  // Combined event handler for page load
  mainWindow.webContents.on('did-finish-load', () => {
     
    // 1. Disable Electron's built-in zoom functionality
    mainWindow.webContents.setZoomFactor(1.0);
    
    // If this is a splash reload, restore the saved command line preset file path
    if (isSplashReload && savedCommandLinePresetFile) {
      commandLinePresetFile = savedCommandLinePresetFile;
      savedCommandLinePresetFile = null;
    }
    
    // If this is a splash reload, process command line arguments
    if (isSplashReload) {
      processCommandLineArgs(savedCommandLineMusicFiles);
      savedCommandLineMusicFiles = [];
    }
    
    // 2. Set initial zoom level to 1.0 (100%) on every page load and set critical flags
    mainWindow.webContents.executeJavaScript(`
      // Ensure zoom is always reset to 100% on page load
      document.body.style.zoom = 1.0;
      
      // Set initial zoom value (will be stored in settings file for portable mode)
      window.initialZoom = 1.0;
      
      // Set first launch flag for audio workaround
      window.isFirstLaunch = ${isFirstLaunch};
      
      // Set pipeline state loaded flag based on commandLinePresetFile
      // If commandLinePresetFile is set, don't load previous pipeline state
      window.pipelineStateLoaded = ${commandLinePresetFile ? false : shouldLoadPipelineState};
      
      // Store this in a global constant that can't be changed
      window.ORIGINAL_PIPELINE_STATE_LOADED = window.pipelineStateLoaded;
      
      // Instead of using Object.defineProperty which causes IPC cloning issues,
      // we'll use a simple variable to track if changes should be allowed
      window._allowPipelineStateChanges = false;
    `).catch(err => {
      console.error('Error setting initial zoom and flags:', err.message || String(err));
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
      console.error('Error setting up wheel zoom:', err.message || String(err));
    });
    
    // 4. Handle file to open if specified via command line
    if (commandLinePresetFile) {
      // Set pipelineStateLoaded to false immediately to prevent loading previous state
      mainWindow.webContents.executeJavaScript(`
        window.pipelineStateLoaded = false;
      `).catch(err => {
        console.error('Error setting pipelineStateLoaded flag:', err.message || String(err));
      });
      
      // Process files immediately after page load
      // Set a minimal timeout to ensure the app is ready to receive events
      setTimeout(() => {
        if (commandLinePresetFile) {
          // Double-check that pipelineStateLoaded is still false
          mainWindow.webContents.executeJavaScript(`
            if (window.pipelineStateLoaded !== false) {
              window.pipelineStateLoaded = false;
            }
          `).catch(err => {
            console.error('Error checking pipelineStateLoaded flag:', err.message || String(err));
          });
          
          // Send the file path to the renderer process
          mainWindow.webContents.send('open-preset-file', commandLinePresetFile);
          
          // Always reset commandLinePresetFile after use to prevent it from being loaded again on manual reload
          commandLinePresetFile = null;
          savedCommandLinePresetFile = null;
        }
        
        // Handle music files after preset file is processed
        if (commandLineMusicFiles.length > 0) {
          // Send music files to the renderer process
          mainWindow.webContents.send('open-music-files', commandLineMusicFiles);
          
          // Reset command line music files after use
          commandLineMusicFiles = [];
          savedCommandLineMusicFiles = [];
        }
        
        // Reset the splash reload flag if it was set
        if (isSplashReload) {
          isSplashReload = false;
        }
      }, 300);
    } else if (commandLineMusicFiles.length > 0) {
      // If there's no preset file but there are music files, send them to the renderer
      setTimeout(() => {
        // Send music files to the renderer process
        mainWindow.webContents.send('open-music-files', commandLineMusicFiles);
        
        // Reset command line music files after use
        commandLineMusicFiles = [];
        savedCommandLineMusicFiles = [];
        
        // Reset the splash reload flag if it was set
        if (isSplashReload) {
          isSplashReload = false;
        }
      }, 300);
    } else if (isSplashReload) {
      // If there's no file to open but this is a splash screen reload, reset the flag
      // Make sure we set pipelineStateLoaded to the correct value based on shouldLoadPipelineState
      mainWindow.webContents.executeJavaScript(`
        window.pipelineStateLoaded = ${shouldLoadPipelineState};
      `).catch(err => {
        console.error('Error setting pipelineStateLoaded flag:', err.message || String(err));
      });
      
      isSplashReload = false;
    }
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
  
  // Note: File opening from command line is now handled in the combined did-finish-load event handler

  // Open DevTools in development mode
  // if (process.env.NODE_ENV === 'development') {
  //   mainWindow.webContents.openDevTools();
  // }

  // Save window state when window is moved or resized
  mainWindow.on('resize', () => saveWindowState());
  mainWindow.on('move', () => saveWindowState());
  
  // Handle window close event
  mainWindow.on('close', () => {
    saveWindowState();
    globalShortcut.unregisterAll();
    
    // Request the renderer process to save pipeline state to file
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.executeJavaScript('if (typeof writePipelineStateToFile === "function") { writePipelineStateToFile(); }')
        .catch(err => {
          console.error('Error requesting pipeline state save:', err.message || String(err));
        });
    }
  });
  
  mainWindow.on('closed', () => {
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
          label: 'Save As...',
          accelerator: 'CommandOrControl+Shift+S',
          click: () => simulateKeyboardShortcut('S', ['control', 'shift'])
        },
        { type: 'separator' },
        {
          label: 'Open music file...',
          accelerator: 'CommandOrControl+O',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('open-music-file');
            }
          }
        },
        {
          label: 'Process Audio Files with Effects...',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('process-audio-files');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Export Preset...',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('export-preset');
            }
          }
        },
        {
          label: 'Import Preset...',
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
                console.error('Error resetting zoom before reload:', err.message || String(err));
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
                console.error('Error executing zoom reset script:', err.message || String(err));
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
                console.error('Error executing zoom in script:', err.message || String(err));
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
                console.error('Error executing zoom out script:', err.message || String(err));
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
          label: 'About',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('show-about-dialog', {
                version: appVersion,
                icon: path.join(__dirname, 'images/favicon.ico')
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

// Flag to track if this is the first launch (for audio workaround)
let isFirstLaunch = true;

// Flag to track if the current reload is from the splash screen
let isSplashReload = false;

// Flag to track if pipeline state should be loaded
// Set to true by default, will be set to false if command line preset file is provided
let shouldLoadPipelineState = true;

// Store command line preset file path
let commandLinePresetFile = null;

// Store command line preset file path for splash reload
// This ensures the value is preserved across the splash screen reload
let savedCommandLinePresetFile = null;

// Store command line music files
let commandLineMusicFiles = [];

// Store command line music files for splash reload
let savedCommandLineMusicFiles = [];

// Disable hardware acceleration to avoid DXGI errors
app.disableHardwareAcceleration();

/**
 * Process command line arguments to find preset files and music files
 * @param {string[]} argv - Command line arguments array
 */
function processCommandLineArgs(argv) {
  // Skip processing during splash screen (first launch)
  if (isFirstLaunch) {
    return;
  }
  
  // Get the arguments (excluding the app path and the script path)
  // In packaged apps, the first argument is the app path
  // In development, the first two arguments are electron and the script path
  const args = process.defaultApp ? argv.slice(2) : argv.slice(1);
  
  if (args.length > 0) {
    // Clear previous music files
    commandLineMusicFiles = [];
    
    // Process each argument to find preset files and music files
    for (const arg of args) {
      // Check if the argument is a file path that ends with .effetune_preset
      if (arg && arg.endsWith('.effetune_preset')) {
        try {
          // Check if file exists
          if (fs.existsSync(arg)) {
            // Store the command line preset file path
            commandLinePresetFile = arg;
            
            // Also store in savedCommandLinePresetFile for splash reload
            savedCommandLinePresetFile = arg;
            
            // If a preset file is specified via command line, don't load previous pipeline state
            shouldLoadPipelineState = false;
            
            // If the app is already running, send the file path to the renderer
            if (mainWindow && mainWindow.webContents) {
              mainWindow.webContents.send('open-preset-file', arg);
              
              // Also set pipelineStateLoaded to false in the renderer
              mainWindow.webContents.executeJavaScript(`
                window.pipelineStateLoaded = false;
              `).catch(err => {
                console.error('Error setting pipelineStateLoaded flag:', err.message || String(err));
              });
            }
            
            // Only process the first valid preset file
            break;
          }
        } catch (error) {
          console.error('Error checking preset file:', error);
        }
      }
      // Check if the argument is a music file
      else if (arg && /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(arg)) {
        try {
          // Check if file exists
          if (fs.existsSync(arg)) {
            // Add to music files array
            commandLineMusicFiles.push(arg);
            
            // Also store in savedCommandLineMusicFiles for splash reload
            if (!savedCommandLineMusicFiles.includes(arg)) {
              savedCommandLineMusicFiles.push(path.resolve(arg)); // Use absolute path
            }
          }
        } catch (error) {
          console.error('Error checking music file:', error);
        }
      }
    }
  }
}

// Store command line arguments for processing after splash screen
savedCommandLineMusicFiles = [...process.argv];
// We'll process them after the splash screen reload

// Handle second instance (when user tries to open another instance of the app)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // If we couldn't get the lock, it means another instance is already running
  // so we quit this one
  app.quit();
} else {
  // This is the first instance
  // Listen for second-instance event (when user opens a file with the app)
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Process the command line arguments from the second instance
    // This will set shouldLoadPipelineState to false if a preset file is specified
    // and will detect music files
    processCommandLineArgs(commandLine);
    
    // Focus the main window if it exists
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      // If there's a preset file, send it to the renderer
      if (commandLinePresetFile) {
        mainWindow.webContents.send('open-preset-file', commandLinePresetFile);
        commandLinePresetFile = null;
      }
      
      // If there are music files, send them to the renderer
      if (commandLineMusicFiles.length > 0) {
        mainWindow.webContents.send('open-music-files', commandLineMusicFiles);
        commandLineMusicFiles = [];
      }
    }
  });
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
    try {
      // Check if file exists
      if (fs.existsSync(path)) {
        // If a preset file is specified, don't load previous pipeline state
        shouldLoadPipelineState = false;
        
        if (mainWindow && mainWindow.webContents) {
          // If app is already running, send the file path to the renderer
          mainWindow.webContents.send('open-preset-file', path);
        } else {
          // If app is not yet running, store the path to be opened when the app is ready
          commandLinePresetFile = path;
        }
      } else {
        console.error('Preset file does not exist:', path);
      }
    } catch (error) {
      console.error('Error checking preset file:', error);
    }
  } else if (/\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(path)) {
    try {
      // Check if file exists
      if (fs.existsSync(path)) {
        if (mainWindow && mainWindow.webContents) {
          // If app is already running, send the file path to the renderer
          mainWindow.webContents.send('open-music-files', [path]);
        } else {
          // If app is not yet running, store the path to be opened when the app is ready
          commandLineMusicFiles.push(path);
          // Also store in savedCommandLineMusicFiles for splash reload
          if (!savedCommandLineMusicFiles.includes(path)) {
            savedCommandLineMusicFiles.push(path);
          }
        }
      } else {
        console.error('Music file does not exist:', path);
      }
    } catch (error) {
      console.error('Error checking music file:', error);
    }
  } else {
    // Not a supported file, ignore
    console.log('Unsupported file type:', path);
  }
});

// Create portable settings folder if it doesn't exist
// This function is disabled as we now include effetune_settings in the win-unpacked folder
function createPortableSettingsFolder() {
  // Disabled for release
  return false;
}

// Initialize the app when Electron is ready
app.whenReady().then(() => {
  // Set up file logging first to capture all logs
  setupFileLogging();
  
  // Get user data path
  const userDataPath = getUserDataPath();
  const isPortable = userDataPath !== app.getPath('userData');
  
  // If portable mode is enabled, make sure we never use standard userData path
  if (isPortable) {
    // Override app.getPath for userData to always return our portable path
    // This ensures any direct calls to app.getPath('userData') will use portable path
    const originalGetPath = app.getPath;
    app.getPath = function(name) {
      if (name === 'userData') {
        return userDataPath;
      }
      return originalGetPath.call(this, name);
    };
    
    // Set shouldLoadPipelineState to false for first launch in portable mode
    // This prevents loading from standard userData path during splash screen reload
    if (isFirstLaunch) {
      shouldLoadPipelineState = false;
    }
  }
  
  // Create portable settings folder if it doesn't exist
  // This will enable portable mode if the folder is created successfully
  createPortableSettingsFolder();
  
  createWindow();

  // Create splash window with About dialog content
  let splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
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
    // Position splash window in the center of the main window
    if (mainWindow) {
      const mainBounds = mainWindow.getBounds();
      const splashBounds = splashWindow.getBounds();
      
      // Calculate the center position
      const x = Math.round(mainBounds.x + (mainBounds.width - splashBounds.width) / 2);
      const y = Math.round(mainBounds.y + (mainBounds.height - splashBounds.height) / 2);
      
      // Set the position
      splashWindow.setPosition(x, y);
    }
    
    // Show the splash window
    splashWindow.show();
  });
  
  // Workaround for audio issues: reload the window after 3 seconds
  setTimeout(() => {
    if (mainWindow) {
      isFirstLaunch = false;
      
      // Set flag to indicate this is a splash screen reload
      isSplashReload = true;
      
      // Save command line preset file path before reload
      savedCommandLinePresetFile = commandLinePresetFile;
      
      // Save command line music files before reload
      savedCommandLineMusicFiles = [...process.argv];
      
      // Close splash window and reload main window
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      
      // Reload the main window
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

// Handle read file as buffer request (for ID3 tag reading)
ipcMain.handle('read-file-as-buffer', async (event, filePath) => {
  try {
    console.log('Reading file as buffer:', filePath);
    // Read file as buffer
    const buffer = fs.readFileSync(filePath);
    // Convert Buffer to ArrayBuffer for jsmediatags
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
    // Return the buffer as base64 string
    return {
      success: true,
      buffer: buffer.toString('base64')
    };
  } catch (error) {
    console.error('Error reading file as buffer:', error);
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
          console.error('Error enumerating devices:', err.message || String(err));
          return [];
        });
    `);
    
    return { success: true, devices };
  } catch (error) {
    console.error('Error getting audio devices:', error);
    return { success: false, error: error.message };
  }
});

// Save audio device preferences
ipcMain.handle('save-audio-preferences', async (event, preferences) => {
  try {
    const userDataPath = getUserDataPath();
    const prefsPath = path.join(userDataPath, 'audio-preferences.json');
    
    // Ensure the directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    fs.writeFileSync(prefsPath, JSON.stringify(preferences, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving preferences:', error);
    return { success: false, error: error.message };
  }
});

// Load audio device preferences
ipcMain.handle('load-audio-preferences', async () => {
  try {
    const userDataPath = getUserDataPath();
    const prefsPath = path.join(userDataPath, 'audio-preferences.json');
    
    if (fs.existsSync(prefsPath)) {
      const content = fs.readFileSync(prefsPath, 'utf8');
      const preferences = JSON.parse(content);
      return { success: true, preferences };
    }
    
    return { success: true, preferences: null };
  } catch (error) {
    console.error('Error loading preferences:', error);
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

// Handle get path request
ipcMain.handle('getPath', (event, name) => {
  // If userData path is requested, use our custom function to support portable mode
  if (name === 'userData') {
    return getUserDataPath();
  }
  return app.getPath(name);
});

// Handle join paths request
ipcMain.handle('joinPaths', (event, basePath, ...paths) => {
  return path.join(basePath, ...paths);
});

// Handle file exists request
ipcMain.handle('fileExists', (event, filePath) => {
  return fs.existsSync(filePath);
});

// Handle get file path request
ipcMain.handle('get-file-path', async (event, fileInfo) => {
  try {
    console.log('get-file-path called with:', fileInfo);
    
    // Show open dialog to let the user select the file
    const result = await dialog.showOpenDialog(mainWindow, {
      title: `Select ${fileInfo.name}`,
      properties: ['openFile'],
      filters: [
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      console.log('File selection canceled');
      return null;
    }
    
    return result.filePaths[0];
  } catch (error) {
    console.error('Error in get-file-path:', error);
    return null;
  }
});

// Handle get file paths request
ipcMain.handle('get-file-paths', async (event, filesInfo) => {
  try {
    console.log('get-file-paths called with:', filesInfo);
    
    // Show open dialog to let the user select multiple files
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Music Files',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      console.log('File selection canceled');
      return [];
    }
    
    return result.filePaths;
  } catch (error) {
    console.error('Error in get-file-paths:', error);
    return [];
  }
});

// Handle get file path request for a single file is already defined above

// Handle dropped files with paths (new method)
ipcMain.handle('handle-dropped-files-with-paths', async (event, filePaths) => {
  try {
    console.log('handle-dropped-files-with-paths called with:', filePaths.length, 'files');
    console.log('File paths received from renderer:', filePaths);
    
    // Filter for audio files
    const audioFilePaths = filePaths.filter(filePath => {
      const ext = path.extname(filePath).toLowerCase();
      return ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'].includes(ext);
    });
    
    console.log('Audio file paths:', audioFilePaths);
    return audioFilePaths;
  } catch (error) {
    console.error('Error handling dropped files with paths:', error);
    return [];
  }
});

// Handle dropped files (fallback method)
ipcMain.handle('handle-dropped-files', async (event, filesInfo) => {
  try {
    console.log('handle-dropped-files called with:', filesInfo.length, 'files');
    
    // For security reasons, Electron doesn't provide direct access to file paths from the renderer process
    // We'll use a different approach to handle dropped files
    
    // Extract file names and extensions
    const fileNames = filesInfo.map(info => info.name).filter(Boolean);
    const fileExtensions = fileNames
      .map(name => {
        const parts = name.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
      })
      .filter(Boolean);
    
    console.log('Dropped file names:', fileNames);
    console.log('Dropped file extensions:', fileExtensions);
    
    // Show a dialog to let the user select the files
    // This is the most reliable approach
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Music Files',
      defaultPath: app.getPath('music'),
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', ...fileExtensions] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      console.log('File selection canceled');
      return [];
    }
    
    console.log('Selected file paths:', result.filePaths);
    return result.filePaths;
  } catch (error) {
    console.error('Error handling dropped files:', error);
    return [];
  }
});

// Handle dropped preset file
ipcMain.handle('handle-dropped-preset-file', async (event, fileInfo) => {
  try {
    console.log('handle-dropped-preset-file called with:', fileInfo);
    
    // In a real implementation, we would use the file info to locate the actual file
    // For now, we'll show a dialog to let the user select the file
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Preset File',
      properties: ['openFile'],
      filters: [
        { name: 'EffeTune Preset Files', extensions: ['effetune_preset'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      console.log('File selection canceled');
      return null;
    }
    
    return result.filePaths[0];
  } catch (error) {
    console.error('Error handling dropped preset file:', error);
    return null;
  }
});

// Handle save pipeline state to file request
ipcMain.handle('save-pipeline-state-to-file', async (event, pipelineState) => {
  try {
    // Skip saving if pipeline state is empty
    if (!pipelineState || !Array.isArray(pipelineState) || pipelineState.length === 0) {
      return { success: false, error: 'Empty pipeline state' };
    }
    
    // Get app path
    const appPath = getUserDataPath();
    
    // Use path.join for cross-platform compatibility
    const filePath = path.join(appPath, 'pipeline-state.json');
    
    // Ensure the directory exists
    if (!fs.existsSync(appPath)) {
      fs.mkdirSync(appPath, { recursive: true });
    }
    
    // Save pipeline state to file
    fs.writeFileSync(filePath, JSON.stringify(pipelineState, null, 2));
    console.log('Pipeline state saved to file on app exit');
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save pipeline state to file:', error);
    return { success: false, error: error.message };
  }
});

// Handle window reload request
ipcMain.handle('reload-window', () => {
  if (mainWindow) {
    mainWindow.reload();
    return { success: true };
  }
  return { success: false, error: 'Main window not available' };
});

// Handle clear microphone permission request
ipcMain.handle('clear-microphone-permission', async () => {
  try {
    if (mainWindow) {
      // Clear permission overrides for microphone
      await mainWindow.webContents.session.clearPermissionOverrides({
        origin: 'file://',
        permission: 'media'
      });
      
      // Request microphone access again
      const status = await systemPreferences.getMediaAccessStatus('microphone');
      if (status !== 'granted') {
        await systemPreferences.askForMediaAccess('microphone');
      }
      
      return { success: true };
    }
    return { success: false, error: 'Main window not available' };
  } catch (error) {
    console.error('Error clearing microphone permission:', error);
    return { success: false, error: error.message };
  }
});

// Handle application menu update request
ipcMain.handle('update-application-menu', (event, menuTemplate) => {
  try {
    // Get the current menu template
    const currentTemplate = Menu.getApplicationMenu().items.map(item => item.submenu.items);
    
    // Create a new menu template with the same structure but updated labels
    const template = [
      {
        label: menuTemplate.file.label,
        submenu: [
          {
            label: menuTemplate.file.submenu[0].label, // Save
            accelerator: 'CommandOrControl+S',
            click: () => simulateKeyboardShortcut('S', ['control'])
          },
          {
            label: menuTemplate.file.submenu[1].label, // Save As...
            accelerator: 'CommandOrControl+Shift+S',
            click: () => simulateKeyboardShortcut('S', ['control', 'shift'])
          },
          { type: 'separator' },
          {
            label: menuTemplate.file.submenu[3].label, // Open music file...
            accelerator: 'CommandOrControl+O',
            click: () => {
              if (mainWindow) {
                mainWindow.webContents.send('open-music-file');
              }
            }
          },
          {
            label: menuTemplate.file.submenu[4].label, // Process Audio Files with Effects...
            click: () => {
              if (mainWindow) {
                mainWindow.webContents.send('process-audio-files');
              }
            }
          },
          { type: 'separator' },
          {
            label: menuTemplate.file.submenu[6].label, // Export Preset...
            click: () => {
              if (mainWindow) {
                mainWindow.webContents.send('export-preset');
              }
            }
          },
          {
            label: menuTemplate.file.submenu[7].label, // Import Preset...
            click: () => {
              if (mainWindow) {
                mainWindow.webContents.send('import-preset');
              }
            }
          },
          { type: 'separator' },
          { role: 'quit', label: menuTemplate.file.submenu[9].label } // Quit
        ]
      },
      {
        label: menuTemplate.edit.label,
        submenu: [
          {
            label: menuTemplate.edit.submenu[0].label, // Undo
            accelerator: 'CommandOrControl+Z',
            click: () => simulateKeyboardShortcut('Z', ['control'])
          },
          {
            label: menuTemplate.edit.submenu[1].label, // Redo
            accelerator: 'CommandOrControl+Y',
            click: () => simulateKeyboardShortcut('Y', ['control'])
          },
          { type: 'separator' },
          {
            label: menuTemplate.edit.submenu[3].label, // Cut
            accelerator: 'CommandOrControl+X',
            click: () => simulateKeyboardShortcut('X', ['control'])
          },
          {
            label: menuTemplate.edit.submenu[4].label, // Copy
            accelerator: 'CommandOrControl+C',
            click: () => simulateKeyboardShortcut('C', ['control'])
          },
          {
            label: menuTemplate.edit.submenu[5].label, // Paste
            accelerator: 'CommandOrControl+V',
            click: () => simulateKeyboardShortcut('V', ['control'])
          },
          { type: 'separator' },
          {
            label: menuTemplate.edit.submenu[7].label, // Delete
            accelerator: 'Delete',
            click: () => simulateKeyboardShortcut('Delete')
          },
          {
            label: menuTemplate.edit.submenu[8].label, // Select All
            accelerator: 'CommandOrControl+A',
            click: () => simulateKeyboardShortcut('A', ['control'])
          }
        ]
      },
      {
        label: menuTemplate.view.label,
        submenu: [
          {
            label: menuTemplate.view.submenu[0].label, // Reload
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
            label: menuTemplate.view.submenu[2].label, // Reset Zoom
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
            label: menuTemplate.view.submenu[3].label, // Zoom In
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
            label: menuTemplate.view.submenu[4].label, // Zoom Out
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
          {
            role: 'togglefullscreen',
            label: menuTemplate.view.submenu[6].label // Toggle Fullscreen
          }
        ]
      },
      {
        label: menuTemplate.settings.label,
        submenu: [
          {
            label: menuTemplate.settings.submenu[0].label, // Audio Devices...
            click: () => {
              if (mainWindow) {
                mainWindow.webContents.send('config-audio');
              }
            }
          }
        ]
      },
      {
        label: menuTemplate.help.label,
        submenu: [
          {
            label: menuTemplate.help.submenu[0].label, // Help
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
            label: menuTemplate.help.submenu[2].label, // About
            click: () => {
              if (mainWindow) {
                mainWindow.webContents.send('show-about-dialog', {
                  version: appVersion,
                  icon: path.join(__dirname, 'images/favicon.ico')
                });
              }
            }
          }
        ]
      }
    ];

    // Build and set the new menu
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating application menu:', error);
    return { success: false, error: error.message };
  }
});

// Handle files dropped from preload script
ipcMain.on('files-dropped', (event, filePaths) => {
  try {
    console.log('Files dropped from preload script received in main.js:', filePaths);
    
    // Filter for audio files
    const audioFilePaths = filePaths.filter(filePath => {
      const ext = path.extname(filePath).toLowerCase();
      const isAudio = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'].includes(ext);
      console.log(`File: ${filePath}, Extension: ${ext}, Is Audio: ${isAudio}`);
      return isAudio;
    });
    
    console.log('Audio file paths to send back to renderer:', audioFilePaths);
    
    // Send the audio file paths back to the renderer process
    if (mainWindow && mainWindow.webContents) {
      console.log('Sending audio-files-dropped event to renderer');
      mainWindow.webContents.send('audio-files-dropped', audioFilePaths);
    } else {
      console.error('mainWindow or webContents not available');
    }
  } catch (error) {
    console.error('Error handling dropped files:', error);
  }
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