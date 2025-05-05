/**
 * Audio signal generation functions
 */

import FFT from './fft.js';

/**
 * Start white noise playback
 * @param {number} level - Noise level in dB (0 to -36)
 * @param {string} outputDeviceId - The output device ID, or null for default
 * @param {string} channel - The channel to output to ('left', 'right', or 'both')
 */
async function startWhiteNoise(level = -12, outputDeviceId = null, channel = 'both') {
    // Make sure any existing white noise is properly stopped first
    if (this.isWhiteNoiseActive) {
        this.stopWhiteNoise();
    }
    
    // Check if AudioContext exists
    if (!this.audioContext) {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            return false;
        }
    }
    
    // Ensure audio context is running
    const contextReady = await this.ensureAudioContextRunning();
    if (!contextReady) {
        return false;
    }
    
    try {
        // Create white noise buffer
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(
            2, bufferSize, this.audioContext.sampleRate
        );
        
        // Fill buffer with white noise
        for (let channel = 0; channel < 2; channel++) {
            const data = noiseBuffer.getChannelData(channel);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        }
        
        // Create audio source from buffer
        this.whiteNoiseNode = this.audioContext.createBufferSource();
        this.whiteNoiseNode.buffer = noiseBuffer;
        this.whiteNoiseNode.loop = true;
        
        // Create gain node for level control
        this.whiteNoiseGain = this.audioContext.createGain();
        this.setNoiseLevel(level);

        // Handle output device selection
        let audioDestination = this.audioContext.destination;

        // If specific output device is requested and setSinkId is supported
        if (outputDeviceId) {
            try {
                // Create an audio element and media stream destination to route audio
                const audioElement = new Audio();
                const mediaStreamDestination = this.audioContext.createMediaStreamDestination();
                
                // Store references for cleanup
                this.whiteNoiseDestination = mediaStreamDestination;
                this.whiteNoiseAudioElement = audioElement;
                
                // Create and connect audio processing
                audioElement.srcObject = mediaStreamDestination.stream;
                
                // Set the sink ID if supported
                if (typeof audioElement.setSinkId === 'function') {
                    await audioElement.setSinkId(outputDeviceId);
                    console.log(`Output device set to ID: ${outputDeviceId}`);
                    
                    // Use the media stream destination instead of default
                    audioDestination = mediaStreamDestination;
                    
                    // Start playback on the audio element
                    audioElement.play().catch(e => {
                        console.error('Failed to play audio element:', e);
                    });
                } else {
                    console.warn('setSinkId is not supported in this browser - using default output device');
                }
            } catch (error) {
                console.error('Error setting output device:', error);
                // Fall back to default device
            }
        }
        
        // Create stereo panner if we need to route to specific channels
        if (channel === 'left' || channel === 'right') {
            const panValue = channel === 'left' ? -1 : 1;
            const panner = this.audioContext.createStereoPanner();
            panner.pan.value = panValue;
            
            // Connect nodes with panner
            this.whiteNoiseNode.connect(this.whiteNoiseGain);
            this.whiteNoiseGain.connect(panner);
            panner.connect(audioDestination);
        } else {
            // Connect nodes directly for both channels
            this.whiteNoiseNode.connect(this.whiteNoiseGain);
            this.whiteNoiseGain.connect(audioDestination);
        }
        
        // Start playback
        this.whiteNoiseNode.start(0);
        this.isWhiteNoiseActive = true;
        
        // Add event listener for ended event
        this.whiteNoiseNode.onended = () => {
            this.isWhiteNoiseActive = false;
        };
        
        return true;
    } catch (error) {
        console.error('Error starting white noise:', error);
        this.isWhiteNoiseActive = false;
        return false;
    }
}

/**
 * Stop white noise playback
 */
function stopWhiteNoise() {
    // Only proceed if white noise is active
    if (!this.isWhiteNoiseActive) return;
    
    try {
        // Stop the noise source first
        if (this.whiteNoiseNode) {
            try {
                this.whiteNoiseNode.stop(0);
                this.whiteNoiseNode.disconnect();
            } catch (e) {
                console.warn('Error stopping/disconnecting white noise node:', e);
            }
            this.whiteNoiseNode = null;
        }
        
        // Disconnect gain node
        if (this.whiteNoiseGain) {
            try {
                this.whiteNoiseGain.disconnect();
            } catch (e) {
                console.warn('Error disconnecting white noise gain node:', e);
            }
            this.whiteNoiseGain = null;
        }
        
        // Stop audio element if it exists
        if (this.whiteNoiseAudioElement) {
            try {
                this.whiteNoiseAudioElement.pause();
                this.whiteNoiseAudioElement.srcObject = null;
            } catch (e) {
                console.warn('Error stopping audio element:', e);
            }
            this.whiteNoiseAudioElement = null;
        }
        
        // Disconnect media stream destination if it exists
        if (this.whiteNoiseDestination) {
            try {
                this.whiteNoiseDestination.disconnect();
            } catch (e) {
                console.warn('Error disconnecting media stream destination:', e);
            }
            this.whiteNoiseDestination = null;
        }
        
        // Set flag
        this.isWhiteNoiseActive = false;
    } catch (error) {
        console.error('Error stopping white noise:', error);
    }
}

/**
 * Set white noise output level
 * @param {number} levelDb - White noise level in dB (0 to -36)
 * @returns {boolean} Whether the level was successfully set
 */
