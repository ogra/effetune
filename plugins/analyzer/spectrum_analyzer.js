class SpectrumAnalyzerPlugin extends PluginBase {
    constructor() {
        super('Spectrum Analyzer', 'Real-time spectrum analyzer with peak hold');
        
        // Initialize parameters
        this.dr = -96;
        this.pt = 10;
        this.ch = 'All';
        const fftSize = Math.pow(2, this.pt);
        this.spectrum = new Float32Array(fftSize / 2).fill(-144);
        this.peaks = new Float32Array(fftSize / 2).fill(-144);
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

        // Store event listeners for cleanup
        this.boundEventListeners = new Map();

        // Register processor function
        this.registerProcessor(SpectrumAnalyzerPlugin.processorFunction);
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
                    
                    real[j + halfSize] = (real[j] - tr) / 2;
                    imag[j + halfSize] = (imag[j] - ti) / 2;
                    real[j] = (real[j] + tr) / 2;
                    imag[j] = (imag[j] + ti) / 2;
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

    // Parameter setters
    setDBRange(value) {
        this.dr = Math.max(-144, Math.min(-48, typeof value === 'number' ? value : parseFloat(value)));
        this.updateParameters();
    }

    setPoints(value) {
        const newPoints = Math.max(8, Math.min(13, typeof value === 'number' ? value : parseFloat(value)));
        if (newPoints === this.pt) return;

        const fftSize = Math.pow(2, newPoints);

        // Create new arrays first
        const newSpectrum = new Float32Array(fftSize / 2).fill(-144);
        const newPeaks = new Float32Array(fftSize / 2).fill(-144);
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
        this.peaks = newPeaks;
        this.real = newReal;
        this.imag = newImag;
        this.window = newWindow;
        this.sinTable = newSinTable;
        this.cosTable = newCosTable;

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
        this.setPoints(10);
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
                sample = (bufferL[pos] + bufferR[pos]) / Math.SQRT2;
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
            // 1. FFT scaling correction: +20*log10(N) to compensate for 1/N^2 in power
            // 2. Time window normalization: -20*log10(N) to normalize window length
            // 3. Hann window power correction: +10*log10(8/3)
            // 4. Single-sided spectrum correction: +10*log10(2)
            const fftSizeCorrection = 20 * Math.log10(fftSize) - 20 * Math.log10(fftSize); // Cancels out
            const windowPowerCorrection = 10 * Math.log10(8/3);
            const singleSideCorrection = 10 * Math.log10(2);
            const totalCorrection = fftSizeCorrection + windowPowerCorrection + singleSideCorrection;
            
            // Convert to dB with corrections
            const db = 10 * Math.log10(rawPower + 1e-24) + totalCorrection;
            // Clamp spectrum values between -144 and 0 dB
            this.spectrum[i] = Math.max(-144, Math.min(0, db));
        }

        // Validate and update peaks
        const currentTime = message.measurements.time;
        const deltaTime = currentTime - this.lastProcessTime;
        const decay = 20 * deltaTime; // 20dB/sec decay rate

        // Ensure peaks array is valid and has correct length
        if (!this.peaks || this.peaks.length !== fftSize / 2) {
            this.peaks = new Float32Array(fftSize / 2).fill(-144);
        }

        // Update peaks with bounds checking and value clamping
        for (let i = 0; i < fftSize / 2; i++) {
            // Ensure current peak value is valid
            if (isNaN(this.peaks[i]) || this.peaks[i] < -144 || this.peaks[i] > 0) {
                this.peaks[i] = -144;
            }
            
            // Calculate new peak value with proper bounds
            const decayedPeak = this.peaks[i] - decay;
            const newPeak = Math.max(this.spectrum[i], decayedPeak);
            
            // Clamp the peak value to valid range
            this.peaks[i] = Math.max(-144, Math.min(0, newPeak));
        }
        
        this.lastProcessTime = currentTime;

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
            pointsValue.value = Math.pow(2, defaultPoints);
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
                ctx.fillText(freq >= 1000 ? `${freq/1000}k` : freq, x, height - 80);
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
        
        // Draw "Frequency (Hz)" label
        ctx.fillText('Frequency (Hz)', width/2, height - 10);
        
        // Draw "Level (dB)" label
        ctx.save();
        ctx.translate(40, height/2);
        ctx.rotate(-Math.PI/2);
        ctx.fillText('Level (dB)', 0, 0);
        ctx.restore();

        // Always draw spectrum
        const fftSize = Math.pow(2, this.pt);
        const binCount = fftSize / 2;

        // Group FFT bins by x-coordinate and find max levels
        const xToLevels = new Map(); // x-coordinate to [spectrum, peak] mapping
        
        for (let i = 0; i < binCount; i++) {
            const freq = (i * this.sampleRate/2) / (fftSize / 2);
            if (freq > 40000) continue;

            const x = Math.round(width * (Math.log10(Math.max(freq, 20)) - Math.log10(20)) / (Math.log10(40000) - Math.log10(20)));
            // Clamp both spectrum and peak levels between dr and 0 dB
            const spectrumLevel = Math.min(0, Math.max(this.dr, this.spectrum[i]));
            const peakLevel = Math.min(0, Math.max(this.dr, this.peaks[i]));

            if (!xToLevels.has(x)) {
                xToLevels.set(x, [spectrumLevel, peakLevel]);
            } else {
                const [currentSpectrum, currentPeak] = xToLevels.get(x);
                xToLevels.set(x, [
                    Math.max(currentSpectrum, spectrumLevel),
                    Math.max(currentPeak, peakLevel)
                ]);
            }
        }

        // Draw spectrum
        ctx.beginPath();
        ctx.strokeStyle = '#008800';
        ctx.lineWidth = 4;

        let isFirst = true;
        for (const [x, [spectrumLevel, _]] of xToLevels) {
            const y = height * (spectrumLevel / this.dr);
            
            if (isFirst) {
                ctx.moveTo(x, y);
                isFirst = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Draw peak hold
        ctx.beginPath();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;

        isFirst = true;
        for (const [x, [_, peakLevel]] of xToLevels) {
            const y = height * (peakLevel / this.dr);
            
            if (isFirst) {
                ctx.moveTo(x, y);
                isFirst = false;
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
