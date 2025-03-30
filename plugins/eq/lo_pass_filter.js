// Lo Pass Filter Plugin implementation
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
const loPassProcessorFunction = `
if (!parameters.enabled) return data;

// Map parameter names for clarity
const { fr: freq, sl: slope, channelCount, blockSize } = parameters;

// Compute number of Linkwitz-Riley filter stages (each stage is 2nd order = 12dB/oct)
function computeStages(slope) {
  const absSlope = Math.abs(slope);
  if (absSlope === 0) return 0;
  return absSlope / 12; // Each stage is 12dB/oct
}

const numStages = computeStages(slope);

// --- Ensure proper reinitialization when slope parameters change ---
if (!context.lastSlope || context.lastSlope !== slope) {
  context.filterStates = null;
  context.lastSlope = slope;
  context.initialized = false;
}

// Initialize or reset filter states if needed
if (!context.initialized || !context.filterStates || context.filterStates.length !== numStages) {
  // For Linkwitz-Riley filters, each stage is 2nd order and needs 2 previous inputs and 2 previous outputs
  const createState = () => {
    return {
      x1: new Float32Array(channelCount).fill(0),
      x2: new Float32Array(channelCount).fill(0),
      y1: new Float32Array(channelCount).fill(0),
      y2: new Float32Array(channelCount).fill(0)
    };
  };
  
  // Initialize with a small DC offset to prevent denormals
  context.filterStates = [];
  for (let s = 0; s < numStages; s++) {
    const state = createState();
    const dcOffset = 1e-25;
    for (let ch = 0; ch < channelCount; ch++) {
      state.x1[ch] = dcOffset;
      state.x2[ch] = -dcOffset;
      state.y1[ch] = dcOffset;
      state.y2[ch] = -dcOffset;
    }
    context.filterStates.push(state);
  }
  context.initialized = true;
}

// --- Calculate Linkwitz-Riley low-pass filter coefficients ---
// Linkwitz-Riley filters are created by cascading Butterworth filters
// Each stage is a 2nd-order filter (12dB/oct)
const omega = Math.tan(Math.PI * freq / sampleRate);
const omega2 = omega * omega;
const SQRT2 = Math.SQRT2;
const n = 1 / (omega2 + SQRT2 * omega + 1);

// Coefficients for 2nd-order Linkwitz-Riley low-pass filter
const b0 = omega2 * n;
const b1 = 2 * b0;
const b2 = b0;
const a1 = 2 * (omega2 - 1) * n;
const a2 = (omega2 - SQRT2 * omega + 1) * n;

// --- Process audio ---
// Apply fade-in to prevent clicks when filter states are reset
const fadeInLength = Math.min(blockSize, sampleRate * 0.005); // 5ms fade-in
const fadeIn = !context.fadeInComplete;
if (fadeIn) context.fadeInComplete = true;

for (let ch = 0, offset = 0; ch < channelCount; ch++, offset += blockSize) {
  for (let i = 0; i < blockSize; i++) {
    let sample = data[offset + i];
    
    // Apply cascaded Linkwitz-Riley low-pass filters
    for (let s = 0; s < numStages; s++) {
      const state = context.filterStates[s];
      
      // Apply 2nd-order low-pass filter
      // y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]
      const x = sample;
      const y = b0 * x + b1 * state.x1[ch] + b2 * state.x2[ch] -
                a1 * state.y1[ch] - a2 * state.y2[ch];
      
      // Update filter state
      state.x2[ch] = state.x1[ch];
      state.x1[ch] = x;
      state.y2[ch] = state.y1[ch];
      state.y1[ch] = y;
      
      sample = y;
    }
    
    // Apply fade-in if needed to prevent clicks
    if (fadeIn && i < fadeInLength) {
      const fadeGain = i / fadeInLength;
      sample *= fadeGain;
    }
    
    data[offset + i] = sample;
  }
}

return data;
`;

// Lo Pass Filter Plugin class
class LoPassFilterPlugin extends PluginBase {
  constructor() {
    super("Lo Pass Filter", "Low-pass filter with adjustable frequency and slope");
    this.fr = 1000;  // Frequency in Hz (default: 1000Hz)
    this.sl = -24;  // Slope (allowed values: 0, -12, -24, -36, -48, -60, -72, -84, -96 dB/oct)
    this.registerProcessor(loPassProcessorFunction);
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
    if (params.fr !== undefined)
      this.fr = Math.max(1, Math.min(40000, typeof params.fr === "number" ? params.fr : parseFloat(params.fr)));
    if (params.sl !== undefined) {
      const intSlope = typeof params.sl === "number" ? params.sl : parseInt(params.sl);
      const allowed = [0, -12, -24, -36, -48, -60, -72, -84, -96];
      this.sl = allowed.includes(intSlope) ? intSlope : -24;
    }
    this.updateParameters();
  }

  createUI() {
    const container = document.createElement("div");
    container.className = "lo-pass-filter-plugin-ui plugin-parameter-ui";

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
    freqRow.appendChild(createSlopeSelect(this.sl, v => this.setSlope(v), "LPF"));

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
      
      // Calculate Linkwitz-Riley low-pass response
      let lpfMag = 1;
      if (this.sl !== 0) {
        // Linkwitz-Riley filters are -6dB at the cutoff frequency
        const wRatio = freq / this.fr;
        
        // For 2nd order (LR2, -12dB/oct)
        if (numStages === 1) {
          // LR2 is a squared Butterworth 1st order filter
          lpfMag = 1 / (1 + wRatio * wRatio);
        }
        // For 4th order (LR4, -24dB/oct)
        else if (numStages === 2) {
          // LR4 is a squared Butterworth 2nd order filter
          const butterworth2 = 1 / Math.sqrt(1 + Math.pow(wRatio, 4));
          lpfMag = butterworth2 * butterworth2;
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
            butterworth = 1 / Math.sqrt(1 + Math.pow(wRatio, order));
          } else {
            // Odd order (shouldn't happen with LR filters, but just in case)
            butterworth = 1 / Math.sqrt(1 + Math.pow(wRatio, order));
          }
          
          // Square it for Linkwitz-Riley
          lpfMag = butterworth * butterworth;
        }
      }
      
      const response = 20 * Math.log10(lpfMag);
      const y = height * (1 - (response + 60) / 72);
      i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
    }
    ctx.stroke();
  }
}

window.LoPassFilterPlugin = LoPassFilterPlugin;