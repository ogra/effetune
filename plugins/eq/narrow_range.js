// Processor function modified for Linkwitz–Riley–style filtering
// This implementation supports first‑order sections for 6dB/oct and 
// second‑order (Butterworth, Q = 1/√2) sections for 12dB/oct.
// The filter cascade is built as follows:
//  - If the absolute slope is 6 dB/oct, one first‑order stage is used.
//  - If the absolute slope is 12 dB/oct, one second‑order stage is used.
//  - If the absolute slope is an odd multiple of 6 (e.g. 18, 30, 42 dB/oct),
//    the cascade is built as one first‑order stage followed by the appropriate
//    number of second‑order stages.
//  - If the absolute slope is an even multiple of 6 (e.g. 24, 36, 48 dB/oct),
//    the cascade is built entirely from second‑order stages.
const processorFunction = `
if (!parameters.enabled) return data;

// Map parameter names for clarity
const { hf: hpfFreq, hs: hpfSlope, lf: lpfFreq, ls: lpfSlope, channelCount, blockSize } = parameters;

// Helper to compute number of stages from slope value (in dB/oct)
function computeStages(slope) {
  const absSlope = Math.abs(slope);
  if (absSlope === 0) return { order1: 0, order2: 0 };
  const n = absSlope / 6;
  if (n % 2 === 1) {
    // Odd: one first-order stage plus (n - 1)/2 second-order stages
    return { order1: 1, order2: (n - 1) / 2 };
  } else {
    // Even: all second-order stages
    return { order1: 0, order2: n / 2 };
  }
}

const hpfStages = computeStages(hpfSlope);
const lpfStages = computeStages(lpfSlope);
const hpf_order1_stages = hpfStages.order1;
const hpf_order2_stages = hpfStages.order2;
const lpf_order1_stages = lpfStages.order1;
const lpf_order2_stages = lpfStages.order2;
const totalHPFStages = hpf_order1_stages + hpf_order2_stages;
const totalLPFStages = lpf_order1_stages + lpf_order2_stages;

// --- Ensure proper reinitialization when slope parameters change ---
if (!context.lastSlopes || context.lastSlopes.hpf !== hpfSlope || context.lastSlopes.lpf !== lpfSlope) {
  context.filterStates = null;
  context.lastSlopes = { hpf: hpfSlope, lpf: lpfSlope };
  context.initialized = false;
}

// Initialize or reset filter states if needed.
// For first-order sections, we store one previous input and one previous output.
// For second-order sections, we store two previous inputs and two previous outputs.
if (!context.initialized ||
    !context.filterStates ||
    context.filterStates.hpf.length !== totalHPFStages ||
    context.filterStates.lpf.length !== totalLPFStages) {
  const createState = (order) => {
    if (order === 1) {
      return { x1: new Array(channelCount).fill(0), y1: new Array(channelCount).fill(0) };
    } else { // order === 2
      return {
        x1: new Array(channelCount).fill(0),
        x2: new Array(channelCount).fill(0),
        y1: new Array(channelCount).fill(0),
        y2: new Array(channelCount).fill(0)
      };
    }
  };
  context.filterStates = { hpf: [], lpf: [] };
  for (let s = 0; s < hpf_order1_stages; s++) {
    context.filterStates.hpf.push(createState(1));
  }
  for (let s = 0; s < hpf_order2_stages; s++) {
    context.filterStates.hpf.push(createState(2));
  }
  for (let s = 0; s < lpf_order1_stages; s++) {
    context.filterStates.lpf.push(createState(1));
  }
  for (let s = 0; s < lpf_order2_stages; s++) {
    context.filterStates.lpf.push(createState(2));
  }
  context.initialized = true;
}

// --- Pre-calculate filter coefficients ---

// First-order high-pass (HPF) coefficients (using bilinear transform)
// Standard high-pass: y[n] = (1/(1+c))·(x[n] - x[n-1]) + ((1-c)/(1+c))·y[n-1]
let hp1_b0, hp1_b1, hp1_a1;
if (hpf_order1_stages > 0) {
  let c = Math.tan(Math.PI * hpfFreq / sampleRate);
  hp1_b0 = 1 / (1 + c);
  hp1_b1 = -1 / (1 + c);
  hp1_a1 = -((1 - c) / (1 + c));
}

// Second-order high-pass (HPF) coefficients (Butterworth, Q = 1/√2)
let hp2_b0, hp2_b1, hp2_b2, hp2_a1, hp2_a2;
if (hpf_order2_stages > 0) {
  let w0 = 2 * Math.PI * hpfFreq / sampleRate;
  let Q = 1 / Math.SQRT2;
  let alpha = Math.sin(w0) / (2 * Q);
  let a0 = 1 + alpha;
  hp2_b0 = ((1 + Math.cos(w0)) / 2) / a0;
  hp2_b1 = (-(1 + Math.cos(w0))) / a0;
  hp2_b2 = ((1 + Math.cos(w0)) / 2) / a0;
  hp2_a1 = (-2 * Math.cos(w0)) / a0;
  hp2_a2 = (1 - alpha) / a0;
}

// First-order low-pass (LPF) coefficients (using bilinear transform)
// Standard low-pass: y[n] = (c/(1+c))·(x[n] + x[n-1]) + ((1-c)/(1+c))·y[n-1]
let lp1_b0, lp1_b1, lp1_a1;
if (lpf_order1_stages > 0) {
  let c = Math.tan(Math.PI * lpfFreq / sampleRate);
  lp1_b0 = c / (1 + c);
  lp1_b1 = c / (1 + c);
  lp1_a1 = -((1 - c) / (1 + c));
}

// Second-order low-pass (LPF) coefficients (Butterworth, Q = 1/√2)
let lp2_b0, lp2_b1, lp2_b2, lp2_a1, lp2_a2;
if (lpf_order2_stages > 0) {
  let w0 = 2 * Math.PI * lpfFreq / sampleRate;
  let Q = 1 / Math.SQRT2;
  let alpha = Math.sin(w0) / (2 * Q);
  let a0 = 1 + alpha;
  lp2_b0 = ((1 - Math.cos(w0)) / 2) / a0;
  lp2_b1 = (1 - Math.cos(w0)) / a0;
  lp2_b2 = ((1 - Math.cos(w0)) / 2) / a0;
  lp2_a1 = (-2 * Math.cos(w0)) / a0;
  lp2_a2 = (1 - alpha) / a0;
}

// --- Process audio ---
for (let ch = 0, offset = 0; ch < channelCount; ch++, offset += blockSize) {
  for (let i = 0; i < blockSize; i++) {
    let sample = data[offset + i];
    
    // ----- High-Pass Filtering -----
    let stageIndex = 0;
    // Process first-order HPF stages (if any)
    for (let s = 0; s < hpf_order1_stages; s++, stageIndex++) {
      let state = context.filterStates.hpf[stageIndex];
      let x = sample;
      // Difference eq: y = hp1_b0*x + hp1_b1*x_prev - hp1_a1*y_prev
      let y = hp1_b0 * x + hp1_b1 * state.x1[ch] - hp1_a1 * state.y1[ch];
      state.x1[ch] = x;
      state.y1[ch] = y;
      sample = y;
    }
    // Process second-order HPF stages (if any)
    for (let s = 0; s < hpf_order2_stages; s++, stageIndex++) {
      let state = context.filterStates.hpf[stageIndex];
      let x = sample;
      // Difference eq: y = hp2_b0*x + hp2_b1*x_prev + hp2_b2*x_prev2 - hp2_a1*y_prev - hp2_a2*y_prev2
      let y = hp2_b0 * x + hp2_b1 * state.x1[ch] + hp2_b2 * state.x2[ch]
              - hp2_a1 * state.y1[ch] - hp2_a2 * state.y2[ch];
      state.x2[ch] = state.x1[ch];
      state.x1[ch] = x;
      state.y2[ch] = state.y1[ch];
      state.y1[ch] = y;
      sample = y;
    }
    
    // ----- Low-Pass Filtering -----
    stageIndex = 0;
    // Process first-order LPF stages (if any)
    for (let s = 0; s < lpf_order1_stages; s++, stageIndex++) {
      let state = context.filterStates.lpf[stageIndex];
      let x = sample;
      // Difference eq: y = lp1_b0*x + lp1_b1*x_prev - lp1_a1*y_prev
      let y = lp1_b0 * x + lp1_b1 * state.x1[ch] - lp1_a1 * state.y1[ch];
      state.x1[ch] = x;
      state.y1[ch] = y;
      sample = y;
    }
    // Process second-order LPF stages (if any)
    for (let s = 0; s < lpf_order2_stages; s++, stageIndex++) {
      let state = context.filterStates.lpf[stageIndex];
      let x = sample;
      // Difference eq: y = lp2_b0*x + lp2_b1*x_prev + lp2_b2*x_prev2 - lp2_a1*y_prev - lp2_a2*y_prev2
      let y = lp2_b0 * x + lp2_b1 * state.x1[ch] + lp2_b2 * state.x2[ch]
              - lp2_a1 * state.y1[ch] - lp2_a2 * state.y2[ch];
      state.x2[ch] = state.x1[ch];
      state.x1[ch] = x;
      state.y2[ch] = state.y1[ch];
      state.y1[ch] = y;
      sample = y;
    }
    
    data[offset + i] = sample;
  }
}
return data;
`;

