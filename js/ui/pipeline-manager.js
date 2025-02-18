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
        
        // Initialize keyboard events
        this.initKeyboardEvents();
        
        // Create master toggle button
        this.createMasterToggle();
        
        // Initialize preset management
        this.initPresetManagement();
    }

    initPresetManagement() {
        // Load presets from local storage
        this.loadPresetList();
        
        // Save preset button
        this.savePresetButton.addEventListener('click', () => {
            const name = this.presetSelect.value.trim();
            if (name) {
                this.savePreset(name);
            }
        });
        
        // Delete preset button
        this.deletePresetButton.addEventListener('click', () => {
            const name = this.presetSelect.value.trim();
            if (name && this.getPresets()[name] && confirm('Delete this preset?')) {
                this.deletePreset(name);
            }
        });
        
        // Preset selection change
        this.presetSelect.addEventListener('change', (e) => {
            const name = e.target.value.trim();
            const presets = this.getPresets();
            if (presets[name]) {
                this.loadPreset(name);
                // Ensure datalist is up to date
                this.loadPresetList();
            }
        });
    }

    loadPresetList() {
        // Get datalist element
        const datalist = document.getElementById('presetList');
        if (!datalist) return;
        
        // Get current value
        const currentValue = this.presetSelect.value;
        
        // Clear existing options
        datalist.innerHTML = '';
        
        // Get presets from local storage
        const presets = this.getPresets();
        
        // Add preset options
        Object.keys(presets).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            datalist.appendChild(option);
        });
        
        // Restore current value
        this.presetSelect.value = currentValue;
    }

    getPresets() {
        const presetsJson = localStorage.getItem('effetune_presets');
        return presetsJson ? JSON.parse(presetsJson) : {};
    }

    savePreset(name) {
        const presets = this.getPresets();
        
        // Create preset data
        const presetData = {
            plugins: this.audioManager.pipeline.map(plugin => {
                const params = plugin.getSerializableParameters ?
                    plugin.getSerializableParameters() : {};
                const { id, ...cleanParams } = params;
                return {
                    ...cleanParams,
                    nm: plugin.name,
                    en: plugin.enabled
                };
            })
        };
        
        // Save to local storage
        presets[name] = presetData;
        localStorage.setItem('effetune_presets', JSON.stringify(presets));
        
        // Update UI
        this.loadPresetList();
        this.presetSelect.value = name;
        
        if (window.uiManager) {
            window.uiManager.setError(`Preset "${name}" saved!`);
            setTimeout(() => window.uiManager.clearError(), 2000);
        }
    }

    loadPreset(name) {
        const presets = this.getPresets();
        const preset = presets[name];
        
        if (!preset) return;
        
        // Clear current pipeline and expanded plugins
        this.audioManager.pipeline.length = 0;
        this.expandedPlugins.clear();
        
        // Load plugins
        preset.plugins.forEach(state => {
            const plugin = this.pluginManager.createPlugin(state.nm);
            if (plugin) {
                plugin.enabled = state.en;
                const { nm, en, ...params } = state;
                if (plugin.setParameters) {
                    plugin.setParameters(params);
                }
                this.audioManager.pipeline.push(plugin);
                // Expand all plugins
                this.expandedPlugins.add(plugin);
            }
        });
        
        
        // Update UI
        this.updatePipelineUI();
        this.audioManager.rebuildPipeline();
        this.updateURL();
        
        // Update preset list to ensure all presets are available
        this.loadPresetList();
        
        // Ensure master bypass is OFF after loading preset
        this.enabled = true;
        this.audioManager.setMasterBypass(false);
        const masterToggle = document.querySelector('.toggle-button.master-toggle');
        if (masterToggle) {
            masterToggle.classList.remove('off');
        }
        
        if (window.uiManager) {
            window.uiManager.setError(`Preset "${name}" loaded!`);
            setTimeout(() => window.uiManager.clearError(), 2000);
        }
    }

    deletePreset(name) {
        const presets = this.getPresets();
        delete presets[name];
        localStorage.setItem('effetune_presets', JSON.stringify(presets));
        
        // Update UI
        this.loadPresetList();
        this.presetSelect.value = '';
        
        if (window.uiManager) {
            window.uiManager.setError(`Preset "${name}" deleted!`);
            setTimeout(() => window.uiManager.clearError(), 2000);
        }
    }

    initKeyboardEvents() {
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
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

            // Handle Escape key for preset select
            // Skip other shortcuts if focus is on an input/textarea element
            if (e.target.matches('input, textarea')) {
                return;
            }

            if (e.key === 'Escape' && e.target === this.presetSelect) {
                this.presetSelect.value = '';
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
            } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
                // Copy selected plugin settings to clipboard
                if (this.selectedPlugins.size > 0) {
                    const selectedPluginsArray = Array.from(this.selectedPlugins);
                    const states = selectedPluginsArray.map(plugin => {
                        const params = plugin.getSerializableParameters ? 
                            plugin.getSerializableParameters() : {};
                        // Remove id from params if it exists
                        const { id, ...cleanParams } = params;
                        return {
                            ...cleanParams,
                            nm: plugin.name,
                            en: plugin.enabled
                        };
                    });
                    navigator.clipboard.writeText(JSON.stringify(states, null, 2))
                        .then(() => {
                            if (window.uiManager) {
                                window.uiManager.setError('Plugin settings copied to clipboard!');
                                setTimeout(() => window.uiManager.clearError(), 2000);
                            }
                        })
                        .catch(err => {
                            console.error('Failed to copy settings:', err);
                            if (window.uiManager) {
                                window.uiManager.setError('Failed to copy settings to clipboard', true);
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
                            this.audioManager.rebuildPipeline();
                            this.updateURL();

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
                                window.uiManager.setError('Plugin settings pasted successfully!');
                                setTimeout(() => window.uiManager.clearError(), 2000);
                            }
                        } catch (err) {
                            console.error('Failed to paste plugin settings:', err);
                            if (window.uiManager) {
                                window.uiManager.setError('Failed to paste plugin settings', true);
                            }
                        }
                    })
                    .catch(err => {
                        console.error('Failed to read clipboard:', err);
                        if (window.uiManager) {
                            window.uiManager.setError('Failed to read clipboard', true);
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
                            this.audioManager.pipeline.splice(index, 1);
                            this.selectedPlugins.delete(plugin);
                        }
                    });
                    
                    this.updatePipelineUI();
                    this.audioManager.rebuildPipeline();
                    this.updateURL();
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
        helpBtn.onclick = (e) => {
            const category = Object.entries(this.pluginManager.effectCategories)
                .find(([_, {plugins}]) => plugins.includes(plugin.name))?.[0];
            
            if (category) {
                const anchor = plugin.name.toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-');
                const path = `/plugins/${category.toLowerCase().replace(/-/g, '')}.html#${anchor}`;
                const localizedPath = this.getLocalizedDocPath(path);
                window.open(localizedPath, '_blank');
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
                this.audioManager.pipeline.splice(index, 1);
                this.selectedPlugins.delete(plugin);
                this.updatePipelineUI();
                this.audioManager.rebuildPipeline();
                this.updateURL();
            }
        };
        header.appendChild(deleteBtn);

        item.appendChild(header);

        // Plugin UI container
        const ui = document.createElement('div');
        ui.className = 'plugin-ui' + (this.expandedPlugins.has(plugin) ? ' expanded' : '');
        
        // Restore parameter update handling to original implementation only
        if (plugin.updateParameters) {
            const originalUpdateParameters = plugin.updateParameters;
            plugin.updateParameters = function(...args) {
                originalUpdateParameters.apply(this, args);
                if (this.audioManager) {
                    this.audioManager.rebuildPipeline();
                    if (window.uiManager) {
                        window.uiManager.updateURL();
                    }
                }
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
        });

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
        });
    }

    createMasterToggle() {
        const toggle = document.querySelector('.toggle-button.master-toggle');
        if (!toggle) return;

        toggle.onclick = () => {
            this.enabled = !this.enabled;
            toggle.classList.toggle('off', !this.enabled);
            this.audioManager.setMasterBypass(!this.enabled);
            this.updateURL();
        };
    }

    updatePipelineUI() {
        this.pipelineList.innerHTML = '';
        this.pipelineEmpty.style.display = this.audioManager.pipeline.length ? 'none' : 'block';

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

        // Create file drop area
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
        dropArea.innerHTML = `
            <div class="drop-message">
                <span>Drop audio file here to process with current effects</span>
                <span class="or-text">or</span>
                <span class="select-files">specify files to process</span>
            </div>
            <div class="progress-container" style="display: none;">
                <div class="progress-bar">
                    <div class="progress"></div>
                </div>
            <div class="progress-text">Processing...</div>
            <button class="cancel-button">Cancel</button>
        </div>
        `;

        // Add click handler for file selection
        const selectFiles = dropArea.querySelector('.select-files');
        selectFiles.addEventListener('click', () => {
            fileInput.click();
        });

        // Handle selected files
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
                            this.setProgressText('Processing canceled');
                            return;
                        }
                    } catch (error) {
                        console.error('Error processing file:', error);
                        window.uiManager.setError(`Failed to process ${file.name}: ${error.message}`, true);
                    }
                }

                // Set progress to 100%
                this.progressBar.style.width = '100%';
                this.setProgressText('Processing complete');

                // Create zip if multiple files were processed
                if (processedFiles.length > 0) {
                    if (processedFiles.length === 1) {
                        this.showDownloadLink(processedFiles[0].blob, files[0].name);
                    } else {
                        this.setProgressText('Creating zip file...');
                        const zip = new JSZip();
                        processedFiles.forEach(({blob, name}) => {
                            zip.file(name, blob);
                        });
                        const zipBlob = await zip.generateAsync({type: 'blob'});
                        this.showDownloadLink(zipBlob, 'processed_audio.zip', true);
                    }
                }
            } catch (error) {
                console.error('Error processing files:', error);
                window.uiManager.setError('Failed to process audio files: ' + error.message, true);
            } finally {
                this.hideProgress();
                // Reset file input
                fileInput.value = '';
            }
        });

        // Create download container
        const downloadContainer = document.createElement('div');
        downloadContainer.className = 'download-container';
        downloadContainer.style.display = 'none';

        // Add to pipeline container
        pipelineElement.appendChild(dropArea);
        pipelineElement.appendChild(downloadContainer);

        // Store references
        this.dropArea = dropArea;
        this.downloadContainer = downloadContainer;
        this.progressContainer = dropArea.querySelector('.progress-container');
        this.progressBar = dropArea.querySelector('.progress');
        this.progressText = dropArea.querySelector('.progress-text');

        // Handle plugin drag and drop
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

        // Handle file drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                // Only prevent default if it's a file being dragged
                if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, false);
            
            document.body.addEventListener(eventName, (e) => {
                // Only prevent default if it's a file being dragged
                if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, false);
        });

        // Handle file drag enter/leave visual feedback
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
                    dropArea.classList.add('drag-active');
                }
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
                    dropArea.classList.remove('drag-active');
                }
            }, false);
        });

            // Handle dropped files
            dropArea.addEventListener('drop', async (e) => {
                // Check if this is a file drop
                if (!e.dataTransfer || !e.dataTransfer.types || !e.dataTransfer.types.includes('Files')) {
                    return;
                }

            // Ensure insertion indicator is hidden for file drops
            this.pluginListManager.getInsertionIndicator().style.display = 'none';

            const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('audio/'));
            if (files.length === 0) {
                window.uiManager.setError('Please drop audio files', true);
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
                            this.setProgressText('Processing canceled');
                            return;
                        }
                    } catch (error) {
                        console.error('Error processing file:', error);
                        window.uiManager.setError(`Failed to process ${file.name}: ${error.message}`, true);
                    }
                }

                // Set progress to 100%
                this.progressBar.style.width = '100%';
                this.setProgressText('Processing complete');

                // Create zip if multiple files were processed
                if (processedFiles.length > 0) {
                    if (processedFiles.length === 1) {
                        this.showDownloadLink(processedFiles[0].blob, files[0].name);
                    } else {
                        this.setProgressText('Creating zip file...');
                        const zip = new JSZip();
                        processedFiles.forEach(({blob, name}) => {
                            zip.file(name, blob);
                        });
                        const zipBlob = await zip.generateAsync({type: 'blob'});
                        this.showDownloadLink(zipBlob, 'processed_audio.zip', true);
                    }
                }
            } catch (error) {
                console.error('Error processing files:', error);
                window.uiManager.setError('Failed to process audio files: ' + error.message, true);
            } finally {
                this.hideProgress();
            }
            e.preventDefault();
            e.stopPropagation();
        }, false);

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
                
                this.audioManager.rebuildPipeline();
                this.updateURL();
                
                requestAnimationFrame(() => {
                    this.updatePipelineUI();
                });
                return;
            }

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
                
                this.audioManager.rebuildPipeline();
                this.updateURL();
                
                requestAnimationFrame(() => {
                    this.updatePipelineUI();
                });
            }
        });
    }

    showProgress() {
        this.progressContainer.style.display = 'block';
        this.downloadContainer.style.display = 'none';
        this.progressBar.style.width = '0%';
        
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
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = filename;
        downloadLink.className = 'download-link';
        downloadLink.innerHTML = `
            <span class="download-icon">⭳</span>
            Download ${isZip ? 'processed files' : 'processed file'} (${(blob.size / (1024 * 1024)).toFixed(1)} MB)
        `;

        // Add to container
        this.downloadContainer.appendChild(downloadLink);
        this.downloadContainer.style.display = 'block';

        // Clean up object URL when downloaded
        downloadLink.addEventListener('click', () => {
            setTimeout(() => {
                URL.revokeObjectURL(downloadLink.href);
            }, 100);
        });
    }

    updateURL() {
        if (window.uiManager) {
            window.uiManager.updateURL();
        }
    }
}
