class TimeAlignmentPlugin extends PluginBase {
    constructor() {
        super('Time Alignment', 'Time alignment effect');

        // Maximum delay time in milliseconds
        this.maxDelayTime = 100;

        // Initialize parameters
        this.dl = 0.00;  // dl: Delay (formerly delay) - 0 to 100 ms

        this.lastProcessTime = performance.now() / 1000;

        // Initialize delay buffers in the processor
        this.registerProcessor(`
            if (!parameters.enabled) return data;

            // Define max delay time constant (ms)
            const maxDelayTime = 100;

            // Initialize delay buffers if needed
            if (!context.delayBuffers || context.delayBuffers.length !== parameters.channelCount) {
                const maxDelaySamples = Math.ceil(parameters.sampleRate * maxDelayTime * 0.001);
                context.delayBuffers = Array.from({ length: parameters.channelCount }, () => new Float32Array(maxDelaySamples));
                context.delayIndices = Array.from({ length: parameters.channelCount }, () => 0);
            }

            // Calculate delay in samples
            const delaySamples = Math.floor(parameters.dl * parameters.sampleRate / 1000);

            // Always process all channels
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                const delayBuffer = context.delayBuffers[ch];
                let writeIndex = context.delayIndices[ch];

                if (delaySamples === 0) {
                    // No delay: output current sample directly and update the delay buffer
                    for (let i = 0; i < parameters.blockSize; i++) {
                        const currentSample = data[offset + i];
                        delayBuffer[writeIndex] = currentSample;
                        writeIndex = (writeIndex + 1) % delayBuffer.length;
                    }
                } else {
                    // Compute readIndex offset by delaySamples
                    let readIndex = (writeIndex + delayBuffer.length - delaySamples) % delayBuffer.length;
                    for (let i = 0; i < parameters.blockSize; i++) {
                        const currentSample = data[offset + i];
                        // Output the delayed sample from the buffer
                        data[offset + i] = delayBuffer[readIndex];
                        // Write current sample into the delay buffer
                        delayBuffer[writeIndex] = currentSample;
                        // Increment indices in circular buffer
                        writeIndex = (writeIndex + 1) % delayBuffer.length;
                        readIndex = (readIndex + 1) % delayBuffer.length;
                    }
                }
                // Save updated write index for next block processing
                context.delayIndices[ch] = writeIndex;
            }

            return data;
        `);
    }

    onMessage(message) {
        if (message.type === 'processBuffer' && message.buffer) {
            const result = new Float32Array(message.buffer.length);
            result.set(message.buffer);
            return result;
        }
    }

    setParameters(params) {
        // Map shortened parameter names to their original names for clarity
        const { 
            dl: delay,  // dl: Delay (formerly delay)
        } = params;

        // Update delay parameter with type checking
        if (delay !== undefined) {
            const value = typeof delay === 'number' ? delay : parseFloat(delay);
            if (!isNaN(value)) {
                this.dl = value < 0 ? 0 : (value > this.maxDelayTime ? this.maxDelayTime : value);
            }
        }

        if (params.enabled !== undefined) this.enabled = params.enabled;

        this.updateParameters();
    }

    // Parameter setters
    setDelay(value) { this.setParameters({ dl: value }); }

    getParameters() {
        return {
            type: this.constructor.name,
            dl: this.dl,
            enabled: this.enabled
        };
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'time-alignment-plugin-ui plugin-parameter-ui';

        // Use helper to create delay control
        const delayControl = this.createParameterControl(
            'Delay', 0, this.maxDelayTime, 0.01, this.dl,
            (value) => this.setDelay(value), 'ms'
        );
        container.appendChild(delayControl);

        return container;
    }
}

window.TimeAlignmentPlugin = TimeAlignmentPlugin;