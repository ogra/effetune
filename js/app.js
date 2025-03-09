import { PluginManager } from './plugin-manager.js';
import { AudioManager } from './audio-manager.js';
import { UIManager } from './ui-manager.js';
import { electronIntegration } from './electron-integration.js';

// Make electronIntegration globally accessible first
window.electronIntegration = electronIntegration;

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
    console.error('Error checking first launch status:', error);
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
            await this.audioManager.initAudio();
            this.uiManager.initAudio();

            // Initialize pipeline
            const savedState = this.uiManager.parsePipelineState();
            const plugins = [];
            
            if (savedState) {
                // Restore pipeline from URL
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
                    this.uiManager.clearError();
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
    this.uiManager.setError(`Sample rate is too low (${this.audioManager.audioContext.sampleRate}Hz). Audio quality may be insufficient. 88.2kHz or higher is recommended.`, true);
}

// Auto-resume audio context when page gains focus
            // Auto-resume audio context when page gains focus
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && this.audioManager.audioContext &&
                    this.audioManager.audioContext.state === 'suspended') {
                    this.audioManager.audioContext.resume();
                }
            });

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

// Add global drag and drop support for preset files
document.addEventListener('dragover', (e) => {
    // Check for preset files
    if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
        const items = Array.from(e.dataTransfer.items);
        const hasPresetFiles = items.some(item =>
            item.kind === 'file' &&
            (item.type === '' || item.type === 'application/octet-stream') // Preset files often have no specific MIME type
        );
        
        if (hasPresetFiles) {
            e.preventDefault();
            e.stopPropagation();
            // Explicitly set dropEffect to 'copy' to show the user that dropping is allowed
            e.dataTransfer.dropEffect = 'copy';
            
            // Add visual feedback
            document.body.classList.add('drag-over');
        }
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

document.addEventListener('drop', async (e) => {
    // Check for preset files
    if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
        const files = Array.from(e.dataTransfer.files);
        const presetFiles = files.filter(file => file.name.endsWith('.effetune_preset'));
        
        if (presetFiles.length > 0) {
            // Prevent default only if we have preset files
            e.preventDefault();
            e.stopPropagation();
            
            // Remove visual feedback
            document.body.classList.remove('drag-over');
            
            
            // Handle preset file
            const presetFile = presetFiles[0]; // Take the first preset file if multiple are dropped
        
        if (window.electronIntegration && window.electronIntegration.isElectron) {
            // In Electron environment, use the file path
            // In Electron, the File object has a path property in some environments
            // but we need to handle cases where it might not be available
            if (presetFile.path) {
                window.electronIntegration.openPresetFile(presetFile.path);
                window.uiManager.setError(`Preset "${presetFile.name}" loaded!`);
                setTimeout(() => window.uiManager.clearError(), 3000);
            } else {
                // If path is not available, read the file content and pass it to openPresetFile
                try {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const fileData = JSON.parse(event.target.result);
                            
                            let presetData;
                            
                            // Handle different formats for backward compatibility
                            if (Array.isArray(fileData)) {
                                // Old format: direct array of pipeline plugins
                                presetData = {
                                    name: presetFile.name.replace('.effetune_preset', ''),
                                    timestamp: Date.now(),
                                    pipeline: fileData
                                };
                            } else if (fileData.pipeline) {
                                // New format: complete preset object
                                presetData = fileData;
                                // Update timestamp to current time
                                presetData.timestamp = Date.now();
                                // If no name is provided, use the filename
                                if (!presetData.name) {
                                    presetData.name = presetFile.name.replace('.effetune_preset', '');
                                }
                            } else {
                                // Unknown format
                                window.uiManager.setError('Unknown preset format');
                                setTimeout(() => window.uiManager.clearError(), 3000);
                                return;
                            }
                            
                            // Load the preset
                            window.uiManager.loadPreset(presetData);
                            window.uiManager.setError(`Preset "${presetData.name}" loaded!`);
                            setTimeout(() => window.uiManager.clearError(), 3000);
                        } catch (error) {
                            console.error('Error parsing preset file:', error);
                            window.uiManager.setError('Failed to parse preset file');
                            setTimeout(() => window.uiManager.clearError(), 3000);
                        }
                    };
                    reader.onerror = () => {
                        window.uiManager.setError('Failed to read preset file');
                        setTimeout(() => window.uiManager.clearError(), 3000);
                    };
                    reader.readAsText(presetFile);
                } catch (error) {
                    console.error('Error reading preset file:', error);
                    window.uiManager.setError('Failed to read preset file');
                    setTimeout(() => window.uiManager.clearError(), 3000);
                }
            }
        } else {
            // In browser environment, read the file content
            try {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const fileData = JSON.parse(event.target.result);
                        
                        let presetData;
                        
                        // Handle different formats for backward compatibility
                        if (Array.isArray(fileData)) {
                            // Old format: direct array of pipeline plugins
                            presetData = {
                                name: presetFile.name.replace('.effetune_preset', ''),
                                timestamp: Date.now(),
                                pipeline: fileData
                            };
                        } else if (fileData.pipeline) {
                            // New format: complete preset object
                            presetData = fileData;
                            // Update timestamp to current time
                            presetData.timestamp = Date.now();
                            // If no name is provided, use the filename
                            if (!presetData.name) {
                                presetData.name = presetFile.name.replace('.effetune_preset', '');
                            }
                        } else {
                            // Unknown format
                            window.uiManager.setError('Unknown preset format');
                            setTimeout(() => window.uiManager.clearError(), 3000);
                            return;
                        }
                        
                        // Load the preset
                        window.uiManager.loadPreset(presetData);
                        window.uiManager.setError(`Preset "${presetData.name}" loaded!`);
                        setTimeout(() => window.uiManager.clearError(), 3000);
                    } catch (error) {
                        console.error('Error parsing preset file:', error);
                        window.uiManager.setError('Failed to parse preset file');
                        setTimeout(() => window.uiManager.clearError(), 3000);
                    }
                };
                reader.onerror = () => {
                    window.uiManager.setError('Failed to read preset file');
                    setTimeout(() => window.uiManager.clearError(), 3000);
                };
                reader.readAsText(presetFile);
            } catch (error) {
                console.error('Error reading preset file:', error);
                window.uiManager.setError('Failed to read preset file');
                setTimeout(() => window.uiManager.clearError(), 3000);
            }
        }
    }
}
}, true); // Use capture phase to ensure this handler runs first

// app.initialize() is now called inside the isFirstLaunchPromise.then() block
