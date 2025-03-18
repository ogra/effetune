import { PluginManager } from './plugin-manager.js';
import { AudioManager } from './audio-manager.js';
import { UIManager } from './ui-manager.js';
import { electronIntegration } from './electron-integration.js';

// Make electronIntegration globally accessible first
window.electronIntegration = electronIntegration;

// Store the latest pipeline state in memory
let latestPipelineState = null;

// Function to save pipeline state to memory, only write to file on app exit
async function savePipelineState(pipelineState) {
    if (!window.electronAPI || !window.electronIntegration || !window.electronIntegration.isElectron) {
        return;
    }
    
    // Skip saving during first launch (splash screen)
    if (window.isFirstLaunch === true) {
        return;
    }
    
    // Skip saving if pipeline state is empty
    if (!pipelineState || !Array.isArray(pipelineState) || pipelineState.length === 0) {
        return;
    }
    
    // Store the latest state in memory
    latestPipelineState = pipelineState;
}

// Function to write the latest pipeline state to file
async function writePipelineStateToFile() {
    if (!window.electronAPI || !window.electronIntegration || !window.electronIntegration.isElectron) {
        return;
    }
    
    // Skip if no state to save
    if (!latestPipelineState) {
        return;
    }
    
    try {
        // Use the IPC method to save pipeline state to file
        const result = await window.electronAPI.savePipelineStateToFile(latestPipelineState);
        
        if (result.success) {
            console.log('Pipeline state saved to file on app exit');
        } else {
            console.error('Failed to save pipeline state to file:', result.error);
        }
    } catch (error) {
        console.error('Failed to save pipeline state to file:', error);
    }
}

// Function to load pipeline state from file when in Electron environment
async function loadPipelineState() {
    if (!window.electronAPI || !window.electronIntegration || !window.electronIntegration.isElectron) {
        return null;
    }
    
    // Double-check that we should load the pipeline state
    if (window.__FORCE_SKIP_PIPELINE_STATE_LOAD === true) {
        return null;
    }
    
    // Check the pipelineStateLoaded flag again
    if (window.pipelineStateLoaded !== true) {
        return null;
    }
    
    try {
        // Get app path from Electron
        const appPath = await window.electronAPI.getPath('userData');
        
        // Use path.join for cross-platform compatibility
        const filePath = await window.electronAPI.joinPaths(appPath, 'pipeline-state.json');
        
        // Check if file exists
        const fileExists = await window.electronAPI.fileExists(filePath);
        
        if (!fileExists) {
            return null;
        }
        
        // Read pipeline state from file
        const result = await window.electronAPI.readFile(filePath);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        // Parse pipeline state
        const pipelineState = JSON.parse(result.content);
        
        return pipelineState;
    } catch (error) {
        console.error('Error loading pipeline state:', error);
        return null;
    }
}

// Set up event listener for preset file opening from command line arguments
if (window.electronAPI && window.electronAPI.onOpenPresetFile) {
  window.electronAPI.onOpenPresetFile((filePath) => {
    if (window.electronIntegration) {
      window.electronIntegration.openPresetFile(filePath);
    } else {
      console.error('Cannot open preset file: electronIntegration not available');
    }
  });
}

// Add a style to hide the UI immediately during first launch
// This will be removed after the splash screen is closed
const tempStyle = document.createElement('style');
tempStyle.id = 'temp-hide-style';
tempStyle.textContent = `
    body > * {
        opacity: 0 !important;
        visibility: hidden !important;
    }
    body {
        background-color: #000 !important;
    }
`;
document.head.appendChild(tempStyle);

// Check if this is the first launch (for audio workaround) - async

// Initialize with a promise that will resolve with the first launch status
let isFirstLaunchPromise;

if (window.electronAPI && window.electronAPI.isFirstLaunch) {
    try {
        // Wrap in Promise.resolve to ensure we get a Promise
        isFirstLaunchPromise = Promise.resolve(window.electronAPI.isFirstLaunch())
            .catch(error => {
                return false;
            });
    } catch (error) {
        isFirstLaunchPromise = Promise.resolve(false);
    }
} else {
    isFirstLaunchPromise = Promise.resolve(false);
}

// Handle the first launch status when it resolves
isFirstLaunchPromise.then(isFirstLaunch => {
    if (!isFirstLaunch) {
        // If not first launch, remove the temporary hide style
        if (tempStyle.parentNode) {
            tempStyle.parentNode.removeChild(tempStyle);
        }
    } else {
        // If first launch, keep the UI hidden
        // Replace temporary style with permanent one
        tempStyle.id = 'first-launch-style';
    }
    
    // Store the first launch status for other components
    window.isFirstLaunchConfirmed = isFirstLaunch;
}).catch(error => {
    console.error('Error checking launch status:', error);
    // In case of error, show the UI
    if (tempStyle.parentNode) {
        tempStyle.parentNode.removeChild(tempStyle);
    }
    window.isFirstLaunchConfirmed = false;
});

