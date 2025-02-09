import { PluginManager } from './plugin-manager.js';
import { AudioManager } from './audio-manager.js';
import { UIManager } from './ui-manager.js';

class App {
    constructor() {
        // Initialize core components
        this.pluginManager = new PluginManager();
        this.audioManager = new AudioManager();
        
        // Initialize UI components
        this.uiManager = new UIManager(this.pluginManager, this.audioManager);
        
        // Set pipeline manager reference in audio manager
        this.audioManager.pipelineManager = this.uiManager.pipelineManager;
    }

    async initialize() {
        try {
            // Show loading spinner
            this.uiManager.showLoadingSpinner();

            // Load plugins first
            await this.pluginManager.loadPlugins();

            // Initialize UI components (non-blocking)
            this.uiManager.initPluginList();
            this.uiManager.initDragAndDrop();

            // Initialize audio after plugins are loaded
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
