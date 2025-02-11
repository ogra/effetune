export class AudioManager {
    constructor(pipelineManager) {
        this.audioContext = null;
        this.stream = null;
        this.sourceNode = null;
        this.workletNode = null;
        this.pipeline = [];
        this.masterBypass = false;
        this.offlineContext = null;
        this.offlineWorkletNode = null;
        this.pipelineManager = pipelineManager;
        this.isOfflineProcessing = false;
        this.isCancelled = false;
    }

    async initAudio() {
        try {
            // Create audio context if not exists
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
                window.audioContext = this.audioContext;  // Make audio context globally accessible
            }

            // Load audio worklet with absolute path
            const currentPath = window.location.pathname;
            const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
            await this.audioContext.audioWorklet.addModule(basePath + '/plugins/audio-processor.js');
            
            // Get user media
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            // Create source node
            this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
            
            // Create worklet node and make it globally accessible
            this.workletNode = new AudioWorkletNode(this.audioContext, 'plugin-processor');
            window.workletNode = this.workletNode;

            // Make pipeline globally accessible
            window.pipeline = this.pipeline;

            // Handle messages from worklet if needed in the future
            this.workletNode.port.onmessage = (event) => {
                // Generic message handling can be added here
            };
            
            // Rebuild pipeline
            await this.rebuildPipeline();
            
            // Resume context
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            return '';
        } catch (error) {
            throw new Error(`Audio Error: ${error.message}`);
        }
    }

    async rebuildPipeline() {
        if (!this.audioContext || !this.sourceNode) return;

        // Disconnect all nodes
        this.sourceNode.disconnect();
        if (this.workletNode) {
            this.workletNode.disconnect();
        }

        // If pipeline is empty or master bypass is enabled, connect source directly to destination
        if (this.pipeline.length === 0 || this.masterBypass) {
            this.sourceNode.connect(this.audioContext.destination);
            return;
        }

        // Connect source to worklet
        this.sourceNode.connect(this.workletNode);
        this.workletNode.connect(this.audioContext.destination);

        // Update worklet with current plugins
        this.workletNode.port.postMessage({
            type: 'updatePlugins',
            plugins: this.pipeline.map(plugin => ({
                id: plugin.id,
                type: plugin.constructor.name,
                enabled: plugin.enabled,
                parameters: plugin.getParameters()
            }))
        });
    }

    reset() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
            window.audioContext = null;  // Clear global reference
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.sourceNode = null;
        this.workletNode = null;
        return this.initAudio();
    }

    setPipeline(pipeline) {
        this.pipeline = pipeline;
        return this.rebuildPipeline();
    }

    setMasterBypass(bypass) {
        this.masterBypass = bypass;
        return this.rebuildPipeline();
    }

    // File processing methods
    async processAudioFile(file, progressCallback = null) {
        this.isOfflineProcessing = true;
        this.isCancelled = false;
        try {
            // Read file as ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // Skip processing if no plugins or all disabled
            const activePlugins = this.pipeline.filter(plugin => plugin.enabled);
            if (activePlugins.length === 0) {
                return this.encodeWAV(audioBuffer);
            }

            // Process audio directly without worklet
            // Create offline context for final rendering
            this.offlineContext = new OfflineAudioContext({
                numberOfChannels: audioBuffer.numberOfChannels,
                length: audioBuffer.length,
                sampleRate: audioBuffer.sampleRate
            });

            // Process audio in chunks
            const BLOCK_SIZE = 128;
            const channelCount = audioBuffer.numberOfChannels;
            const totalSamples = audioBuffer.length;
            const processedBuffer = this.offlineContext.createBuffer(
                channelCount,
                totalSamples,
                audioBuffer.sampleRate
            );

            // Create processing context
            const pluginContexts = new Map();
            const createContext = (pluginId) => {
                if (!pluginContexts.has(pluginId)) {
                    pluginContexts.set(pluginId, {
                        sampleRate: audioBuffer.sampleRate,
                        currentTime: 0,
                        initialized: false,
                        fadeStates: new Map(),
                        getFadeValue: (id, currentValue, time) => {
                            const FADE_DURATION = 0.010; // 10ms fade
                            const context = pluginContexts.get(pluginId);
                            const fadeState = context.fadeStates.get(id);
                            
                            if (!fadeState) {
                                context.fadeStates.set(id, {
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

                            const fadeProgress = Math.min(1, (time - fadeState.startTime) / FADE_DURATION);
                            return fadeState.prevValue + (fadeState.targetValue - fadeState.prevValue) * fadeProgress;
                        }
                    });
                }
                return pluginContexts.get(pluginId);
            };

            let lastProgressUpdate = 0;
            const PROGRESS_UPDATE_INTERVAL = 16; // 60fps

            // Process in blocks
            for (let offset = 0; offset < totalSamples; offset += BLOCK_SIZE) {
                const blockSize = Math.min(BLOCK_SIZE, totalSamples - offset);
                const inputBlock = new Float32Array(blockSize * channelCount);

                // Interleave channels: [L0,L1,...,L127,R0,R1,...,R127]
                for (let ch = 0; ch < channelCount; ch++) {
                    const channelData = audioBuffer.getChannelData(ch);
                    const blockOffset = ch * blockSize;
                    for (let i = 0; i < blockSize; i++) {
                        inputBlock[blockOffset + i] = channelData[offset + i];
                    }
                }

                // Process through plugin chain
                let processedBlock = new Float32Array(inputBlock);
                for (const plugin of activePlugins) {
                    if (!plugin.enabled) continue;

                    // Create plugin parameters with correct channel count
                    const parameters = {
                        ...plugin.getParameters(),
                        channelCount: channelCount,
                        blockSize: blockSize,
                        sampleRate: audioBuffer.sampleRate,
                        initialized: pluginContexts.has(plugin.id)
                    };

                    try {
                        // Get or create plugin-specific context
                        const pluginContext = createContext(plugin.id);
                        pluginContext.currentTime = offset / audioBuffer.sampleRate;

                        // Ensure processedBlock is a Float32Array
                        if (!(processedBlock instanceof Float32Array)) {
                            processedBlock = new Float32Array(processedBlock);
                        }
                        
                        // Execute processor with plugin-specific context
                        const result = plugin.executeProcessor(
                            pluginContext,
                            processedBlock,
                            parameters,
                            pluginContext.currentTime
                        );

                        // Validate processor output
                        if (!result) {
                            throw new Error('Plugin returned null or undefined');
                        }
                        if (!(result instanceof Float32Array)) {
                            throw new Error('Plugin must return Float32Array');
                        }
                        if (result.length !== blockSize * channelCount) {
                            throw new Error('Plugin returned invalid block size');
                        }

                        processedBlock = result;
                    } catch (error) {
                        // On error, pass through original block
                        processedBlock = inputBlock;
                    }
                }

                // De-interleave channels back to the processed buffer
                for (let ch = 0; ch < channelCount; ch++) {
                    const channelData = processedBuffer.getChannelData(ch);
                    const blockOffset = ch * blockSize;
                    for (let i = 0; i < blockSize; i++) {
                        channelData[offset + i] = processedBlock[blockOffset + i];
                    }
                }

                // Update progress with throttling
                const currentTime = performance.now();
                if (currentTime - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
                    const progress = Math.round((offset + blockSize) / totalSamples * 100);
                    if (progressCallback) {
                        await new Promise(resolve => requestAnimationFrame(() => {
                            progressCallback(progress);
                            resolve();
                        }));
                    }
                    lastProgressUpdate = currentTime;
                }

                // Check for cancellation
                if (this.isCancelled) {
                    return null;
                }

                // Allow UI updates between blocks
                if (offset % (BLOCK_SIZE * 8) === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            // Create source node and connect for final rendering
            const sourceNode = this.offlineContext.createBufferSource();
            sourceNode.buffer = processedBuffer;
            sourceNode.connect(this.offlineContext.destination);

            try {
                // Start rendering
                sourceNode.start();
                const renderedBuffer = await this.offlineContext.startRendering();

                // Verify the rendered buffer
                if (!renderedBuffer || renderedBuffer.length === 0) {
                    throw new Error('Rendering produced empty buffer');
                }

                // Update progress to 100%
                if (progressCallback) {
                    await new Promise(resolve => requestAnimationFrame(() => {
                        progressCallback(100);
                        resolve();
                    }));
                }

                // Encode to WAV
                return this.encodeWAV(renderedBuffer);
            } catch (error) {
                throw new Error(`Processing failed: ${error.message}`);
            } finally {
                // Clean up
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

    encodeWAV(audioBuffer) {
        // WAV file format constants - FourCC in correct byte order
        const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        const format = 1; // PCM
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const bitsPerSample = 16;
        const bytesPerSample = bitsPerSample / 8;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const samples = audioBuffer.length;
        const dataSize = samples * blockAlign;
        const fileSize = 36 + dataSize;

        // Create buffer for WAV file
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        // Write WAV header
        let offset = 0;

        // RIFF chunk descriptor
        writeString(view, offset, 'RIFF'); offset += 4;
        view.setUint32(offset, fileSize, true); offset += 4;
        writeString(view, offset, 'WAVE'); offset += 4;

        // fmt sub-chunk
        writeString(view, offset, 'fmt '); offset += 4;
        view.setUint32(offset, 16, true); offset += 4; // Subchunk1Size (16 for PCM)
        view.setUint16(offset, format, true); offset += 2;
        view.setUint16(offset, numChannels, true); offset += 2;
        view.setUint32(offset, sampleRate, true); offset += 4;
        view.setUint32(offset, byteRate, true); offset += 4;
        view.setUint16(offset, blockAlign, true); offset += 2;
        view.setUint16(offset, bitsPerSample, true); offset += 2;

        // data sub-chunk
        writeString(view, offset, 'data'); offset += 4;
        view.setUint32(offset, dataSize, true); offset += 4;

        // Write audio data
        const channels = [];
        for (let i = 0; i < numChannels; i++) {
            channels.push(audioBuffer.getChannelData(i));
        }

        let index = 0;
        const volume = 0x7FFF; // Maximum value for 16-bit
        for (let i = 0; i < samples; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, channels[channel][i]));
                view.setInt16(offset + index, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                index += 2;
            }
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }
}
