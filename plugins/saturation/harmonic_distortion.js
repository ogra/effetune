class HarmonicDistortionPlugin extends PluginBase {
    constructor() {
        super('Harmonic Distortion', 'Harmonic distortion effect with independent harmonic control');
        
        // Initialize parameters with defaults
        this.h2 = 2.0;   // h2: 2nd Harm (%) - 0~30%, default 2%
        this.h3 = 3.0;   // h3: 3rd Harm (%) - 0~30%, default 3%
        this.h4 = 0.5;   // h4: 4th Harm (%) - 0~30%, default 0.5%
        this.h5 = 0.3;   // h5: 5th Harm (%) - 0~30%, default 0.3%
        this.sn = 0.5;   // sn: Sensitivity (x) - 0.1~2.0, default 0.5

        // Register processor function
        this.registerProcessor(`
            // Skip processing if the plugin is disabled
            if (!parameters.enabled) return data;

            // Extract parameters
            const {
                h2: secondHarm,    // 2nd harmonic coefficient (%)
                h3: thirdHarm,     // 3rd harmonic coefficient (%)
                h4: fourthHarm,    // 4th harmonic coefficient (%)
                h5: fifthHarm,     // 5th harmonic coefficient (%)
                sn: sensitivity,   // Sensitivity factor
                channelCount,
                blockSize
            } = parameters;

            // Convert percentage values to actual coefficients (0-30% → 0-0.3)
            const a2 = secondHarm * 0.01;
            const a3 = thirdHarm * 0.01;
            const a4 = fourthHarm * 0.01;
            const a5 = fifthHarm * 0.01;
            
            // Process all samples
            for (let ch = 0; ch < channelCount; ch++) {
                const offset = ch * blockSize;
                for (let i = 0; i < blockSize; i++) {
                    const index = offset + i;
                    const x = data[index];
                    
                    // Sensitivity scaling
                    const x_scaled = x * sensitivity;
                    
                    // Nonlinear polynomial distortion (IMD model)
                    const y_nl = x_scaled + 
                                 a2 * x_scaled * x_scaled + 
                                 a3 * x_scaled * x_scaled * x_scaled + 
                                 a4 * Math.pow(x_scaled, 4) + 
                                 a5 * Math.pow(x_scaled, 5);
                    
                    // Level compensation
                    data[index] = y_nl / sensitivity;
                }
            }
            
            return data;
        `);
    }

    // Get current parameters
    getParameters() {
        return {
            type: this.constructor.name,
            h2: this.h2,     // 2nd Harm (%)
            h3: this.h3,     // 3rd Harm (%)
            h4: this.h4,     // 4th Harm (%)
            h5: this.h5,     // 5th Harm (%)
            sn: this.sn,     // Sensitivity (x)
            enabled: this.enabled
        };
    }

    // Set parameters with validation
    setParameters(params) {
        if (params.h2 !== undefined) {
            this.h2 = Math.max(0, Math.min(30, Number(params.h2)));
        }
        if (params.h3 !== undefined) {
            this.h3 = Math.max(0, Math.min(30, Number(params.h3)));
        }
        if (params.h4 !== undefined) {
            this.h4 = Math.max(0, Math.min(30, Number(params.h4)));
        }
        if (params.h5 !== undefined) {
            this.h5 = Math.max(0, Math.min(30, Number(params.h5)));
        }
        if (params.sn !== undefined) {
            this.sn = Math.max(0.1, Math.min(2.0, Number(params.sn)));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    // Individual parameter setters
    setH2(value) { this.setParameters({ h2: value }); }
    setH3(value) { this.setParameters({ h3: value }); }
    setH4(value) { this.setParameters({ h4: value }); }
    setH5(value) { this.setParameters({ h5: value }); }
    setSn(value) { this.setParameters({ sn: value }); }

    createUI() {
        const container = document.createElement('div');
        container.className = 'plugin-parameter-ui';

        // Utility function to create a parameter row
        const createRow = (labelText, type, min, max, step, value, onChange) => {
            const row = document.createElement('div');
            row.className = 'parameter-row';
            const label = document.createElement('label');
            label.textContent = labelText;
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = value;
            const input = document.createElement('input');
            input.type = type;
            input.min = min;
            input.max = max;
            input.step = step;
            input.value = value;
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                onChange(val);
                input.value = val;
            });
            input.addEventListener('input', (e) => {
                let val = parseFloat(e.target.value) || 0;
                if (val < min) val = min;
                if (val > max) val = max;
                onChange(val);
                slider.value = val;
                e.target.value = val; // Correct the input value if it was out of bounds
            });
            row.appendChild(label);
            row.appendChild(slider);
            row.appendChild(input);
            return row;
        };

        // Create parameter rows
        container.appendChild(createRow('2nd Harm (%):', 'number', '0', '30', '0.1', this.h2, (value) => this.setH2(value)));
        container.appendChild(createRow('3rd Harm (%):', 'number', '0', '30', '0.1', this.h3, (value) => this.setH3(value)));
        container.appendChild(createRow('4th Harm (%):', 'number', '0', '30', '0.1', this.h4, (value) => this.setH4(value)));
        container.appendChild(createRow('5th Harm (%):', 'number', '0', '30', '0.1', this.h5, (value) => this.setH5(value)));
        container.appendChild(createRow('Sensitivity (x):', 'number', '0.1', '2.0', '0.01', this.sn, (value) => this.setSn(value)));

        return container;
    }
}

// Register the plugin globally
window.HarmonicDistortionPlugin = HarmonicDistortionPlugin;