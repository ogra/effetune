class ToneControlPlugin extends PluginBase {
    static processorFunction = `
        if (!parameters.enabled) return data;
        
        const { bs, md, tr, channelCount, blockSize } = parameters;
        
        // Initialize filter states in context if not exists
        if (!context.initialized) {
            context.filterStates = {
                // Bass filter states (Low-shelf, 100Hz, Q=0.7)
                bass1: new Array(channelCount).fill(0),
                bass2: new Array(channelCount).fill(0),
                bass3: new Array(channelCount).fill(0),
                bass4: new Array(channelCount).fill(0),
                // Mid filter states (Peaking, 1kHz, Q=1.0)
                mid1: new Array(channelCount).fill(0),
                mid2: new Array(channelCount).fill(0),
                mid3: new Array(channelCount).fill(0),
                mid4: new Array(channelCount).fill(0),
                // Treble filter states (High-shelf, 10kHz, Q=0.7)
                treble1: new Array(channelCount).fill(0),
                treble2: new Array(channelCount).fill(0),
                treble3: new Array(channelCount).fill(0),
                treble4: new Array(channelCount).fill(0)
            };
            context.initialized = true;
        }

        // Reset filter states if channel count changes
        if (context.filterStates.bass1.length !== channelCount) {
            Object.keys(context.filterStates).forEach(key => {
                context.filterStates[key] = new Array(channelCount).fill(0);
            });
        }

        const filterStates = context.filterStates;
        
        // Convert dB to linear gain
        const bassGain = Math.pow(10, bs / 20);
        const midGain = Math.pow(10, md / 20);
        const trebleGain = Math.pow(10, tr / 20);
        
        // Calculate normalized frequencies and Q factors
        const bassW0 = 2 * Math.PI * 100 / sampleRate;
        const midW0 = 2 * Math.PI * 1000 / sampleRate;
        const trebleW0 = 2 * Math.PI * 10000 / sampleRate;
        
        const bassQ = 0.7;
        const midQ = 1.0;
        const trebleQ = 0.7;
        
        // Calculate intermediate values
        const bassAlpha = Math.sin(bassW0) / (2 * bassQ);
        const midAlpha = Math.sin(midW0) / (2 * midQ);
        const trebleAlpha = Math.sin(trebleW0) / (2 * trebleQ);
        
        const bassCosW0 = Math.cos(bassW0);
        const midCosW0 = Math.cos(midW0);
        const trebleCosW0 = Math.cos(trebleW0);
        
        // Bass (Low-shelf) coefficients
        const bassA = Math.sqrt(bassGain);
        const bassAp1 = bassA + 1;
        const bassAm1 = bassA - 1;
        const bassB0 = bassA * (bassAp1 - bassAm1 * bassCosW0 + 2 * Math.sqrt(bassA) * bassAlpha);
        const bassB1 = 2 * bassA * (bassAm1 - bassAp1 * bassCosW0);
        const bassB2 = bassA * (bassAp1 - bassAm1 * bassCosW0 - 2 * Math.sqrt(bassA) * bassAlpha);
        const bassA0 = bassAp1 + bassAm1 * bassCosW0 + 2 * Math.sqrt(bassA) * bassAlpha;
        const bassA1 = -2 * (bassAm1 + bassAp1 * bassCosW0);
        const bassA2 = bassAp1 + bassAm1 * bassCosW0 - 2 * Math.sqrt(bassA) * bassAlpha;
        
        // Mid (Peaking) coefficients
        const midA0 = 1 + midAlpha / midGain;
        const midA1 = -2 * midCosW0;
        const midA2 = 1 - midAlpha / midGain;
        const midB0 = 1 + midAlpha * midGain;
        const midB1 = -2 * midCosW0;
        const midB2 = 1 - midAlpha * midGain;
        
        // Treble (High-shelf) coefficients
        const trebleA = Math.sqrt(trebleGain);
        const trebleAp1 = trebleA + 1;
        const trebleAm1 = trebleA - 1;
        const trebleB0 = trebleA * (trebleAp1 + trebleAm1 * trebleCosW0 + 2 * Math.sqrt(trebleA) * trebleAlpha);
        const trebleB1 = -2 * trebleA * (trebleAm1 + trebleAp1 * trebleCosW0);
        const trebleB2 = trebleA * (trebleAp1 + trebleAm1 * trebleCosW0 - 2 * Math.sqrt(trebleA) * trebleAlpha);
        const trebleA0 = trebleAp1 - trebleAm1 * trebleCosW0 + 2 * Math.sqrt(trebleA) * trebleAlpha;
        const trebleA1 = 2 * (trebleAm1 - trebleAp1 * trebleCosW0);
        const trebleA2 = trebleAp1 - trebleAm1 * trebleCosW0 - 2 * Math.sqrt(trebleA) * trebleAlpha;
        
        // Process each channel
        for (let ch = 0; ch < channelCount; ch++) {
            const offset = ch * blockSize;
            
            // Process samples
            for (let i = 0; i < blockSize; i++) {
                let sample = data[offset + i];
                
                // Bass filter
                let x0 = sample;
                let y0 = (bassB0 * x0 + bassB1 * filterStates.bass1[ch] + bassB2 * filterStates.bass2[ch] -
                         bassA1 * filterStates.bass3[ch] - bassA2 * filterStates.bass4[ch]) / bassA0;
                
                filterStates.bass2[ch] = filterStates.bass1[ch];
                filterStates.bass1[ch] = x0;
                filterStates.bass4[ch] = filterStates.bass3[ch];
                filterStates.bass3[ch] = y0;
                
                sample = y0;
                
                // Mid filter
                x0 = sample;
                y0 = (midB0 * x0 + midB1 * filterStates.mid1[ch] + midB2 * filterStates.mid2[ch] -
                      midA1 * filterStates.mid3[ch] - midA2 * filterStates.mid4[ch]) / midA0;
                
                filterStates.mid2[ch] = filterStates.mid1[ch];
                filterStates.mid1[ch] = x0;
                filterStates.mid4[ch] = filterStates.mid3[ch];
                filterStates.mid3[ch] = y0;
                
                sample = y0;
                
                // Treble filter
                x0 = sample;
                y0 = (trebleB0 * x0 + trebleB1 * filterStates.treble1[ch] + trebleB2 * filterStates.treble2[ch] -
                      trebleA1 * filterStates.treble3[ch] - trebleA2 * filterStates.treble4[ch]) / trebleA0;
                
                filterStates.treble2[ch] = filterStates.treble1[ch];
                filterStates.treble1[ch] = x0;
                filterStates.treble4[ch] = filterStates.treble3[ch];
                filterStates.treble3[ch] = y0;
                
                data[offset + i] = y0;
            }
        }
        
        return data;
    `;

    constructor() {
        super('Tone Control', 'Three-band tone control with bass, mid, and treble adjustment');
        
        // Initialize parameters
        this.bs = 0;
        this.md = 0;
        this.tr = 0;
        
        // Register processor function
        this.registerProcessor(ToneControlPlugin.processorFunction);
    }

    // Parameter setters
    setBass(value) {
        this.bs = Math.max(-24, Math.min(24, typeof value === 'number' ? value : parseFloat(value)));
        this.updateParameters();
    }

    setMid(value) {
        this.md = Math.max(-24, Math.min(24, typeof value === 'number' ? value : parseFloat(value)));
        this.updateParameters();
    }

    setTreble(value) {
        this.tr = Math.max(-24, Math.min(24, typeof value === 'number' ? value : parseFloat(value)));
        this.updateParameters();
    }

    // Reset all parameters to default values
    reset() {
        this.setBass(0);
        this.setMid(0);
        this.setTreble(0);
    }

    getParameters() {
        return {
            type: this.constructor.name,
            enabled: this.enabled,
            bs: this.bs,
            md: this.md,
            tr: this.tr
        };
    }

    setParameters(params) {
        if (params.enabled !== undefined) this.enabled = params.enabled;
        if (params.bs !== undefined) this.setBass(params.bs);
        if (params.md !== undefined) this.setMid(params.md);
        if (params.tr !== undefined) this.setTreble(params.tr);
        this.updateParameters();
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'tone-control-plugin-ui plugin-parameter-ui';

        // Bass parameter row
        const bassRow = document.createElement('div');
        bassRow.className = 'parameter-row';
        
        const bassLabel = document.createElement('label');
        bassLabel.textContent = 'Bass (dB):';
        
        const bassSlider = document.createElement('input');
        bassSlider.type = 'range';
        bassSlider.min = -24;
        bassSlider.max = 24;
        bassSlider.step = 0.1;
        bassSlider.value = this.bs;
        
        const bassValue = document.createElement('input');
        bassValue.type = 'number';
        bassValue.min = -24;
        bassValue.max = 24;
        bassValue.step = 0.1;
        bassValue.value = this.bs;

        bassSlider.addEventListener('input', (e) => {
            this.setBass(parseFloat(e.target.value));
            bassValue.value = this.bs;
            this.drawGraph(canvas);
        });

        bassValue.addEventListener('input', (e) => {
            this.setBass(parseFloat(e.target.value));
            bassSlider.value = this.bs;
            this.drawGraph(canvas);
            e.target.value = this.bs;
        });

        bassRow.appendChild(bassLabel);
        bassRow.appendChild(bassSlider);
        bassRow.appendChild(bassValue);

        // Mid parameter row
        const midRow = document.createElement('div');
        midRow.className = 'parameter-row';
        
        const midLabel = document.createElement('label');
        midLabel.textContent = 'Mid (dB):';
        
        const midSlider = document.createElement('input');
        midSlider.type = 'range';
        midSlider.min = -24;
        midSlider.max = 24;
        midSlider.step = 0.1;
        midSlider.value = this.md;
        
        const midValue = document.createElement('input');
        midValue.type = 'number';
        midValue.min = -24;
        midValue.max = 24;
        midValue.step = 0.1;
        midValue.value = this.md;

        midSlider.addEventListener('input', (e) => {
            this.setMid(parseFloat(e.target.value));
            midValue.value = this.md;
            this.drawGraph(canvas);
        });

        midValue.addEventListener('input', (e) => {
            this.setMid(parseFloat(e.target.value));
            midSlider.value = this.md;
            this.drawGraph(canvas);
            e.target.value = this.md;
        });

        midRow.appendChild(midLabel);
        midRow.appendChild(midSlider);
        midRow.appendChild(midValue);

        // Treble parameter row
        const trebleRow = document.createElement('div');
        trebleRow.className = 'parameter-row';
        
        const trebleLabel = document.createElement('label');
        trebleLabel.textContent = 'Treble (dB):';
        
        const trebleSlider = document.createElement('input');
        trebleSlider.type = 'range';
        trebleSlider.min = -24;
        trebleSlider.max = 24;
        trebleSlider.step = 0.1;
        trebleSlider.value = this.tr;
        
        const trebleValue = document.createElement('input');
        trebleValue.type = 'number';
        trebleValue.min = -24;
        trebleValue.max = 24;
        trebleValue.step = 0.1;
        trebleValue.value = this.tr;

        trebleSlider.addEventListener('input', (e) => {
            this.setTreble(parseFloat(e.target.value));
            trebleValue.value = this.tr;
            this.drawGraph(canvas);
        });

        trebleValue.addEventListener('input', (e) => {
            this.setTreble(parseFloat(e.target.value));
            trebleSlider.value = this.tr;
            this.drawGraph(canvas);
            e.target.value = this.tr;
        });

        trebleRow.appendChild(trebleLabel);
        trebleRow.appendChild(trebleSlider);
        trebleRow.appendChild(trebleValue);

        // Graph container
        const graphContainer = document.createElement('div');
        graphContainer.style.position = 'relative';
        
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 480;
        canvas.style.width = '600px';
        canvas.style.height = '240px';
        
        graphContainer.appendChild(canvas);

        // Reset button
        const resetButton = document.createElement('button');
        resetButton.className = 'eq-reset-button';
        resetButton.textContent = 'Reset';
        resetButton.addEventListener('click', () => {
            this.reset();
            bassSlider.value = this.bs;
            bassValue.value = this.bs;
            midSlider.value = this.md;
            midValue.value = this.md;
            trebleSlider.value = this.tr;
            trebleValue.value = this.tr;
            this.drawGraph(canvas);
        });
        graphContainer.appendChild(resetButton);

        // Add all elements to container
        container.appendChild(bassRow);
        container.appendChild(midRow);
        container.appendChild(trebleRow);
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
        const freqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
        freqs.forEach(freq => {
            const x = width * (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            // Frequency labels (hide 20Hz and 20kHz)
            if (freq !== 20 && freq !== 20000) {
                ctx.fillStyle = '#666';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(freq >= 1000 ? `${freq/1000}k` : freq, x, height - 40);
            }
        });

        // Horizontal grid lines (dB)
        const dBs = [-24, -18, -12, -6, 0, 6, 12, 18, 24];
        dBs.forEach(db => {
            const y = height * (1 - (db + 24) / 48);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // dB labels (hide ±24dB)
            if (db !== -24 && db !== 24) {
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
        
        // Draw "Frequency (Hz)" label
        ctx.fillText('Frequency (Hz)', width/2, height - 5);
        
        // Draw "Level (dB)" label
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
            
            // Calculate individual filter responses
            let bassResponse = 0;
            let midResponse = 0;
            let trebleResponse = 0;
            
            // Bass response (low-shelf)
            const bassOmega = freq / 100;
            bassResponse = this.bs * (1 / (1 + Math.pow(bassOmega, 2)));
            
            // Mid response (peaking)
            const midOmega = freq / 1000;
            const midBandwidth = 1.4;
            midResponse = this.md * Math.exp(-Math.pow(Math.log(midOmega), 2) / (2 * Math.pow(midBandwidth, 2)));
            
            // Treble response (high-shelf)
            const trebleOmega = freq / 10000;
            trebleResponse = this.tr * (1 / (1 + Math.pow(trebleOmega, -2)));
            
            // Combine responses
            const totalResponse = bassResponse + midResponse + trebleResponse;
            
            const y = height * (1 - (totalResponse + 24) / 48);
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
if (typeof window !== 'undefined') {
    window.ToneControlPlugin = ToneControlPlugin;
}
