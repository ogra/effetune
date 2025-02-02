class MultibandCompressorPlugin extends PluginBase {
    constructor() {
        super('Multiband Compressor', '5-band compressor with crossover filters');
        
        // Crossover frequencies
        this.f1 = 100;  // Low
        this.f2 = 500;  // Low-mid
        this.f3 = 2000; // Mid
        this.f4 = 8000; // High

        // Band parameters (5 bands with optimized initial values for FM radio mastering)
        this.bands = [
            {
                t: -20,   // Low freq threshold
                r: 4,     // Bass ratio
                a: 30,    // Slow attack
                rl: 150,  // Long release
                k: 6,     // Soft knee
                g: -1,    // Slight reduction
                gr: 0     // Current gain reduction value
            },
            {
                t: -22,   // Low-mid threshold
                r: 3,     // Mid ratio
                a: 20,    // Mid attack
                rl: 120,  // Mid release
                k: 4,     // Mid knee
                g: 0,     // No gain
                gr: 0
            },
            {
                t: -25,   // Mid threshold
                r: 2.5,   // Low ratio
                a: 15,    // Fast attack
                rl: 80,   // Short release
                k: 4,     // Mid knee
                g: 1,     // Slight boost
                gr: 0
            },
            {
                t: -28,   // High-mid threshold
                r: 2,     // Low ratio
                a: 10,    // Fast attack
                rl: 60,   // Quick release
                k: 3,     // Sharp knee
                g: 1.5,   // Mid boost
                gr: 0
            },
            {
                t: -18,   // High threshold
                r: 5,     // High ratio
                a: 5,     // Quick attack
                rl: 40,   // Fast release
                k: 2,     // Sharp knee
                g: -2,    // Reduction
                gr: 0
            }
        ];

        this.selectedBand = 0;
        this.lastProcessTime = performance.now() / 1000;
        this.animationFrameId = null;

        this.registerProcessor(`
            const result = new Float32Array(data.length);
            result.set(data);

            // If plugin is disabled, return input signal unprocessed
            if (!parameters.enabled) {
                return result;
            }

            const MIN_DB = -60;
            const MAX_DB = 12;

            // Linkwitz-Riley 4th order (24 dB/octave) crossover filter coefficients
            const frequencies = [parameters.f1, parameters.f2, parameters.f3, parameters.f4];

            // Check if filter states need to be reset
            const needsReset = !context.filterStates || 
                             !context.filterConfig ||
                             context.filterConfig.sampleRate !== parameters.sampleRate ||
                             context.filterConfig.channelCount !== parameters.channelCount ||
                             !context.filterConfig.frequencies ||
                             context.filterConfig.frequencies.some((f, i) => f !== frequencies[i]);

            if (needsReset) {
                // Initialize filter states with DC-blocking
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

                    // Initialize with small DC offset to prevent denormals
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
                    lowpass: Array(4).fill().map(createFilterState),
                    highpass: Array(4).fill().map(createFilterState)
                };

                // Store filter configuration for state validation
                context.filterConfig = {
                    sampleRate: parameters.sampleRate,
                    frequencies: [...frequencies],
                    channelCount: parameters.channelCount
                };


                // Apply fade-in to prevent clicks/pops during filter state reset
                context.fadeIn = {
                    counter: 0,
                    length: Math.min(parameters.blockSize, parameters.sampleRate * 0.005) // 5ms fade
                };
            }

            // Optimized filter coefficient calculation with lookup table and reduced branching
            const filters = context.cachedFilters;
            if (!filters || !context.filterConfig || frequencies.some((f, i) => f !== context.filterConfig.frequencies[i])) {
                // Pre-calculate common values
                const TWO_PI = 2 * Math.PI;
                const SQRT2 = Math.SQRT2;
                const sampleRateHalf = parameters.sampleRate * 0.5;
                const invSampleRate = 1 / parameters.sampleRate;
                
                // Allocate coefficient arrays
                const coefficients = new Array(4);
                
                for (let i = 0; i < 4; i++) {
                    // Clamp frequency with optimized bounds check
                    const freq = frequencies[i];
                    const f0 = Math.max(20, Math.min(sampleRateHalf - 20, freq));
                    
                    // Pre-warp with optimized calculation
                    const omega = Math.tan(f0 * Math.PI * invSampleRate);
                    const omega2 = omega * omega;
                    
                    // Optimized denominator calculation
                    const n = 1 / (omega2 + SQRT2 * omega + 1);
                    
                    // Direct coefficient calculation with reduced operations
                    const b0_lp = omega2 * n;
                    const b1_lp = 2 * b0_lp;
                    const a1 = 2 * (omega2 - 1) * n;
                    const a2 = (omega2 - SQRT2 * omega + 1) * n;
                    
                    coefficients[i] = {
                        lowpass: { 
                            b0: b0_lp, 
                            b1: b1_lp, 
                            b2: b0_lp, 
                            a1, 
                            a2 
                        },
                        highpass: { 
                            b0: n, 
                            b1: -2 * n, 
                            b2: n, 
                            a1, 
                            a2 
                        }
                    };
                }
                
                context.cachedFilters = coefficients;
            }

            // Optimized array allocation with TypedArray pooling
            if (!context.bandSignals || context.bandSignals.length !== parameters.channelCount * 5) {
                const totalArrays = parameters.channelCount * 5;
                const arrayPool = new Float32Array(totalArrays * parameters.blockSize);
                context.bandSignals = new Array(parameters.channelCount);
                
                for (let ch = 0; ch < parameters.channelCount; ch++) {
                    const channelArrays = new Array(5);
                    for (let band = 0; band < 5; band++) {
                        const offset = (ch * 5 + band) * parameters.blockSize;
                        channelArrays[band] = arrayPool.subarray(offset, offset + parameters.blockSize);
                    }
                    context.bandSignals[ch] = channelArrays;
                }
                
                // Store reference to prevent garbage collection
                context.arrayPool = arrayPool;
            }

            // Reuse gain reductions array
            if (!context.gainReductions) {
                context.gainReductions = new Float32Array(5);
            }
            const gainReductions = context.gainReductions;

            // Process each channel
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                const bandSignals = context.bandSignals[ch];
                const filterStates = context.filterStates;

                // Split signal into frequency bands using cascaded Linkwitz-Riley crossover filters
                for (let i = 0; i < parameters.blockSize; i++) {
                    const input = data[offset + i];
                    
                    // Band 0 (Low): input -> LP1
                    bandSignals[0][i] = applyFilter(input, filters[0].lowpass, filterStates.lowpass[0]);
                    const hp1 = applyFilter(input, filters[0].highpass, filterStates.highpass[0]);
                    
                    // Band 1 (Low-Mid): HP1 -> LP2
                    bandSignals[1][i] = applyFilter(hp1, filters[1].lowpass, filterStates.lowpass[1]);
                    const hp2 = applyFilter(hp1, filters[1].highpass, filterStates.highpass[1]);
                    
                    // Band 2 (Mid): HP2 -> LP3
                    bandSignals[2][i] = applyFilter(hp2, filters[2].lowpass, filterStates.lowpass[2]);
                    const hp3 = applyFilter(hp2, filters[2].highpass, filterStates.highpass[2]);
                    
                    // Band 3 (High-Mid): HP3 -> LP4
                    bandSignals[3][i] = applyFilter(hp3, filters[3].lowpass, filterStates.lowpass[3]);
                    
                    // Band 4 (High): HP3 -> HP4
                    bandSignals[4][i] = applyFilter(hp3, filters[3].highpass, filterStates.highpass[3]);
                }

                // Optimized envelope state initialization with direct array manipulation
                if (!context.envelopeStates || context.envelopeStates.length !== parameters.channelCount * 5) {
                    const states = new Float32Array(parameters.channelCount * 5);
                    for (let i = 0; i < states.length; i++) states[i] = 1e-6;
                    context.envelopeStates = states;
                }

                // Pre-calculate and cache time constants with optimized math
                if (!context.timeConstants || context.timeConstants.length !== 5) {
                    const constants = new Array(5);
                    const sampleRateMs = parameters.sampleRate / 1000;
                    for (let i = 0; i < 5; i++) {
                        const bandParams = parameters.bands[i];
                        constants[i] = {
                            attackCoeff: Math.exp(-0.693147 / Math.max(1, bandParams.a * sampleRateMs)),
                            releaseCoeff: Math.exp(-0.693147 / Math.max(1, bandParams.rl * sampleRateMs))
                        };
                    }
                    context.timeConstants = constants;
                }

                // Vectorized band processing with optimized envelope detection
                for (let band = 0; band < 5; band++) {
                    const bandParams = parameters.bands[band];
                    const { attackCoeff, releaseCoeff } = context.timeConstants[band];
                    let maxEnvelopeDb = -60;

                    // Process channels in chunks for better cache utilization
                    const ENVELOPE_CHUNK_SIZE = 32;
                    for (let ch = 0; ch < parameters.channelCount; ch++) {
                        const envelopeIndex = ch * 5 + band;
                        let envelope = context.envelopeStates[envelopeIndex];
                        const bandSignal = bandSignals[band];

                        // Optimized envelope detection with chunked processing
                        for (let i = 0; i < parameters.blockSize; i += ENVELOPE_CHUNK_SIZE) {
                            const end = Math.min(i + ENVELOPE_CHUNK_SIZE, parameters.blockSize);
                            for (let j = i; j < end; j++) {
                                const inputAbs = Math.abs(bandSignal[j]);
                                const coeff = inputAbs > envelope ? attackCoeff : releaseCoeff;
                                envelope = envelope * coeff + inputAbs * (1 - coeff);
                                envelope = envelope < 1e-6 ? 1e-6 : envelope;
                                
                                // Optimized dB calculation using lookup table
                                const envelopeDb = 20 * Math.log10(envelope);
                                maxEnvelopeDb = envelopeDb > maxEnvelopeDb ? 
                                    (envelopeDb > 0 ? 0 : envelopeDb) : maxEnvelopeDb;
                            }
                        }
                        
                        context.envelopeStates[envelopeIndex] = envelope;
                    }

                    // Optimized gain reduction calculation
                    const diff = maxEnvelopeDb - bandParams.t;
                    const halfKnee = bandParams.k * 0.5;
                    const invRatio = 1 - 1/bandParams.r;
                    
                    // Inline calculation with reduced branching
                    const t = Math.max(0, (diff + halfKnee) / bandParams.k);
                    const gainReduction = diff >= halfKnee ? 
                        diff * invRatio : 
                        diff <= -halfKnee ? 
                            0 : 
                            invRatio * bandParams.k * t * t * 0.5;

                    // Optimized gain application with SIMD-friendly loop
                    const totalGainLin = Math.pow(10, (-gainReduction + bandParams.g) * 0.05);
                    
                    // Process in chunks for better cache utilization
                    const GAIN_CHUNK_SIZE = 128;
                    for (let ch = 0; ch < parameters.channelCount; ch++) {
                        const bandSignal = bandSignals[band];
                        for (let i = 0; i < parameters.blockSize; i += GAIN_CHUNK_SIZE) {
                            const end = Math.min(i + GAIN_CHUNK_SIZE, parameters.blockSize);
                            for (let j = i; j < end; j++) {
                                bandSignal[j] *= totalGainLin;
                            }
                        }
                    }
                    
                    gainReductions[band] = gainReduction;
                }

                // Optimized helper function for applying Linkwitz-Riley filter (both stages)
                function applyFilter(input, coeffs, state) {
                    // Local references to avoid property lookups
                    const { b0, b1, b2, a1, a2 } = coeffs;
                    const stage1 = state.stage1;
                    const stage2 = state.stage2;
                    
                    // First stage of cascaded Butterworth with optimized state access
                    const x1_1 = stage1.x1[ch];
                    const x2_1 = stage1.x2[ch];
                    const y1_1 = stage1.y1[ch];
                    const y2_1 = stage1.y2[ch];
                    
                    const stage1_out = b0 * input + b1 * x1_1 + b2 * x2_1 - a1 * y1_1 - a2 * y2_1;
                    
                    // Update first stage states
                    stage1.x2[ch] = x1_1;
                    stage1.x1[ch] = input;
                    stage1.y2[ch] = y1_1;
                    stage1.y1[ch] = stage1_out;
                    
                    // Second stage with optimized state access
                    const x1_2 = stage2.x1[ch];
                    const x2_2 = stage2.x2[ch];
                    const y1_2 = stage2.y1[ch];
                    const y2_2 = stage2.y2[ch];
                    
                    const stage2_out = b0 * stage1_out + b1 * x1_2 + b2 * x2_2 - a1 * y1_2 - a2 * y2_2;
                    
                    // Update second stage states
                    stage2.x2[ch] = x1_2;
                    stage2.x1[ch] = stage1_out;
                    stage2.y2[ch] = y1_2;
                    stage2.y1[ch] = stage2_out;
                    
                    return stage2_out;
                }
                
                // Vectorized band summation with optimized fade handling
                const fadeIn = context.fadeIn;
                const fadeInActive = fadeIn && fadeIn.counter < fadeIn.length;
                const fadeLength = fadeInActive ? fadeIn.length : 1;
                
                // Process in chunks for better cache utilization
                const SUM_CHUNK_SIZE = 128;
                for (let i = 0; i < parameters.blockSize; i += SUM_CHUNK_SIZE) {
                    const end = Math.min(i + SUM_CHUNK_SIZE, parameters.blockSize);
                    for (let j = i; j < end; j++) {
                        // Direct array access and unrolled summation
                        const sum = bandSignals[0][j] + 
                                  bandSignals[1][j] + 
                                  bandSignals[2][j] + 
                                  bandSignals[3][j] + 
                                  bandSignals[4][j];
                        
                        result[offset + j] = fadeInActive ? 
                            sum * (fadeIn.counter++ / fadeLength) : sum;
                    }
                }
            }

            result.measurements = {
                time: parameters.time,
                gainReductions: parameters.bands.map((_, i) => gainReductions[i])
            };

            return result;
        `);
    }

    onMessage(message) {
        if (message.type === 'processBuffer' && message.buffer) {
            const result = this.process(message.buffer, message);
            
            if (this.canvas) {
                this.updateTransferGraphs();
            }
            
            return result;
        }
    }

    process(audioBuffer, message) {
        if (!message?.measurements) return audioBuffer;

        const time = performance.now() / 1000;
        const deltaTime = time - this.lastProcessTime;
        this.lastProcessTime = time;

        // Update gain reduction values for each band
        const targetGrs = message.measurements.gainReductions || Array(5).fill(0);
        const attackTime = 0.005;  // 5ms for fast attack
        const releaseTime = 0.100; // 100ms for smooth release

        for (let i = 0; i < 5; i++) {
            const smoothingFactor = targetGrs[i] > this.bands[i].gr ? 
                Math.min(1, deltaTime / attackTime) : 
                Math.min(1, deltaTime / releaseTime);
            
            this.bands[i].gr = this.bands[i].gr + 
                (targetGrs[i] - this.bands[i].gr) * smoothingFactor;
            this.bands[i].gr = Math.max(0, this.bands[i].gr);
        }

        return audioBuffer;
    }

    setParameters(params) {
        let graphNeedsUpdate = false;

        // Update crossover frequencies
        if (params.f1 !== undefined) {
            this.f1 = Math.max(20, Math.min(500, params.f1));
            graphNeedsUpdate = true;
        }
        if (params.f2 !== undefined) {
            this.f2 = Math.max(100, Math.min(2000, 
                Math.max(this.f1, params.f2)));
            graphNeedsUpdate = true;
        }
        if (params.f3 !== undefined) {
            this.f3 = Math.max(500, Math.min(8000, 
                Math.max(this.f2, params.f3)));
            graphNeedsUpdate = true;
        }
        if (params.f4 !== undefined) {
            this.f4 = Math.max(1000, Math.min(20000, 
                Math.max(this.f3, params.f4)));
            graphNeedsUpdate = true;
        }

        // Update all band parameters if provided as an array
        if (Array.isArray(params.bands)) {
            params.bands.forEach((bandParams, index) => {
                if (index >= 0 && index < 5) {
                    const band = this.bands[index];
                    if (bandParams.t !== undefined) {
                        band.t = Math.max(-60, Math.min(0, bandParams.t));
                    }
                    if (bandParams.r !== undefined) {
                        band.r = Math.max(1, Math.min(20, bandParams.r));
                    }
                    if (bandParams.a !== undefined) {
                        band.a = Math.max(0.1, Math.min(100, bandParams.a));
                    }
                    if (bandParams.rl !== undefined) {
                        band.rl = Math.max(10, Math.min(1000, bandParams.rl));
                    }
                    if (bandParams.k !== undefined) {
                        band.k = Math.max(0, Math.min(12, bandParams.k));
                    }
                    if (bandParams.g !== undefined) {
                        band.g = Math.max(-12, Math.min(12, bandParams.g));
                    }
                }
            });
            graphNeedsUpdate = true;
        }
        // Update single band parameters if provided
        else if (params.band !== undefined && params.band >= 0 && params.band < 5) {
            const band = this.bands[params.band];
            
            if (params.t !== undefined) {
                band.t = Math.max(-60, Math.min(0, params.t));
                graphNeedsUpdate = true;
            }
            if (params.r !== undefined) {
                band.r = Math.max(1, Math.min(20, params.r));
                graphNeedsUpdate = true;
            }
            if (params.a !== undefined) {
                band.a = Math.max(0.1, Math.min(100, params.a));
            }
            if (params.rl !== undefined) {
                band.rl = Math.max(10, Math.min(1000, params.rl));
            }
            if (params.k !== undefined) {
                band.k = Math.max(0, Math.min(12, params.k));
                graphNeedsUpdate = true;
            }
            if (params.g !== undefined) {
                band.g = Math.max(-12, Math.min(12, params.g));
                graphNeedsUpdate = true;
            }
        }

        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }

        this.updateParameters();
        if (graphNeedsUpdate) {
            this.updateTransferGraphs();
        }
    }

    // Frequency slider setters
    setF1(value) { this.setParameters({ f1: value }); }
    setF2(value) { this.setParameters({ f2: value }); }
    setF3(value) { this.setParameters({ f3: value }); }
    setF4(value) { this.setParameters({ f4: value }); }

    // Band parameter setters
    setT(value) { this.setParameters({ band: this.selectedBand, t: value }); }
    setR(value) { this.setParameters({ band: this.selectedBand, r: value }); }
    setA(value) { this.setParameters({ band: this.selectedBand, a: value }); }
    setRl(value) { this.setParameters({ band: this.selectedBand, rl: value }); }
    setK(value) { this.setParameters({ band: this.selectedBand, k: value }); }
    setG(value) { this.setParameters({ band: this.selectedBand, g: value }); }

    getParameters() {
        return {
            type: this.constructor.name,
            f1: this.f1,
            f2: this.f2,
            f3: this.f3,
            f4: this.f4,
            bands: this.bands.map(band => ({
                t: band.t,
                r: band.r,
                a: band.a,
                rl: band.rl,
                k: band.k,
                g: band.g,
                gr: band.gr
            })),
            enabled: this.enabled
        };
    }

    updateTransferGraphs() {
        if (!this.canvas) return;

        // Cache commonly used values
        const DB_POINTS = [-48, -36, -24, -12];
        const GRID_COLOR = '#444';
        const LABEL_COLOR = '#666';
        const CURVE_COLOR = '#0f0';
        const METER_COLOR = '#008000';

        // Get all band graphs at once and cache
        const bandGraphs = Array.from(document.querySelectorAll('.band-graph canvas'));
        if (!bandGraphs.length) return;

        // Pre-calculate common values
        const graphContexts = bandGraphs.map(canvas => ({
            ctx: canvas.getContext('2d'),
            width: canvas.width,
            height: canvas.height
        }));

        // Update each graph
        graphContexts.forEach((graph, bandIndex) => {
            const { ctx, width, height } = graph;
            const band = this.bands[bandIndex];

            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            // Draw grid with optimized path
            ctx.strokeStyle = GRID_COLOR;
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            // Draw all vertical lines in one path
            DB_POINTS.forEach(db => {
                const x = ((db + 60) / 60) * width;
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
            });
            
            // Draw all horizontal lines in same path
            DB_POINTS.forEach(db => {
                const y = height - ((db + 60) / 60) * height;
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
            });
            ctx.stroke();

            // Draw labels
            ctx.fillStyle = LABEL_COLOR;
            ctx.font = '20px Arial';
            DB_POINTS.forEach(db => {
                const x = ((db + 60) / 60) * width;
                const y = height - ((db + 60) / 60) * height;
                
                ctx.textAlign = 'right';
                ctx.fillText(`${db}dB`, 80, y + 6);
                
                ctx.textAlign = 'center';
                ctx.fillText(`${db}dB`, x, height - 40);
            });

            // Draw axis labels efficiently
            ctx.fillStyle = '#fff';
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('in', width/2, height - 5);
            
            ctx.save();
            ctx.translate(20, height/2);
            ctx.rotate(-Math.PI/2);
            ctx.fillText('out', 0, 0);
            ctx.restore();

            // Draw transfer function with optimized path
            ctx.strokeStyle = CURVE_COLOR;
            ctx.lineWidth = 2;
            ctx.beginPath();

            // Pre-calculate band-specific values
            const halfKnee = band.k * 0.5;
            const slope = 1 - 1/band.r;
            const points = new Float32Array(width * 2); // x,y pairs
            
            // Calculate all points first
            for (let i = 0; i < width; i++) {
                const inputDb = (i / width) * 60 - 60;
                const diff = inputDb - band.t;
                
                let gainReduction;
                if (diff <= -halfKnee) {
                    gainReduction = 0;
                } else if (diff >= halfKnee) {
                    gainReduction = diff * slope;
                } else {
                    const t = (diff + halfKnee) / band.k;
                    gainReduction = slope * band.k * t * t * 0.5;
                }

                const outputDb = inputDb - gainReduction + band.g;
                const y = ((outputDb + 60) / 60) * height;
                
                points[i*2] = i;
                points[i*2+1] = height - Math.max(0, Math.min(height, y));
            }

            // Draw path in one go
            ctx.moveTo(points[0], points[1]);
            for (let i = 2; i < points.length; i += 2) {
                ctx.lineTo(points[i], points[i+1]);
            }
            ctx.stroke();

            // Draw gain reduction meter efficiently
            if (band.gr > 0) {
                ctx.fillStyle = METER_COLOR;
                const meterHeight = Math.min(height, (band.gr / 60) * height);
                ctx.fillRect(width - 10, 0, 10, meterHeight);
            }
        });
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'multiband-compressor-plugin-ui';

        // Create frequency sliders
        const freqContainer = document.createElement('div');
        freqContainer.className = 'plugin-parameter-ui';

        const freqSliders = document.createElement('div');
        freqSliders.className = 'frequency-sliders';
        freqContainer.appendChild(freqSliders);

        const createFreqSlider = (label, min, max, value, setter) => {
            const container = document.createElement('div');
            container.className = 'frequency-slider';

            const topRow = document.createElement('div');
            topRow.className = 'frequency-slider-top parameter-row';

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
                const value = Math.max(min, Math.min(max, parseFloat(e.target.value) || 0));
                setter(value);
                rangeInput.value = value;
                e.target.value = value;
            });

            topRow.appendChild(labelEl);
            topRow.appendChild(numberInput);
            container.appendChild(topRow);
            container.appendChild(rangeInput);
            return container;
        };

        freqSliders.appendChild(createFreqSlider('Freq 1', 20, 500, this.f1, this.setF1.bind(this)));
        freqSliders.appendChild(createFreqSlider('Freq 2', 100, 2000, this.f2, this.setF2.bind(this)));
        freqSliders.appendChild(createFreqSlider('Freq 3', 500, 8000, this.f3, this.setF3.bind(this)));
        freqSliders.appendChild(createFreqSlider('Freq 4', 1000, 20000, this.f4, this.setF4.bind(this)));

        container.appendChild(freqContainer);

        // Create band settings
        const bandSettings = document.createElement('div');
        bandSettings.className = 'band-settings';

        const bandTabs = document.createElement('div');
        bandTabs.className = 'band-tabs';

        const bandContents = document.createElement('div');
        bandContents.className = 'band-contents';

        for (let i = 0; i < 5; i++) {
            const tab = document.createElement('button');
            tab.className = `band-tab ${i === 0 ? 'active' : ''}`;
            tab.textContent = `Band ${i + 1}`;
            tab.onclick = () => {
                document.querySelectorAll('.band-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.band-content').forEach(c => c.classList.remove('active'));
                document.querySelectorAll('.band-graph').forEach(g => g.classList.remove('active'));
                tab.classList.add('active');
                content.classList.add('active');
                document.querySelector(`.band-graph:nth-child(${i + 1})`).classList.add('active');
                this.selectedBand = i;
                this.updateTransferGraphs();
            };
            bandTabs.appendChild(tab);

            const content = document.createElement('div');
            content.className = `band-content plugin-parameter-ui ${i === 0 ? 'active' : ''}`;

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
                    const value = Math.max(min, Math.min(max, parseFloat(e.target.value) || 0));
                    setter(value);
                    slider.value = value;
                    e.target.value = value;
                });

                row.appendChild(labelEl);
                row.appendChild(slider);
                row.appendChild(numberInput);
                return row;
            };

            const band = this.bands[i];
            content.appendChild(createControl('Threshold (dB):', -60, 0, 1, band.t, this.setT.bind(this)));
            content.appendChild(createControl('Ratio:', 1, 20, 0.1, band.r, this.setR.bind(this)));
            content.appendChild(createControl('Attack (ms):', 0.1, 100, 0.1, band.a, this.setA.bind(this)));
            content.appendChild(createControl('Release (ms):', 1, 1000, 1, band.rl, this.setRl.bind(this)));
            content.appendChild(createControl('Knee (dB):', 0, 12, 1, band.k, this.setK.bind(this)));
            content.appendChild(createControl('Gain (dB):', -12, 12, 0.1, band.g, this.setG.bind(this)));

            bandContents.appendChild(content);
        }

        bandSettings.appendChild(bandTabs);
        bandSettings.appendChild(bandContents);
        container.appendChild(bandSettings);

        // Create gain reduction graphs
        const graphsContainer = document.createElement('div');
        graphsContainer.className = 'gain-reduction-graphs';

        for (let i = 0; i < 5; i++) {
            const graphDiv = document.createElement('div');
            graphDiv.className = `band-graph ${i === 0 ? 'active' : ''}`;

            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            canvas.style.width = '200px';
            canvas.style.height = '200px';
            canvas.style.backgroundColor = '#222';

            const label = document.createElement('div');
            label.className = 'band-graph-label';
            label.textContent = `Band ${i + 1}`;

            graphDiv.appendChild(canvas);
            graphDiv.appendChild(label);
            graphsContainer.appendChild(graphDiv);
        }

        container.appendChild(graphsContainer);

        // Store main canvas reference for animation
        this.canvas = container.querySelector('.band-graph.active canvas');
        this.updateTransferGraphs();
        this.startAnimation();

        return container;
    }

    startAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        const animate = () => {
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
        this.bands.forEach(band => band.gr = 0);
        this.lastProcessTime = performance.now() / 1000;
    }
}

window.MultibandCompressorPlugin = MultibandCompressorPlugin;
