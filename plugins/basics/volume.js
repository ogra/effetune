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
            const len = data.length;
            for (let i = 0; i < len ; i++) {
                data[i] *= gain;
            }
            return data;
        `);
    }

    // Set parameters
    setParameters(params) {
        if (params.vl !== undefined) {
            this.vl = params.vl < -60 ? -60 : (params.vl > 24 ? 24 : params.vl);
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
        slider.id = `${this.id}-${this.name}-slider`;
        slider.name = `${this.id}-${this.name}-slider`;
        slider.autocomplete = "off";
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
        valueInput.id = `${this.id}-${this.name}-input`;
        valueInput.name = `${this.id}-${this.name}-input`;
        valueInput.autocomplete = "off";
        valueInput.addEventListener('input', (e) => {
            const parsedValue = parseFloat(e.target.value) || 0;
            const value = parsedValue < -60 ? -60 : (parsedValue > 24 ? 24 : parsedValue);
            this.setVl(value);
            slider.value = value;
            e.target.value = value;
        });

        // Label
        const label = document.createElement('label');
        label.textContent = 'Volume (dB):';
        label.htmlFor = `${this.id}-${this.name}-slider`;

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
