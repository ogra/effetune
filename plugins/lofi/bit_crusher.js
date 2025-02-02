class BitCrusherPlugin extends PluginBase {
    constructor() {
        super('Bit Crusher', 'Bit depth reduction and zero-order hold effect');
        this.bd = 8;         // bd: Bit Depth (formerly bitDepth) - Range: 4-24
        this.td = false;     // td: TPDF Dither (formerly tpdfDither) - Boolean
        this.zf = 44100;     // zf: Zero-Order Hold Frequency (formerly zohFreq) - Range: 4000-96000 Hz
        this.lastSample = new Float32Array(2); // For stereo
        this.sampleCount = 0;

        this.registerProcessor(`
            if (!parameters.enabled) return data;
            
            // Initialize or get processor state
            if (!this.processorState) {
                this.processorState = {
                    lastSample: new Float32Array(2),
                    sampleCount: 0
                };
            }
            
            // Pre-calculate constants for efficiency
            // Map shortened parameter names to their original names for clarity
            const { 
                bd: bitDepth,     // bd: Bit Depth (formerly bitDepth)
                td: tpdfDither,   // td: TPDF Dither (formerly tpdfDither)
                zf: zohFreq,      // zf: Zero-Order Hold Frequency (formerly zohFreq)
                channelCount, blockSize 
            } = parameters;
            
            const maxValue = Math.pow(2, bitDepth - 1);
            const zohRatio = zohFreq / sampleRate;
            
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                for (let i = 0; i < parameters.blockSize; i++) {
                    // Zero-order hold
                    const sampleIndex = Math.floor((this.processorState.sampleCount + i) * zohRatio);
                    if (sampleIndex === Math.floor((this.processorState.sampleCount + i - 1) * zohRatio)) {
                        data[offset + i] = this.processorState.lastSample[ch];
                        continue;
                    }
                    
                    // Bit depth reduction
                    let sample = data[offset + i];
                    
                    // Scale to the bit depth range
                    sample *= maxValue;
                    
                    // Apply TPDF dither if enabled
                    if (tpdfDither) {
                        const r1 = Math.random();
                        const r2 = Math.random();
                        sample += r1 - r2;
                    }
                    
                    // Quantize
                    sample = Math.round(sample);
                    
                    // Scale back to [-1, 1] range
                    sample /= maxValue;
                    
                    data[offset + i] = sample;
                    this.processorState.lastSample[ch] = sample;
                }
            }
            
            this.processorState.sampleCount += parameters.blockSize;
            return data;
        `);
    }

    setParameters(params) {
        if (params.bd !== undefined) {
            this.bd = Math.max(4, Math.min(24, Math.round(params.bd)));
        }
        if (params.td !== undefined) {
            this.td = params.td;
        }
        if (params.zf !== undefined) {
            this.zf = Math.max(4000, Math.min(96000, Math.round(params.zf / 100) * 100));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }

        this.updateParameters();
    }

    // Set bit depth (4-24 bits)
    setBd(value) {
        this.setParameters({ bd: value });
    }

    // Set TPDF dither (true/false)
    setTd(value) {
        this.setParameters({ td: value });
    }

    // Set Zero-Order Hold frequency (4000-96000 Hz)
    setZf(value) {
        this.setParameters({ zf: value });
    }

    getParameters() {
        return {
            type: this.constructor.name,
            bd: this.bd,
            td: this.td,
            zf: this.zf,
            enabled: this.enabled
        };
    }


    createUI() {
        const container = document.createElement('div');
        container.className = 'bit-crusher-plugin-ui plugin-parameter-ui';

        // Bit Depth control
        const bitDepthLabel = document.createElement('label');
        bitDepthLabel.textContent = 'Bit Depth:';
        const bitDepthSlider = document.createElement('input');
        bitDepthSlider.type = 'range';
        bitDepthSlider.min = 4;
        bitDepthSlider.max = 24;
        bitDepthSlider.step = 1;
        bitDepthSlider.value = this.bd;
        bitDepthSlider.addEventListener('input', (e) => {
            this.setBd(parseInt(e.target.value));
            bitDepthValue.value = e.target.value;
        });
        const bitDepthValue = document.createElement('input');
        bitDepthValue.type = 'number';
        bitDepthValue.min = 4;
        bitDepthValue.max = 24;
        bitDepthValue.step = 1;
        bitDepthValue.value = this.bd;
        bitDepthValue.addEventListener('input', (e) => {
            const value = Math.max(4, Math.min(24, parseInt(e.target.value) || 4));
            this.setBd(value);
            bitDepthSlider.value = value;
            e.target.value = value;
        });

        // TPDF Dither control
        const tpdfLabel = document.createElement('label');
        tpdfLabel.textContent = 'TPDF Dither:';
        const tpdfCheckbox = document.createElement('input');
        tpdfCheckbox.type = 'checkbox';
        tpdfCheckbox.checked = this.td;
        tpdfCheckbox.addEventListener('change', (e) => {
            this.setTd(e.target.checked);
        });

        // ZOH Frequency control
        const zohFreqLabel = document.createElement('label');
        zohFreqLabel.textContent = 'ZOH Frequency (Hz):';
        const zohFreqSlider = document.createElement('input');
        zohFreqSlider.type = 'range';
        zohFreqSlider.min = 4000;
        zohFreqSlider.max = 96000;
        zohFreqSlider.step = 100;
        zohFreqSlider.value = this.zf;
        zohFreqSlider.addEventListener('input', (e) => {
            this.setZf(parseInt(e.target.value));
            zohFreqValue.value = e.target.value;
        });
        const zohFreqValue = document.createElement('input');
        zohFreqValue.type = 'number';
        zohFreqValue.min = 4000;
        zohFreqValue.max = 96000;
        zohFreqValue.step = 100;
        zohFreqValue.value = this.zf;
        zohFreqValue.addEventListener('input', (e) => {
            const value = Math.max(4000, Math.min(96000, parseInt(e.target.value) || 4000));
            this.setZf(value);
            zohFreqSlider.value = value;
            e.target.value = value;
        });

        // Add all elements to container
        // Bit Depth parameter row
        const bitDepthRow = document.createElement('div');
        bitDepthRow.className = 'parameter-row';
        bitDepthRow.appendChild(bitDepthLabel);
        bitDepthRow.appendChild(bitDepthSlider);
        bitDepthRow.appendChild(bitDepthValue);
        container.appendChild(bitDepthRow);

        // TPDF Dither parameter row
        const tpdfRow = document.createElement('div');
        tpdfRow.className = 'parameter-row';
        tpdfRow.appendChild(tpdfLabel);
        tpdfRow.appendChild(tpdfCheckbox);
        container.appendChild(tpdfRow);

        // ZOH Frequency parameter row
        const zohFreqRow = document.createElement('div');
        zohFreqRow.className = 'parameter-row';
        zohFreqRow.appendChild(zohFreqLabel);
        zohFreqRow.appendChild(zohFreqSlider);
        zohFreqRow.appendChild(zohFreqValue);
        container.appendChild(zohFreqRow);

        return container;
    }
}

// Register the plugin
window.BitCrusherPlugin = BitCrusherPlugin;
