class DelayPlugin extends PluginBase {
    constructor() {
        super('Delay', 'Feedback delay with damping controls');

        // Initialize parameters with defaults
        this.pd = 0;      // Pre-Delay (ms)
        this.ds = 150;    // Delay Size (ms)
        this.dp = 50;     // Damping (%)
        this.hd = 5000;   // High Damp (Hz)
        this.ld = 100;    // Low Damp (Hz)
        this.mx = 16;     // Wet/Dry Mix (%)
        this.fb = 50;     // Feedback (%)
        this.pp = 0;      // Ping-Pong (%)

        // Register processor function
        this.registerProcessor(`
            // Skip processing if the plugin is disabled.
            if (!parameters.enabled) return data;

            // --- Cache frequently accessed parameters and constants ---
            const channelCount = parameters.channelCount;
            const blockSize = parameters.blockSize;
            const sampleRate = parameters.sampleRate;
            const twoPI = 2.0 * Math.PI;

            // --- Helper function for context initialization/reset ---
            const initializeContext = (ctx, chCount, sRate) => {
                ctx.sampleRate = sRate;
                const maxPreDelaySamples = Math.ceil(sRate * 0.1); // Max 100ms pre-delay buffer
                const maxDelaySamples = Math.ceil(sRate * 5.0);  // Max 5s delay buffer

                ctx.preDelayBuffer = new Array(chCount);
                ctx.delayBuffer = new Array(chCount);
                ctx.hdState = new Float32Array(chCount).fill(0.0); // Use Float32Array for filter states
                ctx.ldState = new Float32Array(chCount).fill(0.0);

                for (let ch = 0; ch < chCount; ch++) {
                    ctx.preDelayBuffer[ch] = {
                        buffer: new Float32Array(maxPreDelaySamples),
                        pos: 0,
                        length: maxPreDelaySamples // Cache length
                    };
                    ctx.delayBuffer[ch] = {
                        buffer: new Float32Array(maxDelaySamples),
                        pos: 0,
                        length: maxDelaySamples // Cache length
                    };
                }
                ctx.channelCount = chCount; // Store current channel count in context
                ctx.initialized = true;
            };

            // --- Initialize or reset context if needed ---
            if (!context.initialized || context.sampleRate !== sampleRate || context.channelCount !== channelCount) {
                initializeContext(context, channelCount, sampleRate);
            }

            // --- Cache context references ---
            const preDelayBuffers = context.preDelayBuffer;
            const delayBuffers = context.delayBuffer;
            const hdStates = context.hdState; // Reference to the Float32Array
            const ldStates = context.ldState; // Reference to the Float32Array

            // --- Pre-calculate coefficients for the block ---
            // Ensure delay times are within buffer limits and at least 0/1 sample.
            // Use cached buffer lengths for calculation. Max length - 1 is not strictly necessary with modulo.
            const maxPreDelayLen = preDelayBuffers[0].length;
            const maxDelayLen = delayBuffers[0].length;
            const preDelaySamples = Math.max(0, Math.min(maxPreDelayLen, Math.floor(parameters.pd * sampleRate * 0.001)));
            const delaySamples = Math.max(1, Math.min(maxDelayLen, Math.floor(parameters.ds * sampleRate * 0.001)));

            const dampAmount = parameters.dp * 0.01;
            const oneMinusDampAmount = 1.0 - dampAmount;
            // Calculate filter coefficients using Math.exp for stability/accuracy
            const hdCutoff = Math.max(1.0, parameters.hd); // Avoid zero frequency
            const ldCutoff = Math.max(1.0, parameters.ld); // Avoid zero frequency
            const hdCoeff = Math.exp(-twoPI * hdCutoff / sampleRate); // LPF coefficient (pole location)
            const ldCoeff = 1.0 - Math.exp(-twoPI * ldCutoff / sampleRate); // HPF coefficient (related to pole location for 1-pole HPF difference equation)

            // Clamp feedback gain to prevent instability.
            const feedbackGain = Math.max(0.0, Math.min(0.99, parameters.fb * 0.01));

            // Calculate constant power mix gains.
            const wetMix = parameters.mx * 0.01;
            const angle = wetMix * Math.PI * 0.5; // Map mix [0, 1] to angle [0, pi/2]
            const dryGain = Math.cos(angle);
            const wetGain = Math.sin(angle);

            // Ping-pong mix factor [0, 1].
            const pingPongMix = parameters.pp * 0.01;
            const isStereo = channelCount === 2;

            // --- Stereo-specific temporary storage (reused per block) ---
            // Initialize only if stereo, reduces unnecessary allocation/checks if mono.
            const delayedSamplesStereo = isStereo ? [0.0, 0.0] : null;
            const feedbackSourceStereo = isStereo ? [0.0, 0.0] : null;
            const dampedFeedbackStereo = isStereo ? [0.0, 0.0] : null;

            // --- Main processing loop (per sample) ---
            for (let i = 0; i < blockSize; i++) {

                // --- Stereo-specific calculations (executed once per sample) ---
                if (isStereo) {
                    // --- Read Delayed Samples (Stereo L/R) ---
                    // Cache L/R delay buffer info locally within the stereo block.
                    const delayL = delayBuffers[0];
                    const delayBufL = delayL.buffer;
                    const delayLenL = delayL.length;
                    const delayPosL = delayL.pos;
                    const mainDelayedReadPosL = (delayPosL - delaySamples + delayLenL) % delayLenL;
                    const ds0 = delayBufL[mainDelayedReadPosL];
                    delayedSamplesStereo[0] = ds0;

                    const delayR = delayBuffers[1];
                    const delayBufR = delayR.buffer;
                    const delayLenR = delayR.length;
                    const delayPosR = delayR.pos;
                    const mainDelayedReadPosR = (delayPosR - delaySamples + delayLenR) % delayLenR;
                    const ds1 = delayBufR[mainDelayedReadPosR];
                    delayedSamplesStereo[1] = ds1;

                    // --- Calculate Feedback Source based on Ping-Pong Mix ---
                    // Interpolate between independent stereo, mono sum, and crossed feedback.
                    const monoFeedback = (ds0 + ds1) * 0.5;
                    if (pingPongMix <= 0.5) { // Interpolate Independent -> Mono
                        const mixRatio = pingPongMix * 2.0;
                        const invMixRatio = 1.0 - mixRatio;
                        feedbackSourceStereo[0] = ds0 * invMixRatio + monoFeedback * mixRatio;
                        feedbackSourceStereo[1] = ds1 * invMixRatio + monoFeedback * mixRatio;
                    } else { // Interpolate Mono -> Crossed
                        const mixRatio = (pingPongMix - 0.5) * 2.0;
                        const invMixRatio = 1.0 - mixRatio;
                        feedbackSourceStereo[0] = monoFeedback * invMixRatio + ds1 * mixRatio; // Mono -> R source
                        feedbackSourceStereo[1] = monoFeedback * invMixRatio + ds0 * mixRatio; // Mono -> L source
                    }

                    // --- Apply Damping to Feedback Source (Stereo L/R) ---
                    // Process L channel damping
                    let hdStateL = hdStates[0];
                    let ldStateL = ldStates[0];
                    const fbSrcL = feedbackSourceStereo[0];
                    hdStateL = fbSrcL * (1.0 - hdCoeff) + hdStateL * hdCoeff; // Optimized 1-pole LPF
                    const lpfOutL = hdStateL; // Store LPF output for HPF input difference
                    ldStateL = ldCoeff * (ldStateL + lpfOutL - fbSrcL); // Original HPF structure
                    dampedFeedbackStereo[0] = fbSrcL * oneMinusDampAmount + ldStateL * dampAmount;
                    hdStates[0] = hdStateL; // Update state immediately
                    ldStates[0] = ldStateL; // Update state immediately

                    // Process R channel damping
                    let hdStateR = hdStates[1];
                    let ldStateR = ldStates[1];
                    const fbSrcR = feedbackSourceStereo[1];
                    hdStateR = fbSrcR * (1.0 - hdCoeff) + hdStateR * hdCoeff; // Optimized 1-pole LPF
                    const lpfOutR = hdStateR; // Store LPF output for HPF input difference
                    ldStateR = ldCoeff * (ldStateR + lpfOutR - fbSrcR); // Original HPF structure
                    dampedFeedbackStereo[1] = fbSrcR * oneMinusDampAmount + ldStateR * dampAmount;
                    hdStates[1] = hdStateR; // Update state immediately
                    ldStates[1] = ldStateR; // Update state immediately
                }

                // --- Per-channel processing ---
                for (let ch = 0; ch < channelCount; ch++) {
                    // Calculate the offset for the current sample in the interleaved data array.
                    const channelDataOffset = ch * blockSize + i;
                    const input = data[channelDataOffset];

                    // --- Pre-Delay ---
                    // Cache pre-delay buffer info locally.
                    const preDelay = preDelayBuffers[ch];
                    const preDelayBuf = preDelay.buffer;
                    const preDelayLen = preDelay.length;
                    let preDelayPos = preDelay.pos; // Use local var for manipulation

                    // Read from pre-delay buffer
                    const preDelayedReadPos = (preDelayPos - preDelaySamples + preDelayLen) % preDelayLen;
                    const preDelayedInput = preDelayBuf[preDelayedReadPos];

                    // Write input to pre-delay buffer
                    preDelayBuf[preDelayPos] = input;

                    // Update and wrap pre-delay write position using conditional check (potentially faster than modulo).
                    preDelayPos++;
                    if (preDelayPos >= preDelayLen) {
                        preDelayPos = 0;
                    }
                    preDelay.pos = preDelayPos; // Store updated position back to context

                    // --- Determine Feedback and Wet Output for the current channel ---
                    let finalDampedFeedback;
                    let wetOutput;

                    // Cache main delay buffer info locally.
                    const delay = delayBuffers[ch];
                    const delayBuf = delay.buffer;
                    const delayLen = delay.length;
                    let delayPos = delay.pos; // Use local var for manipulation

                    // Get the position to write the final delayed signal into.
                    const mainDelayedWritePos = delayPos;

                    // Check if stereo and processing the first two channels.
                    if (isStereo && ch < 2) {
                        // Use pre-calculated damped feedback and wet signal for L/R channels.
                        finalDampedFeedback = dampedFeedbackStereo[ch];
                        wetOutput = delayedSamplesStereo[ch];
                    } else {
                        // Calculate for Mono or additional channels (ch >= 2 if channelCount > 2).
                        // Read the raw delayed sample for this channel.
                        const mainDelayedReadPos = (delayPos - delaySamples + delayLen) % delayLen;
                        const delayedSample = delayBuf[mainDelayedReadPos];
                        wetOutput = delayedSample; // Wet output is the raw delayed signal

                        // Apply Damping directly to the delayed sample for this channel.
                        let hdState = hdStates[ch]; // Get current filter state
                        let ldState = ldStates[ch]; // Get current filter state

                        // Low-pass filter (High Damp) - Optimized 1-pole LPF
                        hdState = delayedSample * (1.0 - hdCoeff) + hdState * hdCoeff;
                        const lpfOut = hdState; // Store LPF output for HPF input difference

                        // High-pass filter (Low Damp) - Original 1-pole HPF structure
                        ldState = ldCoeff * (ldState + lpfOut - delayedSample);

                        // Combine damped signal with original delayed signal based on damping amount.
                        finalDampedFeedback = delayedSample * oneMinusDampAmount + ldState * dampAmount;

                        // Update filter states in context immediately for the next sample.
                        hdStates[ch] = hdState;
                        ldStates[ch] = ldState;
                    }

                    // --- Main Delay Write (Pre-Delayed Input + Damped Feedback) ---
                    // Write the sum of the pre-delayed input and the calculated damped feedback signal
                    // into the main delay buffer. Apply feedback gain to the feedback signal.
                    delayBuf[mainDelayedWritePos] = preDelayedInput + finalDampedFeedback * feedbackGain;

                    // Update and wrap main delay write position using conditional check.
                    delayPos++;
                    if (delayPos >= delayLen) {
                        delayPos = 0;
                    }
                    delay.pos = delayPos; // Store updated position back to context

                    // --- Output Mix ---
                    // Combine the original dry input signal and the wet (delayed) output signal
                    // using the calculated dry and wet gains.
                    data[channelDataOffset] = input * dryGain + wetOutput * wetGain;
                }
            }

            // Return the modified data array.
            return data;
        `);
    }

