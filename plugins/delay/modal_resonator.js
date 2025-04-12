class ModalResonatorPlugin extends PluginBase {
    constructor() {
        super('Modal Resonator', 'Frequency resonance effect with up to 5 resonators');

        this.en = true;
        this.rs = Array(5).fill(null).map((_, i) => ({
            en: true,
            fr: this._getInitialFreq(i),
            dc: this._getInitialDecay(i),
            lp: this._getInitialLpf(i)
        }));
        this.mx = 50;
        this.sr = 0;

        const LOG_20 = Math.log(20);
        const LOG_20000 = Math.log(20000);
        const LOG_RANGE_RECIP = 1 / (LOG_20000 - LOG_20);
        const TWO_PI = 2 * Math.PI;

        // Register the audio processor
        this.registerProcessor(`
            // Constants assumed to be available in the processor's scope
            // These should be calculated or provided when the processor is created/registered
            // Example values, replace with actuals:
            const LOG_20 = 2.995732273553991;          // Math.log(20)
            const LOG_20000 = 9.903487552536127;      // Math.log(20000)
            const LOG_RANGE_RECIP = 1.0 / (LOG_20000 - LOG_20); // 1.0 / Math.log(20000/20)
            const LOG_0_001 = -6.907755278982137;      // Math.log(0.001) (-60dB)
            const TWO_PI = 6.283185307179586;          // 2 * Math.PI

            // Processor entry point
            if (!parameters.en) return data; // Exit if the entire effect is disabled

            // --- Cache Core Parameters ---
            const sampleRate = parameters.sampleRate;
            const invSampleRate = 1.0 / sampleRate; // Pre-calculate inverse sample rate
            const channelCount = parameters.channelCount;
            const blockSize = parameters.blockSize; // Typically 128 for AudioWorklet

            // --- Calculate Mix Gains ---
            const mix = parameters.mx;         // Wet/Dry mix percentage (0-100)
            const wetGain = mix * 0.01;        // Convert mix percentage to linear gain [0, 1]
            const dryGain = 1.0 - wetGain;     // Calculate complementary dry gain

            // --- Context Initialization or Re-initialization ---
            // Check if context needs initialization or if configuration (sampleRate, channelCount) has changed
            if (!context.initialized ||
                context.channelCount !== channelCount ||
                context.sampleRate !== sampleRate)
            {
                // Calculate max delay buffer size based on the lowest expected frequency (~20Hz)
                const maxDelaySamples = Math.ceil(sampleRate / 20.0855); // exp(3) ~ 20.0855 Hz

                // Allocate memory using typed arrays for performance and predictable memory layout
                context.delayBuffers = new Array(channelCount);   // Array of channels
                context.delayPositions = new Array(channelCount); // Array of channels
                context.lpfStates = new Array(channelCount);      // Array of channels

                for (let ch = 0; ch < channelCount; ++ch) {
                    context.delayBuffers[ch] = new Array(5);         // Array for 5 resonators per channel
                    context.delayPositions[ch] = new Uint32Array(5); // Stores write position for each delay line (integer)
                    context.lpfStates[ch] = new Float32Array(5);     // Stores LPF state for each resonator
                    for (let r = 0; r < 5; ++r) {
                        // Allocate the actual delay line buffer for each resonator
                        context.delayBuffers[ch][r] = new Float32Array(maxDelaySamples);
                        // Uint32Array and Float32Array are implicitly initialized to 0
                    }
                }

                // Allocate accumulator buffer (once per processor instance, reused across blocks)
                // Assumes blockSize is constant (like 128). Handle variations if necessary.
                context.accum = new Float32Array(blockSize); // Accumulates wet signal per block per channel

                // Store current configuration in context
                context.channelCount = channelCount;
                context.sampleRate = sampleRate;
                context.initialized = true;
                // console.log("Resonator context initialized/reinitialized. Max Delay:", maxDelaySamples); // Optional: Dev log
            }

            // --- Calculate Resonator Parameters ---
            // Pre-calculate parameters for each of the 5 potential resonators based on current settings
            let activeCount = 0; // Count active resonators for output scaling
            const resonatorParams = new Array(5); // Pre-allocate array for parameters

            for (let r = 0; r < 5; ++r) {
                const resParamInput = parameters.rs[r]; // Get input parameters for resonator 'r'
                if (!resParamInput.en) { // Check if this resonator is enabled
                    resonatorParams[r] = null; // Mark as inactive
                    continue; // Skip parameter calculation for disabled resonators
                }
                activeCount++; // Increment active resonator count

                // Calculate parameters from input controls (often logarithmic scales)
                const freqHz = Math.exp(resParamInput.fr); // Convert frequency from log scale
                const lpfHz = Math.exp(resParamInput.lp);  // Convert LPF cutoff from log scale

                // Calculate delay length in samples based on frequency (integer delay)
                // Use bitwise OR 0 for fast truncation to integer (only safe for positive numbers)
                const delaySamples = Math.max(1, (sampleRate / freqHz) | 0);

                // Calculate decay time in samples
                const decayTimeSamples = resParamInput.dc * 0.001 * sampleRate;

                // Normalize frequency logarithmically within the assumed range [20Hz, 20kHz] for adjustments
                const normalizedFreq = (Math.log(freqHz) - LOG_20) * LOG_RANGE_RECIP;

                // Adjust decay time based on frequency (heuristic: higher frequencies decay slightly faster)
                const adjustedDecayTime = Math.max(1.0, decayTimeSamples * (1.0 - normalizedFreq * 0.7));

                // Calculate feedback gain based on the desired decay time and the delay length
                // Number of times the delay buffer length fits within the adjusted decay time
                const periodsInDecay = Math.max(0.1, adjustedDecayTime / delaySamples);
                // Calculate feedback gain needed to decay to -60dB (amplitude 0.001) over 'periodsInDecay'
                let feedback = Math.exp(LOG_0_001 / periodsInDecay);

                // Clamp feedback slightly below 1.0 for stability guarantees
                feedback = Math.min(feedback, 0.999);

                // Calculate LPF coefficient (one-pole filter) based on cutoff frequency
                const lpfCoeff = Math.exp(-TWO_PI * lpfHz * invSampleRate);
                const lpfCoeffInv = 1.0 - lpfCoeff; // Pre-calculate (1 - coefficient) for the filter calculation

                // Scale feedback based on frequency (heuristic: reduce feedback slightly for higher frequencies)
                const feedbackScaling = Math.max(0.1, 1.0 - normalizedFreq * 0.5);
                const feedbackScaled = feedback * feedbackScaling; // Final feedback gain used in the loop

                // Store calculated parameters for efficient access in the main loop
                resonatorParams[r] = {
                    delaySamples: delaySamples,
                    // feedback: feedback, // Original feedback might not be needed after scaling
                    lpfCoeff: lpfCoeff,
                    lpfCoeffInv: lpfCoeffInv,
                    feedbackScaled: feedbackScaled
                };
            }

            // Calculate output scaling factor to normalize based on the number of active resonators
            const scaleFactor = activeCount > 0 ? 1.0 / activeCount : 0.0;
            // Calculate the final wet gain to be applied after accumulating resonator outputs
            const outWetGain = scaleFactor * wetGain;

            // --- Get References to Context Data ---
            // Get references to context arrays/buffers before the main channel loop for slightly faster access
            const delayBuffers = context.delayBuffers;
            const delayPositions = context.delayPositions;
            const lpfStates = context.lpfStates;
            const accum = context.accum; // Use the pre-allocated accumulator buffer reference

            // --- Main Processing Loop ---
            for (let ch = 0; ch < channelCount; ++ch) {
                const offset = ch * blockSize; // Calculate index offset for the current channel in the input/output data

                // --- Clear Accumulator ---
                // Reset the accumulator buffer for this channel at the start of each block
                accum.fill(0.0);

                // --- Get Channel-Specific References ---
                // Get references to this channel's specific state arrays and delay buffers
                const channelDelayBuffers = delayBuffers[ch];
                const channelDelayPositions = delayPositions[ch]; // Uint32Array reference
                const channelLpfStates = lpfStates[ch];         // Float32Array reference

                // --- Resonator Loop ---
                // Iterate through each potential resonator
                for (let r = 0; r < 5; ++r) {
                    const params = resonatorParams[r]; // Get pre-calculated parameters for resonator 'r'
                    if (!params) continue; // Skip if this resonator is disabled

                    // --- Cache Resonator State & Params ---
                    // Cache frequently accessed parameters and state in local variables for the inner sample loop
                    const delayBuffer = channelDelayBuffers[r];         // Reference to the delay line Float32Array
                    const delayBufferLength = delayBuffer.length;     // Cache buffer length for modulo/wrap checks
                    let delayPos = channelDelayPositions[r];           // Current write position (copied to local)
                    let lpfState = channelLpfStates[r];               // Current LPF state (copied to local)
                    // Cache calculated parameters locally
                    const delaySamples = params.delaySamples;         // Delay length in samples
                    const feedbackScaled = params.feedbackScaled;     // Scaled feedback gain
                    const lpfCoeff = params.lpfCoeff;               // LPF coefficient
                    const lpfCoeffInv = params.lpfCoeffInv;           // Pre-calculated (1.0 - lpfCoeff)

                    // --- Sample Loop ---
                    // Process each sample within the current block for this resonator
                    for (let i = 0; i < blockSize; ++i) {
                        const inputSample = data[offset + i]; // Get the input sample for this frame

                        // --- Calculate Read Position & Read Sample ---
                        // Calculate the read position relative to the current write position, wrapping around the buffer.
                        // Using 'if' for wrap-around might be slightly faster than modulo '%' in some JS engines.
                        let readPos = delayPos - delaySamples;
                        if (readPos < 0) {
                            readPos += delayBufferLength; // Wrap negative index back into buffer range
                        }
                        const delaySample = delayBuffer[readPos]; // Read the delayed sample

                        // --- Apply LPF ---
                        // Apply the one-pole low-pass filter to the delayed sample
                        lpfState = delaySample * lpfCoeffInv + lpfState * lpfCoeff;

                        // --- Accumulate Output ---
                        // Add the filtered output of this resonator to the common accumulator buffer for this channel
                        accum[i] += lpfState;

                        // --- Write to Delay Buffer ---
                        // Calculate the value to write back into the delay line: input + filtered feedback
                        delayBuffer[delayPos] = inputSample + lpfState * feedbackScaled;

                        // --- Update Write Position ---
                        // Increment the write position for the next sample, wrapping around the buffer.
                        delayPos++;
                        if (delayPos >= delayBufferLength) {
                            delayPos = 0; // Wrap back to the start if end is reached
                        }
                    } // End Sample Loop

                    // --- Store Updated State ---
                    // Store the final write position and LPF state back into the context arrays for this resonator/channel
                    channelDelayPositions[r] = delayPos;
                    channelLpfStates[r] = lpfState;
                } // End Resonator Loop

                // --- Mix Dry and Wet Signals ---
                // Combine the original dry signal with the accumulated wet signal from all active resonators
                for (let i = 0; i < blockSize; ++i) {
                    const inputSample = data[offset + i]; // Get original input sample again
                    // Overwrite the input/output buffer with the mixed result
                    data[offset + i] = inputSample * dryGain + accum[i] * outWetGain;
                }
            } // End Channel Loop

            // Return the modified data buffer containing the processed audio
            return data;
        `);
    }

    _getInitialFreq(index) {
        const freqValues = [400, 900, 1600, 3000, 6500];
        return Number(Math.log(freqValues[index]).toFixed(2));
    }

    _getInitialDecay(index) {
        return [100, 80, 60, 45, 30][index];
    }

    _getInitialLpf(index) {
        const lpfValues = [2000, 2500, 3000, 3500, 4000];
        return Number(Math.log(lpfValues[index]).toFixed(2));
    }

    getParameters() {
        return {
            type: this.constructor.name,
            en: this.en,
            rs: this.rs,
            mx: this.mx,
            sr: this.sr
        };
    }

    setParameters(params) {
        let updated = false;

        if (params.en !== undefined) {
            this.en = Boolean(params.en);
            updated = true;
        }

        if (params.mx !== undefined) {
            const newMix = Number(params.mx);
            if (!isNaN(newMix)) {
                this.mx = Math.max(0, Math.min(100, newMix));
                updated = true;
            }
        }

        if (params.sr !== undefined) {
            const index = Number(params.sr);
            if (!isNaN(index) && index >= 0 && index < 5) {
                this.sr = Math.floor(index);
                updated = true;
            }
        }

        if (params.rs !== undefined && Array.isArray(params.rs)) {
            params.rs.forEach((resonator, index) => {
                if (index < this.rs.length && resonator) {
                    if (resonator.en !== undefined) {
                        this.rs[index].en = Boolean(resonator.en);
                    }
                    if (resonator.fr !== undefined) {
                        const fr = Number(resonator.fr);
                        if (!isNaN(fr)) {
                            this.rs[index].fr = Math.max(3.00, Math.min(9.90, fr));
                        }
                    }
                    if (resonator.dc !== undefined) {
                        const dc = Number(resonator.dc);
                        if (!isNaN(dc)) {
                            this.rs[index].dc = Math.max(1, Math.min(500, dc));
                        }
                    }
                    if (resonator.lp !== undefined) {
                        const lp = Number(resonator.lp);
                        if (!isNaN(lp)) {
                            this.rs[index].lp = Math.max(3.00, Math.min(9.90, lp));
                        }
                    }
                }
            });
            updated = true;
        }

        if (params.resonatorIndex !== undefined && params.resonatorParams) {
            const index = Number(params.resonatorIndex);
            if (!isNaN(index) && index >= 0 && index < 5) {
                const resonator = this.rs[index];
                const resParams = params.resonatorParams;

                if (resParams.en !== undefined) {
                    resonator.en = Boolean(resParams.en);
                    updated = true;
                }
                if (resParams.fr !== undefined) {
                    const freq = Number(resParams.fr);
                    if (!isNaN(freq)) {
                        resonator.fr = Math.max(3.00, Math.min(9.90, freq));
                        updated = true;
                    }
                }
                if (resParams.dc !== undefined) {
                    const decay = Number(resParams.dc);
                    if (!isNaN(decay)) {
                        resonator.dc = Math.max(1, Math.min(500, decay));
                        updated = true;
                    }
                }
                if (resParams.lp !== undefined) {
                    const lpf = Number(resParams.lp);
                    if (!isNaN(lpf)) {
                        resonator.lp = Math.max(3.00, Math.min(9.90, lpf));
                        updated = true;
                    }
                }
            }
        }

        if (updated) {
            this.updateParameters();
        }
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'plugin-parameter-ui';
        container.id = this.id;

        const resonatorContainer = document.createElement('div');
        resonatorContainer.className = 'modal-resonator-container';

        const settingsContainer = document.createElement('div');
        settingsContainer.className = 'modal-resonator-frame';

        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'modal-resonator-tabs';

        const contentContainer = document.createElement('div');

        const createResonatorRow = (label, min, max, step, value, param, resonatorIndex) => {
            const row = document.createElement('div');
            row.className = 'parameter-row';

            const labelEl = document.createElement('label');
            labelEl.textContent = label;
            row.appendChild(labelEl);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = value;

            const input = document.createElement('input');
            input.type = 'number';
            if (param === 'fr' || param === 'lp') {
                input.min = Math.round(Math.exp(min));
                input.max = Math.round(Math.exp(max));
                input.step = 1;
                input.value = Math.round(Math.exp(value));
            } else {
                input.min = min;
                input.max = max;
                input.step = step;
                input.value = value;
            }

            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (param === 'fr' || param === 'lp') {
                    input.value = Math.round(Math.exp(val));
                } else {
                    input.value = val;
                }
                const params = {};
                params[param] = val;
                this.setParameters({
                    resonatorIndex: resonatorIndex,
                    resonatorParams: params
                });
            });

            input.addEventListener('input', (e) => {
                let inputVal = parseFloat(e.target.value);
                let paramVal;
                if (isNaN(inputVal)) {
                    inputVal = (param === 'fr' || param === 'lp') ? Math.round(Math.exp(this.rs[resonatorIndex][param])) : this.rs[resonatorIndex][param];
                }
                if (param === 'fr' || param === 'lp') {
                    const minHz = Math.round(Math.exp(min));
                    const maxHz = Math.round(Math.exp(max));
                    inputVal = Math.max(minHz, Math.min(maxHz, inputVal));
                    paramVal = Math.log(inputVal);
                    paramVal = Math.max(min, Math.min(max, parseFloat(paramVal.toFixed(2))));
                    e.target.value = Math.round(inputVal);
                } else {
                    paramVal = Math.max(min, Math.min(max, inputVal));
                    e.target.value = paramVal;
                }
                slider.value = paramVal;
                const params = {};
                params[param] = paramVal;
                this.setParameters({
                    resonatorIndex: resonatorIndex,
                    resonatorParams: params
                });
            });

            row.appendChild(slider);
            row.appendChild(input);
            return row;
        };

        for (let i = 0; i < 5; i++) {
            const tab = document.createElement('button');
            tab.className = `modal-resonator-tab ${i === this.sr ? 'active' : ''}`;
            tab.textContent = `Resonator ${i + 1}`;

            tab.onclick = () => {
                const pluginUI = document.getElementById(this.id);
                if (!pluginUI) return;

                pluginUI.querySelectorAll('.modal-resonator-tab').forEach(el => el.classList.remove('active'));
                pluginUI.querySelectorAll('.modal-resonator-content').forEach(el => el.classList.remove('active'));

                tab.classList.add('active');
                const content = pluginUI.querySelector(`.modal-resonator-content[data-index="${i}"]`);
                if (content) {
                    content.classList.add('active');
                }
                this.setParameters({ sr: i });
            };

            tabsContainer.appendChild(tab);

            const content = document.createElement('div');
            content.className = `modal-resonator-content ${i === this.sr ? 'active' : ''}`;
            content.setAttribute('data-index', i);

            const paramUI = document.createElement('div');
            paramUI.className = 'plugin-parameter-ui';
            content.appendChild(paramUI);

            const resonator = this.rs[i];

            const enableRow = document.createElement('div');
            enableRow.className = 'parameter-row';
            const enableLabel = document.createElement('label');
            enableLabel.textContent = 'Enable:';
            enableRow.appendChild(enableLabel);

            const enableCheckbox = document.createElement('input');
            enableCheckbox.type = 'checkbox';
            enableCheckbox.checked = resonator.en;
            enableCheckbox.onchange = (e) => {
                this.setParameters({
                    resonatorIndex: i,
                    resonatorParams: { en: e.target.checked }
                });
            };
            enableRow.appendChild(enableCheckbox);
            paramUI.appendChild(enableRow);

            paramUI.appendChild(createResonatorRow(
                'Freq (Hz):', 3.00, 9.90, 0.01, resonator.fr, 'fr', i
            ));
            paramUI.appendChild(createResonatorRow(
                'Decay (ms):', 1, 500, 1, resonator.dc, 'dc', i
            ));
            paramUI.appendChild(createResonatorRow(
                'LPF Freq (Hz):', 3.00, 9.90, 0.01, resonator.lp, 'lp', i
            ));

            contentContainer.appendChild(content);
        }

        settingsContainer.appendChild(tabsContainer);
        settingsContainer.appendChild(contentContainer);
        resonatorContainer.appendChild(settingsContainer);
        container.appendChild(resonatorContainer);

        const createMixRow = (labelText, type, min, max, step, value, onChange) => {
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
                let val = parseFloat(e.target.value);
                if (isNaN(val)) {
                    val = this.mx;
                }
                val = Math.max(min, Math.min(max, val));
                onChange(val);
                slider.value = val;
                e.target.value = val;
            });

            row.appendChild(label);
            row.appendChild(slider);
            row.appendChild(input);
            return row;
        };

        container.appendChild(createMixRow('Mix (%):', 'number', 0, 100, 1, this.mx,
            (value) => this.setParameters({ mx: value })));

        return container;
    }
}

window.ModalResonatorPlugin = ModalResonatorPlugin;
