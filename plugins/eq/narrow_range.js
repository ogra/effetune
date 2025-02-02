// Import processor function
const processorFunction = `
    if (!parameters.enabled) return data;
    
    // Map shortened parameter names to their original names for clarity
    const { 
        hf: hpfFreq,   // hf: High-pass Filter Frequency (formerly hpfFreq)
        hs: hpfSlope,  // hs: High-pass Filter Slope (formerly hpfSlope)
        lf: lpfFreq,   // lf: Low-pass Filter Frequency (formerly lpfFreq)
        ls: lpfSlope,  // ls: Low-pass Filter Slope (formerly lpfSlope)
        channelCount, blockSize, pluginId 
    } = parameters;
    
    // Initialize filter states in context if not exists
    if (!context.initialized) {
        context.filterStates = {
            // HPF states (first stage)
            hpf1: new Array(channelCount).fill(0),
            hpf2: new Array(channelCount).fill(0),
            hpf3: new Array(channelCount).fill(0),
            hpf4: new Array(channelCount).fill(0),
            // HPF states (second stage for -12dB/oct)
            hpf5: new Array(channelCount).fill(0),
            hpf6: new Array(channelCount).fill(0),
            hpf7: new Array(channelCount).fill(0),
            hpf8: new Array(channelCount).fill(0),
            // LPF states (first stage)
            lpf1: new Array(channelCount).fill(0),
            lpf2: new Array(channelCount).fill(0),
            lpf3: new Array(channelCount).fill(0),
            lpf4: new Array(channelCount).fill(0),
            // LPF states (second stage for -12dB/oct)
            lpf5: new Array(channelCount).fill(0),
            lpf6: new Array(channelCount).fill(0),
            lpf7: new Array(channelCount).fill(0),
            lpf8: new Array(channelCount).fill(0)
        };
        context.initialized = true;
    }

    // Reset filter states if channel count changes
    if (context.filterStates.hpf1.length !== channelCount) {
        Object.keys(context.filterStates).forEach(key => {
            context.filterStates[key] = new Array(channelCount).fill(0);
        });
    }

    const filterStates = context.filterStates;
    
    // Calculate normalized frequencies and Q factors
    const hpfW0 = 2 * Math.PI * hpfFreq / sampleRate;
    const lpfW0 = 2 * Math.PI * lpfFreq / sampleRate;
    const hpfQ = hpfSlope === -12 ? 0.707 : 0.5;  // Butterworth Q for -12dB/oct
    const lpfQ = lpfSlope === -12 ? 0.707 : 0.5;
    
    // Calculate intermediate values
    const hpfAlpha = Math.sin(hpfW0) / (2 * hpfQ);
    const lpfAlpha = Math.sin(lpfW0) / (2 * lpfQ);
    const hpfCosW0 = Math.cos(hpfW0);
    const lpfCosW0 = Math.cos(lpfW0);
    
    // HPF coefficients
    const hpfA0 = 1 + hpfAlpha;
    const hpfA1 = -2 * hpfCosW0;
    const hpfA2 = 1 - hpfAlpha;
    const hpfB0 = (1 + hpfCosW0) / 2;
    const hpfB1 = -(1 + hpfCosW0);
    const hpfB2 = (1 + hpfCosW0) / 2;
    
    // LPF coefficients
    const lpfA0 = 1 + lpfAlpha;
    const lpfA1 = -2 * lpfCosW0;
    const lpfA2 = 1 - lpfAlpha;
    const lpfB0 = (1 - lpfCosW0) / 2;
    const lpfB1 = 1 - lpfCosW0;
    const lpfB2 = (1 - lpfCosW0) / 2;
    
    // Process each channel
    for (let ch = 0; ch < channelCount; ch++) {
        const offset = ch * blockSize;
        
        // Process samples
        for (let i = 0; i < blockSize; i++) {
            let sample = data[offset + i];
            
            // High-pass filter (first stage)
            let x0 = sample;
            let y0 = (hpfB0 * x0 + hpfB1 * filterStates.hpf1[ch] + hpfB2 * filterStates.hpf2[ch] -
                     hpfA1 * filterStates.hpf3[ch] - hpfA2 * filterStates.hpf4[ch]) / hpfA0;
            
            filterStates.hpf2[ch] = filterStates.hpf1[ch];
            filterStates.hpf1[ch] = x0;
            filterStates.hpf4[ch] = filterStates.hpf3[ch];
            filterStates.hpf3[ch] = y0;
            
            sample = y0;
            
            // Second HPF stage for -12dB/oct
            if (hpfSlope === -12) {
                x0 = sample;
                y0 = (hpfB0 * x0 + hpfB1 * filterStates.hpf5[ch] + hpfB2 * filterStates.hpf6[ch] -
                      hpfA1 * filterStates.hpf7[ch] - hpfA2 * filterStates.hpf8[ch]) / hpfA0;
                
                filterStates.hpf6[ch] = filterStates.hpf5[ch];
                filterStates.hpf5[ch] = x0;
                filterStates.hpf8[ch] = filterStates.hpf7[ch];
                filterStates.hpf7[ch] = y0;
                
                sample = y0;
            }
            
            // Low-pass filter (first stage)
            x0 = sample;
            y0 = (lpfB0 * x0 + lpfB1 * filterStates.lpf1[ch] + lpfB2 * filterStates.lpf2[ch] -
                  lpfA1 * filterStates.lpf3[ch] - lpfA2 * filterStates.lpf4[ch]) / lpfA0;
            
            filterStates.lpf2[ch] = filterStates.lpf1[ch];
            filterStates.lpf1[ch] = x0;
            filterStates.lpf4[ch] = filterStates.lpf3[ch];
            filterStates.lpf3[ch] = y0;
            
            sample = y0;
            
            // Second LPF stage for -12dB/oct
            if (lpfSlope === -12) {
                x0 = sample;
                y0 = (lpfB0 * x0 + lpfB1 * filterStates.lpf5[ch] + lpfB2 * filterStates.lpf6[ch] -
                      lpfA1 * filterStates.lpf7[ch] - lpfA2 * filterStates.lpf8[ch]) / lpfA0;
                
                filterStates.lpf6[ch] = filterStates.lpf5[ch];
                filterStates.lpf5[ch] = x0;
                filterStates.lpf8[ch] = filterStates.lpf7[ch];
                filterStates.lpf7[ch] = y0;
                
                sample = y0;
            }
            
            data[offset + i] = sample;
        }
    }
    
    return data;
`;

