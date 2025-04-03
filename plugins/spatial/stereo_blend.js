class StereoBlendPlugin extends PluginBase {
    constructor() {
        super('Stereo Blend', 'Stereo width control for natural sound field adjustment');
        
        // Initialize parameters
        this.stereo = 60;  // stereo: Stereo width (0-200%)
        // Common use cases:
        // - 60-90%: Reduce stereo width for more natural headphone listening
        // - 100%: Original stereo image (neutral)
        // - 110-130%: Enhance stereo separation for speaker listening

        // Register the audio processing function
        this.registerProcessor(`
            if (!parameters.enabled) return data;
            if (parameters.channelCount < 2) return data; // Only process stereo signals

            // Pre-calculate all constants for efficiency
            const { 
                stereo,    // Stereo width percentage
                channelCount, blockSize 
            } = parameters;
            
            // Use original data directly
            const tempBuffer = data;

            // Calculate stereo width factor (-1 to 1)
            // 0%: Full mono
            // 60-90%: Reduced width for headphone listening (more natural soundstage)
            // 100%: Original stereo image
            // 110-130%: Enhanced stereo for speaker listening
            // 200%: Maximum stereo width (use with caution)
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
            this.stereo = params.stereo < 0 ? 0 : (params.stereo > 200 ? 200 : params.stereo);
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
        container.className = 'plugin-parameter-ui';

        // Stereo width parameter row
        const stereoLabel = document.createElement('label');
        stereoLabel.textContent = 'Stereo (%):';
        stereoLabel.htmlFor = `${this.id}-${this.name}-stereo-slider`;
        
        const stereoSlider = document.createElement('input');
        stereoSlider.type = 'range';
        stereoSlider.min = 0;
        stereoSlider.max = 200;
        stereoSlider.step = 1;
        stereoSlider.value = this.stereo;
        stereoSlider.id = `${this.id}-${this.name}-stereo-slider`;
        stereoSlider.name = `${this.id}-${this.name}-stereo-slider`;
        stereoSlider.autocomplete = "off";
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
        stereoValue.id = `${this.id}-${this.name}-stereo-value`;
        stereoValue.name = `${this.id}-${this.name}-stereo-value`;
        stereoValue.autocomplete = "off";
        stereoValue.addEventListener('input', (e) => {
            const parsedValue = parseFloat(e.target.value) || 0;
            const value = parsedValue < 0 ? 0 : (parsedValue > 200 ? 200 : parsedValue);
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
