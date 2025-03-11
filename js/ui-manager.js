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
        
        // Initialize localization
        this.translations = {}; // Current language translations
        this.englishTranslations = {}; // English translations for fallback
        
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
        
        // Initialize localization after everything else is set up
        // This is an async operation, but we can't make the constructor async
        this.initLocalization().then(() => {
            // Update UI texts after translations are loaded
            this.updateUITexts();
            console.log('UI texts updated with translations');
        }).catch(error => {
            console.error('Failed to initialize localization:', error);
        });
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

    // Delegate to StateManager with translation
    setError(message, isError = false, params = {}) {
        // Check if the message is a translation key
        if (message && (message.startsWith('error.') || message.startsWith('success.') || message.startsWith('status.'))) {
            // Translate the message with provided parameters
            message = this.t(message, params);
        }
        
        this.stateManager.setError(message, isError);
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
            // Validate base64 format using regex
            if (!/^[A-Za-z0-9+/=]+$/.test(pipelineParam)) {
                throw new Error('Invalid base64 characters in pipeline parameter');
            }
            
            // Convert base64 back to JSON
            const jsonStr = atob(pipelineParam);
            const state = JSON.parse(jsonStr);
            
            // Validate that state is an array
            if (!Array.isArray(state)) {
                throw new Error('Pipeline state must be an array');
            }
            
            // Validate each plugin in the state
            const result = state.map(serializedParams => {
                // Validate required fields
                if (typeof serializedParams !== 'object' || serializedParams === null) {
                    throw new Error('Each plugin state must be an object');
                }
                
                const { nm: name, en: enabled, ...allParams } = serializedParams;
                
                // Validate plugin name
                if (typeof name !== 'string' || name.trim() === '') {
                    throw new Error('Plugin name is required and must be a string');
                }
                
                // Validate that the plugin exists in the plugin manager
                if (this.pluginManager && !this.pluginManager.isPluginAvailable(name)) {
                    console.warn(`Plugin "${name}" is not available in the current configuration`);
                    // We don't throw here to allow for backward compatibility with older configs
                }
                
                // Validate enabled state
                if (enabled !== undefined && typeof enabled !== 'boolean') {
                    throw new Error('Plugin enabled state must be a boolean');
                }
                
                // Create a deep copy of all parameters
                const paramsCopy = JSON.parse(JSON.stringify(allParams));
                
                // Return the complete plugin state
                return {
                    name,
                    enabled: enabled === undefined ? true : enabled, // Default to enabled if not specified
                    parameters: paramsCopy
                };
            });
            
            return result;
        } catch (error) {
            console.error('Failed to parse pipeline state:', error);
            // Show error to user
            if (this.stateManager) {
                this.stateManager.setError(this.t('error.invalidUrl', { message: error.message }));
                setTimeout(() => this.stateManager.clearError(), 5000);
            }
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
            
            // Listen for sleep mode changes from AudioManager
            this.audioManager.addEventListener('sleepModeChanged', (data) => {
                this.updateSleepModeDisplay(data.isSleepMode, data.sampleRate);
            });
        }
    }
    
    // Update the sleep mode display based on the sleep mode state
    updateSleepModeDisplay(isSleepMode, sampleRate) {
        if (!this.sampleRate) return;
        
        const sleepModeText = this.t('ui.sleepMode');
        
        if (isSleepMode) {
            // Add sleep mode indicator if not already present
            if (!this.sampleRate.textContent.includes(sleepModeText)) {
                this.sampleRate.textContent += ` - ${sleepModeText}`;
            }
        } else {
            // Remove sleep mode indicator and ensure sample rate is displayed correctly
            this.sampleRate.textContent = this.sampleRate.textContent.replace(` - ${sleepModeText}`, '');
            // Make sure the sample rate is still displayed correctly
            if (!this.sampleRate.textContent.includes('Hz') && sampleRate) {
                this.sampleRate.textContent = `${sampleRate} Hz`;
            }
        }
    }
    
    // Update the sample rate display with the current audio context sample rate
    updateSampleRateDisplay() {
        if (this.audioManager.audioContext && this.sampleRate) {
            // Get the current sample rate from the audio context
            const currentSampleRate = this.audioManager.audioContext.sampleRate;
            
            // Preserve sleep mode indicator if present
            const sleepModeText = this.t('ui.sleepMode');
            const isSleepMode = this.sampleRate.textContent.includes(sleepModeText);
            this.sampleRate.textContent = `${currentSampleRate} Hz`;
            if (isSleepMode) {
                this.sampleRate.textContent += ` - ${sleepModeText}`;
            }
            
            // Add a visual indicator if the sample rate is below recommended value
            if (currentSampleRate < 88200) {
                this.sampleRate.classList.add('low-sample-rate');
                this.sampleRate.title = this.t('error.sampleRateWarning');
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
        return 'en';
    }

    /**
     * Initialize localization system
     */
    async initLocalization() {
        try {
            console.log(`Initializing localization for language: ${this.userLanguage}`);
            
            // Always load English translations first for fallback
            await this.loadEnglishTranslations();
            
            // If user language is not English, load that language's translations
            if (this.userLanguage !== 'en') {
                await this.loadTranslations(this.userLanguage);
            }
            
            // Update Electron menu if in Electron environment
            if (window.electronIntegration && window.electronIntegration.isElectronEnvironment()) {
                window.electronIntegration.updateApplicationMenu();
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize localization:', error);
            // Initialize with empty translations to avoid errors
            this.translations = {};
            this.englishTranslations = {};
            return false;
        }
    }
    
    /**
     * Load English translations for fallback
     */
    async loadEnglishTranslations() {
        try {
            // Try to load the English locale file
            const response = await fetch('js/locales/en.json5');
            
            // If the English file doesn't exist, initialize with empty object
            if (!response.ok) {
                console.error('English translation file not found');
                this.englishTranslations = {};
                return;
            }
            
            // Get the JSON5 content as text
            const json5Content = await response.text();
            
            // Remove comments from JSON5 (simple approach)
            const jsonContent = json5Content
                .replace(/\/\/.*$/gm, '') // Remove single-line comments
                .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
            
            // Parse the JSON content
            this.englishTranslations = JSON.parse(jsonContent);
            console.log('English translations loaded successfully');
            
            // If user language is English, set translations to English
            if (this.userLanguage === 'en') {
                this.translations = { ...this.englishTranslations };
            }
        } catch (error) {
            console.error('Error loading English translations:', error);
            // If English file cannot be loaded, initialize with empty object
            this.englishTranslations = {};
        }
    }

    /**
     * Load translations for the specified language
     * @param {string} locale - The language code to load
     */
    async loadTranslations(locale) {
        // Default to English if locale is not specified
        const targetLocale = locale || 'en';
        
        // If loading English, use the already loaded English translations
        if (targetLocale === 'en') {
            this.translations = this.englishTranslations;
            this.updateUITexts();
            return;
        }
        
        try {
            // Try to load the specified locale file
            const response = await fetch(`js/locales/${targetLocale}.json5`);
            
            // If the locale file doesn't exist, fall back to English
            if (!response.ok) {
                console.warn(`Translation file for ${targetLocale} not found, falling back to English`);
                this.translations = this.englishTranslations;
                this.updateUITexts();
                return;
            }
            
            // Get the JSON5 content as text
            const json5Content = await response.text();
            
            // Remove comments from JSON5 (simple approach)
            const jsonContent = json5Content
                .replace(/\/\/.*$/gm, '') // Remove single-line comments
                .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
            
            // Parse the JSON content
            this.translations = JSON.parse(jsonContent);
            
            // Update UI texts with new translations
            this.updateUITexts();
            
            // Update Electron menu if in Electron environment
            if (window.electronIntegration && window.electronIntegration.isElectronEnvironment()) {
                window.electronIntegration.updateApplicationMenu();
            }
        } catch (error) {
            console.error(`Error loading translations for ${targetLocale}:`, error);
            // Fall back to English translations
            this.translations = this.englishTranslations;
            this.updateUITexts();
        }
    }

    /**
     * Get a translated string by key
     * @param {string} key - The translation key
     * @param {Object} params - Parameters to replace in the string
     * @returns {string} The translated string
     */
    t(key, params = {}) {
        // First try to get the translation from the current language
        let text;
        
        // If the key exists in current language translations, use it
        if (this.translations && this.translations[key]) {
            text = this.translations[key];
        }
        // If not found in current language but exists in English, use English translation
        else if (this.englishTranslations && this.englishTranslations[key]) {
            text = this.englishTranslations[key];
        }
        // If not found in either language, use the key itself
        else {
            text = key;
        }
        
        // Replace parameters in the string
        if (params && Object.keys(params).length > 0) {
            Object.entries(params).forEach(([param, value]) => {
                const placeholder = `{${param}}`;
                text = text.replace(new RegExp(placeholder, 'g'), value);
            });
        }
        
        return text;
    }

    /**
     * Update UI elements with translated text
     */
    updateUITexts() {
        // Update static UI elements
        document.querySelector('.subtitle').textContent = "Color the music, unleash your senses. Craft your own signature sound.";
        document.querySelector('.whats-this').textContent = this.t('ui.whatsThisApp');
        document.getElementById('availableEffectsTitle').textContent = "Available Effects";
        document.querySelector('.pipeline-header h2').textContent = "Effect Pipeline";
        document.getElementById('pipelineEmpty').textContent = this.t('ui.dragPluginsHere');
        document.getElementById('shareButton').textContent = this.t('ui.shareButton');
        document.getElementById('effectSearchInput').placeholder = this.t('ui.searchEffectsPlaceholder');
        
        // Update reset button text based on environment
        const isElectron = window.electronIntegration && window.electronIntegration.isElectronEnvironment();
        this.resetButton.textContent = isElectron ? this.t('ui.configAudioButton') : this.t('ui.resetButton');
        
        // Update drag message in plugin list manager
        if (this.pluginListManager && this.pluginListManager.dragMessage) {
            this.pluginListManager.dragMessage.textContent = this.t('ui.dragEffectMessage');
        }
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
                    this.setError('success.urlCopied', false);
                    setTimeout(() => this.clearError(), 3000);
                })
                .catch(err => {
                    console.error('Failed to copy URL:', err);
                    this.setError('error.failedToCopyUrl', true);
                });
        });
    }

    /**
     * Initialize preset management functionality
     * Adds support for saving and loading presets in Electron environment
     */
    /**
     * Initialize preset management by delegating to PipelineManager
     */
    initPresetManagement() {
        // Get preset UI elements for reference
        this.presetSelect = document.getElementById('presetSelect');
        this.presetList = document.getElementById('presetList');
        this.savePresetButton = document.getElementById('savePresetButton');
        this.deletePresetButton = document.getElementById('deletePresetButton');
        
        // Delegate preset management to PipelineManager
        // PipelineManager already initializes these elements in its constructor
    }
    
    /**
     * Get current preset data for export
     * Delegates to PipelineManager
     * @returns {Object} Current preset data
     */
    getCurrentPresetData() {
        return this.pipelineManager.getCurrentPresetData();
    }
    
    /**
     * Load a preset into the pipeline
     * Delegates to PipelineManager
     * @param {Object} preset The preset to load
     */
    loadPreset(preset) {
        if (!preset) {
            this.setError('error.invalidPresetData', true);
            return;
        }
        
        try {
            // Handle different preset formats
            if (preset.pipeline && Array.isArray(preset.pipeline)) {
                // New format with pipeline array
                // Convert to the format expected by PipelineManager
                const presetName = preset.name || 'Imported Preset';
                const pluginsData = preset.pipeline.map(pluginState => {
                    return {
                        nm: pluginState.name,
                        en: pluginState.enabled,
                        ...pluginState.parameters
                    };
                });
                
                // Create a preset object in the format expected by PipelineManager
                const pipelineManagerPreset = {
                    name: presetName,
                    plugins: pluginsData
                };
                
                // Load the preset directly without affecting localStorage
                this.pipelineManager.loadPreset(pipelineManagerPreset);
                
                // Clear the preset combo box after loading from file
                this.presetSelect.value = '';
            } else if (preset.plugins && Array.isArray(preset.plugins)) {
                // Old format with plugins array - can be passed directly
                const presetName = preset.name || 'Imported Preset';
                
                // Ensure the preset has a name
                const pipelineManagerPreset = {
                    ...preset,
                    name: presetName
                };
                
                // Load the preset directly without affecting localStorage
                this.pipelineManager.loadPreset(pipelineManagerPreset);
                
                // Clear the preset combo box after loading from file
                this.presetSelect.value = '';
            } else {
                this.setError('error.invalidPresetFormat', true);
            }
        } catch (error) {
            console.error('Failed to load preset:', error);
            this.setError('error.failedToLoadPreset', true);
        }
    }
}
