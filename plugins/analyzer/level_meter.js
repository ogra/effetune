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
        this.lastMeterUpdateTime = 0;
        this.METER_UPDATE_INTERVAL = 16; // Match with plugin-base.js

        // Register processor function that measures audio levels
        this.registerProcessor(`
            // Input data reference (assuming data is Float32Array)
            // Parameters assumed available: parameters.channelCount, parameters.blockSize
            // Time assumed available: time
        
            // 1. Create result buffer and copy data (as per original requirement)
            const result = new Float32Array(data.length);
            result.set(data); // Must keep if original output requires the buffer copy
        
            // 2. Calculate peaks efficiently
            const numChannels = parameters.channelCount; // Cache parameter lookup
            const blockSize = parameters.blockSize;     // Cache parameter lookup
            // Allocate peak storage - Float32Array is appropriate and efficient
            const peaks = new Float32Array(numChannels);
        
            // Iterate through channels
            for (let ch = 0; ch < numChannels; ch++) {
                const offset = ch * blockSize;
                // Calculate the end index *once* per channel loop iteration
                const end = offset + blockSize;
                // Initialize peak for the current channel
                let peak = 0.0;
        
                // Iterate through samples for the current channel
                // Using direct indexing from offset to end avoids addition inside the tight loop
                for (let i = offset; i < end; i++) {
                    // Cache the sample value - avoids repeated array access if used multiple times (here only once, but good practice)
                    const sample = data[i];
                    // Calculate absolute value.
                    const absSample = sample < 0 ? -sample : sample;
                    // Update peak if current absolute sample is larger.
                    // Math.max is also typically well-optimized. Direct comparison might be
                    // negligibly faster/slower depending on the engine, but Math.max is clear.
                    if (absSample > peak) {
                         peak = absSample;
                    }
                    // Alternative using Math.max (likely similar performance):
                    // peak = Math.max(peak, absSample);
                }
                // Store the calculated peak for the channel
                peaks[ch] = peak;
            }
        
            // 3. Create measurements object efficiently
            //    Avoid Array.from() and .map() which create intermediate arrays and objects unnecessarily.
            //    Pre-allocate the standard JavaScript array for the desired output structure.
            const channelMeasurements = new Array(numChannels);
            // Populate the array directly, creating only the necessary objects.
            for (let ch = 0; ch < numChannels; ch++) {
                // Directly create the object structure required by the original code
                channelMeasurements[ch] = { peak: peaks[ch] };
            }
        
            // Assign measurements to the result buffer (as per original code)
            result.measurements = {
                channels: channelMeasurements,
                time: time // Assuming 'time' is available in the scope from the process method arguments
            };
        
            // 4. Return the result buffer with measurements
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
        // Note: levels, peakLevels, and overload are read-only measurement values
        // and should not be set externally
        this.updateParameters();
    }

    // Convert linear amplitude to dB
    amplitudeToDB(amplitude) {
        return 20 * Math.log10(amplitude < 1e-6 ? 1e-6 : amplitude);
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
            const fallingLevel = this.lv[ch] - this.FALL_RATE * deltaTime;
            const clampedFallingLevel = fallingLevel < -96 ? -96 : fallingLevel;
            this.lv[ch] = dbLevel > clampedFallingLevel ? dbLevel : clampedFallingLevel;

            // Update peak hold
            if (dbLevel > this.pl[ch]) {
                // New peak detected - update peak and hold time
                this.pl[ch] = dbLevel;
                this.ph[ch] = time;
            } else if (time > this.ph[ch] + this.PEAK_HOLD_TIME) {
                // After hold time, let peak fall at the same rate as level
                const fallingPeak = this.pl[ch] - this.FALL_RATE * deltaTime;
                // But never fall below current level
                this.pl[ch] = fallingPeak > this.lv[ch] ? fallingPeak : this.lv[ch];
            }
        }

        // Update overload state
        const wasOverloaded = this.ol;
        // Find maximum peak manually instead of using Math.max
        let maxPeak = 0;
        for (let i = 0; i < message.measurements.channels.length; i++) {
            const peak = message.measurements.channels[i].peak;
            if (peak > maxPeak) {
                maxPeak = peak;
            }
        }
        if (maxPeak > 1.0) {
            this.ol = true;
            this.ot = time;
        } else if (time > this.ot + this.OVERLOAD_DISPLAY_TIME) {
            this.ol = false;
        }

        // Only update parameters when overload state changes
        if (this.ol !== wasOverloaded) {
            this.updateParameters();
        }
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
            const currentTime = performance.now();
            if (currentTime - this.lastMeterUpdateTime >= this.METER_UPDATE_INTERVAL) {
                this.updateMeter();
                this.lastMeterUpdateTime = currentTime;
            }
            this.animationFrameId = requestAnimationFrame(animate);
        };
        this.animationFrameId = requestAnimationFrame(animate);
    }

    // Clean up resources when plugin is removed
    cleanup() {
        // Note: Do not stop UI updates here
        // Only clean up resources that need explicit cleanup
    }

    // Update meter display
    updateMeter() {
        if (!this.foregroundCanvas) return;
        
        const ctx = this.foregroundCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Skip drawing if disabled
        if (!this.enabled) return;

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
            const rawLevelWidth = this.canvasWidth * (level - this.dbStart) / this.dbRange;
            const levelWidth = rawLevelWidth < 0 ? 0 : rawLevelWidth;
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
            ctx.fillText(peakText, this.canvasWidth - 10, y + channelHeight/2 + 2);
        }

        // Update overload indicator
        this.overloadIndicator.style.display = this.ol ? 'block' : 'none';
    }
}

// Register the plugin
window.LevelMeterPlugin = LevelMeterPlugin;
