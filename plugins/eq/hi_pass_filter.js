// Hi Pass Filter Plugin implementation
// This implementation uses Linkwitz-Riley filters for precise crossover characteristics.
// Linkwitz-Riley filters are created by cascading Butterworth filters of the same order.
// The filter provides slopes from -12dB/oct to -96dB/oct in 12dB increments:
//  - 12dB/oct = 2nd order Linkwitz-Riley (LR2)
//  - 24dB/oct = 4th order Linkwitz-Riley (LR4)
//  - 36dB/oct = 6th order Linkwitz-Riley (LR6)
//  - 48dB/oct = 8th order Linkwitz-Riley (LR8)
//  - 60dB/oct = 10th order Linkwitz-Riley (LR10)
//  - 72dB/oct = 12th order Linkwitz-Riley (LR12)
//  - 84dB/oct = 14th order Linkwitz-Riley (LR14)
//  - 96dB/oct = 16th order Linkwitz-Riley (LR16)
const hiPassProcessorFunction = `
'use strict'; // Enable strict mode for potential optimizations and error prevention

// Early exit if processing is disabled
if (!parameters.enabled) return data;

// Extract parameters into local constants for potentially faster access
const freq = parameters.fr;
const slope = parameters.sl;
const channelCount = parameters.channelCount;
const blockSize = parameters.blockSize;

// --- Calculate Number of Stages ---
// Optimized replacement for Math.abs using conditional operator
const absSlope = slope < 0 ? -slope : slope;
// Each Linkwitz-Riley stage provides 12dB/oct slope
const numStages = absSlope === 0 ? 0 : absSlope / 12;

// --- Parameter Change Detection & State Initialization ---

// Flags to track if parameters necessitate recalculation or reinitialization
let needsReinit = false;
let needsCoeffRecalc = false;

// Check if slope changed, requiring state reinitialization
if (context.lastSlope !== slope) {
  context.lastSlope = slope;
  context.numStages = numStages; // Store calculated numStages
  context.filterStates = null; // Mark states for recreation
  needsReinit = true;
}

// Check if frequency changed, requiring coefficient recalculation
// Also recalculate if reinitializing (might be the first run)
if (context.lastFreq !== freq) {
  context.lastFreq = freq;
  needsCoeffRecalc = true;
}

// Initialize or reinitialize filter states if slope changed or first run
// Use the stored context.numStages
if (needsReinit || !context.filterStates || context.filterStates.length !== context.numStages) {
  const numStagesToInit = context.numStages; // Use stored value
  // Avoid array allocation if zero stages are needed
  if (numStagesToInit > 0) {
    context.filterStates = new Array(numStagesToInit);
    const dcOffset = 1e-25; // Small offset to prevent denormals
    for (let s = 0; s < numStagesToInit; s++) {
      // Create state object for the stage
      const state = {
        x1: new Float32Array(channelCount), // No need to fill(0) before setting offset
        x2: new Float32Array(channelCount),
        y1: new Float32Array(channelCount),
        y2: new Float32Array(channelCount)
      };
      // Apply small DC offset to prevent denormal issues at start/reset
      for (let ch = 0; ch < channelCount; ch++) {
        state.x1[ch] = dcOffset;
        state.x2[ch] = -dcOffset;
        state.y1[ch] = dcOffset;
        state.y2[ch] = -dcOffset;
      }
      context.filterStates[s] = state;
    }
  } else {
    // Explicitly handle the case of 0 stages
    context.filterStates = []; // Ensure it's an empty array
  }
  needsReinit = true; // Mark that reinitialization occurred
  needsCoeffRecalc = true; // Coefficients depend on filter structure/existence
}

// --- Coefficient Calculation (only if needed) ---

// Calculate coefficients only if frequency changed or state was reinitialized
if (needsCoeffRecalc || !context.coeffs) {
  // Check if filtering is actually needed before calculating
  if (context.numStages > 0 && freq > 0) { // Avoid calculations for 0 freq or 0 stages
    // Pre-calculate constants for Linkwitz-Riley 2nd order high-pass
    const omega = Math.tan(Math.PI * freq / sampleRate);
    const omega2 = omega * omega;
    const sqrt2 = 1.4142135623730951; // Math.SQRT2 constant inlined
    const n = 1 / (omega2 + sqrt2 * omega + 1);

    // Store coefficients directly in context to avoid recalculation
    context.coeffs = {
      b0: n,
      b1: -2 * n,
      b2: n,
      a1: 2 * (omega2 - 1) * n,
      a2: (omega2 - sqrt2 * omega + 1) * n
    };
  } else {
    // Store dummy/zero coefficients if no filtering is applied
    context.coeffs = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };
  }
}

// --- Audio Processing ---

// Exit early if no filter stages are needed
if (context.numStages === 0) {
  return data; // No filtering needed, return original data
}

// Retrieve coefficients and states from context for use in loops
const { b0, b1, b2, a1, a2 } = context.coeffs;
const filterStates = context.filterStates;
const activeNumStages = context.numStages; // Use the stored, consistent value

// Process each channel
for (let ch = 0, offset = 0; ch < channelCount; ch++, offset += blockSize) {
  // Process each sample in the block for the current channel
  for (let i = 0; i < blockSize; i++) {
    let sample = data[offset + i]; // Current input sample

    // Apply cascaded filter stages
    for (let s = 0; s < activeNumStages; s++) {
      const state = filterStates[s]; // Get state for the current stage

      // Retrieve previous inputs/outputs for this channel from state arrays
      const x1 = state.x1[ch];
      const x2 = state.x2[ch];
      const y1 = state.y1[ch];
      const y2 = state.y2[ch];

      // Apply 2nd-order IIR filter difference equation
      // y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]
      const x_n = sample; // Current input for this stage is output of previous (or original sample)
      const y_n = b0 * x_n + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;

      // Update state arrays for this channel *after* calculating output
      state.x2[ch] = x1; // x[n-2] becomes previous x[n-1]
      state.x1[ch] = x_n; // x[n-1] becomes current x[n]
      state.y2[ch] = y1; // y[n-2] becomes previous y[n-1]
      state.y1[ch] = y_n; // y[n-1] becomes current y[n]

      // Output of this stage becomes input for the next stage
      sample = y_n;
    }

    // Write the final filtered sample back to the data array
    data[offset + i] = sample;
  }
}

return data; // Return the modified data array
`;

