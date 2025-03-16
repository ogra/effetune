export class PipelineManager {
    constructor(audioManager, pluginManager, expandedPlugins, pluginListManager) {
        this.audioManager = audioManager;
        this.pluginManager = pluginManager;
        this.expandedPlugins = expandedPlugins;
        this.pluginListManager = pluginListManager;
        this.selectedPlugins = new Set();
        this.enabled = true;
        
        this.pipelineList = document.getElementById('pipelineList');
        this.pipelineEmpty = document.getElementById('pipelineEmpty');
        
        // Preset UI elements
        this.presetSelect = document.getElementById('presetSelect');
        this.savePresetButton = document.getElementById('savePresetButton');
        this.deletePresetButton = document.getElementById('deletePresetButton');
        
        // Undo/Redo history
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 100;
        this.isUndoRedoOperation = false;
        
        // Initialize keyboard events
        this.initKeyboardEvents();
        
        // Create master toggle button
        this.createMasterToggle();
        
        // Initialize preset management (async)
        this.initPresetManagement().catch(error => {
            console.error('Failed to initialize preset management:', error);
        });
        
        // Save initial state after a short delay to ensure Volume and Level Meter are initialized
        setTimeout(() => {
            this.saveState();
        }, 1000);
    }

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

    async savePreset(name) {
        const presets = await this.getPresets();
        
        // Create preset data with original format (plugins array)
        const pluginsData = this.audioManager.pipeline.map(plugin => {
            const params = plugin.getSerializableParameters ?
                plugin.getSerializableParameters() : {};
            
            // Remove id from params if it exists
            const { id, enabled, ...cleanParams } = params;
            
            // Use nm and en for name and enabled to maintain original format
            return {
                ...cleanParams,
                nm: plugin.name,
                en: plugin.enabled
            };
        });
        
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
            this.expandedPlugins.clear();
            
            let plugins = [];
            
            // Handle both old format (plugins array) and new format (pipeline array)
            if (preset.pipeline && Array.isArray(preset.pipeline)) {
                // New format
                plugins = preset.pipeline.map(pluginState => {
                    const plugin = this.pluginManager.createPlugin(pluginState.name);
                    if (!plugin) return null;
                    
                    plugin.enabled = pluginState.enabled;
                    
                    // Restore parameters
                    if (plugin.setSerializedParameters) {
                        plugin.setSerializedParameters(pluginState.parameters);
                    } else if (plugin.setParameters) {
                        plugin.setParameters(pluginState.parameters);
                    } else if (plugin.parameters) {
                        Object.assign(plugin.parameters, pluginState.parameters);
                    }
                    
                    if (plugin.updateParameters) {
                        plugin.updateParameters();
                    }
                    
                    this.expandedPlugins.add(plugin);
                    return plugin;
                }).filter(plugin => plugin !== null);
            } else if (preset.plugins && Array.isArray(preset.plugins)) {
                // Old format
                plugins = preset.plugins.map(state => {
                    const plugin = this.pluginManager.createPlugin(state.nm);
                    if (!plugin) return null;
                    
                    plugin.enabled = state.en;
                    
                    // Extract parameters from old format
                    const { nm, en, ...params } = state;
                    
                    if (plugin.setParameters) {
                        plugin.setParameters(params);
                    }
                    
                    if (plugin.updateParameters) {
                        plugin.updateParameters();
                    }
                    
                    this.expandedPlugins.add(plugin);
                    return plugin;
                }).filter(plugin => plugin !== null);
            } else {
                throw new Error('Unrecognized preset format');
            }
            
            // Update pipeline without rebuilding
            this.audioManager.pipeline = plugins;
            
            // Update UI with force rebuild flag
            this.updatePipelineUI(true);
            
            // Update worklet directly without rebuilding pipeline
            this.updateWorkletPlugins();
            
            // Update preset list to ensure all presets are available
            this.loadPresetList();
            
            // Ensure master bypass is OFF after loading preset
            this.enabled = true;
            this.audioManager.setMasterBypass(false);
            const masterToggle = document.querySelector('.toggle-button.master-toggle');
            if (masterToggle) {
                masterToggle.classList.remove('off');
            }
            
            // Save state for undo/redo after loading preset
            this.saveState();
            
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
        } finally {
        }
    }

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
     * Get serializable state for a plugin
     * @param {Object} plugin - The plugin to get state for
     * @param {boolean} useShortNames - Whether to use short names (nm/en) for name/enabled
     * @param {boolean} useFullFallback - Not used, kept for backward compatibility
     * @param {boolean} useDeepCopy - Whether to create a deep copy of parameters
     * @returns {Object} Serializable plugin state
     */
    getSerializablePluginState(plugin, useShortNames = false, useFullFallback = false, useDeepCopy = false) {
        // Get serializable parameters - all plugins inherit from PluginBase
        // which defines getSerializableParameters
        let params = plugin.getSerializableParameters();
        
        // Create a deep copy if requested
        if (useDeepCopy) {
            params = JSON.parse(JSON.stringify(params));
        }
        
        // Remove id and enabled from params if they exist
        const { id, enabled, ...cleanParams } = params;
        
        if (useShortNames) {
            // Old format with nm/en
            return {
                ...cleanParams,
                nm: plugin.name,
                en: plugin.enabled
            };
        } else {
            // New format with name/enabled/parameters
            return {
                name: plugin.name,
                enabled: plugin.enabled,
                parameters: cleanParams
            };
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
            this.getSerializablePluginState(plugin, false, true, true)
        );
        
        return {
            name: presetName,
            pipeline: pipelineState,
            timestamp: Date.now()
        };
    }

    initKeyboardEvents() {
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Handle Ctrl+Z (Undo) and Ctrl+Y (Redo)
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
                // Skip Undo/Redo if focus is on an input/textarea element, but allow for range inputs (sliders)
                if (!e.target.matches('input, textarea') || e.target.matches('input[type="range"]')) {
                    if (e.key === 'z') {
                        e.preventDefault();
                        e.stopPropagation();
                        this.undo();
                        return;
                    } else if (e.key === 'y') {
                        e.preventDefault();
                        e.stopPropagation();
                        this.redo();
                        return;
                    }
                }
            }
            
            // Handle Ctrl+S and Ctrl+Shift+S first
            // Always handle Ctrl+S regardless of focus
            if (e.key && e.key.toLowerCase() === 's' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                e.stopPropagation();
                
                // Focus and select preset input text
                this.presetSelect.focus();
                this.presetSelect.select();
                
                // If not Shift key and input has value, save preset
                if (!e.shiftKey && this.presetSelect.value.trim()) {
                    this.savePreset(this.presetSelect.value.trim());
                }
                return;
            }

            // Handle Escape key for preset select first
            if (e.key === 'Escape' && e.target === this.presetSelect) {
                this.presetSelect.value = '';
                return;
            }

            // Skip other shortcuts if focus is on an input/textarea element
            if (e.target.matches('input, textarea')) {
                return;
            }

            if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
                // Select all plugins
                e.preventDefault();
                this.selectedPlugins.clear();
                this.audioManager.pipeline.forEach(plugin => {
                    this.selectedPlugins.add(plugin);
                });
                this.updateSelectionClasses();
            } else if (e.key === 'x' && (e.ctrlKey || e.metaKey)) {
                // Cut selected plugin settings to clipboard (copy + delete)
                if (this.selectedPlugins.size > 0) {
                    const selectedPluginsArray = Array.from(this.selectedPlugins);
                    const states = selectedPluginsArray.map(plugin =>
                        this.getSerializablePluginState(plugin, true, false, false)
                    );
                    navigator.clipboard.writeText(JSON.stringify(states, null, 2))
                        .then(() => {
                            // After copying, delete the selected plugins
                            // Convert to array and sort in reverse order (delete from highest index)
                            const selectedIndices = Array.from(this.selectedPlugins)
                                .map(plugin => this.audioManager.pipeline.indexOf(plugin))
                                .sort((a, b) => b - a);
                            
                            // Delete selected plugins
                            selectedIndices.forEach(index => {
                                if (index > -1) {
                                    const plugin = this.audioManager.pipeline[index];
                                    
                                    // Clean up plugin resources before removing
                                    if (typeof plugin.cleanup === 'function') {
                                        plugin.cleanup();
                                    }
                                    
                                    this.audioManager.pipeline.splice(index, 1);
                                    this.selectedPlugins.delete(plugin);
                                }
                            });
                            
                            this.updatePipelineUI();
                            
                            // Update worklet directly without rebuilding pipeline
                            this.updateWorkletPlugins();
                            
                            // Save state for undo/redo
                            this.saveState();
                            
                            if (window.uiManager) {
                                window.uiManager.setError('success.settingsCut', false);
                                setTimeout(() => window.uiManager.clearError(), 3000);
                            }
                        })
                        .catch(err => {
                            // Failed to cut settings
                            if (window.uiManager) {
                                window.uiManager.setError('error.failedToCutSettings', true);
                            }
                        });
                }
            } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
                // Copy selected plugin settings to clipboard
                if (this.selectedPlugins.size > 0) {
                    const selectedPluginsArray = Array.from(this.selectedPlugins);
                    const states = selectedPluginsArray.map(plugin =>
                        this.getSerializablePluginState(plugin, true, false, false)
                    );
                    navigator.clipboard.writeText(JSON.stringify(states, null, 2))
                        .then(() => {
                            if (window.uiManager) {
                                window.uiManager.setError('success.settingsCopied', false);
                                setTimeout(() => window.uiManager.clearError(), 3000);
                            }
                        })
                        .catch(err => {
                            // Failed to copy settings
                            if (window.uiManager) {
                                window.uiManager.setError('error.failedToCopySettings', true);
                            }
                        });
                }
            } else if (e.key === 'Escape') {
                // Clear preset select text if it's focused
                if (document.activeElement === this.presetSelect) {
                    this.presetSelect.value = '';
                    return;
                }
                
                this.selectedPlugins.clear();
                // Update only the selection state classes
                this.pipelineList.querySelectorAll('.pipeline-item').forEach(item => {
                    item.classList.remove('selected');
                });
            } else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
                // Paste plugin settings from clipboard
                navigator.clipboard.readText()
                    .then(text => {
                        try {
                            const pluginStates = JSON.parse(text);
                            if (!Array.isArray(pluginStates)) {
                                throw new Error('Invalid plugin data format');
                            }

                            // Create plugins from states
                            const newPlugins = pluginStates.map(state => {
                                const plugin = this.pluginManager.createPlugin(state.nm);
                                if (!plugin) {
                                    throw new Error(`Failed to create plugin: ${state.nm}`);
                                }
                                
                                // Set enabled state
                                plugin.enabled = state.en;
                                
                                // Set parameters
                                const { nm, en, ...params } = state;
                                if (plugin.setParameters) {
                                    plugin.setParameters(params);
                                }
                                
                                return plugin;
                            });

                            // Determine insertion index
                            let insertIndex;
                            if (this.selectedPlugins.size > 0) {
                                // Get index of first selected plugin
                                insertIndex = Math.min(...Array.from(this.selectedPlugins)
                                    .map(plugin => this.audioManager.pipeline.indexOf(plugin)));
                            } else {
                                // Insert at end if no selection
                                insertIndex = this.audioManager.pipeline.length;
                            }

                            // Insert plugins
                            this.audioManager.pipeline.splice(insertIndex, 0, ...newPlugins);
                            
                            // Clear selection and select new plugins
                            this.selectedPlugins.clear();
                            newPlugins.forEach(plugin => {
                                this.selectedPlugins.add(plugin);
                                this.expandedPlugins.add(plugin);
                            });
                            
                            this.updatePipelineUI();
                            
                            // Update worklet directly without rebuilding pipeline
                            this.updateWorkletPlugins();
                            
                            // Save state for undo/redo
                            this.saveState();

                            // If plugins were inserted at the end, scroll to bottom
                            if (insertIndex === this.audioManager.pipeline.length - newPlugins.length) {
                                requestAnimationFrame(() => {
                                    window.scrollTo({
                                        top: document.body.scrollHeight,
                                        behavior: 'smooth'
                                    });
                                });
                            }

                            if (window.uiManager) {
                                window.uiManager.setError('success.settingsPasted', false);
                                setTimeout(() => window.uiManager.clearError(), 3000);
                            }
                        } catch (err) {
                            // Failed to paste plugin settings
                            if (window.uiManager) {
                                window.uiManager.setError('error.failedToPasteSettings', true);
                            }
                        }
                    })
                    .catch(err => {
                        // Failed to read clipboard
                        if (window.uiManager) {
                            window.uiManager.setError('error.failedToReadClipboard', true);
                        }
                    });
            } else if (e.key === 'Delete') {
                // Delete selected plugins
                if (this.selectedPlugins.size > 0) {
                    // Convert to array and sort in reverse order (delete from highest index)
                    const selectedIndices = Array.from(this.selectedPlugins)
                        .map(plugin => this.audioManager.pipeline.indexOf(plugin))
                        .sort((a, b) => b - a);
                    
                    // Delete selected plugins
                    selectedIndices.forEach(index => {
                        if (index > -1) {
                            const plugin = this.audioManager.pipeline[index];
                            
                            // Clean up plugin resources before removing
                            if (typeof plugin.cleanup === 'function') {
                                plugin.cleanup();
                            }
                            
                            this.audioManager.pipeline.splice(index, 1);
                            this.selectedPlugins.delete(plugin);
                        }
                    });
                    
                    this.updatePipelineUI();
                    
                    // Update worklet directly without rebuilding pipeline
                    this.updateWorkletPlugins();
                    
                    // Save state for undo/redo
                    this.saveState();
                }
            }
        });
    }

    createPipelineItem(plugin) {
        const item = document.createElement('div');
        item.className = 'pipeline-item';
        
        // Create header container
        const header = document.createElement('div');
        header.className = 'pipeline-item-header';

        // Selection handling for entire pipeline item
        const selectPlugin = (e) => {
            // Prioritize UI item events
            if (e.target.closest('.plugin-ui') || 
                e.target === name || 
                e.target.tagName === 'BUTTON' || 
                e.target.closest('button')) {
                return;
            }

            // Stop event propagation
            e.stopPropagation();

            if (e.ctrlKey || e.metaKey) {
                // Toggle selection when Ctrl key is pressed
                if (this.selectedPlugins.has(plugin)) {
                    this.selectedPlugins.delete(plugin);
                } else {
                    this.selectedPlugins.add(plugin);
                }
            } else {
                // Single selection on normal click
                this.selectedPlugins.clear();
                this.selectedPlugins.add(plugin);
            }
            this.updateSelectionClasses();
        };
        
        // Detect click/touch events for entire pipeline-item
        item.addEventListener('click', selectPlugin);
        item.addEventListener('touchstart', selectPlugin);
        
        // Handle for reordering
        const handle = document.createElement('div');
        handle.className = 'handle';
        handle.innerHTML = '⋮';
        handle.draggable = true;
        handle.addEventListener('mousedown', selectPlugin);
        header.appendChild(handle);

        // Enable/disable toggle
        const toggle = document.createElement('button');
        toggle.className = 'toggle-button';
        toggle.textContent = 'ON';
        toggle.classList.toggle('off', !plugin.enabled);
        toggle.onclick = (e) => {
            plugin.enabled = !plugin.enabled;
            toggle.classList.toggle('off', !plugin.enabled);
            
            if (!e.ctrlKey && !e.metaKey) {
                this.selectedPlugins.clear();
            }
            this.selectedPlugins.add(plugin);
            this.updateSelectionClasses();
            
            // Update worklet directly without rebuilding pipeline
            this.updateWorkletPlugin(plugin);
            
            // Save state for undo/redo
            this.saveState();
        };
        header.appendChild(toggle);

        // Plugin name
        const name = document.createElement('div');
        name.className = 'plugin-name';
        name.textContent = plugin.name;
        header.appendChild(name);

        // Help button
        const helpBtn = document.createElement('button');
        helpBtn.className = 'help-button';
        helpBtn.textContent = '?';
        helpBtn.onclick = (e) => {
            const category = Object.entries(this.pluginManager.effectCategories)
                .find(([_, {plugins}]) => plugins.includes(plugin.name))?.[0];
            
            if (category) {
                const anchor = plugin.name.toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-');
                // Use direct path without extension, let getLocalizedDocPath handle it
                const path = `/plugins/${category.toLowerCase().replace(/-/g, '')}#${anchor}`;
                // Get the full URL from getLocalizedDocPath (which will convert .md to .html)
                const localizedPath = this.getLocalizedDocPath(path);
                
                
                // For both Electron and web, open the URL in external browser
                if (window.electronAPI) {
                    // In Electron, use shell.openExternal to open in default browser
                    window.electronAPI.openExternalUrl(localizedPath)
                        .catch(err => {
                            // Error opening external URL
                            // Fallback to window.open
                            window.open(localizedPath, '_blank');
                        });
                } else {
                    // Regular browser environment, open the URL
                    window.open(localizedPath, '_blank');
                }
            }
            
            if (!e.ctrlKey && !e.metaKey) {
                this.selectedPlugins.clear();
            }
            this.selectedPlugins.add(plugin);
            this.updateSelectionClasses();
        };
        header.appendChild(helpBtn);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.textContent = '✖';
        deleteBtn.onclick = (e) => {
            if (!e.ctrlKey && !e.metaKey) {
                this.selectedPlugins.clear();
            }
            this.selectedPlugins.add(plugin);
            this.updateSelectionClasses();
            
            const index = this.audioManager.pipeline.indexOf(plugin);
            if (index > -1) {
                // Clean up plugin resources before removing
                if (typeof plugin.cleanup === 'function') {
                    plugin.cleanup();
                }
                
                this.audioManager.pipeline.splice(index, 1);
                this.selectedPlugins.delete(plugin);
                this.updatePipelineUI();
                
                // Update worklet directly without rebuilding pipeline
                this.updateWorkletPlugins();
                
                // Save state for undo/redo
                this.saveState();
            }
        };
        header.appendChild(deleteBtn);

        item.appendChild(header);

        // Plugin UI container
        const ui = document.createElement('div');
        ui.className = 'plugin-ui' + (this.expandedPlugins.has(plugin) ? ' expanded' : '');
        
        // Optimize parameter update handling to avoid unnecessary pipeline rebuilds
        if (plugin.updateParameters) {
            const originalUpdateParameters = plugin.updateParameters;
            // Add lastSaveTime property to track when the state was last saved
            plugin.lastSaveTime = 0;
            plugin.paramChangeStarted = false;
            
            plugin.updateParameters = function(...args) {
                originalUpdateParameters.apply(this, args);
                // Only update URL without rebuilding pipeline
                if (window.uiManager) {
                    window.uiManager.updateURL();
                }
                
                const now = Date.now();
                
                // If this is the first parameter change or it's been more than 500ms since the last save
                if (!this.paramChangeStarted || (now - this.lastSaveTime > 500)) {
                    // Save state immediately for the first parameter change
                    if (this.audioManager && this.audioManager.pipelineManager) {
                        this.audioManager.pipelineManager.saveState();
                        this.lastSaveTime = now;
                        this.paramChangeStarted = true;
                    }
                }
                
                // Reset the timer for parameter changes that happen in quick succession
                if (this.saveStateTimeout) {
                    clearTimeout(this.saveStateTimeout);
                }
                
                // Set a timeout to mark the end of a parameter change session
                // and save the final state
                this.saveStateTimeout = setTimeout(() => {
                    // Save the final state at the end of parameter changes
                    if (this.audioManager && this.audioManager.pipelineManager) {
                        this.audioManager.pipelineManager.saveState();
                    }
                    this.paramChangeStarted = false;
                }, 500);
            }.bind(plugin);
            plugin.audioManager = this.audioManager;
        }
        
        ui.addEventListener('mousedown', (e) => {
            if (e.target.matches('input, button, select')) {
                if (e.target.matches('input[type="range"]')) {
                    return;
                }
                
                if (!e.ctrlKey && !e.metaKey) {
                    this.selectedPlugins.clear();
                }
                this.selectedPlugins.add(plugin);
                this.updateSelectionClasses();
            }
        });
        
        ui.appendChild(plugin.createUI());
        item.appendChild(ui);

        // Toggle UI visibility and handle selection
        name.onclick = (e) => {
            const isExpanded = ui.classList.toggle('expanded');
            if (isExpanded) {
                this.expandedPlugins.add(plugin);
                if (plugin.updateMarkers && plugin.updateResponse) {
                    requestAnimationFrame(() => {
                        plugin.updateMarkers();
                        plugin.updateResponse();
                    });
                }
            } else {
                this.expandedPlugins.delete(plugin);
            }
            name.title = isExpanded ? 'Click to collapse' : 'Click to expand';

            if (e.ctrlKey || e.metaKey) {
                if (this.selectedPlugins.has(plugin)) {
                    this.selectedPlugins.delete(plugin);
                } else {
                    this.selectedPlugins.add(plugin);
                }
            } else {
                this.selectedPlugins.clear();
                this.selectedPlugins.add(plugin);
            }
            this.updateSelectionClasses();
        };
        name.title = this.expandedPlugins.has(plugin) ? 'Click to collapse' : 'Click to expand';

        this.setupDragEvents(handle, item, plugin);

        return item;
    }

    setupDragEvents(handle, item, plugin) {
        // Mouse drag events for reordering
        handle.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/x-pipeline-index', 
                this.audioManager.pipeline.indexOf(plugin).toString());
            item.classList.add('dragging');
        });

        handle.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            this.pluginListManager.getInsertionIndicator().style.display = 'none';
        });

        // Touch events for reordering
        let isDragging = false;
        let clone = null;
        let touchOffsetX = 0;
        let touchOffsetY = 0;
        const sourceIndex = this.audioManager.pipeline.indexOf(plugin);

        handle.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const rect = handle.getBoundingClientRect();
            touchOffsetX = touch.clientX - rect.left;
            touchOffsetY = touch.clientY - rect.top;

            isDragging = true;
            item.classList.add('dragging');

            clone = item.cloneNode(true);
            clone.style.position = 'fixed';
            clone.style.zIndex = '1000';
            clone.style.width = item.offsetWidth + 'px';
            clone.style.opacity = '0.9';
            clone.style.backgroundColor = '#ffffff';
            clone.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
            clone.style.pointerEvents = 'none';
            clone.style.left = (touch.clientX - touchOffsetX) + 'px';
            clone.style.top = (touch.clientY - touchOffsetY) + 'px';
            document.body.appendChild(clone);
        });

        handle.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];

            if (isDragging && clone) {
                clone.style.left = (touch.clientX - touchOffsetX) + 'px';
                clone.style.top = (touch.clientY - touchOffsetY) + 'px';
                
                this.pluginListManager.updateInsertionIndicator(touch.clientY);
            }
        }, { passive: false }); // Add passive: false to allow preventDefault

        handle.addEventListener('touchend', (e) => {
            if (isDragging) {
                e.preventDefault();
                const touch = e.changedTouches[0];
                const pipeline = document.getElementById('pipeline');
                const pipelineRect = pipeline.getBoundingClientRect();
                
                if (touch.clientX >= pipelineRect.left &&
                    touch.clientX <= pipelineRect.right &&
                    touch.clientY >= pipelineRect.top &&
                    touch.clientY <= pipelineRect.bottom) {
                    
                    const dropEvent = new Event('drop', { bubbles: true });
                    dropEvent.clientY = touch.clientY;
                    dropEvent.preventDefault = () => {};
                    dropEvent.dataTransfer = {
                        getData: (type) => type === 'application/x-pipeline-index' ? sourceIndex.toString() : '',
                        dropEffect: 'move',
                        types: []
                    };
                    
                    pipeline.dispatchEvent(dropEvent);
                }

                if (clone) {
                    clone.remove();
                    clone = null;
                }
                item.classList.remove('dragging');
                this.pluginListManager.getInsertionIndicator().style.display = 'none';
            }
            
            isDragging = false;
        }, { passive: false }); // Add passive: false to allow preventDefault
    }

    createMasterToggle() {
        const toggle = document.querySelector('.toggle-button.master-toggle');
        if (!toggle) return;

        toggle.onclick = () => {
            this.enabled = !this.enabled;
            toggle.classList.toggle('off', !this.enabled);
            
            // Update master bypass state directly without rebuilding pipeline
            this.audioManager.masterBypass = !this.enabled;
            
            // Use helper method but override masterBypass value
            if (window.workletNode) {
                window.workletNode.port.postMessage({
                    type: 'updatePlugins',
                    plugins: this.audioManager.pipeline.map(plugin => ({
                        id: plugin.id,
                        type: plugin.constructor.name,
                        enabled: plugin.enabled,
                        parameters: plugin.getParameters()
                    })),
                    masterBypass: !this.enabled
                });
            }
            this.updateURL();
        };
    }

    updatePipelineUI(forceRebuild = false) {
        // Show/hide empty message based on pipeline length
        this.pipelineEmpty.style.display = this.audioManager.pipeline.length ? 'none' : 'block';

        // Always rebuild the entire UI to ensure proper updates
        // Note: We've removed the differential update approach for now to fix UI update issues
        this.pipelineList.innerHTML = '';
        this.audioManager.pipeline.forEach(plugin => {
            const item = this.createPipelineItem(plugin);
            if (this.selectedPlugins.has(plugin)) {
                item.classList.add('selected');
            }
            this.pipelineList.appendChild(item);
        });
    }

    updateSelectionClasses() {
        this.pipelineList.querySelectorAll('.pipeline-item').forEach((item, index) => {
            const itemPlugin = this.audioManager.pipeline[index];
            item.classList.toggle('selected', this.selectedPlugins.has(itemPlugin));
        });
    }

    initDragAndDrop() {
        const pipelineElement = document.getElementById('pipeline');

        // Create file drop area and setup file input
        this.createFileDropArea(pipelineElement);
        
        // Setup plugin selection and drag handlers
        this.setupPluginSelectionHandlers(pipelineElement);
        
        // Setup plugin drag and drop handlers
        this.setupPluginDragHandlers(pipelineElement);
        
        // Setup file drag and drop handlers
        this.setupFileDropHandlers();
    }
    
    /**
     * Creates the file drop area and file input element
     * @param {HTMLElement} pipelineElement - The pipeline container element
     */
    createFileDropArea(pipelineElement) {
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        // Create drop area
        const dropArea = document.createElement('div');
        dropArea.className = 'file-drop-area';
        
        // Check if running in Electron environment
        if (window.electronIntegration && window.electronIntegration.isElectron) {
            // For Electron, only show the link
            const specifyAudioText = window.uiManager && window.uiManager.t ?
                window.uiManager.t('ui.specifyAudioFiles') :
                'Specify the audio files to process using the current effects.';
            const processingText = window.uiManager && window.uiManager.t ?
                window.uiManager.t('ui.processing') :
                'Processing...';
            const cancelText = window.uiManager && window.uiManager.t ?
                window.uiManager.t('ui.cancelButton') :
                'Cancel';
                
            dropArea.innerHTML = `
                <div class="drop-message">
                    <span class="select-files">${specifyAudioText}</span>
                </div>
                <div class="progress-container" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress"></div>
                    </div>
                <div class="progress-text">${processingText}</div>
                <button class="cancel-button">${cancelText}</button>
            </div>
            `;
        } else {
            // For web app, show both drop area and link
            const dropAudioText = window.uiManager && window.uiManager.t ?
                window.uiManager.t('ui.dropAudioFiles') :
                'Drop audio files here to process with current effects';
            const orText = window.uiManager && window.uiManager.t ?
                window.uiManager.t('ui.orText') :
                'or';
            const selectFilesText = window.uiManager && window.uiManager.t ?
                window.uiManager.t('ui.selectFiles') :
                'specify audio files to process';
            const processingText = window.uiManager && window.uiManager.t ?
                window.uiManager.t('ui.processing') :
                'Processing...';
            const cancelText = window.uiManager && window.uiManager.t ?
                window.uiManager.t('ui.cancelButton') :
                'Cancel';
                
            dropArea.innerHTML = `
                <div class="drop-message">
                    <span>${dropAudioText}</span>
                    <span class="or-text">${orText}</span>
                    <span class="select-files">${selectFilesText}</span>
                </div>
                <div class="progress-container" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress"></div>
                    </div>
                <div class="progress-text">${processingText}</div>
                <button class="cancel-button">${cancelText}</button>
            </div>
            `;
        }

        // Add click handler for file selection
        const selectFiles = dropArea.querySelector('.select-files');
        selectFiles.addEventListener('click', () => {
            fileInput.click();
        });

        // Setup file input change handler
        this.setupFileInputHandlers(fileInput);

        // Create download container inside the drop area
        const downloadContainer = document.createElement('div');
        downloadContainer.className = 'download-container';
        downloadContainer.style.display = 'none';

        // Add download container to drop area
        dropArea.appendChild(downloadContainer);

        // Add drop area to pipeline container
        pipelineElement.appendChild(dropArea);

        // Store references
        this.dropArea = dropArea;
        this.downloadContainer = downloadContainer;
        this.progressContainer = dropArea.querySelector('.progress-container');
        this.progressBar = dropArea.querySelector('.progress');
        this.progressText = dropArea.querySelector('.progress-text');
    }
    
    /**
     * Sets up handlers for file input element
     * @param {HTMLInputElement} fileInput - The file input element
     */
    setupFileInputHandlers(fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files).filter(file => file.type.startsWith('audio/'));
            if (files.length === 0) {
                window.uiManager.setError('Please select audio files', true);
                return;
            }

            // Show progress UI
            this.showProgress();

            try {
                // Process multiple files
                const processedFiles = [];
                const totalFiles = files.length;

                // Process each file
                for (let i = 0; i < totalFiles; i++) {
                    const file = files[i];
                    try {
                        // Create progress callback for this file
                        const progressCallback = (percent) => {
                            const totalPercent = (i + percent / 100) / totalFiles * 100;
                            this.progressBar.style.width = `${Math.round(totalPercent)}%`;
                            if (window.uiManager && window.uiManager.t) {
                                this.setProgressText(window.uiManager.t('status.processingFile', {
                                    current: i + 1,
                                    total: totalFiles,
                                    percent: Math.round(percent)
                                }));
                            } else {
                                this.setProgressText(`Processing file ${i + 1}/${totalFiles} (${Math.round(percent)}%)`);
                            }
                        };

                        // Process the file with progress updates
                        const blob = await this.audioManager.processAudioFile(file, progressCallback);
                        if (blob) {
                            const processedName = this.getProcessedFileName(file.name);
                            processedFiles.push({
                                blob,
                                name: processedName
                            });
                        } else {
                            // Processing was cancelled
                            this.setProgressText(window.uiManager && window.uiManager.t ?
                                window.uiManager.t('status.processingCanceled') : 'Processing canceled');
                            return;
                        }
                    } catch (error) {
                        // Error processing file
                        window.uiManager.setError('error.failedToProcessFile', true, { fileName: file.name, errorMessage: error.message });
                    }
                }

                // Set progress to 100%
                this.progressBar.style.width = '100%';
                this.setProgressText(window.uiManager && window.uiManager.t ?
                    window.uiManager.t('status.processingComplete') : 'Processing complete');

                // Create zip if multiple files were processed
                if (processedFiles.length > 0) {
                    if (processedFiles.length === 1) {
                        this.showDownloadLink(processedFiles[0].blob, files[0].name);
                    } else {
                        this.setProgressText(window.uiManager && window.uiManager.t ?
                            window.uiManager.t('status.creatingZipFile') : 'Creating zip file...');
                        const zip = new JSZip();
                        processedFiles.forEach(({blob, name}) => {
                            zip.file(name, blob);
                        });
                        const zipBlob = await zip.generateAsync({type: 'blob'});
                        this.showDownloadLink(zipBlob, 'processed_audio.zip', true);
                    }
                }
            } catch (error) {
                // Error processing files
                window.uiManager.setError('error.failedToProcessAudioFiles', true, { errorMessage: error.message });
            } finally {
                this.hideProgress();
                // Reset file input
                fileInput.value = '';
            }
        });
    }
    
    /**
     * Sets up plugin selection handlers
     * @param {HTMLElement} pipelineElement - The pipeline container element
     */
    setupPluginSelectionHandlers(pipelineElement) {
        pipelineElement.addEventListener('click', (e) => {
            const pipelineHeader = pipelineElement.querySelector('.pipeline-header');
            if (e.target === pipelineElement ||
                e.target === this.pipelineList ||
                e.target === pipelineHeader ||
                pipelineHeader.contains(e.target)) {
                this.selectedPlugins.clear();
                this.updateSelectionClasses();
            }
        });
    }
    
    /**
     * Sets up plugin drag and drop handlers
     * @param {HTMLElement} pipelineElement - The pipeline container element
     */
    setupPluginDragHandlers(pipelineElement) {
        // Handle plugin drag over
        pipelineElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            // Skip insertion indicator update if dragging a file
            if (e.dataTransfer && e.dataTransfer.types && !e.dataTransfer.types.includes('Files')) {
                e.dataTransfer.dropEffect = 'move';
                this.pluginListManager.updateInsertionIndicator(e.clientY);
            } else {
                // Hide insertion indicator when dragging files
                this.pluginListManager.getInsertionIndicator().style.display = 'none';
            }
        });

        // Handle plugin drag leave
        pipelineElement.addEventListener('dragleave', (e) => {
            if (!pipelineElement.contains(e.relatedTarget)) {
                this.pluginListManager.getInsertionIndicator().style.display = 'none';
            }
        });
        
        // Handle dropped plugins
        pipelineElement.addEventListener('drop', (e) => {
            // Skip if this is a file drop
            if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
                return;
            }
            
            e.preventDefault();

            // Check for plugin reordering
            const sourceIndex = e.dataTransfer.getData('application/x-pipeline-index');
            if (sourceIndex !== '') {
                this.handlePluginReordering(e, sourceIndex);
                return;
            }

            // Handle new plugin creation
            this.handleNewPluginDrop(e);
        });
    }
    
    /**
     * Handles plugin reordering on drop
     * @param {DragEvent} e - The drop event
     * @param {string} sourceIndex - The source index of the plugin being moved
     */
    handlePluginReordering(e, sourceIndex) {
        const parsedSourceIndex = parseInt(sourceIndex);
        const plugin = this.audioManager.pipeline[parsedSourceIndex];
        
        const items = Array.from(this.pipelineList.children);
        const targetItem = items.find(item => {
            const rect = item.getBoundingClientRect();
            return e.clientY < rect.top + (rect.height / 2);
        });
        
        let targetIndex = targetItem ? items.indexOf(targetItem) : items.length;
        if (targetIndex > parsedSourceIndex) {
            targetIndex--;
        }
        
        this.audioManager.pipeline.splice(parsedSourceIndex, 1);
        this.audioManager.pipeline.splice(targetIndex, 0, plugin);
        
        if (!e.ctrlKey && !e.metaKey) {
            this.selectedPlugins.clear();
        }
        this.selectedPlugins.add(plugin);
        this.updateSelectionClasses();
        
        // Update worklet directly without rebuilding pipeline
        this.updateWorkletPlugins();
        
        // Save state for undo/redo
        this.saveState();
        
        requestAnimationFrame(() => {
            this.updatePipelineUI();
        });
    }
    
    /**
     * Handles dropping a new plugin
     * @param {DragEvent} e - The drop event
     */
    handleNewPluginDrop(e) {
        const pluginName = e.dataTransfer.getData('text/plain');
        if (pluginName && this.pluginManager.pluginClasses[pluginName]) {
            const plugin = this.pluginManager.createPlugin(pluginName);
            this.expandedPlugins.add(plugin);

            const items = Array.from(this.pipelineList.children);
            const targetItem = items.find(item => {
                const rect = item.getBoundingClientRect();
                return e.clientY < rect.top + (rect.height / 2);
            });
            
            const targetIndex = targetItem ? items.indexOf(targetItem) : items.length;
            this.audioManager.pipeline.splice(targetIndex, 0, plugin);
            
            if (!e.ctrlKey && !e.metaKey) {
                this.selectedPlugins.clear();
            }
            this.selectedPlugins.add(plugin);
            this.updateSelectionClasses();
            
            // Update worklet directly without rebuilding pipeline
            this.updateWorkletPlugins();
            
            // Save state for undo/redo
            this.saveState();
            
            requestAnimationFrame(() => {
                this.updatePipelineUI();
            });
        }
    }
    
    /**
     * Sets up file drag and drop handlers
     */
    setupFileDropHandlers() {
        // Handle file drag and drop for audio files only
        this.dropArea.addEventListener('dragenter', (e) => {
            console.log('Pipeline Manager: dragenter event on dropArea');
            
            // Skip in Electron environment
            if (window.electronIntegration && window.electronIntegration.isElectron) {
                console.log('Pipeline Manager: Skipping dragenter in Electron environment');
                return;
            }
            
            // Only handle audio files
            if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
                const items = Array.from(e.dataTransfer.items);
                console.log('Pipeline Manager dragenter items:', items.map(item => ({
                    kind: item.kind,
                    type: item.type,
                    name: item.getAsFile()?.name || 'unknown'
                })));
                
                const hasAudioFiles = items.some(item => item.kind === 'file' && item.type.startsWith('audio/'));
                console.log('Pipeline Manager: hasAudioFiles =', hasAudioFiles);
                
                if (hasAudioFiles) {
                    e.preventDefault();
                    this.dropArea.classList.add('drag-active');
                    console.log('Pipeline Manager: Added drag-active class on dragenter');
                }
            }
        }, { passive: false });
        
        this.dropArea.addEventListener('dragover', (e) => {
            console.log('Pipeline Manager: dragover event on dropArea');
            
            // Skip in Electron environment
            if (window.electronIntegration && window.electronIntegration.isElectron) {
                console.log('Pipeline Manager: Skipping dragover in Electron environment');
                return;
            }
            
            // Only handle audio files
            if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
                const items = Array.from(e.dataTransfer.items);
                const hasAudioFiles = items.some(item => item.kind === 'file' && item.type.startsWith('audio/'));
                console.log('Pipeline Manager: hasAudioFiles in dragover =', hasAudioFiles);
                
                if (hasAudioFiles) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    this.dropArea.classList.add('drag-active');
                    console.log('Pipeline Manager: Added drag-active class on dragover');
                }
            }
        }, { passive: false });
        
        this.dropArea.addEventListener('dragleave', (e) => {
            this.dropArea.classList.remove('drag-active');
        }, false);
        
        this.dropArea.addEventListener('drop', async (e) => {
            // Skip in Electron environment
            if (window.electronIntegration && window.electronIntegration.isElectron) {
                // Just remove any active classes that might have been applied
                this.dropArea.classList.remove('drag-active');
                return;
            }
            
            // Check if this is a file drop
            if (!e.dataTransfer || !e.dataTransfer.types || !e.dataTransfer.types.includes('Files')) {
                return;
            }
            
            // Get audio files only
            const audioFiles = Array.from(e.dataTransfer.files).filter(file =>
                file.type.startsWith('audio/')
            );
            
            // Only handle audio files
            if (audioFiles.length > 0) {
                e.preventDefault();
                e.stopPropagation();
                
                // Ensure insertion indicator is hidden for file drops
                this.pluginListManager.getInsertionIndicator().style.display = 'none';
                
                // Process audio files
                this.processDroppedAudioFiles(audioFiles);
                
                // Remove drag active class
                this.dropArea.classList.remove('drag-active');
            } else {
                // Don't show error for non-audio files to allow preset files to be handled by global handler
                this.dropArea.classList.remove('drag-active');
            }
        }, { passive: false });
    }

    showProgress() {
        this.progressContainer.style.display = 'block';
        this.downloadContainer.style.display = 'none';
        this.progressBar.style.width = '0%';
        
        // Make sure drop message is hidden during processing
        const dropMessage = this.dropArea.querySelector('.drop-message');
        if (dropMessage) {
            dropMessage.style.display = 'none';
        }
        
        // Add cancel button handler
        const cancelButton = this.progressContainer.querySelector('.cancel-button');
        cancelButton.onclick = () => {
            if (this.audioManager.isOfflineProcessing) {
                this.audioManager.isCancelled = true;
                this.hideProgress();
                this.setProgressText('Processing canceled');
            }
        };
    }

    hideProgress() {
        this.progressContainer.style.display = 'none';
        
        // Show drop message again when progress is hidden
        const dropMessage = this.dropArea.querySelector('.drop-message');
        if (dropMessage) {
            dropMessage.style.display = 'block';
        }
    }

    setProgressText(text) {
        this.progressText.textContent = text;
    }

    getProcessedFileName(originalName) {
        return originalName.replace(/\.[^/.]+$/, '') + '_effetuned.wav';
    }

    showDownloadLink(blob, originalName, isZip = false) {
        // Create filename based on type
        const filename = isZip ? originalName : this.getProcessedFileName(originalName);

        // Clear previous download links
        this.downloadContainer.innerHTML = '';

        // Create download link
        const downloadLink = document.createElement('a');
        
        // Check if running in Electron environment
        if (window.electronIntegration && window.electronIntegration.isElectron) {
            // For Electron, use save dialog instead of download
            downloadLink.href = '#';
            downloadLink.className = 'download-link';
            const saveText = window.uiManager && window.uiManager.t ?
                (isZip ? window.uiManager.t('ui.saveMultipleFiles', { size: (blob.size / (1024 * 1024)).toFixed(1) }) :
                window.uiManager.t('ui.saveSingleFile', { size: (blob.size / (1024 * 1024)).toFixed(1) })) :
                `Save ${isZip ? 'processed files' : 'processed file'} (${(blob.size / (1024 * 1024)).toFixed(1)} MB)`;
                
            downloadLink.innerHTML = `
                <span class="download-icon">⭳</span>
                ${saveText}
            `;
            
            // Add click handler to show save dialog
            downloadLink.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Show save dialog
                const result = await window.electronAPI.showSaveDialog({
                    title: 'Save Processed Audio',
                    defaultPath: filename,
                    filters: [
                        { name: isZip ? 'ZIP Archive' : 'WAV Audio', extensions: [isZip ? 'zip' : 'wav'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });
                
                if (!result.canceled && result.filePath) {
                    try {
                        // Convert blob to base64 string for IPC transfer
                        const reader = new FileReader();
                        reader.onload = async () => {
                            // Get base64 data (remove data URL prefix)
                            const base64data = reader.result.split(',')[1];
                            
                            // Save file using Electron API
                            const saveResult = await window.electronAPI.saveFile(
                                result.filePath,
                                base64data
                            );
                            
                            if (saveResult.success) {
                                window.uiManager.setError(`File saved successfully to ${result.filePath}`);
                                setTimeout(() => window.uiManager.clearError(), 3000);
                            } else {
                                window.uiManager.setError(`Failed to save file: ${saveResult.error}`, true);
                            }
                        };
                        
                        reader.onerror = (error) => {
                            // Error reading file
                            window.uiManager.setError(`Error reading file: ${error.message}`, true);
                        };
                        
                        // Start reading the blob as data URL
                        reader.readAsDataURL(blob);
                    } catch (error) {
                        // Error saving file
                        window.uiManager.setError(`Error saving file: ${error.message}`, true);
                    }
                }
            });
        } else {
            // For web browser, use standard download
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = filename;
            downloadLink.className = 'download-link';
            const downloadText = window.uiManager && window.uiManager.t ?
                (isZip ? window.uiManager.t('ui.downloadMultipleFiles', { size: (blob.size / (1024 * 1024)).toFixed(1) }) :
                window.uiManager.t('ui.downloadSingleFile', { size: (blob.size / (1024 * 1024)).toFixed(1) })) :
                `Download ${isZip ? 'processed files' : 'processed file'} (${(blob.size / (1024 * 1024)).toFixed(1)} MB)`;
                
            downloadLink.innerHTML = `
                <span class="download-icon">⭳</span>
                ${downloadText}
            `;
            
            // Clean up object URL when downloaded
            downloadLink.addEventListener('click', () => {
                setTimeout(() => {
                    URL.revokeObjectURL(downloadLink.href);
                }, 100);
            });
        }

        // Hide drop message when showing download link
        const dropMessage = this.dropArea.querySelector('.drop-message');
        if (dropMessage) {
            dropMessage.style.display = 'none';
        }

        // Add to container
        this.downloadContainer.appendChild(downloadLink);
        this.downloadContainer.style.display = 'block';
    }

    // Helper method to update worklet without rebuilding pipeline
    updateWorkletPlugins() {
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
        this.updateURL();
    }

    // Helper method to update a single plugin in worklet
    updateWorkletPlugin(plugin) {
        if (window.workletNode) {
            window.workletNode.port.postMessage({
                type: 'updatePlugin',
                plugin: {
                    id: plugin.id,
                    type: plugin.constructor.name,
                    enabled: plugin.enabled,
                    parameters: plugin.getParameters()
                }
            });
        }
        this.updateURL();
    }

    /**
     * Process dropped audio files
     * @param {File[]} files - Array of audio files to process
     */
    async processDroppedAudioFiles(files) {
        // Show progress UI
        this.showProgress();

        try {
            // Process multiple files
            const processedFiles = [];
            const totalFiles = files.length;

            // Process each file
            for (let i = 0; i < totalFiles; i++) {
                const file = files[i];
                try {
                    // Create progress callback for this file
                    const progressCallback = (percent) => {
                        const totalPercent = (i + percent / 100) / totalFiles * 100;
                        this.progressBar.style.width = `${Math.round(totalPercent)}%`;
                        this.setProgressText(`Processing file ${i + 1}/${totalFiles} (${Math.round(percent)}%)`);
                    };

                    // Process the file with progress updates
                    const blob = await this.audioManager.processAudioFile(file, progressCallback);
                    if (blob) {
                        const processedName = this.getProcessedFileName(file.name);
                        processedFiles.push({
                            blob,
                            name: processedName
                        });
                    } else {
                        // Processing was cancelled
                        this.setProgressText(window.uiManager && window.uiManager.t ?
                            window.uiManager.t('status.processingCanceled') : 'Processing canceled');
                        return;
                    }
                } catch (error) {
                    // Error processing file
                    window.uiManager.setError('error.failedToProcessFile', true, { fileName: file.name, errorMessage: error.message });
                }
            }

            // Set progress to 100%
            this.progressBar.style.width = '100%';
            this.setProgressText(window.uiManager && window.uiManager.t ?
                window.uiManager.t('status.processingComplete') : 'Processing complete');

            // Create zip if multiple files were processed
            if (processedFiles.length > 0) {
                if (processedFiles.length === 1) {
                    this.showDownloadLink(processedFiles[0].blob, files[0].name);
                } else {
                    this.setProgressText(window.uiManager && window.uiManager.t ?
                        window.uiManager.t('status.creatingZipFile') : 'Creating zip file...');
                    const zip = new JSZip();
                    processedFiles.forEach(({blob, name}) => {
                        zip.file(name, blob);
                    });
                    const zipBlob = await zip.generateAsync({type: 'blob'});
                    this.showDownloadLink(zipBlob, 'processed_audio.zip', true);
                }
            }
        } catch (error) {
            // Error processing files
            window.uiManager.setError('error.failedToProcessAudioFiles', true, { errorMessage: error.message });
        } finally {
            this.hideProgress();
            
            // Ensure drag-active class is removed
            this.dropArea.classList.remove('drag-active');
            
            // Also remove drag-active class from any other elements
            document.querySelectorAll('.drag-active').forEach(el => {
                el.classList.remove('drag-active');
            });
        }
    }

    updateURL() {
        if (window.uiManager) {
            window.uiManager.updateURL();
        }
    }
    
    // Save current pipeline state to history
    saveState() {
        // Skip if this is an undo/redo operation
        if (this.isUndoRedoOperation) {
            return;
        }
        
        // Create a deep copy of the current pipeline state
        const state = this.audioManager.pipeline.map(plugin =>
            this.getSerializablePluginState(plugin, true, false, false)
        );
        
        // If we're not at the end of the history, truncate it
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Add new state to history
        this.history.push(state);
        this.historyIndex = this.history.length - 1;
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
        
        // Check if pipeline is empty - for Electron file saving only
        if (this.audioManager.pipeline.length === 0) {
            // Create default plugins
            const defaultPlugins = [
                { name: 'Volume', enabled: true, parameters: { volume: -6 } },
                { name: 'Level Meter', enabled: true, parameters: {} }
            ];
            
            // Save default plugins state to file (but not to history)
            if (window.electronIntegration && window.electronIntegration.isElectron) {
                // Save to file using the savePipelineState function from app.js
                if (window.savePipelineState) {
                    window.savePipelineState(defaultPlugins);
                }
            }
        }
        
        // Save pipeline state to file if in Electron environment
        if (window.electronIntegration && window.electronIntegration.isElectron) {
            // Get current pipeline state in the new format (with name/enabled/parameters)
            const pipelineState = this.audioManager.pipeline.map(plugin =>
                this.getSerializablePluginState(plugin, false, true, true)
            );
            
            // Save to file using the savePipelineState function from app.js
            if (window.savePipelineState) {
                window.savePipelineState(pipelineState);
            }
        }
    }
    
    // Undo the last operation
    undo() {
        if (this.historyIndex <= 0) return; // Nothing to undo
        
        this.historyIndex--;
        this.loadStateFromHistory();
    }
    
    // Redo the last undone operation
    redo() {
        if (this.historyIndex >= this.history.length - 1) return; // Nothing to redo
        
        this.historyIndex++;
        this.loadStateFromHistory();
    }
    
    // Load a state from history
    loadStateFromHistory() {
        this.isUndoRedoOperation = true;
        
        try {
            const state = this.history[this.historyIndex];
            
            // Clean up existing plugins before removing them
            this.audioManager.pipeline.forEach(plugin => {
                if (typeof plugin.cleanup === 'function') {
                    plugin.cleanup();
                }
            });
            
            // Clear current pipeline and expanded plugins
            this.audioManager.pipeline.length = 0;
            this.expandedPlugins.clear();
            
            // Load plugins from state
            state.forEach(pluginState => {
                const plugin = this.pluginManager.createPlugin(pluginState.nm);
                if (plugin) {
                    plugin.enabled = pluginState.en;
                    const { nm, en, ...params } = pluginState;
                    if (plugin.setParameters) {
                        plugin.setParameters(params);
                    }
                    this.audioManager.pipeline.push(plugin);
                    // Expand all plugins (same as loadPreset)
                    this.expandedPlugins.add(plugin);
                }
            });
            
            // Update UI with force rebuild flag
            this.updatePipelineUI(true);
            
            // Update worklet directly without rebuilding pipeline
            this.updateWorkletPlugins();
            
            // Ensure master bypass is OFF after loading state (same as loadPreset)
            this.enabled = true;
            this.audioManager.setMasterBypass(false);
            const masterToggle = document.querySelector('.toggle-button.master-toggle');
            if (masterToggle) {
                masterToggle.classList.remove('off');
            }
            
        } finally {
            this.isUndoRedoOperation = false;
        }
    }
}
