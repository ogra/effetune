// IMPORTANT: Do not add individual plugin implementations directly in this file.
// This file contains the core audio processing infrastructure.
// Plugin implementations should be created in their own files under the plugins directory.
// See docs/plugin-development.md for plugin development guidelines.

class PluginProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.plugins = [];
        this.fadeStates = new Map();
        this.FADE_DURATION = 0.005; // 5ms fade
        this.currentFrame = 0;
        this.pluginProcessors = new Map();
        this.pluginContexts = new Map(); // Holds context for each plugin
        
        // Message control additions
        this.lastMessageTime = 0;
        this.messageQueue = new Map(); // Queue for each plugin
        this.MESSAGE_INTERVAL = 16; // Minimum message interval (ms)

        // Message handler for plugin updates and processor registration
        this.port.onmessage = (event) => {
            if (event.data.type === 'updatePlugins') {
                this.updatePlugins(event.data.plugins);
            } else if (event.data.type === 'registerProcessor') {
                this.registerPluginProcessor(event.data.pluginType, event.data.processor);
            }
        };
    }

    registerPluginProcessor(pluginType, processorFunction) {
        this.pluginProcessors.set(pluginType, processorFunction);
    }

    updatePlugins(pluginConfigs) {
        this.plugins = pluginConfigs;
        // Initialize fade states for new plugins
        this.plugins.forEach(plugin => {
            // Initialize fade states
            if (!this.fadeStates.has(plugin.type)) {
                this.fadeStates.set(plugin.type, {
                    prevValue: null,
                    targetValue: null,
                    startTime: 0
                });
            }
        });
    }

    getFadeValue(pluginType, currentValue, time) {
        const fadeState = this.fadeStates.get(pluginType);
        
        // Initialize fade if needed
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

        if (!input || !output) return true;

        const time = this.currentFrame / sampleRate;
        this.currentFrame += 128; // Standard WebAudio block size

        // Create temporary buffers for each channel and copy input
        const tempBuffers = Array.from(input).map(channel => {
            const buffer = new Float32Array(128);
            buffer.set(channel);
            return buffer;
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
                    getChannelData: (channelIndex) => {
                        return channelIndex < tempBuffers.length ? tempBuffers[channelIndex] : null;
                    },
                    getFadeValue: (type, value, time) => {
                        const fadeState = this.fadeStates.get(type);
                        if (fadeState.prevValue === null) {
                            fadeState.prevValue = value;
                            fadeState.targetValue = value;
                        } else if (fadeState.targetValue !== value) {
                            fadeState.prevValue = fadeState.targetValue;
                            fadeState.targetValue = value;
                            fadeState.startTime = time;
                        }
                        const fadeProgress = Math.min(1, (time - fadeState.startTime) / 0.005);
                        return fadeState.prevValue + (fadeState.targetValue - fadeState.prevValue) * fadeProgress;
                    }
                };

                // Save context after plugin processing
                this.pluginContexts.set(plugin.id, context);

                const params = { 
                    ...plugin.parameters,
                    id: plugin.id,
                    channelCount: tempBuffers.length,
                    blockSize: 128,
                    sampleRate: sampleRate
                };
                
                // Create a combined buffer containing all channels
                const combinedBuffer = new Float32Array(params.blockSize * params.channelCount);
                tempBuffers.forEach((buffer, i) => {
                    combinedBuffer.set(buffer, i * params.blockSize);
                });

                const result = new Function('context', 'data', 'parameters', 'time', 
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
                            ${processor}
                        } catch (error) {
                            console.error('Error in processor function:', error);
                            return data;
                        }
                    }`
                ).call(null, context, combinedBuffer, params, time);

                // Update individual channel buffers from the result
                if (result && result.length === combinedBuffer.length) {
                    for (let channel = 0; channel < tempBuffers.length; channel++) {
                        tempBuffers[channel].set(result.subarray(channel * 128, (channel + 1) * 128));
                    }
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
            if (i < tempBuffers.length) {
                channel.set(tempBuffers[i]);
            }
        });

        return true;
    }
}

registerProcessor('plugin-processor', PluginProcessor);
