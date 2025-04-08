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
        this.inputBus = null; // Input bus (null = default Main bus, index 0)
        this.outputBus = null; // Output bus (null = default Main bus, index 0)

        // Message control properties
        this.lastUpdateTime = 0;
        this.UPDATE_INTERVAL = 16; // Minimum update interval in ms
        this.pendingUpdate = null;
        this._pendingTimeoutId = null; // Stores the timeout ID for queued updates

        // Processor storage
        this.processorString = null;
        this.compiledFunction = null;

        // Flag to track message handler registration
        this._hasMessageHandler = false;

        // Bind _handleMessage only once for performance
        this._boundHandleMessage = this._handleMessage.bind(this);

        // If workletNode exists, set up the message handler immediately
        if (window.workletNode) {
            this._setupMessageHandler();
        }

        // Observe mutations to detect when workletNode becomes available
        const observer = new MutationObserver(() => {
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
            window.workletNode.port.addEventListener('message', this._boundHandleMessage);
            this._hasMessageHandler = true;
        }
    }
    
    // Clean up resources when plugin is removed
    cleanup() {
        // Remove message event listener to prevent memory leaks
        if (this._hasMessageHandler && window.workletNode) {
            window.workletNode.port.removeEventListener('message', this._boundHandleMessage);
            this._hasMessageHandler = false;
        }
        
        // Clear any pending timeouts
        if (this._pendingTimeoutId !== null) {
            clearTimeout(this._pendingTimeoutId);
            this._pendingTimeoutId = null;
        }
        
        // Clear any other resources
        this.pendingUpdate = null;
    }

    _handleMessage(event) {
        if (event.data.pluginId === this.id) {
            const currentTime = performance.now();
            if (currentTime - this.lastUpdateTime >= this.UPDATE_INTERVAL) {
                // Process immediately if enough time has passed
                this.onMessage(event.data);
                this.lastUpdateTime = currentTime;
                this.pendingUpdate = null;
                if (this._pendingTimeoutId !== null) {
                    clearTimeout(this._pendingTimeoutId);
                    this._pendingTimeoutId = null;
                }
            } else {
                // Queue update by overwriting any existing pending update
                this.pendingUpdate = event.data;
                // Schedule a timeout only if one is not already pending
                if (this._pendingTimeoutId === null) {
                    const timeUntilNextUpdate = this.UPDATE_INTERVAL - (currentTime - this.lastUpdateTime);
                    this._pendingTimeoutId = setTimeout(() => {
                        if (this.pendingUpdate) {
                            this.onMessage(this.pendingUpdate);
                            this.lastUpdateTime = performance.now();
                            this.pendingUpdate = null;
                        }
                        this._pendingTimeoutId = null;
                    }, timeUntilNextUpdate);
                }
            }
        }
    }

    // Default message handler (can be overridden by subclasses)
    onMessage(message) {
        // Default implementation does nothing
    }

    // Default process function (can be overridden by subclasses)
    process(context, data, parameters, time) {
        return data;
    }

    // Compile the processor function using the stored processor string.
    // The 'with' statement is maintained to preserve functionality.
    _compileProcessor(processorStr) {
        try {
            return new Function('context', 'data', 'parameters', 'time', `
                with (context) {
                    const result = (function() {
                        ${processorStr}
                    })();
                    return result;
                }
            `);
        } catch (error) {
            console.error('Failed to compile processor:', {
                type: this.constructor.name,
                error: error.message
            });
            return null;
        }
    }

    // Register the processor function with the audio worklet and store it for offline processing.
    registerProcessor(processorFunction) {
        this.processorString = processorFunction.toString();
        this.compiledFunction = this._compileProcessor(this.processorString);

        if (window.workletNode) {
            window.workletNode.port.postMessage({
                type: 'registerProcessor',
                pluginType: this.constructor.name,
                processor: this.processorString,
                process: this.process.toString()
            });
        }
    }

    // Execute the compiled processor function for offline processing.
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

    // Update plugin parameters via the worklet.
    updateParameters() {
        if (window.workletNode) {
            const parameters = this.getParameters();
            
            window.workletNode.port.postMessage({
                type: 'updatePlugin',
                plugin: {
                    id: this.id,
                    type: this.constructor.name,
                    enabled: this.enabled,
                    parameters: parameters,
                    inputBus: this.inputBus,
                    outputBus: this.outputBus
                }
            });
            if (window.uiManager) {
                window.uiManager.updateURL();
            }
        }
    }

    // Get current parameters; can be overridden by subclasses.
    getParameters() {
        return {
            type: this.constructor.name,
            id: this.id,
            enabled: this.enabled,
            ...(this.inputBus !== null && { inputBus: this.inputBus }),
            ...(this.outputBus !== null && { outputBus: this.outputBus })
        };
    }

    // Return serializable parameters for URL state using a deep copy.
    getSerializableParameters() {
        const params = this.getParameters();
        const serializedParams = JSON.parse(JSON.stringify(params));
        // Remove internal properties that should not be serialized
        const { type, id, inputBus, outputBus, ...cleanParams } = serializedParams;
        
        // Add input and output bus with short names if they exist
        if (inputBus !== undefined) {
            cleanParams.ib = inputBus;
        }
        if (outputBus !== undefined) {
            cleanParams.ob = outputBus;
        }
        
        return cleanParams;
    }

    // Set parameters from a serialized state.
    setSerializedParameters(params) {
        const { nm, en, id, ib, ob, ...pluginParams } = params;
        const parameters = {
            type: this.constructor.name,
            enabled: en,
            ...(id !== undefined && { id }),
            ...(ib !== undefined && { inputBus: ib }),
            ...(ob !== undefined && { outputBus: ob }),
            ...pluginParams
        };
        this.setParameters(parameters);
    }

    // Set parameters (must be implemented by subclasses).
    setParameters(params) {
        try {
            this._validateParameters(params);
            this._setValidatedParameters(params);
        } catch (error) {
            this._handleError('Parameter Error', error.message);
        }
    }

    // Validate parameters (can be overridden by subclasses).
    _validateParameters(params) {
        if (params === null || typeof params !== 'object') {
            throw new Error('Parameters must be an object');
        }
    }

    // Apply validated parameters (must be implemented by subclasses).
    _setValidatedParameters(params) {
        // Set common parameters
        if (params.enabled !== undefined) {
            this.enabled = Boolean(params.enabled);
        }
        
        // Set bus parameters
        if (params.inputBus !== undefined) {
            this.inputBus = params.inputBus;
        }
        if (params.outputBus !== undefined) {
            this.outputBus = params.outputBus;
        }
        
        // Subclasses must override this method to handle their specific parameters
        // but should call super._setValidatedParameters(params) to handle common parameters
    }

    // Handle errors by storing error state and updating the error UI.
    _handleError(type, message) {
        this.errorState = {
            type: type,
            message: message,
            timestamp: Date.now()
        };
        this._updateErrorUI();
        console.error(`[${this.name}] ${type}: ${message}`);
    }

    // Update the error UI display.
    _updateErrorUI() {
        const container = document.getElementById(`plugin-${this.id}`);
        if (!container) return;

        const existingError = container.querySelector('.plugin-error');
        if (existingError) {
            existingError.remove();
        }
        if (this.errorState) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'plugin-error';
            errorDiv.innerHTML = `
                <div class="error-header">${this.errorState.type}</div>
                <div class="error-message">${this.errorState.message}</div>
                <div class="error-timestamp">${new Date(this.errorState.timestamp).toLocaleTimeString()}</div>
            `;
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                    this.errorState = null;
                }
            }, 5000);
            container.appendChild(errorDiv);
        }
    }

    // Create UI elements (should be overridden by subclasses).
    createUI() {
        return document.createElement('div');
    }

    // Cleanup resources (should be overridden by subclasses).
    cleanup() {
        // Default implementation does nothing
    }

    // Enable or disable the plugin.
    setEnabled(enabled) {
        if (this.enabled !== enabled) {
            this.enabled = enabled;
            this.updateParameters();
        }
    }
}
