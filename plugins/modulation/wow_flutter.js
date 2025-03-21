class WowFlutterPlugin extends PluginBase {
    constructor() {
        super('Wow Flutter', 'Time-based modulation effect');
        
        this.rt = 0.5;         // rt: Rate (formerly rate) - Range: 0.1-20 Hz
        this.dp = 6.0;         // dp: Depth (formerly depth) - Range: 0-40 ms
        this.rn = 10.0;        // rn: Randomness (formerly randomness) - Range: 0-40 ms
        this.rc = 5.0;         // rc: Randomness Cutoff (formerly randomnessCutoff) - Range: 0.1-20 Hz
        this.cp = 0;           // cp: Channel Phase - Range: -180-180 degrees
        this.cs = 100;         // cs: Channel Sync - Range: 0-100%

        // Register the audio processor
        this.registerProcessor(`
            if (!parameters.enabled) return data;

            // Constants
            const MAX_BUFFER_SIZE = Math.ceil(0.1 * sampleRate); // 100ms buffer
            const TWO_PI = 2 * Math.PI;
            const DEG_TO_RAD = Math.PI / 180;

            // Ensure context variables exist first
            context.phase = context.phase || 0;
            context.lpfState = context.lpfState || 0;
            context.channelLpfStates = context.channelLpfStates || [];
            context.sampleBufferPos = context.sampleBufferPos || 0;

            // Initialize channel-specific LPF states if needed
            if (context.channelLpfStates.length !== parameters.channelCount) {
                context.channelLpfStates = new Array(parameters.channelCount).fill(0);
            }

            // Initialize buffer if needed
            if (!context.initialized) {
                context.sampleBuffer = new Array(parameters.channelCount)
                    .fill()
                    .map(() => new Float32Array(MAX_BUFFER_SIZE).fill(0));
                context.initialized = true;
            }

            // Calculate coefficients for randomness LPF
            // Map shortened parameter names to their original names for clarity
            const { 
                rt: rate,              // rt: Rate (formerly rate)
                dp: depth,             // dp: Depth (formerly depth)
                rn: randomness,        // rn: Randomness (formerly randomness)
                rc: randomnessCutoff,  // rc: Randomness Cutoff (formerly randomnessCutoff)
                cp: channelPhase,      // cp: Channel Phase (in degrees)
                cs: channelSync,       // cs: Channel Sync (in %)
                channelCount, blockSize 
            } = parameters;

            const lpfCoeff = Math.exp(-TWO_PI * randomnessCutoff / sampleRate);
            const channelPhaseRad = channelPhase * DEG_TO_RAD;
            const syncRatio = channelSync / 100;

            // Process each sample
            for (let i = 0; i < parameters.blockSize; i++) {
                // Calculate base wow flutter modulation
                context.phase += TWO_PI * rate / sampleRate;
                if (context.phase >= TWO_PI) context.phase -= TWO_PI;

                // Generate noise for common LPF
                const noise = Math.random();
                context.lpfState = noise * (1 - lpfCoeff) + context.lpfState * lpfCoeff;

                // Process each channel with phase offset
                for (let ch = 0; ch < parameters.channelCount; ch++) {
                    const buffer = context.sampleBuffer[ch];
                    const offset = ch * parameters.blockSize;

                    // Store input sample in buffer
                    const inputSample = data[offset + i];
                    buffer[context.sampleBufferPos] = inputSample;

                    // Apply channel phase offset
                    const channelOffset = ch * channelPhaseRad;
                    const channelPhase = context.phase + channelOffset;
                    
                    // Generate and filter noise for this channel
                    const channelNoise = Math.random();
                    context.channelLpfStates[ch] = channelNoise * (1 - lpfCoeff) + context.channelLpfStates[ch] * lpfCoeff;
                    
                    // Blend between channel-specific and common LPF based on sync ratio
                    const filteredNoise = syncRatio * context.lpfState + (1 - syncRatio) * context.channelLpfStates[ch];

                    // Calculate delay time
                    const baseDelay = (1 - Math.cos(channelPhase)) * 0.5; // 0-1 range
                    const noiseContribution = filteredNoise * randomness;
                    const totalDelay = baseDelay * depth + noiseContribution;

                    // Convert delay from ms to samples
                    const delaySamples = (totalDelay / 1000) * sampleRate;

                    // Get delayed sample position with linear interpolation
                    const delayPos = (context.sampleBufferPos - delaySamples + MAX_BUFFER_SIZE) % MAX_BUFFER_SIZE;
                    const delayPosInt = Math.floor(delayPos);
                    const delayPosFrac = delayPos - delayPosInt;
                    const nextPos = (delayPosInt + 1) % MAX_BUFFER_SIZE;

                    // Apply interpolation
                    const sample1 = buffer[delayPosInt];
                    const sample2 = buffer[nextPos];
                    const interpolatedSample = sample1 + delayPosFrac * (sample2 - sample1);

                    // Write to output
                    data[offset + i] = interpolatedSample;
                }

                // Update buffer position
                context.sampleBufferPos = (context.sampleBufferPos + 1) % MAX_BUFFER_SIZE;
            }

            return data;
        `);
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'wow-flutter-plugin-ui plugin-parameter-ui';

        // Helper function to create parameter controls
        const createParameterControl = (label, min, max, step, value, setter, unit = '') => {
            const row = document.createElement('div');
            row.className = 'parameter-row';
            
            // Create unique IDs for the controls
            const paramName = label.toLowerCase().replace(/\s+/g, '-');
            const sliderId = `${this.id}-${this.name}-${paramName}-slider`;
            const valueId = `${this.id}-${this.name}-${paramName}-value`;
            
            const labelEl = document.createElement('label');
            labelEl.textContent = `${label}${unit ? ' (' + unit + ')' : ''}:`;
            labelEl.htmlFor = sliderId;
            
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = sliderId;
            slider.name = sliderId;
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = value;
            slider.autocomplete = "off";
            
            const valueInput = document.createElement('input');
            valueInput.type = 'number';
            valueInput.id = valueId;
            valueInput.name = valueId;
            valueInput.min = min;
            valueInput.max = max;
            valueInput.step = step;
            valueInput.value = value;
            valueInput.autocomplete = "off";

            slider.addEventListener('input', (e) => {
                setter(parseFloat(e.target.value));
                valueInput.value = e.target.value;
            });

            valueInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value) || 0;
                setter(val);
                slider.value = val;
                e.target.value = val;
            });

            row.appendChild(labelEl);
            row.appendChild(slider);
            row.appendChild(valueInput);

            return row;
        };

        // Add parameter controls
        container.appendChild(createParameterControl('Rate', 0.1, 20, 0.1, this.rt, this.setRt.bind(this), 'Hz'));
        container.appendChild(createParameterControl('Depth', 0, 40, 0.1, this.dp, this.setDp.bind(this), 'ms'));
        container.appendChild(createParameterControl('Ch Phase', -180, 180, 1, this.cp, this.setCp.bind(this), 'Deg.'));
        container.appendChild(createParameterControl('Randomness', 0, 40, 0.1, this.rn, this.setRn.bind(this), 'ms'));
        container.appendChild(createParameterControl('Randomness Cutoff', 0.1, 20, 0.1, this.rc, this.setRc.bind(this), 'Hz'));
        container.appendChild(createParameterControl('Ch Sync', 0, 100, 1, this.cs, this.setCs.bind(this), '%'));

        return container;
    }

    getParameters() {
        return {
            ...super.getParameters(),
            rt: this.rt,
            dp: this.dp,
            rn: this.rn,
            rc: this.rc,
            cp: this.cp,
            cs: this.cs
        };
    }

    setParameters(params) {
        if (params.rt !== undefined) {
            this.rt = Math.max(0.1, Math.min(20, params.rt));
        }
        if (params.dp !== undefined) {
            this.dp = Math.max(0, Math.min(40, params.dp));
        }
        if (params.rn !== undefined) {
            this.rn = Math.max(0, Math.min(40, params.rn));
        }
        if (params.rc !== undefined) {
            this.rc = Math.max(0.1, Math.min(20, params.rc));
        }
        if (params.cp !== undefined) {
            this.cp = Math.max(-180, Math.min(180, params.cp));
        }
        if (params.cs !== undefined) {
            this.cs = Math.max(0, Math.min(100, params.cs));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }

        this.updateParameters();
    }

    // Set Rate (0.1-20 Hz)
    setRt(value) {
        this.setParameters({ rt: value });
    }

    // Set Depth (0-40 ms)
    setDp(value) {
        this.setParameters({ dp: value });
    }

    // Set Randomness (0-40 ms)
    setRn(value) {
        this.setParameters({ rn: value });
    }

    // Set Randomness Cutoff (0.1-20 Hz)
    setRc(value) {
        this.setParameters({ rc: value });
    }

    // Set Channel Phase (-180-180 degrees)
    setCp(value) {
        this.setParameters({ cp: value });
    }

    // Set Channel Sync (0-100%)
    setCs(value) {
        this.setParameters({ cs: value });
    }
}

// Register the plugin
window.WowFlutterPlugin = WowFlutterPlugin;