// Optimized NarrowRangePlugin class with simplified UI creation
class NarrowRangePlugin extends PluginBase {
  constructor() {
    super("Narrow Range", "High-pass and low-pass filter combination for narrow band filtering (crossover-capable)");
    this.hf = 60;    // HPF Frequency in Hz
    this.hs = -24;   // HPF Slope (allowed values: 0, -6, -12, -18, -24, -30, -36, -42, -48 dB/oct)
    this.lf = 5000;  // LPF Frequency in Hz
    this.ls = -12;   // LPF Slope (allowed values: 0, -6, -12, -18, -24, -30, -36, -42, -48 dB/oct)
    this.registerProcessor(processorFunction);
  }

  setHf(freq) { this.setParameters({ hf: freq }); }
  setHs(slope) { this.setParameters({ hs: slope }); }
  setLf(freq) { this.setParameters({ lf: freq }); }
  setLs(slope) { this.setParameters({ ls: slope }); }

  getParameters() {
    return {
      type: this.constructor.name,
      enabled: this.enabled,
      hf: this.hf,
      hs: this.hs,
      lf: this.lf,
      ls: this.ls
    };
  }

  setParameters(params) {
    if (params.enabled !== undefined) this.enabled = params.enabled;
    if (params.hf !== undefined)
      this.hf = Math.max(20, Math.min(4000, typeof params.hf === "number" ? params.hf : parseFloat(params.hf)));
    if (params.hs !== undefined) {
      const intSlope = typeof params.hs === "number" ? params.hs : parseInt(params.hs);
      const allowed = [0, -6, -12, -18, -24, -30, -36, -42, -48];
      this.hs = allowed.includes(intSlope) ? intSlope : -12;
    }
    if (params.lf !== undefined)
      this.lf = Math.max(200, Math.min(40000, typeof params.lf === "number" ? params.lf : parseFloat(params.lf)));
    if (params.ls !== undefined) {
      const intSlope = typeof params.ls === "number" ? params.ls : parseInt(params.ls);
      const allowed = [0, -6, -12, -18, -24, -30, -36, -42, -48];
      this.ls = allowed.includes(intSlope) ? intSlope : -12;
    }
    this.updateParameters();
  }

