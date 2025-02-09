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

        // Store processor function string and compiled function
        this.processorString = null;
        this.compiledFunction = null;
        
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

    // Register processor function with the audio worklet and store for offline processing
    registerProcessor(processorFunction) {
        // Store processor string for offline processing
        this.processorString = processorFunction.toString();

        // Create compiled function with enhanced error handling
        try {
            this.compiledFunction = new Function('context', 'data', 'parameters', 'time',
                `with (context) {
                    try {
                        // Validate input parameters
                        if (!parameters || !parameters.channelCount || !parameters.blockSize) {
                            throw new Error('Invalid parameters');
                        }
                        if (parameters.channelCount < 1) {
                            throw new Error('Invalid channel count');
                        }
                        if (!data || !data.length) {
                            throw new Error('Invalid input data');
                        }
                        if (data.length !== parameters.channelCount * parameters.blockSize) {
                            throw new Error('Buffer size mismatch');
                        }

                        // Execute processor function
                        const result = (function() {
                            ${this.processorString}
                        })();

                        // Validate result
                        if (!result) {
                            throw new Error('Processor returned no result');
                        }
                        if (!(result instanceof Float32Array)) {
                            throw new Error('Processor must return Float32Array');
                        }
                        if (result.length !== data.length) {
                            throw new Error('Result length mismatch');
                        }

                        return result;
                    } catch (error) {
                        console.error('Processor error:', {
                            type: '${this.constructor.name}',
                            error: error.message,
                            parameters: parameters
                        });
                        return data;
                    }
                }`
            );
        } catch (error) {
            console.error('Failed to compile processor:', {
                type: this.constructor.name,
                error: error.message
            });
            this.compiledFunction = null;
        }

        // Register with audio worklet if available
        if (window.workletNode) {
            window.workletNode.port.postMessage({
                type: 'registerProcessor',
                pluginType: this.constructor.name,
                processor: this.processorString,
                process: this.process.toString()
            });
        }
    }

    // Execute processor function for offline processing
    executeProcessor(context, data, parameters, time) {
        if (!this.compiledFunction) {
            console.warn('No compiled function available for plugin:', this.name);
            return data;
        }

        try {
            return this.compiledFunction.call(null, context, data, parameters, time);
        } catch (error) {
            console.error('Failed to execute processor:', {
                type: this.constructor.name,
                error: error.message
            });
            return data;
        }
    }

    // Update plugin parameters
    updateParameters() {
        if (window.workletNode) {
            // Send only the parameters of the current plugin
            window.workletNode.port.postMessage({
                type: 'updatePlugin',
                plugin: {
                    id: this.id,
                    type: this.constructor.name,
                    enabled: this.enabled,
                    parameters: this.getParameters()
                }
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
