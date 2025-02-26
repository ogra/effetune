class BrickwallLimiterPlugin extends PluginBase {
    constructor() {
        super('Brickwall Limiter', 'Prevents audio from exceeding 0 dBFS');

        // Plugin parameters
        this.th = 0;       // Threshold in dB (-24 to 0 dB)
        this.rl = 100;     // Release Time in ms (10 to 500 ms)
        this.la = 3;       // Lookahead Time in ms (0 to 10 ms)
        this.os = 4;       // Oversampling Factor (1, 2, 4, or 8)
        this.ig = 0;       // Input Gain in dB (-18 to 18 dB), default 0 dB
        this.sm = -1.000;  // Margin in dB (-1.000 to 0.000 dB, default -1.000 dB)

        this._hasMessageHandler = false;
        this.lastProcessTime = performance.now() / 1000;

        this._setupMessageHandler();

        // Register the audio processing function with Audio Worklet.
        // Processing chain:
        //  1. Apply input gain sample-by-sample.
        //  2. If oversampling > 1, perform upsampling via polyphase interpolation.
        //  3. Write the unprocessed input into a delay buffer for lookahead and process each sample.
        //  4. For each delayed sample, compute the target gain so that (sample * gain) <= effective threshold.
        //     The effective threshold is computed as: parameters.th + Margin.
        //     If the sample exceeds the effective threshold, the gain is dropped immediately;
        //     otherwise, it recovers gradually (using the release coefficient).
        //  5. Apply the computed gain to the delayed sample.
        //  6. If oversampling > 1, perform downsampling via polyphase decimation.
        this.registerProcessor(`
            if (!parameters.enabled) {
                return data;
            }
            const numChannels = parameters.channelCount;
            const blockSize = parameters.blockSize;
            const sampleRate = parameters.sampleRate;
            
            // Global state reinitialization if sample rate or oversampling factor changes.
            if (context.sampleRate !== sampleRate || context.lastOsFactor !== parameters.os) {
                context.sampleRate = sampleRate;
                context.lastOsFactor = parameters.os;
                context.initialized = false;
                
                // Clear all state variables to ensure clean initialization
                delete context.delayLength;
                delete context.delayWritePos;
                delete context.delayBuffers;
                delete context.gainStates;
                delete context.filterCoeffs;
                delete context.filterLength;
                delete context.polyphase;
                delete context.osFactorCached;
                delete context.upsampleState;
                delete context.downsampleState;
                delete context.delayBufferOS;
                delete context.delayWritePosOS;
                
                // Clear additional state variables used in optimized implementation
                delete context.oversampled;
                delete context.X;
                delete context.Z;
                delete context.downsampledOutput;
                delete context.phaseIndices;
                delete context.phaseRemainders;
                delete context.processedOversampled;
                delete context.outputBuffer;
            }
            
            // Apply input gain (dB to linear conversion) sample-by-sample.
            const inputGainDb = (parameters.ig !== undefined) ? parameters.ig : 0;
            const inputGainLinear = Math.pow(10, inputGainDb / 20);
            
            // Reuse input buffer if it exists or create a new one
            if (!context.inputBuffer || context.inputBuffer.length !== data.length) {
                context.inputBuffer = new Float32Array(data.length);
            }
            let inputBuffer = context.inputBuffer;
            
            // Apply input gain with loop unrolling for better performance
            const dataLength = data.length;
            const dataLengthMod4 = dataLength & ~3; // Fast way to calculate dataLength - (dataLength % 4)
            let i = 0;
            
            // Process 4 samples at a time
            for (; i < dataLengthMod4; i += 4) {
                inputBuffer[i] = data[i] * inputGainLinear;
                inputBuffer[i+1] = data[i+1] * inputGainLinear;
                inputBuffer[i+2] = data[i+2] * inputGainLinear;
                inputBuffer[i+3] = data[i+3] * inputGainLinear;
            }
            
            // Handle remaining samples
            for (; i < dataLength; i++) {
                inputBuffer[i] = data[i] * inputGainLinear;
            }
            
            // Block time delta (for informational purposes)
            const currentTime = (parameters.time !== undefined) ? parameters.time : 0;
            const prevTime = (context.prevTime !== undefined) ? context.prevTime : currentTime;
            const deltaTime = Math.max(0.001, currentTime - prevTime);
            context.prevTime = currentTime;
            
            // Release time in seconds and compute per-sample release coefficient.
            const releaseTime = Math.max(10, parameters.rl) / 1000;
            const releaseCoeffSample = Math.exp(- (1 / sampleRate) / releaseTime);
            
            // Convert threshold and margin from dB to linear.
            const thresholdDb = parameters.th;
            const marginDb = (parameters.sm !== undefined) ? parameters.sm : -1.00;
            const effectiveThresholdDb = thresholdDb + marginDb;
            
            // Cache the threshold conversion to avoid recalculating for each sample
            const effectiveThresholdLin = Math.pow(10, effectiveThresholdDb / 20);
            
            // Create lookup table for expensive division operations if it doesn't exist
            if (!context.thresholdDivLookup || context.lastThresholdLin !== effectiveThresholdLin) {
                const LOOKUP_SIZE = 1024;
                const MAX_ABS_VALUE = 10.0; // Maximum expected absolute sample value
                
                if (!context.thresholdDivLookup) {
                    context.thresholdDivLookup = new Float32Array(LOOKUP_SIZE);
                }
                
                for (let i = 0; i < LOOKUP_SIZE; i++) {
                    const absSample = (i / LOOKUP_SIZE) * MAX_ABS_VALUE;
                    if (absSample <= 1e-6) {
                        context.thresholdDivLookup[i] = 1.0; // Avoid division by zero
                    } else if (absSample > effectiveThresholdLin) {
                        context.thresholdDivLookup[i] = effectiveThresholdLin / absSample;
                    } else {
                        context.thresholdDivLookup[i] = 1.0;
                    }
                }
                
                context.lastThresholdLin = effectiveThresholdLin;
                context.thresholdLookupScale = LOOKUP_SIZE / MAX_ABS_VALUE;
            }
            
            // Fast lookup function for threshold division
            function fastThresholdDiv(absSample) {
                if (absSample <= 1e-6) return 1.0;
                if (absSample > effectiveThresholdLin) {
                    // For very large values outside the lookup range, calculate directly
                    if (absSample > 10.0) return effectiveThresholdLin / absSample;
                    
                    // Use lookup table for common range
                    const idx = Math.min(
                        context.thresholdDivLookup.length - 1, 
                        Math.floor(absSample * context.thresholdLookupScale)
                    );
                    return context.thresholdDivLookup[idx];
                }
                return 1.0;
            }
            
            // Processing for no oversampling (os === 1)
            if (parameters.os === 1) {
                if (!context.initialized) {
                    const delaySamples = Math.ceil(parameters.la * sampleRate / 1000);
                    context.delayLength = delaySamples + blockSize;
                    context.delayWritePos = 0;
                    context.delayBuffers = [];
                    for (let ch = 0; ch < numChannels; ch++) {
                        context.delayBuffers[ch] = new Float32Array(context.delayLength).fill(0);
                    }
                    context.gainStates = new Float32Array(numChannels).fill(1);
                    context.initialized = true;
                }
                
                // Reuse output buffer if it exists or create a new one
                if (!context.outputBuffer || context.outputBuffer.length !== data.length) {
                    context.outputBuffer = new Float32Array(data.length);
                }
                let output = context.outputBuffer;
                
                // Process each channel with optimized block processing
                for (let ch = 0; ch < numChannels; ch++) {
                    const chOffset = ch * blockSize;
                    let currentGain = context.gainStates[ch];
                    const delayBuffer = context.delayBuffers[ch];
                    let writePos = context.delayWritePos;
                    
                    // Process in blocks of 4 samples for better cache performance
                    const blockSizeMod4 = blockSize & ~3;
                    let i = 0;
                    
                    for (; i < blockSizeMod4; i += 4) {
                        // Sample 1
                        let pos = (writePos + i) % context.delayLength;
                        let delayedSample = delayBuffer[pos];
                        delayBuffer[pos] = inputBuffer[chOffset + i];
                        let absSample = Math.abs(delayedSample);
                        let targetGain = fastThresholdDiv(absSample);
                        let newGain = (targetGain < currentGain) 
                            ? targetGain 
                            : (releaseCoeffSample * currentGain + (1 - releaseCoeffSample) * targetGain);
                        output[chOffset + i] = delayedSample * newGain;
                        
                        // Sample 2
                        pos = (writePos + i + 1) % context.delayLength;
                        delayedSample = delayBuffer[pos];
                        delayBuffer[pos] = inputBuffer[chOffset + i + 1];
                        absSample = Math.abs(delayedSample);
                        targetGain = fastThresholdDiv(absSample);
                        currentGain = newGain; // Use previous sample's gain as starting point
                        newGain = (targetGain < currentGain) 
                            ? targetGain 
                            : (releaseCoeffSample * currentGain + (1 - releaseCoeffSample) * targetGain);
                        output[chOffset + i + 1] = delayedSample * newGain;
                        
                        // Sample 3
                        pos = (writePos + i + 2) % context.delayLength;
                        delayedSample = delayBuffer[pos];
                        delayBuffer[pos] = inputBuffer[chOffset + i + 2];
                        absSample = Math.abs(delayedSample);
                        targetGain = fastThresholdDiv(absSample);
                        currentGain = newGain;
                        newGain = (targetGain < currentGain) 
                            ? targetGain 
                            : (releaseCoeffSample * currentGain + (1 - releaseCoeffSample) * targetGain);
                        output[chOffset + i + 2] = delayedSample * newGain;
                        
                        // Sample 4
                        pos = (writePos + i + 3) % context.delayLength;
                        delayedSample = delayBuffer[pos];
                        delayBuffer[pos] = inputBuffer[chOffset + i + 3];
                        absSample = Math.abs(delayedSample);
                        targetGain = fastThresholdDiv(absSample);
                        currentGain = newGain;
                        newGain = (targetGain < currentGain) 
                            ? targetGain 
                            : (releaseCoeffSample * currentGain + (1 - releaseCoeffSample) * targetGain);
                        output[chOffset + i + 3] = delayedSample * newGain;
                        
                        currentGain = newGain;
                    }
                    
                    // Handle remaining samples
                    for (; i < blockSize; i++) {
                        const pos = (writePos + i) % context.delayLength;
                        const delayedSample = delayBuffer[pos];
                        delayBuffer[pos] = inputBuffer[chOffset + i];
                        const absSample = Math.abs(delayedSample);
                        const targetGain = fastThresholdDiv(absSample);
                        const newGain = (targetGain < currentGain) 
                            ? targetGain 
                            : (releaseCoeffSample * currentGain + (1 - releaseCoeffSample) * targetGain);
                        currentGain = newGain;
                        output[chOffset + i] = delayedSample * newGain;
                    }
                    
                    // Store final gain state
                    context.gainStates[ch] = currentGain;
                }
                
                context.delayWritePos = (context.delayWritePos + blockSize) % context.delayLength;
                output.measurements = { time: parameters.time, gainReduction: 1 - Math.min(...context.gainStates) };
                return output;
            }
            
            // Oversampling Processing (os > 1) using Polyphase Filtering.
            const osFactor = parameters.os;
            const L = osFactor;
            
            // Recompute filter coefficients if needed.
            if (!context.filterCoeffs || context.osFactorCached !== osFactor) {
                delete context.upsampleState;
                delete context.downsampleState;
                
                const N = 63;
                const half = (N - 1) / 2;
                const beta = 5.0;
                
                // Pre-compute constants for optimization
                const PI = Math.PI;
                const betaSqrt = beta * beta;
                
                // Optimized sinc function with cached PI value
                function sinc(x) { 
                    return (Math.abs(x) < 1e-6) ? 1 : Math.sin(PI * x) / (PI * x); 
                }
                
                // Optimized Kaiser window function with lookup table for I0
                function kaiser(n, N, beta) {
                    const r = 2 * (n / (N - 1) - 0.5);
                    const rSquared = r * r;
                    
                    // More efficient I0 calculation using a lookup approach for common values
                    function I0(x) {
                        // For small x values, use Taylor series approximation
                        if (x < 3.75) {
                            let sum = 1.0;
                            let term = 1.0;
                            let y = (x / 3.75) * (x / 3.75);
                            
                            // Coefficients for the approximation
                            const coeffs = [
                                1.0, 3.5156229, 3.0899424, 1.2067492, 
                                0.2659732, 0.0360768, 0.0045813
                            ];
                            
                            for (let i = 1; i < coeffs.length; i++) {
                                term *= y;
                                sum += coeffs[i] * term;
                            }
                            return sum;
                        } else {
                            // For larger x values, use asymptotic expansion
                            const y = 3.75 / x;
                            let sum = 0.39894228;
                            let term = 1.0;
                            
                            // Coefficients for the approximation
                            const coeffs = [
                                0.01328592, 0.00225319, -0.00157565, 0.00916281,
                                -0.02057706, 0.02635537, -0.01647633, 0.00392377
                            ];
                            
                            for (let i = 0; i < coeffs.length; i++) {
                                term *= y;
                                sum += coeffs[i] * term;
                            }
                            
                            return sum * Math.exp(x) / Math.sqrt(x);
                        }
                    }
                    
                    const arg = beta * Math.sqrt(1 - rSquared);
                    const denominator = I0(beta);
                    return I0(arg) / denominator;
                }
                
                // Allocate filter coefficient array once
                const h = new Float32Array(N);
                
                // Calculate filter coefficients in a single pass
                let sumH = 0;
                for (let n = 0; n < N; n++) {
                    // Calculate sinc and kaiser window in one step
                    h[n] = osFactor * sinc((n - half) / osFactor) * kaiser(n, N, beta);
                    sumH += h[n];
                }
                
                // Normalize in a separate loop for better cache locality
                const normFactor = osFactor / sumH;
                for (let n = 0; n < N; n++) {
                    h[n] *= normFactor;
                }
                
                // Create polyphase decomposition with pre-allocated arrays
                const polyphase = new Array(L);
                for (let p = 0; p < L; p++) {
                    // Count coefficients for this phase
                    let coeffCount = 0;
                    for (let k = 0; p + L * k < N; k++) {
                        coeffCount++;
                    }
                    
                    // Pre-allocate the array for this phase
                    const phaseCoeffs = new Float32Array(coeffCount);
                    
                    // Fill the array
                    for (let k = 0, idx = 0; p + L * k < N; k++, idx++) {
                        phaseCoeffs[idx] = h[p + L * k];
                    }
                    
                    polyphase[p] = phaseCoeffs;
                }
                
                context.filterCoeffs = h;
                context.filterLength = N;
                context.polyphase = polyphase;
                context.osFactorCached = osFactor;
            }
            const N = context.filterLength;
            const polyphase = context.polyphase;
            
            // Upsampling (Polyphase Interpolation) - Optimized implementation
            // Find maximum filter phase length once
            let P_len = 0;
            for (let p = 0; p < L; p++) {
                P_len = Math.max(P_len, polyphase[p].length);
            }
            
            // Initialize upsample state if needed
            if (!context.upsampleState) {
                context.upsampleState = [];
                for (let ch = 0; ch < numChannels; ch++) {
                    context.upsampleState[ch] = new Float32Array(P_len - 1).fill(0);
                }
            }
            
            // Pre-calculate output length
            const oversampledLength = blockSize * L;
            
            // Reuse oversampled buffer if it exists or create a new one
            if (!context.oversampled || context.oversampled.length !== numChannels * oversampledLength) {
                context.oversampled = new Float32Array(numChannels * oversampledLength);
            }
            let oversampled = context.oversampled;
            
            // Process each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const inOffset = ch * blockSize;
                const state = context.upsampleState[ch];
                const stateLength = state.length;
                const combinedLength = stateLength + blockSize;
                
                // Reuse X buffer if it exists or create a new one
                if (!context.X || context.X.length < combinedLength) {
                    context.X = new Float32Array(combinedLength);
                }
                let X = context.X;
                
                // Copy state and input data to X
                X.set(state, 0);
                X.set(inputBuffer.subarray(inOffset, inOffset + blockSize), stateLength);
                
                // Calculate output offset for this channel
                const outOffset = ch * oversampledLength;
                
                // Process samples with loop unrolling and SIMD-friendly operations
                const startIdx = P_len - 1;
                const endIdx = combinedLength;
                
                // Main processing loop with optimizations
                for (let i = startIdx; i < endIdx; i++) {
                    const j = i - startIdx;
                    const baseOutIdx = outOffset + j * L;
                    
                    // Process each phase (unroll if L is known at compile time)
                    for (let p = 0; p < L; p++) {
                        const h_poly = polyphase[p];
                        const h_len = h_poly.length;
                        
                        // Use a local accumulator for better register usage
                        let acc = 0;
                        
                        // Process filter taps with loop unrolling for common sizes
                        if (h_len >= 8) {
                            // Unrolled loop for better instruction pipelining
                            let k = 0;
                            for (; k < h_len - 7; k += 8) {
                                acc += h_poly[k] * X[i - k];
                                acc += h_poly[k+1] * X[i - (k+1)];
                                acc += h_poly[k+2] * X[i - (k+2)];
                                acc += h_poly[k+3] * X[i - (k+3)];
                                acc += h_poly[k+4] * X[i - (k+4)];
                                acc += h_poly[k+5] * X[i - (k+5)];
                                acc += h_poly[k+6] * X[i - (k+6)];
                                acc += h_poly[k+7] * X[i - (k+7)];
                            }
                            
                            // Handle remaining taps
                            for (; k < h_len; k++) {
                                acc += h_poly[k] * X[i - k];
                            }
                        } else {
                            // For shorter filters, use a simple loop
                            for (let k = 0; k < h_len; k++) {
                                acc += h_poly[k] * X[i - k];
                            }
                        }
                        
                        // Store result
                        oversampled[baseOutIdx + p] = acc;
                    }
                }
                
                // Update state for next block
                state.set(X.subarray(combinedLength - stateLength, combinedLength));
            }
            
            // Initialize gain state for oversampled branch if needed.
            if (!context.gainStates) {
                context.gainStates = new Float32Array(numChannels).fill(1);
            }
            
            // Lookahead Delay in Oversampled Domain with sample-by-sample gain processing.
            const rawDelaySamplesOS = Math.ceil(parameters.la * sampleRate / 1000);
            const delaySamplesOS = (rawDelaySamplesOS > 0 ? rawDelaySamplesOS : 1) * osFactor;
            if (!context.delayBufferOS || context.delayBufferOS[0].length !== delaySamplesOS) {
                context.delayBufferOS = [];
                context.delayWritePosOS = [];
                for (let ch = 0; ch < numChannels; ch++) {
                    context.delayBufferOS[ch] = new Float32Array(delaySamplesOS).fill(0);
                    context.delayWritePosOS[ch] = 0;
                }
            }
            // Compute per-sample release coefficient for oversampled domain.
            const releaseCoeffSampleOS = Math.exp(- (1 / (sampleRate * osFactor)) / releaseTime);
            
            // Reuse processed oversampled buffer if it exists or create a new one
            if (!context.processedOversampled || context.processedOversampled.length !== numChannels * oversampledLength) {
                context.processedOversampled = new Float32Array(numChannels * oversampledLength);
            }
            let processedOversampled = context.processedOversampled;
            
            // Process each channel with optimized block processing in oversampled domain
            for (let ch = 0; ch < numChannels; ch++) {
                const buf = context.delayBufferOS[ch];
                let writePos = context.delayWritePosOS[ch];
                let currentGain = context.gainStates[ch];
                const osOffset = ch * oversampledLength;
                
                // Process in blocks of 8 samples for better cache performance
                const oversampledLengthMod8 = oversampledLength & ~7;
                let i = 0;
                
                for (; i < oversampledLengthMod8; i += 8) {
                    // Process 8 samples at once with loop unrolling
                    for (let j = 0; j < 8; j++) {
                        const pos = (writePos + i + j) % delaySamplesOS;
                        const delayedSample = buf[pos];
                        buf[pos] = oversampled[osOffset + i + j];
                        const absSample = Math.abs(delayedSample);
                        const targetGain = fastThresholdDiv(absSample);
                        const newGain = (targetGain < currentGain) 
                            ? targetGain 
                            : (releaseCoeffSampleOS * currentGain + (1 - releaseCoeffSampleOS) * targetGain);
                        currentGain = newGain;
                        processedOversampled[osOffset + i + j] = delayedSample * newGain;
                    }
                }
                
                // Handle remaining samples
                for (; i < oversampledLength; i++) {
                    const pos = (writePos + i) % delaySamplesOS;
                    const delayedSample = buf[pos];
                    buf[pos] = oversampled[osOffset + i];
                    const absSample = Math.abs(delayedSample);
                    const targetGain = fastThresholdDiv(absSample);
                    const newGain = (targetGain < currentGain) 
                        ? targetGain 
                        : (releaseCoeffSampleOS * currentGain + (1 - releaseCoeffSampleOS) * targetGain);
                    currentGain = newGain;
                    processedOversampled[osOffset + i] = delayedSample * newGain;
                }
                
                // Store final gain state
                context.gainStates[ch] = currentGain;
                context.delayWritePosOS[ch] = (writePos + oversampledLength) % delaySamplesOS;
            }
            
            // Downsampling (Polyphase Decimation) - Optimized implementation
            const M = Math.ceil(N / osFactor);
            const d = osFactor * (M - 1);
            const stateLength = d;
            
            // Initialize downsample state if needed
            if (!context.downsampleState) {
                context.downsampleState = [];
                for (let ch = 0; ch < numChannels; ch++) {
                    context.downsampleState[ch] = new Float32Array(stateLength).fill(0);
                }
            }
            
            // Reuse output buffer if it exists or create a new one
            if (!context.downsampledOutput || context.downsampledOutput.length !== numChannels * blockSize) {
                context.downsampledOutput = new Float32Array(numChannels * blockSize);
            }
            let downsampledOutput = context.downsampledOutput;
            
            // Pre-compute phase indices for each output sample
            if (!context.phaseIndices || context.phaseIndices.length !== blockSize) {
                context.phaseIndices = new Uint32Array(blockSize);
                context.phaseRemainders = new Uint32Array(blockSize);
                
                for (let i = 0; i < blockSize; i++) {
                    const n_index = i * L + d;
                    context.phaseIndices[i] = n_index;
                    context.phaseRemainders[i] = n_index % L;
                }
            }
            
            // Process each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const osOffset = ch * oversampledLength;
                const state = context.downsampleState[ch];
                const combinedLength = state.length + oversampledLength;
                
                // Reuse Z buffer if it exists or create a new one
                if (!context.Z || context.Z.length < combinedLength) {
                    context.Z = new Float32Array(combinedLength);
                }
                let Z = context.Z;
                
                // Copy state and processed oversampled data to Z
                Z.set(state, 0);
                Z.set(processedOversampled.subarray(osOffset, osOffset + oversampledLength), state.length);
                
                // Calculate output offset for this channel
                const outOffset = ch * blockSize;
                
                // Process each output sample with optimized inner loop
                for (let i = 0; i < blockSize; i++) {
                    const n_index = context.phaseIndices[i];
                    const r = context.phaseRemainders[i];
                    const h_poly = polyphase[r];
                    const h_len = h_poly.length;
                    
                    // Use a local accumulator for better register usage
                    let acc = 0;
                    
                    // Process filter taps with loop unrolling for common sizes
                    if (h_len >= 8) {
                        // Unrolled loop for better instruction pipelining
                        let k = 0;
                        for (; k < h_len - 7; k += 8) {
                            const idx1 = n_index - L * k;
                            const idx2 = n_index - L * (k+1);
                            const idx3 = n_index - L * (k+2);
                            const idx4 = n_index - L * (k+3);
                            const idx5 = n_index - L * (k+4);
                            const idx6 = n_index - L * (k+5);
                            const idx7 = n_index - L * (k+6);
                            const idx8 = n_index - L * (k+7);
                            
                            // Check if all indices are valid
                            if (idx8 < 0) break;
                            
                            acc += h_poly[k] * Z[idx1];
                            acc += h_poly[k+1] * Z[idx2];
                            acc += h_poly[k+2] * Z[idx3];
                            acc += h_poly[k+3] * Z[idx4];
                            acc += h_poly[k+4] * Z[idx5];
                            acc += h_poly[k+5] * Z[idx6];
                            acc += h_poly[k+6] * Z[idx7];
                            acc += h_poly[k+7] * Z[idx8];
                        }
                        
                        // Handle remaining taps
                        for (; k < h_len; k++) {
                            const idx = n_index - L * k;
                            if (idx < 0) break;
                            acc += h_poly[k] * Z[idx];
                        }
                    } else {
                        // For shorter filters, use a simple loop with early termination
                        for (let k = 0; k < h_len; k++) {
                            const idx = n_index - L * k;
                            if (idx < 0) break;
                            acc += h_poly[k] * Z[idx];
                        }
                    }
                    
                    // Store result
                    downsampledOutput[outOffset + i] = acc;
                }
                
                // Update state for next block
                state.set(Z.subarray(combinedLength - stateLength, combinedLength));
            }
            
            downsampledOutput.measurements = {
                time: parameters.time,
                gainReduction: 1 - Math.min(...context.gainStates)
            };
            context.initialized = true;
            return downsampledOutput;
        `);
    }
    
    _setupMessageHandler() {
        // No additional message handling required.
    }
    
    _validateParameters(params) {
        super._validateParameters(params);
        const validateRange = (value, min, max, name) => {
            if (typeof value !== "number" || isNaN(value) || value < min || value > max) {
                throw new Error(name + " must be between " + min + " and " + max);
            }
        };
        if (params.th !== undefined) { validateRange(params.th, -24, 0, "Threshold"); }
        if (params.rl !== undefined) { validateRange(params.rl, 10, 500, "Release Time"); }
        if (params.la !== undefined) { validateRange(params.la, 0, 10, "Lookahead Time"); }
        if (params.os !== undefined) {
            if (![1, 2, 4, 8].includes(params.os)) {
                throw new Error("Oversampling Factor must be 1, 2, 4, or 8");
            }
        }
        if (params.ig !== undefined) { validateRange(params.ig, -18, 18, "Input Gain"); }
        if (params.sm !== undefined) { validateRange(params.sm, -3.00, 0.00, "Margin"); }
    }
    
    _setValidatedParameters(params) {
        if (params.th !== undefined) this.th = params.th;
        if (params.rl !== undefined) this.rl = params.rl;
        if (params.la !== undefined) this.la = params.la;
        if (params.os !== undefined) this.os = params.os;
        if (params.ig !== undefined) this.ig = params.ig;
        if (params.sm !== undefined) this.sm = params.sm;
        this.updateParameters();
    }
    
    getParameters() {
        const baseParams = super.getParameters();
        return {
            ...baseParams,
            enabled: this.enabled,
            th: this.th,
            rl: this.rl,
            la: this.la,
            os: this.os,
            ig: this.ig,
            sm: this.sm
        };
    }
    
    setTh(value) { this.setParameters({ th: value }); }
    setRl(value) { this.setParameters({ rl: value }); }
    setLa(value) { this.setParameters({ la: value }); }
    setOs(value) { this.setParameters({ os: value }); }
    setIg(value) { this.setParameters({ ig: value }); }
    setSm(value) { this.setParameters({ sm: value }); }
    
    createUI() {
        const container = document.createElement("div");
        container.className = "plugin-parameter-ui";
        const createControl = (label, min, max, step, value, setter) => {
            const row = document.createElement("div");
            row.className = "parameter-row";
            const labelEl = document.createElement("label");
            labelEl.textContent = label;
            const slider = document.createElement("input");
            slider.type = "range";
            slider.min = min; slider.max = max; slider.step = step; slider.value = value;
            const numberInput = document.createElement("input");
            numberInput.type = "number";
            numberInput.min = min; numberInput.max = max; numberInput.step = step; numberInput.value = value;
            slider.addEventListener("input", (e) => { setter(parseFloat(e.target.value)); numberInput.value = e.target.value; });
            numberInput.addEventListener("input", (e) => {
                const val = parseFloat(e.target.value) || 0;
                const clamped = Math.max(min, Math.min(max, val));
                setter(clamped);
                slider.value = clamped;
                e.target.value = clamped;
            });
            row.appendChild(labelEl);
            row.appendChild(slider);
            row.appendChild(numberInput);
            return row;
        };
        container.appendChild(createControl("Input Gain (dB):", -18, 18, 0.1, this.ig, this.setIg.bind(this)));
        container.appendChild(createControl("Threshold (dB):", -24, 0, 0.1, this.th, this.setTh.bind(this)));
        container.appendChild(createControl("Release (ms):", 10, 500, 1, this.rl, this.setRl.bind(this)));
        container.appendChild(createControl("Lookahead (ms):", 0, 10, 0.1, this.la, this.setLa.bind(this)));
        container.appendChild(createControl("Margin (dB):", -1.000, 0.000, 0.001, this.sm, this.setSm.bind(this)));
        const osRow = document.createElement("div");
        osRow.className = "parameter-row";
        const osLabel = document.createElement("label");
        osLabel.textContent = "Oversampling:";
        osRow.appendChild(osLabel);
        const osSelect = document.createElement("select");
        [1,2,4,8].forEach(factor => {
            const option = document.createElement("option");
            option.value = factor;
            option.textContent = factor + "x";
            if (factor === this.os) { option.selected = true; }
            osSelect.appendChild(option);
        });
        osSelect.addEventListener("change", () => {
            this.setParameters({ os: parseInt(osSelect.value) });
        });
        osRow.appendChild(osSelect);
        container.appendChild(osRow);
        return container;
    }
}
  
window.BrickwallLimiterPlugin = BrickwallLimiterPlugin;
