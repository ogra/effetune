export class PluginListManager {
    constructor(pluginManager) {
        this.pluginManager = pluginManager;
        this.pluginList = document.getElementById('pluginList');
        
        // Create loading spinner
        this.loadingSpinner = document.createElement('div');
        this.loadingSpinner.className = 'loading-spinner';
        this.pluginList.appendChild(this.loadingSpinner);

        // Create drag message element
        this.dragMessage = document.createElement('div');
        this.dragMessage.className = 'drag-message';
        this.dragMessage.textContent = 'Drag this effect to add it at your desired position in the Effect Pipeline';
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

    initPluginList() {
        let totalEffects = 0;
        const effectCountDiv = document.createElement('div');
        effectCountDiv.id = 'effectCount';
        effectCountDiv.style.textAlign = 'center';
        effectCountDiv.style.marginTop = '10px';
        effectCountDiv.style.color = '#666';
        effectCountDiv.style.fontSize = '12px';

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
        effectCountDiv.textContent = `${totalEffects} effects available`;
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
                    const pipeline = document.getElementById('pipeline');
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
    }

    hideLoadingSpinner() {
        this.loadingSpinner.style.display = 'none';
    }

    getDragMessage() {
        return this.dragMessage;
    }

    getInsertionIndicator() {
        return this.insertionIndicator;
    }
}
