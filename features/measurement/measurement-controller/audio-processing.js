/**
 * Audio processing functionality for the measurement controller
 */

import audioUtils from '../audioUtils.js';

const AudioProcessing = {
    /**
     * Active audio elements for the current sweep
     */
    activeSweepElements: {
        source: null,
        gainNode: null,
        recordNode: null,
        analyzer: null,
        checkInterval: null,
        audioElement: null,
        mediaStreamDestination: null
    },
    
    /**
     * Playback sweep and record input simultaneously
     * @param {Object} sweepBuffer - Sweep signal buffer object with left and right channels
     * @returns {Object} Measurement result with impulse response and overload flag
     */
    async playAndRecordSweep(sweepBuffer) {
        return new Promise(async (resolve, reject) => {
            try {
                // Reset active elements before starting new sweep
                this.activeSweepElements = {
                    source: null,
                    gainNode: null,
                    recordNode: null,
                    analyzer: null,
                    checkInterval: null,
                    audioElement: null,
                    mediaStreamDestination: null
                };

                const audioContext = audioUtils.audioContext;
                if (!audioContext || audioContext.state !== 'running') {
                    throw new Error('Audio context is not running');
                }
                
                // Verify that microphone input is working
                if (!audioUtils.microphone) {
                    throw new Error('Microphone input is not initialized. Please check browser settings.');
                }
                
                console.log(`Audio context state: ${audioContext.state}, sample rate: ${audioContext.sampleRate}Hz`);
                console.log(`Microphone connected: ${audioUtils.microphone !== null}`);
                
                const sampleRate = audioContext.sampleRate;
                const averagingCount = parseInt(this.measurementConfig.averaging);
                
                // Get the current signal level setting
                const signalLevel = parseFloat(document.getElementById('noiseLevel').value);
                console.log(`Using signal level: ${signalLevel} dB`);
                
                // Calculate the expected playback duration
                const sweepDuration = sweepBuffer.length / sampleRate;
                const totalPlaybackDuration = sweepDuration * (averagingCount + 1); // +1 for safety
                console.log(`Sweep duration: ${sweepDuration.toFixed(2)}s, Total playback: ${totalPlaybackDuration.toFixed(2)}s`);
                
                // Create combined buffer of repeated TSP signals
                const combinedBufferLength = sweepBuffer.length * (averagingCount + 1);
                const combinedLeftBuffer = new Float32Array(combinedBufferLength);
                const combinedRightBuffer = new Float32Array(combinedBufferLength);
                
                // Copy the sweep into the combined buffer multiple times
                for (let i = 0; i < averagingCount + 1; i++) {
                    const offset = i * sweepBuffer.length;
                    for (let j = 0; j < sweepBuffer.length; j++) {
                        combinedLeftBuffer[offset + j] = sweepBuffer.left[j];
                        combinedRightBuffer[offset + j] = sweepBuffer.right[j];
                    }
                }
                
                // Create audio buffer for the combined sweep signal
                const combinedSweepBuffer = audioContext.createBuffer(
                    2, combinedBufferLength, sampleRate
                );
                
                // Copy data to audio buffer
                combinedSweepBuffer.copyToChannel(combinedLeftBuffer, 0);  // Left channel
                combinedSweepBuffer.copyToChannel(combinedRightBuffer, 1); // Right channel
                
                // Calculate recording buffer length - match exactly with playback plus some padding
                // Instead of using fixed delays, calculate exact timing:
                // 0.5s pre-roll + TSP playback + 0.5s post-roll
                const prePostRollTime = 0.5; // seconds
                const recordBufferLength = Math.ceil(sampleRate * (prePostRollTime + totalPlaybackDuration + prePostRollTime));
                const recordBuffer = new Float32Array(recordBufferLength);
                
                console.log(`Recording buffer length: ${recordBufferLength} samples (${recordBufferLength/sampleRate}s)`);
                
                // Create analyzer to detect overload
                const analyzer = audioContext.createAnalyser();
                analyzer.fftSize = 2048;
                const analyzerData = new Uint8Array(analyzer.frequencyBinCount);
                
                // Store analyzer in active elements
                this.activeSweepElements.analyzer = analyzer;
                
                let recordNode;
                let recordingStarted = false;
                let recordIndex = 0;
                let hasOverload = false;
                let maxSignalLevel = -100; // Variable to track maximum signal level
                
                // Store reference to this to use in inner functions
                const self = this;
                
                // Function to update analyzer and check for overload
                const checkOverload = () => {
                    analyzer.getByteTimeDomainData(analyzerData);
                    for (let i = 0; i < analyzerData.length; i++) {
                        if (analyzerData[i] < 5 || analyzerData[i] > 250) {
                            hasOverload = true;
                            break;
                        }
                    }
                    
                    // Get current input level and update maximum value
                    const currentLevel = audioUtils.getInputLevel();
                    maxSignalLevel = Math.max(maxSignalLevel, currentLevel);
                };
                
                // Check if AudioWorklet is supported
                if (!audioUtils.audioWorkletSupported) {
                    console.error('AudioWorklet is not supported in this browser');
                    alert('This browser does not support AudioWorklet. For accurate measurements, please use the latest version of Chrome or Edge.');
                    reject(new Error('AudioWorklet not supported'));
                    return;
                }
                
                try {
                    console.log('Using AudioWorkletNode for recording');
                    
                    // Create recorder worklet node
                    recordNode = await audioUtils.createRecorderWorkletNode(
                        null, // device ID is handled by microphone
                        this.measurementConfig.inputChannel
                    );
                    
                    // Store in class variable for later cleanup
                    this.recorderNode = recordNode;
                    // Store in active elements
                    this.activeSweepElements.recordNode = recordNode;
                    
                    // Set up message handling
                    recordNode.port.onmessage = (event) => {
                        if (event.data.status === 'started') {
                            recordingStarted = true;
                            console.log('Recording started');
                        } else if (event.data.buffer) {
                            // Received audio data from worklet
                            const incomingBuffer = event.data.buffer;
                            // Copy incoming buffer to record buffer at correct position
                            for (let i = 0; i < incomingBuffer.length && recordIndex < recordBuffer.length; i++) {
                                recordBuffer[recordIndex++] = incomingBuffer[i];
                            }
                        } else if (event.data.status === 'stopped' || event.data.status === 'complete') {
                            console.log(`Recording ${event.data.status} with ${event.data.buffer?.length || 0} samples`);
                            if (event.data.buffer) {
                                // Copy remaining buffer if any
                                const incomingBuffer = event.data.buffer;
                                for (let i = 0; i < incomingBuffer.length && recordIndex < recordBuffer.length; i++) {
                                    recordBuffer[recordIndex++] = incomingBuffer[i];
                                }
                            }
                        }
                    };
                    
                    // Verify microphone is not null before trying to connect
                    if (!audioUtils.microphone) {
                        throw new Error('Microphone source is null. Please ensure microphone access is granted.');
                    }
                    
                    console.log('Connecting microphone to recorder node');
                    // Connect microphone to recorder node and analyzer
                    audioUtils.microphone.connect(recordNode);
                    audioUtils.microphone.connect(analyzer);
                    
                    // Connect recorder node to destination (needed for WebAudio to work correctly)
                    recordNode.connect(audioContext.destination);
                    
                    // Start recording
                    recordNode.port.postMessage({ command: 'start' });
                    
                } catch (err) {
                    console.error('Failed to create AudioWorkletNode:', err);
                    reject(err);
                    return;
                }
                
                // Track timing
                let startTime = 0;
                let playbackStarted = false;
                let playbackEnded = false;
                
                // Start playback with pre-roll delay
                setTimeout(() => {
                    try {
                        // Make sure audio context is still running
                        if (audioContext.state !== 'running') {
                            console.log('Resuming audio context before playback');
                            audioContext.resume();
                        }
                        
                        // Create audio source
                        const source = audioContext.createBufferSource();
                        source.buffer = combinedSweepBuffer;
                        
                        // Create gain node for output level control
                        const gainNode = audioContext.createGain();
                        
                        // Convert dB to linear gain
                        const linearGain = Math.pow(10, signalLevel / 20);
                        gainNode.gain.value = linearGain;
                        
                        // Get output device ID from measurement config
                        const outputDeviceId = this.measurementConfig.audioOutputId;
                        
                        // Handle output device selection
                        let audioDestination = audioContext.destination;
                        
                        // If specific output device is requested, try to use it
                        if (outputDeviceId) {
                            try {
                                console.log(`Attempting to use output device ID: ${outputDeviceId}`);
                                
                                // Create an audio element for output device routing
                                const audioElement = new Audio();
                                const mediaStreamDestination = audioContext.createMediaStreamDestination();
                                
                                // Store references for cleanup
                                this.activeSweepElements.audioElement = audioElement;
                                this.activeSweepElements.mediaStreamDestination = mediaStreamDestination;
                                
                                // Connect audio element to media stream
                                audioElement.srcObject = mediaStreamDestination.stream;
                                
                                // Use setSinkId if available
                                if (typeof audioElement.setSinkId === 'function') {
                                    // 非同期処理をPromiseとして実行
                                    (async () => {
                                        try {
                                            await audioElement.setSinkId(outputDeviceId);
                                            console.log(`Sweep playback output device set to ID: ${outputDeviceId}`);
                                            
                                            // Start playback on the audio element
                                            audioElement.play().catch(e => {
                                                console.error('Failed to play audio element:', e);
                                            });
                                        } catch (err) {
                                            console.error('Error in setSinkId:', err);
                                        }
                                    })();
                                    
                                    // Use the media stream destination
                                    audioDestination = mediaStreamDestination;
                                } else {
                                    console.warn('setSinkId is not supported in this browser - using default output device');
                                }
                            } catch (error) {
                                console.error('Failed to set output device for sweep playback:', error);
                                // Fall back to default output
                            }
                        }
                        
                        // Connect source -> gain -> output
                        source.connect(gainNode);
                        gainNode.connect(audioDestination);
                        
                        // Store source and gain node in active elements
                        this.activeSweepElements.source = source;
                        this.activeSweepElements.gainNode = gainNode;
                        
                        // Track when playback starts
                        startTime = audioContext.currentTime;
                        playbackStarted = true;
                        console.log(`Playback started at ${startTime}`);
                        
                        // Start playback
                        source.start();
                        
                        // Track when playback ends
                        source.onended = () => {
                            playbackEnded = true;
                            console.log(`Playback ended at ${audioContext.currentTime}, duration: ${audioContext.currentTime - startTime}s`);
                        };
                        
                        // Safety timeout in case onended doesn't fire
                        setTimeout(() => {
                            if (!playbackEnded) {
                                playbackEnded = true;
                                console.log(`Forcing playback end at ${audioContext.currentTime}, duration: ${audioContext.currentTime - startTime}s`);
                            }
                        }, (totalPlaybackDuration + 0.5) * 1000);
                    } catch (error) {
                        console.error('Error starting playback:', error);
                        playbackEnded = true; // Mark as ended to trigger cleanup
                    }
                    
                }, prePostRollTime * 1000);
                
                // Setup a periodic check for analyzing the recording
                const checkInterval = setInterval(() => {
                    // Update the analyzer info
                    checkOverload();
                    
                    // If playback has ended and we've recorded enough post-roll samples or record buffer is full
                    if ((playbackEnded && audioContext.currentTime > startTime + totalPlaybackDuration + prePostRollTime) ||
                        recordIndex >= recordBuffer.length) {
                        
                        clearInterval(checkInterval);
                        
                        // Stop the recording
                        recordNode.port.postMessage({ command: 'stop' });
                        
                        // Small delay to ensure all audio data is received
                        setTimeout(() => {
                            finishRecording();
                        }, 500);
                    }
                }, 100);
                
                // Store interval in active elements
                this.activeSweepElements.checkInterval = checkInterval;
                
                // Function to clean up and process the recording
                const finishRecording = () => {
                    // Clean up
                    try {
                        if (recordNode) {
                            recordNode.disconnect();
                        }
                        analyzer.disconnect();
                    } catch (e) {
                        console.error("Error during cleanup:", e);
                    }
                    
                    console.log(`Recording completed: ${recordIndex}/${recordBuffer.length} samples`);
                    console.log(`Max signal level: ${maxSignalLevel.toFixed(1)} dB`);
                    
                    // Create a properly sized buffer with the recorded data
                    let finalBuffer;
                    if (recordIndex < recordBuffer.length) {
                        finalBuffer = new Float32Array(recordIndex);
                        finalBuffer.set(recordBuffer.subarray(0, recordIndex));
                    } else {
                        finalBuffer = recordBuffer;
                    }
                    
                    // Save full recording for debugging
                    this.fullRecordBuffer = finalBuffer;
                    
                    // Process the recording to extract the impulse response
                    const processStart = performance.now();
                    const processedBuffer = this.processRecordedBuffer(finalBuffer, sweepBuffer.length, averagingCount, sampleRate);
                    
                    // Save synchronized buffer for debugging
                    this.syncedBuffer = processedBuffer;
                    
                    // Calculate smoothed frequency response with 0.005 octave spacing
                    const frequencyResponse = audioUtils.calculateFrequencyResponseWithSmoothing(
                        processedBuffer, 
                        sampleRate, 
                        true, // Normalize with last sweep
                        0.005  // Octave smoothing factor
                    );
                    
                    const processEnd = performance.now();
                    console.log(`Signal processing completed in ${processEnd - processStart}ms`);
                    
                    // Resolve promise with processed data
                    resolve({
                        frequencyResponse: frequencyResponse,
                        hasOverload: hasOverload,
                        maxSignalLevel: maxSignalLevel,
                        fullRecording: finalBuffer,
                        sampleRate: sampleRate
                    });
                };
                
                // Final safety timeout
                setTimeout(() => {
                    if (!playbackEnded || recordNode.connected) {
                        console.warn(`Recording timeout after ${2 * (prePostRollTime + totalPlaybackDuration)}s`);
                        
                        // Clean up
                        try {
                            if (recordNode) {
                                recordNode.disconnect();
                            }
                            analyzer.disconnect();
                        } catch (e) {
                            console.error("Error during cleanup:", e);
                        }
                        
                        reject(new Error('Recording timeout'));
                    }
                }, 2 * (prePostRollTime + totalPlaybackDuration) * 1000);
                
            } catch (error) {
                reject(error);
            }
        });
    },
    
    /**
     * Process the recorded buffer to get impulse response
     * @param {Float32Array} recordBuffer - Full recorded buffer
     * @param {number} sweepLength - Sweep length in samples
     * @param {number} averagingCount - Number of repetitions
     * @param {number} sampleRate - Sample rate in Hz
     * @returns {Float32Array} Processed impulse response
     */
    processRecordedBuffer(recordBuffer, sweepLength, averagingCount, sampleRate) {
        console.time('processRecordedBuffer');
        
        // Log recording information
        console.log(`Recording length: ${recordBuffer.length} samples (${recordBuffer.length/sampleRate}s)`);
        console.log(`Sweep length: ${sweepLength} samples (${sweepLength/sampleRate}s)`);
        console.log(`Averaging count: ${averagingCount}`);
        
        // Extract segments from the recording buffer
        // Format: 0.5s pre-roll + TSP signals + 0.5s post-roll
        const postRollSamples = Math.ceil(sampleRate * 0.5);  // 0.5 second post-roll
        
        // Array to store segments
        const measurements = [];
        
        // Calculate starting positions for all segments
        for (let i = 0; i < averagingCount; i++) {
            const startPos = recordBuffer.length - postRollSamples - ((i+1) * sweepLength);
            
            // Check if the start position is within the recording buffer range
            if (startPos + sweepLength <= recordBuffer.length) {
                // Extract segment
                const segment = new Float32Array(sweepLength);
                for (let j = 0; j < sweepLength; j++) {
                    segment[j] = recordBuffer[startPos + j];
                }
                
                measurements.push(segment);
                console.log(`Extracted segment ${i+1}: ${startPos} to ${startPos + sweepLength} (${sweepLength} samples)`);
            } else {
                console.warn(`Segment ${i+1} would exceed buffer length. Skipping.`);
            }
        }
        
        // If no measurements could be extracted, return empty array
        if (measurements.length === 0) {
            console.error('No segments could be extracted from the recording');
            console.timeEnd('processRecordedBuffer');
            return new Float32Array(sweepLength); // Return empty buffer with correct length
        }
        
        // Calculate synchronous average
        const averagedBuffer = audioUtils.synchronousAverage(measurements);
        
        console.timeEnd('processRecordedBuffer');
        return averagedBuffer;
    },
    
    /**
     * Stop active sweep playback and recording immediately
     */
    stopSweepPlayback() {
        try {
            console.log('Stopping active sweep playback and recording');
            
            // Stop audio source if exists
            if (this.activeSweepElements.source) {
                try {
                    this.activeSweepElements.source.stop();
                    this.activeSweepElements.source.disconnect();
                    this.activeSweepElements.source = null;
                } catch (e) {
                    console.warn('Error stopping/disconnecting audio source:', e);
                }
            }
            
            // Disconnect gain node if exists
            if (this.activeSweepElements.gainNode) {
                try {
                    this.activeSweepElements.gainNode.disconnect();
                    this.activeSweepElements.gainNode = null;
                } catch (e) {
                    console.warn('Error disconnecting gain node:', e);
                }
            }
            
            // Stop recorder worklet if exists
            if (this.activeSweepElements.recordNode) {
                try {
                    this.activeSweepElements.recordNode.port.postMessage({ command: 'stop' });
                    this.activeSweepElements.recordNode.disconnect();
                    this.activeSweepElements.recordNode = null;
                } catch (e) {
                    console.warn('Error stopping recorder node:', e);
                }
            }
            
            // Disconnect analyzer if exists
            if (this.activeSweepElements.analyzer) {
                try {
                    this.activeSweepElements.analyzer.disconnect();
                    this.activeSweepElements.analyzer = null;
                } catch (e) {
                    console.warn('Error disconnecting analyzer:', e);
                }
            }
            
            // Stop audio element if exists
            if (this.activeSweepElements.audioElement) {
                try {
                    this.activeSweepElements.audioElement.pause();
                    this.activeSweepElements.audioElement.srcObject = null;
                    this.activeSweepElements.audioElement = null;
                } catch (e) {
                    console.warn('Error stopping audio element:', e);
                }
            }
            
            // Disconnect media stream destination if exists
            if (this.activeSweepElements.mediaStreamDestination) {
                try {
                    this.activeSweepElements.mediaStreamDestination.disconnect();
                    this.activeSweepElements.mediaStreamDestination = null;
                } catch (e) {
                    console.warn('Error disconnecting media stream destination:', e);
                }
            }
            
            // Clear check interval if exists
            if (this.activeSweepElements.checkInterval) {
                clearInterval(this.activeSweepElements.checkInterval);
                this.activeSweepElements.checkInterval = null;
            }
            
            // Clear recorder node reference
            this.recorderNode = null;
            
            console.log('Sweep playback and recording stopped successfully');
        } catch (error) {
            console.error('Error stopping sweep playback:', error);
        }
    }
};

export default AudioProcessing; 