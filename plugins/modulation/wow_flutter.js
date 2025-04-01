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
            // Early exit if processing is disabled
            if (!parameters.enabled) return data;

            // --- Parameters ---
            // Destructure parameters for potentially slightly faster access and clarity
            const {
                sampleRate, channelCount, blockSize,
                rt: rate,          // Rate
                dp: depth,         // Depth
                rn: randomness,    // Randomness
                rc: randomnessCutoff, // Randomness Cutoff Freq
                cp: channelPhase,  // Channel Phase (degrees)
                cs: channelSync    // Channel Sync (%)
            } = parameters;

            // --- Constants & Pre-calculated Coefficients ---
            const MAX_BUFFER_SIZE = Math.ceil(0.1 * sampleRate); // 100ms buffer size in samples
            const TWO_PI = Math.PI * 2;
            const DEG_TO_RAD = Math.PI / 180;

            // Hoisted calculations (compute once per block)
            const phaseIncrement = TWO_PI * rate / sampleRate; // Phase change per sample
            const lpfCoeff = Math.exp(-TWO_PI * randomnessCutoff / sampleRate); // LPF coefficient for noise
            const oneMinusLpfCoeff = 1.0 - lpfCoeff;
            const channelPhaseRad = channelPhase * DEG_TO_RAD; // Channel phase offset in radians
            const syncRatio = channelSync / 100.0; // Channel sync ratio (0-1)
            const oneMinusSyncRatio = 1.0 - syncRatio;
            const delayMsToSamplesMultiplier = sampleRate / 1000.0; // Factor to convert delay ms to samples

            // --- Context Initialization (ensures state exists) ---
            // Initialize only if properties are missing
            context.phase = context.phase || 0.0;
            context.lpfState = context.lpfState || 0.0;
            context.sampleBufferPos = context.sampleBufferPos || 0;

            // Initialize channel-specific LPF states if count mismatch or missing
            if (!context.channelLpfStates || context.channelLpfStates.length !== channelCount) {
                context.channelLpfStates = new Float32Array(channelCount).fill(0.0); // Use Float32Array for typed performance
            }

            // Initialize sample buffers if not done yet
            if (!context.initialized) {
                context.sampleBuffer = new Array(channelCount);
                for (let ch = 0; ch < channelCount; ++ch) {
                     // Use Float32Array for typed performance, fill with 0.0
                    context.sampleBuffer[ch] = new Float32Array(MAX_BUFFER_SIZE).fill(0.0);
                }
                context.initialized = true;
            }

            // --- Local State Variables (minimize context lookups in loops) ---
            let currentPhase = context.phase;
            let commonLpfState = context.lpfState;
            let bufferPos = context.sampleBufferPos;
            const channelLpfStates = context.channelLpfStates; // Get reference to array
            const sampleBuffers = context.sampleBuffer;        // Get reference to array of buffers

            // --- Main Processing Loop ---
            for (let i = 0; i < blockSize; ++i) {

                // Update base phase (oscillator)
                currentPhase += phaseIncrement;
                // Faster modulo for positive numbers
                if (currentPhase >= TWO_PI) {
                    currentPhase -= TWO_PI;
                }

                // Generate and filter common noise component
                const noise = Math.random(); // unavoidable random call
                commonLpfState = noise * oneMinusLpfCoeff + commonLpfState * lpfCoeff;

                // --- Channel Loop ---
                for (let ch = 0; ch < channelCount; ++ch) {
                    const buffer = sampleBuffers[ch]; // Local ref to current channel buffer
                    const offset = ch * blockSize;    // Base index for this channel in 'data'

                    // Store current input sample in the circular buffer
                    buffer[bufferPos] = data[offset + i];

                    // Calculate channel-specific phase (apply offset)
                    // No need for modulo here, Math.cos handles periodicity
                    const channelPhaseOffset = ch * channelPhaseRad;
                    const currentChannelPhase = currentPhase + channelPhaseOffset;

                    // Generate and filter channel-specific noise component
                    const channelNoise = Math.random(); // unavoidable random call
                    let chLpfState = channelLpfStates[ch]; // Read current state
                    chLpfState = channelNoise * oneMinusLpfCoeff + chLpfState * lpfCoeff;
                    channelLpfStates[ch] = chLpfState; // Write back updated state

                    // Blend common and channel-specific filtered noise based on sync ratio
                    const filteredNoise = syncRatio * commonLpfState + oneMinusSyncRatio * chLpfState;

                    // Calculate total delay time in ms
                    // Base delay uses cosine wave (0 to 1 range) scaled by depth
                    // Noise contribution is added, scaled by randomness factor
                    const baseDelay = (1.0 - Math.cos(currentChannelPhase)) * 0.5; // 0..1 range
                    const noiseContribution = filteredNoise * randomness;
                    const totalDelay = baseDelay * depth + noiseContribution; // Total delay modulation in ms? (original assumes this scale)

                    // Convert delay to samples
                    const delaySamples = totalDelay * delayMsToSamplesMultiplier;

                    // Calculate read position in buffer using linear interpolation
                    // Add MAX_BUFFER_SIZE before modulo to handle negative results correctly
                    const delayPos = (bufferPos - delaySamples + MAX_BUFFER_SIZE);
                    // Fast modulo % MAX_BUFFER_SIZE
                    const delayPosWrapped = delayPos >= MAX_BUFFER_SIZE ? delayPos % MAX_BUFFER_SIZE : delayPos < 0 ? (delayPos % MAX_BUFFER_SIZE + MAX_BUFFER_SIZE) % MAX_BUFFER_SIZE : delayPos;

                    // Use bitwise OR for fast floor (safe as delayPosWrapped is always positive)
                    const delayPosInt = (delayPosWrapped | 0);
                    const delayPosFrac = delayPosWrapped - delayPosInt;

                    // Calculate index for the next sample, wrapping around buffer
                    let nextPos = delayPosInt + 1;
                    if (nextPos >= MAX_BUFFER_SIZE) { // Faster than modulo for simple increment wrap
                         nextPos = 0;
                    }

                    // Linear interpolation
                    const sample1 = buffer[delayPosInt];
                    const sample2 = buffer[nextPos];
                    const interpolatedSample = sample1 + delayPosFrac * (sample2 - sample1);

                    // Write interpolated sample to output data array
                    data[offset + i] = interpolatedSample;
                }

                // Update buffer write position, wrapping around
                bufferPos++;
                if (bufferPos >= MAX_BUFFER_SIZE) { // Faster than modulo for simple increment wrap
                    bufferPos = 0;
                }
            }

            // --- Update Context State (write back local state) ---
            context.phase = currentPhase;
            context.lpfState = commonLpfState;
            context.sampleBufferPos = bufferPos;
            // Note: context.channelLpfStates was updated directly via the 'channelLpfStates' reference

            return data; // Return the modified data buffer
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
            this.rt = params.rt < 0.1 ? 0.1 : (params.rt > 20 ? 20 : params.rt);
        }
        if (params.dp !== undefined) {
            this.dp = params.dp < 0 ? 0 : (params.dp > 40 ? 40 : params.dp);
        }
        if (params.rn !== undefined) {
            this.rn = params.rn < 0 ? 0 : (params.rn > 40 ? 40 : params.rn);
        }
        if (params.rc !== undefined) {
            this.rc = params.rc < 0.1 ? 0.1 : (params.rc > 20 ? 20 : params.rc);
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
