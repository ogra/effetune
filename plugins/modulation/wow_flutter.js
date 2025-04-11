class WowFlutterPlugin extends PluginBase {
    constructor() {
        super('Wow Flutter', 'Time-based modulation effect');

        this.rt = 0.5;        // rt: Rate - Range: 0.1-20 Hz
        this.dp = 6.0;        // dp: Depth - Range: 0-40 ms
        this.rn = 10.0;       // rn: Randomness - Range: 0-40 ms
        this.rc = 5.0;        // rc: Randomness Cutoff - Range: 0.1-20 Hz
        this.rs = -6.0;       // rs: Randomness Slope - Range: -12.0 to 0.0 dB (maps to Q)
        this.cp = 0;          // cp: Channel Phase - Range: -180-180 degrees
        this.cs = 100;        // cs: Channel Sync - Range: 0-100%

        // Register the audio processor
        this.registerProcessor(`
            // Early exit if processing is disabled
            if (!parameters.enabled) return data;

            // --- Parameters ---
            const {
                sampleRate, channelCount, blockSize,
                rt: rate,
                dp: depth,
                rn: randomness,
                rc: randomnessCutoff,
                rs: randomnessSlope, // -12.0 to 0.0
                cp: channelPhase,
                cs: channelSync
            } = parameters;

            // --- Constants & Pre-calculated Coefficients ---
            const MAX_BUFFER_SIZE = Math.ceil(0.1 * sampleRate); // Max delay buffer size
            const TWO_PI = Math.PI * 2;
            const DEG_TO_RAD = Math.PI / 180;
            const SQRT2 = 1.4142135623730951;
            const MIN_Q = 0.01; // Minimum Q value for stability

            // Hoisted calculations
            const phaseIncrement = TWO_PI * rate / sampleRate;
            const channelPhaseRad = channelPhase * DEG_TO_RAD;
            const syncRatio = channelSync / 100.0;
            const oneMinusSyncRatio = 1.0 - syncRatio;
            const delayMsToSamplesMultiplier = sampleRate / 1000.0;

            // --- Context Initialization ---
            context.phase = context.phase === undefined ? 0.0 : context.phase;
            context.sampleBufferPos = context.sampleBufferPos === undefined ? 0 : context.sampleBufferPos;
            // Biquad states initialized to 0.0 for WowFlutter
            context.common_x1 = context.common_x1 === undefined ? 0.0 : context.common_x1;
            context.common_x2 = context.common_x2 === undefined ? 0.0 : context.common_x2;
            if (!context.ch_x1 || context.ch_x1.length !== channelCount) {
                context.ch_x1 = new Float32Array(channelCount).fill(0.0);
            }
            if (!context.ch_x2 || context.ch_x2.length !== channelCount) {
                context.ch_x2 = new Float32Array(channelCount).fill(0.0);
            }

            // Initialize sample buffers if not done yet
            // (This part remains the same)
            if (!context.initialized) {
                context.sampleBuffer = new Array(channelCount);
                for (let ch = 0; ch < channelCount; ++ch) {
                    context.sampleBuffer[ch] = new Float32Array(MAX_BUFFER_SIZE).fill(0.0);
                }
                context.initialized = true;
            }

             // --- Calculate Biquad LPF Coefficients ---
             // (Q and coefficient calculation remains the same)
             const calculatedQ = Math.pow(10.0, (randomnessSlope + 6.0) / 6.0) * (1.0 / SQRT2);
             const Q = Math.max(MIN_Q, calculatedQ);

             const fc = randomnessCutoff;
             const fs = sampleRate;
             let norm_b0 = 1.0, norm_b1 = 0.0, norm_b2 = 0.0, norm_a1 = 0.0, norm_a2 = 0.0;

             if (fc > 0 && fc < fs / 2) {
                 const omega = TWO_PI * fc / fs;
                 const alpha = Math.sin(omega) / (2.0 * Q);
                 const cosOmega = Math.cos(omega);

                 if (alpha > 0 && 1.0 + alpha !== 0) {
                      const b0 = (1.0 - cosOmega) / 2.0;
                      const b1 = 1.0 - cosOmega;
                      const b2 = (1.0 - cosOmega) / 2.0;
                      const a0_inv = 1.0 / (1.0 + alpha);
                      const a1 = -2.0 * cosOmega;
                      const a2 = 1.0 - alpha;

                      norm_b0 = b0 * a0_inv;
                      norm_b1 = b1 * a0_inv;
                      norm_b2 = b2 * a0_inv;
                      norm_a1 = a1 * a0_inv;
                      norm_a2 = a2 * a0_inv;
                 } else {
                      norm_b0 = 1.0; norm_b1 = 0.0; norm_b2 = 0.0; norm_a1 = 0.0; norm_a2 = 0.0;
                 }

             } else if (fc <= 0) {
                  norm_b0 = 1.0; norm_b1 = 0.0; norm_b2 = 0.0; norm_a1 = 0.0; norm_a2 = 0.0;
                  // Reset filter states to 0.0 when bypassed
                  context.common_x1 = 0.0; context.common_x2 = 0.0;
                  context.ch_x1.fill(0.0); context.ch_x2.fill(0.0);
             }


            // --- Local State Variables ---
            // (Remains the same)
            let currentPhase = context.phase;
            let bufferPos = context.sampleBufferPos;
            const sampleBuffers = context.sampleBuffer;

            // --- Main Processing Loop ---
            // (Filter application and delay calculation logic remains the same)
            for (let i = 0; i < blockSize; ++i) {

                // Update base phase
                currentPhase += phaseIncrement;
                if (currentPhase >= TWO_PI) {
                    currentPhase -= TWO_PI;
                }

                // Generate and filter common noise component using Biquad
                const noise = Math.random() - 0.5;
                let filteredCommonNoise = norm_b0 * noise + context.common_x1;
                context.common_x1 = norm_b1 * noise - norm_a1 * filteredCommonNoise + context.common_x2;
                context.common_x2 = norm_b2 * noise - norm_a2 * filteredCommonNoise;

                // --- Channel Loop ---
                for (let ch = 0; ch < channelCount; ++ch) {
                    const buffer = sampleBuffers[ch];
                    const offset = ch * blockSize;

                    // Store current input sample
                    buffer[bufferPos] = data[offset + i];

                    // Calculate channel-specific phase
                    const channelPhaseOffset = ch * channelPhaseRad;
                    const currentChannelPhase = currentPhase + channelPhaseOffset;

                    // Generate and filter channel-specific noise component using Biquad
                    const channelNoise = Math.random() - 0.5;
                    let filteredChannelNoise = norm_b0 * channelNoise + context.ch_x1[ch];
                    context.ch_x1[ch] = norm_b1 * channelNoise - norm_a1 * filteredChannelNoise + context.ch_x2[ch];
                    context.ch_x2[ch] = norm_b2 * channelNoise - norm_a2 * filteredChannelNoise;

                    // Blend common and channel-specific filtered noise
                    const filteredNoise = syncRatio * filteredCommonNoise + oneMinusSyncRatio * filteredChannelNoise + 0.5;

                    // Calculate total delay time in ms
                    const baseDelay = (1.0 - Math.sin(currentChannelPhase)) * 0.5; // 0..1 range
                    const noiseContribution = filteredNoise * randomness; // Assume noise 0..1 -> delay 0..randomness ms
                    const totalDelay = baseDelay * depth + noiseContribution; // Total delay in ms

                    // Convert delay to samples
                    const delaySamples = totalDelay * delayMsToSamplesMultiplier;

                    // Calculate read position with linear interpolation
                    const delayPos = (bufferPos - delaySamples + MAX_BUFFER_SIZE);
                     // Modulo that handles negative results correctly and efficiently for positive MAX_BUFFER_SIZE
                     const delayPosWrapped = delayPos >= MAX_BUFFER_SIZE ? delayPos % MAX_BUFFER_SIZE : delayPos < 0 ? (delayPos % MAX_BUFFER_SIZE + MAX_BUFFER_SIZE) % MAX_BUFFER_SIZE : delayPos;

                    const delayPosInt = Math.floor(delayPosWrapped); // Use Math.floor for potentially negative fractional parts after modulo edge cases
                    const delayPosFrac = delayPosWrapped - delayPosInt;

                    let nextPos = delayPosInt + 1;
                    if (nextPos >= MAX_BUFFER_SIZE) {
                        nextPos = 0;
                    }

                    // Linear interpolation
                    const sample1 = buffer[delayPosInt];
                    const sample2 = buffer[nextPos];
                    const interpolatedSample = sample1 + delayPosFrac * (sample2 - sample1);

                    // Write output
                    data[offset + i] = interpolatedSample;
                }

                // Update buffer write position
                bufferPos++;
                if (bufferPos >= MAX_BUFFER_SIZE) {
                    bufferPos = 0;
                }
            }

            // --- Update Context State ---
            context.phase = currentPhase;
            context.sampleBufferPos = bufferPos;
            // Biquad states updated in-place

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
                 slider.value = Math.max(min, Math.min(max, val));
             });

             const clampAndUpdate = (e) => {
                const val = parseFloat(e.target.value) || 0;
                const clampedVal = Math.max(min, Math.min(max, val));
                if (clampedVal !== val) {
                    setter(clampedVal);
                    e.target.value = clampedVal;
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
        container.appendChild(createParameterControl('Depth', 0, 40, 0.1, this.dp, this.setDp.bind(this), 'ms'));
        container.appendChild(createParameterControl('Ch Phase', -180, 180, 1, this.cp, this.setCp.bind(this), 'Deg.'));
        container.appendChild(createParameterControl('Randomness', 0, 40, 0.1, this.rn, this.setRn.bind(this), 'ms'));
        container.appendChild(createParameterControl('Randomness Cutoff', 0.1, 20, 0.1, this.rc, this.setRc.bind(this), 'Hz'));
        // Add Slope control using rs parameter (-12.0 to 0.0 dB)
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
            rs: this.rs, // Include new parameter rs
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
         // Add setter logic for the new parameter rs with range -12.0 to 0.0
        if (params.rs !== undefined) {
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
window.WowFlutterPlugin = WowFlutterPlugin;