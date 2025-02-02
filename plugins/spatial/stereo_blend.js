class StereoBlendPlugin extends PluginBase {
    constructor() {
        super('Stereo Blend', 'Stereo width control effect');
        
        // Initialize parameters
        this.stereo = 100;  // stereo: Stereo width (0-200%) - Default: 100%

        // Register the audio processing function
        this.registerProcessor(`
            if (!parameters.enabled) return data;
            if (parameters.channelCount < 2) return data; // Only process stereo signals

            // Pre-calculate all constants for efficiency
            const { 
                stereo,    // Stereo width percentage
                channelCount, blockSize 
            } = parameters;
            
            // Create temporary buffer to store original data
            const tempBuffer = new Float32Array(data.length);
            tempBuffer.set(data);

            // Calculate stereo width factor (-1 to 1)
            // 0% -> -1 (full inverse), 100% -> 0 (original), 200% -> 1 (full width)
            const widthFactor = (stereo - 100) / 100;

            const rightOffset = blockSize;
            
            // Process both channels
            for (let i = 0; i < blockSize; i++) {
                const leftSample = tempBuffer[i];
                const rightSample = tempBuffer[rightOffset + i];
                
                // Calculate mid/side components
                const mid = (leftSample + rightSample) * 0.5;
                const side = (leftSample - rightSample) * 0.5;
                
                // Apply width factor
                const scaledSide = side * (1 + widthFactor);
                
                // Reconstruct stereo
                data[i] = mid + scaledSide;
                data[rightOffset + i] = mid - scaledSide;
            }

            return data;
        `);
    }

    // Get current parameters
    getParameters() {
        return {
            type: this.constructor.name,
            stereo: this.stereo,
            enabled: this.enabled
        };
    }

    // Set parameters
    setParameters(params) {
        if (params.stereo !== undefined) {
            this.stereo = Math.max(0, Math.min(200, params.stereo));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    // Set stereo width percentage (0-200%)
    setStereo(value) {
        this.setParameters({ stereo: value });
    }

    // Create UI elements
    createUI() {
        const container = document.createElement('div');
        container.className = 'stereo-blend-plugin-ui plugin-parameter-ui';

        // Stereo width parameter row
        const stereoLabel = document.createElement('label');
        stereoLabel.textContent = 'Stereo (%):';
        const stereoSlider = document.createElement('input');
        stereoSlider.type = 'range';
        stereoSlider.min = 0;
        stereoSlider.max = 200;
        stereoSlider.step = 1;
        stereoSlider.value = this.stereo;
        stereoSlider.addEventListener('input', (e) => {
            this.setStereo(parseFloat(e.target.value));
            stereoValue.value = e.target.value;
        });
        const stereoValue = document.createElement('input');
        stereoValue.type = 'number';
        stereoValue.min = 0;
        stereoValue.max = 200;
        stereoValue.step = 1;
        stereoValue.value = this.stereo;
        stereoValue.addEventListener('input', (e) => {
            const value = Math.max(0, Math.min(200, parseFloat(e.target.value) || 0));
            this.setStereo(value);
            stereoSlider.value = value;
            e.target.value = value;
        });

        const stereoRow = document.createElement('div');
        stereoRow.className = 'parameter-row';
        stereoRow.appendChild(stereoLabel);
        stereoRow.appendChild(stereoSlider);
        stereoRow.appendChild(stereoValue);
        container.appendChild(stereoRow);

        return container;
    }
}

// Register the plugin globally
window.StereoBlendPlugin = StereoBlendPlugin;
