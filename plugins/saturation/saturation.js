class SaturationPlugin extends PluginBase {
    constructor() {
        super('Saturation', 'Saturation effect with drive and bias control');
        this.dr = 1.5;   // dr: Drive (formerly drive) - Range: 0.0-10.0
        this.bs = 0.1;   // bs: Bias (formerly bias) - Range: -0.3-0.3
        this.mx = 100;   // mx: Mix (formerly mix) - Range: 0-100%
        this.gn = -2;    // gn: Gain (formerly gain) - Range: -18-+18 dB

        // Register processor function
        this.registerProcessor(`
            if (!parameters.enabled) return data;
            
            // Pre-calculate all constants for efficiency
            // Map shortened parameter names to their original names for clarity
            const { 
                dr: drive,   // dr: Drive (formerly drive)
                bs: bias,    // bs: Bias (formerly bias)
                mx: mix,     // mx: Mix (formerly mix)
                gn: gain,    // gn: Gain (formerly gain)
                channelCount, blockSize 
            } = parameters;
            
            const mixRatio = mix / 100;
            const gainLinear = Math.pow(10, gain / 20);
            const biasOffset = Math.tanh(drive * bias);
            const dryMix = 1 - mixRatio;
            
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                for (let i = 0; i < parameters.blockSize; i++) {
                    const x = data[offset + i];
                    // Tube waveshaping
                    const wet = Math.tanh(drive * (x + bias)) - biasOffset;
                    // Mix dry/wet and apply gain
                    data[offset + i] = (x * dryMix + wet * mixRatio) * gainLinear;
                }
            }
            return data;
        `);
    }

    // Set parameters
    setParameters(params) {
        let graphNeedsUpdate = false;

        if (params.dr !== undefined) {
            this.dr = Math.max(0, Math.min(10, params.dr));
            graphNeedsUpdate = true;
        }
        if (params.bs !== undefined) {
            this.bs = Math.max(-0.3, Math.min(0.3, params.bs));
            graphNeedsUpdate = true;
        }
        if (params.mx !== undefined) {
            this.mx = Math.max(0, Math.min(100, params.mx));
            graphNeedsUpdate = true;
        }
        if (params.gn !== undefined) {
            this.gn = Math.max(-18, Math.min(18, params.gn));
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

    // Set drive amount (0.0-10.0)
    setDr(value) {
        this.setParameters({ dr: value });
    }

    // Set bias amount (-0.3-0.3)
    setBs(value) {
        this.setParameters({ bs: value });
    }

    // Set mix ratio (0-100%)
    setMx(value) {
        this.setParameters({ mx: value });
    }

    // Set output gain (-18-+18 dB)
    setGn(value) {
        this.setParameters({ gn: value });
    }

    getParameters() {
        return {
            type: this.constructor.name,
            dr: this.dr,
            bs: this.bs,
            mx: this.mx,
            gn: this.gn,
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

        const mixRatio = this.mx / 100;
        for (let i = 0; i < width; i++) {
            const x = (i / width) * 2 - 1; // Map to [-1, 1]
            const wet = Math.tanh(this.dr * (x + this.bs)) - Math.tanh(this.dr * this.bs);
            const y = ((1 - mixRatio) * x + mixRatio * wet) * Math.pow(10, this.gn / 20);
            
            // Map y from [-1, 1] to canvas coordinates (clamp to avoid going off canvas)
            const clampedY = Math.max(-1, Math.min(1, y));
            const canvasY = ((1 - clampedY) / 2) * height;
            
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
        container.className = 'saturation-plugin-ui plugin-parameter-ui';

        // Drive control
        const driveLabel = document.createElement('label');
        driveLabel.textContent = 'Drive:';
        const driveSlider = document.createElement('input');
        driveSlider.type = 'range';
        driveSlider.min = 0;
        driveSlider.max = 10;
        driveSlider.step = 0.1;
        driveSlider.value = this.dr;
        driveSlider.addEventListener('input', (e) => {
            this.setDr(parseFloat(e.target.value));
            driveValue.value = e.target.value;
        });
        const driveValue = document.createElement('input');
        driveValue.type = 'number';
        driveValue.min = 0;
        driveValue.max = 10;
        driveValue.step = 0.1;
        driveValue.value = this.dr;
        driveValue.addEventListener('input', (e) => {
            const value = Math.max(0, Math.min(10, parseFloat(e.target.value) || 0));
            this.setDr(value);
            driveSlider.value = value;
            e.target.value = value;
        });

        // Bias control
        const biasLabel = document.createElement('label');
        biasLabel.textContent = 'Bias:';
        const biasSlider = document.createElement('input');
        biasSlider.type = 'range';
        biasSlider.min = -0.3;
        biasSlider.max = 0.3;
        biasSlider.step = 0.01;
        biasSlider.value = this.bs;
        biasSlider.addEventListener('input', (e) => {
            this.setBs(parseFloat(e.target.value));
            biasValue.value = e.target.value;
        });
        const biasValue = document.createElement('input');
        biasValue.type = 'number';
        biasValue.min = -0.3;
        biasValue.max = 0.3;
        biasValue.step = 0.01;
        biasValue.value = this.bs;
        biasValue.addEventListener('input', (e) => {
            const value = Math.max(-0.3, Math.min(0.3, parseFloat(e.target.value) || 0));
            this.setBs(value);
            biasSlider.value = value;
            e.target.value = value;
        });

        // Mix control
        const mixLabel = document.createElement('label');
        mixLabel.textContent = 'Mix (%):';
        const mixSlider = document.createElement('input');
        mixSlider.type = 'range';
        mixSlider.min = 0;
        mixSlider.max = 100;
        mixSlider.step = 1;
        mixSlider.value = this.mx;
        mixSlider.addEventListener('input', (e) => {
            this.setMx(parseFloat(e.target.value));
            mixValue.value = e.target.value;
        });
        const mixValue = document.createElement('input');
        mixValue.type = 'number';
        mixValue.min = 0;
        mixValue.max = 100;
        mixValue.step = 1;
        mixValue.value = this.mx;
        mixValue.addEventListener('input', (e) => {
            const value = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
            this.setMx(value);
            mixSlider.value = value;
            e.target.value = value;
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
        // Drive parameter row
        const driveRow = document.createElement('div');
        driveRow.className = 'parameter-row';
        driveRow.appendChild(driveLabel);
        driveRow.appendChild(driveSlider);
        driveRow.appendChild(driveValue);
        container.appendChild(driveRow);
        
        // Bias parameter row
        const biasRow = document.createElement('div');
        biasRow.className = 'parameter-row';
        biasRow.appendChild(biasLabel);
        biasRow.appendChild(biasSlider);
        biasRow.appendChild(biasValue);
        container.appendChild(biasRow);
        
        // Mix parameter row
        const mixRow = document.createElement('div');
        mixRow.className = 'parameter-row';
        mixRow.appendChild(mixLabel);
        mixRow.appendChild(mixSlider);
        mixRow.appendChild(mixValue);
        container.appendChild(mixRow);
        
        // Graph container for canvas and labels
        const graphContainer = document.createElement('div');
        graphContainer.style.position = 'relative';
        
        graphContainer.appendChild(canvas);
        container.appendChild(graphContainer);

        // Gain parameter row
        const gainLabel = document.createElement('label');
        gainLabel.textContent = 'Gain (dB):';
        const gainSlider = document.createElement('input');
        gainSlider.type = 'range';
        gainSlider.min = -18;
        gainSlider.max = 18;
        gainSlider.step = 0.1;
        gainSlider.value = this.gn;
        gainSlider.addEventListener('input', (e) => {
            this.setGn(parseFloat(e.target.value));
            gainValue.value = e.target.value;
        });
        const gainValue = document.createElement('input');
        gainValue.type = 'number';
        gainValue.min = -18;
        gainValue.max = 18;
        gainValue.step = 0.1;
        gainValue.value = this.gn;
        gainValue.addEventListener('input', (e) => {
            const value = Math.max(-18, Math.min(18, parseFloat(e.target.value) || 0));
            this.setGn(value);
            gainSlider.value = value;
            e.target.value = value;
        });

        const gainRow = document.createElement('div');
        gainRow.className = 'parameter-row';
        gainRow.appendChild(gainLabel);
        gainRow.appendChild(gainSlider);
        gainRow.appendChild(gainValue);
        container.appendChild(gainRow);

        return container;
    }
}

// Register the plugin
window.SaturationPlugin = SaturationPlugin;
