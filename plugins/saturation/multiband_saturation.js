class MultibandSaturationPlugin extends PluginBase {
    constructor() {
        super('Multiband Saturation', '3-band saturation effect');

        // Crossover frequencies
        this.f1 = 200;  // Low-Mid crossover
        this.f2 = 4000; // Mid-High crossover

        // Band parameters (3 bands with default values)
        this.bands = [
            { dr: 1.5, bs: 0.1, mx: 100, gn: 0 }, // Low
            { dr: 1.5, bs: 0.1, mx: 100, gn: 0 }, // Mid
            { dr: 1.5, bs: 0.1, mx: 100, gn: 0 }  // High
        ];

        this.selectedBand = 0;
        this.lastProcessTime = performance.now() / 1000;
        this.animationFrameId = null;

        this.registerProcessor(this.getProcessorCode());
    }

    getProcessorCode() {
        return `
            if (!parameters.enabled) return data;

            const frequencies = [parameters.f1, parameters.f2];

            // Check if filter states need to be reset
            const needsReset = !context.filterStates ||
                             !context.filterConfig ||
                             context.filterConfig.sampleRate !== parameters.sampleRate ||
                             context.filterConfig.channelCount !== parameters.channelCount ||
                             !context.filterConfig.frequencies ||
                             context.filterConfig.frequencies.some((f, i) => f !== frequencies[i]);

            if (needsReset) {
                // Create filter state with DC-blocking initialization
                const createFilterState = () => {
                    const state = {
                        stage1: {
                            x1: new Float32Array(parameters.channelCount),
                            x2: new Float32Array(parameters.channelCount),
                            y1: new Float32Array(parameters.channelCount),
                            y2: new Float32Array(parameters.channelCount)
                        },
                        stage2: {
                            x1: new Float32Array(parameters.channelCount),
                            x2: new Float32Array(parameters.channelCount),
                            y1: new Float32Array(parameters.channelCount),
                            y2: new Float32Array(parameters.channelCount)
                        }
                    };
                    const dcOffset = 1e-25;
                    for (let ch = 0; ch < parameters.channelCount; ch++) {
                        state.stage1.x1[ch] = dcOffset;
                        state.stage1.x2[ch] = -dcOffset;
                        state.stage1.y1[ch] = dcOffset;
                        state.stage1.y2[ch] = -dcOffset;
                        state.stage2.x1[ch] = dcOffset;
                        state.stage2.x2[ch] = -dcOffset;
                        state.stage2.y1[ch] = dcOffset;
                        state.stage2.y2[ch] = -dcOffset;
                    }
                    return state;
                };

                context.filterStates = {
                    lowpass: Array(2).fill(0).map(() => createFilterState()),
                    highpass: Array(2).fill(0).map(() => createFilterState())
                };

                context.filterConfig = {
                    sampleRate: parameters.sampleRate,
                    frequencies: frequencies.slice(),
                    channelCount: parameters.channelCount
                };
            }

            // Helper function to apply cascaded Linkwitz-Riley filter
            function applyFilter(input, coeffs, state, ch) {
                const { b0, b1, b2, a1, a2 } = coeffs;
                const s1 = state.stage1, s2 = state.stage2;
                // First stage filtering
                const stage1_out = b0 * input + b1 * s1.x1[ch] + b2 * s1.x2[ch] - a1 * s1.y1[ch] - a2 * s1.y2[ch];
                s1.x2[ch] = s1.x1[ch];
                s1.x1[ch] = input;
                s1.y2[ch] = s1.y1[ch];
                s1.y1[ch] = stage1_out;
                // Second stage filtering
                const stage2_out = b0 * stage1_out + b1 * s2.x1[ch] + b2 * s2.x2[ch] - a1 * s2.y1[ch] - a2 * s2.y2[ch];
                s2.x2[ch] = s2.x1[ch];
                s2.x1[ch] = stage1_out;
                s2.y2[ch] = s2.y1[ch];
                s2.y1[ch] = stage2_out;
                return stage2_out;
            }

            // Cache filter coefficients if frequencies have changed
            if (!context.cachedFilters || !context.filterConfig || !context.filterConfig.frequencies ||
                frequencies.some((f, i) => f !== context.filterConfig.frequencies[i])) {
                const TWO_PI = 2 * Math.PI;
                const SQRT2 = Math.SQRT2;
                const sampleRateHalf = parameters.sampleRate * 0.5;
                const invSampleRate = 1 / parameters.sampleRate;
                context.cachedFilters = new Array(2);
                for (let i = 0; i < 2; i++) {
                    const freq = Math.max(20, Math.min(sampleRateHalf - 20, frequencies[i]));
                    const omega = Math.tan(freq * Math.PI * invSampleRate);
                    const omega2 = omega * omega;
                    const n = 1 / (omega2 + SQRT2 * omega + 1);
                    const b0_lp = omega2 * n;
                    context.cachedFilters[i] = {
                        lowpass: { b0: b0_lp, b1: 2 * b0_lp, b2: b0_lp, a1: 2 * (omega2 - 1) * n, a2: (omega2 - SQRT2 * omega + 1) * n },
                        highpass: { b0: n, b1: -2 * n, b2: n, a1: 2 * (omega2 - 1) * n, a2: (omega2 - SQRT2 * omega + 1) * n }
                    };
                }
            }

            // Setup band signal buffers
            if (!context.bandSignals || context.bandSignals.length !== parameters.channelCount) {
                const totalArrays = parameters.channelCount * 3;
                const arrayPool = new Float32Array(totalArrays * parameters.blockSize);
                context.bandSignals = Array.from({ length: parameters.channelCount }, (_, ch) => {
                    return new Array(3).fill(0).map((_, band) => {
                        const offset = (ch * 3 + band) * parameters.blockSize;
                        return arrayPool.subarray(offset, offset + parameters.blockSize);
                    });
                });
                context.arrayPool = arrayPool;
            }

            // Process each channel
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                const bandSignals = context.bandSignals[ch];
                const filterStates = context.filterStates;

                // Split signal into frequency bands
                for (let i = 0; i < parameters.blockSize; i++) {
                    const input = data[offset + i];
                    // Band 0 (Low)
                    bandSignals[0][i] = applyFilter(input, context.cachedFilters[0].lowpass, filterStates.lowpass[0], ch);
                    const hp1 = applyFilter(input, context.cachedFilters[0].highpass, filterStates.highpass[0], ch);
                    // Band 1 (Mid)
                    bandSignals[1][i] = applyFilter(hp1, context.cachedFilters[1].lowpass, filterStates.lowpass[1], ch);
                    // Band 2 (High)
                    bandSignals[2][i] = applyFilter(hp1, context.cachedFilters[1].highpass, filterStates.highpass[1], ch);
                }

                // Process each band with saturation
                for (let band = 0; band < 3; band++) {
                    const bandParams = parameters.bands[band];
                    const mixRatio = bandParams.mx / 100;
                    const gainLinear = Math.pow(10, bandParams.gn / 20);
                    const biasOffset = Math.tanh(bandParams.dr * bandParams.bs);

                    for (let i = 0; i < parameters.blockSize; i++) {
                        const dry = bandSignals[band][i];
                        const wet = Math.tanh(bandParams.dr * (dry + bandParams.bs)) - biasOffset;
                        bandSignals[band][i] = (dry * (1 - mixRatio) + wet * mixRatio) * gainLinear;
                    }
                }

                // Sum all bands
                for (let i = 0; i < parameters.blockSize; i++) {
                    data[offset + i] = bandSignals[0][i] + bandSignals[1][i] + bandSignals[2][i];
                }
            }

            const result = new Float32Array(data.length);
            result.set(data);
            return result;
        `;
    }

    onMessage(message) {
        if (message.type === 'processBuffer' && message.buffer) {
            const result = new Float32Array(message.buffer.length);
            result.set(message.buffer);
            this.updateTransferGraphs();
            return result;
        }
    }

    setParameters(params) {
        let graphNeedsUpdate = false;

        // Update crossover frequencies with bounds checking
        if (params.f1 !== undefined) {
            this.f1 = Math.max(20, Math.min(2000, params.f1));
            graphNeedsUpdate = true;
        }
        if (params.f2 !== undefined) {
            this.f2 = Math.max(200, Math.min(20000, Math.max(this.f1, params.f2)));
            graphNeedsUpdate = true;
        }

        // Update band parameters if provided as an array
        if (Array.isArray(params.bands)) {
            params.bands.forEach((bandParams, i) => {
                if (i < 3) {
                    const band = this.bands[i];
                    if (bandParams.dr !== undefined) band.dr = Math.max(0, Math.min(10, bandParams.dr));
                    if (bandParams.bs !== undefined) band.bs = Math.max(-0.3, Math.min(0.3, bandParams.bs));
                    if (bandParams.mx !== undefined) band.mx = Math.max(0, Math.min(100, bandParams.mx));
                    if (bandParams.gn !== undefined) band.gn = Math.max(-18, Math.min(18, bandParams.gn));
                }
            });
            graphNeedsUpdate = true;
        } else if (params.band !== undefined) {
            const band = this.bands[params.band];
            if (!band) return;
            if (params.dr !== undefined) { band.dr = Math.max(0, Math.min(10, params.dr)); graphNeedsUpdate = true; }
            if (params.bs !== undefined) { band.bs = Math.max(-0.3, Math.min(0.3, params.bs)); graphNeedsUpdate = true; }
            if (params.mx !== undefined) { band.mx = Math.max(0, Math.min(100, params.mx)); graphNeedsUpdate = true; }
            if (params.gn !== undefined) { band.gn = Math.max(-18, Math.min(18, params.gn)); graphNeedsUpdate = true; }
        }

        if (params.enabled !== undefined) this.enabled = params.enabled;

        this.updateParameters();
        if (graphNeedsUpdate) this.updateTransferGraphs();
    }

    // Frequency slider setters
    setF1(value) { this.setParameters({ f1: value }); }
    setF2(value) { this.setParameters({ f2: value }); }

    // Band parameter setters
    setDr(value) { this.setParameters({ band: this.selectedBand, dr: value }); }
    setBs(value) { this.setParameters({ band: this.selectedBand, bs: value }); }
    setMx(value) { this.setParameters({ band: this.selectedBand, mx: value }); }
    setGn(value) { this.setParameters({ band: this.selectedBand, gn: value }); }

    getParameters() {
        return {
            type: this.constructor.name,
            f1: this.f1,
            f2: this.f2,
            bands: this.bands.map(b => ({
                dr: b.dr,
                bs: b.bs,
                mx: b.mx,
                gn: b.gn
            })),
            enabled: this.enabled
        };
    }

    updateTransferGraphs() {
        const container = document.querySelector(`[data-instance-id="${this.instanceId}"]`);
        if (!container) return;

        if (!this.canvases) {
            this.canvases = Array.from(container.querySelectorAll('.mbs-band-graph canvas'));
            if (!this.canvases.length) return;
        }

        const GRID_COLOR = '#444';
        const LABEL_COLOR = '#666';
        const CURVE_COLOR = '#0f0';

        this.canvases.forEach((canvas, bandIndex) => {
            if (bandIndex >= this.bands.length) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            const band = this.bands[bandIndex];
            if (!band) return;

            ctx.clearRect(0, 0, width, height);

            // Draw grid lines
            ctx.strokeStyle = GRID_COLOR;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= width; x += width / 4) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
            }
            for (let y = 0; y <= height; y += height / 4) {
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
            }
            ctx.stroke();

            // Draw labels
            ctx.fillStyle = LABEL_COLOR;
            ctx.font = '20px Arial';
            ctx.fillText('-6dB', width * 0.25, height - 5);
            ctx.fillText('-6dB', width * 0.75, height - 5);
            ctx.save();
            ctx.translate(20, height * 0.25);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('-6dB', 0, 0);
            ctx.restore();
            ctx.save();
            ctx.translate(20, height * 0.75);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('-6dB', 0, 0);
            ctx.restore();

            // Draw axis labels
            ctx.fillStyle = '#fff';
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('in', width / 2, height - 5);
            ctx.save();
            ctx.translate(20, height / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('out', 0, 0);
            ctx.restore();

            // Draw transfer curve
            ctx.strokeStyle = CURVE_COLOR;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const mixRatio = band.mx / 100;
            const biasOffset = Math.tanh(band.dr * band.bs);
            for (let i = 0; i < width; i++) {
                const x = (i / width) * 2 - 1;
                const wet = Math.tanh(band.dr * (x + band.bs)) - biasOffset;
                const y = ((1 - mixRatio) * x + mixRatio * wet) * Math.pow(10, band.gn / 20);
                const clampedY = Math.max(-1, Math.min(1, y));
                const canvasY = ((1 - clampedY) / 2) * height;
                if (i === 0) {
                    ctx.moveTo(i, canvasY);
                } else {
                    ctx.lineTo(i, canvasY);
                }
            }
            ctx.stroke();
        });
    }

    startAnimation() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        const animate = () => {
            const container = document.querySelector(`[data-instance-id="${this.instanceId}"]`);
            if (!container) {
                this.cleanup();
                return;
            }
            this.updateTransferGraphs();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        this.animationFrameId = requestAnimationFrame(animate);
    }

    cleanup() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.canvases = null;
        this.lastProcessTime = performance.now() / 1000;
    }

    createUI() {
        const container = document.createElement('div');
        this.instanceId = `mbs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        container.className = 'mbs-container';
        container.setAttribute('data-instance-id', this.instanceId);

        // Frequency sliders UI
        const freqContainer = document.createElement('div');
        freqContainer.className = 'mbs-freq-sliders';

        const createFreqSlider = (label, min, max, value, setter) => {
            const sliderContainer = document.createElement('div');
            sliderContainer.className = 'mbs-freq-slider';

            const topRow = document.createElement('div');
            topRow.className = 'mbs-freq-slider-top';

            const labelEl = document.createElement('label');
            labelEl.textContent = label;

            const numberInput = document.createElement('input');
            numberInput.type = 'number';
            numberInput.min = min;
            numberInput.max = max;
            numberInput.step = 1;
            numberInput.value = value;

            topRow.appendChild(labelEl);
            topRow.appendChild(numberInput);
            sliderContainer.appendChild(topRow);

            const rangeInput = document.createElement('input');
            rangeInput.type = 'range';
            rangeInput.min = min;
            rangeInput.max = max;
            rangeInput.step = 1;
            rangeInput.value = value;

            rangeInput.addEventListener('input', (e) => {
                setter(parseFloat(e.target.value));
                numberInput.value = e.target.value;
            });
            numberInput.addEventListener('input', (e) => {
                const val = Math.max(min, Math.min(max, parseFloat(e.target.value) || 0));
                setter(val);
                rangeInput.value = val;
                e.target.value = val;
            });

            sliderContainer.appendChild(rangeInput);
            return sliderContainer;
        };

        freqContainer.appendChild(createFreqSlider('Freq 1 (Hz)', 20, 2000, this.f1, this.setF1.bind(this)));
        freqContainer.appendChild(createFreqSlider('Freq 2 (Hz)', 200, 20000, this.f2, this.setF2.bind(this)));
        container.appendChild(freqContainer);

        // Band settings UI
        const bandSettings = document.createElement('div');
        bandSettings.className = 'mbs-band-settings';
        const bandTabs = document.createElement('div');
        bandTabs.className = 'mbs-band-tabs';
        const bandContents = document.createElement('div');
        bandContents.className = 'mbs-band-contents';

        const bandNames = ['Low', 'Mid', 'High'];
        for (let i = 0; i < this.bands.length; i++) {
            const tab = document.createElement('button');
            tab.className = `mbs-band-tab ${i === 0 ? 'active' : ''}`;
            tab.textContent = bandNames[i];
            tab.setAttribute('data-instance-id', this.instanceId);
            
            tab.onclick = () => {
                if (i >= this.bands.length) return;
                const container = document.querySelector(`[data-instance-id="${this.instanceId}"]`);
                container.querySelectorAll('.mbs-band-tab').forEach(t => t.classList.remove('active'));
                container.querySelectorAll('.mbs-band-content').forEach(c => c.classList.remove('active'));
                container.querySelectorAll('.mbs-band-graph').forEach((g, index) => {
                    g.classList.toggle('active', index === i);
                });
                tab.classList.add('active');
                content.classList.add('active');
                this.selectedBand = i;
                this.updateTransferGraphs();
            };
            bandTabs.appendChild(tab);

            const content = document.createElement('div');
            content.className = `mbs-band-content plugin-parameter-ui ${i === 0 ? 'active' : ''}`;
            content.setAttribute('data-instance-id', this.instanceId);

            const createControl = (label, min, max, step, value, setter) => {
                const row = document.createElement('div');
                row.className = 'parameter-row';
                const labelEl = document.createElement('label');
                labelEl.textContent = label;
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
                slider.addEventListener('input', (e) => {
                    setter(parseFloat(e.target.value));
                    numberInput.value = e.target.value;
                });
                numberInput.addEventListener('input', (e) => {
                    const val = Math.max(min, Math.min(max, parseFloat(e.target.value) || 0));
                    setter(val);
                    slider.value = val;
                    e.target.value = val;
                });
                row.appendChild(labelEl);
                row.appendChild(slider);
                row.appendChild(numberInput);
                return row;
            };

            const band = this.bands[i];
            content.appendChild(createControl('Drive:', 0, 10, 0.1, band.dr, this.setDr.bind(this)));
            content.appendChild(createControl('Bias:', -0.3, 0.3, 0.01, band.bs, this.setBs.bind(this)));
            content.appendChild(createControl('Mix (%):', 0, 100, 1, band.mx, this.setMx.bind(this)));
            content.appendChild(createControl('Gain (dB):', -18, 18, 0.1, band.gn, this.setGn.bind(this)));
            bandContents.appendChild(content);
        }

        bandSettings.appendChild(bandTabs);
        bandSettings.appendChild(bandContents);
        container.appendChild(bandSettings);

        // Transfer graphs UI
        const graphsContainer = document.createElement('div');
        graphsContainer.className = 'mbs-transfer-graphs';
        for (let i = 0; i < this.bands.length; i++) {
            const graphDiv = document.createElement('div');
            graphDiv.className = `mbs-band-graph ${i === 0 ? 'active' : ''}`;
            graphDiv.setAttribute('data-instance-id', this.instanceId);
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 320;
            canvas.style.width = '160px';
            canvas.style.height = '160px';
            canvas.style.backgroundColor = '#222';
            const label = document.createElement('div');
            label.className = 'mbs-band-graph-label';
            label.textContent = bandNames[i];
            graphDiv.appendChild(canvas);
            graphDiv.appendChild(label);
            graphsContainer.appendChild(graphDiv);
        }
        container.appendChild(graphsContainer);

        this.canvases = Array.from(container.querySelectorAll('.mbs-band-graph canvas'));
        this.updateTransferGraphs();
        this.startAnimation();

        return container;
    }
}

window.MultibandSaturationPlugin = MultibandSaturationPlugin;