// Hi Pass Filter Plugin class
class HiPassFilterPlugin extends PluginBase {
  constructor() {
    super("Hi Pass Filter", "High-pass filter with adjustable frequency and slope");
    this.fr = 1000;  // Frequency in Hz (default: 1000Hz)
    this.sl = -24;  // Slope (allowed values: 0, -12, -24, -36, -48, -60, -72, -84, -96 dB/oct)
    this.registerProcessor(hiPassProcessorFunction);
  }

  setFreq(freq) { this.setParameters({ fr: freq }); }
  setSlope(slope) { this.setParameters({ sl: slope }); }

  getParameters() {
    return {
      type: this.constructor.name,
      enabled: this.enabled,
      fr: this.fr,
      sl: this.sl
    };
  }

  setParameters(params) {
    if (params.enabled !== undefined) this.enabled = params.enabled;
    if (params.fr !== undefined) {
      const value = typeof params.fr === "number" ? params.fr : parseFloat(params.fr);
      this.fr = value < 1 ? 1 : (value > 40000 ? 40000 : value);
    }
    if (params.sl !== undefined) {
      const intSlope = typeof params.sl === "number" ? params.sl : parseInt(params.sl);
      const allowed = [0, -12, -24, -36, -48, -60, -72, -84, -96];
      this.sl = allowed.includes(intSlope) ? intSlope : -24;
    }
    this.updateParameters();
  }

  createUI() {
    const container = document.createElement("div");
    container.className = "hi-pass-filter-plugin-ui plugin-parameter-ui";

    // Helper to create a parameter row with slider and number input
    const createRow = (labelText, min, max, step, value, onInput) => {
      // Create a parameter name from the label (e.g., "Frequency (Hz):" -> "frequency")
      const paramName = labelText.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '');
      
      const sliderId = `${this.id}-${this.name}-${paramName}-slider`;
      const numberId = `${this.id}-${this.name}-${paramName}-number`;
      
      const row = document.createElement("div");
      row.className = "parameter-row";
      
      const label = document.createElement("label");
      label.textContent = labelText;
      label.htmlFor = sliderId;
      
      const slider = document.createElement("input");
      slider.type = "range";
      slider.id = sliderId;
      slider.name = sliderId;
      slider.min = min;
      slider.max = max;
      slider.step = step;
      slider.value = value;
      slider.autocomplete = "off";
      
      const numberInput = document.createElement("input");
      numberInput.type = "number";
      numberInput.id = numberId;
      numberInput.name = numberId;
      numberInput.min = min;
      numberInput.max = max;
      numberInput.step = step;
      numberInput.value = value;
      numberInput.autocomplete = "off";
      slider.addEventListener("input", e => {
        onInput(parseFloat(e.target.value));
        numberInput.value = this.fr;
        this.drawGraph(canvas);
      });
      numberInput.addEventListener("input", e => {
        onInput(parseFloat(e.target.value) || 0);
        slider.value = this.fr;
        this.drawGraph(canvas);
        e.target.value = this.fr;
      });
      row.appendChild(label);
      row.appendChild(slider);
      row.appendChild(numberInput);
      return row;
    };