class NarrowRangePlugin extends PluginBase {
    constructor() {
        super('Narrow Range', 'High-pass and low-pass filter combination for narrow band filtering');
        
        // Initialize parameters
        this.hf = 60;    // hf: High-pass Filter Frequency (formerly hpfFreq)
        this.hs = -12;   // hs: High-pass Filter Slope (formerly hpfSlope)
        this.lf = 5000;  // lf: Low-pass Filter Frequency (formerly lpfFreq)
        this.ls = -6;    // ls: Low-pass Filter Slope (formerly lpfSlope)
        
        // Register processor function
        this.registerProcessor(processorFunction);
    }

    // Set High-pass Filter frequency (20Hz to 1000Hz) (formerly setHpfFreq)
    setHf(freq) {
        this.setParameters({ hf: freq });
    }

    // Set High-pass Filter slope (-6 or -12 dB/oct) (formerly setHpfSlope)
    setHs(slope) {
        this.setParameters({ hs: slope });
    }

    // Set Low-pass Filter frequency (1000Hz to 20000Hz) (formerly setLpfFreq)
    setLf(freq) {
        this.setParameters({ lf: freq });
    }

    // Set Low-pass Filter slope (-6 or -12 dB/oct) (formerly setLpfSlope)
    setLs(slope) {
        this.setParameters({ ls: slope });
    }

    getParameters() {
        return {
            type: this.constructor.name,
            enabled: this.enabled,
            hf: this.hf,
            hs: this.hs,
            lf: this.lf,
            ls: this.ls
        };
    }

