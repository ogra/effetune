class PitchShifterPlugin extends PluginBase {
    constructor() {
        super('Pitch Shifter', 'Change the pitch of audio');

        // Initialize parameters
        this.ps = 0;      // Pitch Shift (semitones), range: -6 to +6
        this.ft = 0;      // Fine Tune (cents), range: -50 to +50
        this.ws = 150;    // Window Size (ms), range: 80-500ms (1ms step)
        this.xf = 35;     // XFade Time (ms), range: 20-40ms (0.1ms step)

        // Register signal processing code as a string
        this.registerProcessor(`
            const { ps, ft, ws, xf, channelCount, blockSize, sampleRate } = parameters;
            let pitchFactor = (ps === 0 && ft === 0) ? 1.0 : Math.pow(2, ps / 12 + ft / 1200);
            if (!parameters.enabled || pitchFactor == 1.0) return data;
            // Convert window size from ms to samples
            const windowSize = Math.floor(ws * sampleRate / 1000);
            // Convert XFade time from ms to samples
            const hopSize = Math.floor(xf * sampleRate / 1000);
            if (!isFinite(pitchFactor)) pitchFactor = 1.0;
            const bufferSize = windowSize * 3;
            const needsReset = !context.initialized ||
                               context.inputBuffer?.length !== channelCount ||
                               context.windowSize !== windowSize;
            if (needsReset) {
                context.windowSize = windowSize;
                context.inputBuffer = new Array(channelCount);
                context.outputBuffer = new Array(channelCount);
                context.inputWriteIndex = new Array(channelCount);
                context.processCounter = new Array(channelCount);
                context.outputWriteIndex = new Array(channelCount);
                context.outputReadPos = new Array(channelCount);
                for (let ch = 0; ch < channelCount; ch++) {
                    context.inputBuffer[ch] = new Float32Array(windowSize);
                    context.outputBuffer[ch] = new Float32Array(bufferSize);
                    context.inputWriteIndex[ch] = 0;
                    context.processCounter[ch] = 0;
                    context.outputWriteIndex[ch] = 0;
                    context.outputReadPos[ch] = 0.0;
                }
                context.initialized = true;
            }
            const targetUnread = hopSize * pitchFactor + 1;
            for (let ch = 0; ch < channelCount; ch++) {
                const inOffset = ch * blockSize;
                const inBuf = context.inputBuffer[ch];
                const outBuf = context.outputBuffer[ch];
                for (let i = 0; i < blockSize; i++) {
                    inBuf[context.inputWriteIndex[ch]] = data[inOffset + i];
                    context.inputWriteIndex[ch] = (context.inputWriteIndex[ch] + 1) % windowSize;
                    context.processCounter[ch]++;

                    let unread = (context.outputWriteIndex[ch] - Math.floor(context.outputReadPos[ch]) + bufferSize) % bufferSize;
                    while (unread < targetUnread && context.processCounter[ch] >= windowSize) {
                        const windowedFrame = new Float32Array(windowSize);
                        for (let j = 0; j < windowSize; j++) {
                            const wrappedIndex = (context.inputWriteIndex[ch] + j) % windowSize;
                            let inputFrame = context.inputBuffer[ch][wrappedIndex];
                            windowedFrame[j] = (j < hopSize)
                                ? inputFrame * Math.sqrt(((j + 1) / hopSize))
                                : (j < windowSize - hopSize)
                                    ? inputFrame
                                    : inputFrame * Math.sqrt(((windowSize - j) / hopSize));
                        }
                        for (let j = 0; j < windowSize; j++) {
                            const pos = (context.outputWriteIndex[ch] + j) % bufferSize;
                            if (j < hopSize) {
                                outBuf[pos] += windowedFrame[j];
                            } else {
                                outBuf[pos] = windowedFrame[j];
                            }
                        }
                        context.outputWriteIndex[ch] = (context.outputWriteIndex[ch] + windowSize - hopSize) % bufferSize;
                        unread = (context.outputWriteIndex[ch] - Math.floor(context.outputReadPos[ch]) + bufferSize) % bufferSize;
                    }
                }
            }
            const finalOutput = new Float32Array(data.length);
            for (let ch = 0; ch < channelCount; ch++) {
                const outBuf = context.outputBuffer[ch];
                const outOffset = ch * blockSize;
                let readPos = context.outputReadPos[ch];
                if (!isFinite(readPos)) readPos = 0;
                unread = (context.outputWriteIndex[ch] - Math.floor(context.outputReadPos[ch]) + bufferSize) % bufferSize;
                if (unread >= targetUnread) {
                    for (let i = 0; i < blockSize; i++) {
                        const intIndex = Math.floor(readPos) % bufferSize;
                        const nextIndex = (intIndex + 1) % bufferSize;
                        const frac = readPos - Math.floor(readPos);
                        finalOutput[outOffset + i] = (1 - frac) * outBuf[intIndex] + frac * outBuf[nextIndex];
                        readPos += pitchFactor;
                        if (readPos >= bufferSize) readPos -= bufferSize;
                    }
                }
                context.outputReadPos[ch] = readPos;
            }
            return finalOutput;
        `);
    }

    getParameters() {
        return {
            type: this.constructor.name,
            ps: this.ps,
            ft: this.ft,
            ws: this.ws,
            xf: this.xf,
            enabled: this.enabled
        };
    }

    setParameters(params) {
        if (params.ps !== undefined) {
            this.ps = Math.max(-6, Math.min(6, Math.round(params.ps)));
        }
        if (params.ft !== undefined) {
            this.ft = Math.max(-50, Math.min(50, Math.round(params.ft)));
        }
        if (params.ws !== undefined) {
            const size = parseFloat(params.ws);
            if (!isNaN(size)) {
                // Window Size range: 80-500ms (1ms step)
                this.ws = Math.max(80, Math.min(500, Math.round(size)));
            }
        }
        if (params.xf !== undefined) {
            const xfade = parseFloat(params.xf);
            if (!isNaN(xfade)) {
                // XFade Time range: 20-40ms (0.1ms step)
                this.xf = Math.max(20, Math.min(40, Math.round(xfade * 10) / 10));
            }
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    setPitchShifter(value) {
        this.setParameters({ ps: value });
    }

    setFineTune(value) {
        this.setParameters({ ft: value });
    }

    setWindowSize(value) {
        this.setParameters({ ws: value });
    }

    setXFadeTime(value) {
        this.setParameters({ xf: value });
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'pitch-shift-plugin-ui plugin-parameter-ui';

        // Pitch Shift slider
        const PitchShifterRow = document.createElement('div');
        PitchShifterRow.className = 'parameter-row';
        const PitchShifterLabel = document.createElement('label');
        PitchShifterLabel.textContent = 'Pitch Shift (semitones):';
        PitchShifterRow.appendChild(PitchShifterLabel);

        const PitchShifterSlider = document.createElement('input');
        PitchShifterSlider.type = 'range';
        PitchShifterSlider.min = -6;
        PitchShifterSlider.max = 6;
        PitchShifterSlider.step = 1;
        PitchShifterSlider.value = this.ps;

        const PitchShifterValue = document.createElement('input');
        PitchShifterValue.type = 'number';
        PitchShifterValue.min = -6;
        PitchShifterValue.max = 6;
        PitchShifterValue.step = 1;
        PitchShifterValue.value = this.ps;

        PitchShifterSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.setPitchShifter(value);
            PitchShifterValue.value = value;
        });
        PitchShifterValue.addEventListener('input', (e) => {
            const value = Math.max(-6, Math.min(6, parseInt(e.target.value) || 0));
            this.setPitchShifter(value);
            PitchShifterSlider.value = value;
            e.target.value = value;
        });

        PitchShifterRow.appendChild(PitchShifterSlider);
        PitchShifterRow.appendChild(PitchShifterValue);
        container.appendChild(PitchShifterRow);

        // Fine Tune slider
        const fineTuneRow = document.createElement('div');
        fineTuneRow.className = 'parameter-row';
        const fineTuneLabel = document.createElement('label');
        fineTuneLabel.textContent = 'Fine Tune (cents):';
        fineTuneRow.appendChild(fineTuneLabel);

        const fineTuneSlider = document.createElement('input');
        fineTuneSlider.type = 'range';
        fineTuneSlider.min = -50;
        fineTuneSlider.max = 50;
        fineTuneSlider.step = 1;
        fineTuneSlider.value = this.ft;

        const fineTuneValue = document.createElement('input');
        fineTuneValue.type = 'number';
        fineTuneValue.min = -50;
        fineTuneValue.max = 50;
        fineTuneValue.step = 1;
        fineTuneValue.value = this.ft;

        fineTuneSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.setFineTune(value);
            fineTuneValue.value = value;
        });
        fineTuneValue.addEventListener('input', (e) => {
            const value = Math.max(-50, Math.min(50, parseInt(e.target.value) || 0));
            this.setFineTune(value);
            fineTuneSlider.value = value;
            e.target.value = value;
        });

        fineTuneRow.appendChild(fineTuneSlider);
        fineTuneRow.appendChild(fineTuneValue);
        container.appendChild(fineTuneRow);

        // Window Size slider (ms)
        const windowSizeRow = document.createElement('div');
        windowSizeRow.className = 'parameter-row';
        const windowSizeLabel = document.createElement('label');
        windowSizeLabel.textContent = 'Window Size (ms):';
        windowSizeRow.appendChild(windowSizeLabel);

        const windowSizeSlider = document.createElement('input');
        windowSizeSlider.type = 'range';
        windowSizeSlider.min = 80;
        windowSizeSlider.max = 500;
        windowSizeSlider.step = 1;
        windowSizeSlider.value = this.ws;

        const windowSizeValue = document.createElement('input');
        windowSizeValue.type = 'number';
        windowSizeValue.min = 80;
        windowSizeValue.max = 500;
        windowSizeValue.step = 1;
        windowSizeValue.value = this.ws;

        windowSizeSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.setWindowSize(value);
            windowSizeValue.value = value;
        });

        windowSizeValue.addEventListener('input', (e) => {
            const value = Math.max(80, Math.min(500, parseInt(e.target.value) || 80));
            this.setWindowSize(value);
            windowSizeSlider.value = value;
            e.target.value = value;
        });

        windowSizeRow.appendChild(windowSizeSlider);
        windowSizeRow.appendChild(windowSizeValue);
        container.appendChild(windowSizeRow);

        // XFade Time slider (ms)
        const xfadeTimeRow = document.createElement('div');
        xfadeTimeRow.className = 'parameter-row';
        const xfadeTimeLabel = document.createElement('label');
        xfadeTimeLabel.textContent = 'XFade Time (ms):';
        xfadeTimeRow.appendChild(xfadeTimeLabel);

        const xfadeTimeSlider = document.createElement('input');
        xfadeTimeSlider.type = 'range';
        xfadeTimeSlider.min = 20;
        xfadeTimeSlider.max = 40;
        xfadeTimeSlider.step = 0.1;
        xfadeTimeSlider.value = this.xf;

        const xfadeTimeValue = document.createElement('input');
        xfadeTimeValue.type = 'number';
        xfadeTimeValue.min = 20;
        xfadeTimeValue.max = 40;
        xfadeTimeValue.step = 0.1;
        xfadeTimeValue.value = this.xf;

        xfadeTimeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.setXFadeTime(value);
            xfadeTimeValue.value = value;
        });

        xfadeTimeValue.addEventListener('input', (e) => {
            const value = Math.max(5, Math.min(40, parseFloat(e.target.value) || 5));
            this.setXFadeTime(value);
            xfadeTimeSlider.value = value;
            e.target.value = value;
        });

        xfadeTimeRow.appendChild(xfadeTimeSlider);
        xfadeTimeRow.appendChild(xfadeTimeValue);
        container.appendChild(xfadeTimeRow);

        return container;
    }
}

window.PitchShifterPlugin = PitchShifterPlugin;
