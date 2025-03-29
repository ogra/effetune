/**
 * PresetManager - Handles preset loading, saving, and deletion
 * Manages preset UI and storage (localStorage for web, file system for Electron)
 */
import { getSerializablePluginStateShort, applySerializedState } from '../../utils/serialization-utils.js';
export class PresetManager {
    /**
     * Create a new PresetManager instance
     * @param {Object} pipelineManager - The pipeline manager instance
     * @param {Object} audioManager - The audio manager instance
     */
    constructor(pipelineManager) {
        this.pipelineManager = pipelineManager;
        this.audioManager = pipelineManager.audioManager;
        
        // Preset UI elements
        this.presetSelect = document.getElementById('presetSelect');
        this.savePresetButton = document.getElementById('savePresetButton');
        this.deletePresetButton = document.getElementById('deletePresetButton');
        
        // Initialize preset management (async)
        this.initPresetManagement().catch(error => {
            console.error('Failed to initialize preset management:', error);
        });
    }
    
    /**
     * Initialize preset management
     */
    async initPresetManagement() {
        // Load presets from local storage or file
        await this.loadPresetList();
        
        // Save preset button
        this.savePresetButton.addEventListener('click', async () => {
            const name = this.presetSelect.value.trim();
            if (name) {
                await this.savePreset(name);
            }
        });
        
        // Delete preset button
        this.deletePresetButton.addEventListener('click', async () => {
            const name = this.presetSelect.value.trim();
            const presets = await this.getPresets();
            if (name && presets[name] && confirm('Delete this preset?')) {
                await this.deletePreset(name);
            }
        });
        
        // Preset selection change
        this.presetSelect.addEventListener('change', async (e) => {
            const name = e.target.value.trim();
            const presets = await this.getPresets();
            if (presets[name]) {
                await this.loadPreset(name);
                // loadPresetList is already called inside loadPreset method
            }
        });
    }
    
