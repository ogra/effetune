class MultibandCompressorPlugin extends PluginBase {
  constructor() {
    super('Multiband Compressor', '5-band compressor with crossover filters');

    // Crossover frequencies
    this.f1 = 100;  // Low
    this.f2 = 500;  // Low-mid
    this.f3 = 2000; // Mid
    this.f4 = 8000; // High

    // Band parameters (5 bands with optimized initial values for FM radio mastering)
    this.bands = [
      { t: -20, r: 4, a: 30, rl: 150, k: 6, g: -1, gr: 0 },
      { t: -22, r: 3, a: 20, rl: 120, k: 4, g: 0,  gr: 0 },
      { t: -25, r: 2.5, a: 15, rl: 80,  k: 4, g: 1,  gr: 0 },
      { t: -28, r: 2, a: 10, rl: 60,  k: 3, g: 1.5, gr: 0 },
      { t: -18, r: 5, a: 5,  rl: 40,  k: 2, g: -2, gr: 0 }
    ];

    this.selectedBand = 0;
    this.lastProcessTime = performance.now() / 1000;
    this.animationFrameId = null;

    // Register the processor code (returned as a string)
    this.registerProcessor(this.getProcessorCode());
  }

  // Returns the processor code string with inline optimizations.
  getProcessorCode() {
    return `
      // Processor code for Multiband Compressor
      const result = new Float32Array(data.length);
      result.set(data);

      if (!parameters.enabled) return result; // Bypass processing if disabled

      const MIN_DB = -60;
      const MAX_DB = 12;
      const frequencies = [parameters.f1, parameters.f2, parameters.f3, parameters.f4];

      // Check if filter states need to be reset
      const needsReset = !context.filterStates ||
                         !context.filterConfig ||
                         context.filterConfig.sampleRate !== parameters.sampleRate ||
                         context.filterConfig.channelCount !== parameters.channelCount ||
                         !context.filterConfig.frequencies ||
                         context.filterConfig.frequencies.some((f, i) => f !== frequencies[i]);

      if (needsReset) {
        // Create filter state with DC-blocking initialization
        const createFilterState = () => {
          const state = {
            stage1: {
              x1: new Float32Array(parameters.channelCount),
              x2: new Float32Array(parameters.channelCount),
              y1: new Float32Array(parameters.channelCount),
              y2: new Float32Array(parameters.channelCount)
            },
            stage2: {
              x1: new Float32Array(parameters.channelCount),
              x2: new Float32Array(parameters.channelCount),
              y1: new Float32Array(parameters.channelCount),
              y2: new Float32Array(parameters.channelCount)
            }
          };
          const dcOffset = 1e-25;
          for (let ch = 0; ch < parameters.channelCount; ch++) {
            state.stage1.x1[ch] = dcOffset;
            state.stage1.x2[ch] = -dcOffset;
            state.stage1.y1[ch] = dcOffset;
            state.stage1.y2[ch] = -dcOffset;
            state.stage2.x1[ch] = dcOffset;
            state.stage2.x2[ch] = -dcOffset;
            state.stage2.y1[ch] = dcOffset;
            state.stage2.y2[ch] = -dcOffset;
          }
          return state;
        };

        context.filterStates = {
          lowpass: Array(4).fill(0).map(() => createFilterState()),
          highpass: Array(4).fill(0).map(() => createFilterState())
        };

        context.filterConfig = {
          sampleRate: parameters.sampleRate,
          frequencies: frequencies.slice(),
          channelCount: parameters.channelCount
        };

        // Apply a short fade-in to prevent clicks when filter states are reset
        context.fadeIn = {
          counter: 0,
          length: Math.min(parameters.blockSize, parameters.sampleRate * 0.005)
        };
      }

      // Helper function to apply cascaded Linkwitz-Riley filter (2 stages)
      function applyFilter(input, coeffs, state, ch) {
        const { b0, b1, b2, a1, a2 } = coeffs;
        const s1 = state.stage1, s2 = state.stage2;
        // First stage filtering
        const stage1_out = b0 * input + b1 * s1.x1[ch] + b2 * s1.x2[ch] - a1 * s1.y1[ch] - a2 * s1.y2[ch];
        s1.x2[ch] = s1.x1[ch];
        s1.x1[ch] = input;
        s1.y2[ch] = s1.y1[ch];
        s1.y1[ch] = stage1_out;
        // Second stage filtering
        const stage2_out = b0 * stage1_out + b1 * s2.x1[ch] + b2 * s2.x2[ch] - a1 * s2.y1[ch] - a2 * s2.y2[ch];
        s2.x2[ch] = s2.x1[ch];
        s2.x1[ch] = stage1_out;
        s2.y2[ch] = s2.y1[ch];
        s2.y1[ch] = stage2_out;
        return stage2_out;
      }

      // Cache filter coefficients if frequencies have changed
      if (!context.cachedFilters || !context.filterConfig || !context.filterConfig.frequencies ||
          frequencies.some((f, i) => f !== context.filterConfig.frequencies[i])) {
        const TWO_PI = 2 * Math.PI;
        const SQRT2 = Math.SQRT2;
        const sampleRateHalf = parameters.sampleRate * 0.5;
        const invSampleRate = 1 / parameters.sampleRate;
        context.cachedFilters = new Array(4);
        for (let i = 0; i < 4; i++) {
          const freq = Math.max(20, Math.min(sampleRateHalf - 20, frequencies[i]));
          const omega = Math.tan(freq * Math.PI * invSampleRate);
          const omega2 = omega * omega;
          const n = 1 / (omega2 + SQRT2 * omega + 1);
          const b0_lp = omega2 * n;
          context.cachedFilters[i] = {
            lowpass: { b0: b0_lp, b1: 2 * b0_lp, b2: b0_lp, a1: 2 * (omega2 - 1) * n, a2: (omega2 - SQRT2 * omega + 1) * n },
            highpass: { b0: n, b1: -2 * n, b2: n, a1: 2 * (omega2 - 1) * n, a2: (omega2 - SQRT2 * omega + 1) * n }
          };
        }
      }

      // Setup band signal buffers using a pooled TypedArray to avoid reallocation
      if (!context.bandSignals || context.bandSignals.length !== parameters.channelCount) {
        const totalArrays = parameters.channelCount * 5;
        const arrayPool = new Float32Array(totalArrays * parameters.blockSize);
        context.bandSignals = Array.from({ length: parameters.channelCount }, (_, ch) => {
          return new Array(5).fill(0).map((_, band) => {
            const offset = (ch * 5 + band) * parameters.blockSize;
            return arrayPool.subarray(offset, offset + parameters.blockSize);
          });
        });
        context.arrayPool = arrayPool; // Prevent GC of the pool
      }

      // Reuse gain reductions array
      if (!context.gainReductions) context.gainReductions = new Float32Array(5);
      const gainReductions = context.gainReductions;

      // Process each channel
      for (let ch = 0; ch < parameters.channelCount; ch++) {
        const offset = ch * parameters.blockSize;
        const bandSignals = context.bandSignals[ch];
        const filterStates = context.filterStates;

        // Split signal into frequency bands using cascaded Linkwitz-Riley filters
        for (let i = 0; i < parameters.blockSize; i++) {
          const input = data[offset + i];
          // Band 0 (Low)
          bandSignals[0][i] = applyFilter(input, context.cachedFilters[0].lowpass, filterStates.lowpass[0], ch);
          const hp1 = applyFilter(input, context.cachedFilters[0].highpass, filterStates.highpass[0], ch);
          // Band 1 (Low-Mid)
          bandSignals[1][i] = applyFilter(hp1, context.cachedFilters[1].lowpass, filterStates.lowpass[1], ch);
          const hp2 = applyFilter(hp1, context.cachedFilters[1].highpass, filterStates.highpass[1], ch);
          // Band 2 (Mid)
          bandSignals[2][i] = applyFilter(hp2, context.cachedFilters[2].lowpass, filterStates.lowpass[2], ch);
          const hp3 = applyFilter(hp2, context.cachedFilters[2].highpass, filterStates.highpass[2], ch);
          // Band 3 (High-Mid)
          bandSignals[3][i] = applyFilter(hp3, context.cachedFilters[3].lowpass, filterStates.lowpass[3], ch);
          // Band 4 (High)
          bandSignals[4][i] = applyFilter(hp3, context.cachedFilters[3].highpass, filterStates.highpass[3], ch);
        }

        // Envelope detection and gain reduction calculation for each band
        if (!context.envelopeStates) {
          context.envelopeStates = new Float32Array(parameters.channelCount * 5).fill(1e-6);
        }
        const sampleRateMs = parameters.sampleRate / 1000;
        const LOG2 = Math.log(2);
        if (!context.timeConstants) {
          context.timeConstants = new Float32Array(10); // 5 bands * 2 (attack & release)
          for (let i = 0; i < 5; i++) {
            const bandParams = parameters.bands[i];
            context.timeConstants[i * 2] = Math.exp(-LOG2 / Math.max(1, bandParams.a * sampleRateMs));
            context.timeConstants[i * 2 + 1] = Math.exp(-LOG2 / Math.max(1, bandParams.rl * sampleRateMs));
          }
        }
        const LOG10_20 = 8.685889638065035; // 20/ln(10)
        const ENVELOPE_CHUNK_SIZE = 64;
        const GAIN_CHUNK_SIZE = 128;
        let maxEnvelopeDb = -60;

        for (let band = 0; band < 5; band++) {
          const bandParams = parameters.bands[band];
          const attackCoeff = context.timeConstants[band * 2];
          const releaseCoeff = context.timeConstants[band * 2 + 1];
          let envelope = context.envelopeStates[ch * 5 + band];
          const bandSignal = bandSignals[band];

          for (let i = 0; i < parameters.blockSize; i += ENVELOPE_CHUNK_SIZE) {
            const end = Math.min(i + ENVELOPE_CHUNK_SIZE, parameters.blockSize);
            for (let j = i; j < end - 3; j += 4) {
              const abs0 = Math.abs(bandSignal[j]);
              const abs1 = Math.abs(bandSignal[j + 1]);
              const abs2 = Math.abs(bandSignal[j + 2]);
              const abs3 = Math.abs(bandSignal[j + 3]);
              envelope = Math.max(1e-6, envelope * (abs0 > envelope ? attackCoeff : releaseCoeff) + abs0 * (1 - (abs0 > envelope ? attackCoeff : releaseCoeff)));
              envelope = Math.max(1e-6, envelope * (abs1 > envelope ? attackCoeff : releaseCoeff) + abs1 * (1 - (abs1 > envelope ? attackCoeff : releaseCoeff)));
              envelope = Math.max(1e-6, envelope * (abs2 > envelope ? attackCoeff : releaseCoeff) + abs2 * (1 - (abs2 > envelope ? attackCoeff : releaseCoeff)));
              envelope = Math.max(1e-6, envelope * (abs3 > envelope ? attackCoeff : releaseCoeff) + abs3 * (1 - (abs3 > envelope ? attackCoeff : releaseCoeff)));
              const envelopeDb = LOG10_20 * Math.log(envelope);
              maxEnvelopeDb = Math.min(0, Math.max(maxEnvelopeDb, envelopeDb));
            }
            for (let j = end - (end % 4); j < end; j++) {
              const absVal = Math.abs(bandSignal[j]);
              const coeff = absVal > envelope ? attackCoeff : releaseCoeff;
              envelope = Math.max(1e-6, envelope * coeff + absVal * (1 - coeff));
              const envelopeDb = LOG10_20 * Math.log(envelope);
              maxEnvelopeDb = Math.min(0, Math.max(maxEnvelopeDb, envelopeDb));
            }
          }
          context.envelopeStates[ch * 5 + band] = envelope;

          // Gain reduction calculation (branchless)
          const diff = maxEnvelopeDb - bandParams.t;
          const halfKnee = bandParams.k * 0.5;
          const invRatio = 1 - 1 / bandParams.r;
          const t = Math.max(0, (diff + halfKnee) / bandParams.k);
          const softKnee = invRatio * bandParams.k * t * t * 0.5;
          const hardKnee = diff * invRatio;
          const gainReduction = diff >= halfKnee ? hardKnee : diff <= -halfKnee ? 0 : softKnee;
          const totalGainLin = Math.exp((-gainReduction + bandParams.g) * 0.11512925464970229);

          // Apply gain using chunked processing for performance
          for (let i = 0; i < parameters.blockSize; i += GAIN_CHUNK_SIZE) {
            const end = Math.min(i + GAIN_CHUNK_SIZE, parameters.blockSize);
            for (let j = i; j < end - 3; j += 4) {
              bandSignal[j] *= totalGainLin;
              bandSignal[j + 1] *= totalGainLin;
              bandSignal[j + 2] *= totalGainLin;
              bandSignal[j + 3] *= totalGainLin;
            }
            for (let j = end - (end % 4); j < end; j++) {
              bandSignal[j] *= totalGainLin;
            }
          }
          gainReductions[band] = gainReduction;
        }

        // Sum bands and apply fade-in if active
        const fadeIn = context.fadeIn;
        const fadeActive = fadeIn && fadeIn.counter < fadeIn.length;
        const fadeLength = fadeActive ? fadeIn.length : 1;
        for (let i = 0; i < parameters.blockSize; i++) {
          const sum = bandSignals[0][i] +
                      bandSignals[1][i] +
                      bandSignals[2][i] +
                      bandSignals[3][i] +
                      bandSignals[4][i];
          result[ch * parameters.blockSize + i] = fadeActive ? sum * (fadeIn.counter++ / fadeLength) : sum;
        }
      }

      result.measurements = {
        time: parameters.time,
        gainReductions: parameters.bands.map((_, i) => gainReductions[i])
      };

      return result;
    `;
  }

  onMessage(message) {
    if (message.type === 'processBuffer' && message.buffer) {
      const result = this.process(message.buffer, message);
      if (this.canvas) this.updateTransferGraphs();
      return result;
    }
  }

  process(audioBuffer, message) {
    if (!message?.measurements) return audioBuffer;
    const currentTime = performance.now() / 1000;
    const deltaTime = currentTime - this.lastProcessTime;
    this.lastProcessTime = currentTime;
    const targetGrs = message.measurements.gainReductions || Array(5).fill(0);
    const attackTime = 0.005;  // 5ms for fast attack
    const releaseTime = 0.100; // 100ms for smooth release

    for (let i = 0; i < 5; i++) {
      const smoothingFactor = targetGrs[i] > this.bands[i].gr
        ? Math.min(1, deltaTime / attackTime)
        : Math.min(1, deltaTime / releaseTime);
      this.bands[i].gr = Math.max(0, this.bands[i].gr + (targetGrs[i] - this.bands[i].gr) * smoothingFactor);
    }
    return audioBuffer;
  }

  setParameters(params) {
    let graphNeedsUpdate = false;

    // Update crossover frequencies with bounds checking
    if (params.f1 !== undefined) {
      this.f1 = Math.max(20, Math.min(500, params.f1));
      graphNeedsUpdate = true;
    }
    if (params.f2 !== undefined) {
      this.f2 = Math.max(100, Math.min(2000, Math.max(this.f1, params.f2)));
      graphNeedsUpdate = true;
    }
    if (params.f3 !== undefined) {
      this.f3 = Math.max(500, Math.min(8000, Math.max(this.f2, params.f3)));
      graphNeedsUpdate = true;
    }
    if (params.f4 !== undefined) {
      this.f4 = Math.max(1000, Math.min(20000, Math.max(this.f3, params.f4)));
      graphNeedsUpdate = true;
    }

    // Update band parameters if provided as an array
    if (Array.isArray(params.bands)) {
      params.bands.forEach((bandParams, i) => {
        if (i < 5) {
          const band = this.bands[i];
          if (bandParams.t !== undefined) band.t = Math.max(-60, Math.min(0, bandParams.t));
          if (bandParams.r !== undefined) band.r = Math.max(1, Math.min(20, bandParams.r));
          if (bandParams.a !== undefined) band.a = Math.max(0.1, Math.min(100, bandParams.a));
          if (bandParams.rl !== undefined) band.rl = Math.max(10, Math.min(1000, bandParams.rl));
          if (bandParams.k !== undefined) band.k = Math.max(0, Math.min(12, bandParams.k));
          if (bandParams.g !== undefined) band.g = Math.max(-12, Math.min(12, bandParams.g));
        }
      });
      graphNeedsUpdate = true;
    } else if (params.band !== undefined && params.band < 5) {
      // Update a single band parameter if provided
      const band = this.bands[params.band];
      if (params.t !== undefined) { band.t = Math.max(-60, Math.min(0, params.t)); graphNeedsUpdate = true; }
      if (params.r !== undefined) { band.r = Math.max(1, Math.min(20, params.r)); graphNeedsUpdate = true; }
      if (params.a !== undefined) band.a = Math.max(0.1, Math.min(100, params.a));
      if (params.rl !== undefined) band.rl = Math.max(10, Math.min(1000, params.rl));
      if (params.k !== undefined) { band.k = Math.max(0, Math.min(12, params.k)); graphNeedsUpdate = true; }
      if (params.g !== undefined) { band.g = Math.max(-12, Math.min(12, params.g)); graphNeedsUpdate = true; }
    }
    if (params.enabled !== undefined) this.enabled = params.enabled;

    this.updateParameters();
    if (graphNeedsUpdate) this.updateTransferGraphs();
  }

  // Frequency slider setters
  setF1(value) { this.setParameters({ f1: value }); }
  setF2(value) { this.setParameters({ f2: value }); }
  setF3(value) { this.setParameters({ f3: value }); }
  setF4(value) { this.setParameters({ f4: value }); }

  // Band parameter setters
  setT(value) { this.setParameters({ band: this.selectedBand, t: value }); }
  setR(value) { this.setParameters({ band: this.selectedBand, r: value }); }
  setA(value) { this.setParameters({ band: this.selectedBand, a: value }); }
  setRl(value) { this.setParameters({ band: this.selectedBand, rl: value }); }
  setK(value) { this.setParameters({ band: this.selectedBand, k: value }); }
  setG(value) { this.setParameters({ band: this.selectedBand, g: value }); }

  getParameters() {
    return {
      type: this.constructor.name,
      f1: this.f1,
      f2: this.f2,
      f3: this.f3,
      f4: this.f4,
      bands: this.bands.map(b => ({
        t: b.t,
        r: b.r,
        a: b.a,
        rl: b.rl,
        k: b.k,
        g: b.g,
        gr: b.gr
      })),
      enabled: this.enabled
    };
  }

  updateTransferGraphs() {
    if (!this.canvas) return;

    // Cached constants for drawing
    const DB_POINTS = [-48, -36, -24, -12];
    const GRID_COLOR = '#444';
    const LABEL_COLOR = '#666';
    const CURVE_COLOR = '#0f0';
    const METER_COLOR = '#008000';

    // Cache DOM query result to minimize reflows
    const canvases = Array.from(document.querySelectorAll('.band-graph canvas'));
    if (!canvases.length) return;

    const graphContexts = canvases.map(canvas => ({
      ctx: canvas.getContext('2d'),
      width: canvas.width,
      height: canvas.height
    }));

    graphContexts.forEach((graph, bandIndex) => {
      const { ctx, width, height } = graph;
      const band = this.bands[bandIndex];

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw grid lines (vertical & horizontal)
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      DB_POINTS.forEach(db => {
        const x = ((db + 60) / 60) * width;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        const y = height - ((db + 60) / 60) * height;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      });
      ctx.stroke();

      // Draw labels for grid lines
      ctx.fillStyle = LABEL_COLOR;
      ctx.font = '20px Arial';
      DB_POINTS.forEach(db => {
        const x = ((db + 60) / 60) * width;
        const y = height - ((db + 60) / 60) * height;
        ctx.textAlign = 'right';
        ctx.fillText(`${db}dB`, 80, y + 6);
        ctx.textAlign = 'center';
        ctx.fillText(`${db}dB`, x, height - 40);
      });

      // Draw axis labels
      ctx.fillStyle = '#fff';
      ctx.font = '28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('in', width / 2, height - 5);
      ctx.save();
      ctx.translate(20, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('out', 0, 0);
      ctx.restore();

      // Draw transfer curve for current band
      ctx.strokeStyle = CURVE_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const halfKnee = band.k * 0.5;
      const slope = 1 - 1 / band.r;
      const points = new Float32Array(width * 2);
      for (let i = 0; i < width; i++) {
        const inputDb = (i / width) * 60 - 60;
        const diff = inputDb - band.t;
        let gainReduction = 0;
        if (diff <= -halfKnee) {
          gainReduction = 0;
        } else if (diff >= halfKnee) {
          gainReduction = diff * slope;
        } else {
          const t = (diff + halfKnee) / band.k;
          gainReduction = slope * band.k * t * t * 0.5;
        }
        const outputDb = inputDb - gainReduction + band.g;
        const y = ((outputDb + 60) / 60) * height;
        points[i * 2] = i;
        points[i * 2 + 1] = height - Math.max(0, Math.min(height, y));
      }
      ctx.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) {
        ctx.lineTo(points[i], points[i + 1]);
      }
      ctx.stroke();

      // Draw gain reduction meter if applicable
      if (band.gr > 0) {
        ctx.fillStyle = METER_COLOR;
        const meterHeight = Math.min(height, (band.gr / 60) * height);
        ctx.fillRect(width - 10, 0, 10, meterHeight);
      }
    });
  }

  createUI() {
    const container = document.createElement('div');
    container.className = 'multiband-compressor-plugin-ui';

    // Frequency sliders UI
    const freqContainer = document.createElement('div');
    freqContainer.className = 'plugin-parameter-ui';
    const freqSliders = document.createElement('div');
    freqSliders.className = 'frequency-sliders';
    freqContainer.appendChild(freqSliders);

    const createFreqSlider = (label, min, max, value, setter) => {
      const sliderContainer = document.createElement('div');
      sliderContainer.className = 'frequency-slider';
      const topRow = document.createElement('div');
      topRow.className = 'frequency-slider-top parameter-row';
      const labelEl = document.createElement('label');
      labelEl.textContent = label;
      const numberInput = document.createElement('input');
      numberInput.type = 'number';
      numberInput.min = min;
      numberInput.max = max;
      numberInput.step = 1;
      numberInput.value = value;
      const rangeInput = document.createElement('input');
      rangeInput.type = 'range';
      rangeInput.min = min;
      rangeInput.max = max;
      rangeInput.step = 1;
      rangeInput.value = value;
      rangeInput.addEventListener('input', (e) => {
        setter(parseFloat(e.target.value));
        numberInput.value = e.target.value;
      });
      numberInput.addEventListener('input', (e) => {
        const val = Math.max(min, Math.min(max, parseFloat(e.target.value) || 0));
        setter(val);
        rangeInput.value = val;
        e.target.value = val;
      });
      topRow.appendChild(labelEl);
      topRow.appendChild(numberInput);
      sliderContainer.appendChild(topRow);
      sliderContainer.appendChild(rangeInput);
      return sliderContainer;
    };

    freqSliders.appendChild(createFreqSlider('Freq 1 (Hz):', 20, 500, this.f1, this.setF1.bind(this)));
    freqSliders.appendChild(createFreqSlider('Freq 2 (Hz):', 100, 2000, this.f2, this.setF2.bind(this)));
    freqSliders.appendChild(createFreqSlider('Freq 3 (Hz):', 500, 8000, this.f3, this.setF3.bind(this)));
    freqSliders.appendChild(createFreqSlider('Freq 4 (Hz):', 1000, 20000, this.f4, this.setF4.bind(this)));
    container.appendChild(freqContainer);

    // Band settings UI
    const bandSettings = document.createElement('div');
    bandSettings.className = 'band-settings';
    const bandTabs = document.createElement('div');
    bandTabs.className = 'band-tabs';
    const bandContents = document.createElement('div');
    bandContents.className = 'band-contents';

    for (let i = 0; i < 5; i++) {
      const tab = document.createElement('button');
      tab.className = `band-tab ${i === 0 ? 'active' : ''}`;
      tab.textContent = `Band ${i + 1}`;
      tab.onclick = () => {
        document.querySelectorAll('.band-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.band-content').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.band-graph').forEach(g => g.classList.remove('active'));
        tab.classList.add('active');
        content.classList.add('active');
        document.querySelector(`.band-graph:nth-child(${i + 1})`).classList.add('active');
        this.selectedBand = i;
        this.updateTransferGraphs();
      };
      bandTabs.appendChild(tab);

      const content = document.createElement('div');
      content.className = `band-content plugin-parameter-ui ${i === 0 ? 'active' : ''}`;

      const createControl = (label, min, max, step, value, setter) => {
        const row = document.createElement('div');
        row.className = 'parameter-row';
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = value;
        const numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.min = min;
        numberInput.max = max;
        numberInput.step = step;
        numberInput.value = value;
        slider.addEventListener('input', (e) => {
          setter(parseFloat(e.target.value));
          numberInput.value = e.target.value;
        });
        numberInput.addEventListener('input', (e) => {
          const val = Math.max(min, Math.min(max, parseFloat(e.target.value) || 0));
          setter(val);
          slider.value = val;
          e.target.value = val;
        });
        row.appendChild(labelEl);
        row.appendChild(slider);
        row.appendChild(numberInput);
        return row;
      };

      const band = this.bands[i];
      content.appendChild(createControl('Threshold (dB):', -60, 0, 1, band.t, this.setT.bind(this)));
      content.appendChild(createControl('Ratio:', 1, 20, 0.1, band.r, this.setR.bind(this)));
      content.appendChild(createControl('Attack (ms):', 0.1, 100, 0.1, band.a, this.setA.bind(this)));
      content.appendChild(createControl('Release (ms):', 1, 1000, 1, band.rl, this.setRl.bind(this)));
      content.appendChild(createControl('Knee (dB):', 0, 12, 1, band.k, this.setK.bind(this)));
      content.appendChild(createControl('Gain (dB):', -12, 12, 0.1, band.g, this.setG.bind(this)));
      bandContents.appendChild(content);
    }

    bandSettings.appendChild(bandTabs);
    bandSettings.appendChild(bandContents);
    container.appendChild(bandSettings);

    // Gain reduction graphs UI
    const graphsContainer = document.createElement('div');
    graphsContainer.className = 'gain-reduction-graphs';
    for (let i = 0; i < 5; i++) {
      const graphDiv = document.createElement('div');
      graphDiv.className = `band-graph ${i === 0 ? 'active' : ''}`;
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 320;
      canvas.style.width = '160px';
      canvas.style.height = '160px';
      canvas.style.backgroundColor = '#222';
      const label = document.createElement('div');
      label.className = 'band-graph-label';
      label.textContent = `Band ${i + 1}`;
      graphDiv.appendChild(canvas);
      graphDiv.appendChild(label);
      graphsContainer.appendChild(graphDiv);
    }
    container.appendChild(graphsContainer);

    // Cache main canvas reference for animation updates
    this.canvas = container.querySelector('.band-graph.active canvas');
    this.updateTransferGraphs();
    this.startAnimation();

    return container;
  }

  startAnimation() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    const animate = () => {
      this.updateTransferGraphs();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  cleanup() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
    this.bands.forEach(band => band.gr = 0);
    this.lastProcessTime = performance.now() / 1000;
  }
}

window.MultibandCompressorPlugin = MultibandCompressorPlugin;
