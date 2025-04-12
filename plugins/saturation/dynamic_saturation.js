class DynamicSaturationPlugin extends PluginBase {
    constructor() {
        super('Dynamic Saturation', 'Simulates distortion caused by speaker cone movement');

        // Initialize parameters with default values
        this.sd = 3.0;   // sd: Speaker Drive (0.0-10.0)
        this.ss = 2.0;   // ss: Speaker Stiffness (0.0-10.0)
        this.sp = 1.0;   // sp: Speaker Damping (0.0-10.0)
        this.sm = 1.0;   // sm: Speaker Mass (0.1-5.0)
        this.dd = 1.5;   // dd: Distortion Drive (0.0-10.0)
        this.db = 0.1;   // db: Distortion Bias (-1.0-1.0)
        this.dm = 100.0; // dm: Distortion Mix (0-100%)
        this.cm = 50.0;  // cm: Cone Motion Mix (0-100%)
        this.og = 0.0;   // og: Output Gain (-18.0-18.0 dB)

        // Register processor with our speaker cone simulation
        this.registerProcessor(`
            // Main processing function executed per audio block.
            // Parameters:
            //   data: Float32Array containing interleaved audio data for all channels (input/output buffer)
            //   parameters: Object containing control parameters (e.g., sd, ss, sp, sm, dd, db, dm, cm, og)
            //   context: Object for maintaining state between blocks (e.g., xpos, vel)
            //   Returns: The modified data array (or original if disabled).

            // Early exit if processing is disabled
            if (!parameters.enabled) return data;

            // --- Parameter Retrieval ---
            // Destructure parameters for potentially slightly faster access (?) and readability.
            // Note: Assuming parameters object structure matches the original code.
            const {
                sd: spkDrive,   // Speaker Drive
                ss: spkStiff,   // Speaker Stiffness
                sp: spkDamp,    // Speaker Damping
                sm: spkMass,    // Speaker Mass
                dd: dstDrive,   // Distortion Drive
                db: dstBias,    // Distortion Bias
                dm: dstMix,     // Distortion Mix (%)
                cm: coneMix,    // Cone Mix (%)
                og: outGain,    // Output Gain (dB)
                // Assuming these are also passed or available, matching original implicit dependencies
                channelCount,   // Number of channels
                blockSize,      // Samples per channel per block
                // sampleRate is not directly used in the core physics model (dt=1)
            } = parameters;

            // --- Derived Constants (Pre-calculate values used repeatedly) ---
            // Original model used dt = 1.0 implicitly for normalization per sample.
            const dt_half = 0.5; // dt/2 optimization, as dt = 1.0

            // Convert percentages to ratios (division by 100 -> multiplication by 0.01)
            const dstMixRatio = dstMix * 0.01;
            const coneMixRatio = coneMix * 0.01;

            // Convert output gain from dB to linear amplitude
            // Using 10**(x) might be slightly faster than Math.pow(10, x) in some JS engines.
            const gainLinear = 10**(outGain * 0.05); // Equivalent to Math.pow(10, outGain / 20)

            // Precompute inverse mass to replace division with multiplication inside the loop.
            // WARNING: If spkMass is 0 or very close to 0, this will result in Infinity or large numbers.
            // The original code had the same potential issue. No guard added to maintain exact behavior.
            const invSpkMass = 1.0 / spkMass;

            // Precompute the constant part of the tanh distortion calculation.
            const dstBiasTerm = Math.tanh(dstDrive * dstBias);

            // --- State Initialization & Management ---
            // Initialize state within the 'context' object if needed.
            // This logic matches the structure of the original code.
            if (!context.initialized || context.channelCount !== channelCount) {
                context.xpos = new Float32Array(channelCount); // Speaker cone position state
                context.vel = new Float32Array(channelCount);  // Speaker cone velocity state
                context.channelCount = channelCount;
                context.initialized = true;
                // Note: Float32Array is initialized with zeros automatically.
            }

            // Get references to state arrays from the 'context' object.
            const xpos = context.xpos;
            const vel = context.vel;

            // --- Main Processing Loop ---
            // Process each channel independently.
            for (let ch = 0; ch < channelCount; ch++) {
                // Calculate the starting offset for the current channel in the interleaved 'data' array.
                const offset = ch * blockSize;

                // --- Per-Channel State ---
                // Load state variables for the current channel into local variables.
                let x = xpos[ch]; // Current cone position for this channel
                let v = vel[ch];  // Current cone velocity for this channel

                // --- Per-Sample Processing ---
                // Iterate through each sample in the block for the current channel.
                for (let i = 0; i < blockSize; i++) {
                    const dataIndex = offset + i; // Index in the interleaved data array
                    const inputSample = data[dataIndex]; // Read input from the data array

                    // --- (1) Speaker Vibration Model (Velocity Verlet Integration) ---
                    // Calculate current acceleration 'a'. Division replaced by multiplication.
                    const a = (spkDrive * inputSample - spkStiff * x - spkDamp * v) * invSpkMass;

                    // Calculate velocity at half time step 'vHalf'. (dt/2 = 0.5)
                    const vHalf = v + a * dt_half;

                    // Update position 'xNew'. (dt = 1.0, so multiplication is omitted)
                    const xNew = x + vHalf;

                    // Calculate acceleration at the new position 'aNew'.
                    const aNew = (spkDrive * inputSample - spkStiff * xNew - spkDamp * vHalf) * invSpkMass;

                    // Update velocity 'vNew'. (dt/2 = 0.5)
                    const vNew = vHalf + aNew * dt_half;

                    // Update state for the next sample iteration
                    x = xNew;
                    v = vNew;

                    // --- (2) Saturation of Displacement (Non-linear Distortion) ---
                    // Calculate the distorted signal based on cone position 'x'.
                    // Uses the precomputed 'dstBiasTerm'.
                    const wetDist = Math.tanh(dstDrive * (x + dstBias)) - dstBiasTerm;

                    // Mix the linear position 'x' and the distorted position 'wetDist'.
                    // Calculation: linear + mix * (distorted - linear)
                    const xNl = x + dstMixRatio * (wetDist - x);

                    // --- (3) Differential Mixing ---
                    // Calculate the change introduced by the non-linear stage.
                    const coneDelta = (xNl - x) * coneMixRatio;

                    // Add the change (representing non-linear cone movement influence)
                    // back to the original input sample.
                    let outputSample = inputSample + coneDelta;

                    // --- (4) Output Gain ---
                    // Apply the final linear gain.
                    outputSample *= gainLinear;

                    // Write the processed sample back into the 'data' array (in-place).
                    data[dataIndex] = outputSample;

                } // End of sample loop

                // --- Save State ---
                // Store the final state of this channel back into the 'context' object
                // for the next processing block.
                xpos[ch] = x;
                vel[ch] = v;

            } // End of channel loop

            // Return the modified data array (standard practice for processor functions).
            return data;
        `);
    }

    setParameters(params) {
        let graphNeedsUpdate = false;
        if (params.sd !== undefined) {
            this.sd = Math.max(0, Math.min(10, params.sd));
        }
        if (params.ss !== undefined) {
            this.ss = Math.max(0, Math.min(10, params.ss));
        }
        if (params.sp !== undefined) {
            this.sp = Math.max(0, Math.min(10, params.sp));
        }
        if (params.sm !== undefined) {
            this.sm = Math.max(0.1, Math.min(5, params.sm));
        }
        if (params.dd !== undefined) {
            this.dd = Math.max(0, Math.min(10, params.dd));
            graphNeedsUpdate = true;
        }
        if (params.db !== undefined) {
            this.db = Math.max(-1, Math.min(1, params.db));
            graphNeedsUpdate = true;
        }
        if (params.dm !== undefined) {
            this.dm = Math.max(0, Math.min(100, params.dm));
            graphNeedsUpdate = true;
        }
        if (params.cm !== undefined) {
            this.cm = Math.max(0, Math.min(100, params.cm));
        }
        if (params.og !== undefined) {
            this.og = Math.max(-18, Math.min(18, params.og));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
        if (graphNeedsUpdate) {
            this.updateTransferGraph();
        }
    }

    // Individual parameter setters
    setSd(value) { this.setParameters({ sd: value }); }
    setSs(value) { this.setParameters({ ss: value }); }
    setSp(value) { this.setParameters({ sp: value }); }
    setSm(value) { this.setParameters({ sm: value }); }
    setDd(value) { this.setParameters({ dd: value }); }
    setDb(value) { this.setParameters({ db: value }); }
    setDm(value) { this.setParameters({ dm: value }); }
    setCm(value) { this.setParameters({ cm: value }); }
    setOg(value) { this.setParameters({ og: value }); }

    getParameters() {
        return {
            type: this.constructor.name,
            sd: this.sd,
            ss: this.ss,
            sp: this.sp,
            sm: this.sm,
            dd: this.dd,
            db: this.db,
            dm: this.dm,
            cm: this.cm,
            og: this.og,
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
        const mixRatio = this.dm / 100;
        
        for (let i = 0; i < width; i++) {
            const x = (i / width) * 2 - 1;
            const wet = Math.tanh(this.dd * (x + this.db)) - Math.tanh(this.dd * this.db);
            const y = (1 - mixRatio) * x + mixRatio * wet;
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
        container.className = 'dynamic-saturation-plugin-ui plugin-parameter-ui';

        // Speaker Drive control
        const sdLabel = document.createElement('label');
        sdLabel.textContent = 'Speaker Drive:';
        sdLabel.htmlFor = `${this.id}-speaker-drive-slider`;
        
        const sdSlider = document.createElement('input');
        sdSlider.type = 'range';
        sdSlider.min = 0;
        sdSlider.max = 10;
        sdSlider.step = 0.1;
        sdSlider.value = this.sd;
        sdSlider.id = `${this.id}-speaker-drive-slider`;
        sdSlider.name = `${this.id}-speaker-drive-slider`;
        sdSlider.autocomplete = "off";
        sdSlider.addEventListener('input', (e) => {
            this.setSd(parseFloat(e.target.value));
            sdValue.value = e.target.value;
        });
        
        const sdValue = document.createElement('input');
        sdValue.type = 'number';
        sdValue.min = 0;
        sdValue.max = 10;
        sdValue.step = 0.1;
        sdValue.value = this.sd;
        sdValue.id = `${this.id}-speaker-drive-value`;
        sdValue.name = `${this.id}-speaker-drive-value`;
        sdValue.autocomplete = "off";
        sdValue.addEventListener('input', (e) => {
            const parsedValue = parseFloat(e.target.value) || 0;
            const value = parsedValue < 0 ? 0 : (parsedValue > 10 ? 10 : parsedValue);
            this.setSd(value);
            sdSlider.value = value;
            e.target.value = value;
        });
        
        const sdRow = document.createElement('div');
        sdRow.className = 'parameter-row';
        sdRow.appendChild(sdLabel);
        sdRow.appendChild(sdSlider);
        sdRow.appendChild(sdValue);
        container.appendChild(sdRow);

        // Speaker Stiffness control
        const ssLabel = document.createElement('label');
        ssLabel.textContent = 'Speaker Stiffness:';
        ssLabel.htmlFor = `${this.id}-speaker-stiffness-slider`;
        
        const ssSlider = document.createElement('input');
        ssSlider.type = 'range';
        ssSlider.min = 0;
        ssSlider.max = 10;
        ssSlider.step = 0.1;
        ssSlider.value = this.ss;
        ssSlider.id = `${this.id}-speaker-stiffness-slider`;
        ssSlider.name = `${this.id}-speaker-stiffness-slider`;
        ssSlider.autocomplete = "off";
        ssSlider.addEventListener('input', (e) => {
            this.setSs(parseFloat(e.target.value));
            ssValue.value = e.target.value;
        });
        
        const ssValue = document.createElement('input');
        ssValue.type = 'number';
        ssValue.min = 0;
        ssValue.max = 10;
        ssValue.step = 0.1;
        ssValue.value = this.ss;
        ssValue.id = `${this.id}-speaker-stiffness-value`;
        ssValue.name = `${this.id}-speaker-stiffness-value`;
        ssValue.autocomplete = "off";
        ssValue.addEventListener('input', (e) => {
            const parsedValue = parseFloat(e.target.value) || 0;
            const value = parsedValue < 0 ? 0 : (parsedValue > 10 ? 10 : parsedValue);
            this.setSs(value);
            ssSlider.value = value;
            e.target.value = value;
        });
        
        const ssRow = document.createElement('div');
        ssRow.className = 'parameter-row';
        ssRow.appendChild(ssLabel);
        ssRow.appendChild(ssSlider);
        ssRow.appendChild(ssValue);
        container.appendChild(ssRow);

        // Speaker Damping control
        const spLabel = document.createElement('label');
        spLabel.textContent = 'Speaker Damping:';
        spLabel.htmlFor = `${this.id}-speaker-damping-slider`;
        
        const spSlider = document.createElement('input');
        spSlider.type = 'range';
        spSlider.min = 0;
        spSlider.max = 10;
        spSlider.step = 0.1;
        spSlider.value = this.sp;
        spSlider.id = `${this.id}-speaker-damping-slider`;
        spSlider.name = `${this.id}-speaker-damping-slider`;
        spSlider.autocomplete = "off";
        spSlider.addEventListener('input', (e) => {
            this.setSp(parseFloat(e.target.value));
            spValue.value = e.target.value;
        });
        
        const spValue = document.createElement('input');
        spValue.type = 'number';
        spValue.min = 0;
        spValue.max = 10;
        spValue.step = 0.1;
        spValue.value = this.sp;
        spValue.id = `${this.id}-speaker-damping-value`;
        spValue.name = `${this.id}-speaker-damping-value`;
        spValue.autocomplete = "off";
        spValue.addEventListener('input', (e) => {
            const parsedValue = parseFloat(e.target.value) || 0;
            const value = parsedValue < 0 ? 0 : (parsedValue > 10 ? 10 : parsedValue);
            this.setSp(value);
            spSlider.value = value;
            e.target.value = value;
        });
        
        const spRow = document.createElement('div');
        spRow.className = 'parameter-row';
        spRow.appendChild(spLabel);
        spRow.appendChild(spSlider);
        spRow.appendChild(spValue);
        container.appendChild(spRow);

        // Speaker Mass control
        const smLabel = document.createElement('label');
        smLabel.textContent = 'Speaker Mass:';
        smLabel.htmlFor = `${this.id}-speaker-mass-slider`;
        
        const smSlider = document.createElement('input');
        smSlider.type = 'range';
        smSlider.min = 0.1;
        smSlider.max = 5;
        smSlider.step = 0.05;
        smSlider.value = this.sm;
        smSlider.id = `${this.id}-speaker-mass-slider`;
        smSlider.name = `${this.id}-speaker-mass-slider`;
        smSlider.autocomplete = "off";
        smSlider.addEventListener('input', (e) => {
            this.setSm(parseFloat(e.target.value));
            smValue.value = e.target.value;
        });
        
        const smValue = document.createElement('input');
        smValue.type = 'number';
        smValue.min = 0.1;
        smValue.max = 5;
        smValue.step = 0.05;
        smValue.value = this.sm;
        smValue.id = `${this.id}-speaker-mass-value`;
        smValue.name = `${this.id}-speaker-mass-value`;
        smValue.autocomplete = "off";
        smValue.addEventListener('input', (e) => {
            const parsedValue = parseFloat(e.target.value) || 0.1;
            const value = parsedValue < 0.1 ? 0.1 : (parsedValue > 5 ? 5 : parsedValue);
            this.setSm(value);
            smSlider.value = value;
            e.target.value = value;
        });
        
        const smRow = document.createElement('div');
        smRow.className = 'parameter-row';
        smRow.appendChild(smLabel);
        smRow.appendChild(smSlider);
        smRow.appendChild(smValue);
        container.appendChild(smRow);

        // Distortion Drive control
        const ddLabel = document.createElement('label');
        ddLabel.textContent = 'Distortion Drive:';
        ddLabel.htmlFor = `${this.id}-distortion-drive-slider`;
        
        const ddSlider = document.createElement('input');
        ddSlider.type = 'range';
        ddSlider.min = 0;
        ddSlider.max = 10;
        ddSlider.step = 0.1;
        ddSlider.value = this.dd;
        ddSlider.id = `${this.id}-distortion-drive-slider`;
        ddSlider.name = `${this.id}-distortion-drive-slider`;
        ddSlider.autocomplete = "off";
        ddSlider.addEventListener('input', (e) => {
            this.setDd(parseFloat(e.target.value));
            ddValue.value = e.target.value;
        });
        
        const ddValue = document.createElement('input');
        ddValue.type = 'number';
        ddValue.min = 0;
        ddValue.max = 10;
        ddValue.step = 0.1;
        ddValue.value = this.dd;
        ddValue.id = `${this.id}-distortion-drive-value`;
        ddValue.name = `${this.id}-distortion-drive-value`;
        ddValue.autocomplete = "off";
        ddValue.addEventListener('input', (e) => {
            const parsedValue = parseFloat(e.target.value) || 0;
            const value = parsedValue < 0 ? 0 : (parsedValue > 10 ? 10 : parsedValue);
            this.setDd(value);
            ddSlider.value = value;
            e.target.value = value;
        });
        
        const ddRow = document.createElement('div');
        ddRow.className = 'parameter-row';
        ddRow.appendChild(ddLabel);
        ddRow.appendChild(ddSlider);
        ddRow.appendChild(ddValue);
        container.appendChild(ddRow);

        // Distortion Bias control
        const dbLabel = document.createElement('label');
        dbLabel.textContent = 'Distortion Bias:';
        dbLabel.htmlFor = `${this.id}-distortion-bias-slider`;
        
        const dbSlider = document.createElement('input');
        dbSlider.type = 'range';
        dbSlider.min = -1;
        dbSlider.max = 1;
        dbSlider.step = 0.02;
        dbSlider.value = this.db;
        dbSlider.id = `${this.id}-distortion-bias-slider`;
        dbSlider.name = `${this.id}-distortion-bias-slider`;
        dbSlider.autocomplete = "off";
        dbSlider.addEventListener('input', (e) => {
            this.setDb(parseFloat(e.target.value));
            dbValue.value = e.target.value;
        });
        
        const dbValue = document.createElement('input');
        dbValue.type = 'number';
        dbValue.min = -1;
        dbValue.max = 1;
        dbValue.step = 0.02;
        dbValue.value = this.db;
        dbValue.id = `${this.id}-distortion-bias-value`;
        dbValue.name = `${this.id}-distortion-bias-value`;
        dbValue.autocomplete = "off";
        dbValue.addEventListener('input', (e) => {
            const parsedValue = parseFloat(e.target.value) || 0;
            const value = parsedValue < -1 ? -1 : (parsedValue > 1 ? 1 : parsedValue);
            this.setDb(value);
            dbSlider.value = value;
            e.target.value = value;
        });
        
        const dbRow = document.createElement('div');
        dbRow.className = 'parameter-row';
        dbRow.appendChild(dbLabel);
        dbRow.appendChild(dbSlider);
        dbRow.appendChild(dbValue);
        container.appendChild(dbRow);

        // Distortion Mix control
        const dmLabel = document.createElement('label');
        dmLabel.textContent = 'Distortion Mix (%):';
        dmLabel.htmlFor = `${this.id}-distortion-mix-slider`;
        
        const dmSlider = document.createElement('input');
        dmSlider.type = 'range';
        dmSlider.min = 0;
        dmSlider.max = 100;
        dmSlider.step = 1;
        dmSlider.value = this.dm;
        dmSlider.id = `${this.id}-distortion-mix-slider`;
        dmSlider.name = `${this.id}-distortion-mix-slider`;
        dmSlider.autocomplete = "off";
        dmSlider.addEventListener('input', (e) => {
            this.setDm(parseFloat(e.target.value));
            dmValue.value = e.target.value;
        });
        
        const dmValue = document.createElement('input');
        dmValue.type = 'number';
        dmValue.min = 0;
        dmValue.max = 100;
        dmValue.step = 1;
        dmValue.value = this.dm;
        dmValue.id = `${this.id}-distortion-mix-value`;
        dmValue.name = `${this.id}-distortion-mix-value`;
        dmValue.autocomplete = "off";
        dmValue.addEventListener('input', (e) => {
            const parsedValue = parseFloat(e.target.value) || 0;
            const value = parsedValue < 0 ? 0 : (parsedValue > 100 ? 100 : parsedValue);
            this.setDm(value);
            dmSlider.value = value;
            e.target.value = value;
        });
        
        const dmRow = document.createElement('div');
        dmRow.className = 'parameter-row';
        dmRow.appendChild(dmLabel);
        dmRow.appendChild(dmSlider);
        dmRow.appendChild(dmValue);
        container.appendChild(dmRow);

        // Graph container for canvas and labels
        const graphContainer = document.createElement('div');
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

        // Cone Motion Mix control
        const cmLabel = document.createElement('label');
        cmLabel.textContent = 'Cone Motion Mix (%):';
        cmLabel.htmlFor = `${this.id}-cone-motion-mix-slider`;
        
        const cmSlider = document.createElement('input');
        cmSlider.type = 'range';
        cmSlider.min = 0;
        cmSlider.max = 100;
        cmSlider.step = 1;
        cmSlider.value = this.cm;
        cmSlider.id = `${this.id}-cone-motion-mix-slider`;
        cmSlider.name = `${this.id}-cone-motion-mix-slider`;
        cmSlider.autocomplete = "off";
        cmSlider.addEventListener('input', (e) => {
            this.setCm(parseFloat(e.target.value));
            cmValue.value = e.target.value;
        });
        
        const cmValue = document.createElement('input');
        cmValue.type = 'number';
        cmValue.min = 0;
        cmValue.max = 100;
        cmValue.step = 1;
        cmValue.value = this.cm;
        cmValue.id = `${this.id}-cone-motion-mix-value`;
        cmValue.name = `${this.id}-cone-motion-mix-value`;
        cmValue.autocomplete = "off";
        cmValue.addEventListener('input', (e) => {
            const parsedValue = parseFloat(e.target.value) || 0;
            const value = parsedValue < 0 ? 0 : (parsedValue > 100 ? 100 : parsedValue);
            this.setCm(value);
            cmSlider.value = value;
            e.target.value = value;
        });
        
        const cmRow = document.createElement('div');
        cmRow.className = 'parameter-row';
        cmRow.appendChild(cmLabel);
        cmRow.appendChild(cmSlider);
        cmRow.appendChild(cmValue);
        container.appendChild(cmRow);

        // Output Gain control
        const ogLabel = document.createElement('label');
        ogLabel.textContent = 'Output Gain (dB):';
        ogLabel.htmlFor = `${this.id}-output-gain-slider`;
        
        const ogSlider = document.createElement('input');
        ogSlider.type = 'range';
        ogSlider.min = -18;
        ogSlider.max = 18;
        ogSlider.step = 0.1;
        ogSlider.value = this.og;
        ogSlider.id = `${this.id}-output-gain-slider`;
        ogSlider.name = `${this.id}-output-gain-slider`;
        ogSlider.autocomplete = "off";
        ogSlider.addEventListener('input', (e) => {
            this.setOg(parseFloat(e.target.value));
            ogValue.value = e.target.value;
        });
        
        const ogValue = document.createElement('input');
        ogValue.type = 'number';
        ogValue.min = -18;
        ogValue.max = 18;
        ogValue.step = 0.1;
        ogValue.value = this.og;
        ogValue.id = `${this.id}-output-gain-value`;
        ogValue.name = `${this.id}-output-gain-value`;
        ogValue.autocomplete = "off";
        ogValue.addEventListener('input', (e) => {
            const parsedValue = parseFloat(e.target.value) || 0;
            const value = parsedValue < -18 ? -18 : (parsedValue > 18 ? 18 : parsedValue);
            this.setOg(value);
            ogSlider.value = value;
            e.target.value = value;
        });
        
        const ogRow = document.createElement('div');
        ogRow.className = 'parameter-row';
        ogRow.appendChild(ogLabel);
        ogRow.appendChild(ogSlider);
        ogRow.appendChild(ogValue);
        container.appendChild(ogRow);

        return container;
    }
}

// Register the plugin globally
window.DynamicSaturationPlugin = DynamicSaturationPlugin; 