    setParameters(params) {
        if (params.enabled !== undefined) this.enabled = params.enabled;
        if (params.hf !== undefined) this.hf = Math.max(20, Math.min(1000, typeof params.hf === 'number' ? params.hf : parseFloat(params.hf)));
        if (params.hs !== undefined) {
            const intSlope = typeof params.hs === 'number' ? params.hs : parseInt(params.hs);
            this.hs = intSlope === -12 ? -12 : -6;
        }
        if (params.lf !== undefined) this.lf = Math.max(1000, Math.min(20000, typeof params.lf === 'number' ? params.lf : parseFloat(params.lf)));
        if (params.ls !== undefined) {
            const intSlope = typeof params.ls === 'number' ? params.ls : parseInt(params.ls);
            this.ls = intSlope === -12 ? -12 : -6;
        }
        this.updateParameters();
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'narrow-range-plugin-ui plugin-parameter-ui';

        // HPF Frequency parameter row
        const hpfFreqRow = document.createElement('div');
        hpfFreqRow.className = 'parameter-row';
        
        const hpfFreqLabel = document.createElement('label');
        hpfFreqLabel.textContent = 'HPF Freq (Hz):';
        
        const hpfFreqSlider = document.createElement('input');
        hpfFreqSlider.type = 'range';
        hpfFreqSlider.min = 20;
        hpfFreqSlider.max = 1000;
        hpfFreqSlider.step = 1;
        hpfFreqSlider.value = this.hf;
        
        const hpfFreqValue = document.createElement('input');
        hpfFreqValue.type = 'number';
        hpfFreqValue.min = 20;
        hpfFreqValue.max = 1000;
        hpfFreqValue.step = 1;
        hpfFreqValue.value = this.hf;

        hpfFreqSlider.addEventListener('input', (e) => {
            this.setHf(parseFloat(e.target.value));
            hpfFreqValue.value = this.hf;
            this.drawGraph(canvas);
        });

        hpfFreqValue.addEventListener('input', (e) => {
            this.setHf(parseFloat(e.target.value) || 0);
            hpfFreqSlider.value = this.hf;
            this.drawGraph(canvas);
            e.target.value = this.hf;
        });

        const hpfSlopeGroup = document.createElement('div');
        hpfSlopeGroup.className = 'radio-group';
        [-6, -12].forEach(slope => {
            const label = document.createElement('label');
            label.className = 'radio-label';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `hpf-slope-${this.id}`;
            radio.value = slope;
            radio.checked = this.hs === slope;
            radio.addEventListener('change', (e) => {
                this.setHs(parseInt(e.target.value));
                this.drawGraph(canvas);
            });
            label.appendChild(radio);
            label.appendChild(document.createTextNode(`${Math.abs(slope)}dB/oct`));
            hpfSlopeGroup.appendChild(label);
        });

        hpfFreqRow.appendChild(hpfFreqLabel);
        hpfFreqRow.appendChild(hpfFreqSlider);
        hpfFreqRow.appendChild(hpfFreqValue);
        hpfFreqRow.appendChild(hpfSlopeGroup);

        // LPF Frequency parameter row
        const lpfFreqRow = document.createElement('div');
        lpfFreqRow.className = 'parameter-row';
        
        const lpfFreqLabel = document.createElement('label');
        lpfFreqLabel.textContent = 'LPF Freq (Hz):';
        
        const lpfFreqSlider = document.createElement('input');
        lpfFreqSlider.type = 'range';
        lpfFreqSlider.min = 1000;
        lpfFreqSlider.max = 20000;
        lpfFreqSlider.step = 100;
        lpfFreqSlider.value = this.lf;
        
        const lpfFreqValue = document.createElement('input');
        lpfFreqValue.type = 'number';
        lpfFreqValue.min = 1000;
        lpfFreqValue.max = 20000;
        lpfFreqValue.step = 100;
        lpfFreqValue.value = this.lf;

        lpfFreqSlider.addEventListener('input', (e) => {
            this.setLf(parseFloat(e.target.value));
            lpfFreqValue.value = this.lf;
            this.drawGraph(canvas);
        });

        lpfFreqValue.addEventListener('input', (e) => {
            this.setLf(parseFloat(e.target.value) || 0);
            lpfFreqSlider.value = this.lf;
            this.drawGraph(canvas);
            e.target.value = this.lf;
        });

        const lpfSlopeGroup = document.createElement('div');
        lpfSlopeGroup.className = 'radio-group';
        [-6, -12].forEach(slope => {
            const label = document.createElement('label');
            label.className = 'radio-label';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `lpf-slope-${this.id}`;
            radio.value = slope;
            radio.checked = this.ls === slope;
            radio.addEventListener('change', (e) => {
                this.setLs(parseInt(e.target.value));
                this.drawGraph(canvas);
            });
            label.appendChild(radio);
            label.appendChild(document.createTextNode(`${Math.abs(slope)}dB/oct`));
            lpfSlopeGroup.appendChild(label);
        });

        lpfFreqRow.appendChild(lpfFreqLabel);
        lpfFreqRow.appendChild(lpfFreqSlider);
        lpfFreqRow.appendChild(lpfFreqValue);
        lpfFreqRow.appendChild(lpfSlopeGroup);

        // Graph container
        const graphContainer = document.createElement('div');
        graphContainer.style.position = 'relative';
        
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 480;
        canvas.style.width = '600px';
        canvas.style.height = '240px';
        
        graphContainer.appendChild(canvas);

        // Add all elements to container
        container.appendChild(hpfFreqRow);
        container.appendChild(lpfFreqRow);
        container.appendChild(graphContainer);

        // Initial graph draw
        this.drawGraph(canvas);

        return container;
    }

