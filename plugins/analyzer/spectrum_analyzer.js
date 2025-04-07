class SpectrumAnalyzerPlugin extends PluginBase {
    constructor() {
        super('Spectrum Analyzer', 'Real-time spectrum analyzer with peak hold');
        
        // Initialize parameters
        this.dr = -96;
        this.pt = 12;
        this.ch = 'All';
        const fftSize = 1 << this.pt; // Using bit shift for power of 2
        this.spectrum = new Float32Array(fftSize >> 1).fill(-144);
        this.peaks = new Float32Array(fftSize >> 1).fill(-144);
        this.lastProcessTime = performance.now() / 1000;
        this.sampleRate = 48000;

        // Initialize FFT buffers and tables
        this.real = new Float32Array(fftSize);
        this.imag = new Float32Array(fftSize);
        this.window = new Float32Array(fftSize);
        this.sinTable = new Float32Array(fftSize);
        this.cosTable = new Float32Array(fftSize);

        // Combined loop: Initialize sin/cos tables for FFT and Hann window
        const factor = 2 * Math.PI / fftSize;
        for (let i = 0; i < fftSize; i++) {
            const t = factor * i;
            this.sinTable[i] = -Math.sin(t); // sin(-t)
            this.cosTable[i] = Math.cos(t);
            this.window[i] = 0.5 * (1 - Math.cos(t));
        }

        // Store event listeners for cleanup
        this.boundEventListeners = new Map();

        // Register processor function
        this.registerProcessor(SpectrumAnalyzerPlugin.processorFunction);
        this.observer = null;
    }

    static processorFunction = `
        // Create result buffer
        const result = new Float32Array(data.length);
        result.set(data);

        const { channelCount, blockSize, pt, ch } = parameters;
        const fftSize = 1 << pt; // Using bit shift for power of 2
        
        // Initialize context if needed
        if (!context.initialized || context.fftSize !== fftSize || context.buffer?.length !== channelCount) {
            // Clean up old buffers if they exist
            if (context.buffer) {
                context.buffer.forEach(buffer => buffer.fill(0));
            }
            
            // Create new buffers
            context.buffer = new Array(channelCount);
            for (let i = 0; i < channelCount; i++) {
                context.buffer[i] = new Float32Array(fftSize);
            }
            context.bufferPosition = 0;
            context.fftSize = fftSize;
            context.initialized = true;
        }

        // Process input data for UI updates
        for (let chIndex = 0; chIndex < channelCount; chIndex++) {
            const offset = chIndex * blockSize;
            let bufferPosition = context.bufferPosition;
            for (let i = 0; i < blockSize; i++) {
                context.buffer[chIndex][bufferPosition] = data[offset + i];
                bufferPosition = (bufferPosition + 1) & (fftSize - 1);
            }
        }
        context.bufferPosition = (context.bufferPosition + blockSize) & (fftSize - 1);

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

    // FFT implementation
    fft(real, imag) {
        const n = real.length;
        
        // Bit reversal
        for (let i = 0; i < n; i++) {
            const j = this.reverseBits(i);
            if (j > i) {
                [real[i], real[j]] = [real[j], real[i]];
                [imag[i], imag[j]] = [imag[j], imag[i]];
            }
        }

        // FFT
        for (let stage = 1, size = 2; size <= n; stage++, size <<= 1) {
            const halfSize = size >> 1;
            const shift = this.pt - stage;
            
            for (let i = 0; i < n; i += size) {
                for (let j = i, k = 0; j < i + halfSize; j++, k++) {
                    const tableIndex = (k << shift) & (n - 1);
                    const cos = this.cosTable[tableIndex];
                    const sin = this.sinTable[tableIndex];
                    
                    const tr = real[j + halfSize] * cos - imag[j + halfSize] * sin;
                    const ti = real[j + halfSize] * sin + imag[j + halfSize] * cos;
                    
                    real[j + halfSize] = (real[j] - tr) * 0.5;
                    imag[j + halfSize] = (imag[j] - ti) * 0.5;
                    real[j] = (real[j] + tr) * 0.5;
                    imag[j] = (imag[j] + ti) * 0.5;
                }
            }
        }
    }

    reverseBits(x) {
        let result = 0;
        const bits = this.pt;
        for (let i = 0; i < bits; i++) {
            result = (result << 1) | (x & 1);
            x >>= 1;
        }
        return result;
    }

    // Parameter setters
    setDBRange(value) {
        const val = typeof value === 'number' ? value : parseFloat(value);
        this.dr = val < -144 ? -144 : (val > -48 ? -48 : val);
        this.updateParameters();
    }

    setPoints(value) {
        // Set range between 8 and 14
        const parsedValue = typeof value === 'number' ? value : parseFloat(value);
        const newPoints = parsedValue < 8 ? 8 : (parsedValue > 14 ? 14 : parsedValue);
        if (newPoints === this.pt) return;
        const fftSize = 1 << newPoints;
        
        // Create new arrays
        this.spectrum = new Float32Array(fftSize >> 1).fill(-144);
        this.peaks = new Float32Array(fftSize >> 1).fill(-144);
        this.real = new Float32Array(fftSize);
        this.imag = new Float32Array(fftSize);
        this.window = new Float32Array(fftSize);
        this.sinTable = new Float32Array(fftSize);
        this.cosTable = new Float32Array(fftSize);

        // Initialize tables
        const factor = 2 * Math.PI / fftSize;
        for (let i = 0; i < fftSize; i++) {
            const t = factor * i;
            this.sinTable[i] = -Math.sin(t);
            this.cosTable[i] = Math.cos(t);
            this.window[i] = 0.5 * (1 - Math.cos(t));
        }

        this.pt = newPoints;
        // Reset time tracking to ensure proper peak decay
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
        this.setPoints(12);
        this.setChannel('All');
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

        const fftSize = 1 << this.pt;
        const halfFft = fftSize >> 1;
        const bufferPosition = message.measurements.bufferPosition;
        const [bufferL, bufferR] = message.measurements.buffer;

        if (fftSize != bufferL.length) return audioBuffer;

        // Reset FFT buffers
        this.imag.fill(0);

        // Copy and window the time domain data
        let pos = bufferPosition % fftSize;
        for (let i = 0; i < fftSize; i++) {
            let sample = 0;
            if (this.ch === 'All') {
                sample = (bufferL[pos] + bufferR[pos]) / Math.SQRT2;
            } else if (this.ch === 'Left') {
                sample = bufferL[pos];
            } else {
                sample = bufferR[pos];
            }
            this.real[i] = sample * this.window[i];
            pos++;
            if (pos >= fftSize) pos = 0;
        }

        // Perform FFT
        this.fft(this.real, this.imag);

        // Precompute constant corrections
        const windowPowerCorrection = 10 * Math.log10(8 / 3);
        const singleSideCorrection = 10 * Math.log10(2);
        const totalCorrection = windowPowerCorrection + singleSideCorrection;

        // Calculate magnitude spectrum
        for (let i = 0; i < halfFft; i++) {
            // Calculate raw power
            const rawPower = this.real[i] * this.real[i] + this.imag[i] * this.imag[i];
            
            // Convert to dB with corrections
            const db = 10 * Math.log10(rawPower + 1e-24) + totalCorrection;
            this.spectrum[i] = db;
        }

        // Validate and update peaks
        const currentTime = message.measurements.time;
        const deltaTime = this.lastProcessTime < currentTime ?  currentTime - this.lastProcessTime: 0.02;
        const decay = 20 * deltaTime; // 20dB/sec decay rate

        if (!this.peaks || this.peaks.length !== halfFft) {
            this.peaks = new Float32Array(halfFft).fill(-144);
        }

        for (let i = 0; i < halfFft; i++) {
            if (isNaN(this.peaks[i]) || this.peaks[i] < -144 || this.peaks[i] > 0) {
                this.peaks[i] = -144;
            }
            const decayedPeak = this.peaks[i] - decay;
            const newPeak = this.spectrum[i] > decayedPeak ? this.spectrum[i] : decayedPeak;
            this.peaks[i] = newPeak < -144 ? -144 : newPeak > 0 ? 0 : newPeak;
        }
        
        this.lastProcessTime = currentTime;

        if (message.measurements.sampleRate && this.sampleRate !== message.measurements.sampleRate) {
            this.sampleRate = message.measurements.sampleRate;
            this.updateParameters();
        }
        
        return audioBuffer;
    }

    createUI() {
        if (this.observer) {
            this.observer.disconnect();
        }
        const container = document.createElement('div');
        container.className = 'plugin-parameter-ui';

        // DB Range parameter row
        const dbRangeRow = document.createElement('div');
        dbRangeRow.className = 'parameter-row';
        
        const dbRangeLabel = document.createElement('label');
        dbRangeLabel.textContent = 'DB Range (dB):';
        dbRangeLabel.htmlFor = `${this.id}-${this.name}-db-range-slider`;
        
        const dbRangeSlider = document.createElement('input');
        dbRangeSlider.type = 'range';
        dbRangeSlider.id = `${this.id}-${this.name}-db-range-slider`;
        dbRangeSlider.name = `${this.id}-${this.name}-db-range-slider`;
        dbRangeSlider.min = -144;
        dbRangeSlider.max = -48;
        dbRangeSlider.step = 6;
        dbRangeSlider.value = this.dr;
        dbRangeSlider.autocomplete = "off";

        const dbRangeValue = document.createElement('input');
        dbRangeValue.type = 'number';
        dbRangeValue.id = `${this.id}-${this.name}-db-range-value`;
        dbRangeValue.name = `${this.id}-${this.name}-db-range-value`;
        dbRangeValue.value = this.dr;
        dbRangeValue.step = 6;
        dbRangeValue.min = -144;
        dbRangeValue.max = -48;
        dbRangeValue.autocomplete = "off";

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
        pointsLabel.htmlFor = `${this.id}-${this.name}-points-slider`;
        
        const pointsSlider = document.createElement('input');
        pointsSlider.type = 'range';
        pointsSlider.id = `${this.id}-${this.name}-points-slider`;
        pointsSlider.name = `${this.id}-${this.name}-points-slider`;
        pointsSlider.min = 8;
        pointsSlider.max = 14;
        pointsSlider.step = 1;
        pointsSlider.value = this.pt;
        pointsSlider.autocomplete = "off";

        const pointsValue = document.createElement('input');
        pointsValue.type = 'number';
        pointsValue.id = `${this.id}-${this.name}-points-value`;
        pointsValue.name = `${this.id}-${this.name}-points-value`;
        pointsValue.value = 1 << this.pt;
        pointsValue.step = 1;
        pointsValue.min = 1 << 8;
        pointsValue.max = 1 << 14;
        pointsValue.autocomplete = "off";

        const pointsHandler = (e) => {
            const value = parseInt(e.target.value);
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
        channelLabel.htmlFor = `${this.id}-${this.name}-channel-all`; // Add htmlFor attribute
        
        const channels = ['All', 'Left', 'Right'];
        const channelRadios = channels.map(ch => {
            const label = document.createElement('label');
            label.className = 'radio-label';
            const radioId = `${this.id}-${this.name}-channel-${ch.toLowerCase()}`;
            label.htmlFor = radioId;
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.id = radioId;
            radio.name = `${this.id}-${this.name}-channel`;
            radio.value = ch;
            radio.checked = ch === this.ch;
            radio.autocomplete = "off";
            
            const radioHandler = (e) => {
                if (e.target.checked) {
                    this.setChannel(e.target.value);
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
        
        graphContainer.appendChild(canvas);

        // Reset button
        const resetButton = document.createElement('button');
        resetButton.className = 'analyzer-reset-button';
        resetButton.textContent = 'Reset';
        
        const resetHandler = () => {
            const defaultDBRange = -96;
            const defaultPoints = 10;
            const defaultChannel = 'All';

            // Update UI first
            dbRangeSlider.value = defaultDBRange;
            dbRangeValue.value = defaultDBRange;
            pointsSlider.value = defaultPoints;
            pointsValue.value = 1 << defaultPoints;
            channelRadios.forEach(label => {
                const radio = label.querySelector('input');
                radio.checked = radio.value === defaultChannel;
            });

            // Then update plugin state
            this.reset();
        };
        resetButton.addEventListener('click', resetHandler);
        this.boundEventListeners.set(resetButton, resetHandler);
        
        graphContainer.appendChild(resetButton);

        // Add all elements to container
        container.appendChild(dbRangeRow);
        container.appendChild(pointsRow);
        container.appendChild(channelRow);
        container.appendChild(graphContainer);

        // Store canvas reference
        this.canvas = canvas;

        if (this.observer == null) {
            this.observer = new IntersectionObserver(this.handleIntersect.bind(this));
        }
        this.observer.observe(this.canvas);

        return container;
    }

    handleIntersect(entries) {
        entries.forEach(entry => {
            this.isVisible = entry.isIntersecting;
            if (this.isVisible) {
                this.startAnimation();
            } else {
                this.stopAnimation();
            }
        });
    }

    startAnimation() {
        if (this.animationFrameId) return;

        const animate = () => {
            if (!this.isVisible) {
                this.stopAnimation();
                return;
            }
            this.drawGraph();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        animate();
    }

    stopAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    cleanup() {
        this.lastProcessTime = performance.now() / 1000;
    }

    drawGraph() {
        if (!this.canvas) return;
        
        const ctx = this.canvas.getContext('2d', { alpha: false });
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas with background color
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;

        // Vertical grid lines (frequency)
        const freqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 40000];
        freqs.forEach(freq => {
            const x = width * (Math.log10(freq) - Math.log10(20)) / (Math.log10(40000) - Math.log10(20));
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            // Frequency labels
            if (freq !== 20 && freq !== 40000) {
                ctx.fillStyle = '#666';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(freq >= 1000 ? `${freq / 1000}k` : freq, x, height - 80);
            }
        });

        // Horizontal grid lines (dB)
        const dbStep = 12;
        const dbLines = [];
        for (let db = 0; db >= this.dr; db -= dbStep) {
            dbLines.push(db);
        }
        dbLines.forEach(db => {
            const y = height * (db / this.dr);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // dB labels (hide top and bottom)
            if (db !== 0 && db !== this.dr) {
                ctx.fillStyle = '#666';
                ctx.font = '24px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(`${db}dB`, 160, y + 12);
            }
        });

        // Draw axis labels
        ctx.fillStyle = '#fff';
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Frequency (Hz)', width / 2, height - 10);
        ctx.save();
        ctx.translate(40, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Level (dB)', 0, 0);
        ctx.restore();

        // Always draw spectrum
        const fftSize = 1 << this.pt;
        const binCount = fftSize >> 1;
        const xToLevels = new Map();
        
        for (let i = 0; i < binCount; i++) {
            const freq = (i * this.sampleRate / 2) / binCount;
            if (freq > 40000) continue;
            // Replace Math.max with ternary for better performance
            const freqClamped = freq < 20 ? 20 : freq;
            const x = Math.round(width * (Math.log10(freqClamped) - Math.log10(20)) / (Math.log10(40000) - Math.log10(20)));
            // Replace Math.min with ternary for better performance
            const spectrumLevel = this.spectrum[i] > 0 ? 0 : this.spectrum[i];
            const peakLevel = this.peaks[i] > 0 ? 0 : this.peaks[i];

            if (!xToLevels.has(x)) {
                xToLevels.set(x, [spectrumLevel, peakLevel]);
            } else {
                const [currentSpectrum, currentPeak] = xToLevels.get(x);
                // Replace Math.max with ternary for better performance
                xToLevels.set(x, [
                    currentSpectrum > spectrumLevel ? currentSpectrum : spectrumLevel,
                    currentPeak > peakLevel ? currentPeak : peakLevel
                ]);
            }
        }

        // Draw spectrum
        ctx.beginPath();
        ctx.strokeStyle = '#008800';
        ctx.lineWidth = 4;
        let first = true;
        for (const [x, [spectrumLevel]] of xToLevels) {
            const y = height * (spectrumLevel / this.dr);
            if (first) {
                ctx.moveTo(x, y);
                first = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Draw peak hold
        ctx.beginPath();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        first = true;
        for (const [x, [, peakLevel]] of xToLevels) {
            const y = height * (peakLevel / this.dr);
            if (first) {
                ctx.moveTo(x, y);
                first = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
}

// Register plugin
if (typeof window !== 'undefined') {
    window.SpectrumAnalyzerPlugin = SpectrumAnalyzerPlugin;
}
