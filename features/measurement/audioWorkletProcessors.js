/**
 * AudioWorklet processors for the frequency response measurement app
 */

// RecorderProcessor for recording audio
class RecorderProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        
        // Default to left channel if not specified
        this.channel = options.processorOptions?.channel || 'left';
        
        // Convert string channel names to integers
        if (this.channel === 'left') this.channel = 0;
        else if (this.channel === 'right') this.channel = 1;
        else if (this.channel === 'both') this.channel = -1; // Special case for mix
        
        // Buffer to store recorded audio
        this.recordBuffer = [];
        this.isRecording = false;
        this.maxRecordLength = 0; // Set to > 0 to limit recording length
        
        // Message port for communication with main thread
        this.port.onmessage = (event) => this.handleMessage(event.data);
    }
    
    handleMessage(data) {
        if (data.command === 'start') {
            this.recordBuffer = [];
            this.isRecording = true;
            this.maxRecordLength = data.maxLength || 0;
            this.port.postMessage({ status: 'started' });
        } else if (data.command === 'stop') {
            this.isRecording = false;
            this.port.postMessage({
                status: 'stopped',
                buffer: this.recordBuffer.flat()
            });
            this.recordBuffer = [];
        }
    }
    
    process(inputs, outputs, parameters) {
        // Check if we have inputs
        if (!inputs || !inputs[0] || !inputs[0].length) {
            return true; // Keep processor alive
        }
        
        // Get input channels
        const input = inputs[0];
        const channelCount = input.length;
        
        // Record if active
        if (this.isRecording) {
            const sample = [];
            
            // Process based on selected channel
            if (this.channel === 0) {
                // Left channel only
                const leftChannel = input[0];
                if (leftChannel) sample.push(...leftChannel);
            } else if (this.channel === 1) {
                // Right channel only
                if (channelCount > 1) {
                    // If we have a right channel, use it
                    const rightChannel = input[1];
                    if (rightChannel) sample.push(...rightChannel);
                } else {
                    // If no right channel exists, log a warning but don't fail
                    console.warn('Right channel requested but input is mono, using left channel');
                    const leftChannel = input[0];
                    if (leftChannel) sample.push(...leftChannel);
                }
            } else if (this.channel === -1) {
                // Mix to mono
                const leftChannel = input[0];
                
                if (channelCount > 1) {
                    // Mix stereo to mono
                    const rightChannel = input[1];
                    if (leftChannel && rightChannel) {
                        // Average left and right
                        for (let i = 0; i < leftChannel.length; i++) {
                            sample.push((leftChannel[i] + rightChannel[i]) * 0.5);
                        }
                    }
                } else if (leftChannel) {
                    // Only left available, use as is (already mono)
                    sample.push(...leftChannel);
                }
            }
            
            // Add to recording buffer
            if (sample.length > 0) {
                this.recordBuffer.push(sample);
                
                // Check if we've reached the maximum length
                if (this.maxRecordLength > 0) {
                    const totalSamples = this.recordBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
                    if (totalSamples >= this.maxRecordLength) {
                        // Stop recording and send back the buffer
                        this.isRecording = false;
                        this.port.postMessage({
                            status: 'complete',
                            buffer: this.recordBuffer.flat().slice(0, this.maxRecordLength)
                        });
                        this.recordBuffer = [];
                    }
                }
            }
        }
        
        return true; // Keep processor alive
    }
}

// LevelMeterProcessor for measuring input levels
class LevelMeterProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        
        // Default to left channel if not specified
        this.channel = options.processorOptions?.channel || 'left';
        
        // Convert string channel names to integers
        if (this.channel === 'left') this.channel = 0;
        else if (this.channel === 'right') this.channel = 1;
        else if (this.channel === 'both') this.channel = -1; // Special case for mix
        
        // RMS calculation
        this.smoothingFactor = 0.95; // Higher value = more smoothing
        this.currentLevel = 0;
        this.counter = 0;
        this.updateInterval = 5; // Update every 5 blocks (~ 50ms at 48kHz)
    }
    
    process(inputs, outputs, parameters) {
        // Check if we have inputs
        if (!inputs || !inputs[0] || !inputs[0].length) {
            return true; // Keep processor alive
        }
        
        // Get input channels
        const input = inputs[0];
        const channelCount = input.length;
        
        // Calculate RMS level
        let sum = 0;
        let count = 0;
        
        // Process based on selected channel
        if (this.channel === 0 && input[0]) {
            // Left channel only
            for (let i = 0; i < input[0].length; i++) {
                sum += input[0][i] * input[0][i];
                count++;
            }
        } else if (this.channel === 1) {
            if (channelCount > 1 && input[1]) {
                // Right channel exists
                for (let i = 0; i < input[1].length; i++) {
                    sum += input[1][i] * input[1][i];
                    count++;
                }
            } else if (input[0]) {
                // No right channel, use left
                console.warn('Right channel requested for level measurement but input is mono');
                for (let i = 0; i < input[0].length; i++) {
                    sum += input[0][i] * input[0][i];
                    count++;
                }
            }
        } else if (this.channel === -1) {
            // Mix to mono
            const leftChannel = input[0];
            
            if (channelCount > 1) {
                const rightChannel = input[1];
                if (leftChannel && rightChannel) {
                    // Average left and right
                    for (let i = 0; i < leftChannel.length; i++) {
                        const value = (leftChannel[i] + rightChannel[i]) * 0.5;
                        sum += value * value;
                        count++;
                    }
                }
            } else if (leftChannel) {
                // Only left available
                for (let i = 0; i < leftChannel.length; i++) {
                    sum += leftChannel[i] * leftChannel[i];
                    count++;
                }
            }
        }
        
        // Update the level with smoothing
        if (count > 0) {
            const blockRMS = Math.sqrt(sum / count);
            this.currentLevel = this.smoothingFactor * this.currentLevel + 
                                (1 - this.smoothingFactor) * blockRMS;
        }
        
        // Periodically send level back to main thread
        this.counter++;
        if (this.counter >= this.updateInterval) {
            this.counter = 0;
            
            // Convert to dB
            let levelDb = -100; // Noise floor
            if (this.currentLevel > 0) {
                levelDb = 20 * Math.log10(this.currentLevel);
                // Limit to reasonable range
                levelDb = Math.max(-100, Math.min(0, levelDb));
            }
            
            this.port.postMessage({ level: levelDb });
        }
        
        return true; // Keep processor alive
    }
}

// Register processors
registerProcessor('recorder-processor', RecorderProcessor);
registerProcessor('level-meter-processor', LevelMeterProcessor); 