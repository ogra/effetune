
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
        const NUM_BANDS = 15;
        const { channelCount, blockSize } = parameters;
        
        // Initialize context if not exists
        if (!context.initialized) {
            // Use arrays indexed by band number for faster access instead of object properties
            context.filterStates = new Array(NUM_BANDS);
            context.coefficients = new Array(NUM_BANDS);
            context.previousGains = new Array(NUM_BANDS).fill(0);
            for (let i = 0; i < NUM_BANDS; i++) {
                context.filterStates[i] = {
                    x1: new Array(channelCount).fill(0),
                    x2: new Array(channelCount).fill(0),
                    y1: new Array(channelCount).fill(0),
                    y2: new Array(channelCount).fill(0)
                };
                context.coefficients[i] = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };
            }
            context.initialized = true;
        }
        
        // Reset states if channel count changes
        if (context.filterStates[0].x1.length !== channelCount) {
            for (let i = 0; i < NUM_BANDS; i++) {
                context.filterStates[i] = {
                    x1: new Array(channelCount).fill(0),
                    x2: new Array(channelCount).fill(0),
                    y1: new Array(channelCount).fill(0),
                    y2: new Array(channelCount).fill(0)
                };
            }
        }
        
        const frequencies = [25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000];
        const Q = 2.1;
        const TWO_PI = 2 * Math.PI;
        
        // Update coefficients only if gains have changed
        for (let i = 0; i < NUM_BANDS; i++) {
            const currentGain = parameters['b' + i];
            if (currentGain !== context.previousGains[i]) {
                const linearGain = Math.pow(10, currentGain / 20);
                const freq = frequencies[i];
                const w0 = TWO_PI * freq / sampleRate;
                
                // Optimize trigonometric calculations
                const sinw0 = Math.sin(w0);
                const cosw0 = Math.cos(w0);
                const alpha = sinw0 / (2 * Q);
                
                // Calculate coefficients once
                const sqrtGain = Math.sqrt(linearGain);
                const alphaTimesA = alpha * sqrtGain;
                const alphaOverA = alpha / sqrtGain;
                
                const a0 = 1 + alphaOverA;
                const a1 = -2 * cosw0;
                const a2 = 1 - alphaOverA;
                const b0 = 1 + alphaTimesA;
                const b1 = a1;
                const b2 = 1 - alphaTimesA;
                
                // Store normalized coefficients
                const coef = context.coefficients[i];
                coef.b0 = b0 / a0;
                coef.b1 = b1 / a0;
                coef.b2 = b2 / a0;
                coef.a1 = a1 / a0;
                coef.a2 = a2 / a0;
                
                context.previousGains[i] = currentGain;
            }
        }
        
        // Process each band
        for (let bandIndex = 0; bandIndex < NUM_BANDS; bandIndex++) {
            // Skip processing if gain is effectively zero
            if (Math.abs(parameters['b' + bandIndex]) < 0.01) continue;
            
            const states = context.filterStates[bandIndex];
            const coef = context.coefficients[bandIndex];
            
            // Process based on selected channel
            const ch = parameters.ch;
            if (ch === 'All') {
                // Process all channels
                for (let ch = 0; ch < channelCount; ch++) {
                    const offset = ch * blockSize;
                    // Load channel state into local variables to reduce repeated property lookups
                    let x1 = states.x1[ch];
                    let x2 = states.x2[ch];
                    let y1 = states.y1[ch];
                    let y2 = states.y2[ch];
                    
                    // Process each sample in the block
                    for (let i = 0; i < blockSize; i++) {
                        const sample = data[offset + i];
                        const y0 = coef.b0 * sample + coef.b1 * x1 + coef.b2 * x2 - coef.a1 * y1 - coef.a2 * y2;
                        // Update local states
                        x2 = x1;
                        x1 = sample;
                        y2 = y1;
                        y1 = y0;
                        data[offset + i] = y0;
                    }
                    
                    // Store back updated states for this channel
                    states.x1[ch] = x1;
                    states.x2[ch] = x2;
                    states.y1[ch] = y1;
                    states.y2[ch] = y2;
                }
            } else {
                // Process only selected channel (Left = 0, Right = 1)
                const targetCh = ch === 'Left' ? 0 : 1;
                if (targetCh < channelCount) {
                    const offset = targetCh * blockSize;
                    let x1 = states.x1[targetCh];
                    let x2 = states.x2[targetCh];
                    let y1 = states.y1[targetCh];
                    let y2 = states.y2[targetCh];
                    
                    for (let i = 0; i < blockSize; i++) {
                        const sample = data[offset + i];
                        const y0 = coef.b0 * sample + coef.b1 * x1 + coef.b2 * x2 - coef.a1 * y1 - coef.a2 * y2;
                        x2 = x1;
                        x1 = sample;
                        y2 = y1;
                        y1 = y0;
                        data[offset + i] = y0;
                    }
                    
                    states.x1[targetCh] = x1;
                    states.x2[targetCh] = x2;
                    states.y1[targetCh] = y1;
                    states.y2[targetCh] = y2;
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
        
        // Initialize channel parameter
        this.ch = 'All';  // 'All', 'Left', or 'Right'
        
        this.registerProcessor(FifteenBandGEQPlugin.processorFunction);
    }

    // Set band gain (-12 to +12 dB)
    setBand(index, value) {
        this['b' + index] = value;
        this.updateParameters();
    }

    // Set channel
    setChannel(value) {
        if (['All', 'Left', 'Right'].includes(value)) {
            this.ch = value;
            this.updateParameters();
        }
    }

    // Reset all bands to default values
    reset() {
        for (let i = 0; i < 15; i++) {
            this.setBand(i, 0);
        }
        this.setChannel('All');
    }

    getParameters() {
        const params = {
            type: this.constructor.name,
            enabled: this.enabled,
            ch: this.ch
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
        
        if (params.ch !== undefined) {
            this.setChannel(params.ch);
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

        // Channel selector row
        const channelRow = document.createElement('div');
        channelRow.className = 'parameter-row';
        
        const channelLabel = document.createElement('label');
        channelLabel.textContent = 'Channel:';
        channelLabel.htmlFor = `${this.id}-${this.name}-channel-All`; // Associate with the first radio button
        
        const channels = ['All', 'Left', 'Right'];
        const channelRadios = channels.map(ch => {
            const label = document.createElement('label');
            label.className = 'fifteen-band-geq-radio-label';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.id = `${this.id}-${this.name}-channel-${ch}`;
            radio.name = `${this.id}-${this.name}-channel`;
            radio.value = ch;
            radio.checked = ch === this.ch;
            radio.autocomplete = "off";
            
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.setChannel(e.target.value);
                }
            });
            
            label.htmlFor = radio.id;
            label.appendChild(radio);
            label.appendChild(document.createTextNode(ch));
            return label;
        });

        channelRow.appendChild(channelLabel);
        channelRadios.forEach(radio => channelRow.appendChild(radio));

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
            const freqLabel = document.createElement('label');
            freqLabel.className = 'freq-label';
            freqLabel.textContent = band.name;
            const sliderId = `${this.id}-${this.name}-band-${index}-slider`;
            freqLabel.htmlFor = sliderId;

            // Vertical slider
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'vertical-slider';
            slider.id = sliderId;
            slider.name = sliderId;
            slider.min = -12;
            slider.max = 12;
            slider.step = 0.1;
            slider.value = this['b' + index];
            slider.autocomplete = "off";
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
            // Update channel radios
            channelRadios.forEach(label => {
                const radio = label.querySelector('input');
                radio.checked = radio.value === 'All';
            });
            this.drawGraph(canvas);
        });
        graphContainer.appendChild(resetButton);

        // Add all elements to container
        container.appendChild(channelRow);
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

            // Calculate response from non-zero gain bands only
            for (let index = 0; index < FifteenBandGEQPlugin.BANDS.length; index++) {
                const gain = this['b' + index];
                // Skip calculation if gain is effectively zero
                if (Math.abs(gain) < 0.01) continue;
                
                const bandFreq = FifteenBandGEQPlugin.BANDS[index].freq;
                const bandResponse = gain * Math.exp(-Math.pow(Math.log(freq/bandFreq), 2) / (2 * Math.pow(0.5, 2)));
                totalResponse += bandResponse;
            }

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
