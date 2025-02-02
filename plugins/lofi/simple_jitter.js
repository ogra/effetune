class SimpleJitterPlugin extends PluginBase {
    constructor() {
        super('Simple Jitter', 'Digital jitter simulation effect');
        
        // rj: RMS Jitter (formerly rmsJitter) - Default: 100 (100ns)
        this.rj = 100;

        // Register the audio processor
        this.registerProcessor(`
            if (!parameters.enabled) return data;

            // Constants
            // 20ms buffer at 48kHz = 960 samples
            const BUFFER_SIZE = Math.ceil(0.02 * sampleRate);
            const MIN_JITTER_NS = 0.001; // 1ps
            const MAX_JITTER_NS = 10000000; // 10ms

            // Ensure context variables exist first
            context.sampleBufferPos = context.sampleBufferPos || 0;

            // Initialize buffer if needed
            if (!context.initialized) {
                context.sampleBuffer = new Array(parameters.channelCount)
                    .fill()
                    .map(() => new Float32Array(BUFFER_SIZE).fill(0));
                context.initialized = true;
            }

            // Map shortened parameter names to their original names for clarity
            const { 
                rj: rmsJitter,    // rj: RMS Jitter (formerly rmsJitter)
                channelCount, blockSize 
            } = parameters;
            
            // Calculate RMS jitter in nanoseconds (logarithmic scale, 20 per decade)
            const rmsJitterNs = MIN_JITTER_NS * Math.pow(10, rmsJitter / 20);

            // Process each sample
            for (let i = 0; i < parameters.blockSize; i++) {
                // Generate positive random jitter value with RMS distribution
                // Math.random() has RMS = 1/√3, so multiply by √3 to normalize
                const jitterNs = Math.abs(Math.random()) * rmsJitterNs * Math.sqrt(3);
                
                // Convert jitter from ns to samples (always positive)
                const jitterSamples = (jitterNs / 1e9) * sampleRate;

                // Get delayed sample position with linear interpolation
                const delayPos = (context.sampleBufferPos - jitterSamples + BUFFER_SIZE) % BUFFER_SIZE;
                const delayPosInt = Math.floor(delayPos);
                const delayPosFrac = delayPos - delayPosInt;
                const nextPos = (delayPosInt + 1) % BUFFER_SIZE;

                // Process each channel
                for (let ch = 0; ch < parameters.channelCount; ch++) {
                    const channelData = getChannelData(ch);
                    const buffer = context.sampleBuffer[ch];

                    // Store input sample in buffer
                    const inputSample = channelData[i];
                    buffer[context.sampleBufferPos] = inputSample;

                    // Apply linear interpolation
                    const sample1 = buffer[delayPosInt];
                    const sample2 = buffer[nextPos];
                    const interpolatedSample = sample1 + delayPosFrac * (sample2 - sample1);

                    // Write to output
                    data[ch * parameters.blockSize + i] = interpolatedSample;
                }

                // Update buffer position
                context.sampleBufferPos = (context.sampleBufferPos + 1) % BUFFER_SIZE;
            }

            return data;
        `);
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'simple-jitter-plugin-ui plugin-parameter-ui';

        // RMS Jitter parameter row
        const jitterRow = document.createElement('div');
        jitterRow.className = 'parameter-row';
        
        const jitterLabel = document.createElement('label');
        jitterLabel.textContent = 'RMS Jitter:';
        
        const jitterSlider = document.createElement('input');
        jitterSlider.type = 'range';
        jitterSlider.min = '0';
        jitterSlider.max = '200';
        jitterSlider.step = '1';
        jitterSlider.value = this.rj;
        
        const jitterValue = document.createElement('span');
        jitterValue.className = 'parameter-value';
        jitterValue.textContent = this.getDisplayValue();

        jitterSlider.addEventListener('input', (e) => {
            this.setRj(parseFloat(e.target.value));
            jitterValue.textContent = this.getDisplayValue();
        });

        jitterRow.appendChild(jitterLabel);
        jitterRow.appendChild(jitterSlider);
        jitterRow.appendChild(jitterValue);

        container.appendChild(jitterRow);

        return container;
    }

    getDisplayValue() {
        const MIN_JITTER_NS = 0.001; // 1ps
        const rmsJitterNs = MIN_JITTER_NS * Math.pow(10, this.rj / 20);
        
        // Display with appropriate unit
        if (rmsJitterNs < 1) {
            return (rmsJitterNs * 1000).toFixed(3) + ' ps';
        } else if (rmsJitterNs < 1000) {
            return rmsJitterNs.toFixed(3) + ' ns';
        } else if (rmsJitterNs < 1000000) {
            return (rmsJitterNs / 1000).toFixed(3) + ' μs';
        } else {
            return (rmsJitterNs / 1000000).toFixed(3) + ' ms';
        }
    }

    getParameters() {
        return {
            ...super.getParameters(),
            rj: this.rj
        };
    }

    setParameters(params) {
        if (params.rj !== undefined) {
            this.rj = Math.max(0, Math.min(200, params.rj));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }

        this.updateParameters();
    }

    // Set RMS Jitter value (0-200)
    setRj(value) {
        this.setParameters({ rj: value });
    }
}

// Register the plugin
window.SimpleJitterPlugin = SimpleJitterPlugin;
