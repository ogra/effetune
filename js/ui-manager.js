import { PluginListManager } from './ui/plugin-list-manager.js';
import { PipelineManager } from './ui/pipeline-manager.js';
import { StateManager } from './ui/state-manager.js';
import { electronIntegration } from './electron-integration.js';

export class UIManager {
    constructor(pluginManager, audioManager) {
        this.pluginManager = pluginManager;
        this.audioManager = audioManager;
        
        // Set directly in UIManager to maintain original behavior
        this.expandedPlugins = new Set();
        
        // UI elements
        this.errorDisplay = document.getElementById('errorDisplay');
        this.resetButton = document.getElementById('resetButton');
        this.shareButton = document.getElementById('shareButton');
        this.pluginList = document.getElementById('pluginList');
        this.pipelineList = document.getElementById('pipelineList');
        this.pipelineEmpty = document.getElementById('pipelineEmpty');
        this.sampleRate = document.getElementById('sampleRate');

        // Initialize supported languages
        this.supportedLanguages = ['ar', 'es', 'fr', 'hi', 'ja', 'ko', 'pt', 'ru', 'zh'];
        this.userLanguage = this.determineUserLanguage();

        // Initialize managers
        this.pluginListManager = new PluginListManager(pluginManager);
        this.pipelineManager = new PipelineManager(audioManager, pluginManager, this.expandedPlugins, this.pluginListManager);
        this.stateManager = new StateManager(audioManager);

        // Make UIManager instance globally available for URL updates
        window.uiManager = this;

        // Initialize UI elements
        this.initWhatsThisLink();
        this.initPipelineManager();
        this.initShareButton();
        this.initPresetManagement();
    }

    // Delegate to PluginListManager
    showLoadingSpinner() {
        this.pluginListManager.showLoadingSpinner();
    }

    hideLoadingSpinner() {
        this.pluginListManager.hideLoadingSpinner();
    }
    
    updateLoadingProgress(percent) {
        this.pluginListManager.updateLoadingProgress(percent);
    }

    initPluginList() {
        this.pluginListManager.initPluginList();
    }

    // Delegate to PipelineManager
    initDragAndDrop() {
        this.pipelineManager.initDragAndDrop();
    }

    updatePipelineUI() {
        this.pipelineManager.updatePipelineUI();
    }

    // Delegate to StateManager
    setError(message) {
        this.stateManager.setError(message);
    }

    clearError() {
        this.stateManager.clearError();
    }

    // URL state management
    parsePipelineState() {
        const params = new URLSearchParams(window.location.search);
        const pipelineParam = params.get('p');
        if (!pipelineParam) return null;
        
        try {
            // Convert base64 back to JSON
            const jsonStr = atob(pipelineParam);
            const state = JSON.parse(jsonStr);
            
            // Convert serialized state back to plugin format
            const result = state.map(serializedParams => {
                // Extract plugin name and enabled state
                const { nm: name, en: enabled, ...allParams } = serializedParams;
                
                // Create a deep copy of all parameters
                const paramsCopy = JSON.parse(JSON.stringify(allParams));
                
                // Return the complete plugin state
                return {
                    name,
                    enabled,
                    parameters: paramsCopy
                };
            });
            return result;
        } catch (error) {
            console.error('Failed to parse pipeline state:', error);
            return null;
        }
    }

    getPipelineState() {
        const state = this.audioManager.pipeline.map(plugin => {
            // Get serializable parameters first
            let params = plugin.getSerializableParameters();
            
            // If getSerializableParameters is not available, try getParameters
            if (!params && plugin.getParameters) {
                params = JSON.parse(JSON.stringify(plugin.getParameters()));
            }
            
            // If neither method is available, use plugin.parameters directly
            if (!params && plugin.parameters) {
                params = JSON.parse(JSON.stringify(plugin.parameters));
            }
            
            // Ensure we have at least an empty object
            params = params || {};
            
            // Remove id from params if it exists
            const { id, type, enabled, ...cleanParams } = params;
            
            // Create the final state object
            return {
                nm: plugin.name,
                en: plugin.enabled,
                ...cleanParams
            };
        });
        
        return btoa(JSON.stringify(state));
    }

