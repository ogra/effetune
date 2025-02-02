class CrosstalkPlugin extends PluginBase {
    constructor() {
        super('Crosstalk', 'Cross-channel blending effect');
        
        // Initialize parameters
        this.am = -12;  // am: Amount (formerly amount) - Default: -12dB

        // Register the audio processing function
        this.registerProcessor(`
            if (!parameters.enabled) return data;
            if (parameters.channelCount < 2) return data; // Only process stereo signals

            // Pre-calculate all constants for efficiency
            // Map shortened parameter names to their original names for clarity
            const { 
                am: amount,    // am: Amount (formerly amount)
                channelCount, blockSize 
            } = parameters;
            
            const gain = Math.pow(10, amount / 20);
            const compensationGain = 1 / (1 + gain);

            // Create temporary buffer to store original data
            const tempBuffer = new Float32Array(data.length);
            tempBuffer.set(data);

            // Process left channel
            const rightOffset = blockSize;
            for (let i = 0; i < blockSize; i++) {
                data[i] = (tempBuffer[i] + (tempBuffer[rightOffset + i] * gain)) * compensationGain;
            }

            // Process right channel
            for (let i = 0; i < blockSize; i++) {
                data[rightOffset + i] = (tempBuffer[rightOffset + i] + (tempBuffer[i] * gain)) * compensationGain;
            }

            return data;
        `);
    }

    // Get current parameters
    getParameters() {
        return {
            type: this.constructor.name,
            am: this.am,
            enabled: this.enabled
        };
    }

    // Set parameters
    setParameters(params) {
        if (params.am !== undefined) {
            this.am = Math.max(-96, Math.min(0, params.am));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    // Set amount in dB (-96 to 0 dB)
    setAm(value) {
        this.setParameters({ am: value });
    }

    // Create UI elements
    createUI() {
        const container = document.createElement('div');
        container.className = 'crosstalk-plugin-ui plugin-parameter-ui';

        // Amount parameter row
        const amountLabel = document.createElement('label');
        amountLabel.textContent = 'Amount (dB):';
        const amountSlider = document.createElement('input');
        amountSlider.type = 'range';
        amountSlider.min = -96;
        amountSlider.max = 0;
        amountSlider.step = 0.1;
        amountSlider.value = this.am;
        amountSlider.addEventListener('input', (e) => {
            this.setAm(parseFloat(e.target.value));
            amountValue.value = e.target.value;
        });
        const amountValue = document.createElement('input');
        amountValue.type = 'number';
        amountValue.min = -96;
        amountValue.max = 0;
        amountValue.step = 0.1;
        amountValue.value = this.am;
        amountValue.addEventListener('input', (e) => {
            const value = Math.max(-96, Math.min(0, parseFloat(e.target.value) || -96));
            this.setAm(value);
            amountSlider.value = value;
            e.target.value = value;
        });

        const amountRow = document.createElement('div');
        amountRow.className = 'parameter-row';
        amountRow.appendChild(amountLabel);
        amountRow.appendChild(amountSlider);
        amountRow.appendChild(amountValue);
        container.appendChild(amountRow);

        return container;
    }
}

// Register the plugin globally
window.CrosstalkPlugin = CrosstalkPlugin;
