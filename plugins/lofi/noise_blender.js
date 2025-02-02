class NoiseBlenderPlugin extends PluginBase {
    constructor() {
        super('Noise Blender', 'Add noise to the audio signal');
        
        // Initialize parameters
        this.nt = 'pink';    // nt: Noise Type (formerly noiseType) - 'white' or 'pink'
        this.lv = -36;       // lv: Level (formerly level) - -96 to 0 dB
        this.pc = true;      // pc: Per Channel (formerly perChannel) - true or false
        
        // Initialize noise generation state
        this.registerProcessor(`
            // Initialize context for pink noise generation
            if (!context.initialized) {
                context.pinkNoise = new Array(parameters.channelCount).fill().map(() => ({
                    b0: 0, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0
                }));
                context.initialized = true;
            }

            // Reset if channel count changes
            if (context.pinkNoise.length !== parameters.channelCount) {
                context.pinkNoise = new Array(parameters.channelCount).fill().map(() => ({
                    b0: 0, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0
                }));
            }

            if (!parameters.enabled) return data;

            // Map shortened parameter names to their original names for clarity
            const { 
                nt: noiseType,    // nt: Noise Type (formerly noiseType)
                lv: level,        // lv: Level (formerly level)
                pc: perChannel,   // pc: Per Channel (formerly perChannel)
                channelCount, blockSize 
            } = parameters;

            const levelGain = Math.pow(10, level / 20); // Convert dB to linear
            
            // Generate noise buffer for the block
            const noiseBuffer = new Array(blockSize);
            const pinkState = context.pinkNoise[0];

            // Generate noise once if not per channel
            if (!perChannel) {
                for (let i = 0; i < blockSize; i++) {
                    if (noiseType === 'white') {
                        noiseBuffer[i] = (Math.random() * 2 - 1) * levelGain;
                    } else {
                        let white = Math.random() * 2 - 1;
                        
                        pinkState.b0 = 0.99886 * pinkState.b0 + white * 0.0555179;
                        pinkState.b1 = 0.99332 * pinkState.b1 + white * 0.0750759;
                        pinkState.b2 = 0.96900 * pinkState.b2 + white * 0.1538520;
                        pinkState.b3 = 0.86650 * pinkState.b3 + white * 0.3104856;
                        pinkState.b4 = 0.55000 * pinkState.b4 + white * 0.5329522;
                        pinkState.b5 = -0.7616 * pinkState.b5 - white * 0.0168980;
                        
                        noiseBuffer[i] = (pinkState.b0 + pinkState.b1 + pinkState.b2 + pinkState.b3 + 
                                        pinkState.b4 + pinkState.b5 + pinkState.b6 + white * 0.5362) * 0.11 * levelGain;
                        pinkState.b6 = white * 0.115926;
                    }
                }
            }

            // Process each channel
            for (let ch = 0; ch < channelCount; ch++) {
                const offset = ch * blockSize;
                
                if (perChannel) {
                    const pinkState = context.pinkNoise[ch];
                    // Generate unique noise for each channel
                    for (let i = 0; i < blockSize; i++) {
                        let noise;
                        if (noiseType === 'white') {
                            noise = (Math.random() * 2 - 1) * levelGain;
                        } else {
                            let white = Math.random() * 2 - 1;
                            
                            pinkState.b0 = 0.99886 * pinkState.b0 + white * 0.0555179;
                            pinkState.b1 = 0.99332 * pinkState.b1 + white * 0.0750759;
                            pinkState.b2 = 0.96900 * pinkState.b2 + white * 0.1538520;
                            pinkState.b3 = 0.86650 * pinkState.b3 + white * 0.3104856;
                            pinkState.b4 = 0.55000 * pinkState.b4 + white * 0.5329522;
                            pinkState.b5 = -0.7616 * pinkState.b5 - white * 0.0168980;
                            
                            noise = (pinkState.b0 + pinkState.b1 + pinkState.b2 + pinkState.b3 + 
                                    pinkState.b4 + pinkState.b5 + pinkState.b6 + white * 0.5362) * 0.11 * levelGain;
                            pinkState.b6 = white * 0.115926;
                        }
                        data[offset + i] += noise;
                    }
                } else {
                    // Use the pre-generated noise for all channels
                    for (let i = 0; i < blockSize; i++) {
                        data[offset + i] += noiseBuffer[i];
                    }
                }
            }
            
            return data;
        `);
    }

    // Get current parameters
    getParameters() {
        return {
            type: this.constructor.name,
            nt: this.nt,
            lv: this.lv,
            pc: this.pc,
            enabled: this.enabled
        };
    }

    // Set parameters
    setParameters(params) {
        if (params.nt !== undefined) {
            this.nt = params.nt;
        }
        if (params.lv !== undefined) {
            this.lv = Math.max(-96, Math.min(0, params.lv));
        }
        if (params.pc !== undefined) {
            this.pc = params.pc;
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    // Create UI
    createUI() {
        const container = document.createElement('div');
        container.className = 'noise-blender-plugin-ui plugin-parameter-ui';

        // Noise Type radio buttons
        const typeRow = document.createElement('div');
        typeRow.className = 'parameter-row';
        const typeLabel = document.createElement('label');
        typeLabel.textContent = 'Noise Type:';
        typeRow.appendChild(typeLabel);

        const typeContainer = document.createElement('div');
        typeContainer.className = 'radio-group';
        const types = ['pink', 'white'];
        types.forEach(type => {
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `noise-type-${this.id}`;
            radio.value = type;
            radio.checked = this.nt === type;
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.setParameters({ nt: type });
                }
            });
            label.appendChild(radio);
            label.appendChild(document.createTextNode(type.charAt(0).toUpperCase() + type.slice(1)));
            typeContainer.appendChild(label);
        });
        typeRow.appendChild(typeContainer);
        container.appendChild(typeRow);

        // Level slider
        const levelRow = document.createElement('div');
        levelRow.className = 'parameter-row';
        const levelLabel = document.createElement('label');
        levelLabel.textContent = 'Level:';
        levelRow.appendChild(levelLabel);

        const levelSlider = document.createElement('input');
        levelSlider.type = 'range';
        levelSlider.min = -96;
        levelSlider.max = 0;
        levelSlider.step = 0.1;
        levelSlider.value = this.lv;

        const levelValue = document.createElement('input');
        levelValue.type = 'number';
        levelValue.min = -96;
        levelValue.max = 0;
        levelValue.step = 0.1;
        levelValue.value = this.lv;

        levelSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.setParameters({ lv: value });
            levelValue.value = value;
        });

        levelValue.addEventListener('input', (e) => {
            const value = Math.max(-96, Math.min(0, parseFloat(e.target.value) || -96));
            this.setParameters({ lv: value });
            levelSlider.value = value;
            e.target.value = value;
        });

        levelRow.appendChild(levelSlider);
        levelRow.appendChild(levelValue);
        container.appendChild(levelRow);

        // Per Channel checkbox
        const perChannelRow = document.createElement('div');
        perChannelRow.className = 'parameter-row';
        const perChannelLabel = document.createElement('label');
        perChannelLabel.textContent = 'Per Channel:';
        const perChannelCheckbox = document.createElement('input');
        perChannelCheckbox.type = 'checkbox';
        perChannelCheckbox.checked = this.pc;
        perChannelCheckbox.addEventListener('change', (e) => {
            this.setParameters({ pc: e.target.checked });
        });
        perChannelRow.appendChild(perChannelLabel);
        perChannelRow.appendChild(perChannelCheckbox);
        container.appendChild(perChannelRow);

        return container;
    }
}

// Register plugin
window.NoiseBlenderPlugin = NoiseBlenderPlugin;
