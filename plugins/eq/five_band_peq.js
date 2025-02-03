class FiveBandPEQPlugin extends PluginBase {
  // Initial band frequencies (approximately logarithmically spaced)
  static BANDS = [
    { freq: 100, name: '100 Hz' },
    { freq: 316, name: '316 Hz' },
    { freq: 1000, name: '1.0 kHz' },
    { freq: 3160, name: '3.2 kHz' },
    { freq: 10000, name: '10 kHz' }
  ];

  // Filter types
  static FILTER_TYPES = [
    { id: 'pk', name: 'Peaking' },
    { id: 'lp', name: 'LowPass' },
    { id: 'hp', name: 'HighPass' },
    { id: 'ls', name: 'LowShelv' },
    { id: 'hs', name: 'HighShel' },
    { id: 'bp', name: 'BandPass' }
  ];

  // AudioWorklet processor function (internal processing)
  static processorFunction = `
    if (!parameters.enabled) return data;
    
    const { channelCount, blockSize, sampleRate } = parameters;
    
    // Initialize filter states if not exists
    if (!context.initialized) {
      context.filterStates = {};
      for (let i = 0; i < 5; i++) {
        context.filterStates['b' + i] = {
          x1: new Array(channelCount).fill(0),
          x2: new Array(channelCount).fill(0),
          y1: new Array(channelCount).fill(0),
          y2: new Array(channelCount).fill(0)
        };
      }
      context.initialized = true;
    }
    
    // Reset filter states if channel count changes
    if (context.filterStates.b0.x1.length !== channelCount) {
      for (let i = 0; i < 5; i++) {
        context.filterStates['b' + i] = {
          x1: new Array(channelCount).fill(0),
          x2: new Array(channelCount).fill(0),
          y1: new Array(channelCount).fill(0),
          y2: new Array(channelCount).fill(0)
        };
      }
    }
    
    // Process each band
    for (let bandIndex = 0; bandIndex < 5; bandIndex++) {
      const gainDb = parameters['g' + bandIndex];
      const type = parameters['t' + bandIndex];
      const freq = parameters['f' + bandIndex];
      // For shelving filters, use a fixed Q (0.7); otherwise use provided Q.
      const Q = (type === 'ls' || type === 'hs') ? 0.7 : parameters['q' + bandIndex];
      
      // Calculate gain directly as 10^(dB/40)
      const gain = Math.pow(10, gainDb / 40);
      const w0 = 2 * Math.PI * freq / sampleRate;
      let alpha = Math.sin(w0) / (2 * Q);
      const cosw0 = Math.cos(w0);
      // Previously used Math.sqrt(gain) but here we use gain directly
      const A = gain;
      
      let b0, b1, b2, a0, a1, a2;
      
      switch (type) {
        case 'pk': { // Peaking EQ
          if (Math.abs(gainDb) < 1e-3) {
            b0 = 1; b1 = 0; b2 = 0; a0 = 1; a1 = 0; a2 = 0;
          } else {
            const alpha_A = alpha * A;
            const alpha_div_A = alpha / A;
            b0 = 1 + alpha_A;
            b1 = -2 * cosw0;
            b2 = 1 - alpha_A;
            a0 = 1 + alpha_div_A;
            a1 = -2 * cosw0;
            a2 = 1 - alpha_div_A;
          }
          break;
        }
        case 'lp': { // Low Pass
          b0 = (1 - cosw0) / 2;
          b1 = 1 - cosw0;
          b2 = (1 - cosw0) / 2;
          a0 = 1 + alpha;
          a1 = -2 * cosw0;
          a2 = 1 - alpha;
          break;
        }
        case 'hp': { // High Pass
          b0 = (1 + cosw0) / 2;
          b1 = -(1 + cosw0);
          b2 = (1 + cosw0) / 2;
          a0 = 1 + alpha;
          a1 = -2 * cosw0;
          a2 = 1 - alpha;
          break;
        }
        case 'ls': { // Low Shelf
          if (Math.abs(gainDb) < 1e-3) {
            b0 = 1; b1 = 0; b2 = 0; a0 = 1; a1 = 0; a2 = 0;
          } else {
            const shelfAlpha = 2 * Math.sqrt(A) * alpha;
            b0 = A * ((A + 1) - (A - 1) * cosw0 + shelfAlpha);
            b1 = 2 * A * ((A - 1) - (A + 1) * cosw0);
            b2 = A * ((A + 1) - (A - 1) * cosw0 - shelfAlpha);
            a0 = (A + 1) + (A - 1) * cosw0 + shelfAlpha;
            a1 = -2 * ((A - 1) + (A + 1) * cosw0);
            a2 = (A + 1) + (A - 1) * cosw0 - shelfAlpha;
          }
          break;
        }
        case 'hs': { // High Shelf
          if (Math.abs(gainDb) < 1e-3) {
            b0 = 1; b1 = 0; b2 = 0; a0 = 1; a1 = 0; a2 = 0;
          } else {
            const shelfAlpha = 2 * Math.sqrt(A) * alpha;
            b0 = A * ((A + 1) + (A - 1) * cosw0 + shelfAlpha);
            b1 = -2 * A * ((A - 1) + (A + 1) * cosw0);
            b2 = A * ((A + 1) + (A - 1) * cosw0 - shelfAlpha);
            a0 = (A + 1) - (A - 1) * cosw0 + shelfAlpha;
            a1 = 2 * ((A - 1) - (A + 1) * cosw0);
            a2 = (A + 1) - (A - 1) * cosw0 - shelfAlpha;
          }
          break;
        }
        case 'bp': { // Band Pass
          b0 = alpha;
          b1 = 0;
          b2 = -alpha;
          a0 = 1 + alpha;
          a1 = -2 * cosw0;
          a2 = 1 - alpha;
          break;
        }
      }
      
      // Normalize coefficients
      const norm_b0 = b0 / a0;
      const norm_b1 = b1 / a0;
      const norm_b2 = b2 / a0;
      const norm_a1 = a1 / a0;
      const norm_a2 = a2 / a0;
      
      const states = context.filterStates['b' + bandIndex];
      
      // Process each channel
      for (let ch = 0; ch < channelCount; ch++) {
        const offset = ch * blockSize;
        for (let i = 0; i < blockSize; i++) {
          const x0 = data[offset + i];
          const y0 = norm_b0 * x0 + norm_b1 * states.x1[ch] + norm_b2 * states.x2[ch] -
                     norm_a1 * states.y1[ch] - norm_a2 * states.y2[ch];
          // Update states
          states.x2[ch] = states.x1[ch];
          states.x1[ch] = x0;
          states.y2[ch] = states.y1[ch];
          states.y1[ch] = y0;
          data[offset + i] = y0;
        }
      }
    }
    
    return data;
  `;

  constructor() {
    super('5Band PEQ', '5-band parametric equalizer');

    // Internal sample rate (default 48000Hz)
    this._sampleRate = 48000;

    // Throttle state
    this.lastThrottleTime = 0;
    this.rafId = null;

    // Initialize band parameters
    for (let i = 0; i < 5; i++) {
      this['f' + i] = FiveBandPEQPlugin.BANDS[i].freq;
      this['g' + i] = 0;      // Gain: -18dB to +18dB
      this['q' + i] = 1.0;    // Q: 0.1 to 10.0
      this['t' + i] = 'pk';   // Filter type: default is peaking
    }

    // Register the processor function
    this.registerProcessor(FiveBandPEQPlugin.processorFunction);
  }

  // Throttle updates using requestAnimationFrame
  throttle(func, delay) {
    const now = Date.now();
    if (now - this.lastThrottleTime >= delay) {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }
      this.rafId = requestAnimationFrame(() => {
        func();
        this.lastThrottleTime = now;
        this.rafId = null;
      });
    }
  }

  // Convert frequency to internal value
  freqToInternal(freq) {
    return Math.round(Math.log2(freq / 20) * 200);
  }
  internalToFreq(value) {
    return Math.round(20 * Math.pow(2, value / 200));
  }

  // Set band parameters
  setBand(index, freq, gain, Q, type) {
    if (freq !== undefined) this['f' + index] = freq;
    if (gain !== undefined) this['g' + index] = Math.max(-18, Math.min(18, gain));
    if (Q !== undefined) this['q' + index] = Math.max(0.1, Math.min(10, Q));
    if (type !== undefined) {
      this['t' + index] = type;
      if (type === 'ls' || type === 'hs') {
        this['q' + index] = 0.7;
      }
    }
    this.updateParameters();
  }

  // Reset all bands to initial values
  reset() {
    for (let i = 0; i < 5; i++) {
      this['f' + i] = FiveBandPEQPlugin.BANDS[i].freq;
      this['g' + i] = 0;
      this['q' + i] = 1.0;
      this['t' + i] = 'pk';
    }
    this.updateParameters();
  }

  getParameters() {
    const params = { type: this.constructor.name, enabled: this.enabled };
    for (let i = 0; i < 5; i++) {
      params['f' + i] = this['f' + i];
      params['g' + i] = this['g' + i];
      params['q' + i] = this['q' + i];
      params['t' + i] = this['t' + i];
    }
    return params;
  }

  setParameters(params) {
    if (params.enabled !== undefined) this.enabled = params.enabled;
    if (params.sampleRate !== undefined) this._sampleRate = params.sampleRate;
    for (let i = 0; i < 5; i++) {
      if (params['f' + i] !== undefined) this['f' + i] = params['f' + i];
      if (params['g' + i] !== undefined) this['g' + i] = params['g' + i];
      if (params['q' + i] !== undefined) this['q' + i] = params['q' + i];
      if (params['t' + i] !== undefined) {
        this['t' + i] = params['t' + i];
        if (params['t' + i] === 'ls' || params['t' + i] === 'hs') {
          this['q' + i] = 0.7;
        }
      }
    }
    this.updateParameters();
  }

  createUI() {
    const container = document.createElement('div');
    container.className = 'five-band-peq';

    // Graph container
    const graphContainer = document.createElement('div');
    graphContainer.className = 'five-band-peq-graph';

    // SVG for frequency grid
    const gridSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    gridSvg.setAttribute('class', 'five-band-peq-grid');
    gridSvg.setAttribute('width', '100%');
    gridSvg.setAttribute('height', '100%');

    const freqs = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
    freqs.forEach(freq => {
      const x = this.freqToX(freq);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', `${x}%`);
      line.setAttribute('x2', `${x}%`);
      line.setAttribute('y1', '0');
      line.setAttribute('y2', '100%');
      gridSvg.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', `${x}%`);
      text.setAttribute('y', '95%');
      text.setAttribute('text-anchor', 'middle');
      text.textContent = freq >= 1000 ? `${freq / 1000}k` : freq;
      gridSvg.appendChild(text);
    });

    // SVG for gain grid
    const gains = [-12, -6, 0, 6, 12];
    gains.forEach(gain => {
      const y = this.gainToY(gain);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '0');
      line.setAttribute('x2', '100%');
      line.setAttribute('y1', `${y}%`);
      line.setAttribute('y2', `${y}%`);
      gridSvg.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '2%');
      text.setAttribute('y', `${y}%`);
      text.setAttribute('dominant-baseline', 'middle');
      text.textContent = `${gain}dB`;
      gridSvg.appendChild(text);
    });

    graphContainer.appendChild(gridSvg);

    // SVG for frequency response curve
    const responseSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    responseSvg.setAttribute('class', 'five-band-peq-response');
    responseSvg.setAttribute('width', '100%');
    responseSvg.setAttribute('height', '100%');
    graphContainer.appendChild(responseSvg);

    // Generate band markers
    const markers = [];
    for (let i = 0; i < 5; i++) {
      const marker = document.createElement('div');
      marker.className = 'five-band-peq-marker';
      marker.textContent = i + 1;

      const markerText = document.createElement('div');
      markerText.className = 'five-band-peq-marker-text';
      marker.appendChild(markerText);
      graphContainer.appendChild(marker);
      markers.push(marker);

      let isDragging = false;

      // Mouse events
      marker.addEventListener('mousedown', (e) => {
        isDragging = true;
        marker.classList.add('active');
        document.querySelector(`.five-band-peq-band[data-band="${i}"]`).classList.add('active');
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const rect = graphContainer.getBoundingClientRect();
        const margin = 20;
        let x = (e.clientX - rect.left - margin) / (rect.width - 2 * margin);
        x = Math.max(0, Math.min(1, x));
        let y = (e.clientY - rect.top - margin) / (rect.height - 2 * margin);
        y = Math.max(0, Math.min(1, y));
        const freq = Math.max(20, Math.min(20000, this.xToFreq(x * 100)));
        const gain = Math.max(-18, Math.min(18, this.yToGain(y * 100)));
        this.throttle(() => {
          this.setBand(i, freq, gain);
          this.updateMarkers();
          this.updateResponse();
        }, 17);
      });

      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          marker.classList.remove('active');
          document.querySelector(`.five-band-peq-band[data-band="${i}"]`).classList.remove('active');
        }
      });

      // Touch events
      marker.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const rect = graphContainer.getBoundingClientRect();
        const margin = 20;
        let x = (touch.clientX - rect.left - margin) / (rect.width - 2 * margin);
        x = Math.max(0, Math.min(1, x));
        let y = (touch.clientY - rect.top - margin) / (rect.height - 2 * margin);
        y = Math.max(0, Math.min(1, y));
        const freq = Math.max(20, Math.min(20000, this.xToFreq(x * 100)));
        const gain = Math.max(-18, Math.min(18, this.yToGain(y * 100)));
        isDragging = true;
        marker.classList.add('active');
        document.querySelector(`.five-band-peq-band[data-band="${i}"]`).classList.add('active');
        this.setBand(i, freq, gain);
        this.updateMarkers();
        this.updateResponse();
        e.preventDefault();
      });

      marker.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        const rect = graphContainer.getBoundingClientRect();
        const margin = 20;
        let x = (touch.clientX - rect.left - margin) / (rect.width - 2 * margin);
        x = Math.max(0, Math.min(1, x));
        let y = (touch.clientY - rect.top - margin) / (rect.height - 2 * margin);
        y = Math.max(0, Math.min(1, y));
        const freq = Math.max(20, Math.min(20000, this.xToFreq(x * 100)));
        const gain = Math.max(-18, Math.min(18, this.yToGain(y * 100)));
        this.throttle(() => {
          this.setBand(i, freq, gain);
          this.updateMarkers();
          this.updateResponse();
        }, 17);
      });

      marker.addEventListener('touchend', () => {
        if (isDragging) {
          isDragging = false;
          marker.classList.remove('active');
          document.querySelector(`.five-band-peq-band[data-band="${i}"]`).classList.remove('active');
        }
      });

      marker.addEventListener('touchcancel', () => {
        if (isDragging) {
          isDragging = false;
          marker.classList.remove('active');
          document.querySelector(`.five-band-peq-band[data-band="${i}"]`).classList.remove('active');
        }
      });

      // Right-click to reset gain
      marker.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.setBand(i, undefined, 0);
        this.updateMarkers();
        this.updateResponse();
      });
    }

    // Controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'five-band-peq-controls';

    // Generate controls for each band
    for (let i = 0; i < 5; i++) {
      const bandControls = document.createElement('div');
      bandControls.className = 'five-band-peq-band';
      bandControls.dataset.band = i;

      const label = document.createElement('div');
      label.className = 'five-band-peq-band-label';
      label.textContent = `Band ${i + 1}`;

      const typeRow = document.createElement('div');
      typeRow.className = 'five-band-peq-type-row';

      const typeLabel = document.createElement('div');
      typeLabel.className = 'five-band-peq-type-label';
      typeLabel.textContent = 'Type:';

      const typeSelect = document.createElement('select');
      typeSelect.className = 'five-band-peq-filter-type';
      FiveBandPEQPlugin.FILTER_TYPES.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        typeSelect.appendChild(option);
      });
      typeSelect.value = this['t' + i];

      const qRow = document.createElement('div');
      qRow.className = 'five-band-peq-q-row';

      const qLabel = document.createElement('div');
      qLabel.className = 'five-band-peq-q-label';
      qLabel.textContent = 'Q:';

      const qSlider = document.createElement('input');
      qSlider.type = 'range';
      qSlider.className = 'five-band-peq-q-slider';
      qSlider.min = 0.1;
      qSlider.max = 10;
      qSlider.step = 0.1;
      qSlider.value = this['q' + i];

      const qText = document.createElement('input');
      qText.type = 'number';
      qText.className = 'five-band-peq-q-text';
      qText.min = 0.1;
      qText.max = 10;
      qText.step = 0.1;
      qText.value = this['q' + i];

      const updateQControlsState = (type) => {
        const isShelvingFilter = type === 'ls' || type === 'hs';
        qSlider.disabled = isShelvingFilter;
        qText.disabled = isShelvingFilter;
        if (isShelvingFilter) {
          qSlider.value = 0.7;
          qText.value = 0.7;
        }
      };

      updateQControlsState(this['t' + i]);

      typeSelect.addEventListener('change', () => {
        this.setBand(i, undefined, undefined, undefined, typeSelect.value);
        updateQControlsState(typeSelect.value);
        this.updateResponse();
      });

      const updateQ = (value) => {
        const q = Math.max(0.1, Math.min(10, value));
        qSlider.value = q;
        qText.value = q;
        this.setBand(i, undefined, undefined, q);
        this.updateResponse();
      };

      qSlider.addEventListener('input', () => updateQ(parseFloat(qSlider.value)));
      qText.addEventListener('input', () => updateQ(parseFloat(qText.value)));

      typeRow.appendChild(typeLabel);
      typeRow.appendChild(typeSelect);
      qRow.appendChild(qLabel);
      qRow.appendChild(qSlider);
      qRow.appendChild(qText);

      bandControls.appendChild(label);
      bandControls.appendChild(typeRow);
      bandControls.appendChild(qRow);
      controlsContainer.appendChild(bandControls);
    }

    container.appendChild(graphContainer);
    container.appendChild(controlsContainer);

    this.graphContainer = graphContainer;
    this.responseSvg = responseSvg;
    this.markers = markers;

    setTimeout(() => {
      this.updateMarkers();
      this.updateResponse();
    }, 0);

    return container;
  }

  // Convert frequency to x-coordinate (percentage) and vice versa
  freqToX(freq) {
    return (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * 100;
  }
  xToFreq(x) {
    return Math.pow(10, Math.log10(20) + (x / 100) * (Math.log10(20000) - Math.log10(20)));
  }

  // Convert gain to y-coordinate (percentage) and vice versa
  gainToY(gain) {
    return 50 - (gain / 18) * 50;
  }
  yToGain(y) {
    return -(y - 50) / 50 * 18;
  }

  // Update marker positions and text
  updateMarkers() {
    for (let i = 0; i < 5; i++) {
      const marker = this.markers[i];
      const freq = this['f' + i];
      const gain = this['g' + i];
      const x = this.freqToX(freq);
      const y = this.gainToY(gain);
      const margin = 20;
      const xPos = (x / 100) * (this.graphContainer.clientWidth - 2 * margin) + margin;
      const yPos = (y / 100) * (this.graphContainer.clientHeight - 2 * margin) + margin;
      marker.style.left = `${xPos}px`;
      marker.style.top = `${yPos}px`;
      const markerText = marker.querySelector('.five-band-peq-marker-text');
      const centerX = this.graphContainer.clientWidth / 2;
      const isLeft = xPos < centerX;
      markerText.className = `five-band-peq-marker-text ${isLeft ? 'left' : 'right'}`;
      const freqText = freq >= 1000 ? `${(freq/1000).toFixed(2)}k` : freq.toFixed(0);
      markerText.innerHTML = `${freqText}Hz<br>${gain.toFixed(1)}dB`;
    }
  }

  // Frequency response calculation (same logic as the processor)
  calculateBandResponse(freq, bandFreq, bandGain, bandQ, bandType) {
    const sampleRate = this._sampleRate || 48000;
    const w0 = 2 * Math.PI * bandFreq / sampleRate;
    const w = 2 * Math.PI * freq / sampleRate;
    const Q = (bandType === 'ls' || bandType === 'hs') ? 0.7 : bandQ;
    let alpha = Math.sin(w0) / (2 * Q);
    const cosw0 = Math.cos(w0);
    const A = Math.pow(10, bandGain / 40);
    let b0, b1, b2, a0, a1, a2;
    
    switch (bandType) {
      case 'pk': {
        if (Math.abs(bandGain) < 1e-3) {
          b0 = 1; b1 = 0; b2 = 0; a0 = 1; a1 = 0; a2 = 0;
        } else {
          const alpha_A = alpha * A;
          const alpha_div_A = alpha / A;
          b0 = 1 + alpha_A;
          b1 = -2 * cosw0;
          b2 = 1 - alpha_A;
          a0 = 1 + alpha_div_A;
          a1 = -2 * cosw0;
          a2 = 1 - alpha_div_A;
        }
        break;
      }
      case 'lp': {
        b0 = (1 - cosw0) / 2;
        b1 = 1 - cosw0;
        b2 = (1 - cosw0) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosw0;
        a2 = 1 - alpha;
        break;
      }
      case 'hp': {
        b0 = (1 + cosw0) / 2;
        b1 = -(1 + cosw0);
        b2 = (1 + cosw0) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosw0;
        a2 = 1 - alpha;
        break;
      }
      case 'ls': {
        if (Math.abs(bandGain) < 1e-3) {
          b0 = 1; b1 = 0; b2 = 0; a0 = 1; a1 = 0; a2 = 0;
        } else {
          const shelfAlpha = 2 * Math.sqrt(A) * alpha;
          b0 = A * ((A + 1) - (A - 1) * cosw0 + shelfAlpha);
          b1 = 2 * A * ((A - 1) - (A + 1) * cosw0);
          b2 = A * ((A + 1) - (A - 1) * cosw0 - shelfAlpha);
          a0 = (A + 1) + (A - 1) * cosw0 + shelfAlpha;
          a1 = -2 * ((A - 1) + (A + 1) * cosw0);
          a2 = (A + 1) + (A - 1) * cosw0 - shelfAlpha;
        }
        break;
      }
      case 'hs': {
        if (Math.abs(bandGain) < 1e-3) {
          b0 = 1; b1 = 0; b2 = 0; a0 = 1; a1 = 0; a2 = 0;
        } else {
          const shelfAlpha = 2 * Math.sqrt(A) * alpha;
          b0 = A * ((A + 1) + (A - 1) * cosw0 + shelfAlpha);
          b1 = -2 * A * ((A - 1) + (A + 1) * cosw0);
          b2 = A * ((A + 1) + (A - 1) * cosw0 - shelfAlpha);
          a0 = (A + 1) - (A - 1) * cosw0 + shelfAlpha;
          a1 = 2 * ((A - 1) - (A + 1) * cosw0);
          a2 = (A + 1) - (A - 1) * cosw0 - shelfAlpha;
        }
        break;
      }
      case 'bp': {
        b0 = alpha;
        b1 = 0;
        b2 = -alpha;
        a0 = 1 + alpha;
        a1 = -2 * cosw0;
        a2 = 1 - alpha;
        break;
      }
      default:
        return 0;
    }
    
    // Evaluate the response on the unit circle using z-transform
    const cosw = Math.cos(w);
    const sinw = Math.sin(w);
    const z1_re = cosw;
    const z1_im = -sinw;
    const z2_re = cosw * cosw - sinw * sinw;
    const z2_im = -2 * cosw * sinw;
    const num_re = b0 + b1 * z1_re + b2 * z2_re;
    const num_im = b1 * z1_im + b2 * z2_im;
    const den_re = a0 + a1 * z1_re + a2 * z2_re;
    const den_im = a1 * z1_im + a2 * z2_im;
    const den_mag_sq = den_re * den_re + den_im * den_im;
    const H_re = (num_re * den_re + num_im * den_im) / den_mag_sq;
    const H_im = (num_im * den_re - num_re * den_im) / den_mag_sq;
    
    return 20 * Math.log10(Math.sqrt(H_re * H_re + H_im * H_im));
  }

  // Update frequency response curve
  updateResponse() {
    const width = this.responseSvg.clientWidth;
    const height = this.responseSvg.clientHeight;
    const sampleRate = this._sampleRate || 48000;
    const freqPoints = [];
    const numPoints = 500;
    const minFreq = 20;
    const maxFreq = 20000;
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const freq = minFreq * Math.pow(maxFreq / minFreq, t);
      freqPoints.push(freq);
    }
    
    const responsePoints = freqPoints.map(freq => {
      let totalResponse = 0;
      for (let band = 0; band < 5; band++) {
        const bandFreq = this['f' + band];
        const bandGain = this['g' + band];
        const bandQ = this['q' + band];
        const bandType = this['t' + band];
        if ((bandType === 'pk' || bandType === 'ls' || bandType === 'hs') && Math.abs(bandGain) < 1e-3) {
          continue;
        }
        totalResponse += this.calculateBandResponse(freq, bandFreq, bandGain, bandQ, bandType);
      }
      return totalResponse;
    });
    
    const points = [];
    for (let i = 0; i < freqPoints.length; i++) {
      const x = (Math.log10(freqPoints[i]) - Math.log10(minFreq)) / (Math.log10(maxFreq) - Math.log10(minFreq)) * width;
      const y = this.gainToY(responsePoints[i]) * height / 100;
      points.push(i === 0 ? `M ${x},${y}` : `L ${x},${y}`);
    }
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', points.join(' '));
    path.setAttribute('stroke', '#00ff00');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    
    while (this.responseSvg.firstChild) {
      this.responseSvg.removeChild(this.responseSvg.firstChild);
    }
    this.responseSvg.appendChild(path);
  }
}

// If in a browser environment, register globally
if (typeof window !== 'undefined') {
  window.FiveBandPEQPlugin = FiveBandPEQPlugin;
}
