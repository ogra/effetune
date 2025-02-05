// IMPORTANT: Do not add individual plugin implementations directly in this file.
// This file contains the base plugin class that all plugins should extend.
// Plugin implementations should be created in their own files under the plugins directory.
// See docs/plugin-development.md for plugin development guidelines.

class PluginBase {
    constructor(name, description) {
        this.name = name;
        this.description = description;
        this.enabled = true;
        this.id = null; // Will be set by createPlugin
        this.errorState = null; // Holds error state
        this._setupMessageHandler = this._setupMessageHandler.bind(this);
        
        // Message control additions
        this.lastUpdateTime = 0;
        this.UPDATE_INTERVAL = 16; // Minimum update interval (ms)
        this.pendingUpdate = null;
        
        // Try to setup message handler immediately if workletNode exists
        if (window.workletNode) {
            this._setupMessageHandler();
        }
        
        // Also setup a MutationObserver to watch for workletNode
        const observer = new MutationObserver((mutations) => {
            if (window.workletNode && !this._hasMessageHandler) {
                this._setupMessageHandler();
                observer.disconnect();
            }
        });
        
        observer.observe(document, {
            attributes: true,
            childList: true,
            subtree: true
        });
    }

    _setupMessageHandler() {
        if (!this._hasMessageHandler && window.workletNode) {
            window.workletNode.port.addEventListener('message', (event) => {
                if (event.data.pluginId === this.id) {
                    const currentTime = performance.now();
                    if (currentTime - this.lastUpdateTime >= this.UPDATE_INTERVAL) {
                        // Immediate update if enough time has passed
                        this.onMessage(event.data);
                        this.lastUpdateTime = currentTime;
                        this.pendingUpdate = null;
                    } else {
                        // Queue update (overwrite existing if any)
                        this.pendingUpdate = event.data;
                        
                        // Execute queued update at next timing
                        const timeUntilNextUpdate = this.UPDATE_INTERVAL - (currentTime - this.lastUpdateTime);
                        setTimeout(() => {
                            if (this.pendingUpdate) {
                                this.onMessage(this.pendingUpdate);
                                this.lastUpdateTime = performance.now();
                                this.pendingUpdate = null;
                            }
                        }, timeUntilNextUpdate);
                    }
                }
            });
            this._hasMessageHandler = true;
        }
    }

    // Default message handler - can be overridden by subclasses
    onMessage(message) {
        // Default implementation does nothing
    }

    // Default process function - can be overridden by subclasses
    process(context, data, parameters, time) {
        // Default implementation returns input unchanged
        return data;
    }

    // Register processor function with the audio worklet
    registerProcessor(processorFunction) {
        if (window.workletNode) {
            window.workletNode.port.postMessage({
                type: 'registerProcessor',
                pluginType: this.constructor.name,
                processor: processorFunction.toString(),
                process: this.process.toString()
            });
        }
    }

    // Update plugin parameters
    updateParameters() {
        if (window.workletNode && window.pipeline) {
            window.workletNode.port.postMessage({
                type: 'updatePlugins',
                plugins: window.pipeline.map(plugin => {
                    const params = plugin.getParameters();
                    return {
                        id: plugin.id,
                        type: plugin.constructor.name,
                        enabled: plugin.enabled,
                        parameters: params
                    };
                })
            });
            
            // Update URL when parameters change
            if (window.uiManager) {
                window.uiManager.updateURL();
            }
        }
    }

    // Get current parameters - should be overridden by subclasses
    getParameters() {
        return {
            type: this.constructor.name,
            id: this.id,
            enabled: this.enabled
        };
    }

    // Get serializable parameters for URL state with deep copy support
    getSerializableParameters() {
        const params = this.getParameters();
        
        // Deep copy function to handle nested objects and arrays
        const deepCopy = (obj) => {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }

            if (Array.isArray(obj)) {
                return obj.map(item => deepCopy(item));
            }

            const copy = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    copy[key] = deepCopy(obj[key]);
                }
            }
            return copy;
        };

        // Create a deep copy of all parameters
        const serializedParams = deepCopy(params);

        // Remove internal properties that shouldn't be serialized
        const { type, id, ...cleanParams } = serializedParams;

        return cleanParams;
    }

    // Set parameters from serialized state
    setSerializedParameters(params) {
        const { nm, en, id, ...pluginParams } = params;
        
        // Create parameters object with common and plugin-specific parameters
        const parameters = {
            type: this.constructor.name,
            enabled: en,
            ...(id !== undefined && { id }),
            ...pluginParams
        };
        
        this.setParameters(parameters);
    }

    // Set parameters - must be implemented by subclasses
    setParameters(params) {
        try {
            this._validateParameters(params);
            this._setValidatedParameters(params);
        } catch (error) {
            this._handleError('Parameter Error', error.message);
            // Keep current values if parameters are invalid
            return;
        }
    }

    // Parameter validation - can be overridden by subclasses
    _validateParameters(params) {
        if (params === null || typeof params !== 'object') {
            throw new Error('Parameters must be an object');
        }
    }

    // Set validated parameters - must be implemented by subclasses
    _setValidatedParameters(params) {
        throw new Error('_setValidatedParameters must be implemented by subclass');
    }

    // Error handling
    _handleError(type, message) {
        this.errorState = {
            type: type,
            message: message,
            timestamp: Date.now()
        };

        // Update error UI display
        this._updateErrorUI();

        // Error logging
        console.error(`[${this.name}] ${type}: ${message}`);
    }

    // Update error UI display
    _updateErrorUI() {
        const container = document.getElementById(`plugin-${this.id}`);
        if (!container) return;

        // Remove existing error display
        const existingError = container.querySelector('.plugin-error');
        if (existingError) {
            existingError.remove();
        }

        // Display if there is an error
        if (this.errorState) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'plugin-error';
            errorDiv.innerHTML = `
                <div class="error-header">${this.errorState.type}</div>
                <div class="error-message">${this.errorState.message}</div>
                <div class="error-timestamp">${new Date(this.errorState.timestamp).toLocaleTimeString()}</div>
            `;
            
            // Automatically remove error display after 5 seconds
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                    this.errorState = null;
                }
            }, 5000);

            container.appendChild(errorDiv);
        }
    }

    // Create UI elements - should be overridden by subclasses
    createUI() {
        return document.createElement('div');
    }

    // Cleanup resources - should be overridden by subclasses
    cleanup() {
        // Default implementation does nothing
    }

    // Enable/disable plugin
    setEnabled(enabled) {
        if (this.enabled !== enabled) {
            this.enabled = enabled;
            this.updateParameters();
        }
    }
}
