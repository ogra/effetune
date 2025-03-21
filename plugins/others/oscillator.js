class OscillatorPlugin extends PluginBase {
    constructor() {
        super('Oscillator', 'Audio signal generator with multiple waveforms');
        
        // Initialize parameters with shortened names
        this.fr = 880;    // frequency: Default frequency in Hz
        this.vl = -12;    // volume: Default volume in dB
        this.pn = 0;      // panning: -1 = left, 0 = center, 1 = right
        this.wf = 'sine'; // waveform
        
        // Register processor function
        this.registerProcessor(`
            if (!parameters.enabled) return data;
            
            // Initialize or update context state
            context.phase = context.phase || 0;
            context.pinkNoiseState = context.pinkNoiseState || new Array(16).fill(0);

            const frequency = parameters.fr;
            const volume = Math.pow(10, parameters.vl / 20); // Convert dB to linear gain
            const panning = parameters.pn;
            const waveform = parameters.wf;
            // Get actual sample rate from parameters
            const sampleRate = parameters.sampleRate;
            const phaseIncrement = (2 * Math.PI * frequency) / sampleRate;

            // Generate samples first to ensure phase consistency across channels
            // This prevents phase discontinuities at buffer boundaries
            const samples = new Array(parameters.blockSize);
            for (let i = 0; i < parameters.blockSize; i++) {
                if (waveform === 'white') {
                    samples[i] = Math.random() * 2 - 1;
                } else if (waveform === 'pink') {
                    // Pink noise using Voss-McCartney algorithm
                    const row = Math.floor(Math.random() * 16);
                    context.pinkNoiseState[row] = Math.random() * 2 - 1;
                    samples[i] = context.pinkNoiseState.reduce((a, b) => a + b) / 16;
                } else {
                    // Oscillator waveforms
                    switch (waveform) {
                        case 'sine':
                            samples[i] = Math.sin(context.phase);
                            break;
                        case 'square':
                            samples[i] = context.phase < Math.PI ? 1 : -1;
                            break;
                        case 'triangle':
                            // Triangle wave generation with correct frequency
                            samples[i] = 2 * Math.abs(2 * (context.phase / (2 * Math.PI) - Math.floor(context.phase / (2 * Math.PI) + 0.5))) - 1;
                            break;
                        case 'sawtooth':
                            samples[i] = (context.phase / Math.PI - 1);
                            break;
                    }

                    // Update phase for oscillator waveforms
                    // Important: Phase update must be done here, not in the channel loop
                    // to maintain phase continuity across buffer boundaries
                    if (waveform !== 'white' && waveform !== 'pink') {
                        context.phase += phaseIncrement;
                        if (context.phase >= 2 * Math.PI) {
                            context.phase -= 2 * Math.PI;
                        }
                    }
                }
            }

            // Apply volume and panning to each channel
            // Mix with input instead of overwriting
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                const panGain = ch === 0 ? 
                    Math.cos((panning + 1) * Math.PI / 4) : // Left channel
                    Math.cos((1 - panning) * Math.PI / 4);  // Right channel

                // Mix samples with input
                for (let i = 0; i < parameters.blockSize; i++) {
                    data[offset + i] = data[offset + i] + (samples[i] * volume * panGain);
                }
            }

            return data;
        `);
    }

    // Parameter setters with validation
    setFrequency(value) {
        this.fr = Math.max(20, Math.min(96000, 
            typeof value === 'number' ? value : parseFloat(value)
        ));
        this.updateParameters();
    }

    setVolume(value) {
        this.vl = Math.max(-96, Math.min(0, 
            typeof value === 'number' ? value : parseFloat(value)
        ));
        this.updateParameters();
    }

    setPanning(value) {
        this.pn = Math.max(-1, Math.min(1, 
            typeof value === 'number' ? value : parseFloat(value)
        ));
        this.updateParameters();
    }

    setWaveform(value) {
        if (['sine', 'square', 'triangle', 'sawtooth', 'white', 'pink'].includes(value)) {
            this.wf = value;
            this.updateParameters();
        }
    }

    // Get current parameters
    getParameters() {
        return {
            type: this.constructor.name,
            enabled: this.enabled,
            fr: this.fr,
            vl: this.vl,
            pn: this.pn,
            wf: this.wf
        };
    }

    // Set parameters with validation
    setParameters(params) {
        if (params.fr !== undefined) this.setFrequency(params.fr);
        if (params.vl !== undefined) this.setVolume(params.vl);
        if (params.pn !== undefined) this.setPanning(params.pn);
        if (params.wf !== undefined) this.setWaveform(params.wf);
        this.updateParameters();
    }

    // Create UI
    createUI() {
        const container = document.createElement('div');
        container.className = 'plugin-parameter-ui';

        // Frequency Control
        const freqRow = document.createElement('div');
        freqRow.className = 'parameter-row';
        
        const freqLabel = document.createElement('label');
        freqLabel.textContent = 'Frequency (Hz):';
        freqLabel.htmlFor = `${this.id}-${this.name}-frequency-slider`;
        
        const freqSlider = document.createElement('input');
        freqSlider.type = 'range';
        freqSlider.min = '0';
        freqSlider.max = '100000';
        freqSlider.value = this.mapFrequencyToSlider(this.fr);
        freqSlider.id = `${this.id}-${this.name}-frequency-slider`;
        freqSlider.name = `${this.id}-${this.name}-frequency-slider`;
        freqSlider.autocomplete = "off";
        
        const freqValue = document.createElement('input');
        freqValue.type = 'number';
        freqValue.min = '20';
        freqValue.max = '96000';
        freqValue.step = '1';
        freqValue.value = this.fr;
        freqValue.id = `${this.id}-${this.name}-frequency-value`;
        freqValue.name = `${this.id}-${this.name}-frequency-value`;
        freqValue.autocomplete = "off";

        freqSlider.addEventListener('input', (e) => {
            const freq = this.mapSliderToFrequency(e.target.value);
            freqValue.value = freq;
            this.setFrequency(freq);
        });

        freqValue.addEventListener('input', (e) => {
            const freq = parseFloat(e.target.value);
            freqSlider.value = this.mapFrequencyToSlider(freq);
            this.setFrequency(freq);
        });

        freqRow.appendChild(freqLabel);
        freqRow.appendChild(freqSlider);
        freqRow.appendChild(freqValue);

        // Volume Control
        const volRow = document.createElement('div');
        volRow.className = 'parameter-row';
        
        const volLabel = document.createElement('label');
        volLabel.textContent = 'Volume (dB):';
        volLabel.htmlFor = `${this.id}-${this.name}-volume-slider`;
        
        const volSlider = document.createElement('input');
        volSlider.type = 'range';
        volSlider.min = '-96';
        volSlider.max = '0';
        volSlider.value = this.vl;
        volSlider.id = `${this.id}-${this.name}-volume-slider`;
        volSlider.name = `${this.id}-${this.name}-volume-slider`;
        volSlider.autocomplete = "off";
        
        const volValue = document.createElement('input');
        volValue.type = 'number';
        volValue.min = '-96';
        volValue.max = '0';
        volValue.step = '0.1';
        volValue.value = this.vl;
        volValue.id = `${this.id}-${this.name}-volume-value`;
        volValue.name = `${this.id}-${this.name}-volume-value`;
        volValue.autocomplete = "off";

        volSlider.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            volValue.value = vol;
            this.setVolume(vol);
        });

        volValue.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            volSlider.value = vol;
            this.setVolume(vol);
        });

        volRow.appendChild(volLabel);
        volRow.appendChild(volSlider);
        volRow.appendChild(volValue);

        // Panning Control
        const panRow = document.createElement('div');
        panRow.className = 'parameter-row';
        
        const panLabel = document.createElement('label');
        panLabel.textContent = 'Panning (L/R):';
        
        const panRadioGroup = document.createElement('div');
        panRadioGroup.className = 'radio-group';
        
        ['Center', 'Left', 'Right'].forEach((label, index) => {
            const value = index === 1 ? -1 : index === 2 ? 1 : 0;
            const radioId = `${this.id}-${this.name}-panning-${label.toLowerCase()}`;
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `${this.id}-${this.name}-panning`;
            radio.id = radioId;
            radio.value = value;
            radio.checked = this.pn === value;
            radio.autocomplete = "off";
            radio.addEventListener('change', () => this.setPanning(value));
            
            const radioLabel = document.createElement('label');
            radioLabel.htmlFor = radioId;
            radioLabel.appendChild(radio);
            radioLabel.appendChild(document.createTextNode(label));
            panRadioGroup.appendChild(radioLabel);
        });

        panRow.appendChild(panLabel);
        panRow.appendChild(panRadioGroup);

        // Waveform Selection
        const waveRow = document.createElement('div');
        waveRow.className = 'parameter-row';
        
        const waveLabel = document.createElement('label');
        waveLabel.textContent = 'Waveform Type:';
        
        const waveRadioGroup = document.createElement('div');
        waveRadioGroup.className = 'radio-group';
        
        [
            ['sine', 'Sine'],
            ['sawtooth', 'Sawtooth'],
            ['triangle', 'Triangle'],
            ['square', 'Square'],
            ['white', 'White Noise'],
            ['pink', 'Pink Noise']
        ].forEach(([value, label]) => {
            const radioId = `${this.id}-${this.name}-waveform-${value}`;
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `${this.id}-${this.name}-waveform`;
            radio.id = radioId;
            radio.value = value;
            radio.checked = this.wf === value;
            radio.autocomplete = "off";
            radio.addEventListener('change', () => {
                this.setWaveform(value);
                freqSlider.disabled = value === 'white' || value === 'pink';
                freqValue.disabled = value === 'white' || value === 'pink';
            });
            
            const radioLabel = document.createElement('label');
            radioLabel.htmlFor = radioId;
            radioLabel.appendChild(radio);
            radioLabel.appendChild(document.createTextNode(label));
            waveRadioGroup.appendChild(radioLabel);
        });

        waveRow.appendChild(waveLabel);
        waveRow.appendChild(waveRadioGroup);

        // Add all controls to container
        container.appendChild(freqRow);
        container.appendChild(volRow);
        container.appendChild(panRow);
        container.appendChild(waveRow);

        return container;
    }

    // Utility functions for frequency mapping
    mapFrequencyToSlider(freq) {
        const minFreq = 20;
        const maxFreq = 96000;
        const scale = Math.log(maxFreq / minFreq);
        return Math.round((Math.log(freq / minFreq) / scale) * 100000);
    }

    mapSliderToFrequency(value) {
        const minFreq = 20;
        const maxFreq = 96000;
        const scale = Math.log(maxFreq / minFreq);
        return Math.round(minFreq * Math.exp((value / 100000) * scale));
    }

    // Reset all parameters to default values
    reset() {
        this.setFrequency(880);
        this.setVolume(-12);
        this.setPanning(0);
        this.setWaveform('sine');
    }
}

// Register the plugin
window.OscillatorPlugin = OscillatorPlugin;
