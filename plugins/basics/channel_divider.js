// Channel Divider Plugin implementation
// Divides input channels into frequency bands, routing them to separate output channels.
// Reads channels 1-2, splits into 2-4 bands, routes each band to separate output channels.
class ChannelDividerPlugin extends PluginBase {
  constructor() {
    super("Channel Divider", "Split stereo signal into frequency bands and route to separate channels");

    this.bc = 2; // Band count (2, 3, or 4)
    this.f1 = 2000; // Crossover frequency 1 (Hz)
    this.s1 = -24; // Slope 1 (dB/oct)
    this.f2 = 4000; // Crossover frequency 2 (Hz)
    this.s2 = -24; // Slope 2 (dB/oct)
    this.f3 = 8000; // Crossover frequency 3 (Hz)
    this.s3 = -24; // Slope 3 (dB/oct)

    this.errorState = null;
    this.maxBands = 2; // Max bands allowed by bus config

    this.registerProcessor(`
      // Audio processing logic
      // Parameters: data, parameters, context, tools
      if (!parameters.enabled) return data;
    
      const { channelCount, blockSize, sampleRate } = parameters;
      data.measurements = { channels: channelCount };
    
      if (channelCount < 4 || channelCount % 2 !== 0) {
        return data;
      }
    
      const currentMaxBands = channelCount / 2;
      let bandCount = Math.min(parameters.bc, currentMaxBands);
      if (channelCount === 4 && bandCount > 2) bandCount = 2;
      else if (channelCount === 6 && bandCount > 3) bandCount = 3;
    
      const frequencies = [parameters.f1, parameters.f2, parameters.f3];
      // Number of biquad stages for each crossover, based on slope. Each stage is -12dB/oct.
      const biquadStagesPerCrossover = [
        Math.abs(parameters.s1) / 12,
        Math.abs(parameters.s2) / 12,
        Math.abs(parameters.s3) / 12
      ];
    
      // --- Filter State & Config Management ---
      let needsReset = !context.filterStates || !context.filterConfig ||
                       context.filterConfig.sampleRate !== sampleRate ||
                       context.filterConfig.channelCount !== channelCount ||
                       context.filterConfig.bandCount !== bandCount ||
                       context.filterConfig.frequencies[0] !== frequencies[0] ||
                       context.filterConfig.frequencies[1] !== frequencies[1] ||
                       context.filterConfig.frequencies[2] !== frequencies[2] ||
                       context.filterConfig.biquadStages[0] !== biquadStagesPerCrossover[0] ||
                       context.filterConfig.biquadStages[1] !== biquadStagesPerCrossover[1] ||
                       context.filterConfig.biquadStages[2] !== biquadStagesPerCrossover[2];
    
      if (needsReset) {
        const dcOffset = 1e-25;
    
        const createSingleBiquadStateAndInit = () => {
          const state = { x1: new Float32Array(2), x2: new Float32Array(2), y1: new Float32Array(2), y2: new Float32Array(2) };
          for (let ch = 0; ch < 2; ch++) {
            state.x1[ch] = dcOffset; state.x2[ch] = -dcOffset;
            state.y1[ch] = dcOffset; state.y2[ch] = -dcOffset;
          }
          return state;
        };
        
        const createAllBiquadStatesForOneCrossoverType = (numBiquads) => {
            const biquadStatesArray = [];
            for (let j = 0; j < numBiquads; j++) {
                biquadStatesArray.push(createSingleBiquadStateAndInit());
            }
            return biquadStatesArray;
        };
    
        context.filterStates = { lp: [], hp: [] };
        for (let i = 0; i < 3; i++) { // For f1, f2, f3 crossovers
            context.filterStates.lp.push(createAllBiquadStatesForOneCrossoverType(biquadStagesPerCrossover[i]));
            context.filterStates.hp.push(createAllBiquadStatesForOneCrossoverType(biquadStagesPerCrossover[i]));
        }
    
        context.filterConfig = {
          sampleRate, channelCount, bandCount,
          frequencies: [...frequencies],
          biquadStages: [...biquadStagesPerCrossover] // Store the number of biquads per crossover
        };
    
        context.fadeIn = {
          counter: 0,
          length: Math.min(blockSize, Math.ceil(sampleRate * 0.005))
        };
        
        // Allocate pingPongBuffer for multi-stage filtering
        // Stereo processing, so blockSize * 2
        if (!context.pingPongBuffer || context.pingPongBuffer.length !== blockSize * 2) {
            context.pingPongBuffer = new Float32Array(blockSize * 2);
        }
      }
    
      // --- Filter Coefficient Calculation ---
      // Coefficients are for a single 2-pole Butterworth section (one biquad)
      // These are cascaded 'biquadStagesPerCrossover[i]' times for the desired Linkwitz-Riley slope
      if (needsReset || !context.cachedCoeffs) {
        const SQRT2 = Math.SQRT2;
        context.cachedCoeffs = [];
        for (let i = 0; i < 3; i++) {
          if (i >= bandCount - 1) { // Only calculate for active crossovers
              context.cachedCoeffs[i] = null; // Placeholder if not active
              continue;
          }
    
          const freq = context.filterConfig.frequencies[i];
          // Clamp frequency to avoid issues with tan, e.g., freq near 0 or Nyquist
          const clampedFreq = Math.max(1.0, Math.min(freq, sampleRate * 0.499));
          const omega = Math.tan(Math.PI * clampedFreq / sampleRate);
          const omega2 = omega * omega;
          // For Linkwitz-Riley, each biquad stage is a Butterworth with Q = 1/sqrt(2)
          const norm = 1 / (omega2 + SQRT2 * omega + 1);
    
          const lp_b0 = omega2 * norm;
          const lp_b1 = 2 * lp_b0;
          const lp_b2 = lp_b0;
    
          const hp_b0 = norm;
          const hp_b1 = -2 * hp_b0;
          const hp_b2 = hp_b0;
    
          const a1 = 2 * (omega2 - 1) * norm;
          const a2 = (omega2 - SQRT2 * omega + 1) * norm;
    
          context.cachedCoeffs[i] = {
            lp: { b0: lp_b0, b1: lp_b1, b2: lp_b2, a1, a2 },
            hp: { b0: hp_b0, b1: hp_b1, b2: hp_b2, a1, a2 }
          };
        }
      }
    
      // --- Buffer Management ---
      const requiredTempBufferSize = blockSize * 2; // Stereo
      if (!context.tempBuffers || context.tempBuffers[0].length !== requiredTempBufferSize) {
        context.tempBuffers = [
          new Float32Array(requiredTempBufferSize), // inputCopy
          new Float32Array(requiredTempBufferSize), // temp1 (can be final output or intermediate)
          new Float32Array(requiredTempBufferSize)  // temp2 (can be final output or intermediate)
        ];
      }
      const [inputCopy, temp1, temp2] = context.tempBuffers;
    
      // --- Audio Processing ---
      for (let ch = 0; ch < 2; ++ch) {
        inputCopy.set(data.subarray(ch * blockSize, (ch + 1) * blockSize), ch * blockSize);
      }
      for (let ch = 0; ch < channelCount; ++ch) {
        data.fill(0, ch * blockSize, (ch + 1) * blockSize);
      }
      
      // Helper function to apply a single biquad filter stage to both L/R channels
      function applySingleBiquadStereo(inputStereoBuf, outputStereoBuf, currentBlockSize, coeffs, biquadState) {
        const { b0, b1, b2, a1, a2 } = coeffs;
        for (let ch = 0; ch < 2; ++ch) {
            let x1 = biquadState.x1[ch], x2 = biquadState.x2[ch], 
                y1 = biquadState.y1[ch], y2 = biquadState.y2[ch];
    
            const inChOffset = ch * currentBlockSize;
            const outChOffset = ch * currentBlockSize;
    
            for (let i = 0; i < currentBlockSize; ++i) {
              const sample = inputStereoBuf[inChOffset + i];
              // Denormal check / small noise add might be useful here if issues arise
              // let filteredSample = b0 * sample + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2 + Number.EPSILON;
              let filteredSample = b0 * sample + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
              x2 = x1; x1 = sample;
              y2 = y1; y1 = filteredSample;
              outputStereoBuf[outChOffset + i] = filteredSample;
            }
            biquadState.x1[ch] = x1; biquadState.x2[ch] = x2;
            biquadState.y1[ch] = y1; biquadState.y2[ch] = y2;
        }
      }
    
      // Applies 'numBiquadsToApply' cascaded biquad filters.
      // Result is in 'finalOutputStereoSignal'.
      function applyMultiBiquadFilter(inputStereoSignal, finalOutputStereoSignal, coeffs, biquadStatesArray, numBiquadsToApply) {
        if (numBiquadsToApply === 0) { // Should not happen with slopes -12dB and steeper
            if (inputStereoSignal !== finalOutputStereoSignal) {
                 finalOutputStereoSignal.set(inputStereoSignal);
            }
            return;
        }
        if (numBiquadsToApply < 0) { // Safety check
            // console.error("numBiquadsToApply cannot be negative");
            if (inputStereoSignal !== finalOutputStereoSignal) finalOutputStereoSignal.set(inputStereoSignal);
            return;
        }
    
    
        let bufferIn = inputStereoSignal;
        let bufferOut = (numBiquadsToApply === 1) ? finalOutputStereoSignal : context.pingPongBuffer;
    
        for (let stageIdx = 0; stageIdx < numBiquadsToApply; ++stageIdx) {
            if (stageIdx === numBiquadsToApply - 1) { // Last stage writes to the final output
                bufferOut = finalOutputStereoSignal;
            }
            
            applySingleBiquadStereo(bufferIn, bufferOut, blockSize, coeffs, biquadStatesArray[stageIdx]);
            
            // Ping-pong: output of current stage is input to next.
            // Only swap if not the last stage AND bufferOut was pingPongBuffer
            if (stageIdx < numBiquadsToApply - 1) {
                // If bufferOut was pingPongBuffer, next input is pingPongBuffer.
                // If bufferOut was finalOutputStereoSignal (only if numBiquads=1), loop terminates.
                // This logic simplifies: bufferIn is always the result of the previous stage.
                // The next bufferIn should be what we just wrote to bufferOut.
                bufferIn = bufferOut;
                // And next bufferOut should be the alternate buffer, unless it's the very last stage.
                if (stageIdx < numBiquadsToApply - 2) { // If there are at least two more stages
                     bufferOut = (bufferIn === finalOutputStereoSignal) ? context.pingPongBuffer : finalOutputStereoSignal; // This logic is tricky.
                                                                                                                            // Simpler:
                                                                                                                            // bufferOut = (bufferIn === context.pingPongBuffer) ? finalOutputStereoSignal_potentially_if_its_an_intermediate_target : context.pingPongBuffer
                }
                 // Simplified ping-pong:
                 // On all but the last iteration, bufferOut is pingPongBuffer.
                 // On the last iteration, bufferOut is finalOutputStereoSignal.
                 // So, bufferIn for the next stage is simply what bufferOut was.
                 // If the next stage is NOT the last, the next bufferOut is pingPongBuffer again.
                 // This is handled by the bufferOut assignment at the start of the loop.
            }
        }
      }
    
      function copyToOutput(sourceBuffer, outputChannelStart) {
        for (let ch = 0; ch < 2; ++ch) {
          data.set(sourceBuffer.subarray(ch * blockSize, (ch + 1) * blockSize), (outputChannelStart + ch) * blockSize);
        }
      }
    
      // --- Main Processing Logic ---
      // Number of biquads for current crossover is context.filterConfig.biquadStages[crossoverIdx]
      
      if (bandCount === 2) {
        const numBiquadsF1 = context.filterConfig.biquadStages[0];
        applyMultiBiquadFilter(inputCopy, temp1, context.cachedCoeffs[0].lp, context.filterStates.lp[0], numBiquadsF1);
        applyMultiBiquadFilter(inputCopy, temp2, context.cachedCoeffs[0].hp, context.filterStates.hp[0], numBiquadsF1);
        
        copyToOutput(temp1, 0);
        copyToOutput(temp2, 2);
      } else if (bandCount === 3) {
        const numBiquadsF1 = context.filterConfig.biquadStages[0];
        const numBiquadsF2 = context.filterConfig.biquadStages[1];
    
        applyMultiBiquadFilter(inputCopy, temp1, context.cachedCoeffs[0].lp, context.filterStates.lp[0], numBiquadsF1); // Lows in temp1
        applyMultiBiquadFilter(inputCopy, temp2, context.cachedCoeffs[0].hp, context.filterStates.hp[0], numBiquadsF1); // Mid+High in temp2
        copyToOutput(temp1, 0);
        
        // temp2 (Mid+High) is now input. Result for Mids in temp1.
        applyMultiBiquadFilter(temp2, temp1, context.cachedCoeffs[1].lp, context.filterStates.lp[1], numBiquadsF2); // Mids in temp1
        // temp2 (Mid+High input) is processed again for Highs. Result for Highs in temp2.
        applyMultiBiquadFilter(temp2, temp2, context.cachedCoeffs[1].hp, context.filterStates.hp[1], numBiquadsF2); // Highs in temp2
        copyToOutput(temp1, 2);
        copyToOutput(temp2, 4);
      } else if (bandCount === 4) {
        const numBiquadsF1 = context.filterConfig.biquadStages[0];
        const numBiquadsF2 = context.filterConfig.biquadStages[1];
        const numBiquadsF3 = context.filterConfig.biquadStages[2];
    
        applyMultiBiquadFilter(inputCopy, temp1, context.cachedCoeffs[0].lp, context.filterStates.lp[0], numBiquadsF1); // Lows in temp1
        applyMultiBiquadFilter(inputCopy, temp2, context.cachedCoeffs[0].hp, context.filterStates.hp[0], numBiquadsF1); // MidLow+MidHigh+High in temp2
        copyToOutput(temp1, 0);
        
        // temp2 is input. MidLows in temp1. MidHigh+High overwrites temp2.
        applyMultiBiquadFilter(temp2, temp1, context.cachedCoeffs[1].lp, context.filterStates.lp[1], numBiquadsF2); // MidLows in temp1
        applyMultiBiquadFilter(temp2, temp2, context.cachedCoeffs[1].hp, context.filterStates.hp[1], numBiquadsF2); // MidHigh+High in temp2
        copyToOutput(temp1, 2);
    
        // temp2 (MidHigh+High) is input. MidHighs in temp1. Highs overwrites temp2.
        applyMultiBiquadFilter(temp2, temp1, context.cachedCoeffs[2].lp, context.filterStates.lp[2], numBiquadsF3); // MidHighs in temp1
        applyMultiBiquadFilter(temp2, temp2, context.cachedCoeffs[2].hp, context.filterStates.hp[2], numBiquadsF3); // Highs in temp2
        copyToOutput(temp1, 4);
        copyToOutput(temp2, 6);
      }
      
      if (context.fadeIn && context.fadeIn.counter < context.fadeIn.length) {
        const fadeLength = context.fadeIn.length;
        let counter = context.fadeIn.counter;
        for (let i = 0; i < blockSize; ++i) {
          if (counter >= fadeLength) break;
          const gain = counter / fadeLength;
          for (let ch = 0; ch < channelCount; ++ch) {
            data[ch * blockSize + i] *= gain;
          }
          counter++;
        }
        context.fadeIn.counter = counter;
        if (context.fadeIn.counter >= fadeLength) {
            context.fadeIn = null;
        }
      }
      return data;
    `);
  }

