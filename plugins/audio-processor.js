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
        this.masterBypass = false;
        
        // Message control
        this.lastMessageTime = 0;
        this.messageQueue = new Map();
        this.MESSAGE_INTERVAL = 16;

        // Buffer management
        this.blockSize = 128;
        this.combinedBuffer = null;
        this.lastChannelCount = 0;
        
        // Bus management
        this.busBuffers = new Map(); // Map to store buffers for each bus
        this.MAX_BUSES = 4; // Maximum number of buses
        
        // Offline processing flag
        this.isOfflineProcessing = false;
        
        // Audio level monitoring for sleep mode
        this.audioLevelMonitoring = {
            lastInputActiveTime: 0,       // Last time input signal was detected
            lastOutputActiveTime: 0,       // Last time output signal was detected
            lastUserActivityTime: 0,      // Will be updated from main thread
            isSleepMode: false,
            SILENCE_THRESHOLD: -84,       // -84dB threshold for silence
            SILENCE_DURATION: 60          // 60 seconds of silence before sleep
        };
        
        // Message handler for plugin updates and processor registration
        this.port.onmessage = (event) => {
            const data = event.data;
            switch(data.type) {
                case 'updatePlugin':
                    this.updatePlugin(data.plugin);
                    break;
                case 'updatePlugins':
                    this.isOfflineProcessing = data.isOfflineProcessing || false;
                    this.masterBypass = data.masterBypass || false;
                    this.updatePlugins(data.plugins);
                    break;
                case 'registerProcessor':
                    this.registerPluginProcessor(data.pluginType, data.processor);
                    break;
                case 'userActivity':
                    // Update user activity timestamp
                    const time = this.currentFrame / sampleRate;
                    this.audioLevelMonitoring.lastUserActivityTime = time;
                    
                    // If we were in sleep mode, exit it
                    if (this.audioLevelMonitoring.isSleepMode) {
                        this.audioLevelMonitoring.isSleepMode = false;
                        this.port.postMessage({
                            type: 'sleepModeChanged',
                            isSleepMode: false
                        });
                    }
                    break;
            }
        };
    }

    registerPluginProcessor(pluginType, processorFunction) {
        // Compile processor function with provided context
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
        const index = this.plugins.findIndex(p => p.id === pluginConfig.id);
        if (index !== -1) {
            // Update the plugin
            this.plugins[index] = pluginConfig;
            
            // Make sure inputBus and outputBus are directly accessible
            // Check if they're in the parameters object
            if (pluginConfig.parameters && pluginConfig.parameters.inputBus !== undefined) {
                this.plugins[index].inputBus = pluginConfig.parameters.inputBus;
            } else if (pluginConfig.inputBus !== undefined) {
                this.plugins[index].inputBus = pluginConfig.inputBus;
            }
            
            if (pluginConfig.parameters && pluginConfig.parameters.outputBus !== undefined) {
                this.plugins[index].outputBus = pluginConfig.parameters.outputBus;
            } else if (pluginConfig.outputBus !== undefined) {
                this.plugins[index].outputBus = pluginConfig.outputBus;
            }
        }
    }

    updatePlugins(pluginConfigs) {
        this.plugins = pluginConfigs;
        for (const plugin of this.plugins) {
            if (!this.fadeStates.has(plugin.id)) {
                this.fadeStates.set(plugin.id, {
                    prevValue: null,
                    targetValue: null,
                    startTime: 0
                });
            }
        }
    }

    getFadeValue(pluginId, currentValue, time) {
        let fadeState = this.fadeStates.get(pluginId);
        if (!fadeState) {
            fadeState = {
                prevValue: currentValue,
                targetValue: currentValue,
                startTime: time
            };
            this.fadeStates.set(pluginId, fadeState);
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
        const fadeProgress = Math.min(1, (time - fadeState.startTime) / this.FADE_DURATION);
        return fadeState.prevValue + (fadeState.targetValue - fadeState.prevValue) * fadeProgress;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        if (!input || !output) return true;

        // Calculate current time in seconds
        const time = this.currentFrame / sampleRate;
        
        // Monitor audio input level
        if (input[0] && input[0].length > 0) {
            // Check for any sample above the threshold across all channels
            let hasInputSignal = false;
            const threshold = Math.pow(10, this.audioLevelMonitoring.SILENCE_THRESHOLD / 20); // Convert -84dB to amplitude
            
            // Check each channel for any sample above threshold
            for (let channel = 0; channel < input.length && !hasInputSignal; channel++) {
                for (let i = 0; i < input[channel].length && !hasInputSignal; i++) {
                    // Check absolute value against threshold
                    if (Math.abs(input[channel][i]) > threshold) {
                        hasInputSignal = true;
                        break;
                    }
                }
            }
            
            // Update input activity time if signal is detected
            if (hasInputSignal) {
                this.audioLevelMonitoring.lastInputActiveTime = time;
                
                // If we were in sleep mode, exit it and notify UI
                if (this.audioLevelMonitoring.isSleepMode) {
                    this.audioLevelMonitoring.isSleepMode = false;
                    this.port.postMessage({
                        type: 'sleepModeChanged',
                        isSleepMode: false
                    });
                }
            }
        }

        // Check if we should enter sleep mode - all three conditions must be met:
        // 1. Input silence duration > SILENCE_DURATION
        // 2. Output silence duration > SILENCE_DURATION
        // 3. User inactivity duration > SILENCE_DURATION
        if (!this.audioLevelMonitoring.isSleepMode) {
            const inputSilenceDuration = time - this.audioLevelMonitoring.lastInputActiveTime;
            const outputSilenceDuration = time - this.audioLevelMonitoring.lastOutputActiveTime;
            const userInactivityDuration = time - this.audioLevelMonitoring.lastUserActivityTime;
            
            // Initialize lastUserActivityTime if it's still 0 (not set yet)
            if (this.audioLevelMonitoring.lastUserActivityTime === 0) {
                this.audioLevelMonitoring.lastUserActivityTime = time;
            }
            
            if (inputSilenceDuration > this.audioLevelMonitoring.SILENCE_DURATION &&
                outputSilenceDuration > this.audioLevelMonitoring.SILENCE_DURATION &&
                userInactivityDuration > this.audioLevelMonitoring.SILENCE_DURATION) {
                this.audioLevelMonitoring.isSleepMode = true;
                this.port.postMessage({
                    type: 'sleepModeChanged',
                    isSleepMode: true
                });
            }
        }
        
        // Master bypass or Sleep mode: copy input directly to output
        if (this.masterBypass || this.audioLevelMonitoring.isSleepMode) {
            for (let channel = 0; channel < input.length; channel++) {
                output[channel].set(input[channel]);
            }
            return true;
        }

        if (!input[0]) {
            // console.warn('Audio processor: Input channel data is missing');
            return true;
        }

        // Update block size from input buffer length
        this.blockSize = input[0].length;
        this.currentFrame += this.blockSize;

        const channelCount = input.length;
        const requiredSize = this.blockSize * channelCount;
        if (!this.combinedBuffer || this.lastChannelCount !== channelCount || this.combinedBuffer.length !== requiredSize) {
            this.combinedBuffer = new Float32Array(requiredSize);
            this.lastChannelCount = channelCount;
        }
        
        // Initialize bus buffers
        this.busBuffers.clear();
        
        // First, determine which buses are used
        const usedBuses = new Set([1]); // Bus 1 is always used
        for (const plugin of this.plugins) {
            if (!plugin.enabled) continue;
            
            const inputBus = plugin.parameters.inputBus || plugin.inputBus || 1;
            const outputBus = plugin.parameters.outputBus || plugin.outputBus || 1;
            
            usedBuses.add(inputBus);
            usedBuses.add(outputBus);
        }
        
        // Copy input data to combined buffer
        for (let i = 0; i < channelCount; i++) {
            this.combinedBuffer.set(input[i], i * this.blockSize);
        }
        
        // Use combinedBuffer directly for bus 1 to avoid unnecessary copy
        const bus1Buffer = new Float32Array(this.combinedBuffer);
        this.busBuffers.set(1, bus1Buffer);
        
        // Initialize other used buses with silence
        for (const busIndex of usedBuses) {
            if (busIndex !== 1) { // Skip bus 1 as it's already initialized
                this.busBuffers.set(busIndex, new Float32Array(requiredSize));
                this.busBuffers.get(busIndex).fill(0);
            }
        }
        
        // Process through all plugins in order
        for (const plugin of this.plugins) {
            if (!plugin.enabled) continue;
            
            const processor = this.pluginProcessors.get(plugin.type);
            if (!processor) continue;
            
            // Get or initialize plugin context
            if (!this.pluginContexts.has(plugin.id)) {
                this.pluginContexts.set(plugin.id, {});
            }
            const pluginContext = this.pluginContexts.get(plugin.id);
            const context = {
                ...pluginContext,
                fadeStates: this.fadeStates,
                port: this.port,
                getFadeValue: (pluginId, value, time) => this.getFadeValue(pluginId, value, time)
            };
            this.pluginContexts.set(plugin.id, context);

            // Determine input and output buses
            const inputBus = plugin.parameters.inputBus || plugin.inputBus || 1; // Default to bus 1
            const outputBus = plugin.parameters.outputBus || plugin.outputBus || 1; // Default to bus 1
            
            // Determine input and output buses for processing
            
            // Get the input buffer for this plugin
            const inputBuffer = this.busBuffers.get(inputBus);
            // All used buses should already be initialized
            
            // Process the plugin with its input buffer
            const params = {
                ...plugin.parameters,
                id: plugin.id,
                channelCount: channelCount,
                blockSize: this.blockSize,
                sampleRate: sampleRate
            };
            
            // If input and output buses are different, make a copy of the input buffer
            // to prevent in-place modifications from affecting the input buffer
            let processingBuffer = inputBuffer;
            if (inputBus !== outputBus) {
                processingBuffer = new Float32Array(inputBuffer.length);
                processingBuffer.set(inputBuffer);
            }
            
            const result = processor.call(null, context, processingBuffer, params, time);
            if (!result || result.length !== inputBuffer.length) {
                continue; // Skip if result is invalid
            }
            
            // Get the output buffer - all used buses should already be initialized
            const outputBuffer = this.busBuffers.get(outputBus);
            
            // If input and output buses are the same,
            // overwrite the output buffer with the result
            if (inputBus === outputBus) {
                outputBuffer.set(result);
            } else {
                // Otherwise, add the result to the existing output buffer
                for (let i = 0; i < outputBuffer.length; i++) {
                    outputBuffer[i] += result[i];
                }
            }
            
            // Message sending control
            const currentTime = (this.currentFrame / sampleRate) * 1000; // ms
            if (result.measurements) {
                if (currentTime - this.lastMessageTime >= this.MESSAGE_INTERVAL) {
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
                    this.messageQueue.set(plugin.id, {
                        buffer: result,
                        measurements: result.measurements
                    });
                }
            }
        }

        // Copy the default bus (bus 1) to the output
        const defaultBus = this.busBuffers.get(1);
        if (defaultBus) {
            for (let i = 0; i < channelCount; i++) {
                output[i].set(defaultBus.subarray(i * this.blockSize, (i + 1) * this.blockSize));
            }
        }
        
        // Monitor output level
        let hasOutputSignal = false;
        const threshold = Math.pow(10, this.audioLevelMonitoring.SILENCE_THRESHOLD / 20);
        
        // Check each output channel for any sample above threshold
        for (let channel = 0; channel < output.length && !hasOutputSignal; channel++) {
            for (let i = 0; i < output[channel].length && !hasOutputSignal; i++) {
                // Check absolute value against threshold
                if (Math.abs(output[channel][i]) > threshold) {
                    hasOutputSignal = true;
                    break;
                }
            }
        }
        
        // Update output activity time if signal is detected
        if (hasOutputSignal) {
            this.audioLevelMonitoring.lastOutputActiveTime = time;
        }
        
        return true;
    }
}

registerProcessor('plugin-processor', PluginProcessor);

