class RSReverbPlugin extends PluginBase {
    constructor() {
        super('RS Reverb', 'Random scattering reverb with natural diffusion');
        
        // Initialize parameters with defaults
        // pd: Pre-Delay (ms)
        this.pd = 10;
        // rs: Room Size (m)
        this.rs = 10.0;
        // rt: Reverb Time (s)
        this.rt = 2.4;
        // ds: Density (4-8)
        this.ds = 8;
        // df: Diffusion (0.2-0.8)
        this.df = 0.7;
        // dp: Damping (%)
        this.dp = 80;
        // hd: High Damp (Hz)
        this.hd = 2000;
        // ld: Low Damp (Hz)
        this.ld = 200;
        // mx: Wet/Dry Mix (%)
        this.mx = 16;

        // Initialize state variables
        this.lastProcessTime = performance.now() / 1000;

        // Register processor function
        this.registerProcessor(`
            // Skip processing if disabled
            if (!parameters.enabled) return data;

            // Initialize context state if needed
            if (!context.initialized || context.sampleRate !== sampleRate) {
                context.sampleRate = sampleRate;
                
                // Pre-delay buffer
                const maxPreDelay = Math.ceil(sampleRate * 0.05); // 50ms
                context.preDelayBuffer = new Array(parameters.channelCount)
                    .fill()
                    .map(() => ({
                        buffer: new Float32Array(maxPreDelay),
                        pos: 0
                    }));

                // Initialize base delays and randomize them once
                const baseDelays = [19, 29, 41, 47, 23, 31, 37, 43];
                context.randomizedDelays = baseDelays.map(delay => delay + Math.random());
                
                // Initialize comb filters using stored randomized delays
                context.combFilters = new Array(parameters.channelCount).fill().map(() => 
                    context.randomizedDelays.map(delay => ({
                        buffer: new Float32Array(Math.ceil(delay * sampleRate * 0.001)), // Convert ms to seconds
                        pos: 0,
                        lastOutput: 0,
                        // Add filter states for each comb filter
                        hdState: 0,
                        ldState: 0
                    }))
                );

                // Initialize allpass filters
                const apfDelay = Math.ceil(0.005 * sampleRate); // 5ms
                context.allpassFilters = new Array(parameters.channelCount).fill().map(() => 
                    Array(2).fill().map(() => ({
                        buffer: new Float32Array(apfDelay),
                        pos: 0,
                        lastOutput: 0
                    }))
                );

                // Initialize damping filter states per channel
                context.hdStates = new Array(parameters.channelCount).fill().map(() => 0);
                context.ldStates = new Array(parameters.channelCount).fill().map(() => 0);
                
                context.initialized = true;
            }

            // Reset if channel count changes
            if (context.preDelayBuffer.length !== parameters.channelCount) {
                const maxPreDelay = Math.ceil(context.sampleRate * 0.05);
                context.preDelayBuffer = new Array(parameters.channelCount)
                    .fill()
                    .map(() => ({
                        buffer: new Float32Array(maxPreDelay),
                        pos: 0
                    }));
                
                // Use stored randomized delays for reset
                context.combFilters = new Array(parameters.channelCount).fill().map(() => 
                    context.randomizedDelays.map(delay => ({
                        buffer: new Float32Array(Math.ceil(delay * context.sampleRate * 0.001)),
                        pos: 0,
                        lastOutput: 0,
                        hdState: 0,
                        ldState: 0
                    }))
                );

                // Reset damping filter states
                context.hdStates = new Array(parameters.channelCount).fill().map(() => 0);
                context.ldStates = new Array(parameters.channelCount).fill().map(() => 0);

                const apfDelay = Math.ceil(0.005 * context.sampleRate);
                context.allpassFilters = new Array(parameters.channelCount).fill().map(() => 
                    Array(2).fill().map(() => ({
                        buffer: new Float32Array(apfDelay),
                        pos: 0,
                        lastOutput: 0
                    }))
                );
            }

            // Pre-calculate coefficients for the block
            const hdFreq = parameters.hd;
            const hdCoeff = Math.exp(-2 * Math.PI * hdFreq / context.sampleRate);
            // For low damping, calculate cutoff frequency
            const ldFreq = parameters.ld;
            const ldCoeff = 1 - Math.exp(-2 * Math.PI * ldFreq / context.sampleRate);
            const dampAmount = parameters.dp / 100;

            // Pre-calculate feedback gains using stored randomized delays
            const feedbackGains = context.randomizedDelays.map(delay => {
                const delayTime = delay * 0.001; // Convert to seconds
                
                // Calculate feedback gain for RT60
                // For RT60, amplitude should decay to 0.001 (-60dB) in rt seconds
                // If delay time is T, then after rt/T iterations, gain^(rt/T) = 0.001
                // Therefore: gain = 0.001^(T/rt)
                const gain = Math.pow(0.001, delayTime / parameters.rt);
                
                // Scale gain based on room size (larger rooms need longer reverb)
                const roomScale = parameters.rs / 10.0; // Linear scaling with room size
                const scaledGain = gain * roomScale;
                
                // Add safety limit
                return Math.min(0.9, Math.max(-0.9, scaledGain));
            });

            // Calculate normalization factor based on active combs
            const numActiveCombs = parameters.ds;
            const normalizationFactor = 0.4 / Math.max(1, numActiveCombs);

            // Process each channel
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                
                // Process each sample
                for (let i = 0; i < parameters.blockSize; i++) {
                    const input = data[offset + i];
                    let output = 0;

                    // Apply pre-delay
                    const preDelaySamples = Math.floor(parameters.pd * context.sampleRate / 1000);
                    const preDelay = context.preDelayBuffer[ch];
                    const delayedInput = preDelay.buffer[preDelay.pos];
                    preDelay.buffer[preDelay.pos] = input;
                    preDelay.pos = (preDelay.pos + 1) % preDelay.buffer.length;

                    // Process through comb filters based on density
                    let combOut = 0;
                    const numCombs = parameters.ds;
                    
                    for (let j = 0; j < numCombs; j++) {
                        const comb = context.combFilters[ch][j];
                        
                        // Read from delay buffer
                        const delayedSample = comb.buffer[comb.pos];
                        
                        // Apply damping filters in series to feedback signal
                        // First apply LPF (HD)
                        comb.hdState = delayedSample + hdCoeff * (comb.hdState - delayedSample);
                        // Then apply HPF (LD) to the LPF result
                        comb.ldState = comb.hdState + ldCoeff * (comb.ldState - comb.hdState);
                        
                        // Mix filtered and unfiltered feedback based on damping amount
                        const dampedSample = delayedSample * (1 - dampAmount) + 
                            comb.ldState * dampAmount;
                        
                        // Write to delay buffer with feedback
                        comb.buffer[comb.pos] = delayedInput + dampedSample * feedbackGains[j];
                        comb.pos = (comb.pos + 1) % comb.buffer.length;
                        
                        // Add to output
                        combOut += dampedSample;
                    }
                    
                    // Normalize the comb filter outputs
                    output = combOut * normalizationFactor;

                    // Apply allpass filters for diffusion
                    for (let j = 0; j < 2; j++) {
                        const apf = context.allpassFilters[ch][j];
                        const gain = parameters.df;
                        
                        // Read current sample from buffer
                        const delaySample = apf.buffer[apf.pos];
                        
                        // Calculate output with energy-preserving coefficients
                        const out = -(1 - gain) * output + delaySample + gain * apf.lastOutput;
                        
                        // Write to buffer
                        apf.buffer[apf.pos] = output;
                        apf.pos = (apf.pos + 1) % apf.buffer.length;
                        
                        // Update last output for next iteration
                        apf.lastOutput = out;
                        // Apply gain normalization to maintain constant power
                        output = out * (1 - gain * gain);
                    }

                    // Apply damping filters per channel with pre-calculated coefficients
                    if (parameters.dp > 0) {
                        // Apply filters with pre-calculated coefficients
                        context.hdStates[ch] = output + hdCoeff * (context.hdStates[ch] - output);
                        context.ldStates[ch] = output + ldCoeff * (context.ldStates[ch] - output);
                        
                        // Mix based on damping amount
                        output = output * (1 - dampAmount) + 
                            (context.hdStates[ch] * 0.5 + context.ldStates[ch] * 0.5) * dampAmount;
                    }

                    // Apply wet/dry mix
                    const wetMix = parameters.mx / 100;
                    // At 50% mix, both dry and wet are at 100%
                    const dryGain = wetMix <= 0.5 ? 1.0 : 2.0 * (1.0 - wetMix);
                    const wetGain = wetMix <= 0.5 ? 2.0 * wetMix : 1.0;
                    data[offset + i] = input * dryGain + output * wetGain;
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
        // Pre-Delay (0-50ms)
        if (params.pd !== undefined) {
            this.pd = Math.max(0, Math.min(50, Number(params.pd)));
        }
        // Room Size (2.0-50.0m)
        if (params.rs !== undefined) {
            this.rs = Math.max(2.0, Math.min(50.0, Number(params.rs)));
        }
        // Reverb Time (0.1-10.0s)
        if (params.rt !== undefined) {
            this.rt = Math.max(0.1, Math.min(10.0, Number(params.rt)));
        }
        // Density (4-8)
        if (params.ds !== undefined) {
            this.ds = Math.max(4, Math.min(8, Math.floor(Number(params.ds))));
        }
        // Diffusion (0.2-0.8)
        if (params.df !== undefined) {
            this.df = Math.max(0.2, Math.min(0.8, Number(params.df)));
        }
        // Damping (0-100%)
        if (params.dp !== undefined) {
            this.dp = Math.max(0, Math.min(100, Number(params.dp)));
        }
        // High Damp (1000-20000Hz)
        if (params.hd !== undefined) {
            this.hd = Math.max(1000, Math.min(20000, Number(params.hd)));
        }
        // Low Damp (20-500Hz)
        if (params.ld !== undefined) {
            this.ld = Math.max(20, Math.min(500, Number(params.ld)));
        }
        // Mix (0-100%)
        if (params.mx !== undefined) {
            this.mx = Math.max(0, Math.min(100, Number(params.mx)));
        }

        this.updateParameters();
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'plugin-parameter-ui';

        // Pre-Delay
        const pdRow = document.createElement('div');
        pdRow.className = 'parameter-row';
        const pdLabel = document.createElement('label');
        pdLabel.textContent = 'Pre-Delay (ms):';
        const pdSlider = document.createElement('input');
        pdSlider.type = 'range';
        pdSlider.min = '0';
        pdSlider.max = '50';
        pdSlider.step = '0.1';
        pdSlider.value = this.pd;
        const pdInput = document.createElement('input');
        pdInput.type = 'number';
        pdInput.min = '0';
        pdInput.max = '50';
        pdInput.step = '0.1';
        pdInput.value = this.pd;
        pdSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.setParameters({ pd: value });
            pdInput.value = value;
        });
        pdInput.addEventListener('input', (e) => {
            const value = Math.max(0, Math.min(50, parseFloat(e.target.value) || 0));
            this.setParameters({ pd: value });
            pdSlider.value = value;
            e.target.value = value;
        });
        pdRow.appendChild(pdLabel);
        pdRow.appendChild(pdSlider);
        pdRow.appendChild(pdInput);

        // Room Size
        const rsRow = document.createElement('div');
        rsRow.className = 'parameter-row';
        const rsLabel = document.createElement('label');
        rsLabel.textContent = 'Room Size (m):';
        const rsSlider = document.createElement('input');
        rsSlider.type = 'range';
        rsSlider.min = '2.0';
        rsSlider.max = '50.0';
        rsSlider.step = '0.1';
        rsSlider.value = this.rs;
        const rsInput = document.createElement('input');
        rsInput.type = 'number';
        rsInput.min = '2.0';
        rsInput.max = '50.0';
        rsInput.step = '0.1';
        rsInput.value = this.rs;
        rsSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.setParameters({ rs: value });
            rsInput.value = value;
        });
        rsInput.addEventListener('input', (e) => {
            const value = Math.max(2.0, Math.min(50.0, parseFloat(e.target.value) || 2.0));
            this.setParameters({ rs: value });
            rsSlider.value = value;
            e.target.value = value;
        });
        rsRow.appendChild(rsLabel);
        rsRow.appendChild(rsSlider);
        rsRow.appendChild(rsInput);

        // Reverb Time
        const rtRow = document.createElement('div');
        rtRow.className = 'parameter-row';
        const rtLabel = document.createElement('label');
        rtLabel.textContent = 'Reverb Time (s):';
        const rtSlider = document.createElement('input');
        rtSlider.type = 'range';
        rtSlider.min = '0.1';
        rtSlider.max = '10.0';
        rtSlider.step = '0.1';
        rtSlider.value = this.rt;
        const rtInput = document.createElement('input');
        rtInput.type = 'number';
        rtInput.min = '0.1';
        rtInput.max = '10.0';
        rtInput.step = '0.1';
        rtInput.value = this.rt;
        rtSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.setParameters({ rt: value });
            rtInput.value = value;
        });
        rtInput.addEventListener('input', (e) => {
            const value = Math.max(0.1, Math.min(10.0, parseFloat(e.target.value) || 0.1));
            this.setParameters({ rt: value });
            rtSlider.value = value;
            e.target.value = value;
        });
        rtRow.appendChild(rtLabel);
        rtRow.appendChild(rtSlider);
        rtRow.appendChild(rtInput);

        // Density
        const dsRow = document.createElement('div');
        dsRow.className = 'parameter-row';
        const dsLabel = document.createElement('label');
        dsLabel.textContent = 'Density (lines):';
        const dsSlider = document.createElement('input');
        dsSlider.type = 'range';
        dsSlider.min = '4';
        dsSlider.max = '8';
        dsSlider.step = '1';
        dsSlider.value = this.ds;
        const dsInput = document.createElement('input');
        dsInput.type = 'number';
        dsInput.min = '4';
        dsInput.max = '8';
        dsInput.step = '1';
        dsInput.value = this.ds;
        dsSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.setParameters({ ds: value });
            dsInput.value = value;
        });
        dsInput.addEventListener('input', (e) => {
            const value = Math.max(4, Math.min(8, parseInt(e.target.value) || 4));
            this.setParameters({ ds: value });
            dsSlider.value = value;
            e.target.value = value;
        });
        dsRow.appendChild(dsLabel);
        dsRow.appendChild(dsSlider);
        dsRow.appendChild(dsInput);

        // Diffusion
        const dfRow = document.createElement('div');
        dfRow.className = 'parameter-row';
        const dfLabel = document.createElement('label');
        dfLabel.textContent = 'Diffusion (ratio):';
        const dfSlider = document.createElement('input');
        dfSlider.type = 'range';
        dfSlider.min = '0.2';
        dfSlider.max = '0.8';
        dfSlider.step = '0.01';
        dfSlider.value = this.df;
        const dfInput = document.createElement('input');
        dfInput.type = 'number';
        dfInput.min = '0.2';
        dfInput.max = '0.8';
        dfInput.step = '0.01';
        dfInput.value = this.df;
        dfSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.setParameters({ df: value });
            dfInput.value = value;
        });
        dfInput.addEventListener('input', (e) => {
            const value = Math.max(0.2, Math.min(0.8, parseFloat(e.target.value) || 0.2));
            this.setParameters({ df: value });
            dfSlider.value = value;
            e.target.value = value;
        });
        dfRow.appendChild(dfLabel);
        dfRow.appendChild(dfSlider);
        dfRow.appendChild(dfInput);

        // Damping
        const dpRow = document.createElement('div');
        dpRow.className = 'parameter-row';
        const dpLabel = document.createElement('label');
        dpLabel.textContent = 'Damping (%):';
        const dpSlider = document.createElement('input');
        dpSlider.type = 'range';
        dpSlider.min = '0';
        dpSlider.max = '100';
        dpSlider.step = '1';
        dpSlider.value = this.dp;
        const dpInput = document.createElement('input');
        dpInput.type = 'number';
        dpInput.min = '0';
        dpInput.max = '100';
        dpInput.step = '1';
        dpInput.value = this.dp;
        dpSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.setParameters({ dp: value });
            dpInput.value = value;
        });
        dpInput.addEventListener('input', (e) => {
            const value = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
            this.setParameters({ dp: value });
            dpSlider.value = value;
            e.target.value = value;
        });
        dpRow.appendChild(dpLabel);
        dpRow.appendChild(dpSlider);
        dpRow.appendChild(dpInput);

        // High Damp
        const hdRow = document.createElement('div');
        hdRow.className = 'parameter-row';
        const hdLabel = document.createElement('label');
        hdLabel.textContent = 'High Damp (Hz):';
        const hdSlider = document.createElement('input');
        hdSlider.type = 'range';
        hdSlider.min = '1000';
        hdSlider.max = '20000';
        hdSlider.step = '100';
        hdSlider.value = this.hd;
        const hdInput = document.createElement('input');
        hdInput.type = 'number';
        hdInput.min = '1000';
        hdInput.max = '20000';
        hdInput.step = '100';
        hdInput.value = this.hd;
        hdSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.setParameters({ hd: value });
            hdInput.value = value;
        });
        hdInput.addEventListener('input', (e) => {
            const value = Math.max(2000, Math.min(20000, parseInt(e.target.value) || 2000));
            this.setParameters({ hd: value });
            hdSlider.value = value;
            e.target.value = value;
        });
        hdRow.appendChild(hdLabel);
        hdRow.appendChild(hdSlider);
        hdRow.appendChild(hdInput);

        // Low Damp
        const ldRow = document.createElement('div');
        ldRow.className = 'parameter-row';
        const ldLabel = document.createElement('label');
        ldLabel.textContent = 'Low Damp (Hz):';
        const ldSlider = document.createElement('input');
        ldSlider.type = 'range';
        ldSlider.min = '20';
        ldSlider.max = '500';
        ldSlider.step = '1';
        ldSlider.value = this.ld;
        const ldInput = document.createElement('input');
        ldInput.type = 'number';
        ldInput.min = '20';
        ldInput.max = '500';
        ldInput.step = '1';
        ldInput.value = this.ld;
        ldSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.setParameters({ ld: value });
            ldInput.value = value;
        });
        ldInput.addEventListener('input', (e) => {
            const value = Math.max(20, Math.min(500, parseInt(e.target.value) || 20));
            this.setParameters({ ld: value });
            ldSlider.value = value;
            e.target.value = value;
        });
        ldRow.appendChild(ldLabel);
        ldRow.appendChild(ldSlider);
        ldRow.appendChild(ldInput);

        // Mix
        const mxRow = document.createElement('div');
        mxRow.className = 'parameter-row';
        const mxLabel = document.createElement('label');
        mxLabel.textContent = 'Mix (%):';
        const mxSlider = document.createElement('input');
        mxSlider.type = 'range';
        mxSlider.min = '0';
        mxSlider.max = '100';
        mxSlider.step = '1';
        mxSlider.value = this.mx;
        const mxInput = document.createElement('input');
        mxInput.type = 'number';
        mxInput.min = '0';
        mxInput.max = '100';
        mxInput.step = '1';
        mxInput.value = this.mx;
        mxSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.setParameters({ mx: value });
            mxInput.value = value;
        });
        mxInput.addEventListener('input', (e) => {
            const value = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
            this.setParameters({ mx: value });
            mxSlider.value = value;
            e.target.value = value;
        });
        mxRow.appendChild(mxLabel);
        mxRow.appendChild(mxSlider);
        mxRow.appendChild(mxInput);

        // Add all parameter rows to container
        container.appendChild(pdRow);
        container.appendChild(rsRow);
        container.appendChild(rtRow);
        container.appendChild(dsRow);
        container.appendChild(dfRow);
        container.appendChild(dpRow);
        container.appendChild(hdRow);
        container.appendChild(ldRow);
        container.appendChild(mxRow);

        return container;
    }
}

// Register the plugin globally
window.RSReverbPlugin = RSReverbPlugin;
