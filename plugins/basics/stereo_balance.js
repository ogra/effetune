class StereoBalancePlugin extends PluginBase {
    constructor() {
        super('Stereo Balance', 'Adjusts the balance between left and right channels');
        this.bl = 0;  // bl: Balance (formerly balance) - -1 (full left) to +1 (full right), 0 is center

        // Register processor function
        this.registerProcessor(`
            if (!parameters.enabled) return data;
            if (parameters.channelCount < 2) return data; // Only process stereo signals
            
            // Map shortened parameter names to their original names for clarity
            const { 
                bl: balance,    // bl: Balance (formerly balance)
                channelCount, blockSize, type 
            } = parameters;
            
            const currentBalance = getFadeValue(type, balance, time);
            
            // Process left and right channels
            const leftGain = currentBalance <= 0 ? 1 : 1 - currentBalance;
            const rightGain = currentBalance >= 0 ? 1 : 1 + currentBalance;
            
            // Left channel (first block)
            for (let i = 0; i < parameters.blockSize; i++) {
                data[i] *= leftGain;
            }
            
            // Right channel (next block)
            const rightOffset = parameters.blockSize;
            for (let i = 0; i < parameters.blockSize; i++) {
                data[rightOffset + i] *= rightGain;
            }
            
            return data;
        `);
    }

    // Set parameters
    setParameters(params) {
        if (params.bl !== undefined) {
            this.bl = Math.max(-1, Math.min(1, params.bl));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    // Set balance value (-1 to +1)
    setBl(value) {
        this.setParameters({ bl: value });
    }

    getParameters() {
        return {
            type: this.constructor.name,
            bl: this.bl,
            enabled: this.enabled
        };
    }

    // Create UI elements for the plugin
    createUI() {
        const container = document.createElement('div');
        container.className = 'plugin-parameter-ui';

        // Balance slider
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = -100;
        slider.max = 100;
        slider.step = 1;
        slider.value = this.bl * 100;
        slider.id = `${this.id}-${this.name}-slider`;
        slider.name = `${this.id}-${this.name}-slider`;
        slider.autocomplete = "off";
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value) / 100;
            this.setBl(value);
            valueInput.value = e.target.value;
        });

        // Balance text input
        const valueInput = document.createElement('input');
        valueInput.type = 'number';
        valueInput.min = -100;
        valueInput.max = 100;
        valueInput.step = 1;
        valueInput.value = this.bl * 100;
        valueInput.id = `${this.id}-${this.name}-input`;
        valueInput.name = `${this.id}-${this.name}-input`;
        valueInput.autocomplete = "off";
        valueInput.addEventListener('input', (e) => {
            const value = Math.max(-100, Math.min(100, parseFloat(e.target.value) || 0)) / 100;
            this.setBl(value);
            slider.value = value * 100;
            e.target.value = Math.round(value * 100);
        });

        // Label
        const label = document.createElement('label');
        label.textContent = 'Balance (%):';
        label.htmlFor = `${this.id}-${this.name}-slider`;

        // Balance parameter row
        const balanceRow = document.createElement('div');
        balanceRow.className = 'parameter-row';
        balanceRow.appendChild(label);
        balanceRow.appendChild(slider);
        balanceRow.appendChild(valueInput);
        container.appendChild(balanceRow);
        return container;
    }
}

// Register the plugin
window.StereoBalancePlugin = StereoBalancePlugin;
