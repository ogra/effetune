class FiveBandPEQPlugin extends PluginBase {
  // Initial band frequencies (approximately logarithmically spaced)
  static BANDS = [
    { freq: 100, name: '100 Hz' },
    { freq: 316, name: '316 Hz' },
    { freq: 1000, name: '1.0 kHz' },
    { freq: 3160, name: '3.16 kHz' },
    { freq: 10000, name: '10 kHz' }
  ];

  // Filter types
  static FILTER_TYPES = [
    { id: 'pk', name: 'Peaking' },
    { id: 'lp', name: 'LowPass' },
    { id: 'hp', name: 'HighPass' },
    { id: 'ls', name: 'LowShelv' },
    { id: 'hs', name: 'HighShel' },
    { id: 'bp', name: 'BandPass' },
    { id: 'no', name: 'Notch' },
    { id: 'ap', name: 'AllPass' }
  ];

  // AudioWorklet processor function (internal processing)
  static processorFunction = `
  // --- Constants ---
  const BYPASS_THRESHOLD = 0.01; // Gain values (absolute) below this are treated as zero for bypass
  const A0_THRESHOLD = 1e-8;      // Minimum absolute value for a0 to prevent division by near-zero
  const PI = 3.141592653589793;
  const TWO_PI = 6.283185307179586;
  // Q value for shelf filters, approximately 1/sqrt(2) for Butterworth response
  const SHELF_Q = 0.7071067811865476;
  const NUM_BANDS = 5;             // Number of EQ bands
  
  // --- Early Exit ---
  // Return data unchanged if the plugin is globally disabled
  if (!parameters.enabled) return data;
  
  // --- Parameter & Context Caching ---
  const { channelCount, blockSize, sampleRate } = parameters;
  // Pre-calculate constants used frequently in coefficient calculation
  const sampleRateInv = 1.0 / sampleRate;
  const twoPiTimesSrInv = TWO_PI * sampleRateInv; // 2*PI / sampleRate
  
  // --- State Initialization & Management ---
  // Initialize filter states (delay lines) if not already done or if channel count changes.
  if (!context.initialized || context.lastChannelCount !== channelCount) {
      context.filterStates = new Array(NUM_BANDS);
      for (let i = 0; i < NUM_BANDS; i++) {
          // Each band needs state for each channel (x[n-1], x[n-2], y[n-1], y[n-2])
          context.filterStates[i] = {
              x1: new Array(channelCount).fill(0.0),
              x2: new Array(channelCount).fill(0.0),
              y1: new Array(channelCount).fill(0.0),
              y2: new Array(channelCount).fill(0.0)
          };
      }
      context.lastChannelCount = channelCount;
      context.initialized = true;
      context.lastParams = null; // Force coefficient recalculation
  }
  
  // Cache filter states reference for quicker access
  const filterStates = context.filterStates;
  
  // --- Parameter Change Detection & Coefficient Caching ---
  // Create a string representation of parameters to efficiently check for changes.
  // Coefficients are only recalculated if any relevant parameter has changed.
  let currentParamsString = '';
  for (let i = 0; i < NUM_BANDS; i++) {
      currentParamsString += \`\${parameters['e' + i]},\${parameters['g' + i]},\${parameters['t' + i]},\${parameters['f' + i]},\${parameters['q' + i]};\`;
  }
  currentParamsString += parameters.ch; // Include channel setting
  
  let coeffs; // Array to hold coefficients for each band
  
  // Recalculate coefficients only if parameters have changed since last block
  if (context.lastParams !== currentParamsString) {
      coeffs = new Array(NUM_BANDS); // Holds calculated coefficients {b0, b1, b2, a1, a2} or null (bypass)
  
      for (let bandIndex = 0; bandIndex < NUM_BANDS; bandIndex++) {
          const bandEnabled = parameters['e' + bandIndex];
          const gainDb = parameters['g' + bandIndex];
          const type = parameters['t' + bandIndex];
          const freq = parameters['f' + bandIndex];
          const isShelf = type === 'ls' || type === 'hs';
          // Use fixed Q for shelves, parameter Q for others
          const Q = isShelf ? SHELF_Q : parameters['q' + bandIndex];
  
          // Determine if this band should be bypassed (computationally skipped)
          const gainAbs = gainDb < 0 ? -gainDb : gainDb; // Optimized Math.abs
          // Bypass if disabled OR if gain is negligible (except for LP/HP/BP which always filter)
          // Bypass if disabled OR if gain is negligible (except for LP/HP/BP/Notch/Allpass which always filter)
          const isGainBypassed = gainAbs < BYPASS_THRESHOLD && type !== 'lp' && type !== 'hp' && type !== 'bp' && type !== 'no' && type !== 'ap';
  
          if (!bandEnabled || isGainBypassed) {
              coeffs[bandIndex] = null; // Mark band for bypass in processing loop
              continue; // Skip coefficient calculation for this band
          }
  
          // --- Calculate Filter Coefficients (Active Band) ---
          // Gain factor A = 10^(dB/40)
          const A = Math.pow(10, 0.025 * gainDb);
          // Angular frequency w0 = 2*PI*freq/sampleRate
          const w0 = freq * twoPiTimesSrInv;
          // Clamp w0 to prevent instability near 0Hz or Nyquist frequency
          const clampedW0 = w0 < 1e-6 ? 1e-6 : (w0 > PI - 1e-6 ? PI - 1e-6 : w0);
          const cosw0 = Math.cos(clampedW0);
          const sinw0 = Math.sin(clampedW0);
          // Intermediate variable alpha = sin(w0)/(2*Q) (Ensure Q > 0)
          const alpha = sinw0 / (2.0 * (Q < 1e-6 ? 1e-6 : Q)); // Avoid division by zero/negative Q
  
          let b0 = 0.0, b1 = 0.0, b2 = 0.0, a0 = 1.0, a1 = 0.0, a2 = 0.0;
  
          switch (type) {
              case 'pk': { // Peaking EQ
                  const alphaMulA = alpha * A;
                  const alphaDivA = alpha / A;
                  const neg2CosW0 = -2.0 * cosw0;
                  b0 = 1.0 + alphaMulA;
                  b1 = neg2CosW0;
                  b2 = 1.0 - alphaMulA;
                  a0 = 1.0 + alphaDivA;
                  a1 = neg2CosW0;
                  a2 = 1.0 - alphaDivA;
                  break;
              }
              case 'lp': { // Low Pass
                  const oneMinusCosW0 = 1.0 - cosw0;
                  const neg2CosW0 = -2.0 * cosw0;
                  b0 = oneMinusCosW0 * 0.5;
                  b1 = oneMinusCosW0; // 2 * b0
                  b2 = b0;
                  a0 = 1.0 + alpha;
                  a1 = neg2CosW0;
                  a2 = 1.0 - alpha;
                  break;
              }
              case 'hp': { // High Pass
                  const onePlusCosW0 = 1.0 + cosw0;
                  const neg2CosW0 = -2.0 * cosw0;
                  b0 = onePlusCosW0 * 0.5;
                  b1 = -onePlusCosW0; // -2 * b0
                  b2 = b0;
                  a0 = 1.0 + alpha;
                  a1 = neg2CosW0;
                  a2 = 1.0 - alpha;
                  break;
              }
              case 'ls': { // Low Shelf
                  // Use pre-calculated sqrt(A) only once
                  const sqrtA = Math.sqrt(A < 0 ? 0 : A); // Ensure A is non-negative for sqrt
                  const twoSqrtAalpha = 2.0 * sqrtA * alpha;
                  const A_plus_1 = A + 1.0;
                  const A_minus_1 = A - 1.0;
                  const commonTerm1 = A_plus_1 - A_minus_1 * cosw0;
                  const commonTerm2 = A_plus_1 + A_minus_1 * cosw0;
                  const minus_2_CosW0_Term = -2.0 * (A_minus_1 + A_plus_1 * cosw0);
  
                  b0 = A * (commonTerm1 + twoSqrtAalpha);
                  b1 = 2.0 * A * (A_minus_1 - A_plus_1 * cosw0); // Can keep original form
                  b2 = A * (commonTerm1 - twoSqrtAalpha);
                  a0 = commonTerm2 + twoSqrtAalpha;
                  a1 = minus_2_CosW0_Term;
                  a2 = commonTerm2 - twoSqrtAalpha;
                  break;
              }
              case 'hs': { // High Shelf
                  const sqrtA = Math.sqrt(A < 0 ? 0 : A);
                  const twoSqrtAalpha = 2.0 * sqrtA * alpha;
                  const A_plus_1 = A + 1.0;
                  const A_minus_1 = A - 1.0;
                  const commonTerm1 = A_plus_1 + A_minus_1 * cosw0;
                  const commonTerm2 = A_plus_1 - A_minus_1 * cosw0;
                  const two_CosW0_Term = 2.0 * (A_minus_1 - A_plus_1 * cosw0);
  
                  b0 = A * (commonTerm1 + twoSqrtAalpha);
                  b1 = -2.0 * A * (A_minus_1 + A_plus_1 * cosw0); // Can keep original form
                  b2 = A * (commonTerm1 - twoSqrtAalpha);
                  a0 = commonTerm2 + twoSqrtAalpha;
                  a1 = two_CosW0_Term;
                  a2 = commonTerm2 - twoSqrtAalpha;
                  break;
              }
              case 'bp': { // Band Pass (Constant 0dB peak gain)
                  const neg2CosW0 = -2.0 * cosw0;
                  b0 = alpha; // Using Q-dependent alpha for bandwidth
                  b1 = 0.0;
                  b2 = -alpha;
                  a0 = 1.0 + alpha;
                  a1 = neg2CosW0;
                  a2 = 1.0 - alpha;
                  break;
              }
              case 'no': { // Notch Filter
                  const neg2CosW0 = -2.0 * cosw0;
                  b0 = 1.0;
                  b1 = neg2CosW0;
                  b2 = 1.0;
                  a0 = 1.0 + alpha;
                  a1 = neg2CosW0;
                  a2 = 1.0 - alpha;
                  break;
              }
              case 'ap': { // Allpass Filter
                  const neg2CosW0 = -2.0 * cosw0;
                  b0 = 1.0 - alpha;
                  b1 = neg2CosW0;
                  b2 = 1.0 + alpha;
                  a0 = 1.0 + alpha;
                  a1 = neg2CosW0;
                  a2 = 1.0 - alpha;
                  break;
              }
              default: { // Unknown type - treat as bypass
                  coeffs[bandIndex] = null;
                  continue; // Skip normalization
              }
          }
  
          // --- Normalize Coefficients ---
          // Normalize by a0 to get the standard IIR difference equation form.
          // Check a0 magnitude to prevent division by zero or very small numbers.
          const a0_abs = a0 < 0 ? -a0 : a0; // Optimized Math.abs
          if (a0_abs < A0_THRESHOLD) {
               // Filter is potentially unstable or identity; bypass to be safe.
               coeffs[bandIndex] = null;
          } else {
              // Use multiplication by inverse for performance.
              const invA0 = 1.0 / a0;
              coeffs[bandIndex] = {
                  b0: b0 * invA0,
                  b1: b1 * invA0,
                  b2: b2 * invA0,
                  // Store negated and normalized a1, a2 according to the typical
                  // difference equation y[n] = b0x[n] + ... - a1y[n-1] - a2y[n-2]
                  // where the stored a1, a2 already include the negation.
                  a1: a1 * invA0,
                  a2: a2 * invA0
              };
          }
      } // End loop over bands for coefficient calculation
  
      // Cache the newly calculated coefficients and the parameter string that generated them
      context.coeffs = coeffs;
      context.lastParams = currentParamsString;
  } else {
      // Parameters haven't changed, reuse cached coefficients
      coeffs = context.coeffs;
  }
  
  // --- Audio Processing ---
  
  // Loop through each channel
  for (let ch = 0; ch < channelCount; ch++) {
      // --- Process Samples Block for the Current Channel ---
      const offset = ch * blockSize; // Starting index for this channel's data in the buffer
  
      // Apply each filter band sequentially to the current channel's data
      for (let bandIndex = 0; bandIndex < NUM_BANDS; bandIndex++) {
          const bandCoeffs = coeffs[bandIndex];
  
          // Skip this band if it's marked for bypass (null coefficients)
          if (bandCoeffs === null) {
              continue;
          }
  
          // Cache coefficients and state reference for the inner sample loop
          const b0 = bandCoeffs.b0; const b1 = bandCoeffs.b1; const b2 = bandCoeffs.b2;
          const a1 = bandCoeffs.a1; const a2 = bandCoeffs.a2; // Note: these are pre-normalized a1/a0, a2/a0
          const state = filterStates[bandIndex];
  
          // Cache direct references to state arrays for *this channel* for faster access
          const state_x1 = state.x1; const state_x2 = state.x2;
          const state_y1 = state.y1; const state_y2 = state.y2;
  
          // Load last state values specific to this channel before processing block
          let x1 = state_x1[ch]; let x2 = state_x2[ch];
          let y1 = state_y1[ch]; let y2 = state_y2[ch];
  
          // Process each sample in the block for the current band and channel
          // This is the most critical loop for performance.
          for (let i = 0; i < blockSize; i++) {
              const dataIndex = offset + i;
              const x_n = data[dataIndex]; // Current input sample
  
              // Apply the 2nd order IIR difference equation (Direct Form I)
              // y[n] = (b0*x[n] + b1*x[n-1] + b2*x[n-2]) - (a1*y[n-1] + a2*y[n-2])
              // Note the signs of a1, a2 here match the standard DSP literature form
              // where the coefficients stored are already normalized (a1/a0, a2/a0).
              const y_n = b0 * x_n + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
  
              // Update state variables for the next iteration *for this channel*
              x2 = x1; x1 = x_n;
              y2 = y1; y1 = y_n;
  
              // Write the processed sample back to the buffer.
              // This output becomes the input for the next filter band.
              data[dataIndex] = y_n;
          }
          // Store the final state values for this channel back into the context arrays
          state_x1[ch] = x1; state_x2[ch] = x2;
          state_y1[ch] = y1; state_y2[ch] = y2;
      } // End loop over bands
  } // End loop over channels
  
  return data; // Return the modified buffer
  `;
    
  constructor() {
    super('5Band PEQ', '5-band parametric equalizer');

    // Internal sample rate (default 96000Hz)
    this._sampleRate = 96000;

    // Handle messages from processor
    this.onMessage = (message) => {
      if (message.sampleRate !== undefined && message.sampleRate !== this._sampleRate) {
        this._sampleRate = message.sampleRate;
        if (this.responseSvg) {
          this.updateResponse();
        }
      }
    };

    // Initialize band parameters
    for (let i = 0; i < 5; i++) {
      this['f' + i] = FiveBandPEQPlugin.BANDS[i].freq;
      this['g' + i] = 0;      // Gain: -18dB to +18dB
      this['q' + i] = 1.0;    // Q: 0.1 to 10.0
      this['t' + i] = 'pk';   // Filter type: default is peaking
      this['e' + i] = true;   // Enabled: default is ON
    }

    // Store references to band checkboxes
    this.bandCheckboxes = [];

    // Initialize channel parameter
    this.ch = 'All';  // 'All', 'Left', or 'Right'

    // Register the processor function immediately
    this.registerProcessor(FiveBandPEQPlugin.processorFunction);
  }

  // Set band parameters and update immediately
  setBand(index, freq, gain, Q, type, enabled) {
    if (freq !== undefined) this['f' + index] = freq;
    if (gain !== undefined) {
      this['g' + index] = gain < -18 ? -18 : (gain > 18 ? 18 : gain);
    }
    if (Q !== undefined) {
      this['q' + index] = Q < 0.1 ? 0.1 : (Q > 10 ? 10 : Q);
    }
    if (type !== undefined) {
      this['t' + index] = type;
      if (type === 'ls' || type === 'hs') {
        this['q' + index] = 0.7;
      }
    }
    if (enabled !== undefined) this['e' + index] = enabled;
    // Immediately update parameters
    this.updateParameters();
  }

  // Toggle band enabled state
  toggleBandEnabled(index) {
    this['e' + index] = !this['e' + index];
    
    // Update checkbox state if it exists
    if (this.bandCheckboxes[index]) {
      this.bandCheckboxes[index].checked = this['e' + index];
    }
    
    this.updateParameters();
    if (this.responseSvg) {
      this.updateResponse();
    }
    if (this.markers) {
      this.updateMarkers();
    }
  }

  // Reset all bands to initial values
  reset() {
    this.bands.forEach((band, index) => {
      this.setBand(index, FiveBandPEQPlugin.BANDS[index].freq, 0.0, 1.41, 'pk', true);
    });
    this.enabled = true;
    this.updateParameters();
    this.setUIValues();
  }

  getParameters() {
      const params = {
          type: this.constructor.name,
          enabled: this.enabled,
      };
      for (let i = 0; i < 5; i++) {
          params['f' + i] = this['f' + i];
          params['g' + i] = this['g' + i];
          params['q' + i] = this['q' + i];
          params['t' + i] = this['t' + i];
          params['e' + i] = this['e' + i];
      }
      return params;
  }

  setParameters(params) {
      let shouldUpdateResponse = false;
      
      if (params.enabled !== undefined) this.enabled = params.enabled;
      if (params.sampleRate !== undefined) {
          this._sampleRate = params.sampleRate;
          shouldUpdateResponse = true;
      }
      for (let i = 0; i < 5; i++) {
          if (params['f' + i] !== undefined) {
              this['f' + i] = params['f' + i];
              shouldUpdateResponse = true;
          }
          if (params['g' + i] !== undefined) {
              this['g' + i] = params['g' + i];
              shouldUpdateResponse = true;
          }
          if (params['q' + i] !== undefined) {
              this['q' + i] = params['q' + i];
              shouldUpdateResponse = true;
          }
          if (params['t' + i] !== undefined) {
              this['t' + i] = params['t' + i];
              if (params['t' + i] === 'ls' || params['t' + i] === 'hs') {
                  this['q' + i] = 0.7;
              }
              shouldUpdateResponse = true;
          }
          if (params['e' + i] !== undefined) {
              this['e' + i] = params['e' + i];
              shouldUpdateResponse = true;
          }
      }
      
      this.updateParameters();
      
      // Update response curve if any frequency-related parameters changed
      if (shouldUpdateResponse && this.responseSvg) {
          this.updateResponse();
      }
  }

  createUI() {
    const container = document.createElement('div');
    container.className = 'five-band-peq-plugin-ui plugin-parameter-ui';

    // Graph container
    const graphContainer = document.createElement('div');
    graphContainer.className = 'five-band-peq-graph';

    // SVG for frequency grid
    const gridSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    gridSvg.setAttribute('class', 'five-band-peq-grid');
    gridSvg.setAttribute('width', '100%');
    gridSvg.setAttribute('height', '100%');

    const freqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
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
        // Directly update parameters without throttling
        this.setBand(i, freq, gain);
        this.updateMarkers();
        this.updateResponse();
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
        // Direct update without throttling
        this.setBand(i, freq, gain);
        this.updateMarkers();
        this.updateResponse();
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

      // Right-click to toggle band enabled state
      marker.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.toggleBandEnabled(i);
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

      const labelContainer = document.createElement('label');
      labelContainer.className = 'five-band-peq-band-label';
      
      // Create checkbox for band enable/disable
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'five-band-peq-band-checkbox';
      checkbox.checked = this['e' + i];
      checkbox.autocomplete = "off";
      
      // Store reference to checkbox
      this.bandCheckboxes[i] = checkbox;
      
      checkbox.addEventListener('change', () => {
        this['e' + i] = checkbox.checked;
        this.updateParameters();
        this.updateMarkers();
        this.updateResponse();
      });
      
      labelContainer.appendChild(checkbox);
      labelContainer.appendChild(document.createTextNode(`Band ${i + 1}`));

      const typeRow = document.createElement('div');
      typeRow.className = 'five-band-peq-type-row';

      const typeSelectId = `${this.id}-${this.name}-band${i}-type`;
      
      const typeLabel = document.createElement('label');
      typeLabel.className = 'five-band-peq-type-label';
      typeLabel.textContent = 'Type:';
      typeLabel.htmlFor = typeSelectId;

      const typeSelect = document.createElement('select');
      typeSelect.className = 'five-band-peq-filter-type';
      typeSelect.id = typeSelectId;
      typeSelect.name = typeSelectId;
      typeSelect.autocomplete = "off";
      FiveBandPEQPlugin.FILTER_TYPES.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        typeSelect.appendChild(option);
      });
      typeSelect.value = this['t' + i];

      const qRow = document.createElement('div');
      qRow.className = 'five-band-peq-q-row';

      const qSliderId = `${this.id}-${this.name}-band${i}-q-slider`;
      const qTextId = `${this.id}-${this.name}-band${i}-q-text`;
      
      const qLabel = document.createElement('label');
      qLabel.className = 'five-band-peq-q-label';
      qLabel.textContent = 'Q:';
      qLabel.htmlFor = qSliderId;

      const qSlider = document.createElement('input');
      qSlider.type = 'range';
      qSlider.className = 'five-band-peq-q-slider';
      qSlider.id = qSliderId;
      qSlider.name = qSliderId;
      qSlider.min = 0.1;
      qSlider.max = 10;
      qSlider.step = 0.1;
      qSlider.value = this['q' + i];
      qSlider.autocomplete = "off";

      const qText = document.createElement('input');
      qText.type = 'number';
      qText.className = 'five-band-peq-q-text';
      qText.id = qTextId;
      qText.name = qTextId;
      qText.min = 0.1;
      qText.max = 10;
      qText.step = 0.1;
      qText.value = this['q' + i];
      qText.autocomplete = "off";

      const updateQControlsState = (type) => {
        // Q is fixed for LS, HS
        const isQShelving = type === 'ls' || type === 'hs';
        const isQUserSettable = !isQShelving;

        qSlider.disabled = !isQUserSettable;
        qText.disabled = !isQUserSettable;

        if (isQShelving) {
          // Set fixed Q for shelving
          qSlider.value = 0.7;
          qText.value = 0.7;
          // Update the plugin state as well, as this is fixed
          this.setBand(i, undefined, undefined, 0.7);
        }
        // For user-settable Q, controls are enabled, values remain as they are
      };

      updateQControlsState(this['t' + i]);

      typeSelect.addEventListener('change', () => {
        this.setBand(i, undefined, undefined, undefined, typeSelect.value);
        updateQControlsState(typeSelect.value);
        this.updateResponse();
        this.updateMarkers();
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

      bandControls.appendChild(labelContainer);
      bandControls.appendChild(typeRow);
      bandControls.appendChild(qRow);
      controlsContainer.appendChild(bandControls);
    }

    container.appendChild(graphContainer);
    container.appendChild(controlsContainer);

    this.graphContainer = graphContainer;
    this.responseSvg = responseSvg;
    this.markers = markers;

    // Update markers and response immediately after UI creation
    setTimeout(() => {
      this.updateMarkers();
      this.updateResponse();
    }, 0);

    return container;
  }

  // Convert frequency to x-coordinate (percentage) and vice versa
  freqToX(freq) {
    return (Math.log10(freq) - Math.log10(10)) / (Math.log10(40000) - Math.log10(10)) * 100;
  }
  xToFreq(x) {
    return Math.pow(10, Math.log10(10) + (x / 100) * (Math.log10(40000) - Math.log10(10)));
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
      const enabled = this['e' + i];
      const x = this.freqToX(freq);
      const y = this.gainToY(gain);
      const margin = 20;
      const xPos = (x / 100) * (this.graphContainer.clientWidth - 2 * margin) + margin;
      const yPos = (y / 100) * (this.graphContainer.clientHeight - 2 * margin) + margin;
      marker.style.left = `${xPos}px`;
      marker.style.top = `${yPos}px`;
      
      // Update marker appearance based on enabled state
      if (enabled) {
        marker.classList.remove('disabled');
      } else {
        marker.classList.add('disabled');
      }
      
      const markerText = marker.querySelector('.five-band-peq-marker-text');
      const centerX = this.graphContainer.clientWidth / 2;
      const isLeft = xPos < centerX;
      markerText.className = `five-band-peq-marker-text ${isLeft ? 'left' : 'right'}`;
      const freqText = freq >= 1000 ? `${(freq/1000).toFixed(2)}k` : freq.toFixed(0);
      const type = this['t' + i];
      markerText.innerHTML = `${freqText}Hz${type === 'lp' || type === 'hp' || type === 'bp' || type === 'ap' || type === 'no' ? '' : `<br>${gain.toFixed(1)}dB`}`;
    }
  }

  // Frequency response calculation (same logic as the processor)
  calculateBandResponse(freq, bandFreq, bandGain, bandQ, bandType) {
    const sampleRate = this._sampleRate || 96000;
    const w0 = 2 * Math.PI * bandFreq / sampleRate;
    const w = 2 * Math.PI * freq / sampleRate;
    const Q = (bandType === 'ls' || bandType === 'hs') ? 0.7 : bandQ;
    let alpha = Math.sin(w0) / (2 * Q);
    const cosw0 = Math.cos(w0);
    const A = Math.pow(10, bandGain / 40);
    let b0, b1, b2, a0, a1, a2;
    
    // Bypass check: Gain near zero AND not a filter type that inherently shapes frequency (LP, HP, BP, Notch, Allpass)
    if ((bandGain >= 0 ? bandGain : -bandGain) < 0.01 && !['lp', 'hp', 'bp', 'no'].includes(bandType)) {
      // Bypass if gain is nearly zero and not a pass filter
      b0 = 1; b1 = 0; b2 = 0; a0 = 1; a1 = 0; a2 = 0;
    } else {
      switch (bandType) {
        case 'pk': {
          const alpha_A = alpha * A;
          const alpha_div_A = alpha / A;
          b0 = 1 + alpha_A;
          b1 = -2 * cosw0;
          b2 = 1 - alpha_A;
          a0 = 1 + alpha_div_A;
          a1 = -2 * cosw0;
          a2 = 1 - alpha_div_A;
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
          const shelfAlpha = 2 * Math.sqrt(A) * alpha;
          b0 = A * ((A + 1) - (A - 1) * cosw0 + shelfAlpha);
          b1 = 2 * A * ((A - 1) - (A + 1) * cosw0);
          b2 = A * ((A + 1) - (A - 1) * cosw0 - shelfAlpha);
          a0 = (A + 1) + (A - 1) * cosw0 + shelfAlpha;
          a1 = -2 * ((A - 1) + (A + 1) * cosw0);
          a2 = (A + 1) + (A - 1) * cosw0 - shelfAlpha;
          break;
        }
        case 'hs': {
          const shelfAlpha = 2 * Math.sqrt(A) * alpha;
          b0 = A * ((A + 1) + (A - 1) * cosw0 + shelfAlpha);
          b1 = -2 * A * ((A - 1) + (A + 1) * cosw0);
          b2 = A * ((A + 1) + (A - 1) * cosw0 - shelfAlpha);
          a0 = (A + 1) - (A - 1) * cosw0 + shelfAlpha;
          a1 = 2 * ((A - 1) - (A + 1) * cosw0); // Corrected sign from processor
          a2 = (A + 1) - (A - 1) * cosw0 - shelfAlpha;
          break;
        }
        case 'bp': { // Band Pass (Constant 0dB peak gain)
          b0 = alpha;
          b1 = 0;
          b2 = -alpha;
          a0 = 1 + alpha;
          a1 = -2 * cosw0;
          a2 = 1 - alpha;
          break;
        }
        case 'no': { // Notch Filter
          console.log('notch', bandGain, bandType);
          b0 = 1;
          b1 = -2 * cosw0;
          b2 = 1;
          a0 = 1 + alpha;
          a1 = -2 * cosw0;
          a2 = 1 - alpha;
          break;
        }
        case 'ap': { // Allpass Filter
          b0 = 1 - alpha;
          b1 = -2 * cosw0;
          b2 = 1 + alpha;
          a0 = 1 + alpha;
          a1 = -2 * cosw0;
          a2 = 1 - alpha;
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
    const freqPoints = [];
    const numPoints = 500;
    const minFreq = 10;
    const maxFreq = 40000;
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const freq = minFreq * Math.pow(maxFreq / minFreq, t);
      freqPoints.push(freq);
    }
    
    const responsePoints = freqPoints.map(freq => {
      let totalResponse = 0;
      for (let band = 0; band < 5; band++) {
        // Skip disabled bands
        if (!this['e' + band]) {
          continue;
        }
        
        const bandFreq = this['f' + band];
        const bandGain = this['g' + band];
        const bandQ = this['q' + band];
        const bandType = this['t' + band];
        // Skip bypassed bands (except pass filters)
        if ((bandGain >= 0 ? bandGain : -bandGain) < 0.01 && bandType !== 'lp' && bandType !== 'hp' && bandType !== 'bp'&& bandType !== 'no') {
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

// Register plugin
if (typeof window !== 'undefined') {
  window.FiveBandPEQPlugin = FiveBandPEQPlugin;
}
