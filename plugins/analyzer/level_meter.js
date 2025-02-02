class LevelMeterPlugin extends PluginBase {
    constructor() {
        super('Level Meter', 'Displays audio level with peak hold');
        this.lv = new Array(2).fill(-96);     // lv: Levels (formerly levels) - Range: -96 to 0 dB
        this.pl = new Array(2).fill(-96);     // pl: Peak Levels (formerly peakLevels) - Range: -96 to 0 dB
        this.ph = new Array(2).fill(0);       // ph: Peak Hold Times (formerly peakHoldTimes)
        this.ol = false;                      // ol: Overload (formerly overload)
        this.ot = 0;                          // ot: Overload Time (formerly overloadTime)
        this.OVERLOAD_DISPLAY_TIME = 5.0; // seconds
        this.PEAK_HOLD_TIME = 1.0; // seconds
        this.FALL_RATE = 20; // dB per second
        this.lastProcessTime = performance.now() / 1000;

        // Register processor function that measures audio levels
        this.registerProcessor(`
            // Create result buffer
            const result = new Float32Array(data.length);
            result.set(data);
            
            // Calculate peaks for all channels
            const peaks = new Float32Array(parameters.channelCount);
            
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                let peak = 0;
                for (let i = 0; i < parameters.blockSize; i++) {
                    peak = Math.max(peak, Math.abs(data[offset + i]));
                }
                peaks[ch] = peak;
            }

            // Create measurements object
            result.measurements = {
                channels: Array.from(peaks).map(peak => ({ peak })),
                time: time
            };

            return result;
        `);
    }

    // Get current parameters
    getParameters() {
        return {
            type: 'LevelMeterPlugin', // Use class name instead of constructor name
            id: this.id,
            enabled: this.enabled
            // Removed dynamic measurement values (lv, pl, ol) as they don't need to be saved
        };
    }

    // Set parameters
    setParameters(params) {
        if (params.enabled !== undefined) {
            const wasEnabled = this.enabled;
            this.enabled = params.enabled;
            
            // Handle animation state based on enabled state
            if (!wasEnabled && this.enabled) {
                // Re-start animation if plugin was re-enabled
                this.startAnimation();
            }
        }
        // Note: levels, peakLevels, and overload are read-only measurement values
        // and should not be set externally
        this.updateParameters();
    }

    // Convert linear amplitude to dB
    amplitudeToDB(amplitude) {
        return 20 * Math.log10(Math.max(amplitude, 1e-6));
    }

    // Handle messages from audio processor
    onMessage(message) {
        if (message.type === 'processBuffer' && message.buffer) {
            this.process(message.buffer, message);
        }
    }

    process(audioBuffer, message) {
        if (!audioBuffer || !message?.measurements?.channels) {
            return audioBuffer;
        }

        // Skip processing if plugin is disabled
        if (!this.enabled) {
            return audioBuffer;
        }

        const time = performance.now() / 1000;
        const deltaTime = time - this.lastProcessTime;
        this.lastProcessTime = time;

        // Process each channel
        for (let ch = 0; ch < message.measurements.channels.length; ch++) {
            const channelPeak = message.measurements.channels[ch].peak;
            const dbLevel = this.amplitudeToDB(channelPeak);
            
            // Update level with fall rate
            this.lv[ch] = Math.max(
                Math.max(-96, this.lv[ch] - this.FALL_RATE * deltaTime),
                dbLevel
            );

            // Update peak hold
            if (dbLevel > this.pl[ch]) {
                // New peak detected - update peak and hold time
                this.pl[ch] = dbLevel;
                this.ph[ch] = time;
            } else if (time > this.ph[ch] + this.PEAK_HOLD_TIME) {
                // After hold time, let peak fall at the same rate as level
                const fallingPeak = this.pl[ch] - this.FALL_RATE * deltaTime;
                // But never fall below current level
                this.pl[ch] = Math.max(fallingPeak, this.lv[ch]);
            }
        }

        // Update overload state
        const maxPeak = Math.max(...message.measurements.channels.map(ch => ch.peak));
        if (maxPeak > 1.0) {
            this.ol = true;
            this.ot = time;
        } else if (time > this.ot + this.OVERLOAD_DISPLAY_TIME) {
            this.ol = false;
        }

        this.updateParameters();
        return audioBuffer;
    }

    // Create UI elements for the plugin
    createUI() {
        const container = document.createElement('div');
        container.className = 'level-meter-plugin-ui';

        // Initialize animation frame ID
        this.animationFrameId = null;

        // Create foreground canvas for meter (displayed in background)
        const foregroundCanvas = document.createElement('canvas');
        foregroundCanvas.className = 'meter-foreground';
        foregroundCanvas.width = 1024;
        foregroundCanvas.height = 64;
        container.appendChild(foregroundCanvas);

        // Create background canvas for grid and labels (displayed in foreground)
        const backgroundCanvas = document.createElement('canvas');
        backgroundCanvas.className = 'meter-background';
        backgroundCanvas.width = 1024;
        backgroundCanvas.height = 64;
        container.appendChild(backgroundCanvas);

        // Create overload indicator
        const overloadIndicator = document.createElement('div');
        overloadIndicator.className = 'overload-indicator';
        overloadIndicator.textContent = 'OVERLOAD';
        overloadIndicator.style.display = 'none';
        container.appendChild(overloadIndicator);

        // Draw static background
        const bgCtx = backgroundCanvas.getContext('2d');
        const width = backgroundCanvas.width;
        const height = backgroundCanvas.height;
        const dbRange = 96;
        const dbStart = -96;

        // Clear background to transparent
        bgCtx.clearRect(0, 0, width, height);

        // Draw grid lines and labels
        bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        bgCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        bgCtx.font = '10px Arial';
        bgCtx.textAlign = 'center';
        for (let db = dbStart; db <= 0; db += 3) {
            const x = width * (db - dbStart) / dbRange;
            
            // Draw grid line
            bgCtx.beginPath();
            bgCtx.moveTo(x, 0);
            bgCtx.lineTo(x, height);
            bgCtx.stroke();
            
            // Draw label every 12dB (except 0dB and -96dB)
            if (db % 12 === 0 && db !== 0 && db !== -96) {
                bgCtx.fillText(db.toString(), x, height - 2);
            }
        }

        // Store UI elements for updates
        this.foregroundCanvas = foregroundCanvas;
        this.overloadIndicator = overloadIndicator;
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.dbRange = dbRange;
        this.dbStart = dbStart;

        // Start animation loop after UI elements are set up
        this.startAnimation();

        return container;
    }

    // Start animation loop
    startAnimation() {
        const animate = () => {
            this.updateMeter();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        animate();
    }

    // Clean up animation when plugin is disabled/removed
    cleanup() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    // Update meter display
    updateMeter() {
        const ctx = this.foregroundCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Ensure we have the latest parameters
        this.updateParameters();

        // Draw each channel
        for (let channel = 0; channel < this.lv.length; channel++) {
            const y = channel * (this.canvasHeight / 2);
            const channelHeight = (this.canvasHeight / 2) - 2;

            // Create gradient for this channel
            const gradient = ctx.createLinearGradient(0, y, this.canvasWidth, y);
            gradient.addColorStop(0, '#008000');
            gradient.addColorStop(((-12) - this.dbStart) / this.dbRange, '#008000');
            gradient.addColorStop(((-12) - this.dbStart) / this.dbRange, '#808000');
            gradient.addColorStop(((-6) - this.dbStart) / this.dbRange, '#808000');
            gradient.addColorStop(((-6) - this.dbStart) / this.dbRange, '#800000');
            gradient.addColorStop(1, '#800000');

            // Draw level meter
            const level = this.lv[channel];
            const levelWidth = Math.max(0, this.canvasWidth * (level - this.dbStart) / this.dbRange);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, y + 1, levelWidth, channelHeight);

            // Draw peak hold
            const peakLevel = this.pl[channel];
            const peakX = this.canvasWidth * (peakLevel - this.dbStart) / this.dbRange;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(peakX - 1, y + 1, 2, channelHeight);

            // Display peak level value
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            const peakText = peakLevel.toFixed(1) + ' dB';
            ctx.fillText(peakText, this.canvasWidth - 5, y + channelHeight/2);
        }

        // Update overload indicator
        this.overloadIndicator.style.display = this.ol ? 'block' : 'none';
    }
}

// Register the plugin
window.LevelMeterPlugin = LevelMeterPlugin;
