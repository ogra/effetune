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
        
        // Setup global drag and drop handlers (for browser environment only)
        //
        // IMPORTANT DRAG & DROP BEHAVIOR NOTES:
        // --------------------------------------
        // 1. These handlers are for the entire document and handle both music files and preset files.
        // 2. The behavior differs based on file type and drop target:
        //
        //    A. Music Files (.mp3, .wav, etc.):
        //       - When dragged over the main window (not file-drop-area):
        //         * body gets 'drag-over' class
        //       - When dropped on the main window (not file-drop-area):
        //         * Files are played in the Player
        //       - When dragged/dropped on file-drop-area:
        //         * Handled by FileProcessor.js for offline processing
        //
        //    B. Preset Files (.effetune_preset):
        //       - When dragged over ANY part of the window:
        //         * body gets 'drag-over' class
        //         * file-drop-area should NOT show 'drag-active' class
        //       - When dropped ANYWHERE in the window:
        //         * Preset is loaded into the Effect Pipeline
        //
        // 3. Visual feedback is critical:
        //    - 'drag-over' on body = will be played or loaded as preset
        //    - 'drag-active' on file-drop-area = will be processed offline
        //
        // 4. Event propagation is carefully managed:
        //    - For preset files: events bubble up to document handlers
        //    - For music files on file-drop-area: events are stopped
        //    - For music files elsewhere: events bubble up to document handlers
        //
        // DO NOT MODIFY THIS BEHAVIOR without thorough testing of all drag & drop scenarios!
        if (!window.electronIntegration || !window.electronIntegration.isElectron) {
            // Add CSS for drag-over effect directly to the document
            const style = document.createElement('style');
            style.id = 'drag-drop-style';
            style.textContent = `
                body.drag-over {
                    position: relative;
                }
                
                body.drag-over::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 120, 255, 0.1);
                    border: 2px dashed rgba(0, 120, 255, 0.5);
                    pointer-events: none;
                    z-index: 9999;
                }
            `;
            
            // Remove any existing style with the same ID
            const existingStyle = document.getElementById('drag-drop-style');
            if (existingStyle) {
                existingStyle.remove();
            }
            
            // Add the new style
            document.head.appendChild(style);

// Handle dragover for the entire document
            // Handle dragover for the entire document
            document.addEventListener('dragover', (e) => {
                // Always prevent default for dragover to enable drop
                e.preventDefault();
                
                // Check if this is a file drag - use a more permissive check
                if (e.dataTransfer && (
                    // Check for items
                    (e.dataTransfer.items && Array.from(e.dataTransfer.items).some(item => item.kind === 'file')) ||
                    // Also check types array
                    (e.dataTransfer.types && e.dataTransfer.types.includes('Files'))
                )) {
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'copy';
                    
                    // Check if the target is the file-drop-area or a child of it
                    const fileDropArea = e.target.closest('.file-drop-area');
                    if (fileDropArea) {
                        // Remove drag-over from body when over file-drop-area
                        document.body.classList.remove('drag-over');
                        return;
                    }
                    
                    // Check for preset files or music files
                    const items = Array.from(e.dataTransfer.items);
                    
                    // Add visual feedback for any file drag
                    document.body.classList.add('drag-over');
                    
                    // Force a reflow to ensure the style is applied
                    void document.body.offsetHeight;
                    
                    return false;
                }
            }, true); // Use capture phase
            
            // Handle dragleave for the entire document
            document.addEventListener('dragleave', (e) => {
                // Only handle if we're leaving the document and it's a file drag
                if ((!e.relatedTarget || e.relatedTarget === document.documentElement) &&
                    document.body.classList.contains('drag-over')) {
                    document.body.classList.remove('drag-over');
                }
            }, true); // Use capture phase
            
            // Handle drop for the entire document
            document.addEventListener('drop', (e) => {
                // Check if this is a file drop
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    // Check if the target is the file-drop-area or a child of it
                    const fileDropArea = e.target.closest('.file-drop-area');
                    if (fileDropArea) {
                        // Allow the drop event to propagate to the file-drop-area handler
                        document.body.classList.remove('drag-over');
                        return;
                    }
                    
                    // For other areas, prevent default behavior
                    e.preventDefault();
                    e.stopPropagation();
                    document.body.classList.remove('drag-over');
                    
                    // Process the dropped files
                    const files = Array.from(e.dataTransfer.files);
                    
                    // Check for preset files
                    const presetFiles = files.filter(file =>
                        file.name.toLowerCase().endsWith('.effetune_preset')
                    );
                    
                    // Check for music files
                    const musicFiles = files.filter(file =>
                        file.type.startsWith('audio/') ||
                        /\.(mp3|wav|ogg|flac|m4a|aac|aiff|wma|alac)$/i.test(file.name)
                    );
                    
                    // Process preset files first (if any)
                    if (presetFiles.length > 0) {
                        // Read the preset file content
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            try {
                                const fileData = event.target.result;
                                const presetData = JSON.parse(fileData);
                                
                                // Load the preset using the UI manager
                                if (window.uiManager) {
                                    window.uiManager.loadPreset(presetData);
                                }
                            } catch (error) {
                                console.error('Failed to parse preset file:', error);
                                if (window.uiManager) {
                                    window.uiManager.setError('Invalid preset file format', true);
                                }
                            }
                        };
                        reader.onerror = (error) => {
                            console.error('Failed to read preset file:', error);
                            if (window.uiManager) {
                                window.uiManager.setError('Failed to read preset file', true);
                            }
                        };
                        reader.readAsText(presetFiles[0]);
                    }
                    // Process music files (if any and no preset files)
                    else if (musicFiles.length > 0) {
                        // For browser environment, create audio player directly with the files
                        if (window.uiManager) {
                            // Convert File objects to URLs
                            const fileUrls = musicFiles.map(file => URL.createObjectURL(file));
                            
                            // Create audio player with the file URLs
                            window.uiManager.createAudioPlayer(fileUrls, false);
                            
                            // Clean up object URLs when they're no longer needed
                            window.addEventListener('unload', () => {
                                fileUrls.forEach(url => URL.revokeObjectURL(url));
                            }, { once: true });
                        }
                    }
                    
                    return false;
                }
            }, true); // Use capture phase
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