  getParameters() {
    return {
      type: this.constructor.name, enabled: this.enabled,
      bc: this.bc, f1: this.f1, s1: this.s1,
      f2: this.f2, s2: this.s2, f3: this.f3, s3: this.s3,
    };
  }

  setParameters(params) {
    let needsUpdate = false;
    const p = this.getParameters(); // Current parameters

    if (params.enabled !== undefined && params.enabled !== p.enabled) {
      this.enabled = !!params.enabled;
      needsUpdate = true;
    }
    if (params.bc !== undefined && params.bc !== p.bc) {
      const bandCount = parseInt(params.bc);
      if ([2, 3, 4].includes(bandCount)) {
        this.bc = bandCount;
        needsUpdate = true;
      }
    }

    // Handle frequencies with ordering F1 < F2 < F3
    let { f1, f2, f3 } = this;
    let f1Changed = false, f2Changed = false, f3Changed = false;

    if (params.f1 !== undefined && params.f1 !== p.f1) {
        const val = Math.max(1, Math.min(40000, parseFloat(params.f1)));
        if (!isNaN(val)) { f1 = val; f1Changed = true; }
    }
    if (params.f2 !== undefined && params.f2 !== p.f2) {
        const val = Math.max(1, Math.min(40000, parseFloat(params.f2)));
        if (!isNaN(val)) { f2 = val; f2Changed = true; }
    }
    if (params.f3 !== undefined && params.f3 !== p.f3) {
        const val = Math.max(1, Math.min(40000, parseFloat(params.f3)));
        if (!isNaN(val)) { f3 = val; f3Changed = true; }
    }

    if (f1Changed || f2Changed || f3Changed) {
        if (f2 <= f1) f2 = f1 + 1;
        if (f3 <= f2) f3 = f2 + 1;
        if (f1 >= f2) f1 = f2 - 1;

        const minSeparation = 1; 
        if (this.bc >= 2) {
            if (this.bc >=3) { 
                f1 = Math.min(f1, f2 - minSeparation);
                if (this.bc >= 4) { 
                     f2 = Math.min(f2, f3 - minSeparation);
                     f2 = Math.max(f2, f1 + minSeparation); 
                     f3 = Math.max(f3, f2 + minSeparation); 
                } else { 
                    f2 = Math.max(f2, f1 + minSeparation);
                }
            }
        }
        this.f1 = Math.max(1, Math.min(40000, f1));
        this.f2 = Math.max(1, Math.min(40000, f2));
        this.f3 = Math.max(1, Math.min(40000, f3));
        needsUpdate = true;
    }


    const allowedSlopes = [-12, -24, -36, -48, -60, -72, -84, -96];
    if (params.s1 !== undefined && params.s1 !== p.s1 && allowedSlopes.includes(parseInt(params.s1))) {
      this.s1 = parseInt(params.s1); needsUpdate = true;
    }
    if (params.s2 !== undefined && params.s2 !== p.s2 && allowedSlopes.includes(parseInt(params.s2))) {
      this.s2 = parseInt(params.s2); needsUpdate = true;
    }
    if (params.s3 !== undefined && params.s3 !== p.s3 && allowedSlopes.includes(parseInt(params.s3))) {
      this.s3 = parseInt(params.s3); needsUpdate = true;
    }

    if (needsUpdate) {
      this.updateParameters(); 
      this.updateErrorState();
      this.updateCrossoverControls();
      if (this.canvas) this.drawGraph();
    }
  }

