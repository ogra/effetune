class SpectrogramPlugin extends PluginBase {
    constructor() {
        super('Spectrogram', 'Real-time spectrogram analyzer');
        
        // Initialize parameters
        this.dr = -96;
        this.pt = 12;  // exponent for FFT size (2^pt)
        this.ch = 'All';
        const fftSize = 1 << this.pt; // using bit shift for power of 2
        this.spectrum = new Float32Array(fftSize >> 1).fill(-144);
        this.lastProcessTime = performance.now() / 1000;
        this.sampleRate = 48000;

        // Initialize FFT buffers and tables
        this.real = new Float32Array(fftSize);
        this.imag = new Float32Array(fftSize);
        this.window = new Float32Array(fftSize);
        
        // Precompute sin/cos tables for FFT
        this.sinTable = new Float32Array(fftSize);
        this.cosTable = new Float32Array(fftSize);
        for (let i = 0; i < fftSize; i++) {
            const angle = -2 * Math.PI * i / fftSize;
            this.sinTable[i] = Math.sin(angle);
            this.cosTable[i] = Math.cos(angle);
        }

        // Initialize Hann window
        for (let i = 0; i < fftSize; i++) {
            this.window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / fftSize));
        }

        // Initialize spectrogram buffer (256 frequency bins x 1024 time points)
        this.spectrogramBuffer = new Float32Array(256 * 1024).fill(-144);

        // Initialize ImageData cache and temporary canvas for drawing
        this.imageDataCache = null;
        this.tempCanvas = null;
        this.tempCtx = null;

        // Cache for main canvas context
        this.canvasCtx = null;
        this.canvas = null;

        // Store event listeners for cleanup
        this.boundEventListeners = new Map();

        // Register processor function (used e.g. in an AudioWorklet)
        this.registerProcessor(SpectrogramPlugin.processorFunction);
    }

    // Processor function as a string (runs in separate context)
    static processorFunction = `
        // Create result buffer
        const result = new Float32Array(data.length);
        result.set(data);

        const { channelCount, blockSize, pt, ch } = parameters;
        const fftSize = Math.pow(2, pt);
        
        // Initialize context if needed
        if (!context.initialized || context.fftSize !== fftSize || !context.buffer || context.buffer.length !== channelCount) {
            if (context.buffer) {
                context.buffer.forEach(buf => buf.fill(0));
            }
            context.buffer = new Array(channelCount);
            for (let i = 0; i < channelCount; i++) {
                context.buffer[i] = new Float32Array(fftSize);
            }
            context.bufferPosition = 0;
            context.fftSize = fftSize;
            context.initialized = true;
        }

        // Process input data for UI updates
        for (let i = 0; i < blockSize; i++) {
            for (let chIndex = 0; chIndex < channelCount; chIndex++) {
                context.buffer[chIndex][context.bufferPosition] = data[chIndex * blockSize + i];
            }
            context.bufferPosition = (context.bufferPosition + 1) % fftSize;
        }

        // Send buffer to UI every half FFT size
        if (context.bufferPosition % (fftSize / 2) === 0) {
            result.measurements = {
                buffer: context.buffer.map(buf => Float32Array.from(buf)),
                bufferPosition: context.bufferPosition,
                time: time,
                sampleRate: sampleRate
            };
        }

        return result;
    `;

    // FFT implementation using Cooley-Tukey algorithm
    fft(real, imag) {
        const n = real.length;
        const bits = this.pt; // log2(n)
        // Bit reversal
        for (let i = 0; i < n; i++) {
            const j = this.reverseBits(i, bits);
            if (j > i) {
                const tempR = real[i];
                real[i] = real[j];
                real[j] = tempR;
                const tempI = imag[i];
                imag[i] = imag[j];
                imag[j] = tempI;
            }
        }

        // FFT: butterfly computation
        for (let stage = 1, size = 2; size <= n; stage++, size <<= 1) {
            const halfSize = size >> 1;
            const shift = bits - stage;
            for (let i = 0; i < n; i += size) {
                for (let j = i, k = 0; j < i + halfSize; j++, k++) {
                    const tableIndex = (k << shift) & (n - 1);
                    const cos = this.cosTable[tableIndex];
                    const sin = this.sinTable[tableIndex];
                    const tr = real[j + halfSize] * cos - imag[j + halfSize] * sin;
                    const ti = real[j + halfSize] * sin + imag[j + halfSize] * cos;
                    real[j + halfSize] = real[j] - tr;
                    imag[j + halfSize] = imag[j] - ti;
                    real[j] += tr;
                    imag[j] += ti;
                }
            }
        }
    }

    // Reverse bits of x with 'bits' significant bits
    reverseBits(x, bits) {
        let result = 0;
        for (let i = 0; i < bits; i++) {
            result = (result << 1) | (x & 1);
            x >>= 1;
        }
        return result;
    }

    // Convert frequency to log-scaled y coordinate (0-255)
    freqToY(freq) {
        const minFreq = 20;
        const maxFreq = 40000;
        const logMin = Math.log10(minFreq);
        const logMax = Math.log10(maxFreq);
        const y = 255 - Math.round(255 * (Math.log10(Math.max(freq, minFreq)) - logMin) / (logMax - logMin));
        return y < 0 ? 0 : (y > 255 ? 255 : y);
    }

    // Convert FFT bin index to frequency
    binToFreq(bin, fftSize) {
        return (bin * this.sampleRate) / fftSize;
    }

    // Parameter setters
    setDBRange(value) {
        const val = typeof value === 'number' ? value : parseFloat(value);
        this.dr = Math.max(-144, Math.min(-48, val));
        this.updateParameters();
    }

    setPoints(value) {
        const newPoints = Math.max(8, Math.min(14, typeof value === 'number' ? value : parseFloat(value)));
        if (newPoints === this.pt) return;
        const fftSize = 1 << newPoints;
        // Reinitialize arrays with new FFT size
        this.spectrum = new Float32Array(fftSize >> 1).fill(-144);
        this.real = new Float32Array(fftSize);
        this.imag = new Float32Array(fftSize);
        this.window = new Float32Array(fftSize);
        this.sinTable = new Float32Array(fftSize);
        this.cosTable = new Float32Array(fftSize);
        for (let i = 0; i < fftSize; i++) {
            const angle = -2 * Math.PI * i / fftSize;
            this.sinTable[i] = Math.sin(angle);
            this.cosTable[i] = Math.cos(angle);
            this.window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / fftSize));
        }
        this.pt = newPoints;
        // Reset spectrogram buffer
        this.spectrogramBuffer = new Float32Array(256 * 1024).fill(-144);
        this.lastProcessTime = performance.now() / 1000;
        this.updateParameters();
    }

    setChannel(value) {
        if (['All', 'Left', 'Right'].includes(value)) {
            this.ch = value;
            this.updateParameters();
        }
    }

    // Reset parameters
    reset() {
        this.setDBRange(-96);
        this.setPoints(10);
        this.setChannel('All');
        this.spectrogramBuffer.fill(-144);
    }

    getParameters() {
        return {
            type: this.constructor.name,
            enabled: this.enabled,
            dr: this.dr,
            pt: this.pt,
            ch: this.ch
        };
    }

    setParameters(params) {
        if (params.enabled !== undefined) this.enabled = params.enabled;
        if (params.dr !== undefined) this.setDBRange(params.dr);
        if (params.pt !== undefined) this.setPoints(params.pt);
        if (params.ch !== undefined) this.setChannel(params.ch);
        this.updateParameters();
    }

    onMessage(message) {
        if (message.type === 'processBuffer' && message.buffer) {
            this.process(message.buffer, message);
        }
    }

    process(audioBuffer, message) {
        if (!audioBuffer || !message?.measurements?.buffer) return audioBuffer;
        if (!this.enabled) return audioBuffer;

        const fftSize = 1 << this.pt;
        const bufferPosition = message.measurements.bufferPosition;
        const [bufferL, bufferR] = message.measurements.buffer;

        // Reset FFT buffers
        this.real.fill(0);
        this.imag.fill(0);

        // Copy and window the time domain data using precomputed window
        for (let i = 0; i < fftSize; i++) {
            const pos = (bufferPosition + i) & (fftSize - 1); // faster modulo for power-of-2 sizes
            let sample;
            if (this.ch === 'All') {
                sample = (bufferL[pos] + bufferR[pos]) * 0.5;
            } else if (this.ch === 'Left') {
                sample = bufferL[pos];
            } else {
                sample = bufferR[pos];
            }
            this.real[i] = sample * this.window[i];
        }

        // Perform FFT
        this.fft(this.real, this.imag);

        // Calculate magnitude spectrum and convert to dB
        const fftHalf = fftSize >> 1;
        const fftSizeCorrection = -20 * Math.log10(fftSize);
        const windowPowerCorrection = 10 * Math.log10(8 / 3);
        const singleSideCorrection = 10 * Math.log10(2);
        const totalCorrection = fftSizeCorrection + windowPowerCorrection + singleSideCorrection;
        for (let i = 0; i < fftHalf; i++) {
            const rawPower = this.real[i] * this.real[i] + this.imag[i] * this.imag[i];
            const db = 10 * Math.log10(rawPower + 1e-24) + totalCorrection;
            this.spectrum[i] = db < -144 ? -144 : db;
        }

        // Scroll spectrogramBuffer left by 1 column using copyWithin for each row
        const width = 1024;
        const height = 256;
        for (let y = 0; y < height; y++) {
            const rowStart = y * width;
            this.spectrogramBuffer.copyWithin(rowStart, rowStart + 1, rowStart + width);
        }

        // Scroll ImageData cache left by 1 column if available
        if (this.imageDataCache) {
            // Each row: 1024 pixels * 4 channels = 4096 bytes
            const rowBytes = 1024 * 4;
            for (let y = 0; y < height; y++) {
                const offset = y * rowBytes;
                this.imageDataCache.data.copyWithin(offset, offset + 4, offset + rowBytes);
            }
        }

        // Add new spectrum data to right edge using log frequency scale with linear interpolation
        const newColumn = new Float32Array(height).fill(-144);
        const minFreq = 20;
        const maxFreq = 40000;
        const logMin = Math.log10(minFreq);
        const logMax = Math.log10(maxFreq);
        for (let y = 0; y < height; y++) {
            // Map y (0 to height-1) to frequency (log scale)
            const freq = Math.pow(10, logMin + (logMax - logMin) * (height - 1 - y) / (height - 1));
            const binFloat = (freq * fftSize) / this.sampleRate;
            const bin1 = Math.floor(binFloat);
            const bin2 = (bin1 + 1 < fftHalf) ? bin1 + 1 : bin1;
            const frac = binFloat - bin1;
            const value1 = this.spectrum[bin1];
            const value2 = this.spectrum[bin2];
            newColumn[y] = value1 + (value2 - value1) * frac;
        }

        // Update spectrogramBuffer and ImageData cache for the new rightmost column
        for (let y = 0; y < height; y++) {
            this.spectrogramBuffer[y * width + (width - 1)] = newColumn[y];
            if (this.imageDataCache) {
                // Compute color directly (dbToColor now returns an [r, g, b] array)
                const color = this.dbToColor(newColumn[y]);
                const offset = (y * width + (width - 1)) * 4;
                this.imageDataCache.data[offset] = color[0];
                this.imageDataCache.data[offset + 1] = color[1];
                this.imageDataCache.data[offset + 2] = color[2];
                this.imageDataCache.data[offset + 3] = 255;
            }
        }

        // Update sample rate if changed
        if (message.measurements.sampleRate && this.sampleRate !== message.measurements.sampleRate) {
            this.sampleRate = message.measurements.sampleRate;
            this.updateParameters();
        }
        
        return audioBuffer;
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'plugin-parameter-ui';

        // DB Range parameter row
        const dbRangeRow = document.createElement('div');
        dbRangeRow.className = 'parameter-row';
        const dbRangeLabel = document.createElement('label');
        dbRangeLabel.textContent = 'DB Range (dB):';
        const dbRangeSlider = document.createElement('input');
        dbRangeSlider.type = 'range';
        dbRangeSlider.min = -144;
        dbRangeSlider.max = -48;
        dbRangeSlider.step = 6;
        dbRangeSlider.value = this.dr;
        const dbRangeValue = document.createElement('input');
        dbRangeValue.type = 'number';
        dbRangeValue.value = this.dr;
        dbRangeValue.step = 6;
        dbRangeValue.min = -144;
        dbRangeValue.max = -48;
        const dbRangeHandler = (e) => {
            const value = parseInt(e.target.value, 10);
            dbRangeValue.value = value;
            this.setDBRange(value);
        };
        dbRangeSlider.addEventListener('input', dbRangeHandler);
        this.boundEventListeners.set(dbRangeSlider, dbRangeHandler);
        dbRangeRow.appendChild(dbRangeLabel);
        dbRangeRow.appendChild(dbRangeSlider);
        dbRangeRow.appendChild(dbRangeValue);

        // Points parameter row
        const pointsRow = document.createElement('div');
        pointsRow.className = 'parameter-row';
        const pointsLabel = document.createElement('label');
        pointsLabel.textContent = 'Points:';
        const pointsSlider = document.createElement('input');
        pointsSlider.type = 'range';
        pointsSlider.min = 8;
        pointsSlider.max = 14;
        pointsSlider.step = 1;
        pointsSlider.value = this.pt;
        const pointsValue = document.createElement('input');
        pointsValue.type = 'number';
        pointsValue.value = 1 << this.pt;
        pointsValue.step = 1;
        pointsValue.min = 1 << 8;
        pointsValue.max = 1 << 14;
        const pointsHandler = (e) => {
            const value = parseInt(e.target.value, 10);
            pointsValue.value = 1 << value;
            this.setPoints(value);
        };
        pointsSlider.addEventListener('input', pointsHandler);
        this.boundEventListeners.set(pointsSlider, pointsHandler);
        pointsRow.appendChild(pointsLabel);
        pointsRow.appendChild(pointsSlider);
        pointsRow.appendChild(pointsValue);

        // Channel parameter row
        const channelRow = document.createElement('div');
        channelRow.className = 'parameter-row';
        const channelLabel = document.createElement('label');
        channelLabel.textContent = 'Channel:';
        const channels = ['All', 'Left', 'Right'];
        channels.forEach(chVal => {
            const label = document.createElement('label');
            label.className = 'radio-label';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `channel-${this.id}`;
            radio.value = chVal;
            radio.checked = chVal === this.ch;
            const radioHandler = (e) => {
                if (e.target.checked) {
                    this.setChannel(e.target.value);
                }
            };
            radio.addEventListener('change', radioHandler);
            this.boundEventListeners.set(radio, radioHandler);
            label.appendChild(radio);
            label.appendChild(document.createTextNode(chVal));
            channelRow.appendChild(label);
        });

        // Graph container and main canvas
        const graphContainer = document.createElement('div');
        graphContainer.className = 'graph-container';
        graphContainer.style.position = 'relative';
        graphContainer.style.width = '1024px';
        graphContainer.style.height = '480px';
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 960;
        canvas.style.width = '1024px';
        canvas.style.height = '480px';
        graphContainer.appendChild(canvas);

        // Initialize temporary canvas for ImageData manipulation
        this.tempCanvas = document.createElement('canvas');
        this.tempCanvas.width = 1024;
        this.tempCanvas.height = 256;
        this.tempCtx = this.tempCanvas.getContext('2d');
        this.imageDataCache = this.tempCtx.createImageData(1024, 256);
        // Fill initial ImageData with black pixels
        const data = this.imageDataCache.data;
        for (let i = 0, len = data.length; i < len; i += 4) {
            data[i] = 0;     // R
            data[i + 1] = 0; // G
            data[i + 2] = 0; // B
            data[i + 3] = 255; // A
        }

        container.appendChild(dbRangeRow);
        container.appendChild(pointsRow);
        container.appendChild(channelRow);
        container.appendChild(graphContainer);

        this.canvas = canvas;
        // Cache main canvas context for performance
        this.canvasCtx = this.canvas.getContext('2d', { alpha: false });
        this.startAnimation();
        return container;
    }

    startAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        const animate = () => {
            if (!this.canvas) return;
            this.drawGraph();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        this.animationFrameId = requestAnimationFrame(animate);
    }

    cleanup() {
        // Cancel animation frame
        this.lastProcessTime = performance.now() / 1000;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Remove all event listeners
        for (const [element, listener] of this.boundEventListeners) {
            element.removeEventListener('input', listener);
            element.removeEventListener('change', listener);
        }
        this.boundEventListeners.clear();

        // Release canvas resources
        if (this.tempCtx) {
            this.tempCtx = null;
        }
        if (this.tempCanvas) {
            this.tempCanvas.width = 0;
            this.tempCanvas.height = 0;
            this.tempCanvas = null;
        }
        if (this.canvas) {
            this.canvas.width = 0;
            this.canvas.height = 0;
            this.canvas = null;
        }
        this.canvasCtx = null;
        this.imageDataCache = null;

        // Release buffer references
        this.spectrogramBuffer = null;
        this.real = null;
        this.imag = null;
        this.window = null;
        this.sinTable = null;
        this.cosTable = null;
        this.spectrum = null;
    }

    // Convert dB value to heatmap color and return [r, g, b]
    dbToColor(db) {
        // Clamp db to <= 0
        if (db > 0) db = 0;
        const normalizedValue = (db - this.dr) / (-this.dr);
        const clampedValue = normalizedValue < 0 ? 0 : (normalizedValue > 1 ? 1 : normalizedValue);
        // Color stops for the gradient
        const colorStops = [
            { pos: 0.000, r: 0,   g: 0,   b: 0 },
            { pos: 0.166, r: 0,   g: 0,   b: 255 },
            { pos: 0.333, r: 0,   g: 255, b: 255 },
            { pos: 0.500, r: 0,   g: 255, b: 0 },
            { pos: 0.666, r: 255, g: 255, b: 0 },
            { pos: 0.833, r: 255, g: 0,   b: 0 },
            { pos: 1.000, r: 255, g: 255, b: 255 }
        ];
        let lower = colorStops[0], upper = colorStops[colorStops.length - 1];
        for (let i = 0; i < colorStops.length - 1; i++) {
            if (clampedValue >= colorStops[i].pos && clampedValue <= colorStops[i + 1].pos) {
                lower = colorStops[i];
                upper = colorStops[i + 1];
                break;
            }
        }
        const range = upper.pos - lower.pos;
        const normalizedPos = range === 0 ? 0 : (clampedValue - lower.pos) / range;
        const brightness = 0.75;
        const r = Math.round((lower.r + (upper.r - lower.r) * normalizedPos) * brightness);
        const g = Math.round((lower.g + (upper.g - lower.g) * normalizedPos) * brightness);
        const b = Math.round((lower.b + (upper.b - lower.b) * normalizedPos) * brightness);
        return [r, g, b];
    }

    drawGraph() {
        if (!this.canvasCtx) return;
        const ctx = this.canvasCtx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas with black background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        // Draw spectrogram from cached ImageData
        this.tempCtx.putImageData(this.imageDataCache, 0, 0);
        ctx.drawImage(this.tempCanvas, 0, 0, width, height);

        // Draw grid lines (frequency markers)
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        const freqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 40000];
        for (let i = 0; i < freqs.length; i++) {
            const y = height * this.freqToY(freqs[i]) / 256;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            if (freqs[i] !== 20 && freqs[i] !== 40000) {
                ctx.fillStyle = '#ccc';
                ctx.font = '24px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(freqs[i] >= 1000 ? `${freqs[i] / 1000}k` : freqs[i].toString(), 160, y + 12);
            }
        }
        
        // Draw axis labels
        ctx.fillStyle = '#fff';
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Time', width / 2, height - 10);
        ctx.save();
        ctx.translate(40, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Frequency (Hz)', 0, 0);
        ctx.restore();
    }
}

// Register plugin in browser environment
if (typeof window !== 'undefined') {
    window.SpectrogramPlugin = SpectrogramPlugin;
}
