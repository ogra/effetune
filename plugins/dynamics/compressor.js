class CompressorPlugin extends PluginBase {
    constructor() {
        super('Compressor', 'Dynamic range compression with threshold, ratio, and knee control');

        this.th = -24;  // th: Threshold (-60 to 0 dB)
        this.rt = 2;    // rt: Ratio (1:1 to 20:1)
        this.at = 10;   // at: Attack Time (0.1 to 100 ms)
        this.rl = 100;  // rl: Release Time (10 to 1000 ms)
        this.kn = 3;    // kn: Knee (0 to 12 dB)
        this.gn = 0;    // gn: Gain (-12 to +12 dB)
        this.gr = 0;    // gr: Current gain reduction value
        this.enabled = true; // Plugin is enabled by default
        this.lastProcessTime = performance.now() / 1000;
        this.animationFrameId = null;
        this._hasMessageHandler = false;

        this._setupMessageHandler();

        this.registerProcessor(this.getProcessorCode());
    }

    // Returns the processor code string with optimized processing
    getProcessorCode() {
        return `
            // If compression is disabled, return the input immediately without processing
            if (!parameters.enabled) {
                const result = new Float32Array(data.length);
                result.set(data);
                result.measurements = {
                    time: parameters.time,
                    gainReduction: 0
                };
                return result;
            }

            const result = new Float32Array(data.length);

            // Constants for envelope and dB limits
            const MIN_ENVELOPE = 1e-6;
            const MIN_DB = -60;
            const MAX_DB = 0;
            const LOG10_20 = 8.685889638065035; // 20/ln(10)
            const GAIN_FACTOR = 0.11512925464970229; // ln(10)/20

            // Cache frequently used parameters
            const th = parameters.th;
            const rt = parameters.rt;
            const kn = parameters.kn;
            const gn = parameters.gn;
            const blockSize = parameters.blockSize;
            const channelCount = parameters.channelCount;
            const halfKnee = kn * 0.5;
            const invRatio = 1 - 1 / rt;

            // Calculate filter coefficients for attack and release
            const attackSamples = Math.max(1, (parameters.at * parameters.sampleRate) / 1000);
            const releaseSamples = Math.max(1, (parameters.rl * parameters.sampleRate) / 1000);
            const attackCoeff = Math.exp(-Math.LN2 / attackSamples);
            const releaseCoeff = Math.exp(-Math.LN2 / releaseSamples);

            // Initialize envelope state if needed
            if (!context.envelopeStates || context.envelopeStates.length !== channelCount) {
                context.envelopeStates = new Float32Array(channelCount).fill(MIN_ENVELOPE);
            }

            // Create or reuse lookup tables for expensive math operations
            if (!context.dbLookup) {
                // Create lookup table for LOG10_20 * Math.log(x) operation
                const DB_LOOKUP_SIZE = 4096;
                const DB_LOOKUP_SCALE = DB_LOOKUP_SIZE / 10; // 0 to 10 range
                context.dbLookup = new Float32Array(DB_LOOKUP_SIZE);
                for (let i = 0; i < DB_LOOKUP_SIZE; i++) {
                    const x = i / DB_LOOKUP_SCALE;
                    if (x < 1e-6) {
                        context.dbLookup[i] = -120; // Minimum dB value
                    } else {
                        context.dbLookup[i] = LOG10_20 * Math.log(x);
                    }
                }
                
                // Create lookup table for Math.pow(10, -x/20) operation
                const EXP_LOOKUP_SIZE = 2048;
                const EXP_LOOKUP_SCALE = EXP_LOOKUP_SIZE / 60; // 0 to 60 dB range
                context.expLookup = new Float32Array(EXP_LOOKUP_SIZE);
                for (let i = 0; i < EXP_LOOKUP_SIZE; i++) {
                    const x = i / EXP_LOOKUP_SCALE;
                    context.expLookup[i] = Math.exp(-x * GAIN_FACTOR);
                }
                
                // Store constants for faster access
                context.DB_LOOKUP_SIZE = DB_LOOKUP_SIZE;
                context.DB_LOOKUP_SCALE = DB_LOOKUP_SCALE;
                context.EXP_LOOKUP_SIZE = EXP_LOOKUP_SIZE;
                context.EXP_LOOKUP_SCALE = EXP_LOOKUP_SCALE;
            }
            
            // Fast approximation functions using lookup tables
            function fastDb(x) {
                // Fast dB conversion using lookup table
                if (x <= 0) return -120;
                // Scale and clamp to lookup table range
                const idx = Math.min(context.dbLookup.length - 1, Math.floor(x * context.DB_LOOKUP_SCALE));
                return context.dbLookup[idx];
            }
            
            function fastExp(x) {
                // Fast exponential using lookup table
                if (x <= 0) return 1;
                if (x >= 60) return context.expLookup[context.expLookup.length - 1];
                // Scale and clamp to lookup table range
                const idx = Math.min(context.expLookup.length - 1, Math.floor(x * context.EXP_LOOKUP_SCALE));
                return context.expLookup[idx];
            }

            // Create or reuse work buffer for envelope calculations
            if (!context.workBuffer || context.workBuffer.length !== blockSize) {
                context.workBuffer = new Float32Array(blockSize);
            }
            const workBuffer = context.workBuffer;

            let maxGainReduction = 0; // For measurement over the entire block

            // Process each channel with block processing for better cache locality
            for (let ch = 0; ch < channelCount; ch++) {
                const offset = ch * blockSize;
                let envelope = context.envelopeStates[ch];
                
                // First pass: calculate envelope values for the entire block
                for (let i = 0; i < blockSize; i++) {
                    const input = data[offset + i];
                    const inputAbs = Math.abs(input);
                    const coeff = inputAbs > envelope ? attackCoeff : releaseCoeff;
                    envelope = Math.max(MIN_ENVELOPE, envelope * coeff + inputAbs * (1 - coeff));
                    workBuffer[i] = envelope;
                }
                
                // Store updated envelope state
                context.envelopeStates[ch] = envelope;
                
                // Calculate maximum envelope value to optimize processing
                let maxEnvelope = MIN_ENVELOPE;
                for (let i = 0; i < blockSize; i++) {
                    if (workBuffer[i] > maxEnvelope) maxEnvelope = workBuffer[i];
                }
                
                // Convert max envelope to dB
                const maxEnvelopeDb = fastDb(maxEnvelope);
                const maxDiff = maxEnvelopeDb - th;
                
                // If max envelope is below threshold - knee/2, we can skip per-sample gain calculation
                if (maxDiff <= -halfKnee) {
                    // No compression needed, just copy input to output
                    for (let i = 0; i < blockSize; i++) {
                        result[offset + i] = data[offset + i];
                    }
                    continue;
                }
                
                // Second pass: apply gain reduction with loop unrolling for better performance
                const blockSizeMod4 = blockSize & ~3; // Fast way to calculate blockSize - (blockSize % 4)
                let i = 0;
                
                // Process 4 samples at a time
                for (; i < blockSizeMod4; i += 4) {
                    // Sample 1
                    let envelopeDb = fastDb(workBuffer[i]);
                    let diff = envelopeDb - th;
                    let gainReduction = 0;
                    
                    if (diff <= -halfKnee) {
                        gainReduction = 0;
                    } else if (diff >= halfKnee) {
                        gainReduction = diff * invRatio;
                    } else {
                        const t = (diff + halfKnee) / kn;
                        gainReduction = invRatio * kn * t * t * 0.5;
                    }
                    
                    maxGainReduction = Math.max(maxGainReduction, gainReduction);
                    
                    let sampleGain = 1;
                    if (gainReduction > 0) {
                        sampleGain = fastExp(gainReduction) * fastExp(-gn);
                    }
                    result[offset + i] = data[offset + i] * sampleGain;
                    
                    // Sample 2
                    envelopeDb = fastDb(workBuffer[i+1]);
                    diff = envelopeDb - th;
                    gainReduction = 0;
                    
                    if (diff <= -halfKnee) {
                        gainReduction = 0;
                    } else if (diff >= halfKnee) {
                        gainReduction = diff * invRatio;
                    } else {
                        const t = (diff + halfKnee) / kn;
                        gainReduction = invRatio * kn * t * t * 0.5;
                    }
                    
                    maxGainReduction = Math.max(maxGainReduction, gainReduction);
                    
                    sampleGain = 1;
                    if (gainReduction > 0) {
                        sampleGain = fastExp(gainReduction) * fastExp(-gn);
                    }
                    result[offset + i+1] = data[offset + i+1] * sampleGain;
                    
                    // Sample 3
                    envelopeDb = fastDb(workBuffer[i+2]);
                    diff = envelopeDb - th;
                    gainReduction = 0;
                    
                    if (diff <= -halfKnee) {
                        gainReduction = 0;
                    } else if (diff >= halfKnee) {
                        gainReduction = diff * invRatio;
                    } else {
                        const t = (diff + halfKnee) / kn;
                        gainReduction = invRatio * kn * t * t * 0.5;
                    }
                    
                    maxGainReduction = Math.max(maxGainReduction, gainReduction);
                    
                    sampleGain = 1;
                    if (gainReduction > 0) {
                        sampleGain = fastExp(gainReduction) * fastExp(-gn);
                    }
                    result[offset + i+2] = data[offset + i+2] * sampleGain;
                    
                    // Sample 4
                    envelopeDb = fastDb(workBuffer[i+3]);
                    diff = envelopeDb - th;
                    gainReduction = 0;
                    
                    if (diff <= -halfKnee) {
                        gainReduction = 0;
                    } else if (diff >= halfKnee) {
                        gainReduction = diff * invRatio;
                    } else {
                        const t = (diff + halfKnee) / kn;
                        gainReduction = invRatio * kn * t * t * 0.5;
                    }
                    
                    maxGainReduction = Math.max(maxGainReduction, gainReduction);
                    
                    sampleGain = 1;
                    if (gainReduction > 0) {
                        sampleGain = fastExp(gainReduction) * fastExp(-gn);
                    }
                    result[offset + i+3] = data[offset + i+3] * sampleGain;
                }
                
                // Handle remaining samples
                for (; i < blockSize; i++) {
                    const envelopeDb = fastDb(workBuffer[i]);
                    const diff = envelopeDb - th;
                    let gainReduction = 0;
                    
                    if (diff <= -halfKnee) {
                        gainReduction = 0;
                    } else if (diff >= halfKnee) {
                        gainReduction = diff * invRatio;
                    } else {
                        const t = (diff + halfKnee) / kn;
                        gainReduction = invRatio * kn * t * t * 0.5;
                    }
                    
                    maxGainReduction = Math.max(maxGainReduction, gainReduction);
                    
                    let sampleGain = 1;
                    if (gainReduction > 0) {
                        sampleGain = fastExp(gainReduction) * fastExp(-gn);
                    }
                    result[offset + i] = data[offset + i] * sampleGain;
                }
            }

            result.measurements = {
                time: parameters.time,
                gainReduction: maxGainReduction
            };

            return result;
        `;
    }

    onMessage(message) {
        if (message.type === 'processBuffer' && message.buffer) {
            const result = this.process(message.buffer, message);
            if (this.canvas) {
                this.updateTransferGraph();
                this.updateReductionMeter();
            }
            return result;
        }
    }

    process(audioBuffer, message) {
        if (!message?.measurements) return audioBuffer;

        // Use cached time constants for better performance
        if (!this._timeConstants) {
            this._timeConstants = {
                attackTime: 0.005,  // 5ms for fast attack
                releaseTime: 0.100  // 100ms for smooth release
            };
        }
        
        const time = performance.now() / 1000;
        const deltaTime = time - this.lastProcessTime;
        this.lastProcessTime = time;

        const targetGr = message.measurements.gainReduction || 0;
        const { attackTime, releaseTime } = this._timeConstants;
        
        // Fast path: if gain reduction is very small, skip processing
        if (Math.abs(targetGr) < 0.01 && Math.abs(this.gr) < 0.01) {
            this.gr = 0;
            return audioBuffer;
        }
        
        // Optimized smoothing calculation
        const smoothingFactor = targetGr > this.gr ?
            Math.min(1, deltaTime / attackTime) :
            Math.min(1, deltaTime / releaseTime);

        this.gr += (targetGr - this.gr) * smoothingFactor;
        this.gr = Math.max(0, this.gr);

        return audioBuffer;
    }

    setParameters(params) {
        let graphNeedsUpdate = false;
        if (params.th !== undefined) {
            this.th = Math.max(-60, Math.min(0, params.th));
            graphNeedsUpdate = true;
        }
        if (params.rt !== undefined) {
            this.rt = Math.max(1, Math.min(20, params.rt));
            graphNeedsUpdate = true;
        }
        if (params.at !== undefined) {
            this.at = Math.max(0.1, Math.min(100, params.at));
        }
        if (params.rl !== undefined) {
            this.rl = Math.max(10, Math.min(1000, params.rl));
        }
        if (params.kn !== undefined) {
            this.kn = Math.max(0, Math.min(12, params.kn));
            graphNeedsUpdate = true;
        }
        if (params.gn !== undefined) {
            this.gn = Math.max(-12, Math.min(12, params.gn));
            graphNeedsUpdate = true;
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }

        this.updateParameters();
        if (graphNeedsUpdate && this.canvas) {
            this.updateTransferGraph();
        }
    }

    setTh(value) { this.setParameters({ th: value }); }
    setRt(value) { this.setParameters({ rt: value }); }
    setAt(value) { this.setParameters({ at: value }); }
    setRl(value) { this.setParameters({ rl: value }); }
    setKn(value) { this.setParameters({ kn: value }); }
    setGn(value) { this.setParameters({ gn: value }); }

    getParameters() {
        return {
            type: this.constructor.name,
            th: this.th,
            rt: this.rt,
            at: this.at,
            rl: this.rl,
            kn: this.kn,
            gn: this.gn,
            enabled: this.enabled
        };
    }

    updateTransferGraph() {
        const canvas = this.canvas;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Draw grid and labels at dB positions
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#666';
        ctx.font = '20px Arial';

        [-48, -36, -24, -12].forEach(db => {
            const x = ((db + 60) / 60) * width;
            const y = height - ((db + 60) / 60) * height;

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            ctx.textAlign = 'right';
            ctx.fillText(`${db}dB`, 80, y + 6);

            ctx.textAlign = 'center';
            ctx.fillText(`${db}dB`, x, height - 40);
        });

        // Draw transfer function
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const thresholdDb = this.th;
        const ratio = this.rt;
        const kneeDb = this.kn;
        const gainDb = this.gn;

        for (let i = 0; i < width; i++) {
            const inputDb = (i / width) * 60 - 60;
            const diff = inputDb - thresholdDb;
            let gainReduction = 0;
            if (diff <= -kneeDb / 2) {
                gainReduction = 0;
            } else if (diff >= kneeDb / 2) {
                gainReduction = diff * (1 - 1 / ratio);
            } else {
                const t = (diff + kneeDb / 2) / kneeDb;
                const slope = (1 - 1 / ratio);
                gainReduction = slope * kneeDb * t * t / 2;
            }
            const outputDb = inputDb - gainReduction + gainDb;
            const x = i;
            const y = ((outputDb + 60) / 60) * height;
            const clampedY = Math.max(0, Math.min(height, y));
            if (i === 0) {
                ctx.moveTo(x, height - clampedY);
            } else {
                ctx.lineTo(x, height - clampedY);
            }
        }
        ctx.stroke();

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
    }

    updateReductionMeter() {
        const canvas = this.canvas;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.save();

        const meterX = width - 32;
        const meterWidth = 32;
        ctx.beginPath();
        ctx.rect(meterX, 0, meterWidth, height);
        ctx.clip();

        ctx.fillStyle = '#222';
        ctx.fillRect(meterX, 0, meterWidth, height);

        const reductionHeight = Math.min(height, (this.gr / 60) * height);
        if (reductionHeight > 0) {
            ctx.fillStyle = '#008000';
            ctx.fillRect(meterX, 0, meterWidth, reductionHeight);
        }

        ctx.restore();
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'compressor-plugin-ui plugin-parameter-ui';

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

        container.appendChild(createControl('Threshold (dB):', -60, 0, 1, this.th, this.setTh.bind(this)));
        container.appendChild(createControl('Ratio:', 1, 20, 0.1, this.rt, this.setRt.bind(this)));
        container.appendChild(createControl('Attack (ms):', 0.1, 100, 0.1, this.at, this.setAt.bind(this)));
        container.appendChild(createControl('Release (ms):', 1, 1000, 1, this.rl, this.setRl.bind(this)));
        container.appendChild(createControl('Knee (dB):', 0, 12, 1, this.kn, this.setKn.bind(this)));
        container.appendChild(createControl('Gain (dB):', -12, 12, 0.1, this.gn, this.setGn.bind(this)));

        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        canvas.style.width = '200px';
        canvas.style.height = '200px';
        canvas.style.backgroundColor = '#222';
        this.canvas = canvas;

        const graphContainer = document.createElement('div');
        graphContainer.style.position = 'relative';
        graphContainer.appendChild(canvas);
        container.appendChild(graphContainer);

        this.updateTransferGraph();
        this.startAnimation();
        return container;
    }

    startAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        const animate = () => {
            if (!this.canvas) return;
            
            const ctx = this.canvas.getContext('2d');
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.updateReductionMeter();
            this.updateTransferGraph();
            
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        this.animationFrameId = requestAnimationFrame(animate);
    }

    cleanup() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.gr = 0;
        this.lastProcessTime = performance.now() / 1000;
    }
}

window.CompressorPlugin = CompressorPlugin;
