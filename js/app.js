import { PluginManager } from './plugin-manager.js';
import { AudioManager } from './audio-manager.js';
import { UIManager } from './ui-manager.js';

class App {
    constructor() {
        this.pluginManager = new PluginManager();
        this.audioManager = new AudioManager();
        this.uiManager = new UIManager(this.pluginManager, this.audioManager);
    }

    async initialize() {
        try {
            // Show loading spinner
            this.uiManager.showLoadingSpinner();

            // Load plugins
            await this.pluginManager.loadPlugins();

            // Initialize UI components
            this.uiManager.initPluginList();
            this.uiManager.initDragAndDrop();

            // Start audio after plugins are loaded
            await this.audioManager.initAudio();
            this.uiManager.initAudio();

            // Initialize pipeline
            const savedState = this.uiManager.parsePipelineState();
            
            if (savedState) {
                // Restore pipeline from URL
                for (const pluginState of savedState) {
                    console.log('Creating plugin from state:', pluginState);
                    const plugin = this.pluginManager.createPlugin(pluginState.name);
                    plugin.enabled = pluginState.enabled;
                    
                    // Restore parameters
                    plugin.setSerializedParameters(pluginState.parameters);
                    
                    this.uiManager.expandedPlugins.add(plugin);
                    this.audioManager.pipeline.push(plugin);
                }
            } else {
                // Initialize default plugins
                const defaultPlugins = [
                    { name: 'Volume', config: { volume: -6 } },
                    { name: 'Level Meter' }
                ];
                
                for (const pluginConfig of defaultPlugins) {
                    const plugin = this.pluginManager.createPlugin(pluginConfig.name);
                    if (pluginConfig.config) {
                        if (pluginConfig.config.volume !== undefined) {
                            plugin.setVl(pluginConfig.config.volume);
                        }
                    }
                    this.uiManager.expandedPlugins.add(plugin);
                    this.audioManager.pipeline.push(plugin);
                }
                // Update URL with default pipeline state
                this.uiManager.updateURL();
            }
            
            this.uiManager.updatePipelineUI();
            await this.audioManager.rebuildPipeline();

            // Clear loading message and hide spinner
            this.uiManager.clearError();
            this.uiManager.hideLoadingSpinner();

            // Auto-resume audio context when page gains focus
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && this.audioManager.audioContext && 
                    this.audioManager.audioContext.state === 'suspended') {
                    this.audioManager.audioContext.resume();
                }
            });

        } catch (error) {
            this.uiManager.setError(error.message);
        }
    }
}

// Initialize application
const app = new App();

// Make uiManager globally accessible for plugins
window.uiManager = app.uiManager;

app.initialize();
