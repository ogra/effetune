class TremoloPlugin extends PluginBase {
    constructor() {
        super('Tremolo', 'Volume-based modulation effect');
        
        this.rt = 10.0;        // rt: Rate - Range: 0.1-20 Hz
        this.dp = 2.0;         // dp: Depth - Range: 0-12 dB
        this.rn = 6.0;         // rn: Randomness - Range: 0-96 dB
        this.rc = 200.0;       // rc: Randomness Cutoff - Range: 1-1000 Hz
        this.cp = 0;           // cp: Channel Phase - Range: -180-180 degrees
        this.cs = 100;         // cs: Channel Sync - Range: 0-100%

        // Register the audio processor
        this.registerProcessor(`
            if (!parameters.enabled) return data;

            // Constants
            const TWO_PI = 2 * Math.PI;
            const DEG_TO_RAD = Math.PI / 180;

            // Ensure context variables exist first
            context.phase = context.phase || 0;
            context.lpfState = context.lpfState || 0;
            context.channelLpfStates = context.channelLpfStates || [];

            // Initialize channel-specific LPF states if needed
            if (context.channelLpfStates.length !== parameters.channelCount) {
                context.channelLpfStates = new Array(parameters.channelCount).fill(0);
            }

            // Calculate coefficients for randomness LPF
            // Map shortened parameter names to their original names for clarity
            const { 
                rt: rate,              // rt: Rate
                dp: depth,             // dp: Depth (in dB)
                rn: randomness,        // rn: Randomness (in dB)
                rc: randomnessCutoff,  // rc: Randomness Cutoff
                cp: channelPhase,      // cp: Channel Phase (in degrees)
                cs: channelSync,       // cs: Channel Sync (in %)
                channelCount, blockSize 
            } = parameters;

            const lpfCoeff = Math.exp(-TWO_PI * randomnessCutoff / sampleRate);
            const channelPhaseRad = channelPhase * DEG_TO_RAD;
            const syncRatio = channelSync / 100;

            // Process each sample
            for (let i = 0; i < parameters.blockSize; i++) {
                // Calculate base tremolo modulation
                context.phase += TWO_PI * rate / sampleRate;
                if (context.phase >= TWO_PI) context.phase -= TWO_PI;

                // Generate noise for common LPF
                const noise = Math.random();
                context.lpfState = noise * (1 - lpfCoeff) + context.lpfState * lpfCoeff;

                // Process each channel with phase offset
                for (let ch = 0; ch < parameters.channelCount; ch++) {
                    const offset = ch * parameters.blockSize;
                    
                    // Apply channel phase offset
                    const channelOffset = ch * channelPhaseRad;
                    const channelPhase = context.phase + channelOffset;
                    
                    // Generate and filter noise for this channel
                    const channelNoise = Math.random();
                    context.channelLpfStates[ch] = channelNoise * (1 - lpfCoeff) + context.channelLpfStates[ch] * lpfCoeff;
                    
                    // Blend between channel-specific and common LPF based on sync ratio
                    const filteredNoise = syncRatio * context.lpfState + (1 - syncRatio) * context.channelLpfStates[ch];

                    // Calculate volume modulation in dB
                    const baseModulation = (1 - Math.cos(channelPhase)) * 0.5; // 0-1 range
                    const noiseContribution = (filteredNoise - 0.5) * 2 * randomness; // -randomness to +randomness range
                    const totalModulationDB = -(baseModulation * depth + noiseContribution);

                    // Convert dB to linear gain
                    const gain = Math.pow(10, totalModulationDB / 20);
                    
                    // Apply gain to input sample
                    data[offset + i] *= gain;
                }
            }

            return data;
        `);
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'tremolo-plugin-ui plugin-parameter-ui';

        // Helper function to create parameter controls
        const createParameterControl = (label, min, max, step, value, setter, unit = '') => {
            const row = document.createElement('div');
            row.className = 'parameter-row';
            
            const labelEl = document.createElement('label');
            labelEl.textContent = `${label}${unit ? ' (' + unit + ')' : ''}:`;
            
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = value;
            
            const valueInput = document.createElement('input');
            valueInput.type = 'number';
            valueInput.min = min;
            valueInput.max = max;
            valueInput.step = step;
            valueInput.value = value;

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
        container.appendChild(createParameterControl('Depth', 0, 12, 0.1, this.dp, this.setDp.bind(this), 'dB'));
        container.appendChild(createParameterControl('Ch Phase', -180, 180, 1, this.cp, this.setCp.bind(this), 'Deg.'));
        container.appendChild(createParameterControl('Randomness', 0, 96, 0.1, this.rn, this.setRn.bind(this), 'dB'));
        container.appendChild(createParameterControl('Randomness Cutoff', 1, 1000, 1, this.rc, this.setRc.bind(this), 'Hz'));
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
            this.dp = Math.max(0, Math.min(12, params.dp));
        }
        if (params.rn !== undefined) {
            this.rn = Math.max(0, Math.min(96, params.rn));
        }
        if (params.rc !== undefined) {
            this.rc = Math.max(1, Math.min(1000, params.rc));
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

    // Set Depth (0-12 dB)
    setDp(value) {
        this.setParameters({ dp: value });
    }

    // Set Randomness (0-96 dB)
    setRn(value) {
        this.setParameters({ rn: value });
    }

    // Set Randomness Cutoff (1-1000 Hz)
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
window.TremoloPlugin = TremoloPlugin;