  updateErrorState() { /* Handled by onMessage, kept for compatibility */ }

  _updateErrorUI() {
    if (!this.errorEl) return;
    this.errorEl.textContent = this.errorState || "";
    this.errorEl.style.display = this.errorState ? 'block' : 'none';
  }

  _updateBandOptions() {
    if (!this.bandRadios) return;
    this.bandRadios.forEach((radio, index) => {
      const bandCountValue = index + 2;
      radio.style.opacity = (bandCountValue <= this.maxBands) ? "1" : "0.5";
    });
  }

  createUI() {
    const frag = document.createDocumentFragment();

    this.errorEl = document.createElement("div");
    this.errorEl.className = "error-banner";
    Object.assign(this.errorEl.style, { display: "none", padding: "5px", marginBottom: "10px", color: "#ff0000", backgroundColor: "rgba(255,0,0,0.1)" });
    frag.appendChild(this.errorEl);

    const bandRow = this._createRow("Band Count:");
    const radioGroup = document.createElement("div");
    radioGroup.className = "radio-group";
    Object.assign(radioGroup.style, { display: "flex", gap: "10px", alignItems: "center" });
    this.bandRadios = [];
    [2, 3, 4].forEach(bcValue => {
      const radioOption = document.createElement("div");
      Object.assign(radioOption.style, { display: "flex", alignItems: "center" });
      const id = `${this.id}-band-${bcValue}`;
      const radio = this._createInput("radio", id, bcValue, radioOption);
      radio.name = `${this.id}-band-select`;
      radio.checked = this.bc === bcValue;
      radio.onchange = () => { if (radio.checked) this.setParameters({ bc: bcValue }); };
      this.bandRadios.push(radio);
      this._createLabel(id, bcValue.toString(), radioOption, { marginLeft: "5px" });
      radioGroup.appendChild(radioOption);
    });
    bandRow.appendChild(radioGroup);
    frag.appendChild(bandRow);

    const freqContainer = document.createElement("div");
    freqContainer.className = "channel-divider-frequency-sliders";
    this.freq1Slider = this._createFreqControl(freqContainer, "Freq 1", 1, (val) => this.setParameters({ f1: val }), (val) => this.setParameters({ s1: val }), this.f1, this.s1);
    this.freq2Slider = this._createFreqControl(freqContainer, "Freq 2", 2, (val) => this.setParameters({ f2: val }), (val) => this.setParameters({ s2: val }), this.f2, this.s2);
    this.freq3Slider = this._createFreqControl(freqContainer, "Freq 3", 3, (val) => this.setParameters({ f3: val }), (val) => this.setParameters({ s3: val }), this.f3, this.s3);
    frag.appendChild(freqContainer);

    const graphContainer = document.createElement("div");
    graphContainer.className = "channel-divider-graph-container";
    graphContainer.style.position = "relative"; 
    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas, { width: 1200, height: 480 }); 
    Object.assign(this.canvas.style, { width: "600px", height: "240px", display: "block", margin: "10px auto" }); 
    graphContainer.appendChild(this.canvas);
    frag.appendChild(graphContainer);
    
