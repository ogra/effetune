class SaturationPlugin extends PluginBase {
    constructor() {
        super('Saturation', 'Saturation effect with drive and bias control');
        this.dr = 1.5;   // dr: Drive (0.0-10.0)
        this.bs = 0.1;   // bs: Bias (-0.3 to 0.3)
        this.mx = 100;   // mx: Mix (0-100%)
        this.gn = -2;    // gn: Gain (-18 to +18 dB)

        // Register processor with ideal up/downsampling including anti-alias filtering during decimation.
        this.registerProcessor(`
            if (!parameters.enabled) return data;
            const {
                dr: drive,
                bs: bias,
                mx: mix,
                gn: gain,
                channelCount,
                blockSize,
                sampleRate
            } = parameters;
            const mixRatio = mix / 100;
            const gainLinear = Math.pow(10, gain / 20);
            const biasOffset = Math.tanh(drive * bias);

            const len = data.length;
            for (let i = 0; i < len; i++) {
                const dry = data[i];
                const wet = Math.tanh(drive * (dry + bias)) - biasOffset;
                data[i] = (dry * (1 - mixRatio) + wet * mixRatio) * gainLinear;
            }
            return data;
        `);
    }

    setParameters(params) {
        let graphNeedsUpdate = false;
        if (params.dr !== undefined) {
            this.dr = params.dr < 0 ? 0 : (params.dr > 10 ? 10 : params.dr);
            graphNeedsUpdate = true;
        }
        if (params.bs !== undefined) {
            this.bs = params.bs < -0.3 ? -0.3 : (params.bs > 0.3 ? 0.3 : params.bs);
            graphNeedsUpdate = true;
        }
        if (params.mx !== undefined) {
            this.mx = params.mx < 0 ? 0 : (params.mx > 100 ? 100 : params.mx);
            graphNeedsUpdate = true;
        }
        if (params.gn !== undefined) {
            this.gn = params.gn < -18 ? -18 : (params.gn > 18 ? 18 : params.gn);
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
    setDr(value) { this.setParameters({ dr: value }); }

    // Set bias amount (-0.3 to 0.3)
    setBs(value) { this.setParameters({ bs: value }); }

    // Set mix ratio (0-100%)
    setMx(value) { this.setParameters({ mx: value }); }

    // Set output gain (-18 to +18 dB)
    setGn(value) { this.setParameters({ gn: value }); }

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
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        for (let x = 0; x <= width; x += width / 4) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y <= height; y += height / 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        ctx.fillStyle = '#fff';
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('in', width / 2, height - 5);
        ctx.save();
        ctx.translate(20, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('out', 0, 0);
        ctx.restore();
        ctx.fillStyle = '#666';
        ctx.font = '20px Arial';
        ctx.fillText('-6dB', width * 0.25, height - 5);
        ctx.fillText('-6dB', width * 0.75, height - 5);
        ctx.save();
        ctx.translate(20, height * 0.25);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('-6dB', 0, 0);
        ctx.restore();
        ctx.save();
        ctx.translate(20, height * 0.75);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('-6dB', 0, 0);
        ctx.restore();
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const mixRatio = this.mx / 100;
        for (let i = 0; i < width; i++) {
            const x = (i / width) * 2 - 1;
            const wet = Math.tanh(this.dr * (x + this.bs)) - Math.tanh(this.dr * this.bs);
            const y = ((1 - mixRatio) * x + mixRatio * wet) * Math.pow(10, this.gn / 20);
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
        container.className = 'saturation-plugin-ui plugin-parameter-ui';

        // Drive control
        const driveLabel = document.createElement('label');
        driveLabel.textContent = 'Drive:';
        driveLabel.htmlFor = `${this.id}-${this.name}-drive-slider`;
        
        const driveSlider = document.createElement('input');
        driveSlider.type = 'range';
        driveSlider.min = 0;
        driveSlider.max = 10;
        driveSlider.step = 0.1;
        driveSlider.value = this.dr;
        driveSlider.id = `${this.id}-${this.name}-drive-slider`;
        driveSlider.name = `${this.id}-${this.name}-drive-slider`;
        driveSlider.autocomplete = "off";
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
        driveValue.id = `${this.id}-${this.name}-drive-value`;
        driveValue.name = `${this.id}-${this.name}-drive-value`;
        driveValue.autocomplete = "off";
        driveValue.addEventListener('input', (e) => {
            const parsedValue = parseFloat(e.target.value) || 0;
            const value = parsedValue < 0 ? 0 : (parsedValue > 10 ? 10 : parsedValue);
            this.setDr(value);
            driveSlider.value = value;
            e.target.value = value;
        });
        
        const driveRow = document.createElement('div');
        driveRow.className = 'parameter-row';
        driveRow.appendChild(driveLabel);
        driveRow.appendChild(driveSlider);
        driveRow.appendChild(driveValue);
        container.appendChild(driveRow);

        // Bias control
        const biasLabel = document.createElement('label');
        biasLabel.textContent = 'Bias:';
        biasLabel.htmlFor = `${this.id}-${this.name}-bias-slider`;
        
        const biasSlider = document.createElement('input');
        biasSlider.type = 'range';
        biasSlider.min = -0.3;
        biasSlider.max = 0.3;
        biasSlider.step = 0.01;
        biasSlider.value = this.bs;
        biasSlider.id = `${this.id}-${this.name}-bias-slider`;
        biasSlider.name = `${this.id}-${this.name}-bias-slider`;
        biasSlider.autocomplete = "off";
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
        biasValue.id = `${this.id}-${this.name}-bias-value`;
        biasValue.name = `${this.id}-${this.name}-bias-value`;
        biasValue.autocomplete = "off";
        biasValue.addEventListener('input', (e) => {
            const parsedValue = parseFloat(e.target.value) || 0;
            const value = parsedValue < -0.3 ? -0.3 : (parsedValue > 0.3 ? 0.3 : parsedValue);
            this.setBs(value);
            biasSlider.value = value;
            e.target.value = value;
        });
        
        const biasRow = document.createElement('div');
        biasRow.className = 'parameter-row';
        biasRow.appendChild(biasLabel);
        biasRow.appendChild(biasSlider);
        biasRow.appendChild(biasValue);
        container.appendChild(biasRow);

        // Mix control
        const mixLabel = document.createElement('label');
        mixLabel.textContent = 'Mix (%):';
        mixLabel.htmlFor = `${this.id}-${this.name}-mix-slider`;
        
        const mixSlider = document.createElement('input');
        mixSlider.type = 'range';
        mixSlider.min = 0;
        mixSlider.max = 100;
        mixSlider.step = 1;
        mixSlider.value = this.mx;
        mixSlider.id = `${this.id}-${this.name}-mix-slider`;
        mixSlider.name = `${this.id}-${this.name}-mix-slider`;
        mixSlider.autocomplete = "off";
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
        mixValue.id = `${this.id}-${this.name}-mix-value`;
        mixValue.name = `${this.id}-${this.name}-mix-value`;
        mixValue.autocomplete = "off";
        mixValue.addEventListener('input', (e) => {
            const parsedValue = parseFloat(e.target.value) || 0;
            const value = parsedValue < 0 ? 0 : (parsedValue > 100 ? 100 : parsedValue);
            this.setMx(value);
            mixSlider.value = value;
            e.target.value = value;
        });
        
        const mixRow = document.createElement('div');
        mixRow.className = 'parameter-row';
        mixRow.appendChild(mixLabel);
        mixRow.appendChild(mixSlider);
        mixRow.appendChild(mixValue);
        container.appendChild(mixRow);

        // Graph container for canvas and labels
        const graphContainer = document.createElement('div');
        graphContainer.style.position = 'relative';
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        canvas.style.width = '200px';
        canvas.style.height = '200px';
        canvas.style.backgroundColor = '#222';
        this.canvas = canvas;
        this.updateTransferGraph();
        graphContainer.appendChild(canvas);
        container.appendChild(graphContainer);

        // Gain control
        const gainLabel = document.createElement('label');
        gainLabel.textContent = 'Gain (dB):';
        gainLabel.htmlFor = `${this.id}-${this.name}-gain-slider`;
        
        const gainSlider = document.createElement('input');
        gainSlider.type = 'range';
        gainSlider.min = -18;
        gainSlider.max = 18;
        gainSlider.step = 0.1;
        gainSlider.value = this.gn;
        gainSlider.id = `${this.id}-${this.name}-gain-slider`;
        gainSlider.name = `${this.id}-${this.name}-gain-slider`;
        gainSlider.autocomplete = "off";
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
        gainValue.id = `${this.id}-${this.name}-gain-value`;
        gainValue.name = `${this.id}-${this.name}-gain-value`;
        gainValue.autocomplete = "off";
        gainValue.addEventListener('input', (e) => {
            const parsedValue = parseFloat(e.target.value) || 0;
            const value = parsedValue < -18 ? -18 : (parsedValue > 18 ? 18 : parsedValue);
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

window.SaturationPlugin = SaturationPlugin;
