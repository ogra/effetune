class DopplerDistortionPlugin extends PluginBase {
    constructor() {
        super('Doppler Distortion', 'Simulates Doppler distortion caused by speaker cone movement');

        this.co = 100;
        this.cf = 8.0;
        this.sm = 0.03;
        this.sc = 6000;
        this.df = 1.5;
        this.bs = true;

        // Register the audio processor
        this.registerProcessor(`
            // Constants
            const SOUND_SPEED = 343.0; // Speed of sound in m/s
            const TWO_PI = 6.283185307179586;
            const SQRT2_INV = 0.7071067811865475; // 1/sqrt(2) for Linkwitz-Riley Q
            const HILBERT_LENGTH = 64; // Fixed length for Hilbert FIR filter

            // Processor entry point
            if (!parameters.enabled) return data; // Exit if effect is disabled

            // --- Cache Core Parameters & Calculate Time Step ---
            const {
                sampleRate, channelCount, blockSize,
                co: crossover,   // Crossover frequency (Hz)
                cf: coilForce,   // Force factor (e.g., N/A or V/A * A/V = unitless scaling?) - Assume scales input to force N
                sm: speakerMass, // Mass (kg)
                sc: springConstant,// Spring constant (N/m)
                df: dampingFactor, // Damping factor (Ns/m)
                bs: bandSplit     // Band split enabled (boolean)
            } = parameters;

            const dt = 1.0 / sampleRate; // Time step duration (s)
            const halfDt = 0.5 * dt;     // Pre-calculate half time step for Verlet integration

            // --- Context Initialization or Re-initialization ---
            // Initialize only if needed (first run, channel count change, or sample rate change affecting Hilbert)
            if (!context.initialized || context.channelCount !== channelCount || context.sampleRate !== sampleRate) {
                // Allocate state arrays using typed arrays for efficiency
                context.lpState1 = new Array(channelCount); // LPF stage 1 states [s1, s2] (DF2T)
                context.lpState2 = new Array(channelCount); // LPF stage 2 states
                context.hpState1 = new Array(channelCount); // HPF stage 1 states
                context.hpState2 = new Array(channelCount); // HPF stage 2 states
                context.speakerPositions = new Float32Array(channelCount); // Speaker cone position (m)
                context.speakerVelocities = new Float32Array(channelCount); // Speaker cone velocity (m/s)
                context.hilbertDelayLines = new Array(channelCount); // Delay lines for Hilbert transform FIR
                context.hilbertIndices = new Int32Array(channelCount);   // Write indices for Hilbert delay lines

                // Initialize per-channel state storage
                for (let ch = 0; ch < channelCount; ++ch) {
                    // Biquad states (Direct Form II Transposed uses 2 states per filter stage)
                    context.lpState1[ch] = new Float32Array(2); // s1, s2 initialized to 0
                    context.lpState2[ch] = new Float32Array(2);
                    context.hpState1[ch] = new Float32Array(2);
                    context.hpState2[ch] = new Float32Array(2);
                    // Hilbert delay line
                    context.hilbertDelayLines[ch] = new Float32Array(HILBERT_LENGTH); // Initialized to 0
                    // speakerPositions, speakerVelocities, hilbertIndices are implicitly initialized to 0
                }

                // --- Calculate Hilbert FIR Coefficients (once during initialization) ---
                // Calculate coefficients for a Type III/IV FIR Hilbert transformer with Blackman window
                context.hilbertCoeffs = new Float32Array(HILBERT_LENGTH);
                const floorCenter = Math.floor(HILBERT_LENGTH / 2); // Center index for coefficient calculation
                const m_pi_inv = 1.0 / Math.PI;
                for (let i = 0; i < HILBERT_LENGTH; i++) {
                    let coeff = 0.0;
                    // Calculate ideal Hilbert coefficient (non-zero for odd indices relative to center)
                    // Using the logic from the original snippet: zero at center, zero for even indices
                    if (i !== floorCenter && i % 2 !== 0) {
                        const n = i - floorCenter; // Index relative to center
                        coeff = 2.0 * m_pi_inv / n; // Ideal coefficient 2/(pi*n) for odd n
                    }
                    // Apply Blackman window for better frequency response
                    const windowPos = i / (HILBERT_LENGTH - 1); // Position in window [0, 1]
                    const cos2piW = Math.cos(TWO_PI * windowPos);
                    const cos4piW = Math.cos(TWO_PI * 2 * windowPos);
                    const blackman = 0.42 - 0.5 * cos2piW + 0.08 * cos4piW;
                    context.hilbertCoeffs[i] = coeff * blackman; // Apply window to coefficient
                }

                // Store current configuration in context
                context.channelCount = channelCount;
                context.sampleRate = sampleRate; // Store sampleRate if it affects init state (e.g., Hilbert coeffs if length depended on SR)
                context.initialized = true;
                // console.log("Speaker sim context initialized/reinitialized."); // Optional dev log
            }

            // --- Calculate Linkwitz-Riley Crossover Coefficients ---
            // Recalculate per block as the 'crossover' parameter might change
            const omega = TWO_PI * crossover * dt; // Normalized frequency omega = 2*pi*f/Fs
            const cosOmega = Math.cos(omega);
            const sinOmega = Math.sin(omega);
            const alpha = sinOmega * SQRT2_INV; // alpha = sin(omega)/(2*Q) with Q = 1/sqrt(2)

            // Pre-calculate coefficient terms, checking for stability
            let lp_b0, lp_b1, lp_b2, lp_a1, lp_a2; // LPF coefs (DF2T: b0,b1,b2, -a1, -a2)
            let hp_b0, hp_b1, hp_b2, hp_a1, hp_a2; // HPF coefs (DF2T: b0,b1,b2, -a1, -a2)
            const a0 = 1.0 + alpha;

            // Check for stability (avoid division by zero or near-zero)
            if (alpha > 1e-9 && Math.abs(a0) > 1e-9) {
                const a0_inv = 1.0 / a0; // Calculate inverse denominator once
                const oneMinusCosOmega = 1.0 - cosOmega;
                const onePlusCosOmega = 1.0 + cosOmega;
                const neg2CosOmega = -2.0 * cosOmega;
                const oneMinusAlpha = 1.0 - alpha;

                // LPF Coefficients (normalized for DF2T)
                lp_b0 = (oneMinusCosOmega * 0.5) * a0_inv;
                lp_b1 = oneMinusCosOmega * a0_inv;
                lp_b2 = lp_b0;                     // LPF b2 = b0
                lp_a1 = neg2CosOmega * a0_inv;     // Note: a1, a2 are from the denominator 1 + a1*z^-1 + a2*z^-2
                lp_a2 = oneMinusAlpha * a0_inv;

                // HPF Coefficients (normalized for DF2T)
                hp_b0 = (onePlusCosOmega * 0.5) * a0_inv;
                hp_b1 = -onePlusCosOmega * a0_inv;
                hp_b2 = hp_b0;                     // HPF b2 = b0
                hp_a1 = neg2CosOmega * a0_inv;     // Denominator coefficients are the same as LPF
                hp_a2 = oneMinusAlpha * a0_inv;
            } else {
                // Fallback: LPF becomes pass-through, HPF becomes block if crossover is invalid
                lp_b0 = 1.0; lp_b1 = 0.0; lp_b2 = 0.0; lp_a1 = 0.0; lp_a2 = 0.0;
                hp_b0 = 0.0; hp_b1 = 0.0; hp_b2 = 0.0; hp_a1 = 0.0; hp_a2 = 0.0;
                // Optionally reset filter states here if crossover is invalid to prevent artefacts
            }

            // Get Hilbert coefficients reference from context
            const hilbertCoeffs = context.hilbertCoeffs;

            // --- Main Processing Loop ---
            for (let ch = 0; ch < channelCount; ++ch) {
                const offset = ch * blockSize; // Index offset for the current channel in input/output data

                // --- Get Channel State References ---
                // Load state into local variables/references for faster access within the sample loop
                const lpState1 = context.lpState1[ch]; // Ref to Float32Array(2) [s1, s2]
                const lpState2 = context.lpState2[ch]; // Ref to Float32Array(2)
                const hpState1 = context.hpState1[ch]; // Ref to Float32Array(2)
                const hpState2 = context.hpState2[ch]; // Ref to Float32Array(2)
                const hilbertDelayLine = context.hilbertDelayLines[ch]; // Ref to Float32Array(HILBERT_LENGTH)
                let ringIndex = context.hilbertIndices[ch];             // Copy Int32 index
                let speakerPosition = context.speakerPositions[ch];     // Copy Float32 position (m)
                let speakerVelocity = context.speakerVelocities[ch];   // Copy Float32 velocity (m/s)

                // --- Sample Loop ---
                // Process each audio sample in the block
                for (let i = 0; i < blockSize; ++i) {
                    const input = data[offset + i]; // Get the current input sample

                    // Declare variables for outputs
                    let lowOutput2, highOutput2;

                    if (bandSplit) {
                        // --- Crossover Filters (4th order Linkwitz-Riley using cascaded Biquads - DF2T) ---
                        // LPF Stage 1
                        let y0_lp1 = lp_b0 * input + lpState1[0];
                        lpState1[0] = lp_b1 * input - lp_a1 * y0_lp1 + lpState1[1]; // Update state s1
                        lpState1[1] = lp_b2 * input - lp_a2 * y0_lp1;             // Update state s2
                        const lowOutput1 = y0_lp1; // Output of the first LPF stage

                        // LPF Stage 2
                        let y0_lp2 = lp_b0 * lowOutput1 + lpState2[0];
                        lpState2[0] = lp_b1 * lowOutput1 - lp_a1 * y0_lp2 + lpState2[1];
                        lpState2[1] = lp_b2 * lowOutput1 - lp_a2 * y0_lp2;
                        lowOutput2 = y0_lp2; // Final Low-Frequency Output (used for speaker force)

                        // HPF Stage 1
                        let y0_hp1 = hp_b0 * input + hpState1[0];
                        hpState1[0] = hp_b1 * input - hp_a1 * y0_hp1 + hpState1[1];
                        hpState1[1] = hp_b2 * input - hp_a2 * y0_hp1;
                        const highOutput1 = y0_hp1; // Output of the first HPF stage

                        // HPF Stage 2
                        let y0_hp2 = hp_b0 * highOutput1 + hpState2[0];
                        hpState2[0] = hp_b1 * highOutput1 - hp_a1 * y0_hp2 + hpState2[1];
                        hpState2[1] = hp_b2 * highOutput1 - hp_a2 * y0_hp2;
                        highOutput2 = y0_hp2; // Final High-Frequency Output (used for modulation)
                    } else {
                        // When band split is OFF, skip filtering and use the input signal directly
                        lowOutput2 = input;
                        highOutput2 = input;
                    }

                    // --- Speaker Physics Simulation (Velocity Verlet Integration) ---
                    // Calculate forces acting on the speaker cone
                    const signalForce = lowOutput2 * coilForce;           // Force from the (low-passed) signal
                    const springForce = -springConstant * speakerPosition;// Restoring force from suspension (Hooke's Law)
                    const dampingForce = -dampingFactor * speakerVelocity;// Damping force opposing motion

                    // Calculate acceleration using Newton's second law (a = F_total / m)
                    let totalForce = signalForce + springForce + dampingForce;
                    let acceleration = totalForce / speakerMass;

                    // Update velocity to half-step using current acceleration
                    const halfStepVelocity = speakerVelocity + acceleration * halfDt;

                    // Update position using the half-step velocity over the full time step
                    speakerPosition += halfStepVelocity * dt;

                    // Calculate forces at the new position using the half-step velocity for damping consistency
                    const newSpringForce = -springConstant * speakerPosition;
                    const newDampingForce = -dampingFactor * halfStepVelocity;

                    // Calculate acceleration at the new position (assuming signalForce is constant over the small dt)
                    totalForce = signalForce + newSpringForce + newDampingForce;
                    acceleration = totalForce / speakerMass;

                    // Update velocity for the full step using the new acceleration
                    speakerVelocity = halfStepVelocity + acceleration * halfDt;

                    // --- Hilbert Transform and Phase Modulation (Doppler Effect Approximation) ---
                    // Update Hilbert delay line (circular buffer) by writing the current HPF output
                    ringIndex--; // Decrement write index first
                    if (ringIndex < 0) {
                        ringIndex = HILBERT_LENGTH - 1; // Wrap around using if (potentially faster than modulo)
                    }
                    hilbertDelayLine[ringIndex] = highOutput2;

                    // Calculate Real part: delayed HPF output from the center of the Hilbert FIR delay line
                    let realPartReadIndex = ringIndex + (HILBERT_LENGTH >> 1); // Center tap index (N/2) relative to write pos
                    if (realPartReadIndex >= HILBERT_LENGTH) {
                        realPartReadIndex -= HILBERT_LENGTH; // Wrap index if needed
                    }
                    const realPart = hilbertDelayLine[realPartReadIndex];

                    // Calculate Imaginary part: perform FIR convolution using Hilbert coefficients
                    let imagPart = 0.0;
                    for (let j = 0; j < HILBERT_LENGTH; ++j) {
                        let delayReadIndex = ringIndex + j; // Index relative to write pos
                        if (delayReadIndex >= HILBERT_LENGTH) {
                            delayReadIndex -= HILBERT_LENGTH; // Wrap index if needed
                        }
                        imagPart += hilbertDelayLine[delayReadIndex] * hilbertCoeffs[j];
                    }

                    // Calculate instantaneous amplitude and phase of the analytic signal (HPF component)
                    // Use hypot for potentially better numerical stability/performance? Math.sqrt(a*a + b*b) is usually fine.
                    const amplitude = Math.sqrt(realPart * realPart + imagPart * imagPart);
                    let phase = Math.atan2(imagPart, realPart); // Get phase angle [-pi, pi]

                    // Calculate phase modulation factor based on speaker velocity relative to sound speed
                    const velocity = speakerVelocity;
                    const dopplerRatio = SOUND_SPEED / (SOUND_SPEED - velocity); // f' = f x c/(c-v)
                    const fdop = crossover * dopplerRatio;
                    const deltaPhase = TWO_PI * fdop * dt;
                    phase += deltaPhase;

                    // Reconstruct the phase-modulated high-frequency signal using the original amplitude
                    // Apply arbitrary gain factor (1.2) - possibly for calibration or effect intensity
                    const modulatedHigh = amplitude * Math.cos(phase) * 1.2;

                    // --- Combine Low and Modulated High Frequencies ---
                    // The final output is the sum of the direct low frequencies and the phase-modulated high frequencies
                    // When band split is OFF, output only the modulated high frequencies
                    data[offset + i] = bandSplit ? (lowOutput2 + modulatedHigh) : modulatedHigh;

                } // End Sample Loop

                // --- Store Updated State ---
                // Write the final state values back into the context object for the next processing block
                context.hilbertIndices[ch] = ringIndex;           // Store updated ring buffer index
                context.speakerPositions[ch] = speakerPosition;   // Store updated speaker position
                context.speakerVelocities[ch] = speakerVelocity; // Store updated speaker velocity
                // Biquad states (context.lpState1[ch], etc.) were updated in-place via array references

            } // End Channel Loop

            // Return the modified output data buffer
            return data;
        `);
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'doppler-distortion-plugin-ui plugin-parameter-ui';

        // Add Band Split checkbox
        const bandSplitRow = document.createElement('div');
        bandSplitRow.className = 'parameter-row checkbox-row';
        
        const bandSplitId = `${this.id}-${this.name}-band-split-checkbox`;
        
        const labelEl = document.createElement('label');
        labelEl.textContent = 'Band Split:';
        labelEl.htmlFor = bandSplitId;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = bandSplitId;
        checkbox.name = bandSplitId;
        checkbox.checked = this.bs;
        checkbox.addEventListener('change', (e) => {
            this.setBs(e.target.checked);
        });
        
        bandSplitRow.appendChild(labelEl);
        bandSplitRow.appendChild(checkbox);
        container.appendChild(bandSplitRow);

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

        container.appendChild(createParameterControl('Crossover', 50, 300, 1, this.co, this.setCo.bind(this), 'Hz'));
        container.appendChild(createParameterControl('Coil Force', 0.0, 100.0, 0.1, this.cf, this.setCf.bind(this), 'N'));
        container.appendChild(createParameterControl('Speaker Mass', 0.001, 0.5, 0.001, this.sm, this.setSm.bind(this), 'kg'));
        container.appendChild(createParameterControl('Spring Constant', 500, 100000, 500, this.sc, this.setSc.bind(this), 'N/m'));
        container.appendChild(createParameterControl('Damping Factor', 0.1, 10.0, 0.1, this.df, this.setDf.bind(this), 'N·s/m'));

        return container;
    }

    getParameters() {
        return {
            ...super.getParameters(),
            co: this.co,
            cf: this.cf,
            sm: this.sm,
            sc: this.sc,
            df: this.df,
            bs: this.bs
        };
    }

    setParameters(params) {
        if (params.co !== undefined) {
            this.co = params.co < 50 ? 50 : (params.co > 300 ? 300 : params.co);
        }
        if (params.cf !== undefined) {
            this.cf = params.cf < 0.0 ? 0.0 : (params.cf > 100.0 ? 100.0 : params.cf);
        }
        if (params.sm !== undefined) {
            this.sm = params.sm < 0.001 ? 0.001 : (params.sm > 0.5 ? 0.5 : params.sm);
        }
        if (params.sc !== undefined) {
            this.sc = params.sc < 500 ? 500 : (params.sc > 100000 ? 100000 : params.sc);
        }
        if (params.df !== undefined) {
            this.df = params.df < 0.1 ? 0.1 : (params.df > 10.0 ? 10.0 : params.df);
        }
        if (params.bs !== undefined) {
            this.bs = Boolean(params.bs);
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    setCo(value) {
        this.setParameters({ co: value });
    }

    setCf(value) {
        this.setParameters({ cf: value });
    }

    setSm(value) {
        this.setParameters({ sm: value });
    }

    setSc(value) {
        this.setParameters({ sc: value });
    }

    setDf(value) {
        this.setParameters({ df: value });
    }

    setBs(value) {
        this.bs = value;
        this.updateParameters();
    }
}

window.DopplerDistortionPlugin = DopplerDistortionPlugin;