    const uiContainer = document.createElement("div");
    uiContainer.className = "plugin-parameter-ui";
    uiContainer.appendChild(frag);

    this.updateCrossoverControls();
    this._updateBandOptions();
    this.drawGraph();
    return uiContainer;
  }

  _createRow(labelTextContent) {
    const row = document.createElement("div");
    row.className = "parameter-row";
    // Apply flex styling for horizontal alignment of label and controls group
    Object.assign(row.style, { display: "flex", alignItems: "center", marginBottom: "8px", gap: "10px"});
    if (labelTextContent) {
      const label = document.createElement("label");
      label.textContent = labelTextContent;
      label.style.flexShrink = "0"; // Prevent label from shrinking
      row.appendChild(label);
    }
    return row;
  }

  _createInput(type, id, value, parent) {
    const input = document.createElement("input");
    input.type = type;
    input.id = id;
    input.name = id; 
    input.autocomplete = "off";
    if (type === "number" || type === "range" || type === "radio") input.value = value;
    if (parent) parent.appendChild(input);
    return input;
  }

  _createLabel(forId, text, parent, style = {}) {
    const label = document.createElement("label");
    label.htmlFor = forId;
    label.textContent = text;
    Object.assign(label.style, style);
    if (parent) parent.appendChild(label);
    return label;
  }

  _createSlopeSelect(currentSlope, onChangeCallback, index) {
    const selectId = `${this.id}-slope-${index}`;
    const select = document.createElement("select");
    select.className = "slope-select";
    select.id = selectId;
    select.name = selectId;
    select.autocomplete = "off";
    select.style.marginLeft = "5px"; // Add some space next to the number input
    [-12, -24, -36, -48, -60, -72, -84, -96].forEach(slope => {
      const option = document.createElement("option");
      option.value = slope;
      option.textContent = `${Math.abs(slope)}dB`; // Shortened text
      option.selected = currentSlope === slope;
      select.appendChild(option);
    });
    select.onchange = (e) => {
        onChangeCallback(parseInt(e.target.value));
        // No direct call to this.drawGraph() here, should be handled by setParameters
    };
    return select;
  }

  _createFreqControl(parent, labelPrefix, index, freqSetter, slopeSetter, currentFreq, currentSlope) {
    const minFreq = 1, maxFreq = 40000;
    const sliderContainer = document.createElement("div");
    sliderContainer.className = `channel-divider-frequency-slider channel-divider-freq-${index}`;
    Object.assign(sliderContainer.style, { marginBottom: "10px" });


    // Top Row: Label, Number Input, and Slope Select
    const topRow = this._createRow(); // _createRow now applies flex
    topRow.classList.add("channel-divider-frequency-slider-top"); // Keep specific class if needed

    this._createLabel(`${this.id}-freq${index}-number`, `${labelPrefix} (Hz):`, topRow, { marginRight: "5px"});
    
    const numberInput = this._createInput("number", `${this.id}-freq${index}-number`, currentFreq, topRow);
    Object.assign(numberInput.style, { width: "70px" }); // Adjust width as needed
    Object.assign(numberInput, { min: minFreq, max: maxFreq, step: 1 });

    // Add Slope Select directly to the topRow, after numberInput
    const slopeSelect = this._createSlopeSelect(currentSlope, (val) => { slopeSetter(val); }, index);
    topRow.appendChild(slopeSelect);
    
    sliderContainer.appendChild(topRow);

    // Middle: Range Slider (Full width below the top row)
    const rangeInput = this._createInput("range", `${this.id}-freq${index}-slider`, this.logToLinear(currentFreq, minFreq, maxFreq), sliderContainer);
    Object.assign(rangeInput, { min: 0, max: 1000, step: 1 });
    rangeInput.style.width = "100%"; // Make slider take full width
    
    sliderContainer.appendChild(rangeInput);
    
    // Event Listeners
    rangeInput.oninput = () => {
      const logValue = Math.round(this.linearToLog(parseFloat(rangeInput.value), minFreq, maxFreq));
      numberInput.value = logValue;
      freqSetter(logValue); // This will trigger setParameters, which handles drawGraph
    };
    numberInput.onchange = () => { 
      let val = parseFloat(numberInput.value) || minFreq;
      val = Math.max(minFreq, Math.min(maxFreq, val));
      numberInput.value = val; 
      rangeInput.value = this.logToLinear(val, minFreq, maxFreq);
      freqSetter(val); // This will trigger setParameters
    };

    parent.appendChild(sliderContainer);
    return sliderContainer;
  }


  updateCrossoverControls() {
    if (!this.freq1Slider || !this.freq2Slider || !this.freq3Slider) return;

    const setControlOpacityAndDisabled = (control, isEnabled) => {
        control.style.opacity = isEnabled ? "1" : "0.5";
        // control.querySelectorAll('input, select').forEach(el => el.disabled = !isEnabled);
    };
    
    setControlOpacityAndDisabled(this.freq1Slider, true);
    setControlOpacityAndDisabled(this.freq2Slider, this.bc >= 3);
    setControlOpacityAndDisabled(this.freq3Slider, this.bc >= 4);

    // No direct call to drawGraph() here, it's handled by setParameters or initial setup
  }

  linearToLog(value, min, max) { 
    const minLog = Math.log10(min);
    const maxLog = Math.log10(max);
    return Math.pow(10, minLog + (maxLog - minLog) * (value / 1000));
  }
  logToLinear(value, min, max) { 
    const minLog = Math.log10(min);
    const maxLog = Math.log10(max);
    if (value <= min) return 0;
    if (value >= max) return 1000;
    return 1000 * (Math.log10(value) - minLog) / (maxLog - minLog);
  }

  drawGraph() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext("2d");
    const { width, height } = this.canvas;
    const minFreqLog = Math.log10(1); 
    const maxFreqLog = Math.log10(40000); 

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    ctx.font = "20px Arial"; 

    const gridFreqs = [2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    gridFreqs.forEach(freq => {
      const x = width * (Math.log10(freq) - minFreqLog) / (maxFreqLog - minFreqLog);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      if (freq >= 10) { 
        ctx.fillStyle = "#666"; ctx.textAlign = "center";
        ctx.fillText(freq >= 1000 ? `${freq/1000}k` : freq, x, height - 40);
      }
    });

    const dbRange = [-60, 12]; 
    const totalDbSpan = dbRange[1] - dbRange[0];
    const gridDBs = [-60, -48, -36, -24, -12, 0]; 
    gridDBs.forEach(db => {
      const y = height * (1 - (db - dbRange[0]) / totalDbSpan);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      if (db > -60) { 
        ctx.fillStyle = "#666"; ctx.textAlign = "right";
        ctx.fillText(`${db}dB`, 80, y + 6);
      }
    });

    ctx.fillStyle = "#fff"; ctx.font = "24px Arial"; ctx.textAlign = "center";
    ctx.fillText("Frequency (Hz)", width / 2, height - 5);
    ctx.save();
    ctx.translate(20, height / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText("Level (dB)", 0, 0);
    ctx.restore();

    const freqPoints = Array.from({ length: width }, (_, i) => 
        Math.pow(10, minFreqLog + (i / (width - 1)) * (maxFreqLog - minFreqLog))
    );

    const bandDefinitions = [];
    if (this.bc === 2) {
      bandDefinitions.push({ name: "Low", filters: [{ freq: this.f1, slope: this.s1, type: "lp" }] });
      bandDefinitions.push({ name: "High", filters: [{ freq: this.f1, slope: this.s1, type: "hp" }] });
    } else if (this.bc === 3) {
      bandDefinitions.push({ name: "Low", filters: [{ freq: this.f1, slope: this.s1, type: "lp" }] });
      bandDefinitions.push({ name: "Mid", filters: [{ freq: this.f1, slope: this.s1, type: "hp" }, { freq: this.f2, slope: this.s2, type: "lp" }] });
      bandDefinitions.push({ name: "High", filters: [{ freq: this.f2, slope: this.s2, type: "hp" }] });
    } else if (this.bc === 4) {
      bandDefinitions.push({ name: "Low", filters: [{ freq: this.f1, slope: this.s1, type: "lp" }] });
      bandDefinitions.push({ name: "Mid-Low", filters: [{ freq: this.f1, slope: this.s1, type: "hp" }, { freq: this.f2, slope: this.s2, type: "lp" }] });
      bandDefinitions.push({ name: "Mid-High", filters: [{ freq: this.f2, slope: this.s2, type: "hp" }, { freq: this.f3, slope: this.s3, type: "lp" }] });
      bandDefinitions.push({ name: "High", filters: [{ freq: this.f3, slope: this.s3, type: "hp" }] });
    }
    
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 3; 

    bandDefinitions.forEach(bandDef => {
      const response = this.calculateBandResponse(freqPoints, bandDef.filters);
      ctx.beginPath();
      for (let i = 0; i < width; i++) {
        let y = height * (1 - (response[i] - dbRange[0]) / totalDbSpan);
        if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
      }
      ctx.stroke();
    });
  }

  calculateBandResponse(freqPoints, filters) {
    return freqPoints.map(freq => {
      let gainDb = 0; 
      filters.forEach(filter => {
        gainDb += this.calculateFilterMagnitudeDb(freq, filter.freq, filter.slope, filter.type);
      });
      return gainDb;
    });
  }

  calculateFilterMagnitudeDb(freq, cutoffFreq, slope, type) {
    if (slope === 0 || cutoffFreq <=0) return 0; 

    const absSlope = Math.abs(slope);
    const n = absSlope / 6; 
                            
    const wRatio = freq / cutoffFreq;
    let magnitudeSquared; 

    if (type === "lp") {
      magnitudeSquared = 1 / (1 + Math.pow(wRatio, n)); 
    } else { 
      magnitudeSquared = Math.pow(wRatio, n) / (1 + Math.pow(wRatio, n)); 
    }
    
    return 10 * Math.log10(Math.max(magnitudeSquared, 1e-10)); 
  }

  onMessage(message) {
    if (message.type === 'processBuffer' && message.pluginId === this.id && message.measurements) {
      const { channels } = message.measurements;
      let newMaxBands = 2; 
      let error = null;

      if (channels < 4 || channels % 2 !== 0) {
        error = "This effect only works in multichannel mode (4, 6, or 8 channels).";
      } else if (channels === 4) {
        newMaxBands = 2;
      } else if (channels === 6) {
        newMaxBands = 3;
      } else if (channels === 8) {
        newMaxBands = 4;
      }
      
      let uiNeedsUpdate = false;
      if (this.maxBands !== newMaxBands) {
        this.maxBands = newMaxBands;
        uiNeedsUpdate = true;
      }
      if (this.errorState !== error) {
        this.errorState = error;
        uiNeedsUpdate = true;
      }

      if (uiNeedsUpdate) {
        this._updateErrorUI();
        this._updateBandOptions(); 
        this.updateCrossoverControls(); 
      }
    }
  }
}

window.ChannelDividerPlugin = ChannelDividerPlugin;