class TremoloPlugin extends PluginBase {
    constructor() {
        super('Tremolo', 'Volume-based modulation effect');

        this.rt = 10.0;       // rt: Rate - Range: 0.1-20 Hz
        this.dp = 2.0;        // dp: Depth - Range: 0-12 dB
        this.rn = 6.0;        // rn: Randomness - Range: 0-96 dB
        this.rc = 200.0;      // rc: Randomness Cutoff - Range: 1-1000 Hz
        this.rs = -6.0;       // rs: Randomness Slope - Range: -12.0 to 0.0 dB (maps to Q)
        this.cp = 0;          // cp: Channel Phase - Range: -180-180 degrees
        this.cs = 100;        // cs: Channel Sync - Range: 0-100%

        // Register the audio processor
        this.registerProcessor(`
            // Initial check for processor enablement
            if (!parameters.enabled) return data;

            // --- Constants and Pre-calculations ---

            const TWO_PI = 6.283185307179586;
            const DEG_TO_RAD = 0.017453292519943295;
            const SQRT2 = 1.4142135623730951;
            const MIN_Q = 0.01; // Minimum Q value for stability

            // Cache frequently accessed parameters locally
            const sampleRate = parameters.sampleRate;
            const blockSize = parameters.blockSize;
            const channelCount = parameters.channelCount;
            const rate = parameters.rt;
            const depth = parameters.dp;
            const randomness = parameters.rn;
            const randomnessCutoff = parameters.rc;
            const randomnessSlope = parameters.rs; // -12.0 to 0.0
            const channelPhase = parameters.cp;
            const channelSync = parameters.cs;

            // Ensure context variables exist for Biquad states
            if (context.phase === undefined) context.phase = 0;
            if (context.common_x1 === undefined) context.common_x1 = 0.0;
            if (context.common_x2 === undefined) context.common_x2 = 0.0;
            if (context.ch_x1 === undefined) context.ch_x1 = [];
            if (context.ch_x2 === undefined) context.ch_x2 = [];


            // Initialize/Resize channel-specific Biquad states arrays if needed
            if (context.ch_x1.length !== channelCount) {
                context.ch_x1 = new Array(channelCount).fill(0.0);
                context.ch_x2 = new Array(channelCount).fill(0.0);
            }

            // --- Calculate Biquad LPF Coefficients ---
            // Map slope slider value (-12 to 0) to Q value
            // rs = 0   => Q = 10^(6/6) * (1/sqrt(2)) = 10 / sqrt(2) ~ 7.07
            // rs = -6  => Q = 10^(0/6) * (1/sqrt(2)) = 1 / sqrt(2) ~ 0.707 (Butterworth)
            // rs = -12 => Q = 10^(-6/6)* (1/sqrt(2)) = 0.1 / sqrt(2) ~ 0.07
            const calculatedQ = Math.pow(10.0, (randomnessSlope + 6.0) / 6.0) * (1.0 / SQRT2);
            const Q = Math.max(MIN_Q, calculatedQ); // Ensure Q is not too low

            const fc = randomnessCutoff;
            const fs = sampleRate;
            let norm_b0 = 1.0, norm_b1 = 0.0, norm_b2 = 0.0, norm_a1 = 0.0, norm_a2 = 0.0;

            // Avoid calculation issues at Nyquist or 0Hz
            if (fc > 0 && fc < fs / 2) {
                const omega = TWO_PI * fc / fs;
                const alpha = Math.sin(omega) / (2.0 * Q);
                const cosOmega = Math.cos(omega);

                // Check if alpha is valid before calculating coefficients
                if (alpha > 0 && 1.0 + alpha !== 0) {
                     const b0 = (1.0 - cosOmega) / 2.0;
                     const b1 = 1.0 - cosOmega;
                     const b2 = (1.0 - cosOmega) / 2.0;
                     const a0_inv = 1.0 / (1.0 + alpha);
                     const a1 = -2.0 * cosOmega;
                     const a2 = 1.0 - alpha;

                     // Normalized coefficients
                     norm_b0 = b0 * a0_inv;
                     norm_b1 = b1 * a0_inv;
                     norm_b2 = b2 * a0_inv;
                     norm_a1 = a1 * a0_inv;
                     norm_a2 = a2 * a0_inv;
                } else {
                     // Fallback to pass-through if alpha is invalid (e.g., Q extremely high/low at certain freqs)
                     norm_b0 = 1.0; norm_b1 = 0.0; norm_b2 = 0.0; norm_a1 = 0.0; norm_a2 = 0.0;
                }

            } else if (fc <= 0) {
                 // Pass-through for 0Hz cutoff
                 norm_b0 = 1.0; norm_b1 = 0.0; norm_b2 = 0.0; norm_a1 = 0.0; norm_a2 = 0.0;
            }
            // Note: fc >= fs/2 case implicitly handled by potential instability, leading to fallback or near pass-through


            // Pre-calculate other invariants
            const phaseIncrement = TWO_PI * rate / sampleRate;
            const channelPhaseRad = channelPhase * DEG_TO_RAD;
            const syncRatio = channelSync * 0.01;
            const invSyncRatio = 1.0 - syncRatio;
            const negDepth = -depth;
            const negRandomnessX2 = -randomness * 2.0;
            const inv20 = 0.05;

            // Load phase state
            let phase = context.phase;

            // --- Main Processing Loop ---
            for (let i = 0; i < blockSize; ++i) {
                // --- Update Common Phase ---
                phase += phaseIncrement;
                if (phase >= TWO_PI) {
                    phase -= TWO_PI;
                }

                // --- Generate and Filter Common Noise ---
                const noise = Math.random() - 0.5;
                // Apply Biquad LPF (Direct Form II Transposed)
                let filteredCommonNoise = norm_b0 * noise + context.common_x1;
                context.common_x1 = norm_b1 * noise - norm_a1 * filteredCommonNoise + context.common_x2;
                context.common_x2 = norm_b2 * noise - norm_a2 * filteredCommonNoise;

                // --- Process Each Channel ---
                for (let ch = 0; ch < channelCount; ++ch) {
                    const offset = ch * blockSize;

                    const currentChannelPhase = phase + ch * channelPhaseRad;

                    // --- Generate and Filter Channel Noise ---
                    const channelNoise = Math.random() - 0.5;
                    // Apply Biquad LPF (Direct Form II Transposed)
                    let filteredChannelNoise = norm_b0 * channelNoise + context.ch_x1[ch];
                    context.ch_x1[ch] = norm_b1 * channelNoise - norm_a1 * filteredChannelNoise + context.ch_x2[ch];
                    context.ch_x2[ch] = norm_b2 * channelNoise - norm_a2 * filteredChannelNoise;


                    // Blend common and channel noise based on sync ratio
                    const finalFilteredNoise = syncRatio * filteredCommonNoise + invSyncRatio * filteredChannelNoise;

                    // --- Calculate Gain ---
                    const baseModulation = (1.0 - Math.sin(currentChannelPhase)) * 0.5;
                    const noiseContribution = finalFilteredNoise * negRandomnessX2;
                    const totalModulationDB = baseModulation * negDepth + noiseContribution;
                    const gain = Math.pow(10.0, totalModulationDB * inv20);

                    // Apply gain
                    data[offset + i] *= gain;
                }
            }

            // --- Store Updated State ---
            context.phase = phase;
            // Biquad states updated in-place

            // Return the modified data buffer
            return data;
        `);
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'tremolo-plugin-ui plugin-parameter-ui';

        // Helper function to create slider/number input parameter controls
        const createParameterControl = (label, min, max, step, value, setter, unit = '') => {
            const row = document.createElement('div');
            row.className = 'parameter-row';

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
                // Allow typing slightly outside bounds temporarily before clamping on blur/enter
                const val = parseFloat(e.target.value) || 0;
                setter(val); // Update internal value immediately
                slider.value = Math.max(min, Math.min(max, val)); // Clamp slider thumb
            });

            // Clamp value on blur or Enter key press for the number input
             const clampAndUpdate = (e) => {
                const val = parseFloat(e.target.value) || 0;
                const clampedVal = Math.max(min, Math.min(max, val));
                if (clampedVal !== val) {
                    setter(clampedVal); // Ensure internal state matches clamped value
                    e.target.value = clampedVal; // Update display
                    slider.value = clampedVal;
                }
             };
             valueInput.addEventListener('blur', clampAndUpdate);
             valueInput.addEventListener('keydown', (e) => {
                 if (e.key === 'Enter') {
                     clampAndUpdate(e);
                 }
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
        // Use slider for Randomness Slope (rs parameter, -12.0 to 0.0 dB)
        container.appendChild(createParameterControl('Randomness Slope', -12.0, 0.0, 0.1, this.rs, this.setRs.bind(this), 'dB'));
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
            rs: this.rs,
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
        // Add setter logic for the new parameter rs with range -12.0 to 0.0
        if (params.rs !== undefined) {
            // Clamp value between -12.0 and 0.0
            this.rs = Math.max(-12.0, Math.min(0.0, params.rs));
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

    // Set Randomness Slope (-12.0 to 0.0 dB)
    setRs(value) {
        this.setParameters({ rs: value });
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