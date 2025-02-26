class GatePlugin extends PluginBase {
    constructor() {
        super('Gate', 'Noise gate with threshold, ratio, and knee control');
        
        // Initialize parameters
        this.th = -40;  // Threshold (-96 to 0 dB)
        this.rt = 10;   // Ratio (1:1 to 100:1)
        this.at = 1;    // Attack Time (0.01 to 50 ms)
        this.rl = 200;  // Release Time (10 to 2000 ms)
        this.kn = 1;    // Knee (0 to 6 dB)
        this.gn = 0;    // Gain (-12 to +12 dB)
        this.gr = 0;    // Current gain reduction value
        this.lastProcessTime = performance.now() / 1000;
        this.animationFrameId = null;
        this._hasMessageHandler = false;

        this._setupMessageHandler();

        // Register processor with optimized block processing
        this.registerProcessor(this.getProcessorCode());
    }

    // Returns the processor code string with optimized block processing
    getProcessorCode() {
        return `
            // Create a copy of the input data
            const result = new Float32Array(data.length);
            result.set(data);
            if (!parameters.enabled) {
                return result;
            }

            const MIN_ENVELOPE = 1e-6;
            const MIN_DB = -96;
            const MAX_DB = 0;
            const LOG2 = Math.log(2);
            const LOG10_20 = 8.685889638065035; // 20/ln(10)
            const gainFactor = 0.11512925464970229; // ln(10)/20

            // Calculate attack and release coefficients if needed or if parameters changed
            if (!context.timeConstants || 
                context.lastAt !== parameters.at || 
                context.lastRl !== parameters.rl || 
                context.lastSampleRate !== parameters.sampleRate) {
                
                const sampleRateMs = parameters.sampleRate / 1000;
                const attackSamples = Math.max(1, parameters.at * sampleRateMs);
                const releaseSamples = Math.max(1, parameters.rl * sampleRateMs);
                
                context.timeConstants = {
                    attack: Math.exp(-LOG2 / attackSamples),
                    release: Math.exp(-LOG2 / releaseSamples)
                };
                
                // Store parameters for future comparison
                context.lastAt = parameters.at;
                context.lastRl = parameters.rl;
                context.lastSampleRate = parameters.sampleRate;
            }
            
            // Cache frequently used coefficients
            const attackCoeff = context.timeConstants.attack;
            const releaseCoeff = context.timeConstants.release;

            // Precompute gate parameters to avoid recalculating in inner loops
            if (!context.gateParams || 
                context.gateParams.th !== parameters.th || 
                context.gateParams.rt !== parameters.rt || 
                context.gateParams.kn !== parameters.kn || 
                context.gateParams.gn !== parameters.gn) {
                
                const halfKnee = parameters.kn * 0.5;
                const invRatio = parameters.rt - 1;
                
                context.gateParams = {
                    th: parameters.th,
                    rt: parameters.rt,
                    kn: parameters.kn,
                    gn: parameters.gn,
                    halfKnee: halfKnee,
                    invRatio: invRatio
                };
            }
            
            // Initialize envelope state per channel if not already set
            if (!context.envelopeStates || context.envelopeStates.length !== parameters.channelCount) {
                context.envelopeStates = new Float32Array(parameters.channelCount).fill(MIN_ENVELOPE);
            }
            
            // Create work buffer for calculations if it doesn't exist
            if (!context.workBuffer || context.workBuffer.length !== parameters.blockSize) {
                context.workBuffer = new Float32Array(parameters.blockSize);
            }
            
            // Precompute lookup tables for expensive math operations if they don't exist
            if (!context.dbLookup) {
                // Create lookup table for LOG10_20 * Math.log(x) operation
                const DB_LOOKUP_SIZE = 4096;
                const DB_LOOKUP_SCALE = DB_LOOKUP_SIZE / 10; // 0 to 10 range
                context.dbLookup = new Float32Array(DB_LOOKUP_SIZE);
                for (let i = 0; i < DB_LOOKUP_SIZE; i++) {
                    const x = i / DB_LOOKUP_SCALE;
                    if (x < 1e-6) {
                        context.dbLookup[i] = MIN_DB;
                    } else {
                        context.dbLookup[i] = LOG10_20 * Math.log(x);
                    }
                }
                
                // Create lookup table for Math.exp(-x * gainFactor) operation
                const EXP_LOOKUP_SIZE = 2048;
                const EXP_LOOKUP_SCALE = EXP_LOOKUP_SIZE / 60; // 0 to 60 dB range
                context.expLookup = new Float32Array(EXP_LOOKUP_SIZE);
                for (let i = 0; i < EXP_LOOKUP_SIZE; i++) {
                    const x = i / EXP_LOOKUP_SCALE;
                    context.expLookup[i] = Math.exp(-x * gainFactor);
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
                if (x <= 0) return MIN_DB;
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

            // For measurement: track maximum gain reduction across the block
            let blockMaxGainReduction = 0;
            
            // Cache gate parameters for faster access
            const gateParams = context.gateParams;
            const threshold = gateParams.th;
            const halfKnee = gateParams.halfKnee;
            const invRatio = gateParams.invRatio;
            const gain = gateParams.gn;
            const kneeWidth = gateParams.kn;
            const workBuffer = context.workBuffer;

            // Process each channel with optimized block processing
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                let envelope = context.envelopeStates[ch];
                
                // First pass: calculate envelope for all samples in the block
                for (let i = 0; i < parameters.blockSize; i++) {
                    const inputAbs = Math.abs(data[offset + i]);
                    
                    // Update envelope using appropriate coefficient (attack or release)
                    const coeff = (inputAbs > envelope) ? attackCoeff : releaseCoeff;
                    envelope = Math.max(MIN_ENVELOPE, envelope * coeff + inputAbs * (1 - coeff));
                    
                    // Store envelope in work buffer for second pass
                    workBuffer[i] = envelope;
                }
                
                // Second pass: apply gain reduction with loop unrolling for better performance
                const blockSizeMod4 = parameters.blockSize & ~3; // Fast way to calculate blockSize - (blockSize % 4)
                let i = 0;
                
                // Main loop with 4-sample unrolling
                for (; i < blockSizeMod4; i += 4) {
                    // Process 4 samples at once
                    for (let j = 0; j < 4; j++) {
                        const idx = i + j;
                        const envelopeDb = fastDb(workBuffer[idx]);
                        const diff = threshold - envelopeDb;
                        
                        // Calculate gain reduction based on ratio and knee
                        let gainReduction = 0;
                        
                        if (invRatio <= 0) {
                            // No gain reduction if ratio is 1:1
                            gainReduction = 0;
                        } else if (diff <= -halfKnee) {
                            // Below threshold - knee/2
                            gainReduction = 0;
                        } else if (diff >= halfKnee) {
                            // Above threshold + knee/2
                            gainReduction = diff * invRatio;
                        } else {
                            // In the knee region - soft knee calculation
                            const kneeFactorSquared = (diff + halfKnee) / kneeWidth;
                            gainReduction = invRatio * kneeWidth * kneeFactorSquared * kneeFactorSquared * 0.5;
                        }
                        
                        // Update block maximum gain reduction for measurement
                        if (gainReduction > blockMaxGainReduction) {
                            blockMaxGainReduction = gainReduction;
                        }
                        
                        // Apply gain reduction if needed
                        if (gainReduction > 0) {
                            const totalGainLin = fastExp(gainReduction) * fastExp(-gain);
                            result[offset + idx] *= totalGainLin;
                        }
                    }
                }
                
                // Handle remaining samples
                for (; i < parameters.blockSize; i++) {
                    const envelopeDb = fastDb(workBuffer[i]);
                    const diff = threshold - envelopeDb;
                    
                    // Calculate gain reduction based on ratio and knee
                    let gainReduction = 0;
                    
                    if (invRatio <= 0) {
                        gainReduction = 0;
                    } else if (diff <= -halfKnee) {
                        gainReduction = 0;
                    } else if (diff >= halfKnee) {
                        gainReduction = diff * invRatio;
                    } else {
                        // In the knee region - soft knee calculation
                        const kneeFactorSquared = (diff + halfKnee) / kneeWidth;
                        gainReduction = invRatio * kneeWidth * kneeFactorSquared * kneeFactorSquared * 0.5;
                    }
                    
                    // Update block maximum gain reduction
                    if (gainReduction > blockMaxGainReduction) {
                        blockMaxGainReduction = gainReduction;
                    }
                    
                    // Apply gain reduction if needed
                    if (gainReduction > 0) {
                        const totalGainLin = fastExp(gainReduction) * fastExp(-gain);
                        result[offset + i] *= totalGainLin;
                    }
                }
                
                // Update envelope state for current channel
                context.envelopeStates[ch] = envelope;
            }

            // Set measurements for monitoring
            result.measurements = {
                time: parameters.time,
                gainReduction: blockMaxGainReduction
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

        const time = performance.now() / 1000;
        const deltaTime = time - this.lastProcessTime;
        this.lastProcessTime = time;

        const targetGr = message.measurements.gainReduction || 0;
        const attackTime = 0.005;  // 5ms for fast attack
        const releaseTime = 0.100; // 100ms for smooth release
        
        const smoothingFactor = targetGr > this.gr ? 
            Math.min(1, deltaTime / attackTime) : 
            Math.min(1, deltaTime / releaseTime);
        
        this.gr = this.gr + (targetGr - this.gr) * smoothingFactor;
        this.gr = Math.max(0, this.gr);

        return audioBuffer;
    }

    setParameters(params) {
        let graphNeedsUpdate = false;

        if (params.th !== undefined) {
            this.th = Math.max(-96, Math.min(0, params.th));
            graphNeedsUpdate = true;
        }
        if (params.rt !== undefined) {
            this.rt = Math.max(1, Math.min(100, params.rt));
            graphNeedsUpdate = true;
        }
        if (params.at !== undefined) {
            this.at = Math.max(0.01, Math.min(50, params.at));
        }
        if (params.rl !== undefined) {
            this.rl = Math.max(10, Math.min(2000, params.rl));
        }
        if (params.kn !== undefined) {
            this.kn = Math.max(0, Math.min(6, params.kn));
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
        if (graphNeedsUpdate) {
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
        
        // Draw grid and dB labels
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#666';
        ctx.font = '20px Arial';
        
        [-72, -48, -24].forEach(db => {
            const x = ((db + 96) / 96) * width;
            const y = height - ((db + 96) / 96) * height;
            
            // Draw vertical grid line
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            
            // Draw horizontal grid line
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            
            // Draw labels
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
            const inputDb = (i / width) * 96 - 96;
            
            const diff = thresholdDb - inputDb;
            let gainReduction = 0;
            
            if (ratio === 1) {
                gainReduction = 0;
            } else {
                if (diff <= -kneeDb / 2) {
                    gainReduction = 0;
                } else if (diff >= kneeDb / 2) {
                    gainReduction = diff * (ratio - 1);
                } else {
                    const t = (diff + kneeDb / 2) / kneeDb;
                    gainReduction = (ratio - 1) * kneeDb * t * t / 2;
                }
            }
            
            const outputDb = inputDb - gainReduction + gainDb;
            
            const x = i;
            const y = ((outputDb + 96) / 96) * height;
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

        const meterX = 0;
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
        container.className = 'gate-plugin-ui plugin-parameter-ui';

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

        container.appendChild(createControl('Threshold (dB):', -96, 0, 1, this.th, this.setTh.bind(this)));
        container.appendChild(createControl('Ratio:', 1, 100, 0.1, this.rt, this.setRt.bind(this)));
        container.appendChild(createControl('Attack (ms):', 0.01, 50, 0.01, this.at, this.setAt.bind(this)));
        container.appendChild(createControl('Release (ms):', 10, 2000, 10, this.rl, this.setRl.bind(this)));
        container.appendChild(createControl('Knee (dB):', 0, 6, 0.1, this.kn, this.setKn.bind(this)));
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

window.GatePlugin = GatePlugin;