    // Get current parameters
    getParameters() {
        return {
            type: this.constructor.name,
            enabled: this.enabled,
            pd: this.pd,      // Pre-Delay (ms)
            ds: this.ds,      // Delay Size (ms)
            dp: this.dp,      // Damping (%)
            hd: this.hd,      // High Damp (Hz)
            ld: this.ld,      // Low Damp (Hz)
            mx: this.mx,      // Mix (%)
            fb: this.fb,      // Feedback (%)
            pp: this.pp       // Ping-Pong (%)
        };
    }

    // Set parameters with validation
    setParameters(params) {
        if (params.pd !== undefined) this.pd = Math.max(0, Math.min(100, Number(params.pd)));      // Pre-Delay ms
        if (params.ds !== undefined) this.ds = Math.max(1, Math.min(5000, Number(params.ds)));     // Delay Size ms
        if (params.dp !== undefined) this.dp = Math.max(0, Math.min(100, Number(params.dp)));      // Damping %
        if (params.hd !== undefined) this.hd = Math.max(1000, Math.min(20000, Number(params.hd))); // High Damp Hz
        if (params.ld !== undefined) this.ld = Math.max(20, Math.min(1000, Number(params.ld)));     // Low Damp Hz
        if (params.mx !== undefined) this.mx = Math.max(0, Math.min(100, Number(params.mx)));      // Mix %
        if (params.fb !== undefined) this.fb = Math.max(0, Math.min(99, Number(params.fb)));       // Feedback % (Clamped)
        if (params.pp !== undefined) this.pp = Math.max(0, Math.min(100, Number(params.pp)));      // Ping-Pong %
        this.updateParameters();
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'plugin-parameter-ui';

        // Utility function to create a parameter row
        const createRow = (labelText, type, min, max, step, value, onChange) => {
            const row = document.createElement('div');
            row.className = 'parameter-row';
            // Generate unique ID
            const paramName = labelText.toLowerCase().replace(/[^a-z0-9]/g, '');
            const sliderId = `${this.id}-${this.name}-${paramName}-slider`;
            const inputId = `${this.id}-${this.name}-${paramName}-input`;
            const label = document.createElement('label');
            label.textContent = labelText;
            label.htmlFor = sliderId;
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = sliderId;
            slider.name = sliderId;
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = value;
            const input = document.createElement('input');
            input.type = type;
            input.id = inputId;
            input.name = inputId;
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
                let val = parseFloat(e.target.value) || 0;
                if (val < min) val = min;
                if (val > max) val = max;
                onChange(val);
                slider.value = val;
                e.target.value = val; // Correct the input value if it was out of bounds
            });
            row.appendChild(label);
            row.appendChild(slider);
            row.appendChild(input);
            return row;
        };

        container.appendChild(createRow('Pre-Delay (ms):', 'number', '0', '100', '0.1', this.pd, (value) => this.setParameters({ pd: value })));
        container.appendChild(createRow('Delay Size (ms):', 'number', '1', '5000', '1', this.ds, (value) => this.setParameters({ ds: value })));
        container.appendChild(createRow('Damping (%):', 'number', '0', '100', '1', this.dp, (value) => this.setParameters({ dp: value })));
        container.appendChild(createRow('High Damp (Hz):', 'number', '1000', '20000', '100', this.hd, (value) => this.setParameters({ hd: value })));
        container.appendChild(createRow('Low Damp (Hz):', 'number', '20', '1000', '1', this.ld, (value) => this.setParameters({ ld: value })));
        container.appendChild(createRow('Feedback (%):', 'number', '0', '99', '1', this.fb, (value) => this.setParameters({ fb: value })));
        container.appendChild(createRow('Ping-Pong (%):', 'number', '0', '100', '1', this.pp, (value) => this.setParameters({ pp: value })));
        container.appendChild(createRow('Mix (%):', 'number', '0', '100', '1', this.mx, (value) => this.setParameters({ mx: value })));

        return container;
    }
}

// Register the plugin globally
window.DelayPlugin = DelayPlugin;