    drawGraph(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;

        // Vertical grid lines (frequency)
        const freqs = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
        freqs.forEach(freq => {
            const x = width * (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            // Frequency labels (skip edge values)
            if (freq > 20 && freq < 20000) {
                ctx.fillStyle = '#666';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(freq >= 1000 ? `${freq/1000}k` : freq, x, height - 40);
            }
        });

        // Horizontal grid lines (dB)
        const dBs = [-30, -24, -18, -12, -6, 0];
        dBs.forEach(db => {
            const y = height * (1 - (db + 30) / 36);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // dB labels (skip edge values)
            if (db > -30 && db < 6) {
                ctx.fillStyle = '#666';
                ctx.font = '20px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(`${db}dB`, 80, y + 6);
            }
        });

        // Draw axis labels
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        
        // Draw "Frequency (Hz)" label with margin
        ctx.fillText('Frequency (Hz)', width/2, height - 5);
        
        // Draw "Level (dB)" label with margin
        ctx.save();
        ctx.translate(20, height/2);
        ctx.rotate(-Math.PI/2);
        ctx.fillText('Level (dB)', 0, 0);
        ctx.restore();

        // Draw frequency response
        ctx.beginPath();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;

        for (let i = 0; i < width; i++) {
            const freq = Math.pow(10, Math.log10(20) + (i / width) * (Math.log10(20000) - Math.log10(20)));
            
            // Calculate magnitude responses
            const hpfOmega = freq / this.hf;  // High-pass Filter Frequency
            const lpfOmega = freq / this.lf;   // Low-pass Filter Frequency
            
            // Calculate individual filter responses
            let hpfMagnitude = 1;
            let lpfMagnitude = 1;
            
            // HPF response (-6dB/oct base)
            const hpfBase = Math.sqrt(
                Math.pow(hpfOmega, 2) / (1 + Math.pow(hpfOmega, 2))
            );
            
            // LPF response (-6dB/oct base)
            const lpfBase = Math.sqrt(
                1 / (1 + Math.pow(lpfOmega, 2))
            );
            
            // Apply cascaded filters for -12dB/oct
            if (this.hs === -12) {  // High-pass Filter Slope
                hpfMagnitude = hpfBase * hpfBase;
            } else {
                hpfMagnitude = hpfBase;
            }
            
            if (this.ls === -12) {  // Low-pass Filter Slope
                lpfMagnitude = lpfBase * lpfBase;
            } else {
                lpfMagnitude = lpfBase;
            }
            
            // Combine responses (multiply magnitudes)
            const totalMagnitude = hpfMagnitude * lpfMagnitude;
            
            // Convert to dB
            const response = 20 * Math.log10(totalMagnitude);

            const y = height * (1 - (response + 30) / 36);
            if (i === 0) {
                ctx.moveTo(i, y);
            } else {
                ctx.lineTo(i, y);
            }
        }
        ctx.stroke();
    }
}

// Register plugin
window.NarrowRangePlugin = NarrowRangePlugin;
