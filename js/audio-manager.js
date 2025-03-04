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
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContext({ latencyHint: 'playback' });
                window.audioContext = this.audioContext; // Global reference
            }

            // Load audio worklet with absolute path
            const currentPath = window.location.pathname;
            const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
            await this.audioContext.audioWorklet.addModule(`${basePath}/plugins/audio-processor.js`);

            // Get user media with audio constraints
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            // Create source and worklet nodes
            this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
            this.workletNode = new AudioWorkletNode(this.audioContext, 'plugin-processor');
            window.workletNode = this.workletNode;
            window.pipeline = this.pipeline; // Global pipeline reference

            // Setup worklet message handler
            this.workletNode.port.onmessage = (event) => {
                const data = event.data;
                if (data.type === 'sleepModeChanged') {
                    // Update UI with sleep mode status
                    const sampleRateElement = document.getElementById('sampleRate');
                    if (sampleRateElement) {
                        if (data.isSleepMode) {
                            // Add sleep mode indicator if not already present
                            if (!sampleRateElement.textContent.includes('Sleep Mode')) {
                                sampleRateElement.textContent += ' - Sleep Mode';
                            }
                        } else {
                            // Remove sleep mode indicator
                            sampleRateElement.textContent = sampleRateElement.textContent.replace(' - Sleep Mode', '');
                        }
                    }
                }
            };

            // Build initial pipeline
            await this.rebuildPipeline();

            // Resume context if suspended
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

        // Disconnect existing connections
        this.sourceNode.disconnect();
        if (this.workletNode) {
            this.workletNode.disconnect();
        }

        // Connect source to worklet and worklet to destination
        this.sourceNode.connect(this.workletNode);
        this.workletNode.connect(this.audioContext.destination);

        // Update worklet with current pipeline state
        if (this.pipeline.length === 0 || this.masterBypass) {
            this.workletNode.port.postMessage({
                type: 'updatePlugins',
                plugins: [],
                masterBypass: true
            });
            return;
        }

        this.workletNode.port.postMessage({
            type: 'updatePlugins',
            plugins: this.pipeline.map(plugin => ({
                id: plugin.id,
                type: plugin.constructor.name,
                enabled: plugin.enabled,
                parameters: plugin.getParameters()
            })),
            masterBypass: this.masterBypass
        });
    }

    async reset() {
        // Close audio context and clear global reference
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
            window.audioContext = null;
        }
        // Stop all media tracks
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

    // Process an audio file offline
    async processAudioFile(file, progressCallback = null) {
        this.isOfflineProcessing = true;
        this.isCancelled = false;
        try {
            // Read file as ArrayBuffer and decode audio data
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // If no active plugins, encode directly to WAV
            const activePlugins = this.pipeline.filter(plugin => plugin.enabled);
            if (activePlugins.length === 0) {
                return this.encodeWAV(audioBuffer);
            }

            const { numberOfChannels, length: totalSamples, sampleRate } = audioBuffer;
            // Create offline context for final rendering
            this.offlineContext = new OfflineAudioContext({
                numberOfChannels,
                length: totalSamples,
                sampleRate
            });

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
                        initialized: false,
                        fadeStates: new Map(),
                        getFadeValue: (id, currentValue, time) => {
                            const FADE_DURATION = 0.010; // 10ms fade
                            const context = pluginContexts.get(pluginId);
                            let fadeState = context.fadeStates.get(id);
                            if (!fadeState) {
                                fadeState = {
                                    prevValue: currentValue,
                                    targetValue: currentValue,
                                    startTime: time
                                };
                                context.fadeStates.set(id, fadeState);
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

                // Process block through each active plugin
                let processedBlock = new Float32Array(inputBlock);
                for (const plugin of activePlugins) {
                    if (!plugin.enabled) continue;

                    const parameters = {
                        ...plugin.getParameters(),
                        channelCount: numberOfChannels,
                        blockSize,
                        sampleRate,
                        initialized: pluginContexts.has(plugin.id)
                    };

                    try {
                        const pluginContext = createContext(plugin.id);
                        pluginContext.currentTime = offset / sampleRate;

                        if (!(processedBlock instanceof Float32Array)) {
                            processedBlock = new Float32Array(processedBlock);
                        }
                        
                        const result = plugin.executeProcessor(
                            pluginContext,
                            processedBlock,
                            parameters,
                            pluginContext.currentTime
                        );

                        if (!result || !(result instanceof Float32Array) || result.length !== blockSize * numberOfChannels) {
                            throw new Error('Invalid plugin output');
                        }
                        processedBlock = result;
                    } catch (error) {
                        // On error, pass through the original block
                        processedBlock = inputBlock;
                    }
                }

                // De-interleave processed data back into the processed buffer
                for (let ch = 0; ch < numberOfChannels; ch++) {
                    const channelData = processedBuffer.getChannelData(ch);
                    const channelOffset = ch * blockSize;
                    for (let i = 0; i < blockSize; i++) {
                        channelData[offset + i] = processedBlock[channelOffset + i];
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
                return this.encodeWAV(renderedBuffer);
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

    // Encode audio buffer to WAV format with 24-bit samples
    encodeWAV(audioBuffer) {
        // Helper function to write string data into DataView
        const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        const format = 1; // PCM
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const bitsPerSample = 24; // Changed to 24-bit
        const bytesPerSample = bitsPerSample / 8; // 3 bytes per sample
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const samples = audioBuffer.length;
        const dataSize = samples * blockAlign;
        const fileSize = 36 + dataSize;

        // Create buffer for WAV file
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);
        let offset = 0;

        // RIFF chunk descriptor
        writeString(view, offset, 'RIFF'); offset += 4;
        view.setUint32(offset, fileSize, true); offset += 4;
        writeString(view, offset, 'WAVE'); offset += 4;

        // fmt sub-chunk
        writeString(view, offset, 'fmt '); offset += 4;
        view.setUint32(offset, 16, true); offset += 4; // Subchunk1Size for PCM
        view.setUint16(offset, format, true); offset += 2;
        view.setUint16(offset, numChannels, true); offset += 2;
        view.setUint32(offset, sampleRate, true); offset += 4;
        view.setUint32(offset, byteRate, true); offset += 4;
        view.setUint16(offset, blockAlign, true); offset += 2;
        view.setUint16(offset, bitsPerSample, true); offset += 2;

        // data sub-chunk
        writeString(view, offset, 'data'); offset += 4;
        view.setUint32(offset, dataSize, true); offset += 4;

        // Write audio samples to buffer as 24-bit little endian
        const channels = [];
        for (let i = 0; i < numChannels; i++) {
            channels.push(audioBuffer.getChannelData(i));
        }

        let index = 0;
        for (let i = 0; i < samples; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
                let sample = channels[ch][i];
                // Clamp the sample value between -1 and 1
                sample = Math.max(-1, Math.min(1, sample));
                // Scale sample to 24-bit range
                let intSample;
                if (sample < 0) {
                    intSample = Math.round(sample * 0x800000);
                } else {
                    intSample = Math.round(sample * 0x7FFFFF);
                }
                // Convert to unsigned 24-bit integer (two's complement)
                let intSample24 = intSample & 0xFFFFFF;
                view.setUint8(offset + index, intSample24 & 0xFF); // Least significant byte
                view.setUint8(offset + index + 1, (intSample24 >> 8) & 0xFF);
                view.setUint8(offset + index + 2, (intSample24 >> 16) & 0xFF);
                index += 3;
            }
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }
}
