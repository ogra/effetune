class HardClippingPlugin extends PluginBase {
    constructor() {
        super('Hard Clipping', 'Digital hard clipping effect with threshold and mode control');
        this.th = -18;    // th: Threshold (formerly threshold) - Range: -60-0 dB
        this.md = 'both'; // md: Mode (formerly mode) - 'both', 'positive', 'negative'

        // Register processor function
        this.registerProcessor(`
            if (!parameters.enabled) return data;
            
            // Convert threshold from dB to linear amplitude
            // Map shortened parameter names to their original names for clarity
            const { 
                th: threshold,  // th: Threshold (formerly threshold)
                md: mode,       // md: Mode (formerly mode)
                channelCount, blockSize 
            } = parameters;
            
            const thresholdLinear = Math.pow(10, threshold / 20);
            
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                for (let i = 0; i < parameters.blockSize; i++) {
                    const sample = data[offset + i];
                    
                    // Apply clipping based on mode
                    if (mode === 'both') {
                        if (sample > thresholdLinear) {
                            data[offset + i] = thresholdLinear;
                        } else if (sample < -thresholdLinear) {
                            data[offset + i] = -thresholdLinear;
                        }
                    } else if (mode === 'positive' && sample > thresholdLinear) {
                        data[offset + i] = thresholdLinear;
                    } else if (mode === 'negative' && sample < -thresholdLinear) {
                        data[offset + i] = -thresholdLinear;
                    }
                }
            }
            return data;
        `);
    }

    // Set parameters
    setParameters(params) {
        let graphNeedsUpdate = false;

        if (params.th !== undefined) {
            this.th = Math.max(-60, Math.min(0, params.th));
            graphNeedsUpdate = true;
        }
        if (params.md !== undefined) {
            this.md = params.md;
            graphNeedsUpdate = true;
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }

        this.updateParameters();
        if (graphNeedsUpdate) {
            this.updateTransferGraph();
        }
    }

    // Set threshold level (-60 to 0 dB)
    setTh(value) {
        this.setParameters({ th: value });
    }

    // Set clipping mode ('both', 'positive', 'negative')
    setMd(value) {
        this.setParameters({ md: value });
    }

    getParameters() {
        return {
            type: this.constructor.name,
            th: this.th,
            md: this.md,
            enabled: this.enabled
        };
    }

    updateTransferGraph() {
        const canvas = this.canvas;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw grid
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        
        // Vertical grid lines
        for (let x = 0; x <= width; x += width/4) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal grid lines
        for (let y = 0; y <= height; y += height/4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw in/out labels
        ctx.fillStyle = '#fff';
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        
        // Draw "in" label at bottom
        ctx.fillText('in', width/2, height - 5);
        
        // Draw "out" label on left side, rotated
        ctx.save();
        ctx.translate(20, height/2);
        ctx.rotate(-Math.PI/2);
        ctx.fillText('out', 0, 0);
        ctx.restore();

        // Draw -6dB labels
        ctx.fillStyle = '#666';
        ctx.font = '20px Arial';

        // Draw -6dB labels
        // Input axis labels
        ctx.fillText('-6dB', width * 0.25, height - 5);  // Left
        ctx.fillText('-6dB', width * 0.75, height - 5);  // Right

        // Output axis labels
        ctx.save();
        ctx.translate(20, height * 0.25);
        ctx.rotate(-Math.PI/2);
        ctx.fillText('-6dB', 0, 0);  // Top
        ctx.restore();

        ctx.save();
        ctx.translate(20, height * 0.75);
        ctx.rotate(-Math.PI/2);
        ctx.fillText('-6dB', 0, 0);  // Bottom
        ctx.restore();

        // Draw transfer function
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const thresholdLinear = Math.pow(10, this.th / 20);
        
        for (let i = 0; i < width; i++) {
            const x = (i / width) * 2 - 1; // Map to [-1, 1]
            let y = x;
            
            // Apply clipping based on mode
            if (this.md === 'both') {
                if (x > thresholdLinear) {
                    y = thresholdLinear;
                } else if (x < -thresholdLinear) {
                    y = -thresholdLinear;
                }
            } else if (this.md === 'positive' && x > thresholdLinear) {
                y = thresholdLinear;
            } else if (this.md === 'negative' && x < -thresholdLinear) {
                y = -thresholdLinear;
            }
            
            // Map y from [-1, 1] to canvas coordinates
            const canvasY = ((1 - y) / 2) * height;
            
            if (i === 0) {
                ctx.moveTo(i, canvasY);
            } else {
                ctx.lineTo(i, canvasY);
            }
        }
        ctx.stroke();
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'hard-clipping-plugin-ui plugin-parameter-ui';

        // Threshold control
        const thresholdLabel = document.createElement('label');
        thresholdLabel.textContent = 'Threshold (dB):';
        const thresholdSlider = document.createElement('input');
        thresholdSlider.type = 'range';
        thresholdSlider.min = -60;
        thresholdSlider.max = 0;
        thresholdSlider.step = 0.1;
        thresholdSlider.value = this.th;
        thresholdSlider.addEventListener('input', (e) => {
            this.setTh(parseFloat(e.target.value));
            thresholdValue.value = e.target.value;
        });
        const thresholdValue = document.createElement('input');
        thresholdValue.type = 'number';
        thresholdValue.min = -60;
        thresholdValue.max = 0;
        thresholdValue.step = 0.1;
        thresholdValue.value = this.th;
        thresholdValue.addEventListener('input', (e) => {
            const value = Math.max(-60, Math.min(0, parseFloat(e.target.value) || 0));
            this.setTh(value);
            thresholdSlider.value = value;
            e.target.value = value;
        });

        // Mode radio buttons
        const modeLabel = document.createElement('label');
        modeLabel.textContent = 'Mode:';
        const modeGroup = document.createElement('div');
        modeGroup.className = 'radio-group';

        const modes = [
            { value: 'both', label: 'Both Sides' },
            { value: 'positive', label: 'Positive Only' },
            { value: 'negative', label: 'Negative Only' }
        ];

        modes.forEach(mode => {
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `mode-${this.id}`;
            radio.value = mode.value;
            radio.checked = this.md === mode.value;
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.setMd(mode.value);
                }
            });

            const label = document.createElement('label');
            label.appendChild(radio);
            label.appendChild(document.createTextNode(mode.label));
            modeGroup.appendChild(label);
        });

        // Transfer function graph
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        canvas.style.width = '200px';
        canvas.style.height = '200px';
        canvas.style.backgroundColor = '#222';
        this.canvas = canvas;
        this.updateTransferGraph();

        // Add all elements to container
        // Threshold parameter row
        const thresholdRow = document.createElement('div');
        thresholdRow.className = 'parameter-row';
        thresholdRow.appendChild(thresholdLabel);
        thresholdRow.appendChild(thresholdSlider);
        thresholdRow.appendChild(thresholdValue);
        container.appendChild(thresholdRow);
        
        // Mode parameter row
        const modeRow = document.createElement('div');
        modeRow.className = 'parameter-row';
        modeRow.appendChild(modeLabel);
        modeRow.appendChild(modeGroup);
        container.appendChild(modeRow);
        
        // Graph container
        const graphContainer = document.createElement('div');
        graphContainer.style.position = 'relative';
        
        graphContainer.appendChild(canvas);
        container.appendChild(graphContainer);

        return container;
    }
}

// Register the plugin
window.HardClippingPlugin = HardClippingPlugin;
