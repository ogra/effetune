/**
 * PipelineCore - Core functionality for managing the audio processing pipeline
 * Handles plugin creation, deletion, reordering, and UI updates
 */
export class PipelineCore {
    /**
     * Create a new PipelineCore instance
     * @param {Object} audioManager - The audio manager instance
     * @param {Object} pluginManager - The plugin manager instance
     * @param {Set} expandedPlugins - Set of expanded plugins
     */
    constructor(audioManager, pluginManager, expandedPlugins) {
        this.audioManager = audioManager;
        this.pluginManager = pluginManager;
        this.expandedPlugins = expandedPlugins;
        this.selectedPlugins = new Set();
        this.enabled = true;
        
        this.pipelineList = document.getElementById('pipelineList');
        this.pipelineEmpty = document.getElementById('pipelineEmpty');
        
        // Create master toggle button
        this.createMasterToggle();
    }
    
    /**
     * Create a pipeline item for a plugin
     * @param {Object} plugin - The plugin to create an item for
     * @returns {HTMLElement} The created pipeline item
     */
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

            // Special handling for Ctrl/Cmd click to toggle selection
            if (e.ctrlKey || e.metaKey) {
                if (this.selectedPlugins.has(plugin)) {
                    this.selectedPlugins.delete(plugin);
                    this.updateSelectionClasses();
                } else {
                    this.handlePluginSelection(plugin, e, false);
                }
            } else {
                // Single selection on normal click
                this.handlePluginSelection(plugin, e);
            }
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
            
            // Use the common selection function
            this.handlePluginSelection(plugin, e);
            
            // Update worklet directly without rebuilding pipeline
            this.updateWorkletPlugin(plugin);
            
