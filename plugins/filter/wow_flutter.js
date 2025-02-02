class WowFlutterPlugin extends PluginBase {
    constructor() {
        super('Wow Flutter', 'Time-based modulation effect');
        
        this.rt = 0.5;         // rt: Rate (formerly rate) - Range: 0.1-20 Hz
        this.dp = 6.0;         // dp: Depth (formerly depth) - Range: 0-40 ms
        this.rn = 10.0;        // rn: Randomness (formerly randomness) - Range: 0-40 ms
        this.rc = 5.0;         // rc: Randomness Cutoff (formerly randomnessCutoff) - Range: 0.1-20 Hz

        // Register the audio processor
        this.registerProcessor(`
            if (!parameters.enabled) return data;

            // Constants
            const MAX_BUFFER_SIZE = Math.ceil(0.1 * sampleRate); // 100ms buffer
            const TWO_PI = 2 * Math.PI;

            // Ensure context variables exist first
            context.phase = context.phase || 0;
            context.lpfState = context.lpfState || 0;
            context.sampleBufferPos = context.sampleBufferPos || 0;

            // Initialize buffer if needed
            if (!context.initialized) {
                context.sampleBuffer = new Array(parameters.channelCount)
                    .fill()
                    .map(() => new Float32Array(MAX_BUFFER_SIZE).fill(0));
                context.initialized = true;
            }

            // Calculate coefficients for randomness LPF
            // Map shortened parameter names to their original names for clarity
            const { 
                rt: rate,              // rt: Rate (formerly rate)
                dp: depth,             // dp: Depth (formerly depth)
                rn: randomness,        // rn: Randomness (formerly randomness)
                rc: randomnessCutoff,  // rc: Randomness Cutoff (formerly randomnessCutoff)
                channelCount, blockSize 
            } = parameters;

            const lpfCoeff = Math.exp(-TWO_PI * randomnessCutoff / sampleRate);

            // Process each sample
            for (let i = 0; i < parameters.blockSize; i++) {
                // Calculate wow flutter modulation
                context.phase += TWO_PI * rate / sampleRate;
                if (context.phase >= TWO_PI) context.phase -= TWO_PI;

                // Generate and filter noise
                const noise = Math.random();
                context.lpfState = noise * (1 - lpfCoeff) + context.lpfState * lpfCoeff;
                const filteredNoise = context.lpfState;

                // Calculate delay time
                const baseDelay = (1 - Math.cos(context.phase)) * 0.5; // 0-1 range
                const noiseContribution = filteredNoise * randomness;
                const totalDelay = baseDelay * depth + noiseContribution;

                // Convert delay from ms to samples
                const delaySamples = (totalDelay / 1000) * sampleRate;

                // Get delayed sample position with linear interpolation
                const delayPos = (context.sampleBufferPos - delaySamples + MAX_BUFFER_SIZE) % MAX_BUFFER_SIZE;
                const delayPosInt = Math.floor(delayPos);
                const delayPosFrac = delayPos - delayPosInt;
                const nextPos = (delayPosInt + 1) % MAX_BUFFER_SIZE;

                // Process each channel with the same phase
                for (let ch = 0; ch < parameters.channelCount; ch++) {
                    const channelData = getChannelData(ch);
                    const buffer = context.sampleBuffer[ch];

                    // Store input sample in buffer
                    const inputSample = channelData[i];
                    buffer[context.sampleBufferPos] = inputSample;

                    // Apply interpolation
                    const sample1 = buffer[delayPosInt];
                    const sample2 = buffer[nextPos];
                    const interpolatedSample = sample1 + delayPosFrac * (sample2 - sample1);

                    // Write to output
                    data[ch * parameters.blockSize + i] = interpolatedSample;
                }

                // Update buffer position
                context.sampleBufferPos = (context.sampleBufferPos + 1) % MAX_BUFFER_SIZE;
            }

            return data;
        `);
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'wow-flutter-plugin-ui plugin-parameter-ui';

        // Rate parameter row
        const rateRow = document.createElement('div');
        rateRow.className = 'parameter-row';
        
        const rateLabel = document.createElement('label');
        rateLabel.textContent = 'Rate (Hz):';
        
        const rateSlider = document.createElement('input');
        rateSlider.type = 'range';
        rateSlider.min = '0.1';
        rateSlider.max = '20';
        rateSlider.step = '0.1';
        rateSlider.value = this.rt;
        
        const rateValue = document.createElement('input');
        rateValue.type = 'number';
        rateValue.min = '0.1';
        rateValue.max = '20';
        rateValue.step = '0.1';
        rateValue.value = this.rt;

        rateSlider.addEventListener('input', (e) => {
            this.setRt(parseFloat(e.target.value));
            rateValue.value = this.rt;
        });

        rateValue.addEventListener('input', (e) => {
            this.setRt(parseFloat(e.target.value) || 0);
            rateSlider.value = this.rt;
            e.target.value = this.rt;
        });

        rateRow.appendChild(rateLabel);
        rateRow.appendChild(rateSlider);
        rateRow.appendChild(rateValue);

        // Depth parameter row
        const depthRow = document.createElement('div');
        depthRow.className = 'parameter-row';
        
        const depthLabel = document.createElement('label');
        depthLabel.textContent = 'Depth (ms):';
        
        const depthSlider = document.createElement('input');
        depthSlider.type = 'range';
        depthSlider.min = '0';
        depthSlider.max = '40';
        depthSlider.step = '0.1';
        depthSlider.value = this.dp;
        
        const depthValue = document.createElement('input');
        depthValue.type = 'number';
        depthValue.min = '0';
        depthValue.max = '40';
        depthValue.step = '0.1';
        depthValue.value = this.dp;

        depthSlider.addEventListener('input', (e) => {
            this.setDp(parseFloat(e.target.value));
            depthValue.value = this.dp;
        });

        depthValue.addEventListener('input', (e) => {
            this.setDp(parseFloat(e.target.value) || 0);
            depthSlider.value = this.dp;
            e.target.value = this.dp;
        });

        depthRow.appendChild(depthLabel);
        depthRow.appendChild(depthSlider);
        depthRow.appendChild(depthValue);

        // Randomness parameter row
        const randomnessRow = document.createElement('div');
        randomnessRow.className = 'parameter-row';
        
        const randomnessLabel = document.createElement('label');
        randomnessLabel.textContent = 'Randomness (ms):';
        
        const randomnessSlider = document.createElement('input');
        randomnessSlider.type = 'range';
        randomnessSlider.min = '0';
        randomnessSlider.max = '40';
        randomnessSlider.step = '0.1';
        randomnessSlider.value = this.rn;
        
        const randomnessValue = document.createElement('input');
        randomnessValue.type = 'number';
        randomnessValue.min = '0';
        randomnessValue.max = '40';
        randomnessValue.step = '0.1';
        randomnessValue.value = this.rn;

        randomnessSlider.addEventListener('input', (e) => {
            this.setRn(parseFloat(e.target.value));
            randomnessValue.value = this.rn;
        });

        randomnessValue.addEventListener('input', (e) => {
            this.setRn(parseFloat(e.target.value) || 0);
            randomnessSlider.value = this.rn;
            e.target.value = this.rn;
        });

        randomnessRow.appendChild(randomnessLabel);
        randomnessRow.appendChild(randomnessSlider);
        randomnessRow.appendChild(randomnessValue);

        // Randomness Cutoff parameter row
        const cutoffRow = document.createElement('div');
        cutoffRow.className = 'parameter-row';
        
        const cutoffLabel = document.createElement('label');
        cutoffLabel.textContent = 'Randomness Cutoff (Hz):';
        
        const cutoffSlider = document.createElement('input');
        cutoffSlider.type = 'range';
        cutoffSlider.min = '0.1';
        cutoffSlider.max = '20';
        cutoffSlider.step = '0.1';
        cutoffSlider.value = this.rc;
        
        const cutoffValue = document.createElement('input');
        cutoffValue.type = 'number';
        cutoffValue.min = '0.1';
        cutoffValue.max = '20';
        cutoffValue.step = '0.1';
        cutoffValue.value = this.rc;

        cutoffSlider.addEventListener('input', (e) => {
            this.setRc(parseFloat(e.target.value));
            cutoffValue.value = this.rc;
        });

        cutoffValue.addEventListener('input', (e) => {
            this.setRc(parseFloat(e.target.value) || 0);
            cutoffSlider.value = this.rc;
            e.target.value = this.rc;
        });

        cutoffRow.appendChild(cutoffLabel);
        cutoffRow.appendChild(cutoffSlider);
        cutoffRow.appendChild(cutoffValue);

        container.appendChild(rateRow);
        container.appendChild(depthRow);
        container.appendChild(randomnessRow);
        container.appendChild(cutoffRow);

        return container;
    }

    getParameters() {
        return {
            ...super.getParameters(),
            rt: this.rt,
            dp: this.dp,
            rn: this.rn,
            rc: this.rc
        };
    }

    setParameters(params) {
        if (params.rt !== undefined) {
            this.rt = Math.max(0.1, Math.min(20, params.rt));
        }
        if (params.dp !== undefined) {
            this.dp = Math.max(0, Math.min(40, params.dp));
        }
        if (params.rn !== undefined) {
            this.rn = Math.max(0, Math.min(40, params.rn));
        }
        if (params.rc !== undefined) {
            this.rc = Math.max(0.1, Math.min(20, params.rc));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }

        this.updateParameters();
    }

    // Set Rate (0.1-20 Hz)
    setRt(value) {
        this.setParameters({ rt: value });
    }

    // Set Depth (0-40 ms)
    setDp(value) {
        this.setParameters({ dp: value });
    }

    // Set Randomness (0-40 ms)
    setRn(value) {
        this.setParameters({ rn: value });
    }

    // Set Randomness Cutoff (0.1-20 Hz)
    setRc(value) {
        this.setParameters({ rc: value });
    }
}

// Register the plugin
window.WowFlutterPlugin = WowFlutterPlugin;