    // Helper to create a slope select box
    const createSlopeSelect = (current, onChange, filterType) => {
      const selectId = `${this.id}-${this.name}-${filterType.toLowerCase()}-slope`;
      
      const select = document.createElement("select");
      select.className = "slope-select";
      select.id = selectId;
      select.name = selectId;
      select.autocomplete = "off";
      
      const slopes = [0, -12, -24, -36, -48, -60, -72, -84, -96];
      slopes.forEach(slope => {
        const option = document.createElement("option");
        option.value = slope;
        option.textContent = slope === 0 ? "Off" : `${Math.abs(slope)}dB/oct`;
        option.selected = current === slope;
        select.appendChild(option);
      });
      select.addEventListener("change", e => {
        onChange(parseInt(e.target.value));
        this.drawGraph(canvas);
      });
      return select;
    };

    // Create frequency parameter row
    const freqRow = createRow("Frequency (Hz):", 1, 40000, 1, this.fr, v => this.setFreq(v));
    freqRow.appendChild(createSlopeSelect(this.sl, v => this.setSlope(v), "HPF"));

    // Create graph container and canvas
    const graphContainer = document.createElement("div");
    graphContainer.style.position = "relative";
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 480;
    canvas.style.width = "600px";
    canvas.style.height = "240px";
    graphContainer.appendChild(canvas);

    container.appendChild(freqRow);
    container.appendChild(graphContainer);
    this.drawGraph(canvas);
    return container;
  }

  drawGraph(canvas) {
    const ctx = canvas.getContext("2d");
    const width = canvas.width, height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    const freqs = [2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    freqs.forEach(freq => {
      const x = width * (Math.log10(freq) - Math.log10(1)) / (Math.log10(40000) - Math.log10(1));
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      if (freq >= 1 && freq <= 40000) {
        ctx.fillStyle = "#666";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(freq >= 1000 ? `${freq/1000}k` : freq, x, height - 40);
      }
    });
    const dBs = [-60, -48, -36, -24, -12, 0, 12];
    dBs.forEach(db => {
      const y = height * (1 - (db + 60) / 72);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      if (db > -60 && db < 12) {
        ctx.fillStyle = "#666";
        ctx.font = "20px Arial";
        ctx.textAlign = "right";
        ctx.fillText(`${db}dB`, 80, y + 6);
      }
    });
    ctx.fillStyle = "#fff";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Frequency (Hz)", width / 2, height - 5);
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Level (dB)", 0, 0);
    ctx.restore();

    // Calculate the frequency response of Linkwitz-Riley filters
    // Each stage is a 2nd-order filter (12dB/oct)
    function computeStages(slope) {
      const absSlope = Math.abs(slope);
      if (absSlope === 0) return 0;
      return absSlope / 12; // Each stage is 12dB/oct
    }
    const numStages = computeStages(this.sl);

    ctx.beginPath();
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;
    for (let i = 0; i < width; i++) {
      const freq = Math.pow(10, Math.log10(1) + (i / width) * (Math.log10(40000) - Math.log10(1)));
      
      // Calculate Linkwitz-Riley high-pass response
      let hpfMag = 1;
      if (this.sl !== 0) {
        // Linkwitz-Riley filters are -6dB at the cutoff frequency
        const wRatio = freq / this.fr;
        
        // For 2nd order (LR2, -12dB/oct)
        if (numStages === 1) {
          // LR2 is a squared Butterworth 1st order filter
          hpfMag = wRatio * wRatio / (1 + wRatio * wRatio);
        }
        // For 4th order (LR4, -24dB/oct)
        else if (numStages === 2) {
          // LR4 is a squared Butterworth 2nd order filter
          const butterworth2 = wRatio * wRatio / Math.sqrt(1 + Math.pow(wRatio, 4));
          hpfMag = butterworth2 * butterworth2;
        }
        // For higher orders
        else {
          // Calculate the correct Linkwitz-Riley response
          // LR filters are created by cascading Butterworth filters
          // and have -6dB at the cutoff frequency
          const order = numStages * 2; // LR order (2, 4, 6, 8, etc.)
          
          // Start with the basic Butterworth response
          let butterworth;
          if (order % 2 === 0) {
            // Even order
            butterworth = Math.pow(wRatio, order) / Math.sqrt(1 + Math.pow(wRatio, order * 2));
          } else {
            // Odd order (shouldn't happen with LR filters, but just in case)
            butterworth = Math.pow(wRatio, order) / Math.sqrt(1 + Math.pow(wRatio, order * 2));
          }
          
          // Square it for Linkwitz-Riley
          hpfMag = butterworth * butterworth;
        }
      }
      
      const response = 20 * Math.log10(hpfMag);
      const y = height * (1 - (response + 60) / 72);
      i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
    }
    ctx.stroke();
  }
}

window.HiPassFilterPlugin = HiPassFilterPlugin;