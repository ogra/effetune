class TimeAlignmentPlugin extends PluginBase {
    constructor() {
        super('Time Alignment', 'Time alignment effect');

        // Maximum delay time in milliseconds
        this.maxDelayTime = 100;

        // Initialize parameters
        this.dl = 0.00;  // dl: Delay (formerly delay) - 0 to 100 ms
        this.ch = 'All'; // ch: Channel - 'All', 'Left', or 'Right'

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

            // Process based on selected channel
            const ch = parameters.ch;
            if (ch === 'All') {
                // Process all channels
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
            } else {
                // Process only selected channel (Left = 0, Right = 1)
                const targetCh = ch === 'Left' ? 0 : 1;
                if (targetCh < parameters.channelCount) {
                    const offset = targetCh * parameters.blockSize;
                    const delayBuffer = context.delayBuffers[targetCh];
                    let writeIndex = context.delayIndices[targetCh];

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
                    context.delayIndices[targetCh] = writeIndex;
                }
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
            ch: channel // ch: Channel
        } = params;

        // Update delay parameter with type checking
        if (delay !== undefined) {
            const value = typeof delay === 'number' ? delay : parseFloat(delay);
            if (!isNaN(value)) {
                this.dl = Math.max(0, Math.min(this.maxDelayTime, value));
            }
        }

        // Update channel parameter
        if (channel !== undefined) {
            if (['All', 'Left', 'Right'].includes(channel)) {
                this.ch = channel;
            }
        }

        if (params.enabled !== undefined) this.enabled = params.enabled;

        this.updateParameters();
    }

    // Parameter setters
    setDelay(value) { this.setParameters({ dl: value }); }
    setChannel(value) { this.setParameters({ ch: value }); }

    getParameters() {
        return {
            type: this.constructor.name,
            dl: this.dl,
            ch: this.ch,
            enabled: this.enabled
        };
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'time-alignment-plugin-ui plugin-parameter-ui';

        // Channel selector row
        const channelRow = document.createElement('div');
        channelRow.className = 'parameter-row';
        const channelLabel = document.createElement('label');
        channelLabel.textContent = 'Channel:';
        channelRow.appendChild(channelLabel);

        const channelContainer = document.createElement('div');
        channelContainer.className = 'radio-group';
        const channels = ['All', 'Left', 'Right'];
        channels.forEach(ch => {
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `channel-${this.id}`;
            radio.value = ch;
            radio.checked = this.ch === ch;
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.setChannel(radio.value);
                }
            });
            label.appendChild(radio);
            label.appendChild(document.createTextNode(ch));
            channelContainer.appendChild(label);
        });
        channelRow.appendChild(channelContainer);
        container.appendChild(channelRow);

        // Delay parameter
        const delayRow = document.createElement('div');
        delayRow.className = 'parameter-row';
        const delayLabel = document.createElement('label');
        delayLabel.textContent = 'Delay:';
        delayRow.appendChild(delayLabel);

        const delaySlider = document.createElement('input');
        delaySlider.type = 'range';
        delaySlider.min = '0';
        delaySlider.max = this.maxDelayTime;
        delaySlider.step = '0.01';
        delaySlider.value = this.dl;

        const delayValue = document.createElement('input');
        delayValue.type = 'number';
        delayValue.min = '0';
        delayValue.max = this.maxDelayTime;
        delayValue.step = '0.01';
        delayValue.value = this.dl;

        delaySlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.setDelay(val);
            delayValue.value = val;
        });

        delayValue.addEventListener('input', (e) => {
            let val = parseFloat(e.target.value) || 0;
            if (val < 0) val = 0;
            if (val > this.maxDelayTime) val = this.maxDelayTime;
            this.setDelay(val);
            delaySlider.value = val;
            e.target.value = val;
        });

        delayRow.appendChild(delaySlider);
        delayRow.appendChild(delayValue);
        container.appendChild(delayRow);

        return container;
    }
}

window.TimeAlignmentPlugin = TimeAlignmentPlugin;