class PolarityInversionPlugin extends PluginBase {
    constructor() {
        super('Polarity Inversion', 'Inverts the polarity of the audio signal');
        this.ch = 'all';  // ch: Channel (formerly channel) - Values: 'all', 'left', 'right'

        // Register processor function
        this.registerProcessor(`
            if (!parameters.enabled) return data;
            // Map shortened parameter names to their original names for clarity
            const { 
                ch: channel,    // ch: Channel (formerly channel)
                channelCount, blockSize 
            } = parameters;
            
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                // Skip channels based on selection
                if (channel === 'left' && ch !== 0) continue;
                if (channel === 'right' && ch !== 1) continue;
                
                const channelOffset = ch * parameters.blockSize;
                for (let i = 0; i < parameters.blockSize; i++) {
                    data[channelOffset + i] *= -1;
                }
            }
            return data;
        `);
    }

    // Set parameters
    setParameters(params) {
        if (params.ch !== undefined) {
            this.ch = params.ch;
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    // Set channel value ('all', 'left', 'right')
    setCh(value) {
        this.setParameters({ ch: value });
    }

    getParameters() {
        return {
            type: this.constructor.name,
            ch: this.ch,
            enabled: this.enabled
        };
    }

    // Create UI elements for the plugin
    createUI() {
        const container = document.createElement('div');
        container.className = 'polarity-inversion-plugin-ui plugin-parameter-ui';

        // Channel selection
        const channelRow = document.createElement('div');
        channelRow.className = 'parameter-row';
        const channelLabel = document.createElement('label');
        channelLabel.textContent = 'Channel:';
        channelRow.appendChild(channelLabel);

        const radioGroup = document.createElement('div');
        radioGroup.className = 'radio-group';
        const options = ['all', 'left', 'right'];
        
        options.forEach(option => {
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `channel-${this.id}`;
            radio.value = option;
            radio.checked = this.ch === option;
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.setCh(option);
                }
            });
            label.appendChild(radio);
            label.appendChild(document.createTextNode(option.charAt(0).toUpperCase() + option.slice(1)));
            radioGroup.appendChild(label);
        });

        channelRow.appendChild(radioGroup);
        container.appendChild(channelRow);

        return container;
    }
}

// Register the plugin
window.PolarityInversionPlugin = PolarityInversionPlugin;