function setNoiseLevel(levelDb) {
    try {
        if (!this.whiteNoiseGain) {
            return false;
        }
        
        if (!this.isWhiteNoiseActive) {
            console.warn('Setting noise level while white noise is not active');
        }
        
        // Convert dB to linear gain (0dB = 1.0)
        const linearGain = Math.pow(10, levelDb / 20);
        
        // Apply gain
        this.whiteNoiseGain.gain.value = linearGain;
        
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Generate a Time-Stretched Pulse (TSP) signal and its inverse filter
 * @param {number} length - Signal length in samples
 * @param {number} sampleRate - Sample rate in Hz
 * @param {string} channel - Output channel ('left', 'right', or 'both')
 * @returns {{left: Float32Array, right: Float32Array, length: number, frequencyResponse: Array, peakOffset: number, 
 *   inverseFilter: Float32Array
 * }}
 */
function generateTSP(length = 65536, sampleRate = 48000, channel = 'both') {
    if (!this.initialized) {
        return null;
    }
    if (length <= 0 || sampleRate <= 0) {
        return null;
    }

    // Round up to the nearest power of 2
    const N = 1 << Math.ceil(Math.log2(length));
    const halfN = N >>> 1;

    // Create frequency-domain representation of TSP signal
    const real = new Float32Array(N);
    const imag = new Float32Array(N);
    const invReal = new Float32Array(N);
    const invImag = new Float32Array(N);

    // Populate frequency-domain arrays with quadratic phase values
    // For a time-stretched pulse, the phase is proportional to the square of the frequency
    for (let k = 1; k < halfN; k++) {
        // Phase function: -2πk²/N creates a quadratic phase shift
        // This results in a logarithmic frequency sweep when converted to time domain
        const phi = -2 * Math.PI * k * k / N;

        // Calculate sine and cosine values for the phase
        const c = Math.cos(phi);
        const s = Math.sin(phi);

        // Forward TSP (quadratic phase spectrum)
        real[k] = c;
        imag[k] = s;
        real[N - k] = c;       // Conjugate symmetric for real output
        imag[N - k] = -s;      // Negative for complex conjugate

        // Inverse filter (negative quadratic phase)
        invReal[k] = c;
        invImag[k] = -s;       // Negative sign for inverse filter
        invReal[N - k] = c;    // Conjugate symmetric
        invImag[N - k] = s;    // Positive for complex conjugate
    }

    // Use real[0] = real[N/2] = 1 for a flat amplitude spectrum
    real[0] = 1;
    if (N % 2 === 0) {
        real[N / 2] = 1;
    }

    // Create FFT processor
    const fft = new FFT(N);
    
    // Allocate time-domain arrays
    const tdR = new Float32Array(N), tdI = new Float32Array(N);
    const ifR = new Float32Array(N), ifI = new Float32Array(N);

    // Transform to time domain
    fft.inverseTransform(tdR, tdI, real, imag);
    fft.inverseTransform(ifR, ifI, invReal, invImag);

    // Extract the real parts for the time-domain signals
    const tspSignal = new Float32Array(N);
    tspSignal.set(tdR);
    
    const inverseFilter = new Float32Array(N);
    inverseFilter.set(ifR);

    // Normalize TSP signal to target RMS level (-3dB)
    let sumSq = 0;
    for (let i = 0; i < N; i++) sumSq += tspSignal[i] * tspSignal[i];
    const rms = Math.sqrt(sumSq / N);
    const targetRms = Math.pow(10, -3 / 20); // -3dB
    const norm = rms > 1e-9 ? targetRms / rms : 1;
    for (let i = 0; i < N; i++) tspSignal[i] *= norm;

    // Normalize inverse filter to peak of 1.0
    let peak = 0;
    for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(inverseFilter[i]));
    const invNorm = peak > 1e-9 ? 1 / peak : 1;
    for (let i = 0; i < N; i++) inverseFilter[i] *= invNorm;

    // Create output buffers for left and right channels
    const left = new Float32Array(N);
    const right = new Float32Array(N);
    
    // Copy TSP signal to specified channel(s)
    if (channel === 'left' || channel === 'both') {
        left.set(tspSignal);
    }
    if (channel === 'right' || channel === 'both') {
        right.set(tspSignal);
    }

    // Save the generated signals for future reference
    this.lastTspSignal = tspSignal;
    this.lastInverseFilter = inverseFilter;
    
    // Find the peak position for later synchronization
    let maxVal = 0;
    let maxPos = 0;
    for (let i = 0; i < N; i++) {
        if (Math.abs(tspSignal[i]) > maxVal) {
            maxVal = Math.abs(tspSignal[i]);
            maxPos = i;
        }
    }
    this.tspPeakOffset = maxPos;
    
    // Create a frequency response curve (flat for TSP)
    const freqResponseLength = 128;
    const freqResponse = new Array(freqResponseLength);
    for (let i = 0; i < freqResponseLength; i++) {
        freqResponse[i] = {
            frequency: 20 * Math.pow(10, i * Math.log10(20000 / 20) / (freqResponseLength - 1)),
            magnitude: 0
        };
    }
    this.lastSweepFrequencyResponse = freqResponse;
    
    return {
        left,
        right,
        length: N,
        frequencyResponse: freqResponse,
        peakOffset: maxPos,
        inverseFilter
    };
}

/**
 * Apply a half-Hann window to reduce transients
 * @param {Float32Array} buffer - Audio buffer to apply window to
 */
function applyWindow(buffer) {
    const len = buffer.length;
    for (let i = 0; i < len; i++) {
        // Hann window: 0.5 * (1 - cos(2π × i/(N-1)))
        const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (len - 1)));
        buffer[i] *= window;
    }
    return buffer;
}

export {
    startWhiteNoise,
    stopWhiteNoise,
    setNoiseLevel,
    generateTSP,
    applyWindow
}; 