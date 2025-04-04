export class PluginListManager {
    constructor(pluginManager) {
        this.pluginManager = pluginManager;
        this.pluginList = document.getElementById('pluginList');
        
        // Create loading spinner
        this.loadingSpinner = document.createElement('div');
        this.loadingSpinner.className = 'loading-spinner';
        this.pluginList.appendChild(this.loadingSpinner);
        
        // Create progress display as a separate element
        this.progressDisplay = document.createElement('div');
        this.progressDisplay.className = 'loading-spinner-progress';
        this.progressDisplay.textContent = '0%';
        this.pluginList.appendChild(this.progressDisplay);

        // Search functionality
        this.searchButton = document.getElementById('effectSearchButton');
        this.searchInput = document.getElementById('effectSearchInput');
        this.availableEffectsTitle = document.getElementById('availableEffectsTitle');
        this.isSearchActive = false;

        // Pull tab functionality
        this.pullTab = document.getElementById('pluginListPullTab');
        this.mainContainer = document.querySelector('.main-container');
        this.isCollapsed = false;
        
        // Sidebar button functionality
        this.sidebarButton = document.getElementById('sidebarButton');
        
        // Width threshold for auto collapse/expand
        this.widthThreshold = 1500;

        // Setup event handlers
        this.setupSearchFunctionality();
        this.setupPullTabFunctionality();
        this.setupTouchSwipeFunctionality();
        
        // Initialize after app is fully loaded
        this.initializeAfterAppLoaded();
        
        // We'll initialize the window width check after the app is fully initialized
        window.addEventListener('load', () => {
            this.checkWindowWidthAndAdjust();
        });

        // Add keyboard shortcut for search
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault(); // Prevent browser's default search
                e.stopPropagation(); // Stop event propagation
                if (this.isSearchActive) {
                    // If already searching, click twice to re-enable search
                    this.searchButton.click(); // First click to cancel
                    setTimeout(() => this.searchButton.click(), 0); // Second click to re-enable
                } else {
                    this.searchButton.click(); // Single click to enable search
                }
            }
        }, true); // Use capture phase

        // Create drag message element
        this.dragMessage = document.createElement('div');
        this.dragMessage.className = 'drag-message';
        this.dragMessage.style.position = 'absolute';
        this.dragMessage.style.top = '640px';
        this.dragMessage.style.left = '50%';
        this.dragMessage.style.transform = 'translate(-50%, -50%)';
        this.dragMessage.style.textAlign = 'center';
        this.dragMessage.style.whiteSpace = 'pre';
        this.dragMessage.style.fontSize = '16px';
        this.dragMessage.style.lineHeight = '1.8';
        this.dragMessage.style.maxWidth = '100%';
        // Set drag message text (will be updated by UIManager.updateUITexts)
        this.dragMessage.textContent = 'Drag this effect to add it at your desired position in the Effect Pipeline.\nAlternatively, you can double-click this effect to add it to the Effect Pipeline.';
        document.getElementById('pipeline').appendChild(this.dragMessage);

        // Create insertion indicator
        this.insertionIndicator = document.createElement('div');
        this.insertionIndicator.className = 'insertion-indicator';
        document.getElementById('pipeline').appendChild(this.insertionIndicator);

        // Throttle state
        this.lastDragOverTime = 0;
        this.dragOverThrottleDelay = 100;
        this.rafId = null;
    }
    
    // Toggle the collapsed state of the plugin list
    togglePluginListCollapse() {
        this.isCollapsed = !this.isCollapsed;
        
        if (this.isCollapsed) {
            // Collapse the plugin list
            this.pluginList.classList.add('collapsed');
            this.pullTab.classList.add('collapsed');
            this.pullTab.textContent = '▶'; // Show right arrow when collapsed
            this.mainContainer.classList.add('plugin-list-collapsed');
            
            // Position at the very left edge of the screen, ignoring body padding
            this.pullTab.style.left = '0';
            
            // Update pipeline transform
            this.updatePositions();
        } else {
            // Expand the plugin list
            this.pluginList.classList.remove('collapsed');
            this.pullTab.classList.remove('collapsed');
            this.pullTab.textContent = '◀'; // Show left arrow when expanded
            this.mainContainer.classList.remove('plugin-list-collapsed');
            
            // Reset pipeline transform
            const pipeline = document.getElementById('pipeline');
            if (pipeline) {
                pipeline.style.transform = 'none';
            }
            
            // Important: Delay updating the pull tab position to ensure correct calculation
            // after the plugin list has fully expanded
            setTimeout(() => {
                this.updatePositions();
            }, 50);
        }
    }
    
    // Update positions for the pull tab and pipeline
    updatePositions() {
        // Get the actual width of the plugin list including padding
        const pluginListRect = this.pluginList.getBoundingClientRect();
        const pluginListWidth = pluginListRect.width;
        const bodyPadding = 20; // Body padding value
        
        // Calculate positions
        const expandedLeftPosition = pluginListWidth + bodyPadding;
        
        // Store the original position if not already stored
        if (this.originalExpandedPosition === null) {
            this.originalExpandedPosition = expandedLeftPosition;
        }
        
        // Set pull tab position when expanded - use the original position for consistency
        if (!this.isCollapsed) {
            this.pullTab.style.left = this.originalExpandedPosition + 'px';
        }
        
        // Set transform for pipeline when collapsed
        const pipeline = document.getElementById('pipeline');
        if (this.isCollapsed && pipeline) {
            pipeline.style.transform = `translateX(-${pluginListWidth}px)`;
            
            // Update main container width to exactly match the pipeline width
            const pipelineWidth = pipeline.offsetWidth;
            this.mainContainer.style.width = `${pipelineWidth}px`;
            this.mainContainer.style.maxWidth = '100%';
        } else if (pipeline) {
            pipeline.style.transform = 'none';
            
            // Reset main container width
            this.mainContainer.style.width = '';
            this.mainContainer.style.maxWidth = '';
        }
    }
    
    setupPullTabFunctionality() {
        if (!this.pullTab) return;
        
        // Set initial state - pull tab shows ◀ when expanded
        this.pullTab.textContent = '◀';
        
        // Get the pipeline element
        const pipeline = document.getElementById('pipeline');
        
        // Store the original position of the pull tab
        let originalExpandedPosition = null;
        
        // Store the original position in the instance variable
        this.originalExpandedPosition = null;
        
        // Update positions and check window width on resize
        window.addEventListener('resize', () => {
            this.updatePositions();
            this.checkWindowWidthAndAdjust();
        });
        
        this.pullTab.addEventListener('click', () => {
            // Use the togglePluginListCollapse method to handle the collapse/expand functionality
            this.togglePluginListCollapse();
        });
        
        // Initial position update
        this.updatePositions();
    }
    
    // Setup touch swipe functionality to expand the collapsed plugin list
    setupTouchSwipeFunctionality() {
        // Only add touch swipe functionality if touch events are supported
        if ('ontouchstart' in window) {
            let touchStartX = 0;
            let touchEndX = 0;
            const swipeThreshold = 50; // Minimum distance required for a swipe
            
            // Add touch event listeners to the document body
            document.body.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
            }, { passive: true });
            
            document.body.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].clientX;
                
                // Calculate swipe distance
                const swipeDistance = touchEndX - touchStartX;
                
                // If the plugin list is collapsed and user swipes right from left edge
                if (this.isCollapsed &&
                    touchStartX < 30 && // Only detect swipes starting from left edge
                    swipeDistance > swipeThreshold) {
                    
                    // Expand the plugin list (same as clicking the pull tab)
                    this.togglePluginListCollapse();
                }
            }, { passive: true });
        }
        
        // Connect sidebar button if it exists
        if (this.sidebarButton) {
            this.sidebarButton.addEventListener('click', () => {
                this.togglePluginListCollapse();
            });
        }
    }

    // Throttle function with RAF
    throttle(func, delay) {
        const now = Date.now();
        if (now - this.lastDragOverTime >= delay) {
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
            }
            this.rafId = requestAnimationFrame(() => {
                func();
                this.lastDragOverTime = now;
                this.rafId = null;
            });
        }
    }
    
    // Check and adjust the collapse state based on window width
    checkWindowWidthAndAdjust() {
        // Only proceed if the app is fully initialized
        if (!window.app || !window.app.initialized) {
            return;
        }
        const windowWidth = window.innerWidth;
        
        // If window width is less than threshold and plugin list is expanded, collapse it
        if (windowWidth < this.widthThreshold && !this.isCollapsed) {
            this.togglePluginListCollapse();
        }
        // If window width is greater than threshold and plugin list is collapsed, expand it
        else if (windowWidth >= this.widthThreshold && this.isCollapsed) {
            this.togglePluginListCollapse();
        }
    }
    
    // Initialize after app is fully loaded
    initializeAfterAppLoaded() {
        // We need to wait for the app to be fully initialized
        // This means waiting for the app.initialized flag to be true
        // We'll use a MutationObserver to detect when the app is initialized
        
        // First, check if the app is already initialized
        if (window.app && window.app.initialized) {
            this.checkWindowWidthAndAdjust();
            return;
        }
        
        // If not, set up a listener for the app object
        if (!window.appInitializedListener) {
            window.appInitializedListener = true;
            
            // Create a function to check app initialization
            const checkAppInitialized = () => {
                if (window.app && window.app.initialized) {
                    // App is initialized, perform the window width check
                    this.checkWindowWidthAndAdjust();
                    return true;
                }
                return false;
            };
            
            // Try to check immediately
            if (checkAppInitialized()) {
                return;
            }
            
            // Set up a polling mechanism to check periodically
            const intervalId = setInterval(() => {
                if (checkAppInitialized()) {
                    clearInterval(intervalId);
                }
            }, 200);
            
            // Also set up a timeout to clear the interval after a reasonable time
            setTimeout(() => {
                clearInterval(intervalId);
            }, 10000); // 10 seconds max wait time
        }
    }
    
    // Update insertion indicator position
    updateInsertionIndicator(clientY) {
        const pipelineList = document.getElementById('pipelineList');
        const items = Array.from(pipelineList.children);
        const pipelineRect = pipelineList.getBoundingClientRect();
        const targetItem = items.find(item => {
            const rect = item.getBoundingClientRect();
            return clientY < rect.top + (rect.height / 2);
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
            this.insertionIndicator.style.top = `${pipelineRect.top - pipelineList.offsetTop}px`;
        }
        this.insertionIndicator.style.display = 'block';
    }

    setupSearchFunctionality() {
        // Search button click handler
        this.searchButton.addEventListener('click', () => {
            this.isSearchActive = !this.isSearchActive;
            if (this.isSearchActive) {
                this.availableEffectsTitle.style.display = 'none';
                this.searchInput.style.display = 'block';
                this.searchInput.focus();
                this.searchInput.select();
            } else {
                this.availableEffectsTitle.style.display = 'block';
                this.searchInput.style.display = 'none';
                this.searchInput.value = '';
                this.filterPlugins('');
            }
        });

        // Search input handlers
        this.searchInput.addEventListener('input', (e) => {
            this.filterPlugins(e.target.value);
        });

        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.searchButton.click();
            }
        });
    }

    filterPlugins(searchText) {
        const contentContainer = this.pluginList.querySelector('.plugin-list-content');
        if (!contentContainer) return;

        const categories = Array.from(contentContainer.children);
        let totalVisibleEffects = 0;

        for (let i = 0; i < categories.length; i += 2) {
            const categoryTitle = categories[i];
            const categoryItems = categories[i + 1];
            
            if (!categoryTitle || !categoryItems) continue;

            let hasVisibleItems = false;
            const items = categoryItems.getElementsByClassName('plugin-item');
            
            for (const item of items) {
                // Get plugin name (direct text content, excluding description)
                const pluginName = item.childNodes[0].textContent.trim();
                
                const matchesSearch = searchText === '' || 
                    categoryTitle.textContent.toLowerCase().includes(searchText.toLowerCase()) ||
                    pluginName.toLowerCase().includes(searchText.toLowerCase());
                
                item.style.display = matchesSearch ? '' : 'none';
                if (matchesSearch) {
                    hasVisibleItems = true;
                    totalVisibleEffects++;
                }
            }

            // Show/hide category title based on whether it has visible items
            categoryTitle.style.display = hasVisibleItems ? '' : 'none';
            categoryItems.style.display = hasVisibleItems ? '' : 'none';
        }

        // Update effect count text based on search state
        const effectCountDiv = this.pluginList.querySelector('#effectCount');
        if (effectCountDiv) {
            if (window.uiManager && window.uiManager.t) {
                effectCountDiv.textContent = searchText ?
                    window.uiManager.t('ui.effectsFound', { count: totalVisibleEffects }) :
                    window.uiManager.t('ui.effectsAvailable', { count: totalVisibleEffects });
            } else {
                effectCountDiv.textContent = searchText ?
                    `${totalVisibleEffects} effects found` :
                    `${totalVisibleEffects} effects available`;
            }
        }
    }

    initPluginList() {
        let totalEffects = 0;
        const effectCountDiv = document.createElement('div');
        effectCountDiv.id = 'effectCount';
        effectCountDiv.style.textAlign = 'center';
        effectCountDiv.style.marginTop = '10px';
        effectCountDiv.style.color = '#666';
        effectCountDiv.style.fontSize = '14px';

        // Create content container for grid layout
        const contentContainer = document.createElement('div');
        contentContainer.className = 'plugin-list-content';

        // Create category sections from dynamically loaded categories
        for (const [category, {description, plugins}] of Object.entries(this.pluginManager.effectCategories)) {
            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = category;

            // Create container for plugin items
            const pluginItemsContainer = document.createElement('div');
            pluginItemsContainer.className = 'plugin-category-items';

            // Add plugins for this category
            plugins.forEach(name => {
                if (this.pluginManager.pluginClasses[name]) {
                    const plugin = new this.pluginManager.pluginClasses[name]();
                    const item = this.createPluginItem(plugin);
                    pluginItemsContainer.appendChild(item);
                }
            });

            contentContainer.appendChild(categoryTitle);
            contentContainer.appendChild(pluginItemsContainer);
            totalEffects += plugins.length;
        }

        // Find existing content container and remove it if it exists
        const existingContent = this.pluginList.querySelector('.plugin-list-content');
        if (existingContent) {
            existingContent.remove();
        }

        // Add new content while preserving h2
        this.pluginList.appendChild(contentContainer);

        // Add effect count at the end of the list
        if (window.uiManager && window.uiManager.t) {
            effectCountDiv.textContent = window.uiManager.t('ui.effectsAvailable', { count: totalEffects });
        } else {
            effectCountDiv.textContent = `${totalEffects} effects available`;
        }
        this.pluginList.appendChild(effectCountDiv);

        // Hide spinner after plugin list is fully initialized
        this.hideLoadingSpinner();
    }

    createPluginItem(plugin) {
        const item = document.createElement('div');
        item.className = 'plugin-item';
        item.draggable = true;
        item.textContent = plugin.name;
        
        const description = document.createElement('div');
        description.className = 'plugin-description';
        description.textContent = plugin.description;
        item.appendChild(description);

        this.setupPluginItemEvents(item, plugin);

        return item;
    }

    setupPluginItemEvents(item, plugin) {
        // Mouse events
        item.addEventListener('mousedown', () => {
            this.dragMessage.style.display = 'block';
        });

        // Handle double click to add plugin to pipeline
        item.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Create a new instance of the plugin
            const newPlugin = this.pluginManager.createPlugin(plugin.name);
            if (!newPlugin) return;

            // Get pipeline manager from UI manager
            const pipelineManager = window.uiManager.pipelineManager;
            if (!pipelineManager) return;

            // Calculate insertion position:
            // - If plugins are selected, insert before the first selected plugin
            // - If no plugins are selected, append to the end of pipeline
            let insertIndex;
            if (pipelineManager.selectedPlugins.size > 0) {
                insertIndex = Math.min(...Array.from(pipelineManager.selectedPlugins)
                    .map(plugin => pipelineManager.audioManager.pipeline.indexOf(plugin)));
            } else {
                insertIndex = pipelineManager.audioManager.pipeline.length;
            }

            // Add the new plugin at calculated position
            pipelineManager.audioManager.pipeline.splice(insertIndex, 0, newPlugin);
            pipelineManager.expandedPlugins.add(newPlugin);

            // Update selection to only include the new plugin
            pipelineManager.selectedPlugins.clear();
            pipelineManager.selectedPlugins.add(newPlugin);
            pipelineManager.updateSelectionClasses();

            // Refresh UI state
            pipelineManager.updatePipelineUI();
            pipelineManager.audioManager.rebuildPipeline();
            pipelineManager.updateURL();
            
            // Check window width and adjust plugin list collapse state
            this.checkWindowWidthAndAdjust();

            // Auto-scroll to show newly added plugin if it was appended at the end
            if (insertIndex === pipelineManager.audioManager.pipeline.length - 1) {
                requestAnimationFrame(() => {
                    window.scrollTo({
                        top: document.body.scrollHeight,
                        behavior: 'smooth'
                    });
                });
            }
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

        // Touch events
        let isDragging = false;
        let clone = null;
        let touchOffsetX = 0;
        let touchOffsetY = 0;

        item.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            this.dragMessage.style.display = 'block';

            // Calculate touch offset from item's top-left corner
            const rect = item.getBoundingClientRect();
            touchOffsetX = touch.clientX - rect.left;
            touchOffsetY = touch.clientY - rect.top;

            // Start dragging immediately
            isDragging = true;
            item.classList.add('dragging');

            // Create visual clone for dragging
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

        item.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];

            if (isDragging && clone) {
                clone.style.left = (touch.clientX - touchOffsetX) + 'px';
                clone.style.top = (touch.clientY - touchOffsetY) + 'px';
                
                // Throttle dragover events
                this.throttle(() => {
                    this.updateInsertionIndicator(touch.clientY);
                }, this.dragOverThrottleDelay);
            }
        });

        item.addEventListener('touchend', (e) => {
            this.dragMessage.style.display = 'none';
            
            if (isDragging) {
                e.preventDefault();
                const touch = e.changedTouches[0];
                const pipeline = document.getElementById('pipeline');
                const pipelineRect = pipeline.getBoundingClientRect();
                
                // Check if touch position is within pipeline element
                if (touch.clientX >= pipelineRect.left && 
                    touch.clientX <= pipelineRect.right && 
                    touch.clientY >= pipelineRect.top && 
                    touch.clientY <= pipelineRect.bottom) {
                    
                    // Create and dispatch drop event
                    const dropEvent = new Event('drop', { bubbles: true });
                    dropEvent.clientY = touch.clientY;
                    dropEvent.preventDefault = () => {};
                    dropEvent.dataTransfer = {
                        getData: (type) => type === 'text/plain' ? plugin.name : '',
                        dropEffect: 'move'
                    };
                    
                    pipeline.dispatchEvent(dropEvent);
                    
                    // Check window width and adjust plugin list collapse state after drop
                    setTimeout(() => this.checkWindowWidthAndAdjust(), 100);
                }

                // Cleanup
                if (clone) {
                    clone.remove();
                    clone = null;
                }
                item.classList.remove('dragging');
                this.insertionIndicator.style.display = 'none';
            }
            
            isDragging = false;
        });
    }

    showLoadingSpinner() {
        this.loadingSpinner.style.display = 'block';
        this.progressDisplay.style.display = 'flex';
        this.updateLoadingProgress(0);
    }

    hideLoadingSpinner() {
        this.loadingSpinner.style.display = 'none';
        this.progressDisplay.style.display = 'none';
    }
    
    updateLoadingProgress(percent) {
        if (percent < 0) percent = 0;
        if (percent > 100) percent = 100;
        
        const formattedPercent = Math.round(percent);
        this.progressDisplay.textContent = `${formattedPercent}%`;
    }

    getDragMessage() {
        return this.dragMessage;
    }

    getInsertionIndicator() {
        return this.insertionIndicator;
    }
}
