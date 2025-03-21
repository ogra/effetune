/**
 * UIEventHandler - Handles keyboard shortcuts, drag and drop events, and selection management
 */
export class UIEventHandler {
    /**
     * Create a new UIEventHandler instance
     * @param {Object} pipelineManager - The pipeline manager instance
     */
    constructor(pipelineManager) {
        this.pipelineManager = pipelineManager;
        this.core = pipelineManager.core;
        this.historyManager = pipelineManager.historyManager;
        this.clipboardManager = pipelineManager.clipboardManager;
        
        // Initialize keyboard events
        this.initKeyboardEvents();
    }
    
    /**
     * Initialize keyboard event handlers
     */
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
                        this.historyManager.undo();
                        return;
                    } else if (e.key === 'y') {
                        e.preventDefault();
                        e.stopPropagation();
                        this.historyManager.redo();
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
                this.pipelineManager.presetManager.presetSelect.focus();
                this.pipelineManager.presetManager.presetSelect.select();
                
                // If not Shift key and input has value, save preset
                if (!e.shiftKey && this.pipelineManager.presetManager.presetSelect.value.trim()) {
                    this.pipelineManager.presetManager.savePreset(this.pipelineManager.presetManager.presetSelect.value.trim());
                }
                return;
            }

            // Handle Escape key for preset select first
            if (e.key === 'Escape' && e.target === this.pipelineManager.presetManager.presetSelect) {
                this.pipelineManager.presetManager.presetSelect.value = '';
                return;
            }

            // Skip other shortcuts if focus is on an input/textarea element
            if (e.target.matches('input, textarea')) {
                return;
            }

            if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
                // Select all plugins
                e.preventDefault();
                this.core.selectedPlugins.clear();
                this.pipelineManager.audioManager.pipeline.forEach(plugin => {
                    this.core.selectedPlugins.add(plugin);
                });
                this.core.updateSelectionClasses();
            } else if (e.key === 'x' && (e.ctrlKey || e.metaKey)) {
                // Cut selected plugin settings to clipboard (copy + delete)
                e.preventDefault();
                this.clipboardManager.cutSelectedPlugins();
            } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
                // Copy selected plugin settings to clipboard
                e.preventDefault();
                this.clipboardManager.copySelectedPluginsToClipboard();
            } else if (e.key === 'Escape') {
                // Clear preset select text if it's focused
                if (document.activeElement === this.pipelineManager.presetManager.presetSelect) {
                    this.pipelineManager.presetManager.presetSelect.value = '';
                    return;
                }
                
                this.core.selectedPlugins.clear();
                // Update only the selection state classes
                this.core.pipelineList.querySelectorAll('.pipeline-item').forEach(item => {
                    item.classList.remove('selected');
                });
            } else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
                // Paste plugin settings from clipboard
                navigator.clipboard.readText()
                    .then(text => {
                        this.clipboardManager.handlePaste(text);
                    })
                    .catch(err => {
                        // Failed to read clipboard
                        if (window.uiManager) {
                            window.uiManager.setError('error.failedToReadClipboard', true);
                        }
                    });
            } else if (e.key === 'Delete') {
                // Prevent default behavior and stop propagation to avoid repeated key events in Electron
                e.preventDefault();
                e.stopPropagation();
                
                // Use the common delete function
                this.core.deleteSelectedPlugins();
            }
        });
    }
    
    /**
     * Initialize drag and drop functionality
     */
    initDragAndDrop() {
        const pipelineElement = document.getElementById('pipeline');

        // Create file drop area and setup file input
        if (this.pipelineManager.fileProcessor) {
            this.pipelineManager.fileProcessor.createFileDropArea(pipelineElement);
        }
        
        // Setup plugin selection and drag handlers
        this.setupPluginSelectionHandlers(pipelineElement);
        
        // Setup plugin drag and drop handlers
        this.setupPluginDragHandlers(pipelineElement);
        
        // Setup file drag and drop handlers
        if (this.pipelineManager.fileProcessor) {
            this.pipelineManager.fileProcessor.setupFileDropHandlers();
        }
    }
    
    /**
     * Sets up plugin selection handlers
     * @param {HTMLElement} pipelineElement - The pipeline container element
     */
    setupPluginSelectionHandlers(pipelineElement) {
        pipelineElement.addEventListener('click', (e) => {
            const pipelineHeader = pipelineElement.querySelector('.pipeline-header');
            if (e.target === pipelineElement ||
                e.target === this.core.pipelineList ||
                e.target === pipelineHeader ||
                pipelineHeader.contains(e.target)) {
                this.core.selectedPlugins.clear();
                this.core.updateSelectionClasses();
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
                this.pipelineManager.pluginListManager.updateInsertionIndicator(e.clientY);
            } else {
                // Hide insertion indicator when dragging files
                this.pipelineManager.pluginListManager.getInsertionIndicator().style.display = 'none';
            }
        });

        // Handle plugin drag leave
        pipelineElement.addEventListener('dragleave', (e) => {
            if (!pipelineElement.contains(e.relatedTarget)) {
                this.pipelineManager.pluginListManager.getInsertionIndicator().style.display = 'none';
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
        const plugin = this.pipelineManager.audioManager.pipeline[parsedSourceIndex];
        
        const items = Array.from(this.core.pipelineList.children);
        const targetItem = items.find(item => {
            const rect = item.getBoundingClientRect();
            return e.clientY < rect.top + (rect.height / 2);
        });
        
        let targetIndex = targetItem ? items.indexOf(targetItem) : items.length;
        if (targetIndex > parsedSourceIndex) {
            targetIndex--;
        }
        
        this.pipelineManager.audioManager.pipeline.splice(parsedSourceIndex, 1);
        this.pipelineManager.audioManager.pipeline.splice(targetIndex, 0, plugin);
        
        // Use the common selection function
        this.core.handlePluginSelection(plugin, e);
        
        // Update worklet directly without rebuilding pipeline
        this.core.updateWorkletPlugins();
        
        // Save state for undo/redo
        this.historyManager.saveState();
        
        requestAnimationFrame(() => {
            this.core.updatePipelineUI();
        });
    }
    
    /**
     * Handles dropping a new plugin
     * @param {DragEvent} e - The drop event
     */
    handleNewPluginDrop(e) {
        const pluginName = e.dataTransfer.getData('text/plain');
        if (pluginName && this.pipelineManager.pluginManager.pluginClasses[pluginName]) {
            const plugin = this.pipelineManager.pluginManager.createPlugin(pluginName);
            this.pipelineManager.expandedPlugins.add(plugin);

            const items = Array.from(this.core.pipelineList.children);
            const targetItem = items.find(item => {
                const rect = item.getBoundingClientRect();
                return e.clientY < rect.top + (rect.height / 2);
            });
            
            const targetIndex = targetItem ? items.indexOf(targetItem) : items.length;
            this.pipelineManager.audioManager.pipeline.splice(targetIndex, 0, plugin);
            
            // Use the common selection function
            this.core.handlePluginSelection(plugin, e);
            
            // Update worklet directly without rebuilding pipeline
            this.core.updateWorkletPlugins();
            
            // Save state for undo/redo
            this.historyManager.saveState();
            
            requestAnimationFrame(() => {
                this.core.updatePipelineUI();
            });
        }
    }
    
    /**
     * Setup drag events for a plugin item
     * @param {HTMLElement} handle - The drag handle element
     * @param {HTMLElement} item - The pipeline item element
     * @param {Object} plugin - The plugin object
     */
    setupDragEvents(handle, item, plugin) {
        // Mouse drag events for reordering
        handle.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/x-pipeline-index', 
                this.pipelineManager.audioManager.pipeline.indexOf(plugin).toString());
            item.classList.add('dragging');
        });

        handle.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            this.pipelineManager.pluginListManager.getInsertionIndicator().style.display = 'none';
        });

        // Touch events for reordering
        let isDragging = false;
        let clone = null;
        let touchOffsetX = 0;
        let touchOffsetY = 0;
        const sourceIndex = this.pipelineManager.audioManager.pipeline.indexOf(plugin);

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
                
                this.pipelineManager.pluginListManager.updateInsertionIndicator(touch.clientY);
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
                this.pipelineManager.pluginListManager.getInsertionIndicator().style.display = 'none';
            }
            
            isDragging = false;
        }, { passive: false }); // Add passive: false to allow preventDefault
    }
}