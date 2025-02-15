class MultibandBalancePlugin extends PluginBase {
    constructor() {
        super('Multiband Balance', '5-band stereo balance with crossover filters');

        // Crossover frequencies (same as Multiband Compressor)
        this.f1 = 100;  // Low
        this.f2 = 500;  // Low-mid
        this.f3 = 2000; // Mid
        this.f4 = 8000; // High

        // Band balance parameters (-100 to 100, default center)
        this.bands = [
            { balance: 0 }, // Low
            { balance: 0 }, // Low-mid
            { balance: 0 }, // Mid
            { balance: 0 }, // High-mid
            { balance: 0 }  // High
        ];

        this.selectedBand = 0;
        this.registerProcessor(this.getProcessorCode());
    }

    getProcessorCode() {
        return `
            const result = new Float32Array(data.length);

            if (!parameters.enabled) {
                result.set(data);
                return result;
            }

            const frequencies = [parameters.f1, parameters.f2, parameters.f3, parameters.f4];
            const blockSize = parameters.blockSize;

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
                    lowpass: Array(4).fill(0).map(() => createFilterState()),
                    highpass: Array(4).fill(0).map(() => createFilterState())
                };

                context.filterConfig = {
                    sampleRate: parameters.sampleRate,
                    frequencies: frequencies.slice(),
                    channelCount: parameters.channelCount
                };

                // Apply a short fade-in to prevent clicks when filter states are reset
                context.fadeIn = {
                    counter: 0,
                    length: Math.min(parameters.blockSize, parameters.sampleRate * 0.005)
                };
            }

            // Helper function to apply cascaded Linkwitz-Riley filter (2 stages)
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
                context.cachedFilters = new Array(4);
                for (let i = 0; i < 4; i++) {
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
            if (!context.bandSignals || context.bandSignals.length !== 5) {
                context.bandSignals = new Array(5).fill(0).map(() => ({
                    left: new Float32Array(blockSize),
                    right: new Float32Array(blockSize)
                }));
            }

            const filterStates = context.filterStates;
            const bandSignals = context.bandSignals;

            // Process each sample
            for (let i = 0; i < blockSize; i++) {
                const leftInput = data[i];
                const rightInput = data[i + blockSize];

                // Split signal into frequency bands using cascaded Linkwitz-Riley filters
                // Band 0 (Low)
                bandSignals[0].left[i] = applyFilter(leftInput, context.cachedFilters[0].lowpass, filterStates.lowpass[0], 0);
                bandSignals[0].right[i] = applyFilter(rightInput, context.cachedFilters[0].lowpass, filterStates.lowpass[0], 1);
                const hp1Left = applyFilter(leftInput, context.cachedFilters[0].highpass, filterStates.highpass[0], 0);
                const hp1Right = applyFilter(rightInput, context.cachedFilters[0].highpass, filterStates.highpass[0], 1);

                // Band 1 (Low-Mid)
                bandSignals[1].left[i] = applyFilter(hp1Left, context.cachedFilters[1].lowpass, filterStates.lowpass[1], 0);
                bandSignals[1].right[i] = applyFilter(hp1Right, context.cachedFilters[1].lowpass, filterStates.lowpass[1], 1);
                const hp2Left = applyFilter(hp1Left, context.cachedFilters[1].highpass, filterStates.highpass[1], 0);
                const hp2Right = applyFilter(hp1Right, context.cachedFilters[1].highpass, filterStates.highpass[1], 1);

                // Band 2 (Mid)
                bandSignals[2].left[i] = applyFilter(hp2Left, context.cachedFilters[2].lowpass, filterStates.lowpass[2], 0);
                bandSignals[2].right[i] = applyFilter(hp2Right, context.cachedFilters[2].lowpass, filterStates.lowpass[2], 1);
                const hp3Left = applyFilter(hp2Left, context.cachedFilters[2].highpass, filterStates.highpass[2], 0);
                const hp3Right = applyFilter(hp2Right, context.cachedFilters[2].highpass, filterStates.highpass[2], 1);

                // Band 3 (High-Mid)
                bandSignals[3].left[i] = applyFilter(hp3Left, context.cachedFilters[3].lowpass, filterStates.lowpass[3], 0);
                bandSignals[3].right[i] = applyFilter(hp3Right, context.cachedFilters[3].lowpass, filterStates.lowpass[3], 1);

                // Band 4 (High)
                bandSignals[4].left[i] = applyFilter(hp3Left, context.cachedFilters[3].highpass, filterStates.highpass[3], 0);
                bandSignals[4].right[i] = applyFilter(hp3Right, context.cachedFilters[3].highpass, filterStates.highpass[3], 1);
            }

            // Apply balance and sum bands
            const balanceValues = parameters.bands.map(b => b.balance / 100); // Convert percentage to -1.0 to 1.0
            for (let i = 0; i < blockSize; i++) {
                let leftSum = 0;
                let rightSum = 0;

                for (let band = 0; band < 5; band++) {
                    const leftSignal = bandSignals[band].left[i];
                    const rightSignal = bandSignals[band].right[i];
                    const balance = balanceValues[band];
                    
                    if (Math.abs(balance) < 1e-6) {
                        // Center position (balance = 0): no change
                        leftSum += leftSignal;
                        rightSum += rightSignal;
                    } else {
                        // Apply balance
                        const leftGain = Math.max(0, 1 - balance);
                        const rightGain = Math.max(0, 1 + balance);
                        leftSum += leftSignal * leftGain;
                        rightSum += rightSignal * rightGain;
                    }
                }

                // Apply fade-in if active
                const fadeIn = context.fadeIn;
                if (fadeIn && fadeIn.counter < fadeIn.length) {
                    const gain = fadeIn.counter++ / fadeIn.length;
                    leftSum *= gain;
                    rightSum *= gain;
                }

                result[i] = leftSum;
                result[i + blockSize] = rightSum;
            }

            return result;
        `;
    }

    getParameters() {
        return {
            type: this.constructor.name,
            enabled: this.enabled,
            f1: this.f1,
            f2: this.f2,
            f3: this.f3,
            f4: this.f4,
            bands: this.bands.map(b => ({ balance: b.balance }))
        };
    }

    setParameters(params) {
        // Update crossover frequencies with bounds checking
        if (params.f1 !== undefined) {
            this.f1 = Math.max(20, Math.min(500, params.f1));
        }
        if (params.f2 !== undefined) {
            this.f2 = Math.max(100, Math.min(2000, Math.max(this.f1, params.f2)));
        }
        if (params.f3 !== undefined) {
            this.f3 = Math.max(500, Math.min(8000, Math.max(this.f2, params.f3)));
        }
        if (params.f4 !== undefined) {
            this.f4 = Math.max(1000, Math.min(20000, Math.max(this.f3, params.f4)));
        }

        // Update band parameters if provided as an array
        if (Array.isArray(params.bands)) {
            params.bands.forEach((bandParams, i) => {
                if (i < 5 && bandParams.balance !== undefined) {
                    this.bands[i].balance = Math.max(-100, Math.min(100, bandParams.balance));
                }
            });
        } else if (params.band !== undefined && params.balance !== undefined) {
            // Update a single band's balance
            if (params.band >= 0 && params.band < 5) {
                this.bands[params.band].balance = Math.max(-100, Math.min(100, params.balance));
            }
        }

        if (params.enabled !== undefined) this.enabled = params.enabled;
        this.updateParameters();
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'multiband-balance-container';

        // Frequency sliders UI
        const freqContainer = document.createElement('div');
        freqContainer.className = 'plugin-parameter-ui';
        const freqSliders = document.createElement('div');
        freqSliders.className = 'multiband-balance-frequency-sliders';
        freqContainer.appendChild(freqSliders);

        const createFreqSlider = (label, min, max, value, setter) => {
            const sliderContainer = document.createElement('div');
            sliderContainer.className = 'multiband-balance-frequency-slider';
            const topRow = document.createElement('div');
            topRow.className = 'multiband-balance-frequency-slider-top';
            const labelEl = document.createElement('label');
            labelEl.textContent = label;
            const numberInput = document.createElement('input');
            numberInput.type = 'number';
            numberInput.min = min;
            numberInput.max = max;
            numberInput.step = 1;
            numberInput.value = value;
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
            topRow.appendChild(labelEl);
            topRow.appendChild(numberInput);
            sliderContainer.appendChild(topRow);
            sliderContainer.appendChild(rangeInput);
            return sliderContainer;
        };

        freqSliders.appendChild(createFreqSlider('Freq 1 (Hz):', 20, 500, this.f1, (value) => this.setParameters({ f1: value })));
        freqSliders.appendChild(createFreqSlider('Freq 2 (Hz):', 100, 2000, this.f2, (value) => this.setParameters({ f2: value })));
        freqSliders.appendChild(createFreqSlider('Freq 3 (Hz):', 500, 8000, this.f3, (value) => this.setParameters({ f3: value })));
        freqSliders.appendChild(createFreqSlider('Freq 4 (Hz):', 1000, 20000, this.f4, (value) => this.setParameters({ f4: value })));
        container.appendChild(freqContainer);

        // Band balance sliders UI
        const bandContainer = document.createElement('div');
        bandContainer.className = 'plugin-parameter-ui';
        const bandBalances = document.createElement('div');
        bandBalances.className = 'multiband-balance-band-balances';
        bandContainer.appendChild(bandBalances);

        const createBalanceSlider = (label, bandIndex) => {
            const row = document.createElement('div');
            row.className = 'parameter-row';
            const labelEl = document.createElement('label');
            labelEl.textContent = label;
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = -100;
            slider.max = 100;
            slider.step = 1;
            slider.value = this.bands[bandIndex].balance;
            const numberInput = document.createElement('input');
            numberInput.type = 'number';
            numberInput.min = -100;
            numberInput.max = 100;
            numberInput.step = 1;
            numberInput.value = this.bands[bandIndex].balance;
            slider.addEventListener('input', (e) => {
                this.setParameters({ band: bandIndex, balance: parseFloat(e.target.value) });
                numberInput.value = e.target.value;
            });
            numberInput.addEventListener('input', (e) => {
                const val = Math.max(-100, Math.min(100, parseFloat(e.target.value) || 0));
                this.setParameters({ band: bandIndex, balance: val });
                slider.value = val;
                e.target.value = val;
            });
            row.appendChild(labelEl);
            row.appendChild(slider);
            row.appendChild(numberInput);
            return row;
        };

        // バンドを逆順で表示(Band 5から1)
        bandBalances.appendChild(createBalanceSlider('Band 5 Bal. (%):', 4));
        bandBalances.appendChild(createBalanceSlider('Band 4 Bal. (%):', 3));
        bandBalances.appendChild(createBalanceSlider('Band 3 Bal. (%):', 2));
        bandBalances.appendChild(createBalanceSlider('Band 2 Bal. (%):', 1));
        bandBalances.appendChild(createBalanceSlider('Band 1 Bal. (%):', 0));
        container.appendChild(bandContainer);

        return container;
    }
}

window.MultibandBalancePlugin = MultibandBalancePlugin;
