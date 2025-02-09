// IMPORTANT: Do not add individual plugin implementations directly in this file.
// This file contains the core audio processing infrastructure.
// Plugin implementations should be created in their own files under the plugins directory.
// See docs/plugin-development.md for plugin development guidelines.

class PluginProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.plugins = [];
        this.fadeStates = new Map();
        this.FADE_DURATION = 0.010; // 10ms fade for smoother transitions
        this.currentFrame = 0;
        this.pluginProcessors = new Map();
        this.pluginContexts = new Map();
        
        // Message control
        this.lastMessageTime = 0;
        this.messageQueue = new Map();
        this.MESSAGE_INTERVAL = 16;

        // Buffer management
        this.blockSize = 128;
        this.combinedBuffer = null;
        this.lastChannelCount = 0;
        
        // Offline processing flag
        this.isOfflineProcessing = false;
        
        // Message handler for plugin updates and processor registration
        this.port.onmessage = (event) => {
            if (event.data.type === 'updatePlugin') {
                this.updatePlugin(event.data.plugin);
            } else if (event.data.type === 'updatePlugins') {
                this.isOfflineProcessing = event.data.isOfflineProcessing || false;
                this.updatePlugins(event.data.plugins);
            } else if (event.data.type === 'registerProcessor') {
                this.registerPluginProcessor(event.data.pluginType, event.data.processor);
            }
        };
    }

    registerPluginProcessor(pluginType, processorFunction) {
        const compiledFunction = new Function('context', 'data', 'parameters', 'time',
            `with (context) {
                try {
                    if (parameters.channelCount < 1) {
                        console.error('Invalid channel count');
                        return data;
                    }
                    if (data.length !== parameters.channelCount * parameters.blockSize) {
                        console.error('Buffer size mismatch');
                        return data;
                    }
                    ${processorFunction}
                } catch (error) {
                    console.error('Error in processor function:', error);
                    return data;
                }
            }`
        );
        this.pluginProcessors.set(pluginType, compiledFunction);
    }

    updatePlugin(pluginConfig) {
        // Find existing plugin
        const index = this.plugins.findIndex(p => p.id === pluginConfig.id);
        if (index !== -1) {
            // Directly update all parameters without interpolation
            this.plugins[index] = pluginConfig;
        }
    }

    updatePlugins(pluginConfigs) {
        this.plugins = pluginConfigs;
        // Initialize fade states for new plugins
        this.plugins.forEach(plugin => {
            // Initialize fade states
            if (!this.fadeStates.has(plugin.id)) {
                this.fadeStates.set(plugin.id, {
                    prevValue: null,
                    targetValue: null,
                    startTime: 0
                });
            }
        });
    }

    getFadeValue(pluginId, currentValue, time) {
        const fadeState = this.fadeStates.get(pluginId);
        
        // Initialize fade if needed
        if (!fadeState) {
            this.fadeStates.set(pluginId, {
                prevValue: currentValue,
                targetValue: currentValue,
                startTime: time
            });
            return currentValue;
        }
        
        if (fadeState.prevValue === null) {
            fadeState.prevValue = currentValue;
            fadeState.targetValue = currentValue;
        } else if (fadeState.targetValue !== currentValue) {
            fadeState.prevValue = fadeState.targetValue;
            fadeState.targetValue = currentValue;
            fadeState.startTime = time;
        }

        // Calculate current value with fade
        const fadeProgress = Math.min(1, (time - fadeState.startTime) / this.FADE_DURATION);
        return fadeState.prevValue + (fadeState.targetValue - fadeState.prevValue) * fadeProgress;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];

        if (!input) {
            console.warn('Audio processor: Input is missing');
            return true;
        }
        if (!output) {
            console.warn('Audio processor: Output is missing');
            return true;
        }
        if (!input[0]) {
            console.warn('Audio processor: Input channel data is missing');
            return true;
        }

        // Update block size based on input buffer
        this.blockSize = input[0].length;
        
        const time = this.currentFrame / sampleRate;
        this.currentFrame += this.blockSize;

        // Get channel count and check if buffer needs to be reallocated
        const channelCount = input.length;
        const requiredSize = this.blockSize * channelCount;
        
        if (!this.combinedBuffer || this.lastChannelCount !== channelCount || this.combinedBuffer.length !== requiredSize) {
            // Reallocate buffer only when needed
            this.combinedBuffer = new Float32Array(requiredSize);
            this.lastChannelCount = channelCount;
        }
        
        // Copy input data to combined buffer
        input.forEach((channel, i) => {
            this.combinedBuffer.set(channel, i * this.blockSize);
        });

        // Process through all plugins in order
        for (const plugin of this.plugins) {
            if (this.pluginProcessors.has(plugin.type)) {
                const processor = this.pluginProcessors.get(plugin.type);
                // Get or initialize plugin context
                if (!this.pluginContexts.has(plugin.id)) {
                    this.pluginContexts.set(plugin.id, {});
                }
                const pluginContext = this.pluginContexts.get(plugin.id);
                
                const context = {
                    ...pluginContext, // Spread existing context
                    fadeStates: this.fadeStates,
                    port: this.port,
                    getFadeValue: (pluginId, value, time) => {
                        return this.getFadeValue(pluginId, value, time);
                    }
                };

                // Save context after plugin processing
                this.pluginContexts.set(plugin.id, context);

                // Find plugin index for parameter updates
                const pluginIndex = this.plugins.findIndex(p => p.id === plugin.id);
                
                // Use current parameters directly without interpolation
                const params = {
                    ...plugin.parameters,
                    id: plugin.id,
                    channelCount: channelCount,
                    blockSize: this.blockSize,
                    sampleRate: sampleRate
                };

                // Process audio with interpolated parameters
                const result = processor.call(null, context, this.combinedBuffer, params, time);

                // Update combined buffer with the result if valid
                if (result && result.length === this.combinedBuffer.length) {
                    this.combinedBuffer.set(result);
                }

                // Message sending control
                const currentTime = this.currentFrame / sampleRate * 1000; // Time in ms
                if (result?.measurements) {
                    if (currentTime - this.lastMessageTime >= this.MESSAGE_INTERVAL) {
                        // Send queued messages
                        for (const [pluginId, data] of this.messageQueue) {
                            this.port.postMessage({
                                type: 'processBuffer',
                                pluginId: pluginId,
                                ...data
                            });
                        }
                        this.messageQueue.clear();
                        this.port.postMessage({
                            type: 'processBuffer',
                            pluginId: plugin.id,
                            buffer: result,
                            measurements: result.measurements
                        });
                        this.lastMessageTime = currentTime;
                    } else {
                        // Add message to queue
                        this.messageQueue.set(plugin.id, {
                            buffer: result,
                            measurements: result.measurements
                        });
                    }
                }
            }
        }

        // Copy final result to output
        output.forEach((channel, i) => {
            if (i < channelCount) {
                channel.set(this.combinedBuffer.subarray(i * this.blockSize, (i + 1) * this.blockSize));
            }
        });

        return true;
    }
}

registerProcessor('plugin-processor', PluginProcessor);
