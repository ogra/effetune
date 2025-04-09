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
            // Initial check for processor enablement
            if (!parameters.enabled) return data;
        
            // --- Constants and Pre-calculations ---
        
            const TWO_PI = 6.283185307179586; // 2 * Math.PI
            const DEG_TO_RAD = 0.017453292519943295; // Math.PI / 180
        
            // Cache frequently accessed parameters locally
            const sampleRate = parameters.sampleRate;
            const blockSize = parameters.blockSize;
            const channelCount = parameters.channelCount;
            const rate = parameters.rt;
            const depth = parameters.dp;
            const randomness = parameters.rn;
            const randomnessCutoff = parameters.rc;
            const channelPhase = parameters.cp;
            const channelSync = parameters.cs;
        
            // Ensure context variables exist (using direct property access for potential minor speedup)
            // Initialize state variables if they don't exist
            if (context.phase === undefined) context.phase = 0;
            if (context.lpfState === undefined) context.lpfState = 0.5;
            if (context.channelLpfStates === undefined) context.channelLpfStates = [];
        
            // Initialize channel-specific LPF states array if needed
            // Use direct length check and assignment
            if (context.channelLpfStates.length !== channelCount) {
                context.channelLpfStates = new Array(channelCount);
                for (let ch = 0; ch < channelCount; ++ch) {
                    context.channelLpfStates[ch] = 0.5;
                }
            }
        
            // Pre-calculate loop invariants
            const phaseIncrement = TWO_PI * rate / sampleRate;
            const lpfCoeff = Math.exp(-TWO_PI * randomnessCutoff / sampleRate);
            const invLpfCoeff = 1.0 - lpfCoeff; // Pre-calculate (1 - coeff)
            const channelPhaseRad = channelPhase * DEG_TO_RAD;
            const syncRatio = channelSync * 0.01; // Divide by 100
            const invSyncRatio = 1.0 - syncRatio; // Pre-calculate (1 - ratio)
            const negDepth = -depth; // Pre-calculate for dB calculation
            const negRandomnessX2 = -randomness * 2.0; // Pre-calculate for dB calculation
            const inv20 = 0.05; // Pre-calculate 1/20 for dB to linear conversion
        
            // Load state variables into local variables for faster access within the loop
            let phase = context.phase;
            let lpfState = context.lpfState;
            // Get a direct reference to the channel states array
            const channelLpfStates = context.channelLpfStates; 
        
            // --- Main Processing Loop ---
            for (let i = 0; i < blockSize; ++i) {
                // --- Update Common Phase and LPF ---
                phase += phaseIncrement;
                // Faster wrap-around check (avoids modulo operator)
                if (phase >= TWO_PI) {
                    phase -= TWO_PI;
                }
        
                // Generate and filter common noise
                // Using pre-calculated (1 - lpfCoeff)
                const noise = Math.random();
                lpfState = noise * invLpfCoeff + lpfState * lpfCoeff;
        
                // --- Process Each Channel ---
                for (let ch = 0; ch < channelCount; ++ch) {
                    const offset = ch * blockSize;
        
                    // Calculate channel-specific phase
                    const currentChannelPhase = phase + ch * channelPhaseRad;
        
                    // Generate and filter channel-specific noise
                    const channelNoise = Math.random();
                    // Update the state array directly
                    channelLpfStates[ch] = channelNoise * invLpfCoeff + channelLpfStates[ch] * lpfCoeff;
        
                    // Blend common and channel noise based on sync ratio
                    // Using pre-calculated (1 - syncRatio)
                    const filteredNoise = syncRatio * lpfState + invSyncRatio * channelLpfStates[ch];
        
                    // --- Calculate Gain ---
                    // Calculate base modulation (0 to 1 range)
                    // Math.cos is kept as it's fundamental to the LFO shape
                    const baseModulation = (1.0 - Math.cos(currentChannelPhase)) * 0.5; 
        
                    // Calculate noise contribution (-randomness to +randomness range)
                    // Using pre-calculated -randomness * 2
                    const noiseContribution = (filteredNoise - 0.5) * negRandomnessX2;
        
                    // Calculate total modulation in dB
                    // Using pre-calculated -depth
                    const totalModulationDB = baseModulation * negDepth + noiseContribution;
        
                    // Convert dB to linear gain using Math.pow(10, db * 0.05)
                    // Math.pow is generally necessary for accurate dB conversion
                    const gain = Math.pow(10.0, totalModulationDB * inv20);
        
                    // Apply gain to the sample in the data buffer
                    data[offset + i] *= gain;
                }
            }
        
            // --- Store Updated State ---
            // Write local state variables back to context object
            context.phase = phase;
            context.lpfState = lpfState;
            // channelLpfStates was modified in-place, no need to reassign context.channelLpfStates
        
            // Return the modified data buffer
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
            this.rt = params.rt < 0.1 ? 0.1 : (params.rt > 20 ? 20 : params.rt);
        }
        if (params.dp !== undefined) {
            this.dp = params.dp < 0 ? 0 : (params.dp > 12 ? 12 : params.dp);
        }
        if (params.rn !== undefined) {
            this.rn = params.rn < 0 ? 0 : (params.rn > 96 ? 96 : params.rn);
        }
        if (params.rc !== undefined) {
            this.rc = params.rc < 1 ? 1 : (params.rc > 1000 ? 1000 : params.rc);
        }
        if (params.cp !== undefined) {
            this.cp = params.cp < -180 ? -180 : (params.cp > 180 ? 180 : params.cp);
        }
        if (params.cs !== undefined) {
            this.cs = params.cs < 0 ? 0 : (params.cs > 100 ? 100 : params.cs);
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