class App {
    constructor() {
        // Initialize core components
        this.pluginManager = new PluginManager();
        this.audioManager = new AudioManager();
        
        // Initialize UI components
        this.uiManager = new UIManager(this.pluginManager, this.audioManager);
        
        // Set pipeline manager reference in audio manager
        this.audioManager.pipelineManager = this.uiManager.pipelineManager;
        
        // Pass first launch flag to audio manager for audio workaround
        // Use a default value of false if window.isFirstLaunchConfirmed is not set
        this.audioManager.isFirstLaunch = false;
    }

    async initialize() {
        try {
            // Show loading spinner
            this.uiManager.showLoadingSpinner();
            
            // Display app version first
            await this.displayAppVersion();

            // Load plugins
            await this.pluginManager.loadPlugins();

            // Initialize UI components (non-blocking)
            this.uiManager.initPluginList();
            this.uiManager.initDragAndDrop();

            // Initialize audio
            const audioInitResult = await this.audioManager.initAudio();
            
            // Debug log to check what's being returned
            console.log('Audio initialization result:', audioInitResult);
            
            // Store the audio initialization result for later
            this.audioInitResult = audioInitResult;

            // If there's an error, store it for display at the end of initialization
            if (audioInitResult && typeof audioInitResult === 'string' && audioInitResult.startsWith('Audio Error:')) {
                this.hasAudioError = true;
                console.warn('Audio initialization error detected:', audioInitResult); // Just log the error, don't display it yet
            } else {
                console.log('No audio initialization error detected');
            }
            
            this.uiManager.initAudio();

            // Initialize pipeline
            let savedState = null;
            const plugins = [];
            
            // Check if running in Electron environment
            const isElectron = window.electronIntegration && window.electronIntegration.isElectron;
            
            // Check if this is first launch (during splash screen)
            const isFirstLaunch = window.isFirstLaunch === true;
            
            // If this is the first launch (during splash screen), don't initialize pipeline
            // This prevents overwriting existing settings during splash screen
            if (isFirstLaunch && isElectron) {
                this.uiManager.hideLoadingSpinner();
                return;
            }
            
            // Try to load pipeline state from file if in Electron environment and no preset file was specified via command line
            // Check for the force skip flag first
            if (window.__FORCE_SKIP_PIPELINE_STATE_LOAD === true) {
                // Clear the flag after using it
                window.__FORCE_SKIP_PIPELINE_STATE_LOAD = false;
                return null;
            }
            
            // Use the ORIGINAL_PIPELINE_STATE_LOADED value if available, as it can't be changed
            const shouldLoadPipeline = window.ORIGINAL_PIPELINE_STATE_LOADED !== undefined
                ? window.ORIGINAL_PIPELINE_STATE_LOADED === true
                : window.pipelineStateLoaded === true;
                
            if (isElectron && shouldLoadPipeline) {
                try {
                    savedState = await loadPipelineState();
                } catch (error) {
                    // Error loading pipeline state, will use default
                    console.error('Error loading pipeline state:', error);
                }
            }
            
            // If no saved state from file, try URL state (for web version)
            if (!savedState) {
                savedState = this.uiManager.parsePipelineState();
            }
            
            // Check if savedState is empty array but file exists
            // This could happen if the file was just created with empty content
            if (savedState && Array.isArray(savedState) && savedState.length === 0) {
                savedState = null; // Force default plugin initialization
            }
            
            if (savedState && savedState.length > 0) {
                // Restore pipeline from saved state
                plugins.push(...savedState.map(pluginState => {
                    const plugin = this.pluginManager.createPlugin(pluginState.name);
                    plugin.enabled = pluginState.enabled;
                    
                    // Restore parameters efficiently
                    if (plugin.setSerializedParameters) {
                        plugin.setSerializedParameters(pluginState.parameters);
                    } else if (plugin.setParameters) {
                        plugin.setParameters({
                            ...pluginState.parameters,
                            enabled: pluginState.enabled
                        });
                    } else if (plugin.parameters) {
                        Object.assign(plugin.parameters, pluginState.parameters);
                    }

                    plugin.updateParameters();
                    this.uiManager.expandedPlugins.add(plugin);
                    return plugin;
                }));
            } else {
                // Initialize default plugins
                const defaultPlugins = [
                    { name: 'Volume', config: { volume: -6 } },
                    { name: 'Level Meter' }
                ];
                
                plugins.push(...defaultPlugins.map(config => {
                    const plugin = this.pluginManager.createPlugin(config.name);
                    if (config.config?.volume !== undefined) {
                        plugin.setVl(config.config.volume);
                    }
                    this.uiManager.expandedPlugins.add(plugin);
                    return plugin;
                }));
            }
            
            // Update pipeline and UI in parallel
            await Promise.all([
                (async () => {
                    this.audioManager.pipeline = plugins;
                    await this.audioManager.rebuildPipeline();
                })(),
                (async () => {
                    this.uiManager.updatePipelineUI();
                    this.uiManager.updateURL();
                    this.uiManager.hideLoadingSpinner();
                })()
            ]);
            // Add F1 key event listener for help documentation
            document.addEventListener('keydown', (event) => {
                if (event.key === 'F1') {
                    event.preventDefault(); // Prevent default browser behavior
                    const whatsThisLink = document.querySelector('.whats-this');
                    if (whatsThisLink) {
                        whatsThisLink.click();
                    }
                }
            });

            // Check sample rate after initialization
            if (this.audioManager.audioContext && this.audioManager.audioContext.sampleRate < 88200) {
                this.uiManager.setError('error.lowSampleRate', true, { sampleRate: this.audioManager.audioContext.sampleRate });
            }

            // Clear any existing error messages
            this.uiManager.clearError();

            // Auto-resume audio context when page gains focus
            // Auto-resume audio context when page gains focus
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && this.audioManager.audioContext &&
                    this.audioManager.audioContext.state === 'suspended') {
                    this.audioManager.audioContext.resume();
                }
            });

            // Display microphone error message at the very end of initialization if there was one
            if (this.hasAudioError) {
                // Show a non-blocking warning message to the user
                this.uiManager.setError(this.uiManager.t('error.microphoneAccessDenied'), false);
                setTimeout(() => window.uiManager.clearError(), 3000);
            }
        } catch (error) {
            this.uiManager.setError(error.message, true);
        }
    }
    
    /**
     * Display application version from package.json
     */
    async displayAppVersion() {
        try {
            const versionElement = document.getElementById('app-version');
            if (!versionElement) return;
            
            // Get version from Electron if available
            if (window.electronIntegration && window.electronIntegration.isElectron) {
                const version = await window.electronIntegration.getAppVersion();
                versionElement.textContent = version;
            } else {
                // For web version, fetch package.json from the relative path
                try {
                    const response = await fetch('./package.json');
                    if (response.ok) {
                        const packageData = await response.json();
                        versionElement.textContent = packageData.version;
                    } else {
                        console.error('Failed to fetch package.json:', response.status);
                        versionElement.textContent = '';
                    }
                } catch (fetchError) {
                    console.error('Error fetching package.json:', fetchError);
                    versionElement.textContent = '';
                }
            }
        } catch (error) {
            console.error('Failed to display app version:', error);
            // Don't display version in case of error
            const versionElement = document.getElementById('app-version');
            if (versionElement) {
                versionElement.textContent = '';
            }
        }
    }
}

