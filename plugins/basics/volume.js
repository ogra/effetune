class VolumePlugin extends PluginBase {
    constructor() {
        super('Volume', 'Adjusts the volume of the audio signal');
        this.vl = 0;  // vl: Volume (formerly volume) - Range: -60 to +24 dB

        // Register processor function
        this.registerProcessor(`
            if (!parameters.enabled) return data;
            // Map shortened parameter names to their original names for clarity
            const { 
                vl: volume,    // vl: Volume (formerly volume)
                channelCount, blockSize, type 
            } = parameters;
            
            const gain = Math.pow(10, volume / 20);
            const currentGain = getFadeValue(parameters.type, gain, time);
            
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                for (let i = 0; i < parameters.blockSize; i++) {
                    data[offset + i] *= currentGain;
                }
            }
            return data;
        `);
    }

    // Set parameters
    setParameters(params) {
        if (params.vl !== undefined) {
            this.vl = Math.max(-60, Math.min(24, params.vl));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    // Set volume level (-60 to +24 dB)
    setVl(db) {
        this.setParameters({ vl: db });
    }

    getParameters() {
        return {
            type: this.constructor.name,
            vl: this.vl,
            enabled: this.enabled
        };
    }

    // Create UI elements for the plugin
    createUI() {
        const container = document.createElement('div');
        container.className = 'plugin-parameter-ui';

        // Volume slider
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = -60;
        slider.max = 24;
        slider.step = 0.1;
        slider.value = this.vl;
        slider.addEventListener('input', (e) => {
            this.setVl(parseFloat(e.target.value));
            valueInput.value = e.target.value;
        });

        // Volume text input
        const valueInput = document.createElement('input');
        valueInput.type = 'number';
        valueInput.min = -60;
        valueInput.max = 24;
        valueInput.step = 0.1;
        valueInput.value = this.vl;
        valueInput.addEventListener('input', (e) => {
            const value = Math.max(-60, Math.min(24, parseFloat(e.target.value) || 0));
            this.setVl(value);
            slider.value = value;
            e.target.value = value;
        });

        // Label
        const label = document.createElement('label');
        label.textContent = 'Volume (dB):';

        // Volume parameter row
        const volumeRow = document.createElement('div');
        volumeRow.className = 'parameter-row';
        volumeRow.appendChild(label);
        volumeRow.appendChild(slider);
        volumeRow.appendChild(valueInput);
        container.appendChild(volumeRow);

        return container;
    }
}

// Register the plugin
window.VolumePlugin = VolumePlugin;
