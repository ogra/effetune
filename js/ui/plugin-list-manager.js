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
        
        // Category collapsed state
        this.collapsedCategories = {};
        this.loadCollapsedState();
        
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
        this.animationFrameId = null; 
        this.handleTransitionEnd = null; // Ensure it's initialized
    }
    
    // Load collapsed category state from localStorage
    loadCollapsedState() {
        try {
            const savedState = localStorage.getItem('collapsedCategories');
            if (savedState) {
                this.collapsedCategories = JSON.parse(savedState);
            }
        } catch (e) {
            console.error('Error loading collapsed categories state:', e);
            this.collapsedCategories = {};
        }
    }
    
    // Save collapsed category state to localStorage
    saveCollapsedState() {
        try {
            localStorage.setItem('collapsedCategories', JSON.stringify(this.collapsedCategories));
        } catch (e) {
            console.error('Error saving collapsed categories state:', e);
        }
    }
    
    // Toggle category collapse
    toggleCategoryCollapse(category) {
        this.collapsedCategories[category] = !this.collapsedCategories[category];
        this.saveCollapsedState();
        this.updateCategoryVisibility(category);
    }
    
    // Update the visibility of a category's plugins
    updateCategoryVisibility(category) {
        const categoryRow = this.pluginList.querySelector(`.category-row[data-category="${category}"]`);
        if (!categoryRow) return;
        
        const rightColumn = categoryRow.querySelector('.right-column-content');
        if (!rightColumn) return;
        
        const pluginItems = rightColumn.querySelector('.plugin-category-items');
        const categoryHeader = categoryRow.querySelector('h3');
        const indicator = categoryHeader.querySelector('.collapse-indicator');
        const effectsCount = rightColumn.querySelector('.category-effects-count');
        
        if (this.collapsedCategories[category]) {
            pluginItems.style.display = 'none';
            indicator.textContent = '>';
            if (effectsCount) {
                effectsCount.style.display = 'block';
            }
        } else {
            pluginItems.style.display = 'flex';
            indicator.textContent = '⌵';
            if (effectsCount) {
                effectsCount.style.display = 'none';
            }
        }
    }
    
    // Update all categories visibility
    updateAllCategoriesVisibility() {
        for (const category in this.collapsedCategories) {
            this.updateCategoryVisibility(category);
        }
    }
    
    // Toggle the collapsed state of the plugin list
    togglePluginListCollapse() {
        this.isCollapsed = !this.isCollapsed;
        
        const pipeline = document.getElementById('pipeline');
        if (!this.pluginList || !this.pullTab || !this.mainContainer || !pipeline) return;

        // --- Cleanup previous state --- 
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        if (this.handleTransitionEnd) {
            this.pluginList.removeEventListener('transitionend', this.handleTransitionEnd);
        }

        // --- Define transitionend handler --- 
        this.handleTransitionEnd = (event) => {
            // Check if the transition that ended was for the transform property
            if (event.propertyName === 'transform' && event.target === this.pluginList) {
                // Stop the rAF loop
                if (this.animationFrameId) {
                    cancelAnimationFrame(this.animationFrameId);
                    this.animationFrameId = null;
                }
                // Set the final static positions explicitly
                this.updatePositions(); 
                // Clean up the listener itself
                this.pluginList.removeEventListener('transitionend', this.handleTransitionEnd);
                this.handleTransitionEnd = null; // Reset handler reference
            }
        };
        
        // Add the listener before triggering the transition
        this.pluginList.addEventListener('transitionend', this.handleTransitionEnd);

        // --- Trigger CSS transition and JS animation --- 
        if (this.isCollapsed) {
            // Add classes to trigger pluginList transform
            this.pluginList.classList.add('collapsed');
            this.pullTab.classList.add('collapsed');
            this.mainContainer.classList.add('plugin-list-collapsed');
            this.pullTab.textContent = '▶'; 
            // Start JS animation loop to make followers track the list
            this.animateFollowers(); 
        } else {
            // Remove classes to trigger pluginList transform
            this.pluginList.classList.remove('collapsed');
            this.pullTab.classList.remove('collapsed');
            this.mainContainer.classList.remove('plugin-list-collapsed');
            this.pullTab.textContent = '◀'; 
            // Start JS animation loop
            this.animateFollowers();
        }
    }

    // Renamed and refined animation loop
    animateFollowers() {
        const pipeline = document.getElementById('pipeline');
        if (!pipeline || !this.pluginList || !this.pullTab) return; 

        // Get initial values needed for progress calculation
        const pluginListWidth = this.pluginList.offsetWidth;
        // Calculate the fully expanded left position (typically body padding)
        // We use offsetLeft relative to its parent, assuming parent starts after body padding
        const expandedListLeftCssPixel = parseFloat(window.getComputedStyle(document.body).paddingLeft) || 20;
        const collapsedListLeftCssPixel = expandedListLeftCssPixel - pluginListWidth;
        
        const step = () => {
            // Get current position of the list
            const pluginListRect = this.pluginList.getBoundingClientRect();
            const currentListLeftViewport = pluginListRect.left;
            const currentListRightViewport = pluginListRect.right;
            const currentListWidthViewport = pluginListRect.width;

            // Calculate zoom ratio to correct coordinates
            let zoomRatio = 1;
            if (pluginListWidth > 0 && currentListWidthViewport > 0) {
                zoomRatio = currentListWidthViewport / pluginListWidth;
            }
            // Calculate corrected positions in CSS pixels
            const currentListLeftCssPixel = currentListLeftViewport / zoomRatio;
            const targetPullTabLeftCssPixel = currentListRightViewport / zoomRatio;
            
            // Calculate pipeline margin based on transition progress (using CSS pixel values)
            let progress = 0;
            // Avoid division by zero if width is somehow 0
            if (pluginListWidth > 0) { 
                 // Clamp progress between 0 and 1
                 progress = Math.max(0, Math.min(1, 
                    (currentListLeftCssPixel - expandedListLeftCssPixel) / (collapsedListLeftCssPixel - expandedListLeftCssPixel)
                 ));
            }
            // Interpolate marginLeft from 0 to -pluginListWidth
            const targetPipelineMarginLeft = progress * (-pluginListWidth);
            
            // Apply styles directly (no CSS transition)
            this.pullTab.style.left = `${Math.round(targetPullTabLeftCssPixel)}px`;
            pipeline.style.marginLeft = `${Math.round(targetPipelineMarginLeft)}px`; 
            pipeline.style.transform = 'none'; // Ensure no competing transform
            
            // Schedule next frame if animation should continue
            if (this.handleTransitionEnd) { 
                 this.animationFrameId = requestAnimationFrame(step);
            } else {
                 this.animationFrameId = null;
            }
        };
        
        // Cancel any previous frame and start the new animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.animationFrameId = requestAnimationFrame(step);
    }

    /**
     * Update positions for static states (init, resize) 
     * Also sets the final state after animations via transitionend handler.
     */
    updatePositions() {
        if (!this.pluginList || !this.pullTab) return; 
        
        // Stop animation if running (e.g., resize during animation)
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        // Remove listener if it exists (e.g., resize interrupted transition)
         if (this.handleTransitionEnd) {
            this.pluginList.removeEventListener('transitionend', this.handleTransitionEnd);
            this.handleTransitionEnd = null;
        }

        // Calculate necessary values for static state
        const pluginListWidth = this.pluginList.offsetWidth; 
        const pluginListRect = this.pluginList.getBoundingClientRect();
        // Calculate zoom ratio to correct coordinates obtained from getBoundingClientRect
        let zoomRatio = 1;
        if (pluginListWidth > 0 && pluginListRect.width > 0) {
            zoomRatio = pluginListRect.width / pluginListWidth;
        }
        // Correct the right position based on the zoom ratio
        const correctedRightPosition = pluginListRect.right / zoomRatio;

        // Set CSS variable (might be useful elsewhere, keep it)
        document.documentElement.style.setProperty('--plugin-list-total-width', `${pluginListWidth}px`);

        // Get the pipeline element
        const pipeline = document.getElementById('pipeline');
        if (!pipeline) return; 

        // Apply static positions based on the current state
        if (!this.isCollapsed) {
             this.pullTab.style.left = `${Math.round(correctedRightPosition)}px`;
             pipeline.style.marginLeft = '0';
        } else {
             this.pullTab.style.left = '0px';
             pipeline.style.marginLeft = `-${pluginListWidth}px`; 
        }
        pipeline.style.transform = 'none'; 
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
    
    // Check and adjust the collapse state based on pipeline position relative to window edge
    checkWindowWidthAndAdjust() {
        // Only proceed if the app is fully initialized
        if (!window.app || !window.app.initialized) {
            return;
        }

        const pipeline = document.getElementById('pipeline');
        if (!pipeline) return;

        const windowWidth = window.innerWidth;
        const pipelineRect = pipeline.getBoundingClientRect();
        const pipelineRightEdge = pipelineRect.right;
        const threshold = windowWidth - 20; // 20px margin from the right edge

        // If plugin list is expanded and pipeline is too close to the edge, collapse it
        if (!this.isCollapsed && pipelineRightEdge > threshold) {
            this.togglePluginListCollapse();
        }
        // If plugin list is collapsed and pipeline has enough space *after* expanding, expand it
        else if (this.isCollapsed) {
             // Estimate the pipeline's right edge position *if* the plugin list were expanded
             const pluginListWidth = this.pluginList.offsetWidth;
             // Note: When collapsed, pipeline's margin-left is negative pluginListWidth.
             // Expanding it shifts it right by pluginListWidth.
             // So the estimated right edge is roughly current right + pluginListWidth.
             const estimatedPipelineRightEdge = pipelineRightEdge + pluginListWidth + 20;

             // Expand only if the *estimated* right edge fits within the threshold
             if (estimatedPipelineRightEdge <= threshold) {
                 this.togglePluginListCollapse();
             }
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
    
    /**
     * Finds the potential insertion target (column and item indices) based on coordinates using elementFromPoint.
     * @param {number} clientX - Raw viewport X coordinate.
     * @param {number} clientY - Raw viewport Y coordinate.
     * @returns {{columnIndex: number|null, itemIndex: number|null}} 
     *          The index of the target column, and the index within that column (null if no valid target).
     */
    findPotentialInsertionTarget(clientX, clientY) {
        // Use elementFromPoint to find the element directly under the cursor
        const hoveredElement = document.elementFromPoint(clientX, clientY);
        if (!hoveredElement) {
            return { columnIndex: null, itemIndex: null };
        }

        // Find the pipeline list and potential parent column/item
        const targetColumn = hoveredElement.closest('.pipeline-column');
        const targetItemElement = hoveredElement.closest('.pipeline-item');
        const pipelineList = document.getElementById('pipelineList'); // Need the container
        
        if (!targetColumn || !pipelineList) {
            // If not hovering over a column, check if hovering over the pipeline list itself
            if (pipelineList && pipelineList.contains(hoveredElement)) {
                // Hovering over the empty list background or between columns
                // Try to determine the nearest column based on X coordinate
                const columns = Array.from(pipelineList.querySelectorAll('.pipeline-column'));
                if (columns.length === 0) {
                    // No columns exist yet (empty pipeline), target the conceptual first column
                    return { columnIndex: 0, itemIndex: 0 };
                }
                // Find the column whose horizontal range contains clientX
                let bestColumnIndex = 0; // Default to first column
                for (let i = 0; i < columns.length; i++) {
                    const colRect = columns[i].getBoundingClientRect();
                    if (clientX >= colRect.left && clientX <= colRect.right) {
                        bestColumnIndex = i;
                        break;
                    }
                    // If beyond the last column's right edge, target the last column
                    if (i === columns.length - 1 && clientX > colRect.right) {
                         bestColumnIndex = i;
                    }
                }
                // Determine item index within the chosen column (likely the end if hovering in gap)
                const chosenColumn = columns[bestColumnIndex];
                const itemsInChosenColumn = Array.from(chosenColumn.children);
                let itemIndexInChosen = itemsInChosenColumn.length; // Default to end
                for (let i = 0; i < itemsInChosenColumn.length; i++) {
                     const itemRect = itemsInChosenColumn[i].getBoundingClientRect();
                     const midpointY = itemRect.top + itemRect.height / 2;
                     if (clientY < midpointY) {
                         itemIndexInChosen = i;
                         break;
                     }
                 }
                 return { columnIndex: bestColumnIndex, itemIndex: itemIndexInChosen };
            }
            // Otherwise, not a valid target within the pipeline
            return { columnIndex: null, itemIndex: null };
        }

        const columns = Array.from(pipelineList.querySelectorAll('.pipeline-column'));
        const columnIndex = columns.indexOf(targetColumn);
        // If somehow the column exists but is not in the list query, treat as invalid
        // Example: Drag starts, UI updates, then drag event fires with stale targetColumn reference.
        if (columnIndex === -1) {
             // console.warn("Target column found but not in current list query results.");
             return { columnIndex: null, itemIndex: null };
        }

        const items = Array.from(targetColumn.children);
        let itemIndex = null;

        if (targetItemElement && targetColumn.contains(targetItemElement)) {
            // Hovering directly over an item or its child
            const itemRect = targetItemElement.getBoundingClientRect();
            const midpointY = itemRect.top + itemRect.height / 2;
            
            // Determine if cursor is above or below the midpoint
            if (clientY < midpointY) {
                itemIndex = items.indexOf(targetItemElement); // Insert before this item
            } else {
                itemIndex = items.indexOf(targetItemElement) + 1; // Insert after this item
            }
        } else {
            // Hovering over the column itself or the gap between items
            // Iterate through items to find where clientY falls relative to item midpoints
            itemIndex = items.length; // Default to end of column
            for (let i = 0; i < items.length; i++) {
                const itemRect = items[i].getBoundingClientRect();
                // If the column is empty, midpoint calculation might be off,
                // but the loop won't run anyway. If there are items, proceed.
                let midpointY = itemRect.top + itemRect.height / 2;
                // Handle potential zero-height items if necessary
                if (itemRect.height === 0) {
                    midpointY = itemRect.top;
                }
                if (clientY < midpointY) {
                    itemIndex = i;
                    break;
                }
            }
        }

        return { columnIndex, itemIndex };
    }

    // Update insertion indicator using the calculated target and corrected coordinates for rendering
    updateInsertionIndicator(clientX, clientY) {
        // Find the logical target using the elementFromPoint method (uses raw coordinates)
        const targetInfo = this.findPotentialInsertionTarget(clientX, clientY);
        const targetColumnIndex = targetInfo.columnIndex;
        const targetItemIndex = targetInfo.itemIndex;

        const indicator = this.getInsertionIndicator();
        const columns = document.querySelectorAll('.pipeline-column');
        const pipelineListElement = document.getElementById('pipelineList'); // Needed for scroll context and offsetTop
        const pipelineContainer = document.getElementById('pipeline'); // Indicator's expected offsetParent

        if (targetColumnIndex === null || !indicator || !pipelineListElement || !pipelineContainer) {
            if (indicator) indicator.style.display = 'none';
            return;
        }

        const listOffsetTopInPipeline = pipelineListElement.offsetTop;
        const listOffsetLeftInPipeline = pipelineListElement.offsetLeft; // Moved declaration here

        // Handle empty pipeline case (no columns rendered)
        if (columns.length === 0 && targetColumnIndex === 0) {
            // Get list padding (CSS Pixels)
            const listStyle = window.getComputedStyle(pipelineListElement);
            const listPaddingTop = parseFloat(listStyle.paddingTop) || 0;
            const listPaddingLeft = parseFloat(listStyle.paddingLeft) || 0;

            // Top: Position relative to pipeline = list's offsetTop + list's paddingTop
            const finalIndicatorTop = listOffsetTopInPipeline + listPaddingTop; 

            // Left: Position relative to pipeline = list's offsetLeft + list's paddingLeft
            const indicatorLeft = listOffsetLeftInPipeline + listPaddingLeft;

            // Width: Approximate using list's clientWidth
            const indicatorWidth = pipelineListElement.clientWidth;

            indicator.style.top = `${Math.round(finalIndicatorTop)}px`;
            indicator.style.left = `${Math.round(indicatorLeft)}px`;
            indicator.style.width = `${Math.round(indicatorWidth)}px`;
            indicator.style.display = 'block';
            indicator.style.opacity = '1';
            return;
        }

        // --- Normal case: Calculate indicator position --- 
        const targetColumn = columns[targetColumnIndex];
        // Guard if target column somehow doesn't exist at the retrieved index (Style unified)
        if (!targetColumn) {
            if (indicator) indicator.style.display = 'none';
            return;
        }
        const items = Array.from(targetColumn.children);
        const listScrollTop = pipelineListElement.scrollTop; 

        // Calculate base top position relative to list content top (includes scroll)
        let baseTopRelativeToListContent = 0;
        let finalIndicatorTop; // Declare finalIndicatorTop here

        if (targetItemIndex !== null && targetItemIndex < items.length && items[targetItemIndex]) {
            const targetItemElement = items[targetItemIndex];
            baseTopRelativeToListContent = targetItemElement.offsetTop + targetColumn.offsetTop + listScrollTop;
            // Keep the original calculation for this case, assuming it's correct
            finalIndicatorTop = baseTopRelativeToListContent - listOffsetTopInPipeline; 
        } else {
            if (items.length > 0) {
                 const lastItemElement = items[items.length - 1];
                 baseTopRelativeToListContent = lastItemElement.offsetTop + lastItemElement.offsetHeight + targetColumn.offsetTop + listScrollTop;
                 // Keep the original calculation for this case, assuming it's correct
                 finalIndicatorTop = baseTopRelativeToListContent - listOffsetTopInPipeline; 
            } else { 
                 // Empty column: Calculate position directly relative to pipelineList top + padding
                 const listStyle = window.getComputedStyle(pipelineListElement);
                 const listPaddingTop = parseFloat(listStyle.paddingTop) || 0;
                 // Set finalIndicatorTop directly to the desired value relative to #pipeline
                 finalIndicatorTop = listOffsetTopInPipeline + listPaddingTop;
                 // baseTopRelativeToListContent is not used for this specific override
            }
        }
        
        // Calculate left position: Assume targetColumn.offsetLeft is relative to pipelineList's offset parent (#pipeline)
        const indicatorLeft = targetColumn.offsetLeft;
        const indicatorWidth = targetColumn.offsetWidth;

        // Set styles
        indicator.style.top = `${Math.round(finalIndicatorTop)}px`;
        indicator.style.left = `${Math.round(indicatorLeft)}px`;
        indicator.style.width = `${Math.round(indicatorWidth)}px`;
        indicator.style.display = 'block';
        indicator.style.opacity = '1';
    }

    /**
     * Find insertion index based on the logical target found by findPotentialInsertionTarget.
     * @param {number} clientX - Raw viewport X coordinate.
     * @param {number} clientY - Raw viewport Y coordinate.
     * @param {Array} pipeline - The current pipeline array.
     * @returns {number} The insertion index.
     */
    findInsertionIndex(clientX, clientY, pipeline) {
        // Calculate the logical target using the raw coordinates.
        const targetInfo = this.findPotentialInsertionTarget(clientX, clientY);
        const columnIndex = targetInfo.columnIndex;
        const positionInColumn = targetInfo.itemIndex;

        // If target is invalid, append to the end.
        if (columnIndex === null || positionInColumn === null) {
            return pipeline.length;
        }

        // Get the number of columns.
        const columns = document.querySelectorAll('.pipeline-column');
        const columnCount = columns.length;
        const totalPlugins = pipeline.length;
        
        // Guard against division by zero if there are no columns.
        if (columnCount === 0) {
            return totalPlugins; // If pipeline is empty, this will be 0
        }

        // Calculate plugins per column based on the current pipeline length.
        // This logic assumes column-first filling.
        const pluginsPerColumn = Math.ceil(totalPlugins / columnCount);

        // Calculate the actual insertion index in the pipeline array.
        // Ensure index doesn't exceed the total number of plugins.
        // Calculate the base index based on column-first filling.
        let calculatedIndex = columnIndex * pluginsPerColumn + positionInColumn;

        // Adjust index if dropping into a column that isn't the last *full* column
        // Example: 3 columns, 7 plugins (3, 3, 1). Dropping at col 0, pos 1 = index 1.
        // Dropping at col 1, pos 0 = index 3. Dropping at col 2, pos 0 = index 6.
        // The formula columnIndex * pluginsPerColumn + positionInColumn works correctly for column-first filling.
        
        const finalIndex = Math.min(calculatedIndex, totalPlugins);
        return finalIndex;
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

        const categoryRows = contentContainer.querySelectorAll('.category-row');
        let totalVisibleEffects = 0;
        
        // For each category row
        categoryRows.forEach(categoryRow => {
            const categoryTitle = categoryRow.querySelector('h3');
            const rightColumn = categoryRow.querySelector('.right-column-content');
            if (!rightColumn) return;
            
            const categoryItems = rightColumn.querySelector('.plugin-category-items');
            const effectsCount = rightColumn.querySelector('.category-effects-count');
            const category = categoryRow.dataset.category;
            
            if (!categoryTitle || !categoryItems) return;

            let hasVisibleItems = false;
            const items = categoryItems.querySelectorAll('.plugin-item');
            
            // Check each plugin in this category
            items.forEach(item => {
                // Get plugin name (direct text content, excluding description)
                const pluginName = item.childNodes[0].textContent.trim();
                
                // Check if matches search criteria
                const matchesSearch = searchText === '' || 
                    categoryTitle.textContent.toLowerCase().includes(searchText.toLowerCase()) ||
                    pluginName.toLowerCase().includes(searchText.toLowerCase());
                
                // Show/hide this plugin
                item.style.display = matchesSearch ? '' : 'none';
                if (matchesSearch) {
                    hasVisibleItems = true;
                    totalVisibleEffects++;
                }
            });

            // Show/hide the entire category row based on matches
            categoryRow.style.display = hasVisibleItems ? '' : 'none';
            
            // When searching, always show the items if there are matches
            if (searchText && hasVisibleItems) {
                categoryItems.style.display = 'flex';
                if (effectsCount) effectsCount.style.display = 'none';
                // Update indicator to "expanded" state but don't change the actual state in storage
                const indicator = categoryTitle.querySelector('.collapse-indicator');
                if (indicator) indicator.textContent = '⌵';
            } else if (!searchText) {
                // When not searching, restore the previous collapsed state
                this.updateCategoryVisibility(category);
            } else {
                // Hide items when searching but no matches found
                categoryItems.style.display = 'none';
                if (effectsCount) effectsCount.style.display = 'none';
            }
        });

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
            // Initialize collapsed state if not already set
            if (this.collapsedCategories[category] === undefined) {
                this.collapsedCategories[category] = false; // Default to expanded
            }

            // Create explicit row for the category
            const categoryRow = document.createElement('div');
            categoryRow.className = 'category-row';
            categoryRow.dataset.category = category;

            // Create category title with collapse indicator
            const categoryTitle = document.createElement('h3');
            
            // Create collapse indicator
            const collapseIndicator = document.createElement('span');
            collapseIndicator.className = 'collapse-indicator';
            collapseIndicator.textContent = this.collapsedCategories[category] ? '>' : '⌵';
            collapseIndicator.style.marginRight = '6px';
            collapseIndicator.style.display = 'inline-block';
            collapseIndicator.style.width = '12px';
            
            // Add indicator and text to title
            categoryTitle.appendChild(collapseIndicator);
            categoryTitle.appendChild(document.createTextNode(category));
            
            // Add click event to toggle category
            categoryTitle.addEventListener('click', () => {
                this.toggleCategoryCollapse(category);
            });

            // Create container for plugin items
            const pluginItemsContainer = document.createElement('div');
            pluginItemsContainer.className = 'plugin-category-items';
            
            // Create effect count display for collapsed state
            const effectsCountDisplay = document.createElement('div');
            effectsCountDisplay.className = 'category-effects-count';
            effectsCountDisplay.textContent = `${plugins.length} effects`;
            
            // Add title and items containers to the row (in the correct order)
            categoryRow.appendChild(categoryTitle);
            
            // Create a container for the right column content
            const rightColumnContent = document.createElement('div');
            rightColumnContent.className = 'right-column-content';
            
            // Add both the plugin items and effects count to the right column
            rightColumnContent.appendChild(effectsCountDisplay);
            rightColumnContent.appendChild(pluginItemsContainer);
            categoryRow.appendChild(rightColumnContent);
            
            // Set initial visibility based on collapsed state
            if (this.collapsedCategories[category]) {
                pluginItemsContainer.style.display = 'none';
                effectsCountDisplay.style.display = 'block';
            } else {
                pluginItemsContainer.style.display = 'flex';
                effectsCountDisplay.style.display = 'none';
            }

            // Add plugins for this category
            plugins.forEach(name => {
                if (this.pluginManager.pluginClasses[name]) {
                    const plugin = new this.pluginManager.pluginClasses[name]();
                    const item = this.createPluginItem(plugin);
                    pluginItemsContainer.appendChild(item);
                }
            });
            
            // Add row to container
            contentContainer.appendChild(categoryRow);
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
            item.classList.remove('dragging');
            
            // --- Clear pending timeouts/rAF and hide indicator immediately --- 
            if (this.rafId) { // Cancel any pending frame for indicator update
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }
            // Assuming UIEventHandler holds the timeout ID, access might be tricky.
            // If flicker persists specifically from PluginList drag, 
            // PluginListManager might need its own timeout management for dragleave.
            // For now, just hide directly.
            this.insertionIndicator.style.display = 'none'; 
        });

        // Touch events
        let isDragging = false; // Flag for touch dragging state
        let clone = null; // Reference to the cloned element during drag
        let touchOffsetX = 0;
        let touchOffsetY = 0;
        const sourceIndex = this.pipelineManager?.audioManager?.pipeline.indexOf(plugin) ?? -1;

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
            clone.style.backgroundColor = '#ffffff'; // Ensure this contrasts well
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
                    this.updateInsertionIndicator(touch.clientX, touch.clientY);
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
                    dropEvent.clientX = touch.clientX;
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
