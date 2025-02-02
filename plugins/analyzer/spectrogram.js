class SpectrogramPlugin extends PluginBase {
    constructor() {
        super('Spectrogram', 'Real-time spectrogram analyzer');
        
        // Initialize parameters
        this.dr = -96;
        this.pt = 10;
        this.ch = 'All';
        const fftSize = Math.pow(2, this.pt);
        this.spectrum = new Float32Array(fftSize / 2).fill(-144);
        this.lastProcessTime = performance.now() / 1000;
        this.sampleRate = 48000;

        // Initialize FFT buffers and tables
        this.real = new Float32Array(fftSize);
        this.imag = new Float32Array(fftSize);
        this.window = new Float32Array(fftSize);
        
        // Initialize sin/cos tables for FFT
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

        // Initialize ImageData cache
        this.imageDataCache = null;
        this.tempCanvas = null;
        this.tempCtx = null;

        // Store event listeners for cleanup
        this.boundEventListeners = new Map();

        // Register processor function
        this.registerProcessor(SpectrogramPlugin.processorFunction);
    }

    static processorFunction = `
        // Create result buffer
        const result = new Float32Array(data.length);
        result.set(data);

        const { channelCount, blockSize, pt, ch } = parameters;
        const fftSize = Math.pow(2, pt);
        
        // Initialize context if needed
        if (!context.initialized || context.fftSize !== fftSize || context.buffer?.length !== channelCount) {
            // Clean up old buffers if they exist
            if (context.buffer) {
                context.buffer.forEach(buffer => buffer.fill(0));
            }
            
            // Create new buffers
            context.buffer = new Array(channelCount).fill().map(() => new Float32Array(fftSize));
            context.bufferPosition = 0;
            context.fftSize = fftSize;
            context.initialized = true;
        }

        // Always process input data for UI updates
        for (let i = 0; i < blockSize; i++) {
            // Store in circular buffer
            for (let ch = 0; ch < channelCount; ch++) {
                context.buffer[ch][context.bufferPosition] = data[ch * blockSize + i];
            }
            context.bufferPosition = (context.bufferPosition + 1) % fftSize;
        }

        // Send buffer to UI every half FFT size
        if (context.bufferPosition % (fftSize / 2) === 0) {
            // Create measurements object with buffer copy to prevent reference holding
            result.measurements = {
                buffer: context.buffer.map(buf => Float32Array.from(buf)),
                bufferPosition: context.bufferPosition,
                time: time,
                sampleRate: sampleRate
            };
        }

        return result;
    `;

    // FFT implementation
    fft(real, imag) {
        const n = real.length;
        
        // Bit reversal
        for (let i = 0; i < n; i++) {
            const j = this.reverseBits(i, n);
            if (j > i) {
                [real[i], real[j]] = [real[j], real[i]];
                [imag[i], imag[j]] = [imag[j], imag[i]];
            }
        }

        // FFT
        for (let stage = 1, size = 2; size <= n; stage++, size *= 2) {
            const halfSize = size >> 1;
            const shift = this.pt - stage;
            
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

    reverseBits(x, n) {
        let result = 0;
        const bits = this.pt;
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
        return Math.max(0, Math.min(255, y));
    }

    // Convert FFT bin index to frequency
    binToFreq(bin, fftSize) {
        return (bin * this.sampleRate) / fftSize;
    }

    // Parameter setters
    setDBRange(value) {
        this.dr = Math.max(-144, Math.min(-48, typeof value === 'number' ? value : parseFloat(value)));
        this.updateParameters();
    }

    setPoints(value) {
        const newPoints = Math.max(8, Math.min(11, typeof value === 'number' ? value : parseFloat(value)));
        if (newPoints === this.pt) return;

        const fftSize = Math.pow(2, newPoints);

        // Create new arrays first
        const newSpectrum = new Float32Array(fftSize / 2).fill(-144);
        const newReal = new Float32Array(fftSize);
        const newImag = new Float32Array(fftSize);
        const newWindow = new Float32Array(fftSize);
        const newSinTable = new Float32Array(fftSize);
        const newCosTable = new Float32Array(fftSize);

        // Initialize tables
        for (let i = 0; i < fftSize; i++) {
            const angle = -2 * Math.PI * i / fftSize;
            newSinTable[i] = Math.sin(angle);
            newCosTable[i] = Math.cos(angle);
            newWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / fftSize));
        }

        // Update all references atomically
        this.pt = newPoints;
        this.spectrum = newSpectrum;
        this.real = newReal;
        this.imag = newImag;
        this.window = newWindow;
        this.sinTable = newSinTable;
        this.cosTable = newCosTable;

        // Reset spectrogram buffer
        this.spectrogramBuffer = new Float32Array(256 * 1024).fill(-144);

        // Reset time tracking
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
        // Update parameters
        if (params.enabled !== undefined) this.enabled = params.enabled;
        if (params.dr !== undefined) this.setDBRange(params.dr);
        if (params.pt !== undefined) this.setPoints(params.pt);
        if (params.ch !== undefined) this.setChannel(params.ch);

        // Always update parameters after all changes
        this.updateParameters();
    }

    onMessage(message) {
        if (message.type === 'processBuffer' && message.buffer) {
            this.process(message.buffer, message);
        }
    }

    process(audioBuffer, message) {
        if (!audioBuffer || !message?.measurements?.buffer) {
            return audioBuffer;
        }

        // Skip processing if plugin is disabled
        if (!this.enabled) {
            return audioBuffer;
        }

        const fftSize = Math.pow(2, this.pt);
        const bufferPosition = message.measurements.bufferPosition;
        const [bufferL, bufferR] = message.measurements.buffer;

        // Reset FFT buffers
        this.real.fill(0);
        this.imag.fill(0);

        // Copy and window the time domain data
        for (let i = 0; i < fftSize; i++) {
            const pos = (bufferPosition + i) % fftSize;
            let sample = 0;
            
            if (this.ch === 'All') {
                sample = (bufferL[pos] + bufferR[pos]) / 2;
            } else if (this.ch === 'Left') {
                sample = bufferL[pos];
            } else {
                sample = bufferR[pos];
            }
            
            this.real[i] = sample * this.window[i];
        }

        // Perform FFT
        this.fft(this.real, this.imag);

        // Calculate magnitude spectrum
        for (let i = 0; i < fftSize / 2; i++) {
            // Calculate raw power
            const rawPower = this.real[i] * this.real[i] + this.imag[i] * this.imag[i];
            
            // Apply corrections:
            // 1. FFT scaling correction: -20*log10(N) to compensate for 1/N^2 in power
            // 2. Hann window power correction: +10*log10(8/3)
            // 3. Single-sided spectrum correction: +10*log10(2)
            const fftSizeCorrection = -20 * Math.log10(fftSize);
            const windowPowerCorrection = 10 * Math.log10(8/3);
            const singleSideCorrection = 10 * Math.log10(2);
            const totalCorrection = fftSizeCorrection + windowPowerCorrection + singleSideCorrection;
            
            // Convert to dB with corrections
            const db = 10 * Math.log10(rawPower + 1e-24) + totalCorrection;
            // Only clamp to minimum -144 dB
            this.spectrum[i] = Math.max(-144, db);
        }

        // Scroll both spectrogram buffer and ImageData cache left by 1 pixel
        for (let y = 0; y < 256; y++) {
            // Scroll spectrogram buffer
            for (let x = 0; x < 1023; x++) {
                this.spectrogramBuffer[y * 1024 + x] = this.spectrogramBuffer[y * 1024 + x + 1];
            }
            
            // Scroll ImageData cache
            const rowOffset = y * 1024 * 4;
            for (let x = 0; x < 1023; x++) {
                const srcOffset = rowOffset + (x + 1) * 4;
                const dstOffset = rowOffset + x * 4;
                this.imageDataCache.data[dstOffset] = this.imageDataCache.data[srcOffset];         // R
                this.imageDataCache.data[dstOffset + 1] = this.imageDataCache.data[srcOffset + 1]; // G
                this.imageDataCache.data[dstOffset + 2] = this.imageDataCache.data[srcOffset + 2]; // B
                this.imageDataCache.data[dstOffset + 3] = 255;                                     // A
            }
        }

        // Add new spectrum data to right edge using log frequency scale with linear interpolation
        const fftSize2 = fftSize / 2;
        const newColumn = new Float32Array(256).fill(-144);
        
        // For each output frequency bin
        const minFreq = 20;
        const maxFreq = 40000;
        const logMin = Math.log10(minFreq);
        const logMax = Math.log10(maxFreq);
    for (let y = 0; y < 256; y++) {
            // Convert y coordinate back to frequency
            const freq = Math.pow(10, logMin + (logMax - logMin) * (255 - y) / 255);
            
            // Find the FFT bins that bracket this frequency
            const binFloat = (freq * fftSize) / this.sampleRate;
            const bin1 = Math.floor(binFloat);
            const bin2 = Math.min(bin1 + 1, fftSize2 - 1);
            
            if (bin1 >= 0 && bin1 < fftSize2) {
                // Linear interpolation between bins
                const frac = binFloat - bin1;
                const value1 = this.spectrum[bin1];
                const value2 = this.spectrum[bin2];
                newColumn[y] = value1 + (value2 - value1) * frac;
            }
        }

        // Copy to spectrogram buffer and update ImageData cache
        for (let y = 0; y < 256; y++) {
            // Update spectrogram buffer
            this.spectrogramBuffer[y * 1024 + 1023] = newColumn[y];
            
            // Update ImageData cache for the new column
            const color = this.dbToColor(newColumn[y]);
            const match = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
            if (match) {
                const offset = (y * 1024 + 1023) * 4;
                this.imageDataCache.data[offset] = parseInt(match[1]);     // R
                this.imageDataCache.data[offset + 1] = parseInt(match[2]); // G
                this.imageDataCache.data[offset + 2] = parseInt(match[3]); // B
                this.imageDataCache.data[offset + 3] = 255;               // A
            }
        }

        if (message.measurements.sampleRate) {
            this.sampleRate = message.measurements.sampleRate;
        }
        this.updateParameters();
        
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
            const value = parseInt(e.target.value);
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
        pointsSlider.max = 11;
        pointsSlider.step = 1;
        pointsSlider.value = this.pt;

        const pointsValue = document.createElement('input');
        pointsValue.type = 'number';
        pointsValue.value = Math.pow(2, this.pt);
        pointsValue.step = 1;
        pointsValue.min = Math.pow(2, 8);
        pointsValue.max = Math.pow(2, 11);

        const pointsHandler = (e) => {
            const value = parseInt(e.target.value);
            pointsValue.value = Math.pow(2, value);
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
        const channelRadios = channels.map(ch => {
            const label = document.createElement('label');
            label.className = 'radio-label';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `channel-${this.id}`;
            radio.value = ch;
            radio.checked = ch === this.ch;
            
            const radioHandler = (e) => {
                if (e.target.checked) {
                    const value = e.target.value;
                    this.setChannel(value);
                }
            };
            radio.addEventListener('change', radioHandler);
            this.boundEventListeners.set(radio, radioHandler);
            
            label.appendChild(radio);
            label.appendChild(document.createTextNode(ch));
            return label;
        });

        channelRow.appendChild(channelLabel);
        channelRadios.forEach(radio => channelRow.appendChild(radio));

        // Graph container
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
        
        // Initialize temporary canvas for ImageData manipulation
        this.tempCanvas = document.createElement('canvas');
        this.tempCanvas.width = 1024;
        this.tempCanvas.height = 256;
        this.tempCtx = this.tempCanvas.getContext('2d');
        
        // Initialize ImageData cache
        this.imageDataCache = this.tempCtx.createImageData(1024, 256);
        
        // Fill initial ImageData with black pixels
        for (let i = 0; i < this.imageDataCache.data.length; i += 4) {
            this.imageDataCache.data[i] = 0;     // R
            this.imageDataCache.data[i + 1] = 0; // G
            this.imageDataCache.data[i + 2] = 0; // B
            this.imageDataCache.data[i + 3] = 255; // A
        }
        
        graphContainer.appendChild(canvas);

        // Add all elements to container
        container.appendChild(dbRangeRow);
        container.appendChild(pointsRow);
        container.appendChild(channelRow);
        container.appendChild(graphContainer);

        // Store canvas reference
        this.canvas = canvas;

        // Start animation immediately
        this.startAnimation();

        return container;
    }

    startAnimation() {
        // Cancel any existing animation
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Start new animation loop
        const animate = () => {
            if (!this.canvas) return;
            
            this.drawGraph();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        this.animationFrameId = requestAnimationFrame(animate);
    }

    cleanup() {
        // Reset time tracking only
        this.lastProcessTime = performance.now() / 1000;
    }

    // Convert dB value to heatmap color
    dbToColor(db) {
        // If dB is over 0, return white
        if (db > 0) {
            db = 0;
        }

        // Map dB range to 0-1
        const normalizedValue = (db - this.dr) / (-this.dr);
        const clampedValue = Math.max(0, Math.min(1, normalizedValue));

        // Color stops for the gradient
        // 0.0(#000) -> 0.166..(#00f) -> 0.333..(#0ff) -> 0.5(#0f0) -> 0.666..(#ff0) -> 0.833..(#f00) -> 1.0(#fff)
        const colorStops = [
            { pos: 0.000, r: 0,   g: 0,   b: 0   }, // 黒
            { pos: 0.166, r: 0,   g: 0,   b: 255 }, // 青
            { pos: 0.333, r: 0,   g: 255, b: 255 }, // シアン
            { pos: 0.500, r: 0,   g: 255, b: 0   }, // 緑
            { pos: 0.666, r: 255, g: 255, b: 0   }, // 黄
            { pos: 0.833, r: 255, g: 0,   b: 0   }, // 赤
            { pos: 1.000, r: 255, g: 255, b: 255 }  // 白
        ];

        // Find the two color stops that bracket our value
        let lower = colorStops[0];
        let upper = colorStops[colorStops.length - 1];
        
        for (let i = 0; i < colorStops.length - 1; i++) {
            if (clampedValue >= colorStops[i].pos && clampedValue <= colorStops[i + 1].pos) {
                lower = colorStops[i];
                upper = colorStops[i + 1];
                break;
            }
        }

        // Calculate how far between the two stops our value is
        const range = upper.pos - lower.pos;
        const normalizedPos = range === 0 ? 0 : (clampedValue - lower.pos) / range;

        // Interpolate between the two colors
        const brightness = 0.75
        const r = Math.round((lower.r + (upper.r - lower.r) * normalizedPos)* brightness);
        const g = Math.round((lower.g + (upper.g - lower.g) * normalizedPos)* brightness);
        const b = Math.round((lower.b + (upper.b - lower.b) * normalizedPos)* brightness);

        return `rgb(${r},${g},${b})`;
    }

    drawGraph() {
        if (!this.canvas) return;
        
        const ctx = this.canvas.getContext('2d', { alpha: false });
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas with background color
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Draw spectrogram using cached ImageData
        this.tempCtx.putImageData(this.imageDataCache, 0, 0);
        ctx.drawImage(this.tempCanvas, 0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;

        // Vertical grid lines (frequency)
        const freqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 40000];
        freqs.forEach(freq => {
            const y = height * this.freqToY(freq) / 256;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Frequency labels
            if (freq !== 20 && freq !== 40000) {
                ctx.fillStyle = '#ccc';
                ctx.font = '24px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(freq >= 1000 ? `${freq/1000}k` : freq.toString(), 160, y + 12);
            }
        });

        // Draw axis labels
        ctx.fillStyle = '#fff';
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        
        // Draw "Time" label
        ctx.fillText('Time', width/2, height - 10);
        
        // Draw "Frequency (Hz)" label
        ctx.save();
        ctx.translate(40, height/2);
        ctx.rotate(-Math.PI/2);
        ctx.fillText('Frequency (Hz)', 0, 0);
        ctx.restore();
    }
}

// Register plugin
if (typeof window !== 'undefined') {
    window.SpectrogramPlugin = SpectrogramPlugin;
}