// Make savePipelineState globally accessible for pipeline manager
window.savePipelineState = savePipelineState;

// Add event listener to save pipeline state to file when the app is closing
window.addEventListener('beforeunload', async (event) => {
    // Write the latest pipeline state to file on app exit
    await writePipelineStateToFile();
});

// Initialize application after first launch check is complete
isFirstLaunchPromise.then(isFirstLaunch => {
    // Store the first launch status for other components
    window.isFirstLaunchConfirmed = isFirstLaunch;
    
    // Create and initialize the app
    const app = new App();
    
    // Update the audio manager's first launch flag with the confirmed value
    app.audioManager.isFirstLaunch = isFirstLaunch;
    
    // Make uiManager globally accessible for plugins
    window.uiManager = app.uiManager;
    
    // Initialize the app
    app.initialize();
}).catch(error => {
    // Initialize anyway in case of error
    window.isFirstLaunchConfirmed = false;
    const app = new App();
    window.uiManager = app.uiManager;
    app.initialize();
});

// Add global drag and drop support for preset files and music files
document.addEventListener('dragover', (e) => {
    // Check for files
    if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
        const items = Array.from(e.dataTransfer.items);
        
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        document.body.classList.add('drag-over');
        return;
    }
}, true); // Use capture phase to ensure this handler runs first

// Remove visual feedback when drag leaves
document.addEventListener('dragleave', (e) => {
    // Only handle if we're leaving the document
    if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
        document.body.classList.remove('drag-over');
    }
}, true); // Use capture phase

// Add CSS for drag-over effect
const style = document.createElement('style');
style.textContent = `
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
`;
document.head.appendChild(style);

/**
 * Process preset file data and load it into the application
 * @param {Object} fileData - The parsed JSON data from the preset file
 * @param {string} fileName - The name of the preset file without extension
 */
