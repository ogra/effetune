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
            // Early exit if disabled
            if (!parameters.enabled) return data;

            // --- Parameter & Context Destructuring / Caching ---
            const { fr: frequency, vl: volumeDb, pn: panning, wf: waveform } = parameters;
            const { channelCount, blockSize, sampleRate } = parameters;

            // Initialize or retrieve context state (phase & pink noise state)
            let currentPhase = context.phase || 0.0; // Use local variable for oscillator phase

            // Initialize pink noise state only if needed and waveform is pink
            // Initialize pink noise state only if needed and waveform is pink
            if (waveform === 'pink' && (!context.pinkNoiseState || context.pinkNoiseState.length !== 7)) {
                // Use Float32Array for potential performance benefits - 7 state variables for Paul Kellett method
                context.pinkNoiseState = new Float32Array(7).fill(0.0);
            }
            // Cache pink noise state locally if waveform is pink
            const pinkNoiseState = (waveform === 'pink') ? context.pinkNoiseState : null;

            // --- Pre-calculation before Sample Loop ---
            const TWO_PI = Math.PI * 2.0;
            const ONE_OVER_PI = 1.0 / Math.PI;
            const ONE_OVER_TWO_PI = 1.0 / TWO_PI;

            // Calculate linear volume gain from dB
            const volume = (volumeDb <= -96.0) ? 0.0 : Math.pow(10.0, volumeDb / 20.0);

            // Calculate phase increment per sample for oscillators
            const safeSampleRate = (sampleRate > 0) ? sampleRate : 44100.0;
            const phaseIncrement = (TWO_PI * frequency) / safeSampleRate;

            // Pre-calculate panning gains
            let clampedPanning = panning;
            if (panning < -1.0) clampedPanning = -1.0;
            else if (panning > 1.0) clampedPanning = 1.0;
            const panAngle = (clampedPanning + 1.0) * Math.PI * 0.25;
            const panGainL = Math.cos(panAngle);
            const panGainR = Math.sin(panAngle);

            // --- Generate Source Samples (Mono) ---
            const samples = new Float32Array(blockSize); // Use Float32Array for samples

            // --- Sample Generation ---

            // Logic selection outside the main sample loop
            if (waveform === 'white') {
                // White noise generation loop
                for (let i = 0; i < blockSize; i++) {
                    samples[i] = Math.random() * 2.0 - 1.0;
                }
            } else if (waveform === 'pink' && pinkNoiseState) {
                // Paul Kellett Pink Noise Generation Loop (Adapted for mono)
                // Cache state variables locally for the inner loop (read/write)
                let b0 = pinkNoiseState[0], b1 = pinkNoiseState[1], b2 = pinkNoiseState[2], b3 = pinkNoiseState[3];
                let b4 = pinkNoiseState[4], b5 = pinkNoiseState[5], b6 = pinkNoiseState[6];

                for (let i = 0; i < blockSize; i++) {
                    const white = Math.random() * 2.0 - 1.0;

                    // Apply Paul Kellett's filter coefficients
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    b3 = 0.86650 * b3 + white * 0.3104856;
                    b4 = 0.55000 * b4 + white * 0.5329522;
                    b5 = -0.7616 * b5 - white * 0.0168980; // Note the sign difference

                    // Calculate pink noise output and scale
                    const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
                    b6 = white * 0.115926; // Update b6 state last

                    // Store the generated pink noise sample
                    samples[i] = pink;
                }

                // Update the context state array with the final values for this block
                pinkNoiseState[0] = b0; pinkNoiseState[1] = b1; pinkNoiseState[2] = b2; pinkNoiseState[3] = b3;
                pinkNoiseState[4] = b4; pinkNoiseState[5] = b5; pinkNoiseState[6] = b6;
            } else { // Oscillator Waveforms (or fallback)
                // --- Select Generator Function based on waveform string ---
                let generateSampleFunction;
                // Define generator functions using arrow functions for conciseness
                // These functions take the current phase and return the sample value.
                switch (waveform) {
                    case 'sine':
                        generateSampleFunction = (phase) => Math.sin(phase);
                        break;
                    case 'square':
                        generateSampleFunction = (phase) => (phase < Math.PI) ? 1.0 : -1.0;
                        break;
                    case 'triangle':
                        generateSampleFunction = (phase) => {
                            const normalizedPhase = phase * ONE_OVER_TWO_PI;
                            // Equivalent to 2 * abs(2 * (normalizedPhase - round(normalizedPhase))) - 1
                            const phaseValue = 2.0 * (normalizedPhase - ((normalizedPhase + 0.5) | 0));
                            const absPhaseValue = (phaseValue >= 0.0) ? phaseValue : -phaseValue; // Manual abs
                            return 2.0 * absPhaseValue - 1.0;
                        };
                        break;
                    case 'sawtooth':
                        generateSampleFunction = (phase) => phase * ONE_OVER_PI - 1.0;
                        break;
                    default: // Fallback for unknown waveforms (output silence)
                        // If waveform is not white/pink and not a known oscillator, generate silence.
                        generateSampleFunction = (phase) => 0.0;
                        break;
                }

                // --- Oscillator Sample Loop using the selected function ---
                for (let i = 0; i < blockSize; i++) {
                    // Call the selected function to generate the sample
                    samples[i] = generateSampleFunction(currentPhase);

                    // Update phase for the next sample
                    currentPhase += phaseIncrement;

                    // Wrap phase using if statements (often faster than float modulo)
                    if (currentPhase >= TWO_PI) {
                        currentPhase -= TWO_PI;
                    } else if (currentPhase < 0.0) {
                        currentPhase += TWO_PI;
                    }
                }
                // Update context phase only if an oscillator was actually processed
                context.phase = currentPhase;

            } // End waveform type check


            // --- Apply Volume, Panning, and Mix with Input ---
            for (let ch = 0; ch < channelCount; ch++) {
                const offset = ch * blockSize;
                let channelPanGain = 1.0;
                if (channelCount >= 2) {
                    channelPanGain = (ch === 0) ? panGainL : panGainR;
                    if (ch > 1) channelPanGain = 0.0; // Silence channels beyond stereo
                }
                const finalChannelGain = volume * channelPanGain;

                if (finalChannelGain !== 0.0) { // Skip processing if gain is zero
                    for (let i = 0; i < blockSize; i++) {
                        data[offset + i] += samples[i] * finalChannelGain; // Mix with input
                    }
                }
            } // End channel loop

            // --- Context State Update ---
            // Note: context.phase was updated within the oscillator block
            // Note: context.pinkNoiseState (if used) was modified directly (in-place)

            return data; // Return the modified input buffer
        `);
    }

    // Parameter setters with validation
    setFrequency(value) {
        const parsedValue = typeof value === 'number' ? value : parseFloat(value);
        this.fr = parsedValue < 20 ? 20 : (parsedValue > 96000 ? 96000 : parsedValue);
        this.updateParameters();
    }

    setVolume(value) {
        const parsedValue = typeof value === 'number' ? value : parseFloat(value);
        this.vl = parsedValue < -96 ? -96 : (parsedValue > 0 ? 0 : parsedValue);
        this.updateParameters();
    }

    setPanning(value) {
        const parsedValue = typeof value === 'number' ? value : parseFloat(value);
        this.pn = parsedValue < -1 ? -1 : (parsedValue > 1 ? 1 : parsedValue);
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
