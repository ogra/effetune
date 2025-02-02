class DCOffsetPlugin extends PluginBase {
    constructor() {
        super('DC Offset', 'Adds DC offset to the audio signal');
        this.of = 0;  // of: Offset (formerly offset) - Range: -1.0 to 1.0

        // Register processor function
        this.registerProcessor(`
            if (!parameters.enabled) return data;
            // Map shortened parameter names to their original names for clarity
            const { 
                of: offset,    // of: Offset (formerly offset)
                channelCount, blockSize, type 
            } = parameters;
            
            const dcOffset = offset;
            const currentOffset = getFadeValue(parameters.type, dcOffset, time);
            
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const channelOffset = ch * parameters.blockSize;
                for (let i = 0; i < parameters.blockSize; i++) {
                    data[channelOffset + i] += currentOffset;
                }
            }
            return data;
        `);
    }

    // Set parameters
    setParameters(params) {
        if (params.of !== undefined) {
            this.of = Math.max(-1, Math.min(1, params.of));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    // Set DC offset value (-1.0 to 1.0)
    setOf(value) {
        this.setParameters({ of: value });
    }

    getParameters() {
        return {
            type: this.constructor.name,
            of: this.of,
            enabled: this.enabled
        };
    }

    // Create UI elements for the plugin
    createUI() {
        const container = document.createElement('div');
        container.className = 'plugin-parameter-ui';

        // Offset slider
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = -1;
        slider.max = 1;
        slider.step = 0.01;
        slider.value = this.of;
        slider.addEventListener('input', (e) => {
            this.setOf(parseFloat(e.target.value));
            valueInput.value = e.target.value;
        });

        // Offset text input
        const valueInput = document.createElement('input');
        valueInput.type = 'number';
        valueInput.min = -1;
        valueInput.max = 1;
        valueInput.step = 0.01;
        valueInput.value = this.of;
        valueInput.addEventListener('input', (e) => {
            const value = Math.max(-1, Math.min(1, parseFloat(e.target.value) || 0));
            this.setOf(value);
            slider.value = value;
            e.target.value = value;
        });

        // Label
        const label = document.createElement('label');
        label.textContent = 'Offset:';

        // Offset parameter row
        const offsetRow = document.createElement('div');
        offsetRow.className = 'parameter-row';
        offsetRow.appendChild(label);
        offsetRow.appendChild(slider);
        offsetRow.appendChild(valueInput);
        container.appendChild(offsetRow);

        return container;
    }
}

// Register the plugin
window.DCOffsetPlugin = DCOffsetPlugin;
