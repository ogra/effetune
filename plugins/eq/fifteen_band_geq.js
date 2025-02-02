class FifteenBandGEQPlugin extends PluginBase {
    static BANDS = [
        { freq: 25, name: '25 Hz' },
        { freq: 40, name: '40 Hz' },
        { freq: 63, name: '63 Hz' },
        { freq: 100, name: '100 Hz' },
        { freq: 160, name: '160 Hz' },
        { freq: 250, name: '250 Hz' },
        { freq: 400, name: '400 Hz' },
        { freq: 630, name: '630 Hz' },
        { freq: 1000, name: '1.0 kHz' },
        { freq: 1600, name: '1.6 kHz' },
        { freq: 2500, name: '2.5 kHz' },
        { freq: 4000, name: '4.0 kHz' },
        { freq: 6300, name: '6.3 kHz' },
        { freq: 10000, name: '10 kHz' },
        { freq: 16000, name: '16 kHz' }
    ];

    static processorFunction = `
        if (!parameters.enabled) return data;
        
        const { channelCount, blockSize } = parameters;
        
        // Initialize filter states in context if not exists
        if (!context.initialized) {
            context.filterStates = {};
            for (let i = 0; i < 15; i++) {
                // Each band needs 4 states for a biquad filter
                // b0-b14: Band 0-14 filter states
                context.filterStates['b' + i] = {
                    x1: new Array(channelCount).fill(0),
                    x2: new Array(channelCount).fill(0),
                    y1: new Array(channelCount).fill(0),
                    y2: new Array(channelCount).fill(0)
                };
            }
            context.initialized = true;
        }

        // Reset filter states if channel count changes
        if (context.filterStates.b0.x1.length !== channelCount) {
            for (let i = 0; i < 15; i++) {
                context.filterStates['b' + i] = {
                    x1: new Array(channelCount).fill(0),
                    x2: new Array(channelCount).fill(0),
                    y1: new Array(channelCount).fill(0),
                    y2: new Array(channelCount).fill(0)
                };
            }
        }

        // Band frequencies
        const frequencies = [25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000];
        const Q = 2.1; // Q factor for all bands

        // Process each band
        for (let bandIndex = 0; bandIndex < 15; bandIndex++) {
            // Map shortened parameter names to their original names for clarity
            const gain = Math.pow(10, parameters['b' + bandIndex] / 20); // Convert dB to linear gain
            const freq = frequencies[bandIndex];
            
            // Calculate filter coefficients
            const w0 = 2 * Math.PI * freq / sampleRate;
            const alpha = Math.sin(w0) / (2 * Q);
            const cosw0 = Math.cos(w0);
            
            // Peaking EQ filter coefficients
            const A = Math.sqrt(gain);
            
            const b0 = 1 + alpha * A;
            const b1 = -2 * cosw0;
            const b2 = 1 - alpha * A;
            const a0 = 1 + alpha / A;
            const a1 = -2 * cosw0;
            const a2 = 1 - alpha / A;
            
            // Normalize coefficients
            const norm_b0 = b0 / a0;
            const norm_b1 = b1 / a0;
            const norm_b2 = b2 / a0;
            const norm_a1 = a1 / a0;
            const norm_a2 = a2 / a0;
            
            const states = context.filterStates['b' + bandIndex];
            
            // Process each channel
            for (let ch = 0; ch < channelCount; ch++) {
                const offset = ch * blockSize;
                
                // Process samples
                for (let i = 0; i < blockSize; i++) {
                    const x0 = data[offset + i];
                    
                    // Apply biquad filter
                    const y0 = norm_b0 * x0 + norm_b1 * states.x1[ch] + norm_b2 * states.x2[ch] -
                              norm_a1 * states.y1[ch] - norm_a2 * states.y2[ch];
                    
                    // Update filter states
                    states.x2[ch] = states.x1[ch];
                    states.x1[ch] = x0;
                    states.y2[ch] = states.y1[ch];
                    states.y1[ch] = y0;
                    
                    data[offset + i] = y0;
                }
            }
        }
        
        return data;
    `;

    constructor() {
        super('15Band GEQ', '15-band graphic equalizer');
        
        // Initialize band gains (all 0 dB by default)
        for (let i = 0; i < 15; i++) {
            this['b' + i] = 0;  // b0-b14: Band 0-14 gains (formerly band0-band14) - Range: -12 to +12 dB
        }
        
        this.registerProcessor(FifteenBandGEQPlugin.processorFunction);
    }

    // Set band gain (-12 to +12 dB)
    setBand(index, value) {
        this['b' + index] = value;
        this.updateParameters();
    }

    // Reset all bands to default values
    reset() {
        for (let i = 0; i < 15; i++) {
            this.setBand(i, 0);
        }
    }

    getParameters() {
        const params = {
            type: this.constructor.name,
            enabled: this.enabled
        };
        
        // Add all band parameters
        for (let i = 0; i < 15; i++) {
            params['b' + i] = this['b' + i];
        }
        
        return params;
    }

    setParameters(params) {
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        
        // Update band parameters
        for (let i = 0; i < 15; i++) {
            if (params['b' + i] !== undefined) {
                this['b' + i] = params['b' + i];
            }
        }
        
        this.updateParameters();
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'fifteen-band-geq-plugin-ui plugin-parameter-ui';

        // Create sliders container
        const slidersContainer = document.createElement('div');
        slidersContainer.className = 'sliders-container';

        // Store references to sliders and value displays for reset functionality
        const sliders = [];
        const valueDisplays = [];

        // Create sliders for each band
        FifteenBandGEQPlugin.BANDS.forEach((band, index) => {
            const sliderContainer = document.createElement('div');
            sliderContainer.className = 'slider-container';

            // Frequency label
            const freqLabel = document.createElement('div');
            freqLabel.className = 'freq-label';
            freqLabel.textContent = band.name;

            // Vertical slider
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'vertical-slider';
            slider.min = -12;
            slider.max = 12;
            slider.step = 0.1;
            slider.value = this['b' + index];
            sliders.push(slider);

            // Value display
            const valueDisplay = document.createElement('div');
            valueDisplay.className = 'value-display';
            valueDisplay.textContent = this['b' + index].toFixed(1) + ' dB';
            valueDisplays.push(valueDisplay);

            // Event listeners
            slider.addEventListener('input', (e) => {
                this.setBand(index, parseFloat(e.target.value));
                valueDisplay.textContent = this['b' + index].toFixed(1) + ' dB';
                this.drawGraph(canvas);
            });

            sliderContainer.appendChild(freqLabel);
            sliderContainer.appendChild(slider);
            sliderContainer.appendChild(valueDisplay);
            slidersContainer.appendChild(sliderContainer);
        });

        // Graph container
        const graphContainer = document.createElement('div');
        graphContainer.className = 'graph-container';
        
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
            // Update all sliders and value displays
            for (let i = 0; i < 15; i++) {
                sliders[i].value = this['b' + i];
                valueDisplays[i].textContent = this['b' + i].toFixed(1) + ' dB';
            }
            this.drawGraph(canvas);
        });
        graphContainer.appendChild(resetButton);

        // Add all elements to container
        container.appendChild(slidersContainer);
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

            // Frequency labels
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

            // dB labels
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
            let totalResponse = 0;

            // Calculate response from all bands
            FifteenBandGEQPlugin.BANDS.forEach((band, index) => {
                const bandFreq = band.freq;
                const gain = this['b' + index];
                const bandResponse = gain * Math.exp(-Math.pow(Math.log(freq/bandFreq), 2) / (2 * Math.pow(0.5, 2)));
                totalResponse += bandResponse;
            });

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
    window.FifteenBandGEQPlugin = FifteenBandGEQPlugin;
}
