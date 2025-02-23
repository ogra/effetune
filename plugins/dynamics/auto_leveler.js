class AutoLevelerPlugin extends PluginBase {
    constructor() {
        super('Auto Leveler', 'Automatic level control based on LUFS measurement');

        // Initialize parameters with default values
        this.tg = -18.0;  // tg: Target LUFS (-36.0 to 0.0 dB)
        this.tw = 3000;   // tw: Time Window (1000 to 10000 ms)
        this.mg = 0.0;    // mg: Max Gain (0.0 to 12.0 dB)
        this.ng = -12.0;  // ng: Min Gain (-36.0 to 0.0 dB)
        this.at = 50;     // at: Attack Time (1 to 1000 ms)
        this.rt = 1000;   // rt: Release Time (10 to 10000 ms)
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
                context.initialized = true;
                context.lastLufs = -70;
                context.lastOutputLufs = -70;
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

            // Biquad filter function
            function biquad(x, state, b, a) {
                const y = b[0] * x + b[1] * state.x1 + b[2] * state.x2 - a[1] * state.y1 - a[2] * state.y2;
                state.x2 = state.x1;
                state.x1 = x;
                state.y2 = state.y1;
                state.y1 = y;
                return y;
            }

            // Calculate attack and release coefficients
            const attackSamples = Math.max(1, (parameters.at * parameters.sampleRate) / 1000);
            const releaseSamples = Math.max(1, (parameters.rt * parameters.sampleRate) / 1000);
            const attackCoeff = Math.exp(-Math.LN2 / attackSamples);
            const releaseCoeff = Math.exp(-Math.LN2 / releaseSamples);

            // Process each sample
            for (let i = 0; i < blockSize; i++) {
                // Calculate mono sum for this sample
                let monoSum = 0;
                for (let ch = 0; ch < channelCount; ch++) {
                    monoSum += data[ch * blockSize + i];
                }
                monoSum /= channelCount;

                // Apply K-weighting filter to the mono signal
                let weighted = biquad(monoSum, context.kfilter.pre, preB, preA);
                weighted = biquad(weighted, context.kfilter.shelf, shelfB, shelfA);

                // Update running sum and buffer with K-weighted value
                context.sum -= context.buffer[context.bufferIndex];
                context.sum += weighted * weighted;
                context.buffer[context.bufferIndex] = weighted * weighted;
                
                context.bufferIndex = (context.bufferIndex + 1) % windowSamples;
                if (context.bufferIndex === 0) {
                    context.bufferFilled = true;
                }

                // Calculate current LUFS (ITU-R BS.1770 approximation) based on K-weighted RMS
                let currentLUFS = -70;
                // Use current valid sample count even if buffer is not fully filled
                const validSamples = context.bufferFilled ? windowSamples : context.bufferIndex;
                if (validSamples > 0 && context.sum > 0) {
                    currentLUFS = 10 * Math.log10(context.sum / validSamples) - 0.691;
                }
                context.lastLufs = currentLUFS;

                // Apply noise gate
                const targetLUFS = currentLUFS < parameters.gt ? currentLUFS : parameters.tg;

                // Calculate target gain in dB
                let targetGainDB = 0;
                if (currentLUFS < parameters.gt) {
                    targetGainDB = 0; // Below noise gate threshold, no gain change
                } else {
                    targetGainDB = parameters.tg - currentLUFS;
                }
                targetGainDB = Math.min(parameters.mg, Math.max(parameters.ng, targetGainDB));

                // Convert target gain dB to linear and apply smoothing
                const targetGain = Math.pow(10, targetGainDB / 20);
                // Use Attack Time when gain is lowered, Release Time when gain is increased
                const coeff = targetGain < context.currentGain ? attackCoeff : releaseCoeff;
                context.currentGain = context.currentGain * coeff + targetGain * (1 - coeff);

                // Compute smoothed output LUFS using the smoothed gain
                context.lastOutputLufs = currentLUFS + 20 * Math.log10(context.currentGain);

                // Apply gain to all channels (processing original input)
                for (let ch = 0; ch < channelCount; ch++) {
                    result[ch * blockSize + i] = data[ch * blockSize + i] * context.currentGain;
                }
            }

            // Send LUFS measurements to UI only when at least1サンプル分が存在
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
            const label = document.createElement('label');
            label.textContent = labelText;
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = value;
            const input = document.createElement('input');
            input.type = type;
            input.min = min;
            input.max = max;
            input.step = step;
            input.value = value;
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
