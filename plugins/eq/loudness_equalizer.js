class LoudnessEqualizerPlugin extends PluginBase {
    constructor() {
        super('Loudness Equalizer', 'Small volume playback frequency balance correction');

        // Initialize parameters with defaults
        this.sp = 65.0;  // Average SPL (dB)
        this.lg = 10.0;  // Low Gain (dB)
        this.lf = 180;   // Low Freq (Hz)
        this.lq = 0.6;  // Low Q
        this.hq = 0.6;  // High Q
        this.hg = 0.0;   // High Gain (dB)
        this.hf = 4000;  // High Freq (Hz)

        // Register processor function
        this.registerProcessor(`
            if (!parameters.enabled) return data;

            const { sp, lg, lf, lq, hq, hg, hf, channelCount, blockSize } = parameters;

            // Calculate gain multiplier based on SPL difference
            const gainMultiplier = (85 - sp) / 25;

            // Initialize context state if needed
            if (!context.initialized) {
                context.filterStates = {
                    low: new Array(channelCount).fill().map(() => ({
                        x1: 0, x2: 0, y1: 0, y2: 0
                    })),
                    high: new Array(channelCount).fill().map(() => ({
                        x1: 0, x2: 0, y1: 0, y2: 0
                    }))
                };
                context.initialized = true;
            }

            // Reset if channel count changes
            if (context.filterStates.low.length !== channelCount) {
                context.filterStates = {
                    low: new Array(channelCount).fill().map(() => ({
                        x1: 0, x2: 0, y1: 0, y2: 0
                    })),
                    high: new Array(channelCount).fill().map(() => ({
                        x1: 0, x2: 0, y1: 0, y2: 0
                    }))
                };
            }

            // Pre-calculate filter coefficients for low shelf
            const lowGain = lg * gainMultiplier;
            const w0_low = 2 * Math.PI * lf / sampleRate;
            const A_low = Math.pow(10, lowGain / 40);
            const alpha_low = Math.sin(w0_low) / (2 * lq);
            const cos_w0_low = Math.cos(w0_low);
            const two_sqrt_A_alpha_low = 2 * Math.sqrt(A_low) * alpha_low;

            const low_b0 = A_low * ((A_low + 1) - (A_low - 1) * cos_w0_low + two_sqrt_A_alpha_low);
            const low_b1 = 2 * A_low * ((A_low - 1) - (A_low + 1) * cos_w0_low);
            const low_b2 = A_low * ((A_low + 1) - (A_low - 1) * cos_w0_low - two_sqrt_A_alpha_low);
            const low_a0 = (A_low + 1) + (A_low - 1) * cos_w0_low + two_sqrt_A_alpha_low;
            const low_a1 = -2 * ((A_low - 1) + (A_low + 1) * cos_w0_low);
            const low_a2 = (A_low + 1) + (A_low - 1) * cos_w0_low - two_sqrt_A_alpha_low;

            // Normalize low shelf coefficients
            const low_b0_n = low_b0 / low_a0;
            const low_b1_n = low_b1 / low_a0;
            const low_b2_n = low_b2 / low_a0;
            const low_a1_n = low_a1 / low_a0;
            const low_a2_n = low_a2 / low_a0;

            // Pre-calculate filter coefficients for high shelf
            const highGain = hg * gainMultiplier;
            const w0_high = 2 * Math.PI * hf / sampleRate;
            const A_high = Math.pow(10, highGain / 40);
            const alpha_high = Math.sin(w0_high) / (2 * hq);
            const cos_w0_high = Math.cos(w0_high);
            const two_sqrt_A_alpha_high = 2 * Math.sqrt(A_high) * alpha_high;

            const high_b0 = A_high * ((A_high + 1) + (A_high - 1) * cos_w0_high + two_sqrt_A_alpha_high);
            const high_b1 = -2 * A_high * ((A_high - 1) + (A_high + 1) * cos_w0_high);
            const high_b2 = A_high * ((A_high + 1) + (A_high - 1) * cos_w0_high - two_sqrt_A_alpha_high);
            const high_a0 = (A_high + 1) - (A_high - 1) * cos_w0_high + two_sqrt_A_alpha_high;
            const high_a1 = 2 * ((A_high - 1) - (A_high + 1) * cos_w0_high);
            const high_a2 = (A_high + 1) - (A_high - 1) * cos_w0_high - two_sqrt_A_alpha_high;

            // Normalize high shelf coefficients
            const high_b0_n = high_b0 / high_a0;
            const high_b1_n = high_b1 / high_a0;
            const high_b2_n = high_b2 / high_a0;
            const high_a1_n = high_a1 / high_a0;
            const high_a2_n = high_a2 / high_a0;

            // Process each channel
            for (let ch = 0; ch < channelCount; ch++) {
                const offset = ch * blockSize;
                const lowState = context.filterStates.low[ch];
                const highState = context.filterStates.high[ch];

                for (let i = 0; i < blockSize; i++) {
                    const input = data[offset + i];

                    // Process low shelf
                    const lowOutput = low_b0_n * input + 
                                    low_b1_n * lowState.x1 + 
                                    low_b2_n * lowState.x2 - 
                                    low_a1_n * lowState.y1 - 
                                    low_a2_n * lowState.y2;

                    lowState.x2 = lowState.x1;
                    lowState.x1 = input;
                    lowState.y2 = lowState.y1;
                    lowState.y1 = lowOutput;

                    // Process high shelf
                    const highOutput = high_b0_n * lowOutput + 
                                     high_b1_n * highState.x1 + 
                                     high_b2_n * highState.x2 - 
                                     high_a1_n * highState.y1 - 
                                     high_a2_n * highState.y2;

                    highState.x2 = highState.x1;
                    highState.x1 = lowOutput;
                    highState.y2 = highState.y1;
                    highState.y1 = highOutput;

                    data[offset + i] = highOutput;
                }
            }

            return data;
        `);
    }

    getParameters() {
        return {
            type: this.constructor.name,
            enabled: this.enabled,
            sp: this.sp,  // Average SPL
            lg: this.lg,  // Low Gain
            lf: this.lf,  // Low Freq
            lq: this.lq,  // Low Q
            hq: this.hq,  // High Q
            hg: this.hg,  // High Gain
            hf: this.hf   // High Freq
        };
    }

    setParameters(params) {
        if (params.sp !== undefined) this.sp = Math.max(60.0, Math.min(85.0, Number(params.sp)));
        if (params.lg !== undefined) this.lg = Math.max(0.0, Math.min(15.0, Number(params.lg))); // max gain changed to 15dB
        if (params.lf !== undefined) this.lf = Math.max(100, Math.min(300, Math.floor(Number(params.lf))));
        if (params.lq !== undefined) this.lq = Math.max(0.5, Math.min(1.0, Number(params.lq)));
        if (params.hq !== undefined) this.hq = Math.max(0.5, Math.min(1.0, Number(params.hq)));
        if (params.hg !== undefined) this.hg = Math.max(0.0, Math.min(15.0, Number(params.hg))); // max gain changed to 15dB
        if (params.hf !== undefined) this.hf = Math.max(3000, Math.min(6000, Math.floor(Number(params.hf))));
        this.updateParameters();
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'loudness-equalizer-plugin-ui plugin-parameter-ui';

        // Helper to create a parameter row with slider and number input
        const createRow = (labelText, min, max, step, value, onChange) => {
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
            const numberInput = document.createElement('input');
            numberInput.type = 'number';
            numberInput.min = min;
            numberInput.max = max;
            numberInput.step = step;
            numberInput.value = value;
            slider.addEventListener('input', e => {
                onChange(parseFloat(e.target.value));
                numberInput.value = e.target.value;
                this.drawGraph(canvas);
            });
            numberInput.addEventListener('input', e => {
                const val = Math.max(min, Math.min(max, parseFloat(e.target.value) || 0));
                onChange(val);
                slider.value = val;
                e.target.value = val;
                this.drawGraph(canvas);
            });
            row.appendChild(label);
            row.appendChild(slider);
            row.appendChild(numberInput);
            return row;
        };

        // Create parameter rows
        container.appendChild(createRow('Average SPL (dB):', 60.0, 85.0, 0.1, this.sp, v => this.setParameters({ sp: v })));
        container.appendChild(createRow('Low Freq (Hz):', 100, 300, 1, this.lf, v => this.setParameters({ lf: v })));
        container.appendChild(createRow('Low Gain (dB):', 0.0, 15.0, 0.1, this.lg, v => this.setParameters({ lg: v }))); // max slider changed to 15dB
        container.appendChild(createRow('Low Q:', 0.5, 1.0, 0.01, this.lq, v => this.setParameters({ lq: v })));
        container.appendChild(createRow('High Freq (Hz):', 3000, 6000, 10, this.hf, v => this.setParameters({ hf: v })));
        container.appendChild(createRow('High Gain (dB):', 0.0, 15.0, 0.1, this.hg, v => this.setParameters({ hg: v }))); // max slider changed to 15dB
        container.appendChild(createRow('High Q:', 0.5, 1.0, 0.01, this.hq, v => this.setParameters({ hq: v })));

        // Create graph container and canvas
        const graphContainer = document.createElement('div');
        graphContainer.style.position = 'relative';
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 480;
        canvas.style.width = '600px';
        canvas.style.height = '240px';
        graphContainer.appendChild(canvas);
        container.appendChild(graphContainer);

        this.drawGraph(canvas);
        return container;
    }

    drawGraph(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        const freqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
        freqs.forEach(freq => {
            const x = width * (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            if (freq > 20 && freq < 20000) {
                ctx.fillStyle = '#666';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(freq >= 1000 ? `${freq/1000}k` : freq, x, height - 40);
            }
        });

        // Adjusted vertical axis: from -6dB to +18dB
        const dBs = [-6, 0, 6, 12, 18];
        dBs.forEach(db => {
            const y = height * (1 - (db + 6) / 24); // denominator changed from 30 to 24
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            if (db > -6 && db < 18) {
                ctx.fillStyle = '#666';
                ctx.font = '20px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(`${db}dB`, 80, y + 6);
            }
        });

        // Draw labels
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Frequency (Hz)', width / 2, height - 5);
        ctx.save();
        ctx.translate(20, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Level (dB)', 0, 0);
        ctx.restore();

        // Use a fixed sample rate for visualization
        const sampleRate = 96000;

        // Calculate gain multiplier based on SPL difference
        const gainMultiplier = (85 - this.sp) / 25;

        // Compute low shelf coefficients (same as in processor)
        const lowGain = this.lg * gainMultiplier;
        const w0_low = 2 * Math.PI * this.lf / sampleRate;
        const A_low = Math.pow(10, lowGain / 40);
        const alpha_low = Math.sin(w0_low) / (2 * this.lq);
        const cos_w0_low = Math.cos(w0_low);
        const two_sqrt_A_alpha_low = 2 * Math.sqrt(A_low) * alpha_low;
        const low_b0 = A_low * ((A_low + 1) - (A_low - 1) * cos_w0_low + two_sqrt_A_alpha_low);
        const low_b1 = 2 * A_low * ((A_low - 1) - (A_low + 1) * cos_w0_low);
        const low_b2 = A_low * ((A_low + 1) - (A_low - 1) * cos_w0_low - two_sqrt_A_alpha_low);
        const low_a0 = (A_low + 1) + (A_low - 1) * cos_w0_low + two_sqrt_A_alpha_low;
        const low_a1 = -2 * ((A_low - 1) + (A_low + 1) * cos_w0_low);
        const low_a2 = (A_low + 1) + (A_low - 1) * cos_w0_low - two_sqrt_A_alpha_low;
        const low_b0_n = low_b0 / low_a0;
        const low_b1_n = low_b1 / low_a0;
        const low_b2_n = low_b2 / low_a0;
        const low_a1_n = low_a1 / low_a0;
        const low_a2_n = low_a2 / low_a0;

        // Compute high shelf coefficients (same as in processor)
        const highGain = this.hg * gainMultiplier;
        const w0_high = 2 * Math.PI * this.hf / sampleRate;
        const A_high = Math.pow(10, highGain / 40);
        const alpha_high = Math.sin(w0_high) / (2 * this.hq);
        const cos_w0_high = Math.cos(w0_high);
        const two_sqrt_A_alpha_high = 2 * Math.sqrt(A_high) * alpha_high;
        const high_b0 = A_high * ((A_high + 1) + (A_high - 1) * cos_w0_high + two_sqrt_A_alpha_high);
        const high_b1 = -2 * A_high * ((A_high - 1) + (A_high + 1) * cos_w0_high);
        const high_b2 = A_high * ((A_high + 1) + (A_high - 1) * cos_w0_high - two_sqrt_A_alpha_high);
        const high_a0 = (A_high + 1) - (A_high - 1) * cos_w0_high + two_sqrt_A_alpha_high;
        const high_a1 = 2 * ((A_high - 1) - (A_high + 1) * cos_w0_high);
        const high_a2 = (A_high + 1) - (A_high - 1) * cos_w0_high - two_sqrt_A_alpha_high;
        const high_b0_n = high_b0 / high_a0;
        const high_b1_n = high_b1 / high_a0;
        const high_b2_n = high_b2 / high_a0;
        const high_a1_n = high_a1 / high_a0;
        const high_a2_n = high_a2 / high_a0;

        // Draw frequency response curve using the actual filter transfer functions
        ctx.beginPath();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        for (let i = 0; i < width; i++) {
            // Calculate frequency on a logarithmic scale between 20Hz and 20kHz
            const freq = Math.pow(10, Math.log10(20) + (i / width) * (Math.log10(20000) - Math.log10(20)));
            const omega = 2 * Math.PI * freq / sampleRate;

            // Compute low shelf frequency response H_low = (b0 + b1*e^(-jω) + b2*e^(-j2ω)) / (1 + a1*e^(-jω) + a2*e^(-j2ω))
            const lowNumRe = low_b0_n + low_b1_n * Math.cos(omega) + low_b2_n * Math.cos(2 * omega);
            const lowNumIm = - low_b1_n * Math.sin(omega) - low_b2_n * Math.sin(2 * omega);
            const lowDenRe = 1 + low_a1_n * Math.cos(omega) + low_a2_n * Math.cos(2 * omega);
            const lowDenIm = - low_a1_n * Math.sin(omega) - low_a2_n * Math.sin(2 * omega);
            const lowNumMag = Math.sqrt(lowNumRe * lowNumRe + lowNumIm * lowNumIm);
            const lowDenMag = Math.sqrt(lowDenRe * lowDenRe + lowDenIm * lowDenIm);
            const H_low = lowNumMag / lowDenMag;

            // Compute high shelf frequency response H_high
            const highNumRe = high_b0_n + high_b1_n * Math.cos(omega) + high_b2_n * Math.cos(2 * omega);
            const highNumIm = - high_b1_n * Math.sin(omega) - high_b2_n * Math.sin(2 * omega);
            const highDenRe = 1 + high_a1_n * Math.cos(omega) + high_a2_n * Math.cos(2 * omega);
            const highDenIm = - high_a1_n * Math.sin(omega) - high_a2_n * Math.sin(2 * omega);
            const highNumMag = Math.sqrt(highNumRe * highNumRe + highNumIm * highNumIm);
            const highDenMag = Math.sqrt(highDenRe * highDenRe + highDenIm * highDenIm);
            const H_high = highNumMag / highDenMag;

            // Combined overall response (cascaded filters)
            const H_total = H_low * H_high;
            const dB = 20 * Math.log10(H_total);

            // Map dB to y coordinate: -6dB -> bottom, +18dB -> top
            const y = height * (1 - (dB + 6) / 24);

            if (i === 0) {
                ctx.moveTo(i, y);
            } else {
                ctx.lineTo(i, y);
            }
        }
        ctx.stroke();
    }
}

window.LoudnessEqualizerPlugin = LoudnessEqualizerPlugin;
