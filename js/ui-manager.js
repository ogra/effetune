export class UIManager {
    constructor(pluginManager, audioManager) {
        this.pluginManager = pluginManager;
        this.audioManager = audioManager;
        this.expandedPlugins = new Set();
        
        // UI elements
        this.errorDisplay = document.getElementById('errorDisplay');
        this.resetButton = document.getElementById('resetButton');
        this.shareButton = document.getElementById('shareButton');
        this.pluginList = document.getElementById('pluginList');
        this.pipelineList = document.getElementById('pipelineList');
        this.pipelineEmpty = document.getElementById('pipelineEmpty');
        this.sampleRate = document.getElementById('sampleRate');

        // Create drag message element
        this.dragMessage = document.createElement('div');
        this.dragMessage.className = 'drag-message';
        this.dragMessage.textContent = 'Drag this effect to add it at your desired position in the Effect Pipeline';
        document.getElementById('pipeline').appendChild(this.dragMessage);

        // Create insertion indicator
        this.insertionIndicator = document.createElement('div');
        this.insertionIndicator.className = 'insertion-indicator';
        document.getElementById('pipeline').appendChild(this.insertionIndicator);

        // Initialize UI event handlers
        this.resetButton.addEventListener('click', () => {
            const state = this.getPipelineState();
            const newURL = new URL(window.location.href);
            newURL.searchParams.delete('p');
            window.history.replaceState({}, '', newURL);
            this.setError('Resetting Audio...');
            setTimeout(() => window.location.reload(), 6000);
        });

        this.shareButton.addEventListener('click', () => {
            const state = this.getPipelineState();
            const newURL = new URL(window.location.href);
            newURL.searchParams.set('p', state);
            navigator.clipboard.writeText(newURL.toString())
                .then(() => {
                    this.setError('URL copied to clipboard!');
                    setTimeout(() => this.clearError(), 2000);
                })
                .catch(err => {
                    console.error('Failed to copy URL:', err);
                    this.setError('Failed to copy URL to clipboard');
                });
        });
    }

    initPluginList() {
        let totalEffects = 0;
        const effectCountDiv = document.createElement('div');
        effectCountDiv.id = 'effectCount';
        effectCountDiv.style.textAlign = 'center';
        effectCountDiv.style.marginTop = '10px';
        effectCountDiv.style.color = '#666';
        effectCountDiv.style.fontSize = '12px';

        // Create category sections from dynamically loaded categories
        for (const [category, {description, plugins}] of Object.entries(this.pluginManager.effectCategories)) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'plugin-category';

            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = category;
            categoryDiv.appendChild(categoryTitle);

            // Add plugins for this category
            plugins.forEach(name => {
                if (this.pluginManager.pluginClasses[name]) {
                    const plugin = new this.pluginManager.pluginClasses[name]();
                    
                    const item = document.createElement('div');
                    item.className = 'plugin-item';
                    item.draggable = true;
                    item.textContent = plugin.name;
                    
                    const description = document.createElement('div');
                    description.className = 'plugin-description';
                    description.textContent = plugin.description;
                    item.appendChild(description);

                    item.addEventListener('mousedown', () => {
                        this.dragMessage.style.display = 'block';
                    });

                    item.addEventListener('mouseup', () => {
                        // Hide message if drag didn't start
                        if (!item.matches('.dragging')) {
                            this.dragMessage.style.display = 'none';
                        }
                    });

                    item.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('text/plain', plugin.name);
                        item.classList.add('dragging');
                    });

                    item.addEventListener('dragend', () => {
                        this.dragMessage.style.display = 'none';
                        this.insertionIndicator.style.display = 'none';
                        item.classList.remove('dragging');
                    });

                    categoryDiv.appendChild(item);
                }
            });

            this.pluginList.appendChild(categoryDiv);
            totalEffects += plugins.length;
        }

        // Add effect count at the end of the list
        effectCountDiv.textContent = `${totalEffects} effects available`;
        this.pluginList.appendChild(effectCountDiv);
    }

    createPipelineItem(plugin) {
        const item = document.createElement('div');
        item.className = 'pipeline-item';
        
        // Create header container
        const header = document.createElement('div');
        header.className = 'pipeline-item-header';
        
        // Handle for reordering
        const handle = document.createElement('div');
        handle.className = 'handle';
        handle.innerHTML = '⋮';
        handle.draggable = true;
        header.appendChild(handle);

        // Enable/disable toggle
        const toggle = document.createElement('button');
        toggle.className = 'toggle-button';
        toggle.textContent = 'ON';
        toggle.classList.toggle('off', !plugin.enabled);
        toggle.onclick = () => {
            plugin.setEnabled(!plugin.enabled);
            toggle.classList.toggle('off', !plugin.enabled);
            this.audioManager.rebuildPipeline();
            this.updateURL();
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
        helpBtn.onclick = () => {
            // Get category from plugin display name
            const pluginDisplayName = plugin.name;
            const category = Object.entries(this.pluginManager.effectCategories)
                .find(([_, {plugins}]) => plugins.includes(pluginDisplayName))?.[0];
            
            if (category) {
                // Use relative path from effetune.html
                const baseUrl = '';
                // Generate anchor from plugin name
                // Following GitHub's Markdown rendering rules:
                // 1. Convert to lowercase
                // 2. Replace spaces with hyphens
                // 3. Remove punctuation
                const anchor = pluginDisplayName.toLowerCase()
                    .replace(/[^\w\s-]/g, '')  // Remove punctuation
                    .replace(/\s+/g, '-');     // Replace spaces with hyphens
                const path = `plugins/${category.toLowerCase()}/#${anchor}`;
                window.open(baseUrl + path, '_blank');
            }
        };
        header.appendChild(helpBtn);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.textContent = '🗑';
        deleteBtn.onclick = () => {
            const index = this.audioManager.pipeline.indexOf(plugin);
            if (index > -1) {
                this.audioManager.pipeline.splice(index, 1);
                this.updatePipelineUI();
                this.audioManager.rebuildPipeline();
                this.updateURL();
            }
        };
        header.appendChild(deleteBtn);

        // Add header to item
        item.appendChild(header);

        // Plugin UI container
        const ui = document.createElement('div');
        ui.className = 'plugin-ui' + (this.expandedPlugins.has(plugin) ? ' expanded' : '');
        ui.appendChild(plugin.createUI());
        item.appendChild(ui);

        // Toggle UI visibility
        name.onclick = () => {
            const isExpanded = ui.classList.toggle('expanded');
            if (isExpanded) {
                this.expandedPlugins.add(plugin);
            } else {
                this.expandedPlugins.delete(plugin);
            }
            name.title = isExpanded ? 'Click to collapse' : 'Click to expand';
        };
        name.title = this.expandedPlugins.has(plugin) ? 'Click to collapse' : 'Click to expand';

        // Drag and drop reordering
        handle.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/x-pipeline-index', 
                this.audioManager.pipeline.indexOf(plugin).toString());
            item.classList.add('dragging');
        });

        handle.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            this.insertionIndicator.style.display = 'none';
        });

        return item;
    }

    updatePipelineUI() {
        this.pipelineList.innerHTML = '';
        this.pipelineEmpty.style.display = this.audioManager.pipeline.length ? 'none' : 'block';

        this.audioManager.pipeline.forEach(plugin => {
            this.pipelineList.appendChild(this.createPipelineItem(plugin));
        });
    }

    initDragAndDrop() {
        const pipelineElement = document.getElementById('pipeline');
        
        pipelineElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            // Find target position for insertion indicator
            const items = Array.from(this.pipelineList.children);
            const pipelineRect = this.pipelineList.getBoundingClientRect();
            const targetItem = items.find(item => {
                const rect = item.getBoundingClientRect();
                return e.clientY < rect.top + (rect.height / 2);
            });

            if (targetItem) {
                // Position above the target item
                this.insertionIndicator.style.top = `${targetItem.offsetTop}px`;
            } else if (items.length > 0) {
                // Position after the last item
                const lastItem = items[items.length - 1];
                this.insertionIndicator.style.top = `${lastItem.offsetTop + lastItem.offsetHeight}px`;
            } else {
                // Position at the top of the empty pipeline list
                this.insertionIndicator.style.top = `${pipelineRect.top - this.pipelineList.offsetTop}px`;
            }
            this.insertionIndicator.style.display = 'block';
        });

        pipelineElement.addEventListener('dragleave', (e) => {
            if (!pipelineElement.contains(e.relatedTarget)) {
                this.insertionIndicator.style.display = 'none';
            }
        });

        pipelineElement.addEventListener('drop', (e) => {
            e.preventDefault();

            // Handle reordering
            const sourceIndex = e.dataTransfer.getData('application/x-pipeline-index');
            if (sourceIndex !== '') {
                const parsedSourceIndex = parseInt(sourceIndex);
                const plugin = this.audioManager.pipeline[parsedSourceIndex];
                
                // Find target position using the same logic as dragover
                const items = Array.from(this.pipelineList.children);
                const targetItem = items.find(item => {
                    const rect = item.getBoundingClientRect();
                    return e.clientY < rect.top + (rect.height / 2);
                });
                
                let targetIndex = targetItem ? items.indexOf(targetItem) : items.length;
                
                // Adjust target index based on source index
                if (targetIndex > parsedSourceIndex) {
                    targetIndex--;
                }
                
                // Remove from source position and insert at target position
                this.audioManager.pipeline.splice(parsedSourceIndex, 1);
                this.audioManager.pipeline.splice(targetIndex, 0, plugin);
                
                this.updatePipelineUI();
                this.audioManager.rebuildPipeline();
                this.updateURL();
                return;
            }

            // Handle new plugin
            const pluginName = e.dataTransfer.getData('text/plain');
            if (pluginName && this.pluginManager.pluginClasses[pluginName]) {
                const plugin = this.pluginManager.createPlugin(pluginName);
                this.expandedPlugins.add(plugin); // Start expanded by default

                // Find target position using the same logic as dragover
                const items = Array.from(this.pipelineList.children);
                const targetItem = items.find(item => {
                    const rect = item.getBoundingClientRect();
                    return e.clientY < rect.top + (rect.height / 2);
                });
                
                const targetIndex = targetItem ? items.indexOf(targetItem) : items.length;
                this.audioManager.pipeline.splice(targetIndex, 0, plugin);
                
                this.updatePipelineUI();
                this.audioManager.rebuildPipeline();
                this.updateURL();
            }
        });
    }

    // Get pipeline state as base64 encoded URL parameter
    getPipelineState() {
        const state = this.audioManager.pipeline.map(plugin => {
            const params = plugin.getSerializableParameters();
            return {
                ...params,
                nm: plugin.name,
                en: plugin.enabled
            };
        });
        // Convert JSON to base64
        return btoa(JSON.stringify(state));
    }

    // Update URL with current pipeline state
    updateURL() {
        const state = this.getPipelineState();
        const newURL = new URL(window.location.href);
        newURL.searchParams.set('p', state);
        window.history.replaceState({}, '', newURL);
    }

    // Parse pipeline state from URL
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
                // Extract plugin-specific parameters by removing nm, en, and id
                const { nm, en, id, ...pluginParams } = serializedParams;
                return {
                    name: nm,
                    enabled: en,
                    parameters: pluginParams
                };
            });
            return result;
        } catch (error) {
            console.error('Failed to parse pipeline state:', error);
            return null;
        }
    }

    setError(message) {
        this.errorDisplay.textContent = message;
    }

    clearError() {
        this.errorDisplay.textContent = '';
    }

    updateSampleRate() {
        if (this.audioManager.audioContext) {
            this.sampleRate.textContent = `${this.audioManager.audioContext.sampleRate} Hz`;
        }
    }

    // Call this method after audio context is initialized
    initAudio() {
        this.updateSampleRate();
    }
}