function processPresetFileData(fileData, fileName) {
    let presetData;
    
    if (fileData.pipeline) {
        // New format: complete preset object
        presetData = fileData;
        // Update timestamp to current time
        presetData.timestamp = Date.now();

        presetData.name = fileName;
    } else {
        // Unknown format
        window.uiManager.setError('error.unknownPresetFormat');
        setTimeout(() => window.uiManager.clearError(), 3000);
        return;
    }
    
    // Load the preset
    window.uiManager.loadPreset(presetData);
    window.uiManager.setError('success.presetLoaded', false, { name: fileName });
    setTimeout(() => window.uiManager.clearError(), 3000);
}

/**
 * Handle errors during preset file loading
 * @param {Error} error - The error that occurred
 * @param {string} message - Custom error message to display
 */
function handlePresetFileError(error, message) {
    console.error(message, error);
    // Check if message is a translation key
    if (message === 'Failed to parse preset file') {
        window.uiManager.setError('error.failedToParsePresetFile');
    } else if (message === 'Failed to read preset file') {
        window.uiManager.setError('error.failedToReadPresetFile');
    } else {
        window.uiManager.setError(message);
    }
    setTimeout(() => window.uiManager.clearError(), 3000);
}

/**
 * Read the content of a preset file and process it
 * @param {File} presetFile - The preset file to read
 * @param {string} fileName - The name of the preset file without extension
 */
function readPresetFileContent(presetFile, fileName) {
    try {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const fileData = JSON.parse(event.target.result);
                processPresetFileData(fileData, fileName);
            } catch (error) {
                handlePresetFileError(error, 'Failed to parse preset file');
            }
        };
        
        reader.onerror = () => {
            handlePresetFileError(new Error('FileReader error'), 'Failed to read preset file');
        };
        
        reader.readAsText(presetFile);
    } catch (error) {
        handlePresetFileError(error, 'Failed to read preset file');
    }
}

// Audio file handling

document.addEventListener('drop', async (e) => {
    // Check for files
    if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        
        // Remove visual feedback
        document.body.classList.remove('drag-over');
        
        // Also remove drag-active class from any drop areas
        document.querySelectorAll('.drag-active').forEach(el => {
            el.classList.remove('drag-active');
        });
        
        // Check if we're in a browser environment
        const isBrowser = !window.electronIntegration || !window.electronIntegration.isElectron;
        
        // For preset files, we can handle them in both environments
        // For music files, we'll check the environment later
        
        // Get all dropped files
        const files = Array.from(e.dataTransfer.files);
        
        // Check for preset files first
        const presetFiles = files.filter(file => file.name.endsWith('.effetune_preset'));
        
        if (presetFiles.length > 0) {
            // Handle preset file
            const presetFile = presetFiles[0]; // Take the first preset file if multiple are dropped
            const fileName = presetFile.name.replace('.effetune_preset', '');
            
            // Try to read the preset file directly
            try {
                readPresetFileContent(presetFile, fileName);
            } catch (error) {
                console.error('Error reading preset file:', error);
                window.uiManager.setError('error.failedToReadPresetFile', true);
                setTimeout(() => window.uiManager.clearError(), 3000);
            }
            
            return; // Don't process music files if we found a preset file
        }
        
        // Process music files
        // Filter for audio files
        const musicFiles = files.filter(file =>
            file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name)
        );
        
        if (musicFiles.length > 0) {
            if (isBrowser) {
                // In browser environment, check if the drop target is the file-drop-area
                const isDroppedOnFileDropArea = e.target.closest('.file-drop-area') !== null;
                
                // Check if we have a drop area for offline processing
                const dropArea = window.uiManager?.pipelineManager?.dropArea;
                
                if (dropArea && isDroppedOnFileDropArea) {
                    // Process files if they were dropped on the file-drop-area
                    window.uiManager.pipelineManager.processDroppedAudioFiles(musicFiles);
                } else {
                    // Pass File objects directly to the audio player
                    if (window.uiManager) {
                        window.uiManager.createAudioPlayer(musicFiles, false);
                    }
                }
            } else {
                // Pass File objects directly to the audio player
                if (window.uiManager) {
                    window.uiManager.createAudioPlayer(musicFiles, false);
                }
            }
        } else {
            window.uiManager.setError('error.noMusicFilesFound', true);
            setTimeout(() => window.uiManager.clearError(), 3000);
        }
    }
}, true); // Use capture phase to ensure this handler runs first

// Also listen for audio-files-dropped event from main process as a backup
if (window.electronAPI && window.electronAPI.onAudioFilesDropped) {
    // Register the callback
    window.electronAPI.onAudioFilesDropped((filePaths) => {
        if (filePaths && filePaths.length > 0) {
            // Play the music files using UIManager
            if (window.uiManager) {
                window.uiManager.createAudioPlayer(filePaths, false);
            }
        }
    });
}

// app.initialize() is now called inside the isFirstLaunchPromise.then() block
