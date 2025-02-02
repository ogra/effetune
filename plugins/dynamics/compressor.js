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
        this.lastProcessTime = performance.now() / 1000;
        this.animationFrameId = null;
        this._hasMessageHandler = false;

        this._setupMessageHandler();

        this.registerProcessor(`
            const result = new Float32Array(data.length);
            result.set(data);

            const MIN_ENVELOPE = 1e-6;
            const MIN_DB = -60;
            const MAX_DB = 0;
            
            const attackSamples = Math.max(1, (parameters.at * parameters.sampleRate) / 1000);
            const releaseSamples = Math.max(1, (parameters.rl * parameters.sampleRate) / 1000);
            const attackCoeff = Math.exp(-Math.LN2 / attackSamples);
            const releaseCoeff = Math.exp(-Math.LN2 / releaseSamples);
            
            if (!context.envelopeStates || context.envelopeStates.length !== parameters.channelCount) {
                context.envelopeStates = new Float32Array(parameters.channelCount).fill(MIN_ENVELOPE);
            }

            let maxEnvelopeDb = MIN_DB;
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                let envelope = context.envelopeStates[ch] || MIN_ENVELOPE;
                
                for (let i = 0; i < parameters.blockSize; i++) {
                    const input = data[offset + i];
                    const inputAbs = Math.abs(input);
                    
                    const coeff = inputAbs > envelope ? attackCoeff : releaseCoeff;
                    envelope = Math.max(MIN_ENVELOPE, 
                        envelope * coeff + inputAbs * (1 - coeff));
                    
                    const envelopeDb = Math.max(MIN_DB, 
                        Math.min(MAX_DB, 20 * Math.log10(envelope)));
                    
                    maxEnvelopeDb = Math.max(maxEnvelopeDb, envelopeDb);
                }
                
                context.envelopeStates[ch] = envelope;
            }

            const diff = maxEnvelopeDb - parameters.th;
            let gainReduction = 0;
            
            if (diff <= -parameters.kn/2) {
                gainReduction = 0;
            } else if (diff >= parameters.kn/2) {
                gainReduction = diff * (1 - 1/parameters.rt);
            } else {
                const t = (diff + parameters.kn/2) / parameters.kn;
                const slope = (1 - 1/parameters.rt);
                gainReduction = slope * parameters.kn * t * t / 2;
            }

            if (parameters.enabled && gainReduction > 0) {
                const totalGainDb = Math.max(-60, Math.min(60, -gainReduction + parameters.gn));
                const totalGainLin = Math.pow(10, totalGainDb / 20);
                
                for (let ch = 0; ch < parameters.channelCount; ch++) {
                    const offset = ch * parameters.blockSize;
                    for (let i = 0; i < parameters.blockSize; i++) {
                        result[offset + i] *= totalGainLin;
                    }
                }
            }

            result.measurements = {
                time: parameters.time,
                gainReduction: gainReduction
            };

            return result;
        `);
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
        
        // Draw grid and labels at dB positions
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#666';
        ctx.font = '20px Arial';
        
        [-48, -36, -24, -12].forEach(db => {
            const x = ((db + 60) / 60) * width;
            const y = height - ((db + 60) / 60) * height;
            
            // Draw grid lines
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            
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
            const inputDb = (i / width) * 60 - 60;
            
            const diff = inputDb - thresholdDb;
            let gainReduction = 0;
            
            if (diff <= -kneeDb/2) {
                gainReduction = 0;
            } else if (diff >= kneeDb/2) {
                gainReduction = diff * (1 - 1/ratio);
            } else {
                const t = (diff + kneeDb/2) / kneeDb;
                const slope = (1 - 1/ratio);
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
        
        ctx.fillText('in', width/2, height - 5);
        
        ctx.save();
        ctx.translate(20, height/2);
        ctx.rotate(-Math.PI/2);
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
