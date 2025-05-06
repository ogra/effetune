/**
 * OfflineProcessor - Handles offline audio processing
 */
export class OfflineProcessor {
    /**
     * Create a new OfflineProcessor instance
     * @param {Object} contextManager - Reference to the AudioContextManager
     * @param {Object} audioEncoder - Reference to the AudioEncoder
     */
    constructor(contextManager, audioEncoder) {
        this.contextManager = contextManager;
        this.audioEncoder = audioEncoder;
        this.offlineContext = null;
        this.offlineWorkletNode = null;
        this.isOfflineProcessing = false;
        this.isCancelled = false;
    }
    
    /**
     * Process an audio file offline
     * @param {File} file - The audio file to process
     * @param {Array} pipeline - Array of plugin instances
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise<Blob>} - Processed audio as a WAV blob
     */
    async processAudioFile(file, pipeline, progressCallback = null) {
        this.isOfflineProcessing = true;
        this.isCancelled = false;
        try {
            // Read file as ArrayBuffer and decode audio data
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.contextManager.audioContext.decodeAudioData(arrayBuffer);

            // Check if there are any enabled plugins
            const hasEnabledPlugins = pipeline.some(plugin => 
                plugin.constructor.name !== 'SectionPlugin' && plugin.enabled
            );
            
            if (!hasEnabledPlugins) {
                return this.audioEncoder.encodeWAV(audioBuffer);
            }

            const { numberOfChannels, length: totalSamples, sampleRate } = audioBuffer;
            
            // Create offline context for final rendering
            this.offlineContext = this.contextManager.createOfflineContext(
                numberOfChannels,
                totalSamples,
                sampleRate
            );
            
            // Define the actual output channel count - may be higher than the file's channel count
            let outputChannelCount = numberOfChannels;
            if (window.electronAPI && window.electronIntegration && window.electronIntegration.audioPreferences) {
                const preferences = window.electronIntegration.audioPreferences;
                if (preferences && preferences.outputChannels) {
                    outputChannelCount = Math.max(numberOfChannels, preferences.outputChannels);
                }
            }
            
            // Store reference to pipeline for processing
            this.pipeline = pipeline;

            const BLOCK_SIZE = 128;
            // Create buffer for processed audio
            const processedBuffer = this.offlineContext.createBuffer(numberOfChannels, totalSamples, sampleRate);

            // Map to hold plugin-specific processing contexts
            const pluginContexts = new Map();
            const createContext = (pluginId) => {
                if (!pluginContexts.has(pluginId)) {
                    pluginContexts.set(pluginId, {
                        sampleRate,
                        currentTime: 0,
                        initialized: false
                    });
                }
                return pluginContexts.get(pluginId);
            };

            let lastProgressUpdate = 0;
            const PROGRESS_UPDATE_INTERVAL = 16; // ~60fps

            // Process audio in blocks
            for (let offset = 0; offset < totalSamples; offset += BLOCK_SIZE) {
                const blockSize = Math.min(BLOCK_SIZE, totalSamples - offset);
                const inputBlock = new Float32Array(blockSize * numberOfChannels);

                // Interleave channel data into a single block
                for (let ch = 0; ch < numberOfChannels; ch++) {
                    const channelData = audioBuffer.getChannelData(ch);
                    const channelOffset = ch * blockSize;
                    for (let i = 0; i < blockSize; i++) {
                        inputBlock[channelOffset + i] = channelData[offset + i];
                    }
                }

                // Initialize bus buffers
                const busBuffers = new Map();
                
                // Track active sections state during processing
                let activeSectionEnabled = true;
                let insideSection = false;
                
                // First, determine which buses are used
                const usedBuses = new Set([0]); // Main bus (index 0) is always used
                for (const plugin of pipeline) {
                    // Track section plugin state
                    if (plugin.constructor.name === 'SectionPlugin') {
                        insideSection = true;
                        activeSectionEnabled = plugin.enabled;
                        continue; // Section plugins don't process audio
                    }
                    
                    // Skip disabled plugins or plugins disabled by section
                    if (!plugin.enabled || (insideSection && !activeSectionEnabled)) {
                        continue;
                    }
                    
                    const inputBus = plugin.getParameters().inputBus || plugin.inputBus || 0;
                    const outputBus = plugin.getParameters().outputBus || plugin.outputBus || 0;
                    const channel = plugin.getParameters().channel || plugin.channel || null;

                    usedBuses.add(inputBus);
                    usedBuses.add(outputBus);
                    usedBuses.add(channel);
                }
                
                // Initialize Main bus (index 0) with input data
                // Create a proper copy of the buffer to ensure Main bus is isolated
                const mainBusBuffer = new Float32Array(blockSize * numberOfChannels);
                mainBusBuffer.set(inputBlock);
                busBuffers.set(0, mainBusBuffer);
                
                // Initialize other used buses with silence
                for (const busIndex of usedBuses) {
                    if (busIndex !== 0) { // Skip Main bus as it's already initialized
                        busBuffers.set(busIndex, new Float32Array(blockSize * numberOfChannels));
                        busBuffers.get(busIndex).fill(0);
                    }
                }
                
                // Reset section tracking variables for processing
                activeSectionEnabled = true;
                insideSection = false;
                
                // Process block through each plugin
                for (const plugin of pipeline) {
                    // Track section plugin state
                    if (plugin.constructor.name === 'SectionPlugin') {
                        insideSection = true;
                        activeSectionEnabled = plugin.enabled;
                        continue; // Section plugins don't process audio
                    }
                    
                    // Skip disabled plugins or plugins disabled by section
                    if (!plugin.enabled || (insideSection && !activeSectionEnabled)) {
                        continue;
                    }

                    const parameters = {
                        ...plugin.getParameters(),
                        channelCount: numberOfChannels,
                        blockSize,
                        sampleRate,
                        initialized: pluginContexts.has(plugin.id)
                    };
                    
                    // Determine input and output buses
                    const inputBus = parameters.inputBus || plugin.inputBus || 0; // Default to Main bus (index 0)
                    const outputBus = parameters.outputBus || plugin.outputBus || 0; // Default to Main bus (index 0)
                    const channel = parameters.channel || plugin.channel || null;

                    // Get the input buffer for this plugin
                    const inputBuffer = busBuffers.get(inputBus);
                    // All used buses should already be initialized

                    // Check for channel-specific processing
                    const targetChannel = plugin.channel; // "L", "R", or undefined
                    let channelIndex = -1;
                    if (targetChannel === 'L') channelIndex = 0;
                    else if (targetChannel === 'R') channelIndex = 1;

                    try {
                        const pluginContext = createContext(plugin.id);
                        pluginContext.currentTime = offset / sampleRate;

                        if (!(inputBuffer instanceof Float32Array)) {
                            // This should not happen if initialization is correct, but adding a safeguard.
                            console.warn('Offline Processor: Input buffer was not Float32Array, converting.');
                            inputBuffer = new Float32Array(inputBuffer);
                        }

                        // Handle channel specific processing
                        let processingBuffer;
                        let result;

                        if (channelIndex !== -1 && numberOfChannels > channelIndex) {
                            // Channel specific processing
                            const singleChannelInput = new Float32Array(blockSize);
                            // Extract target channel from interleaved inputBuffer
                            for (let i = 0; i < blockSize; i++) {
                                singleChannelInput[i] = inputBuffer[channelIndex * blockSize + i];
                            }

                            // Create a copy for the processor function if input/output buses differ
                            processingBuffer = (inputBus !== outputBus) ? new Float32Array(singleChannelInput) : singleChannelInput;
                            const singleChannelParams = { ...parameters, channelCount: 1 }; // Set channelCount to 1

                            // Call the processor with single channel data
                            const singleChannelResult = plugin.executeProcessor(
                                pluginContext,
                                processingBuffer, // single channel buffer
                                singleChannelParams,
                                pluginContext.currentTime
                            );

                            // Prepare the final result buffer (potentially multi-channel)
                            result = new Float32Array(inputBuffer.length); // Create a full buffer
                            result.set(inputBuffer); // Copy original input (pass-through)

                            // Write the processed channel back to the interleaved result buffer
                            if (singleChannelResult && singleChannelResult.length === blockSize) {
                                for (let i = 0; i < blockSize; i++) {
                                    result[channelIndex * blockSize + i] = singleChannelResult[i];
                                }
                            } else {
                                console.warn(`Offline Plugin ${plugin.id} (${plugin.constructor.name}) returned invalid result for channel ${targetChannel}`);
                                // Keep original channel data if processing failed
                            }

                        } else {
                            // Process all channels (existing logic)
                            processingBuffer = (inputBus !== outputBus) ? new Float32Array(inputBuffer) : inputBuffer;
                            result = plugin.executeProcessor(
                                pluginContext,
                                processingBuffer, // multi-channel interleaved buffer
                                parameters, // original parameters with correct channelCount
                                pluginContext.currentTime
                            );
                        }

                        if (!result || !(result instanceof Float32Array) || result.length !== blockSize * numberOfChannels) {
                            // Use original parameters.channelCount here as result.length is based on it
                            throw new Error(`Invalid plugin output for plugin ${plugin.id}. Expected length ${blockSize * parameters.channelCount}, got ${result ? result.length : 'null'}`);
                        }

                        // --- Apply result to outputBuffer ---
                        // Get the output buffer - all used buses should already be initialized
                        let outputBuffer = busBuffers.get(outputBus);
                        if (!outputBuffer) {
                            // Initialize buffer for this bus if it doesn't exist
                            outputBuffer = new Float32Array(blockSize * numberOfChannels);
                            busBuffers.set(outputBus, outputBuffer);
                        }

                        // If input and output buses are the same, or this is a new output bus,
                        // overwrite the output buffer with the result
                        if (inputBus === outputBus || outputBuffer.every(sample => sample === 0)) { // Check if buffer is empty/new before deciding to overwrite
                            outputBuffer.set(result);
                        } else {
                            // Otherwise, add the result to the existing output buffer
                            for (let i = 0; i < outputBuffer.length; i++) {
                                outputBuffer[i] += result[i];
                            }
                        }
                    } catch (error) {
                        console.error('Plugin processing error:', error);
                        // On error, if this plugin was using Main bus as output,
                        // pass through the original input to Main bus
                        if (outputBus === 0) {
                            busBuffers.set(0, new Float32Array(inputBlock));
                        }
                    }
                }

                // De-interleave processed data from Main bus back into the processed buffer
                const finalBlock = busBuffers.get(0) || inputBlock;
                for (let ch = 0; ch < numberOfChannels; ch++) {
                    const channelData = processedBuffer.getChannelData(ch);
                    const channelOffset = ch * blockSize;
                    for (let i = 0; i < blockSize; i++) {
                        channelData[offset + i] = finalBlock[channelOffset + i];
                    }
                }

                // Throttle progress updates (~60fps)
                const currentTime = performance.now();
                if (progressCallback && currentTime - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
                    const progress = Math.round(((offset + blockSize) / totalSamples) * 100);
                    await new Promise(resolve =>
                        requestAnimationFrame(() => {
                            progressCallback(progress);
                            resolve();
                        })
                    );
                    lastProgressUpdate = currentTime;
                }

                // Check for cancellation
                if (this.isCancelled) return null;

                // Yield to UI updates between blocks
                if (offset % (BLOCK_SIZE * 8) === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            // Create source node for final offline rendering
            const sourceNode = this.offlineContext.createBufferSource();
            sourceNode.buffer = processedBuffer;
            sourceNode.connect(this.offlineContext.destination);

            try {
                sourceNode.start();
                const renderedBuffer = await this.offlineContext.startRendering();
                if (!renderedBuffer || renderedBuffer.length === 0) {
                    throw new Error('Rendering produced empty buffer');
                }
                if (progressCallback) {
                    await new Promise(resolve =>
                        requestAnimationFrame(() => {
                            progressCallback(100);
                            resolve();
                        })
                    );
                }
                return this.audioEncoder.encodeWAV(renderedBuffer);
            } catch (error) {
                throw new Error(`Processing failed: ${error.message}`);
            } finally {
                // Clean up offline nodes and context
                sourceNode.disconnect();
                if (this.offlineWorkletNode) {
                    this.offlineWorkletNode.disconnect();
                    this.offlineWorkletNode = null;
                }
                this.offlineContext = null;
            }
        } catch (error) {
            throw new Error(`File processing error: ${error.message}`);
        } finally {
            this.isOfflineProcessing = false;
        }
    }
    
    /**
     * Cancel the current offline processing
     */
    cancelProcessing() {
        this.isCancelled = true;
    }
    
    /**
     * Check if offline processing is in progress
     * @returns {boolean} - Whether offline processing is in progress
     */
    isProcessing() {
        return this.isOfflineProcessing;
    }

    /**
     * Get plugins that are effectively active considering Section plugin states
     * @param {Array} pipeline - The plugin pipeline
     * @returns {Array} Array of plugins that should be processed
     */
    getSectionAwareActivePlugins(pipeline) {
        let activeSectionEnabled = true;
        let insideSection = false;
        const result = [];

        for (const plugin of pipeline) {
            // If this is a section plugin, update section state
            if (plugin.constructor.name === 'SectionPlugin') {
                insideSection = true;
                activeSectionEnabled = plugin.enabled;
            }

            // Calculate effective enabled state
            const effectiveEnabled = plugin.enabled && 
                (!insideSection || (insideSection && activeSectionEnabled));

            // Only add effectively enabled plugins to the result
            if (effectiveEnabled) {
                result.push(plugin);
            }
        }

        return result;
    }
}