            // Save state for undo/redo
            if (this.pipelineManager && this.pipelineManager.historyManager) {
                this.pipelineManager.historyManager.saveState();
            }
        };
        header.appendChild(toggle);

        // Plugin name
        const name = document.createElement('div');
        name.className = 'plugin-name';
        name.textContent = plugin.name;
        header.appendChild(name);

        // Move up button
        const moveUpBtn = document.createElement('button');
        moveUpBtn.className = 'move-up-button';
        moveUpBtn.textContent = '▲';
        moveUpBtn.title = 'Move effect up';
        moveUpBtn.onclick = (e) => {
            // Use the common selection function
            this.handlePluginSelection(plugin, e);
            
            // Get the index of the plugin
            const index = this.audioManager.pipeline.indexOf(plugin);
            
            // Can't move up if it's the first plugin
            if (index <= 0) return;
            
            // Swap with the plugin above
            const temp = this.audioManager.pipeline[index - 1];
            this.audioManager.pipeline[index - 1] = plugin;
            this.audioManager.pipeline[index] = temp;
            
            // Update worklet directly without rebuilding pipeline
            this.updateWorkletPlugins();
            
            // Save state for undo/redo
            if (this.pipelineManager && this.pipelineManager.historyManager) {
                this.pipelineManager.historyManager.saveState();
            }
            
            // Update UI
            this.updatePipelineUI();
        };
        header.appendChild(moveUpBtn);

        // Move down button
        const moveDownBtn = document.createElement('button');
        moveDownBtn.className = 'move-down-button';
        moveDownBtn.textContent = '▼';
        moveDownBtn.title = 'Move effect down';
        moveDownBtn.onclick = (e) => {
            // Use the common selection function
            this.handlePluginSelection(plugin, e);
            
            // Get the index of the plugin
            const index = this.audioManager.pipeline.indexOf(plugin);
            
            // Can't move down if it's the last plugin
            if (index >= this.audioManager.pipeline.length - 1) return;
            
            // Swap with the plugin below
            const temp = this.audioManager.pipeline[index + 1];
            this.audioManager.pipeline[index + 1] = plugin;
            this.audioManager.pipeline[index] = temp;
            
            // Update worklet directly without rebuilding pipeline
            this.updateWorkletPlugins();
            
            // Save state for undo/redo
            if (this.pipelineManager && this.pipelineManager.historyManager) {
                this.pipelineManager.historyManager.saveState();
            }
            
            // Update UI
            this.updatePipelineUI();
        };
        header.appendChild(moveDownBtn);

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
                const localizedPath = this.pipelineManager.getLocalizedDocPath(path);
                
                
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
            
            // Use the common selection function
            this.handlePluginSelection(plugin, e);
        };
        header.appendChild(helpBtn);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.textContent = '✖';
        deleteBtn.onclick = (e) => {
            // Use the common selection function
            this.handlePluginSelection(plugin, e);
            
            // Use the common delete function
            this.deleteSelectedPlugins();
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
                        this.audioManager.pipelineManager.historyManager.saveState();
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
                        this.audioManager.pipelineManager.historyManager.saveState();
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
                
                // Use the common selection function
                this.handlePluginSelection(plugin, e);
            }
        });
        
        ui.appendChild(plugin.createUI());
        item.appendChild(ui);

        // Toggle UI visibility and handle selection
        name.onclick = (e) => {
            // Handle selection first to ensure immediate visual feedback
            // Special handling for Ctrl/Cmd click to toggle selection
            if (e.ctrlKey || e.metaKey) {
                if (this.selectedPlugins.has(plugin)) {
                    this.selectedPlugins.delete(plugin);
                    this.updateSelectionClasses();
                } else {
                    this.handlePluginSelection(plugin, e, false);
                }
            } else {
                this.handlePluginSelection(plugin, e);
            }
            
            // Handle Shift+Click to collapse/expand effects
            if (e.shiftKey) {
                // Determine if we're expanding or collapsing based on current state
                const shouldExpand = !this.expandedPlugins.has(plugin);
                
                // Check if the clicked plugin is in the Analyzer category
                const clickedPluginCategory = Object.entries(this.pluginManager.effectCategories)
                    .find(([_, {plugins}]) => plugins.includes(plugin.name))?.[0];
                const isClickedPluginAnalyzer = clickedPluginCategory &&
                    clickedPluginCategory.toLowerCase() === 'analyzer';
                
                // Process all plugins
                this.audioManager.pipeline.forEach(p => {
                    // If clicked plugin is NOT in Analyzer category, skip Analyzer category plugins
                    if (!isClickedPluginAnalyzer) {
                        const category = Object.entries(this.pluginManager.effectCategories)
                            .find(([_, {plugins}]) => plugins.includes(p.name))?.[0];
                        
                        if (category && category.toLowerCase() === 'analyzer') {
                            return; // Skip Analyzer category plugins
                        }
                    }
                    // If clicked plugin IS in Analyzer category, process all plugins
                    
                    // Get the UI element for this plugin
                    const pipelineItem = this.pipelineList.children[this.audioManager.pipeline.indexOf(p)];
                    if (!pipelineItem) return;
                    
                    const pluginUI = pipelineItem.querySelector('.plugin-ui');
                    if (!pluginUI) return;
                    
                    // Set expanded state
                    if (shouldExpand) {
                        pluginUI.classList.add('expanded');
                        this.expandedPlugins.add(p);
                        if (p.updateMarkers && p.updateResponse) {
                            requestAnimationFrame(() => {
                                p.updateMarkers();
                                p.updateResponse();
                            });
                        }
                    } else {
                        pluginUI.classList.remove('expanded');
                        this.expandedPlugins.delete(p);
                    }
                });
                
                // Update all titles
                this.pipelineList.querySelectorAll('.plugin-name').forEach((nameEl, index) => {
                    const p = this.audioManager.pipeline[index];
                    nameEl.title = this.expandedPlugins.has(p) ? 'Click to collapse' : 'Click to expand';
                });
                
                return; // Skip individual toggle since we've handled all plugins
            }
            
            // Then toggle expanded state for individual plugin (non-shift click)
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
        };
        name.title = this.expandedPlugins.has(plugin) ? 'Click to collapse' : 'Click to expand';

        // Setup drag events (will be handled by UIEventHandler)
        if (this.pipelineManager && this.pipelineManager.uiEventHandler) {
            this.pipelineManager.uiEventHandler.setupDragEvents(handle, item, plugin);
        }

        return item;
    }

    /**
     * Update the pipeline UI
     * @param {boolean} forceRebuild - Whether to force a complete rebuild of the UI
     */
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

    /**
     * Update the selection classes for pipeline items
     */
    updateSelectionClasses() {
        // First, remove 'selected' class from all items
        this.pipelineList.querySelectorAll('.pipeline-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Then, add 'selected' class to selected items
        // This two-step process ensures a more reliable visual update
        this.pipelineList.querySelectorAll('.pipeline-item').forEach((item, index) => {
            const itemPlugin = this.audioManager.pipeline[index];
            if (this.selectedPlugins.has(itemPlugin)) {
                item.classList.add('selected');
            }
        });
        
        // Force a synchronous style recalculation and layout
        document.body.getBoundingClientRect();
    }

    /**
     * Handle plugin selection
     * @param {Object} plugin - The plugin to select
     * @param {Event} e - The event object
     * @param {boolean} clearExisting - Whether to clear existing selection if not using Ctrl/Cmd key
     */
    handlePluginSelection(plugin, e, clearExisting = true) {
        if (clearExisting && !e.ctrlKey && !e.metaKey) {
            this.selectedPlugins.clear();
        }
        this.selectedPlugins.add(plugin);
        this.updateSelectionClasses();
    }

    /**
     * Delete selected plugins
     * @returns {boolean} Whether the deletion was executed
     */
    deleteSelectedPlugins() {
        if (this.selectedPlugins.size === 0) {
            return false;
        }

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
        if (this.pipelineManager && this.pipelineManager.historyManager) {
            this.pipelineManager.historyManager.saveState();
        }
        
        return true;
    }

    /**
     * Create the master toggle button
     */
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

    /**
     * Update the URL with the current pipeline state
     */
    updateURL() {
        if (window.uiManager) {
            window.uiManager.updateURL();
        }
    }

    /**
     * Update all plugins in the worklet
     */
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

    /**
     * Update a single plugin in the worklet
     * @param {Object} plugin - The plugin to update
     */
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
}