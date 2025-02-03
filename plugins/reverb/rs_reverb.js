class RSReverbPlugin extends PluginBase {
    constructor() {
        super('RS Reverb', 'Random scattering reverb with natural diffusion');

        // Initialize parameters with defaults
        this.pd = 10;     // Pre-Delay (ms)
        this.rs = 10.0;   // Room Size (m)
        this.rt = 2.4;    // Reverb Time (s)
        this.ds = 8;      // Density (4-8)
        this.df = 0.7;    // Diffusion (0.2-0.8)
        this.dp = 80;     // Damping (%)
        this.hd = 2000;   // High Damp (Hz)
        this.ld = 200;    // Low Damp (Hz)
        this.mx = 16;     // Wet/Dry Mix (%)

        // Initialize state variables
        this.lastProcessTime = performance.now() / 1000;

        // Register processor function
        this.registerProcessor(`
            // Skip processing if disabled
            if (!parameters.enabled) return data;

            const channelCount = parameters.channelCount;
            const blockSize = parameters.blockSize;

            // Initialize context state if needed
            if (!context.initialized || context.sampleRate !== sampleRate) {
                context.sampleRate = sampleRate;
                const maxPreDelay = Math.ceil(sampleRate * 0.05); // 50ms

                // Pre-delay buffer
                context.preDelayBuffer = [];
                for (let ch = 0; ch < channelCount; ch++) {
                    context.preDelayBuffer.push({ buffer: new Float32Array(maxPreDelay), pos: 0 });
                }

                // Initialize base delays and randomize them once
                const baseDelays = [19, 29, 41, 47, 23, 31, 37, 43];
                context.randomizedDelays = baseDelays.map(delay => delay + Math.random());

                // Initialize comb filters using stored randomized delays
                context.combFilters = [];
                for (let ch = 0; ch < channelCount; ch++) {
                    const combs = [];
                    for (let j = 0; j < context.randomizedDelays.length; j++) {
                        const delay = context.randomizedDelays[j];
                        const bufferLength = Math.ceil(delay * sampleRate * 0.001); // Convert ms to seconds
                        combs.push({ buffer: new Float32Array(bufferLength), pos: 0, hdState: 0, ldState: 0 });
                    }
                    context.combFilters.push(combs);
                }

                // Initialize allpass filters
                const apfDelay = Math.ceil(0.005 * sampleRate); // 5ms
                context.allpassFilters = [];
                for (let ch = 0; ch < channelCount; ch++) {
                    const apfs = [];
                    for (let j = 0; j < 2; j++) {
                        apfs.push({ buffer: new Float32Array(apfDelay), pos: 0, lastOutput: 0 });
                    }
                    context.allpassFilters.push(apfs);
                }

                // Initialize damping filter states per channel
                context.hdStates = new Float32Array(channelCount);
                context.ldStates = new Float32Array(channelCount);

                context.initialized = true;
            }

            // Reset if channel count changes
            if (context.preDelayBuffer.length !== channelCount) {
                const maxPreDelay = Math.ceil(context.sampleRate * 0.05);
                context.preDelayBuffer = [];
                for (let ch = 0; ch < channelCount; ch++) {
                    context.preDelayBuffer.push({ buffer: new Float32Array(maxPreDelay), pos: 0 });
                }

                context.combFilters = [];
                for (let ch = 0; ch < channelCount; ch++) {
                    const combs = [];
                    for (let j = 0; j < context.randomizedDelays.length; j++) {
                        const delay = context.randomizedDelays[j];
                        const bufferLength = Math.ceil(delay * context.sampleRate * 0.001);
                        combs.push({ buffer: new Float32Array(bufferLength), pos: 0, hdState: 0, ldState: 0 });
                    }
                    context.combFilters.push(combs);
                }

                context.hdStates = new Float32Array(channelCount);
                context.ldStates = new Float32Array(channelCount);

                const apfDelay = Math.ceil(0.005 * context.sampleRate);
                context.allpassFilters = [];
                for (let ch = 0; ch < channelCount; ch++) {
                    const apfs = [];
                    for (let j = 0; j < 2; j++) {
                        apfs.push({ buffer: new Float32Array(apfDelay), pos: 0, lastOutput: 0 });
                    }
                    context.allpassFilters.push(apfs);
                }
            }

            // Pre-calculate coefficients for the block
            const hdCoeff = Math.exp(-2 * Math.PI * parameters.hd / context.sampleRate);
            const ldCoeff = 1 - Math.exp(-2 * Math.PI * parameters.ld / context.sampleRate);
            const dampAmount = parameters.dp / 100;
            const numActiveCombs = parameters.ds;
            const normalizationFactor = 0.4 / Math.max(1, numActiveCombs);
            const df = parameters.df;
            const mx = parameters.mx;
            const wetMix = mx / 100;
            const dryGain = wetMix <= 0.5 ? 1.0 : 2.0 * (1.0 - wetMix);
            const wetGain = wetMix <= 0.5 ? 2.0 * wetMix : 1.0;

            // Pre-calculate feedback gains using stored randomized delays
            const feedbackGains = context.randomizedDelays.map(delay => {
                const delayTime = delay * 0.001;
                const gain = Math.pow(0.001, delayTime / parameters.rt);
                const roomScale = parameters.rs / 10.0;
                return Math.min(0.9, Math.max(-0.9, gain * roomScale));
            });

            // Process each channel
            for (let ch = 0; ch < channelCount; ch++) {
                const channelDataOffset = ch * blockSize;
                const preDelay = context.preDelayBuffer[ch];
                const combFilters = context.combFilters[ch];
                const allpassFilters = context.allpassFilters[ch];
                const numCombs = numActiveCombs;

                for (let i = 0; i < blockSize; i++) {
                    const input = data[channelDataOffset + i];
                    let output = 0;

                    // Apply pre-delay
                    const delayedInput = preDelay.buffer[preDelay.pos];
                    preDelay.buffer[preDelay.pos] = input;
                    preDelay.pos = (preDelay.pos + 1) % preDelay.buffer.length;

                    // Process through comb filters based on density
                    let combOut = 0;
                    for (let j = 0; j < numCombs; j++) {
                        const comb = combFilters[j];
                        const delayedSample = comb.buffer[comb.pos];

                        // Apply damping filters in series to feedback signal
                        comb.hdState = delayedSample + hdCoeff * (comb.hdState - delayedSample);
                        comb.ldState = comb.hdState + ldCoeff * (comb.ldState - comb.hdState);
                        const dampedSample = delayedSample * (1 - dampAmount) + comb.ldState * dampAmount;
                        comb.buffer[comb.pos] = delayedInput + dampedSample * feedbackGains[j];
                        comb.pos = (comb.pos + 1) % comb.buffer.length;
                        combOut += dampedSample;
                    }
                    output = combOut * normalizationFactor;

                    // Apply allpass filters for diffusion
                    for (let j = 0; j < 2; j++) {
                        const apf = allpassFilters[j];
                        const delaySample = apf.buffer[apf.pos];
                        const out = -(1 - df) * output + delaySample + df * apf.lastOutput;
                        apf.buffer[apf.pos] = output;
                        apf.pos = (apf.pos + 1) % apf.buffer.length;
                        apf.lastOutput = out;
                        output = out * (1 - df * df);
                    }

                    // Apply damping filters per channel if needed
                    if (parameters.dp > 0) {
                        context.hdStates[ch] = output + hdCoeff * (context.hdStates[ch] - output);
                        context.ldStates[ch] = output + ldCoeff * (context.ldStates[ch] - output);
                        output = output * (1 - dampAmount) +
                                 (context.hdStates[ch] * 0.5 + context.ldStates[ch] * 0.5) * dampAmount;
                    }

                    // Apply wet/dry mix
                    data[channelDataOffset + i] = input * dryGain + output * wetGain;
                }
            }

            return data;
        `);
    }

    // Get current parameters
    getParameters() {
        return {
            type: this.constructor.name,
            enabled: this.enabled,
            pd: this.pd,    // Pre-Delay
            rs: this.rs,    // Room Size
            rt: this.rt,    // Reverb Time
            ds: this.ds,    // Density
            df: this.df,    // Diffusion
            dp: this.dp,    // Damping
            hd: this.hd,    // High Damp
            ld: this.ld,    // Low Damp
            mx: this.mx     // Mix
        };
    }

    // Set parameters with validation
    setParameters(params) {
        if (params.pd !== undefined) this.pd = Math.max(0, Math.min(50, Number(params.pd)));
        if (params.rs !== undefined) this.rs = Math.max(2.0, Math.min(50.0, Number(params.rs)));
        if (params.rt !== undefined) this.rt = Math.max(0.1, Math.min(10.0, Number(params.rt)));
        if (params.ds !== undefined) this.ds = Math.max(4, Math.min(8, Math.floor(Number(params.ds))));
        if (params.df !== undefined) this.df = Math.max(0.2, Math.min(0.8, Number(params.df)));
        if (params.dp !== undefined) this.dp = Math.max(0, Math.min(100, Number(params.dp)));
        if (params.hd !== undefined) this.hd = Math.max(1000, Math.min(20000, Number(params.hd)));
        if (params.ld !== undefined) this.ld = Math.max(20, Math.min(500, Number(params.ld)));
        if (params.mx !== undefined) this.mx = Math.max(0, Math.min(100, Number(params.mx)));
        this.updateParameters();
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

        container.appendChild(createRow('Pre-Delay (ms):', 'number', '0', '50', '0.1', this.pd, (value) => this.setParameters({ pd: value })));
        container.appendChild(createRow('Room Size (m):', 'number', '2.0', '50.0', '0.1', this.rs, (value) => this.setParameters({ rs: value })));
        container.appendChild(createRow('Reverb Time (s):', 'number', '0.1', '10.0', '0.1', this.rt, (value) => this.setParameters({ rt: value })));
        container.appendChild(createRow('Density (lines):', 'number', '4', '8', '1', this.ds, (value) => this.setParameters({ ds: value })));
        container.appendChild(createRow('Diffusion (ratio):', 'number', '0.2', '0.8', '0.01', this.df, (value) => this.setParameters({ df: value })));
        container.appendChild(createRow('Damping (%):', 'number', '0', '100', '1', this.dp, (value) => this.setParameters({ dp: value })));
        container.appendChild(createRow('High Damp (Hz):', 'number', '1000', '20000', '100', this.hd, (value) => this.setParameters({ hd: value })));
        container.appendChild(createRow('Low Damp (Hz):', 'number', '20', '500', '1', this.ld, (value) => this.setParameters({ ld: value })));
        container.appendChild(createRow('Mix (%):', 'number', '0', '100', '1', this.mx, (value) => this.setParameters({ mx: value })));

        return container;
    }
}

// Register the plugin globally
window.RSReverbPlugin = RSReverbPlugin;
