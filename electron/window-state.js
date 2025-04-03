// electron/window-state.js
const fs = require('fs');
const path = require('path');
const { screen } = require('electron');
const constants = require('./constants');
const fileHandlers = require('./file-handlers');

// Get display scaling factor
function getDisplayScaleFactor() {
  const mainWindow = constants.getMainWindow();
  if (!mainWindow) return 1.0;
  const currentDisplay = screen.getDisplayMatching(mainWindow.getBounds());
  return currentDisplay.scaleFactor || 1.0;
}

// Load saved window state
function loadWindowState() {
  try {
    const userDataPath = fileHandlers.getUserDataPath();
    const stateFilePath = path.join(userDataPath, 'window-state.json');
    
    if (fs.existsSync(stateFilePath)) {
      const savedState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
      
      // Validate the saved state
      if (savedState.width && savedState.height) {
        // Ensure we have a scale factor property
        if (!savedState.scaleFactor) {
          savedState.scaleFactor = 1.0;
        }
        
        constants.setWindowState(savedState);
      }
    }
  } catch (error) {
    console.error('Failed to load window state:', error);
  }
}

// Save window state
function saveWindowState() {
  const mainWindow = constants.getMainWindow();
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
      const windowState = {
        width: Math.round(bounds.width / scaleFactor),
        height: Math.round(bounds.height / scaleFactor),
        x: bounds.x,
        y: bounds.y,
        isMaximized: false,
        scaleFactor: scaleFactor // Store the scale factor used when saving
      };
      constants.setWindowState(windowState);
    } else {
      // If window is maximized, just save that state
      const currentState = constants.getWindowState();
      const windowState = {
        width: currentState.width || 1440,
        height: currentState.height || 900,
        x: currentState.x,
        y: currentState.y,
        isMaximized: true,
        scaleFactor: getDisplayScaleFactor() // Store current scale factor
      };
      constants.setWindowState(windowState);
    }
    
    // Save to file
    const userDataPath = fileHandlers.getUserDataPath();
    const stateFilePath = path.join(userDataPath, 'window-state.json');
    
    // Ensure the directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    fs.writeFileSync(stateFilePath, JSON.stringify(constants.getWindowState(), null, 2));
  } catch (error) {
    console.error('Failed to save window state:', error);
  }
}

module.exports = {
  getDisplayScaleFactor,
  loadWindowState,
  saveWindowState
};