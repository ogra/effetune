class AutoLevelerPlugin extends PluginBase {
    constructor() {
        super('Auto Leveler', 'Automatic level control based on LUFS measurement');

        // Initialize parameters with default values
        this.tg = -18.0;  // tg: Target LUFS (-36.0 to 0.0 dB)
        this.tw = 3000;   // tw: Time Window (1000 to 10000 ms)
        this.mg = 0.0;    // mg: Max Gain (0.0 to 12.0 dB)
        this.ng = -12.0;  // ng: Min Gain (-36.0 to 0.0 dB)
        this.at = 50;     // at: Attack Time (1 to 1000 ms)
        this.rt = 5000;   // rt: Release Time (10 to 10000 ms)
        this.gt = -60;    // gt: Noise Gate (-96 to -24 dB)

        // Internal state
        this.currentGain = 1.0;
        this.lastProcessTime = performance.now() / 1000;

        // Graph state
        this.canvas = null;
        this.canvasCtx = null;
        this.boundEventListeners = new Map();
        this.animationFrameId = null;

        // LUFS history buffers (1024 points) initialized with NaN so that no initial bottom line is drawn
        this.inputLufsBuffer = new Float32Array(1024).fill(NaN);
        this.outputLufsBuffer = new Float32Array(1024).fill(NaN);

        this.registerProcessor(`
            // Skip processing if disabled
            if (!parameters.enabled) {
                const result = new Float32Array(data.length);
                result.set(data);
                return result;
            }

            // Initialize or reset context state if needed
            if (!context.initialized || context.sampleRate !== parameters.sampleRate) {
                const windowSamples = Math.floor((parameters.tw / 1000) * parameters.sampleRate);
                context.buffer = new Float32Array(windowSamples);
                context.bufferIndex = 0;
                context.bufferFilled = false;
                context.sampleRate = parameters.sampleRate;
                context.sum = 0;
                context.currentGain = 1.0;
                // Initialize K-weighting filter state for mono signal
                context.kfilter = {
                    pre: { x1: 0, x2: 0, y1: 0, y2: 0 },
                    shelf: { x1: 0, x2: 0, y1: 0, y2: 0 }
                };
                // Initialize mono buffer for block processing
                context.monoBuffer = new Float32Array(parameters.blockSize);
                context.weightedBuffer = new Float32Array(parameters.blockSize);
                context.initialized = true;
                context.lastLufs = -70;
                context.lastOutputLufs = -70;
                // Pre-compute linear thresholds to avoid repeated conversions
                context.noiseGateLinear = Math.pow(10, parameters.gt / 10); // -60dB -> 1e-6 linear
                context.targetLufsLinear = Math.pow(10, parameters.tg / 10); // -18dB -> ~0.016 linear
            }

            const result = new Float32Array(data.length);
            const blockSize = parameters.blockSize;
            const channelCount = parameters.channelCount;
            const windowSamples = Math.floor((parameters.tw / 1000) * parameters.sampleRate);

            // Define K-weighting filter coefficients (commonly used for 48kHz)
            // Pre-filter (high-pass filter)
            const preB = [1.0, -2.0, 1.0];
            const preA = [1.0, -1.99004745483398, 0.99007225036621];
            // Shelf filter (high-frequency boost)
            const shelfB = [1.53512485958697, -2.69169618940638, 1.19839281085285];
            const shelfA = [1.0, -1.69065929318241, 0.73248077421585];

            // Calculate attack and release coefficients
            const attackSamples = Math.max(1, (parameters.at * parameters.sampleRate) / 1000);
            const releaseSamples = Math.max(1, (parameters.rt * parameters.sampleRate) / 1000);
            const attackCoeff = Math.exp(-Math.LN2 / attackSamples);
            const releaseCoeff = Math.exp(-Math.LN2 / releaseSamples);

            // Pre-compute linear min/max gain values
            const maxGainLinear = Math.pow(10, parameters.mg / 20);
            const minGainLinear = Math.pow(10, parameters.ng / 20);
            
            // Convert noise gate threshold to linear domain
            const noiseGateLinear = Math.pow(10, parameters.gt / 10);
            const targetLufsLinear = Math.pow(10, parameters.tg / 10);

            // Step 1: Create mono mix for the entire block more efficiently
            // First clear the mono buffer
            context.monoBuffer.fill(0);
            
            // Then add each channel's contribution
            for (let ch = 0; ch < channelCount; ch++) {
                const offset = ch * blockSize;
                for (let i = 0; i < blockSize; i++) {
                    context.monoBuffer[i] += data[offset + i];
                }
            }
            
            // Finally, divide by channel count to get the mono mix
            if (channelCount > 1) {
                const scale = 1 / channelCount;
                for (let i = 0; i < blockSize; i++) {
                    context.monoBuffer[i] *= scale;
                }
            }

            // Step 2: Apply K-weighting filters to the entire mono block
            // Optimized biquad filter implementation for block processing
            function processBlockBiquad(input, output, state, b, a) {
                const len = input.length;
                
                // Use local variables for state and coefficients for faster access
                let x1 = state.x1, x2 = state.x2, y1 = state.y1, y2 = state.y2;
                const b0 = b[0], b1 = b[1], b2 = b[2];
                const a1 = a[1], a2 = a[2];
                
                // Process in chunks of 4 samples when possible for better loop optimization
                const mainLoopEnd = len - (len % 4);
                
                // Main loop - process 4 samples at a time
                for (let i = 0; i < mainLoopEnd; i += 4) {
                    // Sample 1
                    let x = input[i];
                    let y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
                    x2 = x1; x1 = x; y2 = y1; y1 = y;
                    output[i] = y;
                    
                    // Sample 2
                    x = input[i + 1];
                    y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
                    x2 = x1; x1 = x; y2 = y1; y1 = y;
                    output[i + 1] = y;
                    
                    // Sample 3
                    x = input[i + 2];
                    y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
                    x2 = x1; x1 = x; y2 = y1; y1 = y;
                    output[i + 2] = y;
                    
                    // Sample 4
                    x = input[i + 3];
                    y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
                    x2 = x1; x1 = x; y2 = y1; y1 = y;
                    output[i + 3] = y;
                }
                
                // Handle remaining samples
                for (let i = mainLoopEnd; i < len; i++) {
                    const x = input[i];
                    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
                    
                    // Update state
                    x2 = x1;
                    x1 = x;
                    y2 = y1;
                    y1 = y;
                    
                    output[i] = y;
                }
                
                // Save state back to the object
                state.x1 = x1;
                state.x2 = x2;
                state.y1 = y1;
                state.y2 = y2;
            }
            
            // Apply K-weighting filters in sequence
            // First apply pre-filter (high-pass)
            processBlockBiquad(context.monoBuffer, context.weightedBuffer, context.kfilter.pre, preB, preA);
            // Then apply shelf filter (high-frequency boost)
            processBlockBiquad(context.weightedBuffer, context.weightedBuffer, context.kfilter.shelf, shelfB, shelfA);

            // Step 3: Calculate squared values for the entire block at once
            const weightedSquared = new Float32Array(blockSize);
            for (let i = 0; i < blockSize; i++) {
                weightedSquared[i] = context.weightedBuffer[i] * context.weightedBuffer[i];
            }
            
            // Step 4: Update LUFS measurement buffer and calculate current LUFS
            // We'll use a more efficient approach for buffer management
            let currentLUFS = -70;
            let currentLufsLinear = 0;
            
            // Calculate how many samples we can process before wrapping around the buffer
            const remainingInBuffer = windowSamples - context.bufferIndex;
            const firstChunkSize = Math.min(blockSize, remainingInBuffer);
            const secondChunkSize = blockSize - firstChunkSize;
            
            // Calculate sum changes in one pass
            let sumChange = 0;
            
            // Process first chunk (up to buffer wrap point)
            const bufferStartIndex = context.bufferIndex;
            for (let i = 0; i < firstChunkSize; i++) {
                const bufferIndex = bufferStartIndex + i;
                sumChange -= context.buffer[bufferIndex];
                sumChange += weightedSquared[i];
                context.buffer[bufferIndex] = weightedSquared[i];
            }
            
            // Process second chunk (after buffer wrap) if needed
            if (secondChunkSize > 0) {
                for (let i = 0; i < secondChunkSize; i++) {
                    sumChange -= context.buffer[i];
                    sumChange += weightedSquared[firstChunkSize + i];
                    context.buffer[i] = weightedSquared[firstChunkSize + i];
                }
                context.bufferFilled = true;
            }
            
            // Update buffer index and sum in one operation
            context.sum += sumChange;
            context.bufferIndex = (context.bufferIndex + blockSize) % windowSamples;
            
            // Mark buffer as filled if we've wrapped around
            if (context.bufferIndex === 0 || secondChunkSize > 0) {
                context.bufferFilled = true;
            }
            
            // Calculate current LUFS in linear domain
            const validSamples = context.bufferFilled ? windowSamples : context.bufferIndex;
            if (validSamples > 0 && context.sum > 0) {
                // Store linear value (mean square of the K-weighted signal)
                currentLufsLinear = context.sum / validSamples;
                
                // Convert to dB only for measurement output
                // LUFS = 10 * log10(mean square) - 0.691
                currentLUFS = 10 * Math.log10(currentLufsLinear) - 0.691;
            }
            context.lastLufs = currentLUFS;
            
            // Step 5: Calculate target gain (once per block)
            let targetGainLinear;
            if (currentLufsLinear < noiseGateLinear) {
                targetGainLinear = 1.0; // Below noise gate threshold, no gain change
            } else {
                // In linear domain: targetGain = targetLevel / currentLevel
                targetGainLinear = targetLufsLinear / currentLufsLinear;
                // Apply square root because we're working with energy (squared values)
                targetGainLinear = Math.sqrt(targetGainLinear);
            }
            
            // Apply min/max gain limits
            targetGainLinear = Math.min(maxGainLinear, Math.max(minGainLinear, targetGainLinear));
            
            // Step 6: Apply smoothed gain to all samples
            // We'll use a more efficient approach for gain smoothing
            // Pre-calculate gain values for each sample in the block
            const gainValues = new Float32Array(blockSize);
            let currentGain = context.currentGain;
            
            for (let i = 0; i < blockSize; i++) {
                // Use Attack Time when gain is lowered, Release Time when gain is increased
                const coeff = targetGainLinear < currentGain ? attackCoeff : releaseCoeff;
                currentGain = currentGain * coeff + targetGainLinear * (1 - coeff);
                gainValues[i] = currentGain;
            }
            
            // Store the final gain value for the next block
            context.currentGain = currentGain;
            
            // Compute output LUFS for measurement only (using the final gain value)
            context.lastOutputLufs = currentLUFS + 20 * Math.log10(context.currentGain);
            
            // Step 6: Apply gain to all channels more efficiently
            // Process each channel in a single pass
            for (let ch = 0; ch < channelCount; ch++) {
                const offset = ch * blockSize;
                
                // Apply gain to this channel's samples
                for (let i = 0; i < blockSize; i++) {
                    result[offset + i] = data[offset + i] * gainValues[i];
                }
            }

            // Send LUFS measurements to UI only when at least 1 sample exist
            if ((context.bufferFilled || context.bufferIndex > 0)) {
                result.measurements = {
                    inputLufs: context.lastLufs,
                    outputLufs: context.lastOutputLufs,
                    time: time
                };
            }

            return result;
        `);
    }

    onMessage(message) {
        if (message.type === 'processBuffer' && message.measurements) {
            // Update LUFS history buffers by shifting left one element
            this.inputLufsBuffer.copyWithin(0, 1);
            this.outputLufsBuffer.copyWithin(0, 1);
            this.inputLufsBuffer[this.inputLufsBuffer.length - 1] = message.measurements.inputLufs;
            this.outputLufsBuffer[this.outputLufsBuffer.length - 1] = message.measurements.outputLufs;
        }
    }

    getParameters() {
        return {
            type: this.constructor.name,
            enabled: this.enabled,
            tg: this.tg,
            tw: this.tw,
            mg: this.mg,
            ng: this.ng,
            at: this.at,
            rt: this.rt,
            gt: this.gt
        };
    }

    setParameters(params) {
        if (params.tg !== undefined) {
            this.tg = Math.max(-36.0, Math.min(0.0, params.tg));
        }
        if (params.tw !== undefined) {
            this.tw = Math.max(1000, Math.min(10000, params.tw));
        }
        if (params.mg !== undefined) {
            this.mg = Math.max(0.0, Math.min(12.0, params.mg));
        }
        if (params.ng !== undefined) {
            this.ng = Math.max(-36.0, Math.min(0.0, params.ng));
        }
        if (params.at !== undefined) {
            this.at = Math.max(1, Math.min(1000, params.at));
        }
        if (params.rt !== undefined) {
            this.rt = Math.max(10, Math.min(10000, params.rt));
        }
        if (params.gt !== undefined) {
            this.gt = Math.max(-96, Math.min(-24, params.gt));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    // Individual parameter setters
    setTg(value) { this.setParameters({ tg: value }); }
    setTw(value) { this.setParameters({ tw: value }); }
    setMg(value) { this.setParameters({ mg: value }); }
    setNg(value) { this.setParameters({ ng: value }); }
    setAt(value) { this.setParameters({ at: value }); }
    setRt(value) { this.setParameters({ rt: value }); }
    setGt(value) { this.setParameters({ gt: value }); }

    startAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        const animate = () => {
            if (!this.canvas) return;
            this.drawGraph();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        this.animationFrameId = requestAnimationFrame(animate);
    }

    drawGraph() {
        if (!this.canvasCtx) return;
        const ctx = this.canvasCtx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);

        // Draw grid lines and labels
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.textAlign = 'right';
        ctx.font = '24px Arial';
        ctx.fillStyle = '#ccc';

        // Draw horizontal grid lines (6dB steps from -42dB to -6dB)
        for (let db = -42; db <= -6; db += 6) {
            const y = height * (1 - (db + 48) / 48);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            ctx.fillText(`${db}`, 160, y + 12);
        }

        // Draw axis labels
        ctx.save();
        ctx.font = '28px Arial';
        ctx.translate(40, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('LUFS (dB)', 0, 0);
        ctx.restore();

        ctx.textAlign = 'center';
        ctx.fillText('Time', width / 2, height - 10);

        // Draw LUFS history; skip segments with NaN values
        const drawLufs = (buffer, color) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            let started = false;
            for (let i = 0; i < buffer.length; i++) {
                const value = buffer[i];
                if (isNaN(value)) continue;
                const clamped = Math.max(-48, Math.min(0, value));
                const x = width * i / buffer.length;
                const y = height * (1 - (clamped + 48) / 48);
                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
            if (started) {
                ctx.stroke();
            }
        };

        // Draw input LUFS (green)
        drawLufs(this.inputLufsBuffer, '#00ff00');
        // Draw output (Auto Leveler後) LUFS (white)
        drawLufs(this.outputLufsBuffer, '#ffffff');
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'plugin-parameter-ui';

        // Utility function to create a parameter row with a slider and number input
        const createRow = (labelText, type, min, max, step, value, onChange) => {
            const row = document.createElement('div');
            row.className = 'parameter-row';
            
            // Create a parameter name from the label (e.g., "Target (dB LUFS):" -> "targetdblufs")
            // Include more of the label to ensure uniqueness
            const paramName = labelText.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            const sliderId = `${this.id}-${this.name}-${paramName}-slider`;
            const inputId = `${this.id}-${this.name}-${paramName}-input`;
            
            const label = document.createElement('label');
            label.textContent = labelText;
            label.htmlFor = sliderId;
            
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = sliderId;
            slider.name = sliderId;
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = value;
            slider.autocomplete = "off";
            
            const input = document.createElement('input');
            input.type = type;
            input.id = inputId;
            input.name = inputId;
            input.min = min;
            input.max = max;
            input.step = step;
            input.value = value;
            input.autocomplete = "off";
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                onChange(val);
                input.value = val;
            });
            input.addEventListener('input', (e) => {
                let val = parseFloat(e.target.value) || 0;
                if (val < min) val = min;
                if (val > max) val = max;
                onChange(val);
                slider.value = val;
                e.target.value = val;
            });
            row.appendChild(label);
            row.appendChild(slider);
            row.appendChild(input);
            return row;
        };

        // Create parameter rows
        container.appendChild(createRow('Target (dB LUFS):', 'number', '-36.0', '0.0', '0.1', this.tg, (value) => this.setParameters({ tg: value })));
        container.appendChild(createRow('Time Window (ms):', 'number', '1000', '10000', '10', this.tw, (value) => this.setParameters({ tw: value })));
        container.appendChild(createRow('Max Gain (dB):', 'number', '0.0', '12.0', '0.1', this.mg, (value) => this.setParameters({ mg: value })));
        container.appendChild(createRow('Min Gain (dB):', 'number', '-36.0', '0.0', '0.1', this.ng, (value) => this.setParameters({ ng: value })));
        container.appendChild(createRow('Attack Time (ms):', 'number', '1', '1000', '1', this.at, (value) => this.setParameters({ at: value })));
        container.appendChild(createRow('Release Time (ms):', 'number', '10', '10000', '10', this.rt, (value) => this.setParameters({ rt: value })));
        container.appendChild(createRow('Noise Gate (dB):', 'number', '-96', '-24', '1', this.gt, (value) => this.setParameters({ gt: value })));

        // Create graph container
        const graphContainer = document.createElement('div');
        graphContainer.className = 'auto-leveler-graph';
        
        // Create canvas with same resolution as spectrogram
        this.canvas = document.createElement('canvas');
        this.canvas.width = 2048;
        this.canvas.height = 300;
        graphContainer.appendChild(this.canvas);

        // Initialize canvas context
        this.canvasCtx = this.canvas.getContext('2d');
        
        container.appendChild(graphContainer);
        
        // Start animation
        this.startAnimation();

        return container;
    }

    cleanup() {
        this.currentGain = 1.0;
        this.lastProcessTime = performance.now() / 1000;

        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Remove event listeners
        for (const [element, listener] of this.boundEventListeners) {
            element.removeEventListener('input', listener);
            element.removeEventListener('change', listener);
        }
        this.boundEventListeners.clear();

        // Release canvas resources
        if (this.canvas) {
            this.canvas.width = 0;
            this.canvas.height = 0;
            this.canvas = null;
        }
        this.canvasCtx = null;

        // Reset buffers to NaN so that initial graph is blank
        this.inputLufsBuffer.fill(NaN);
        this.outputLufsBuffer.fill(NaN);
    }
}

window.AutoLevelerPlugin = AutoLevelerPlugin;
