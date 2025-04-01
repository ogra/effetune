class ToneControlPlugin extends PluginBase {
    static processorFunction = `
        if (!parameters.enabled) return data;
        
        const { bs, md, tr, channelCount, blockSize, sampleRate } = parameters;
        
        // Initialize filter states in context if not exists
        // Filter states for second-order filters for bass, mid, and treble (x1, x2, y1, y2)
        if (!context.initialized) {
            context.filterStates = {
                // Bass filter states (low-shelf)
                bass1: new Array(channelCount).fill(0),
                bass2: new Array(channelCount).fill(0),
                bass3: new Array(channelCount).fill(0),
                bass4: new Array(channelCount).fill(0),
                // Mid filter states (peaking)
                mid1: new Array(channelCount).fill(0),
                mid2: new Array(channelCount).fill(0),
                mid3: new Array(channelCount).fill(0),
                mid4: new Array(channelCount).fill(0),
                // Treble filter states (high-shelf)
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
        const sr = sampleRate; // Local sample rate

        // --- Low Shelf filter coefficient calculation ---
        // fc = 100Hz, using S=1 for shelving filter
        let A = Math.pow(10, bs / 40); // A = 10^(bs/40)
        let omega = 2 * Math.PI * 100 / sr;
        let cosw = Math.cos(omega);
        let sinw = Math.sin(omega);
        // For shelving filter, alpha = sin(omega)/2 * sqrt(2) with S=1
        let alpha = sinw / 2 * Math.sqrt(2);
        let bassB0 = A * ((A + 1) - (A - 1) * cosw + 2 * Math.sqrt(A) * alpha);
        let bassB1 = 2 * A * ((A - 1) - (A + 1) * cosw);
        let bassB2 = A * ((A + 1) - (A - 1) * cosw - 2 * Math.sqrt(A) * alpha);
        let bassA0 = (A + 1) + (A - 1) * cosw + 2 * Math.sqrt(A) * alpha;
        let bassA1 = -2 * ((A - 1) + (A + 1) * cosw);
        let bassA2 = (A + 1) + (A - 1) * cosw - 2 * Math.sqrt(A) * alpha;
        // Normalize coefficients
        bassB0 /= bassA0; bassB1 /= bassA0; bassB2 /= bassA0;
        bassA1 /= bassA0; bassA2 /= bassA0;
        
        // --- Mid filter coefficient calculation (Peaking) ---
        // fc = 1000Hz, Q = 0.7
        A = Math.pow(10, md / 40);
        omega = 2 * Math.PI * 1000 / sr;
        cosw = Math.cos(omega);
        sinw = Math.sin(omega);
        let Q = 0.7; // Q value for mid band is set to 0.7
        alpha = sinw / (2 * Q);
        let midB0 = 1 + alpha * A;
        let midB1 = -2 * cosw;
        let midB2 = 1 - alpha * A;
        let midA0 = 1 + alpha / A;
        let midA1 = -2 * cosw;
        let midA2 = 1 - alpha / A;
        midB0 /= midA0; midB1 /= midA0; midB2 /= midA0;
        midA1 /= midA0; midA2 /= midA0;
        
        // --- High Shelf filter coefficient calculation ---
        // fc = 10000Hz, using S=1 for shelving filter
        A = Math.pow(10, tr / 40);
        omega = 2 * Math.PI * 10000 / sr;
        cosw = Math.cos(omega);
        sinw = Math.sin(omega);
        alpha = sinw / 2 * Math.sqrt(2);
        let trebleB0 = A * ((A + 1) + (A - 1) * cosw + 2 * Math.sqrt(A) * alpha);
        let trebleB1 = -2 * A * ((A - 1) + (A + 1) * cosw);
        let trebleB2 = A * ((A + 1) + (A - 1) * cosw - 2 * Math.sqrt(A) * alpha);
        let trebleA0 = (A + 1) - (A - 1) * cosw + 2 * Math.sqrt(A) * alpha;
        let trebleA1 = 2 * ((A - 1) - (A + 1) * cosw);
        let trebleA2 = (A + 1) - (A - 1) * cosw - 2 * Math.sqrt(A) * alpha;
        trebleB0 /= trebleA0; trebleB1 /= trebleA0; trebleB2 /= trebleA0;
        trebleA1 /= trebleA0; trebleA2 /= trebleA0;
        
        // --- Process each sample per channel using cascade of filters ---
        for (let ch = 0; ch < channelCount; ch++) {
            const offset = ch * blockSize;
            for (let i = 0; i < blockSize; i++) {
                let x = data[offset + i];
                let y = x;
                
                // Process Bass filter (Low Shelf)
                if ((bs >= 0 ? bs : -bs) > 1e-6) {
                    let x0 = y;
                    let y0 = bassB0 * x0 + bassB1 * filterStates.bass1[ch] + bassB2 * filterStates.bass2[ch]
                             - bassA1 * filterStates.bass3[ch] - bassA2 * filterStates.bass4[ch];
                    filterStates.bass2[ch] = filterStates.bass1[ch];
                    filterStates.bass1[ch] = x0;
                    filterStates.bass4[ch] = filterStates.bass3[ch];
                    filterStates.bass3[ch] = y0;
                    y = y0;
                }
                
                // Process Mid filter (Peaking)
                if ((md >= 0 ? md : -md) > 1e-6) {
                    let x0 = y;
                    let y0 = midB0 * x0 + midB1 * filterStates.mid1[ch] + midB2 * filterStates.mid2[ch]
                             - midA1 * filterStates.mid3[ch] - midA2 * filterStates.mid4[ch];
                    filterStates.mid2[ch] = filterStates.mid1[ch];
                    filterStates.mid1[ch] = x0;
                    filterStates.mid4[ch] = filterStates.mid3[ch];
                    filterStates.mid3[ch] = y0;
                    y = y0;
                }
                
                // Process Treble filter (High Shelf)
                if ((tr >= 0 ? tr : -tr) > 1e-6) {
                    let x0 = y;
                    let y0 = trebleB0 * x0 + trebleB1 * filterStates.treble1[ch] + trebleB2 * filterStates.treble2[ch]
                             - trebleA1 * filterStates.treble3[ch] - trebleA2 * filterStates.treble4[ch];
                    filterStates.treble2[ch] = filterStates.treble1[ch];
                    filterStates.treble1[ch] = x0;
                    filterStates.treble4[ch] = filterStates.treble3[ch];
                    filterStates.treble3[ch] = y0;
                    y = y0;
                }
                
                data[offset + i] = y;
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
        this.enabled = true;
        
        // Register processor function
        this.registerProcessor(ToneControlPlugin.processorFunction);
    }

    // Parameter setters
    setBass(value) {
        const parsedValue = typeof value === 'number' ? value : parseFloat(value);
        this.bs = parsedValue < -24 ? -24 : (parsedValue > 24 ? 24 : parsedValue);
        this.updateParameters();
    }

    setMid(value) {
        const parsedValue = typeof value === 'number' ? value : parseFloat(value);
        this.md = parsedValue < -24 ? -24 : (parsedValue > 24 ? 24 : parsedValue);
        this.updateParameters();
    }

    setTreble(value) {
        const parsedValue = typeof value === 'number' ? value : parseFloat(value);
        this.tr = parsedValue < -24 ? -24 : (parsedValue > 24 ? 24 : parsedValue);
        this.updateParameters();
    }

    // Reset all parameters to defaults
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
        
        const bassSliderId = `${this.id}-${this.name}-bass-slider`;
        const bassValueId = `${this.id}-${this.name}-bass-value`;
        
        const bassLabel = document.createElement('label');
        bassLabel.textContent = 'Bass (dB):';
        bassLabel.htmlFor = bassSliderId;
        
        const bassSlider = document.createElement('input');
        bassSlider.type = 'range';
        bassSlider.id = bassSliderId;
        bassSlider.name = bassSliderId;
        bassSlider.min = -24;
        bassSlider.max = 24;
        bassSlider.step = 0.1;
        bassSlider.value = this.bs;
        bassSlider.autocomplete = "off";
        
        const bassValue = document.createElement('input');
        bassValue.type = 'number';
        bassValue.id = bassValueId;
        bassValue.name = bassValueId;
        bassValue.min = -24;
        bassValue.max = 24;
        bassValue.step = 0.1;
        bassValue.value = this.bs;
        bassValue.autocomplete = "off";

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
        
        const midSliderId = `${this.id}-${this.name}-mid-slider`;
        const midValueId = `${this.id}-${this.name}-mid-value`;
        
        const midLabel = document.createElement('label');
        midLabel.textContent = 'Mid (dB):';
        midLabel.htmlFor = midSliderId;
        
        const midSlider = document.createElement('input');
        midSlider.type = 'range';
        midSlider.id = midSliderId;
        midSlider.name = midSliderId;
        midSlider.min = -24;
        midSlider.max = 24;
        midSlider.step = 0.1;
        midSlider.value = this.md;
        midSlider.autocomplete = "off";
        
        const midValue = document.createElement('input');
        midValue.type = 'number';
        midValue.id = midValueId;
        midValue.name = midValueId;
        midValue.min = -24;
        midValue.max = 24;
        midValue.step = 0.1;
        midValue.value = this.md;
        midValue.autocomplete = "off";

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
        
        const trebleSliderId = `${this.id}-${this.name}-treble-slider`;
        const trebleValueId = `${this.id}-${this.name}-treble-value`;
        
        const trebleLabel = document.createElement('label');
        trebleLabel.textContent = 'Treble (dB):';
        trebleLabel.htmlFor = trebleSliderId;
        
        const trebleSlider = document.createElement('input');
        trebleSlider.type = 'range';
        trebleSlider.id = trebleSliderId;
        trebleSlider.name = trebleSliderId;
        trebleSlider.min = -24;
        trebleSlider.max = 24;
        trebleSlider.step = 0.1;
        trebleSlider.value = this.tr;
        trebleSlider.autocomplete = "off";
        
        const trebleValue = document.createElement('input');
        trebleValue.type = 'number';
        trebleValue.id = trebleValueId;
        trebleValue.name = trebleValueId;
        trebleValue.min = -24;
        trebleValue.max = 24;
        trebleValue.step = 0.1;
        trebleValue.value = this.tr;
        trebleValue.autocomplete = "off";

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

        // Append all elements to container
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
        const sr = 44100; // Standard sample rate

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw grid (vertical: frequency, horizontal: dB)
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;

        const freqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
        freqs.forEach(freq => {
            const x = width * (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            if (freq !== 20 && freq !== 20000) {
                ctx.fillStyle = '#666';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(freq >= 1000 ? (freq/1000) + 'k' : freq, x, height - 40);
            }
        });

        const dBs = [-24, -18, -12, -6, 0, 6, 12, 18, 24];
        dBs.forEach(db => {
            const y = height * (1 - (db + 24) / 48);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            if (db !== -24 && db !== 24) {
                ctx.fillStyle = '#666';
                ctx.font = '20px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(db + 'dB', 80, y + 6);
            }
        });

        // Draw axis labels
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Frequency (Hz)', width/2, height - 5);
        ctx.save();
        ctx.translate(20, height/2);
        ctx.rotate(-Math.PI/2);
        ctx.fillText('Level (dB)', 0, 0);
        ctx.restore();

        // Draw frequency response curve
        ctx.beginPath();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;

        // Helper function: compute second-order IIR frequency response using z-transform
        function computeResponse(b0, b1, b2, a1, a2, w) {
            const cosw = Math.cos(w), sinw = Math.sin(w);
            // z^-1 = cos(w) - j*sin(w), z^-2 = cos(2w) - j*sin(2w)
            const numRe = b0 + b1 * cosw + b2 * Math.cos(2*w);
            const numIm = 0 - b1 * sinw - b2 * Math.sin(2*w);
            const denRe = 1 + a1 * cosw + a2 * Math.cos(2*w);
            const denIm = 0 - a1 * sinw - a2 * Math.sin(2*w);
            const numMag = Math.sqrt(numRe*numRe + numIm*numIm);
            const denMag = Math.sqrt(denRe*denRe + denIm*denIm);
            return numMag / denMag;
        }
        
        for (let i = 0; i < width; i++) {
            // Map frequency logarithmically from 20Hz to 20kHz
            const freq = Math.pow(10, Math.log10(20) + (i/width)*(Math.log10(20000)-Math.log10(20)));
            const w = 2 * Math.PI * freq / sr;
            
            // Low Shelf response
            let A_b = Math.pow(10, this.bs / 40);
            let omega_b = 2 * Math.PI * 100 / sr;
            let cosw_b = Math.cos(omega_b);
            let sinw_b = Math.sin(omega_b);
            let alpha_b = sinw_b / 2 * Math.sqrt(2);
            let b0_b = A_b * ((A_b + 1) - (A_b - 1)*cosw_b + 2*Math.sqrt(A_b)*alpha_b);
            let b1_b = 2 * A_b * ((A_b - 1) - (A_b + 1)*cosw_b);
            let b2_b = A_b * ((A_b + 1) - (A_b - 1)*cosw_b - 2*Math.sqrt(A_b)*alpha_b);
            let a0_b = (A_b + 1) + (A_b - 1)*cosw_b + 2*Math.sqrt(A_b)*alpha_b;
            let a1_b = -2 * ((A_b - 1) + (A_b + 1)*cosw_b);
            let a2_b = (A_b + 1) + (A_b - 1)*cosw_b - 2*Math.sqrt(A_b)*alpha_b;
            b0_b /= a0_b; b1_b /= a0_b; b2_b /= a0_b;
            a1_b /= a0_b; a2_b /= a0_b;
            const H_b = (this.bs !== 0) ? computeResponse(b0_b, b1_b, b2_b, a1_b, a2_b, w) : 1;
            
            // Mid Peaking response with Q = 0.7
            let A_m = Math.pow(10, this.md / 40);
            let omega_m = 2 * Math.PI * 1000 / sr;
            let cosw_m = Math.cos(omega_m);
            let sinw_m = Math.sin(omega_m);
            // Set Q to 0.7 for mid band
            let Q_m = 0.7;
            let alpha_m = sinw_m / (2 * Q_m);
            let b0_m = 1 + alpha_m * A_m;
            let b1_m = -2 * cosw_m;
            let b2_m = 1 - alpha_m * A_m;
            let a0_m = 1 + alpha_m / A_m;
            let a1_m = -2 * cosw_m;
            let a2_m = 1 - alpha_m / A_m;
            b0_m /= a0_m; b1_m /= a0_m; b2_m /= a0_m;
            a1_m /= a0_m; a2_m /= a0_m;
            const H_m = (this.md !== 0) ? computeResponse(b0_m, b1_m, b2_m, a1_m, a2_m, w) : 1;
            
            // High Shelf response
            let A_t = Math.pow(10, this.tr / 40);
            let omega_t = 2 * Math.PI * 10000 / sr;
            let cosw_t = Math.cos(omega_t);
            let sinw_t = Math.sin(omega_t);
            let alpha_t = sinw_t / 2 * Math.sqrt(2);
            let b0_t = A_t * ((A_t + 1) + (A_t - 1)*cosw_t + 2*Math.sqrt(A_t)*alpha_t);
            let b1_t = -2 * A_t * ((A_t - 1) + (A_t + 1)*cosw_t);
            let b2_t = A_t * ((A_t + 1) + (A_t - 1)*cosw_t - 2*Math.sqrt(A_t)*alpha_t);
            let a0_t = (A_t + 1) - (A_t - 1)*cosw_t + 2*Math.sqrt(A_t)*alpha_t;
            let a1_t = 2 * ((A_t - 1) - (A_t + 1)*cosw_t);
            let a2_t = (A_t + 1) - (A_t - 1)*cosw_t - 2*Math.sqrt(A_t)*alpha_t;
            b0_t /= a0_t; b1_t /= a0_t; b2_t /= a0_t;
            a1_t /= a0_t; a2_t /= a0_t;
            const H_t = (this.tr !== 0) ? computeResponse(b0_t, b1_t, b2_t, a1_t, a2_t, w) : 1;
            
            const H_total = H_b * H_m * H_t;
            const dB = 20 * Math.log10(H_total);
            const yPos = height * (1 - (dB + 24) / 48);
            
            if (i === 0) {
                ctx.moveTo(i, yPos);
            } else {
                ctx.lineTo(i, yPos);
            }
        }
        ctx.stroke();
    }
}

// Register plugin in browser environment
if (typeof window !== 'undefined') {
    window.ToneControlPlugin = ToneControlPlugin;
}