  createUI() {
    const container = document.createElement("div");
    container.className = "narrow-range-plugin-ui plugin-parameter-ui";

    // Helper to create a parameter row with slider and number input
    const createRow = (labelText, min, max, step, value, onInput) => {
      const row = document.createElement("div");
      row.className = "parameter-row";
      const label = document.createElement("label");
      label.textContent = labelText;
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = min;
      slider.max = max;
      slider.step = step;
      slider.value = value;
      const numberInput = document.createElement("input");
      numberInput.type = "number";
      numberInput.min = min;
      numberInput.max = max;
      numberInput.step = step;
      numberInput.value = value;
      slider.addEventListener("input", e => {
        onInput(parseFloat(e.target.value));
        numberInput.value = labelText.includes("HPF") ? this.hf : this.lf;
        this.drawGraph(canvas);
      });
      numberInput.addEventListener("input", e => {
        onInput(parseFloat(e.target.value) || 0);
        slider.value = labelText.includes("HPF") ? this.hf : this.lf;
        this.drawGraph(canvas);
        e.target.value = labelText.includes("HPF") ? this.hf : this.lf;
      });
      row.appendChild(label);
      row.appendChild(slider);
      row.appendChild(numberInput);
      return row;
    };

    // Helper to create a slope select box
    const createSlopeSelect = (current, onChange) => {
      const select = document.createElement("select");
      select.className = "slope-select";
      const slopes = [0, -6, -12, -18, -24, -30, -36, -42, -48];
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

    // Create HPF and LPF parameter rows
    const hpfRow = createRow("HPF Freq (Hz):", 20, 4000, 1, this.hf, v => this.setHf(v));
    hpfRow.appendChild(createSlopeSelect(this.hs, v => this.setHs(v)));
    const lpfRow = createRow("LPF Freq (Hz):", 200, 40000, 100, this.lf, v => this.setLf(v));
    lpfRow.appendChild(createSlopeSelect(this.ls, v => this.setLs(v)));

    // Create graph container and canvas
    const graphContainer = document.createElement("div");
    graphContainer.style.position = "relative";
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 480;
    canvas.style.width = "600px";
    canvas.style.height = "240px";
    graphContainer.appendChild(canvas);

    container.appendChild(hpfRow);
    container.appendChild(lpfRow);
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
    const freqs = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    freqs.forEach(freq => {
      const x = width * (Math.log10(freq) - Math.log10(20)) / (Math.log10(40000) - Math.log10(20));
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      if (freq > 20 && freq < 40000) {
        ctx.fillStyle = "#666";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(freq >= 1000 ? `${freq/1000}k` : freq, x, height - 40);
      }
    });
    const dBs = [-30, -24, -18, -12, -6, 0];
    dBs.forEach(db => {
      const y = height * (1 - (db + 30) / 36);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      if (db > -30 && db < 6) {
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

    // In the graph, recalc the overall magnitude response using the same
    // stage computation as in the processor.
    function computeStages(slope) {
      const absSlope = Math.abs(slope);
      if (absSlope === 0) return { order1: 0, order2: 0 };
      const n = absSlope / 6;
      if (n % 2 === 1) {
        return { order1: 1, order2: (n - 1) / 2 };
      } else {
        return { order1: 0, order2: n / 2 };
      }
    }
    const hpfStages = computeStages(this.hs);
    const lpfStages = computeStages(this.ls);

    ctx.beginPath();
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;
    for (let i = 0; i < width; i++) {
      const freq = Math.pow(10, Math.log10(20) + (i / width) * (Math.log10(40000) - Math.log10(20)));
      
      // High-pass response
      let hpfMag = 1;
      if (this.hs !== 0) {
        const wRatio = freq / this.hf;
        if (hpfStages.order1 > 0) {
          hpfMag *= (wRatio / Math.sqrt(1 + wRatio * wRatio));
        }
        if (hpfStages.order2 > 0) {
          const secondOrder = (wRatio * wRatio) / Math.sqrt(1 + 2 * wRatio * wRatio + Math.pow(wRatio, 4));
          hpfMag *= Math.pow(secondOrder, hpfStages.order2);
        }
      }
      
      // Low-pass response
      let lpfMag = 1;
      if (this.ls !== 0) {
        const wRatio = freq / this.lf;
        if (lpfStages.order1 > 0) {
          lpfMag *= (1 / Math.sqrt(1 + wRatio * wRatio));
        }
        if (lpfStages.order2 > 0) {
          const secondOrder = 1 / Math.sqrt(1 + 2 * wRatio * wRatio + Math.pow(wRatio, 4));
          lpfMag *= Math.pow(secondOrder, lpfStages.order2);
        }
      }
      const totalMag = hpfMag * lpfMag;
      const response = 20 * Math.log10(totalMag);
      const y = height * (1 - (response + 30) / 36);
      i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
    }
    ctx.stroke();
  }
}

window.NarrowRangePlugin = NarrowRangePlugin;