    updateURL() {
        // Get current state
        const state = this.getPipelineState();
        const newURL = new URL(window.location.href);
        newURL.searchParams.set('p', state);
        
        // Clear any existing timeout
        if (this._updateURLTimeout) {
            clearTimeout(this._updateURLTimeout);
        }
        
        // Store the latest URL to ensure it gets applied
        this._latestURL = newURL;
        
        // Set a new timeout
        this._updateURLTimeout = setTimeout(() => {
            // Apply the latest URL
            window.history.replaceState({}, '', this._latestURL);
            this._updateURLTimeout = null;
        }, 100); // Throttle to once every 100ms
    }

    // Call this method after audio context is initialized
    initAudio() {
        if (this.audioManager.audioContext) {
            this.updateSampleRateDisplay();
            
            // Set up a MutationObserver to watch for changes to the sampleRate element
            // This ensures the sample rate is always displayed correctly, even after sleep mode changes
            if (!this._sampleRateObserver) {
                this._sampleRateObserver = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        if (mutation.type === 'childList' || mutation.type === 'characterData') {
                            // If the content doesn't end with Hz, update it
                            const content = this.sampleRate.textContent;
                            if (!content.includes('Hz')) {
                                this.updateSampleRateDisplay();
                            }
                        }
                    }
                });
                
