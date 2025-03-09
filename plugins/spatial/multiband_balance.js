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
            // Create a result buffer to avoid modifying the input data directly
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

            // Helper function to apply cascaded Linkwitz-Riley filter to a block of samples (highly optimized)
            function applyFilterBlock(input, output, coeffs, state, ch, blockSize) {
                const { b0, b1, b2, a1, a2 } = coeffs;
                const s1 = state.stage1, s2 = state.stage2;
                
                // Local variables for filter state (faster access)
                let s1_x1 = s1.x1[ch], s1_x2 = s1.x2[ch], s1_y1 = s1.y1[ch], s1_y2 = s1.y2[ch];
                let s2_x1 = s2.x1[ch], s2_x2 = s2.x2[ch], s2_y1 = s2.y1[ch], s2_y2 = s2.y2[ch];
                
                // Process the entire block with loop unrolling for better performance
                // Process 4 samples at a time when possible
                const blockSizeMod4 = blockSize & ~3; // Fast way to calculate blockSize - (blockSize % 4)
                let i = 0;
                
                // Main loop with 4-sample unrolling
                for (; i < blockSizeMod4; i += 4) {
                    // Sample 1
                    let sample = input[i];
                    let stage1_out = b0 * sample + b1 * s1_x1 + b2 * s1_x2 - a1 * s1_y1 - a2 * s1_y2;
                    s1_x2 = s1_x1;
                    s1_x1 = sample;
                    s1_y2 = s1_y1;
                    s1_y1 = stage1_out;
                    
                    let stage2_out = b0 * stage1_out + b1 * s2_x1 + b2 * s2_x2 - a1 * s2_y1 - a2 * s2_y2;
                    s2_x2 = s2_x1;
                    s2_x1 = stage1_out;
                    s2_y2 = s2_y1;
                    s2_y1 = stage2_out;
                    
                    output[i] = stage2_out;
                    
                    // Sample 2
                    sample = input[i+1];
                    stage1_out = b0 * sample + b1 * s1_x1 + b2 * s1_x2 - a1 * s1_y1 - a2 * s1_y2;
                    s1_x2 = s1_x1;
                    s1_x1 = sample;
                    s1_y2 = s1_y1;
                    s1_y1 = stage1_out;
                    
                    stage2_out = b0 * stage1_out + b1 * s2_x1 + b2 * s2_x2 - a1 * s2_y1 - a2 * s2_y2;
                    s2_x2 = s2_x1;
                    s2_x1 = stage1_out;
                    s2_y2 = s2_y1;
                    s2_y1 = stage2_out;
                    
                    output[i+1] = stage2_out;
                    
                    // Sample 3
                    sample = input[i+2];
                    stage1_out = b0 * sample + b1 * s1_x1 + b2 * s1_x2 - a1 * s1_y1 - a2 * s1_y2;
                    s1_x2 = s1_x1;
                    s1_x1 = sample;
                    s1_y2 = s1_y1;
                    s1_y1 = stage1_out;
                    
                    stage2_out = b0 * stage1_out + b1 * s2_x1 + b2 * s2_x2 - a1 * s2_y1 - a2 * s2_y2;
                    s2_x2 = s2_x1;
                    s2_x1 = stage1_out;
                    s2_y2 = s2_y1;
                    s2_y1 = stage2_out;
                    
                    output[i+2] = stage2_out;
                    
                    // Sample 4
                    sample = input[i+3];
                    stage1_out = b0 * sample + b1 * s1_x1 + b2 * s1_x2 - a1 * s1_y1 - a2 * s1_y2;
                    s1_x2 = s1_x1;
                    s1_x1 = sample;
                    s1_y2 = s1_y1;
                    s1_y1 = stage1_out;
                    
                    stage2_out = b0 * stage1_out + b1 * s2_x1 + b2 * s2_x2 - a1 * s2_y1 - a2 * s2_y2;
                    s2_x2 = s2_x1;
                    s2_x1 = stage1_out;
                    s2_y2 = s2_y1;
                    s2_y1 = stage2_out;
                    
                    output[i+3] = stage2_out;
                }
                
                // Handle remaining samples
                for (; i < blockSize; i++) {
                    // First stage filtering
                    const stage1_out = b0 * input[i] + b1 * s1_x1 + b2 * s1_x2 - a1 * s1_y1 - a2 * s1_y2;
                    s1_x2 = s1_x1;
                    s1_x1 = input[i];
                    s1_y2 = s1_y1;
                    s1_y1 = stage1_out;
                    
                    // Second stage filtering
                    const stage2_out = b0 * stage1_out + b1 * s2_x1 + b2 * s2_x2 - a1 * s2_y1 - a2 * s2_y2;
                    s2_x2 = s2_x1;
                    s2_x1 = stage1_out;
                    s2_y2 = s2_y1;
                    s2_y1 = stage2_out;
                    
                    output[i] = stage2_out;
                }
                
                // Update filter state
                s1.x1[ch] = s1_x1; s1.x2[ch] = s1_x2; s1.y1[ch] = s1_y1; s1.y2[ch] = s1_y2;
                s2.x1[ch] = s2_x1; s2.x2[ch] = s2_x2; s2.y1[ch] = s2_y1; s2.y2[ch] = s2_y2;
            }

            // Cache filter coefficients if frequencies have changed
            if (!context.cachedFilters || !context.filterConfig || !context.filterConfig.frequencies ||
                frequencies.some((f, i) => f !== context.filterConfig.frequencies[i])) {
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

            // Setup band signal buffers using a pooled TypedArray to avoid reallocation
            if (!context.bandSignals || context.bandSignals.length !== parameters.channelCount) {
                const totalArrays = parameters.channelCount * 5;
                const arrayPool = new Float32Array(totalArrays * parameters.blockSize);
                context.bandSignals = Array.from({ length: parameters.channelCount }, (_, ch) => {
                    return new Array(5).fill(0).map((_, band) => {
                        const offset = (ch * 5 + band) * parameters.blockSize;
                        return arrayPool.subarray(offset, offset + parameters.blockSize);
                    });
                });
                context.arrayPool = arrayPool; // Prevent GC of the pool
            }

            // Create temporary buffers for intermediate results if they don't exist
            if (!context.tempBuffers || context.tempBuffers.length !== 3) {
                context.tempBuffers = [
                    new Float32Array(parameters.blockSize),
                    new Float32Array(parameters.blockSize),
                    new Float32Array(parameters.blockSize)
                ];
            }

            // Create output buffer for summing if it doesn't exist
            if (!context.outputBuffer || context.outputBuffer.length !== parameters.blockSize * parameters.channelCount) {
                context.outputBuffer = new Float32Array(parameters.blockSize * parameters.channelCount);
            }

            // Process filtering for each channel (block processing)
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                const bandSignals = context.bandSignals[ch];
                const filterStates = context.filterStates;
                
                // Extract channel data to temporary buffer
                const inputBuffer = context.tempBuffers[0];
                const hp1Buffer = context.tempBuffers[1];
                const hp2Buffer = context.tempBuffers[2];
                
                for (let i = 0; i < parameters.blockSize; i++) {
                    inputBuffer[i] = data[offset + i];
                }
                
                // Apply filters in blocks for better cache locality
                // Band 0 (Low) - direct lowpass on input
                applyFilterBlock(inputBuffer, bandSignals[0], context.cachedFilters[0].lowpass, filterStates.lowpass[0], ch, parameters.blockSize);
                
                // Highpass branch for remaining bands
                applyFilterBlock(inputBuffer, hp1Buffer, context.cachedFilters[0].highpass, filterStates.highpass[0], ch, parameters.blockSize);
                
                // Band 1 (Low-Mid)
                applyFilterBlock(hp1Buffer, bandSignals[1], context.cachedFilters[1].lowpass, filterStates.lowpass[1], ch, parameters.blockSize);
                
                // Highpass for bands 2-4
                applyFilterBlock(hp1Buffer, hp2Buffer, context.cachedFilters[1].highpass, filterStates.highpass[1], ch, parameters.blockSize);
                
                // Band 2 (Mid)
                applyFilterBlock(hp2Buffer, bandSignals[2], context.cachedFilters[2].lowpass, filterStates.lowpass[2], ch, parameters.blockSize);
                
                // Highpass for bands 3-4
                applyFilterBlock(hp2Buffer, hp1Buffer, context.cachedFilters[2].highpass, filterStates.highpass[2], ch, parameters.blockSize); // Reuse hp1Buffer
                
                // Band 3 (High-Mid)
                applyFilterBlock(hp1Buffer, bandSignals[3], context.cachedFilters[3].lowpass, filterStates.lowpass[3], ch, parameters.blockSize);
                
                // Band 4 (High)
                applyFilterBlock(hp1Buffer, bandSignals[4], context.cachedFilters[3].highpass, filterStates.highpass[3], ch, parameters.blockSize);
            }

            // Apply balance and sum bands
            const balanceValues = parameters.bands.map(b => b.balance / 100); // Convert percentage to -1.0 to 1.0
            const outputBuffer = context.outputBuffer;
            outputBuffer.fill(0); // Clear output buffer
            
            // Process each channel
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                const bandSignals = context.bandSignals[ch];
                
                // Process each band with balance in blocks
                for (let band = 0; band < 5; band++) {
                    const balance = balanceValues[band];
                    const bandSignal = bandSignals[band];
                    
                    if (Math.abs(balance) < 1e-6) {
                        // Center position (balance = 0): no change
                        // Process in blocks with loop unrolling
                        const blockSizeMod4 = parameters.blockSize & ~3;
                        let i = 0;
                        
                        // Main loop with 4-sample unrolling
                        for (; i < blockSizeMod4; i += 4) {
                            outputBuffer[offset + i] += bandSignal[i];
                            outputBuffer[offset + i + 1] += bandSignal[i + 1];
                            outputBuffer[offset + i + 2] += bandSignal[i + 2];
                            outputBuffer[offset + i + 3] += bandSignal[i + 3];
                        }
                        
                        // Handle remaining samples
                        for (; i < parameters.blockSize; i++) {
                            outputBuffer[offset + i] += bandSignal[i];
                        }
                    } else {
                        // Apply balance
                        const leftGain = Math.max(0, 1 - balance);
                        const rightGain = Math.max(0, 1 + balance);
                        const gain = ch === 0 ? leftGain : rightGain;
                        
                        // Process in blocks with loop unrolling
                        const blockSizeMod4 = parameters.blockSize & ~3;
                        let i = 0;
                        
                        // Main loop with 4-sample unrolling
                        for (; i < blockSizeMod4; i += 4) {
                            outputBuffer[offset + i] += bandSignal[i] * gain;
                            outputBuffer[offset + i + 1] += bandSignal[i + 1] * gain;
                            outputBuffer[offset + i + 2] += bandSignal[i + 2] * gain;
                            outputBuffer[offset + i + 3] += bandSignal[i + 3] * gain;
                        }
                        
                        // Handle remaining samples
                        for (; i < parameters.blockSize; i++) {
                            outputBuffer[offset + i] += bandSignal[i] * gain;
                        }
                    }
                }
            }
            
            // Apply fade-in if needed and copy to result buffer
            if (context.fadeIn && context.fadeIn.counter < context.fadeIn.length) {
                for (let i = 0; i < outputBuffer.length; i++) {
                    const fadeGain = Math.min(1, context.fadeIn.counter++ / context.fadeIn.length);
                    result[i] = outputBuffer[i] * fadeGain;
                    if (context.fadeIn.counter >= context.fadeIn.length) break;
                }
            } else {
                // Copy output buffer to result
                result.set(outputBuffer);
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
