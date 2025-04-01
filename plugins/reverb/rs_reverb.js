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

            // --- Parameter & Context Destructuring ---
            const { channelCount, blockSize, sampleRate } = parameters;
            const contextSampleRate = context.sampleRate; // Cache for comparison

            // --- Initialization & Reset Logic ---
            // Determine if initialization or reset is needed
            const needsInitialization = !context.initialized || contextSampleRate !== sampleRate;
            const needsChannelResize = context.initialized && context.preDelayBuffer?.length !== channelCount;

            // Perform full initialization if needed (first run or sample rate change)
            if (needsInitialization) {
                context.sampleRate = sampleRate; // Update context sample rate

                // Calculate maximum buffer sizes based on sample rate
                // Use bitwise OR for potential speedup over Math.ceil for positive results
                const maxPreDelaySamples = (sampleRate * 0.05 + 0.999) | 0; // 50ms + safety margin for ceil
                const apfDelaySamples = (sampleRate * 0.005 + 0.999) | 0; // 5ms + safety margin for ceil

                // Initialize base delays and randomize them ONCE (if not already done)
                // This state persists across sample rate changes unless context is fully cleared externally.
                if (!context.randomizedDelays) {
                    // Base delay times in milliseconds (prime numbers often used)
                    const baseDelaysMs = [19.1, 29.3, 41.5, 47.7, 23.9, 31.1, 37.3, 43.5]; // Example slightly randomized primes
                    const numDelays = baseDelaysMs.length;
                    context.randomizedDelaysMs = new Float32Array(numDelays); // Use Float32Array for delays
                    for (let i = 0; i < numDelays; i++) {
                        // Add small random component for decorrelation, store directly in ms
                        context.randomizedDelaysMs[i] = baseDelaysMs[i] + Math.random();
                    }
                    context.numCombFilters = numDelays; // Store the number of comb filters
                }
                const numCombs = context.numCombFilters;
                const randomizedDelaysMs = context.randomizedDelaysMs; // Cache for init loop

                // Pre-allocate arrays for channel-specific data
                context.preDelayBuffer = new Array(channelCount);
                context.combFilters = new Array(channelCount);
                context.allpassFilters = new Array(channelCount);
                context.hdStates = new Float32Array(channelCount); // Damping states (channel-specific)
                context.ldStates = new Float32Array(channelCount);

                // Initialize buffers and states for each channel
                for (let ch = 0; ch < channelCount; ch++) {
                    // Pre-delay buffer
                    context.preDelayBuffer[ch] = {
                        buffer: new Float32Array(maxPreDelaySamples),
                        pos: 0
                    };

                    // Comb filters for this channel
                    const combs = new Array(numCombs);
                    for (let j = 0; j < numCombs; j++) {
                        // Calculate buffer length from randomized MS delay
                        const delaySamples = (randomizedDelaysMs[j] * sampleRate * 0.001 + 0.999) | 0;
                        combs[j] = {
                            buffer: new Float32Array(delaySamples), // Comb delay buffer
                            pos: 0,                 // Write/Read position
                            // Damping filter states are stored per comb filter instance now
                            // hdState: 0, // Removed - will use channel level state initially
                            // ldState: 0  // Removed - will use channel level state initially
                        };
                    }
                    context.combFilters[ch] = combs;

                    // Allpass filters (fixed at 2 for this channel)
                    const apfs = [
                         { buffer: new Float32Array(apfDelaySamples), pos: 0, lastOutput: 0.0 },
                         { buffer: new Float32Array(apfDelaySamples), pos: 0, lastOutput: 0.0 }
                    ];
                    context.allpassFilters[ch] = apfs;
                }
                 // hdStates and ldStates are already allocated and implicitly initialized to 0

                context.initialized = true;
            }
            // Handle channel count changes *after* initial setup possibility
            // This reuses existing randomized delays and sample rate
            else if (needsChannelResize) {
                 const currentSampleRate = context.sampleRate; // Use existing rate
                 const maxPreDelaySamples = (currentSampleRate * 0.05 + 0.999) | 0;
                 const apfDelaySamples = (currentSampleRate * 0.005 + 0.999) | 0;
                 const numCombs = context.numCombFilters;
                 const randomizedDelaysMs = context.randomizedDelaysMs;

                 // Store old arrays if needed (e.g., for smooth transition - not done here)
                 // const oldPreDelay = context.preDelayBuffer; ...

                 // Re-allocate arrays for the new channel count
                 context.preDelayBuffer = new Array(channelCount);
                 context.combFilters = new Array(channelCount);
                 context.allpassFilters = new Array(channelCount);
                 // Resize damping state arrays (Float32Array cannot be resized, create new)
                 context.hdStates = new Float32Array(channelCount);
                 context.ldStates = new Float32Array(channelCount);

                 // Initialize buffers for *all* channels (including existing ones for simplicity)
                 for (let ch = 0; ch < channelCount; ch++) {
                    // Pre-delay buffer
                    context.preDelayBuffer[ch] = { buffer: new Float32Array(maxPreDelaySamples), pos: 0 };

                    // Comb filters
                    const combs = new Array(numCombs);
                    for (let j = 0; j < numCombs; j++) {
                        const delaySamples = (randomizedDelaysMs[j] * currentSampleRate * 0.001 + 0.999) | 0;
                        combs[j] = { buffer: new Float32Array(delaySamples), pos: 0 };
                    }
                    context.combFilters[ch] = combs;

                    // Allpass filters
                    const apfs = [
                         { buffer: new Float32Array(apfDelaySamples), pos: 0, lastOutput: 0.0 },
                         { buffer: new Float32Array(apfDelaySamples), pos: 0, lastOutput: 0.0 }
                    ];
                    context.allpassFilters[ch] = apfs;
                 }
                 // hdStates/ldStates are allocated and zero-initialized
            }


            // --- Coefficient Calculation (Per Block) ---
            // Cache parameters locally
            const hdParam = parameters.hd; // High damp freq
            const ldParam = parameters.ld; // Low damp freq
            const dpParam = parameters.dp; // Damping amount (0-100)
            const dsParam = parameters.ds; // Density (number of active combs)
            const dfParam = parameters.df; // Diffusion
            const mxParam = parameters.mx; // Mix (0-100)
            const rsParam = parameters.rs; // Room scale (adjusts feedback)
            const rtParam = parameters.rt; // Reverb time

            const twoPI = Math.PI * 2.0; // Use explicit float
            const currentSampleRate = context.sampleRate; // Use the rate stored in context

            // Damping coefficients (using safe division)
            const safeSampleRate = (currentSampleRate > 0) ? currentSampleRate : 44100.0; // Avoid division by zero
            // Avoid Math.exp if frequency is effectively zero or nyquist (can cause issues)
            const hdCoeff = (hdParam <= 0 || hdParam >= safeSampleRate * 0.5) ? 0.0 : Math.exp(-twoPI * hdParam / safeSampleRate);
            const ldCoeff = (ldParam <= 0 || ldParam >= safeSampleRate * 0.5) ? 0.0 : (1.0 - Math.exp(-twoPI * ldParam / safeSampleRate));
            const dampAmount = dpParam * 0.01; // Convert percent to 0-1
            const oneMinusDampAmount = 1.0 - dampAmount;

            // Density & Normalization
            const numActiveCombs = (dsParam > context.numCombFilters) ? context.numCombFilters : (dsParam | 0); // Clamp to available combs, ensure integer
            // Avoid division by zero if numActiveCombs is 0
            const normalizationFactor = (numActiveCombs > 0) ? (0.4 / numActiveCombs) : 0.0;

            // Diffusion coefficients
            const dfClamped = (dfParam < -1.0) ? -1.0 : (dfParam > 1.0 ? 1.0 : dfParam); // Clamp diffusion [-1, 1]
            const dfSquared = dfClamped * dfClamped;
            const oneMinusDf = 1.0 - dfClamped;
            const oneMinusDfSquared = 1.0 - dfSquared;

            // Mix gains (Equal power crossfade approx)
            const wetMix = mxParam * 0.01; // Convert percent to 0-1
            // Using if/else might be faster than ternary ?: per requirement, although often optimized similarly
            let dryGain, wetGain;
            if (wetMix <= 0.5) {
                dryGain = 1.0;
                wetGain = 2.0 * wetMix;
            } else {
                dryGain = 2.0 * (1.0 - wetMix);
                wetGain = 1.0;
            }

            // Room size scaling factor (applied to feedback)
            const roomScale = rsParam * 0.1; // Convert 0-10 to 0-1

            // Reverb time related feedback gain calculation
            // Avoid division by zero or negative RT
            const rtCoeff = (rtParam > 0.001) ? (1.0 / rtParam) : 1000.0; // Inverse RT or large value if RT is near zero
            const feedbackGains = new Float32Array(context.numCombFilters); // Use Float32Array
            const randomizedDelaysMs = context.randomizedDelaysMs; // Cache local
            const numTotalCombs = context.numCombFilters;
            for (let i = 0; i < numTotalCombs; i++) {
                const delayTimeSeconds = randomizedDelaysMs[i] * 0.001;
                // Calculate gain based on RT60 formula (approx)
                // Use Math.max(0.001, ...) to prevent log(0) or negative base in pow
                const gain = Math.pow(Math.max(0.001, 0.001), delayTimeSeconds * rtCoeff);
                const scaledGain = gain * roomScale;
                // Clamp feedback gain to prevent instability [-0.9, 0.9]
                // Using if/else instead of ternary ?: or Math.min/max
                if (scaledGain < -0.9) {
                    feedbackGains[i] = -0.9;
                } else if (scaledGain > 0.9) {
                    feedbackGains[i] = 0.9;
                } else {
                    feedbackGains[i] = scaledGain;
                }
            }

            // Flag for skipping damping calculations if amount is zero
            const applyDamping = dampAmount > 1e-6; // Use a small threshold for float comparison


            // --- Main Processing Loop (Per Channel) ---
            for (let ch = 0; ch < channelCount; ch++) {
                const channelDataOffset = ch * blockSize;

                // --- Cache Context Data for this Channel ---
                const preDelay = context.preDelayBuffer[ch];
                const combFilters = context.combFilters[ch]; // Array of comb filter objects
                const allpassFilters = context.allpassFilters[ch]; // Array of allpass filter objects

                // Cache Pre-delay buffer & position
                const preDelayBuffer = preDelay.buffer;
                let preDelayPos = preDelay.pos; // Use let as it changes
                const preDelayLength = preDelayBuffer.length;

                // Cache Allpass filters & states
                const apf0 = allpassFilters[0];
                const apf1 = allpassFilters[1];
                const apf0Buffer = apf0.buffer;
                const apf1Buffer = apf1.buffer;
                let apf0Pos = apf0.pos;
                let apf1Pos = apf1.pos;
                const apf0Length = apf0Buffer.length;
                const apf1Length = apf1Buffer.length;
                let apf0LastOutput = apf0.lastOutput; // Previous output sample for feedback
                let apf1LastOutput = apf1.lastOutput;

                // Cache Damping states for this channel
                let hdState = context.hdStates[ch];
                let ldState = context.ldStates[ch];

                // --- Inner Sample Loop ---
                for (let i = 0; i < blockSize; i++) {
                    const sampleIndex = channelDataOffset + i;
                    const inputSample = data[sampleIndex]; // Dry input sample

                    // --- Pre-Delay ---
                    // Read the delayed sample *before* overwriting
                    const delayedInput = preDelayBuffer[preDelayPos];
                    // Write the current input sample into the delay buffer
                    preDelayBuffer[preDelayPos] = inputSample;
                    // Advance and wrap the write position (manual modulo)
                    preDelayPos++;
                    if (preDelayPos === preDelayLength) { // Use === for potential speed
                        preDelayPos = 0;
                    }

                    // --- Comb Filters ---
                    let combOutputSum = 0.0;
                    // Loop only through the active number of comb filters
                    for (let j = 0; j < numActiveCombs; j++) {
                        const comb = combFilters[j]; // Get current comb filter object
                        // Cache comb properties locally
                        const combBuffer = comb.buffer;
                        let combPos = comb.pos; // Use let
                        const combLength = combBuffer.length;

                        // Read the delayed sample from the comb buffer
                        const delayedSample = combBuffer[combPos];

                        // Apply damping to the feedback signal (delayedSample)
                        // Simulate original's structure where damping state was channel-wide
                        // (This might be slightly different from per-comb damping but matches original code)
                        // If per-comb state was intended, hdState/ldState would need caching inside this loop
                        let dampedFeedback = delayedSample; // Start with undamped
                        if (applyDamping) {
                            // Apply high-damp (low-pass) filter to feedback
                            const hdFiltered = delayedSample + hdCoeff * (hdState - delayedSample);
                             // Apply low-damp (high-pass derived) filter to feedback
                            const ldFiltered = hdFiltered + ldCoeff * (ldState - hdFiltered);
                            // Blend original feedback with filtered feedback based on dampAmount
                            // Let's assume the intention was using the *channel's* overall damping state here
                            dampedFeedback = delayedSample * oneMinusDampAmount + ldFiltered * dampAmount;
                            // Update channel damping states based on the *input* to the damping stage (delayedSample)
                            // This seems slightly odd, usually state is based on output, but mimics original.
                            hdState = hdFiltered;
                            ldState = ldFiltered;
                        }


                        // Calculate feedback signal (input + scaled & damped feedback)
                        // Use pre-calculated feedbackGains[j]
                        const feedbackSignal = delayedInput + dampedFeedback * feedbackGains[j];

                        // Write the feedback signal into the comb buffer
                        combBuffer[combPos] = feedbackSignal;

                        // Advance and wrap the comb buffer position
                        combPos++;
                        if (combPos === combLength) {
                            combPos = 0;
                        }
                        comb.pos = combPos; // Update position in the object for next block

                        // Add the (undamped) delayed sample to the sum
                        combOutputSum += delayedSample;
                    } // End Comb filter loop

                    // Normalize the summed comb filter output
                    let processedSample = combOutputSum * normalizationFactor;

                    // --- Allpass Filters (Diffusion) ---
                    // Apply first allpass filter
                    const apf0Delayed = apf0Buffer[apf0Pos]; // Sample from delay line
                    // Allpass calculation (diffuser structure)
                    const apf0Out = -oneMinusDf * processedSample + apf0Delayed + dfClamped * apf0LastOutput;
                    apf0Buffer[apf0Pos] = processedSample; // Write input into delay line
                    // Advance and wrap position
                    apf0Pos++;
                    if (apf0Pos === apf0Length) apf0Pos = 0;
                    apf0LastOutput = apf0Out; // Store output for next sample's feedback
                    // Apply feedforward gain adjustment (common in nested allpass)
                    processedSample = apf0Out * oneMinusDfSquared;

                    // Apply second allpass filter (identical structure)
                    const apf1Delayed = apf1Buffer[apf1Pos];
                    const apf1Out = -oneMinusDf * processedSample + apf1Delayed + dfClamped * apf1LastOutput;
                    apf1Buffer[apf1Pos] = processedSample;
                    apf1Pos++;
                    if (apf1Pos === apf1Length) apf1Pos = 0;
                    apf1LastOutput = apf1Out;
                    processedSample = apf1Out * oneMinusDfSquared;


                    // --- Final Output Stage ---
                    // Apply final channel damping if needed (applied to the signal *after* diffusion)
                    // This seems redundant if comb feedback damping uses channel states, but replicate original.
                    if (applyDamping) {
                       // This uses the *channel* hdState/ldState updated within the comb loop.
                       // Note: Original code applied this damping *differently* than comb feedback damping.
                       const finalHdFiltered = processedSample + hdCoeff * (hdState - processedSample);
                       const finalLdFiltered = finalHdFiltered + ldCoeff * (ldState - finalHdFiltered);
                       // Blend based on dampAmount
                       processedSample = processedSample * oneMinusDampAmount + finalLdFiltered * dampAmount; // Blend using the newly filtered version
                       // Update channel states based on this final stage's input
                       hdState = finalHdFiltered; // Update state based on final stage
                       ldState = finalLdFiltered;
                    }

                    // Apply Wet/Dry Mix
                    const outputSample = inputSample * dryGain + processedSample * wetGain;

                    // Write the final mixed sample back to the output buffer
                    data[sampleIndex] = outputSample;

                } // End Sample loop

                // --- Update Context State for Next Block ---
                preDelay.pos = preDelayPos; // Store final position
                apf0.pos = apf0Pos;
                apf1.pos = apf1Pos;
                apf0.lastOutput = apf0LastOutput; // Store final filter state
                apf1.lastOutput = apf1LastOutput;
                context.hdStates[ch] = hdState; // Store final damping state
                context.ldStates[ch] = ldState;
                // Comb filter positions were updated inside the inner loop

            } // End Channel loop

            // Return the modified data buffer
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
        if (params.pd !== undefined) {
            const value = Number(params.pd);
            this.pd = value < 0 ? 0 : (value > 50 ? 50 : value);
        }
        if (params.rs !== undefined) {
            const value = Number(params.rs);
            this.rs = value < 2.0 ? 2.0 : (value > 50.0 ? 50.0 : value);
        }
        if (params.rt !== undefined) {
            const value = Number(params.rt);
            this.rt = value < 0.1 ? 0.1 : (value > 10.0 ? 10.0 : value);
        }
        if (params.ds !== undefined) {
            const value = Math.floor(Number(params.ds));
            this.ds = value < 4 ? 4 : (value > 8 ? 8 : value);
        }
        if (params.df !== undefined) {
            const value = Number(params.df);
            this.df = value < 0.2 ? 0.2 : (value > 0.8 ? 0.8 : value);
        }
        if (params.dp !== undefined) {
            const value = Number(params.dp);
            this.dp = value < 0 ? 0 : (value > 100 ? 100 : value);
        }
        if (params.hd !== undefined) {
            const value = Number(params.hd);
            this.hd = value < 1000 ? 1000 : (value > 20000 ? 20000 : value);
        }
        if (params.ld !== undefined) {
            const value = Number(params.ld);
            this.ld = value < 20 ? 20 : (value > 500 ? 500 : value);
        }
        if (params.mx !== undefined) {
            const value = Number(params.mx);
            this.mx = value < 0 ? 0 : (value > 100 ? 100 : value);
        }
        this.updateParameters();
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'plugin-parameter-ui';

        // Utility function to create a parameter row with a slider and number input
        const createRow = (labelText, type, min, max, step, value, onChange, paramName) => {
            const row = document.createElement('div');
            row.className = 'parameter-row';
            
            // Create unique IDs for the inputs
            const sliderId = `${this.id}-${this.name}-${paramName}-slider`;
            const inputId = `${this.id}-${this.name}-${paramName}-input`;
            
            const label = document.createElement('label');
            label.textContent = labelText;
            label.htmlFor = sliderId; // Associate label with slider
            
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = value;
            slider.id = sliderId;
            slider.name = sliderId;
            slider.autocomplete = "off";
            
            const input = document.createElement('input');
            input.type = type;
            input.min = min;
            input.max = max;
            input.step = step;
            input.value = value;
            input.id = inputId;
            input.name = inputId;
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

        container.appendChild(createRow('Pre-Delay (ms):', 'number', '0', '50', '0.1', this.pd, (value) => this.setParameters({ pd: value }), 'predelay'));
        container.appendChild(createRow('Room Size (m):', 'number', '2.0', '50.0', '0.1', this.rs, (value) => this.setParameters({ rs: value }), 'roomsize'));
        container.appendChild(createRow('Reverb Time (s):', 'number', '0.1', '10.0', '0.1', this.rt, (value) => this.setParameters({ rt: value }), 'reverbtime'));
        container.appendChild(createRow('Density (lines):', 'number', '4', '8', '1', this.ds, (value) => this.setParameters({ ds: value }), 'density'));
        container.appendChild(createRow('Diffusion (ratio):', 'number', '0.2', '0.8', '0.01', this.df, (value) => this.setParameters({ df: value }), 'diffusion'));
        container.appendChild(createRow('Damping (%):', 'number', '0', '100', '1', this.dp, (value) => this.setParameters({ dp: value }), 'damping'));
        container.appendChild(createRow('High Damp (Hz):', 'number', '1000', '20000', '100', this.hd, (value) => this.setParameters({ hd: value }), 'highdamp'));
        container.appendChild(createRow('Low Damp (Hz):', 'number', '20', '500', '1', this.ld, (value) => this.setParameters({ ld: value }), 'lowdamp'));
        container.appendChild(createRow('Mix (%):', 'number', '0', '100', '1', this.mx, (value) => this.setParameters({ mx: value }), 'mix'));

        return container;
    }
}

// Register the plugin globally
window.RSReverbPlugin = RSReverbPlugin;