                this._sampleRateObserver.observe(this.sampleRate, {
                    childList: true,
                    characterData: true,
                    subtree: true
                });
            }
        }
    }
    
    // Update the sample rate display with the current audio context sample rate
    updateSampleRateDisplay() {
        if (this.audioManager.audioContext && this.sampleRate) {
            // Get the current sample rate from the audio context
            const currentSampleRate = this.audioManager.audioContext.sampleRate;
            
            // Preserve sleep mode indicator if present
            const isSleepMode = this.sampleRate.textContent.includes('Sleep Mode');
            this.sampleRate.textContent = `${currentSampleRate} Hz`;
            if (isSleepMode) {
                this.sampleRate.textContent += ' - Sleep Mode';
            }
            
            // Add a visual indicator if the sample rate is below recommended value
            if (currentSampleRate < 88200) {
                this.sampleRate.classList.add('low-sample-rate');
                this.sampleRate.title = 'Sample rate is below recommended 88.2kHz. Audio quality may be affected.';
            } else {
                this.sampleRate.classList.remove('low-sample-rate');
                this.sampleRate.title = '';
            }
        }
    }

    determineUserLanguage() {
        // Get browser language (e.g., 'ja', 'en-US', 'fr')
        const browserLang = navigator.language.split('-')[0];
        
        // Check if browser language is supported
        if (this.supportedLanguages.includes(browserLang)) {
            return browserLang;
        }
        
        // Default to English (use default docs) if language is not supported
        return null;
    }

    getLocalizedDocPath(basePath) {
        // Always use GitHub Pages paths for both web and Electron
        const baseUrl = 'https://frieve-a.github.io/effetune';
        
        // Ensure we're working with a clean path
        let cleanPath = basePath;
        
        // Convert .md to .html if needed
        if (cleanPath.endsWith('.md')) {
            cleanPath = cleanPath.replace(/\.md$/, '.html');
        }
        
        // If path is '/readme.md' or '/readme.html', convert it to root directory
        if (cleanPath === '/readme.html' || cleanPath === '/readme.md' || cleanPath === '/') {
            if (this.userLanguage) {
                return `${baseUrl}/docs/i18n/${this.userLanguage}/`;
            }
            return `${baseUrl}/`;
        }
        
        // Handle plugin documentation
        if (cleanPath.startsWith('/plugins/')) {
            // Extract anchor if present
            let anchor = '';
            if (cleanPath.includes('#')) {
                const parts = cleanPath.split('#');
                cleanPath = parts[0];
                anchor = '#' + parts[1];
            }
            
            // Remove any existing extension
            cleanPath = cleanPath.replace(/\.[^/.]+$/, '');
            
            // Add .html extension
            cleanPath = cleanPath + '.html' + anchor;
            
            if (this.userLanguage) {
                return `${baseUrl}/docs/i18n/${this.userLanguage}${cleanPath}`;
            }
            return `${baseUrl}/docs${cleanPath}`;
        }
        
        // Handle index.html or empty path
        if (cleanPath === '/index.html' || cleanPath === './') {
            if (this.userLanguage) {
                return `${baseUrl}/docs/i18n/${this.userLanguage}/`;
            }
            return `${baseUrl}/`;
        }
        
        // For other paths
        if (this.userLanguage) {
            return `${baseUrl}/docs/i18n/${this.userLanguage}${cleanPath}`;
        }
        return `${baseUrl}/docs${cleanPath}`;
    }

    initWhatsThisLink() {
        const whatsThisLink = document.querySelector('.whats-this');
        if (whatsThisLink) {
            // Get the localized path (now always returns a web URL)
            const localizedPath = this.getLocalizedDocPath('/readme.md');
            
            // For both Electron and web, open the URL in external browser
            whatsThisLink.addEventListener('click', (e) => {
                e.preventDefault();
                
                // In Electron, use shell.openExternal to open in default browser
                if (window.electronAPI) {
                    window.electronAPI.openExternalUrl(localizedPath)
                        .catch(err => {
                            console.error('Error opening external URL:', err);
                            // Fallback to window.open
                            window.open(localizedPath, '_blank');
                        });
                } else {
                    // For web, just open in new tab
                    window.open(localizedPath, '_blank');
                }
            });
            
            // Set href for right-click "Open in new tab" functionality
            whatsThisLink.href = localizedPath;
            whatsThisLink.target = '_blank';
        }
    }

    initPipelineManager() {
        // Pass the getLocalizedDocPath method to PipelineManager
        this.pipelineManager.getLocalizedDocPath = this.getLocalizedDocPath.bind(this);
    }

    initShareButton() {
        this.shareButton.addEventListener('click', () => {
            const state = this.getPipelineState();
            const newURL = new URL('https://frieve-a.github.io/effetune/effetune.html');
            newURL.searchParams.set('p', state);
            navigator.clipboard.writeText(newURL.toString())
                .then(() => {
                    this.setError('URL copied to clipboard!');
                    setTimeout(() => this.clearError(), 3000);
                })
                .catch(err => {
                    console.error('Failed to copy URL:', err);
                    this.setError('Failed to copy URL to clipboard');
                });
        });
    }

    /**
     * Initialize preset management functionality
     * Adds support for saving and loading presets in Electron environment
     */
    initPresetManagement() {
        // Get preset UI elements
        this.presetSelect = document.getElementById('presetSelect');
        this.presetList = document.getElementById('presetList');
        this.savePresetButton = document.getElementById('savePresetButton');
        this.deletePresetButton = document.getElementById('deletePresetButton');
        
        // Initialize preset storage
        this.presets = this.loadPresetsFromStorage() || {};
        this.updatePresetList();
        
        // Set up event listeners
        this.savePresetButton.addEventListener('click', () => this.saveCurrentPreset());
        this.deletePresetButton.addEventListener('click', () => this.deleteCurrentPreset());
        this.presetSelect.addEventListener('change', () => this.loadSelectedPreset());
    }
    
    /**
     * Load presets from local storage
     * @returns {Object} Saved presets or empty object if none found
     */
    loadPresetsFromStorage() {
        try {
            const presetsJson = localStorage.getItem('effetune-presets');
            return presetsJson ? JSON.parse(presetsJson) : {};
        } catch (error) {
            console.error('Failed to load presets:', error);
            return {};
        }
    }
    
    /**
     * Save presets to local storage
     */
    savePresetsToStorage() {
        try {
            localStorage.setItem('effetune-presets', JSON.stringify(this.presets));
        } catch (error) {
            console.error('Failed to save presets:', error);
        }
    }
    
    /**
     * Update the preset dropdown list
     */
    updatePresetList() {
        // Clear existing options
        this.presetList.innerHTML = '';
        
        // Add each preset to the datalist
        Object.keys(this.presets).forEach(presetName => {
            const option = document.createElement('option');
            option.value = presetName;
            this.presetList.appendChild(option);
        });
    }
    
    /**
     * Save the current pipeline state as a preset
     */
    saveCurrentPreset() {
        const presetName = this.presetSelect.value.trim();
        if (!presetName) {
            this.setError('Please enter a preset name');
            return;
        }
        
        // Get current pipeline state
        const pipelineState = this.audioManager.pipeline.map(plugin => {
            // Get serializable parameters
            let params = plugin.getSerializableParameters ?
                plugin.getSerializableParameters() :
                (plugin.getParameters ? plugin.getParameters() : plugin.parameters);
            
            // Create a deep copy
            params = JSON.parse(JSON.stringify(params || {}));
            
            return {
                name: plugin.name,
                enabled: plugin.enabled,
                parameters: params
            };
        });
        
        // Save preset
        this.presets[presetName] = {
            name: presetName,
            pipeline: pipelineState,
            timestamp: Date.now()
        };
        
        // Update storage and UI
        this.savePresetsToStorage();
        this.updatePresetList();
        this.setError(`Preset "${presetName}" saved`);
        setTimeout(() => this.clearError(), 3000);
    }
    
    /**
     * Delete the currently selected preset
     */
    deleteCurrentPreset() {
        const presetName = this.presetSelect.value.trim();
        if (!presetName || !this.presets[presetName]) {
            this.setError('No preset selected');
            return;
        }
        
        // Delete preset
        delete this.presets[presetName];
        
        // Update storage and UI
        this.savePresetsToStorage();
        this.updatePresetList();
        this.presetSelect.value = '';
        this.setError(`Preset "${presetName}" deleted`);
        setTimeout(() => this.clearError(), 3000);
    }
    
    /**
     * Load the selected preset
     */
    loadSelectedPreset() {
        const presetName = this.presetSelect.value.trim();
        if (!presetName || !this.presets[presetName]) {
            return;
        }
        
        this.loadPreset(this.presets[presetName]);
    }
    
    /**
     * Load a preset into the pipeline
     * @param {Object} preset The preset to load
     */
    loadPreset(preset) {
        if (!preset || !preset.pipeline || !Array.isArray(preset.pipeline)) {
            this.setError('Invalid preset data');
            return;
        }
        
        try {
            // Clear current pipeline
            this.audioManager.pipeline = [];
            
            // Create new plugins from preset data
            const plugins = preset.pipeline.map(pluginState => {
                const plugin = this.pluginManager.createPlugin(pluginState.name);
                plugin.enabled = pluginState.enabled;
                
                // Restore parameters
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
                this.expandedPlugins.add(plugin);
                return plugin;
            });
            
            // Update pipeline without rebuilding
            this.audioManager.pipeline = plugins;
            
            // Update worklet directly without rebuilding pipeline
            if (window.workletNode) {
                window.workletNode.port.postMessage({
                    type: 'updatePlugins',
                    plugins: this.audioManager.pipeline.map(plugin => ({
                        id: plugin.id,
                        type: plugin.constructor.name,
                        enabled: plugin.enabled,
                        parameters: plugin.getParameters()
                    })),
                    masterBypass: this.audioManager.masterBypass
                });
            }
            
            // Update UI
            this.updatePipelineUI();
            this.updateURL();
            this.setError(`Preset "${preset.name}" loaded`);
            setTimeout(() => this.clearError(), 3000);
        } catch (error) {
            console.error('Failed to load preset:', error);
            this.setError('Failed to load preset');
        }
    }
    
    /**
     * Get current preset data for export
     * @returns {Object} Current preset data
     */
    getCurrentPresetData() {
        const presetName = this.presetSelect.value.trim() || 'My Preset';
        
        // Get current pipeline state
        const pipelineState = this.audioManager.pipeline.map(plugin => {
            // Get serializable parameters
            let params = plugin.getSerializableParameters ?
                plugin.getSerializableParameters() :
                (plugin.getParameters ? plugin.getParameters() : plugin.parameters);
            
            // Create a deep copy
            params = JSON.parse(JSON.stringify(params || {}));
            
            return {
                name: plugin.name,
                enabled: plugin.enabled,
                parameters: params
            };
        });
        
        return {
            name: presetName,
            pipeline: pipelineState,
            timestamp: Date.now()
        };
    }
}