    /**
     * Load the preset list from storage
     */
    async loadPresetList() {
        // Get datalist element
        const datalist = document.getElementById('presetList');
        if (!datalist) return;
        
        // Get current value
        const currentValue = this.presetSelect.value;
        
        // Clear existing options
        datalist.innerHTML = '';
        
        // Get presets from local storage or file
        const presets = await this.getPresets();
        
        // Add preset options
        Object.keys(presets).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            datalist.appendChild(option);
        });
        
        // Restore current value
        this.presetSelect.value = currentValue;
    }
    
    /**
     * Get presets from storage
     * @returns {Object} The presets object
     */
    async getPresets() {
        try {
            // Check if running in Electron environment
            if (window.electronAPI && window.electronIntegration && window.electronIntegration.isElectron) {
                // Get app path from Electron
                const appPath = await window.electronAPI.getPath('userData');
                
                // Use path.join for cross-platform compatibility
                const filePath = await window.electronAPI.joinPaths(appPath, 'effetune_presets.json');
                
                // Check if file exists
                const fileExists = await window.electronAPI.fileExists(filePath);
                
                if (!fileExists) {
                    return {};
                }
                
                // Read presets from file
                const result = await window.electronAPI.readFile(filePath);
                
                if (!result.success) {
                    throw new Error(result.error);
                }
                
                // Parse presets
                return JSON.parse(result.content);
            } else {
                // Fallback to localStorage for web version
                const presetsJson = localStorage.getItem('effetune_presets');
                return presetsJson ? JSON.parse(presetsJson) : {};
            }
        } catch (error) {
            console.error('Failed to load presets:', error);
            // Failed to load presets, return empty object
            return {};
        }
    }
    
    /**
     * Save a preset
     * @param {string} name - The name of the preset
     */
    async savePreset(name) {
        const presets = await this.getPresets();
        
        // Create preset data with original format (plugins array)
        const pluginsData = this.audioManager.pipeline.map(plugin =>
            getSerializablePluginStateShort(plugin)
        );
        
        // Save preset with original format
        presets[name] = {
            plugins: pluginsData
        };
        
        try {
            // Check if running in Electron environment
            if (window.electronAPI && window.electronIntegration && window.electronIntegration.isElectron) {
                // Get app path from Electron
                const appPath = await window.electronAPI.getPath('userData');
                
                // Use path.join for cross-platform compatibility
                const filePath = await window.electronAPI.joinPaths(appPath, 'effetune_presets.json');
                
                // Save presets to file
                await window.electronAPI.saveFile(
                    filePath,
                    JSON.stringify(presets, null, 2)
                );
            } else {
                // Fallback to localStorage for web version
                localStorage.setItem('effetune_presets', JSON.stringify(presets));
            }
            
            // Update UI
            this.loadPresetList();
            this.presetSelect.value = name;
            
            if (window.uiManager) {
                window.uiManager.setError('success.presetSaved', false, { name });
                setTimeout(() => window.uiManager.clearError(), 3000);
            }
        } catch (error) {
            console.error('Failed to save preset:', error);
            if (window.uiManager) {
                window.uiManager.setError('error.failedToSavePreset', true);
                setTimeout(() => window.uiManager.clearError(), 3000);
            }
        }
    }
    
    /**
     * Load a preset into the pipeline
     * @param {string|Object} nameOrPreset - The name of the preset to load from file/localStorage, or a preset object
     */
    async loadPreset(nameOrPreset) {
        let preset;
        let name;
        
        
        // Check if nameOrPreset is a string (preset name) or an object (preset data)
        if (typeof nameOrPreset === 'string') {
            // It's a preset name, load from file/localStorage
            name = nameOrPreset;
            const presets = await this.getPresets();
            preset = presets[name];
            
            if (!preset) {
                if (window.uiManager) {
                    window.uiManager.setError('error.invalidPresetData');
                }
                return;
            }
        } else if (typeof nameOrPreset === 'object' && nameOrPreset !== null) {
            // It's a preset object, use directly
            preset = nameOrPreset;
            name = preset.name || 'Imported Preset';
        } else {
            if (window.uiManager) {
                window.uiManager.setError('error.invalidPresetData');
            }
            return;
        }
        
        try {
            // Clean up existing plugins before removing them
            this.audioManager.pipeline.forEach(plugin => {
                if (typeof plugin.cleanup === 'function') {
                    plugin.cleanup();
                }
            });
            
            // Clear current pipeline and expanded plugins
            this.audioManager.pipeline.length = 0;
            this.pipelineManager.expandedPlugins.clear();
            
            let plugins = [];
            
            // Handle both old format (plugins array) and new format (pipeline array)
            if (preset.pipeline && Array.isArray(preset.pipeline)) {
                // New format
                plugins = preset.pipeline.map(pluginState => {
                    const plugin = this.pipelineManager.pluginManager.createPlugin(pluginState.name);
                    if (!plugin) return null;
                    
                    // Create a state object in the format expected by applySerializedState
                    const state = {
                        nm: pluginState.name,
                        en: pluginState.enabled,
                        ...(pluginState.inputBus !== undefined && { ib: pluginState.inputBus }),
                        ...(pluginState.outputBus !== undefined && { ob: pluginState.outputBus }),
                        ...pluginState.parameters
                    };
                    
                    // Apply serialized state
                    applySerializedState(plugin, state);
                    
                    this.pipelineManager.expandedPlugins.add(plugin);
                    return plugin;
                }).filter(plugin => plugin !== null);
            } else if (preset.plugins && Array.isArray(preset.plugins)) {
                // Old format
                plugins = preset.plugins.map(state => {
                    const plugin = this.pipelineManager.pluginManager.createPlugin(state.nm);
                    if (!plugin) return null;
                    
                    // Apply serialized state
                    applySerializedState(plugin, state);
                    
                    this.pipelineManager.expandedPlugins.add(plugin);
                    return plugin;
                }).filter(plugin => plugin !== null);
            } else {
                throw new Error('Unrecognized preset format');
            }
            
            // Update pipeline without rebuilding
            this.audioManager.pipeline = plugins;
            
            // Update UI with force rebuild flag
            this.pipelineManager.core.updatePipelineUI(true);
            
            // Update worklet directly without rebuilding pipeline
            this.pipelineManager.core.updateWorkletPlugins();
            
            // Update preset list to ensure all presets are available
            this.loadPresetList();
            
            // Ensure master bypass is OFF after loading preset
            this.pipelineManager.core.enabled = true;
            this.audioManager.setMasterBypass(false);
            const masterToggle = document.querySelector('.toggle-button.master-toggle');
            if (masterToggle) {
                masterToggle.classList.remove('off');
            }
            
            // Save state for undo/redo after loading preset
            this.pipelineManager.historyManager.saveState();
            
            // Display message only when loading from preset combo box (string name)
            if (window.uiManager && typeof nameOrPreset === 'string') {
                window.uiManager.setError('success.presetLoaded', false, { name });
                setTimeout(() => window.uiManager.clearError(), 3000);
            }
        } catch (error) {
            // Failed to load preset
            if (window.uiManager) {
                window.uiManager.setError('error.failedToLoadPreset');
            }
        }
    }
    
    /**
     * Delete a preset
     * @param {string} name - The name of the preset to delete
     */
    async deletePreset(name) {
        const presets = await this.getPresets();
        if (!presets[name]) {
            if (window.uiManager) {
                window.uiManager.setError('error.noPresetSelected');
            }
            return;
        }
        
        delete presets[name];
        
        try {
            // Check if running in Electron environment
            if (window.electronAPI && window.electronIntegration && window.electronIntegration.isElectron) {
                // Get app path from Electron
                const appPath = await window.electronAPI.getPath('userData');
                
                // Use path.join for cross-platform compatibility
                const filePath = await window.electronAPI.joinPaths(appPath, 'effetune_presets.json');
                
                // Save presets to file
                await window.electronAPI.saveFile(
                    filePath,
                    JSON.stringify(presets, null, 2)
                );
            } else {
                // Fallback to localStorage for web version
                localStorage.setItem('effetune_presets', JSON.stringify(presets));
            }
            
            // Update UI
            this.loadPresetList();
            this.presetSelect.value = '';
            
            if (window.uiManager) {
                window.uiManager.setError('success.presetDeleted', false, { name });
                setTimeout(() => window.uiManager.clearError(), 3000);
            }
        } catch (error) {
            console.error('Failed to delete preset:', error);
            if (window.uiManager) {
                window.uiManager.setError('error.failedToDeletePreset', true);
                setTimeout(() => window.uiManager.clearError(), 3000);
            }
        }
    }
    
    /**
     * Get current preset data for export
     * @returns {Object} Current preset data
     */
    getCurrentPresetData() {
        const presetName = this.presetSelect.value.trim() || 'My Preset';
        
        // Get current pipeline state in the original export format (pipeline array)
        const pipelineState = this.audioManager.pipeline.map(plugin =>
            this.pipelineManager.core.getSerializablePluginState(plugin, false, true, true)
        );
        
        return {
            name: presetName,
            pipeline: pipelineState,
            timestamp: Date.now()
        };
    }
}