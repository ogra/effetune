// Processor function optimized for simplicity and speed
const processorFunction = `
if (!parameters.enabled) return data;

// Map shortened parameter names for clarity
const { hf: hpfFreq, hs: hpfSlope, lf: lpfFreq, ls: lpfSlope, channelCount, blockSize } = parameters;

// Initialize or reset filter states if needed
if (!context.initialized || context.filterStates.hpf1.length !== channelCount) {
  const initArray = () => new Array(channelCount).fill(0);
  context.filterStates = {
    // HPF states (first stage)
    hpf1: initArray(), hpf2: initArray(), hpf3: initArray(), hpf4: initArray(),
    // HPF states (second stage for -12dB/oct)
    hpf5: initArray(), hpf6: initArray(), hpf7: initArray(), hpf8: initArray(),
    // LPF states (first stage)
    lpf1: initArray(), lpf2: initArray(), lpf3: initArray(), lpf4: initArray(),
    // LPF states (second stage for -12dB/oct)
    lpf5: initArray(), lpf6: initArray(), lpf7: initArray(), lpf8: initArray()
  };
  context.initialized = true;
}

const fs = context.filterStates;
const twoPi = 2 * Math.PI;
const hpfW0 = twoPi * hpfFreq / sampleRate;
const lpfW0 = twoPi * lpfFreq / sampleRate;
const hpfQ = hpfSlope === -12 ? 0.707 : 0.5;
const lpfQ = lpfSlope === -12 ? 0.707 : 0.5;
const hpfAlpha = Math.sin(hpfW0) / (2 * hpfQ);
const lpfAlpha = Math.sin(lpfW0) / (2 * lpfQ);
const hpfCos = Math.cos(hpfW0);
const lpfCos = Math.cos(lpfW0);

// HPF coefficients
const hpfA0 = 1 + hpfAlpha;
const hpfA1 = -2 * hpfCos;
const hpfA2 = 1 - hpfAlpha;
const hpfB0 = (1 + hpfCos) / 2;
const hpfB1 = -(1 + hpfCos);
const hpfB2 = hpfB0;

// LPF coefficients
const lpfA0 = 1 + lpfAlpha;
const lpfA1 = -2 * lpfCos;
const lpfA2 = 1 - lpfAlpha;
const lpfB0 = (1 - lpfCos) / 2;
const lpfB1 = 1 - lpfCos;
const lpfB2 = lpfB0;

// Determine if cascaded stages are needed
const doHpf2 = hpfSlope === -12;
const doLpf2 = lpfSlope === -12;

for (let ch = 0, offset = 0; ch < channelCount; ch++, offset += blockSize) {
  for (let i = 0; i < blockSize; i++) {
    let sample = data[offset + i], x, y;
    
    // First-stage HPF
    x = sample;
    y = (hpfB0 * x + hpfB1 * fs.hpf1[ch] + hpfB2 * fs.hpf2[ch] - hpfA1 * fs.hpf3[ch] - hpfA2 * fs.hpf4[ch]) / hpfA0;
    fs.hpf2[ch] = fs.hpf1[ch];
    fs.hpf1[ch] = x;
    fs.hpf4[ch] = fs.hpf3[ch];
    fs.hpf3[ch] = y;
    sample = y;
    
    // Second-stage HPF for -12dB/oct
    if (doHpf2) {
      x = sample;
      y = (hpfB0 * x + hpfB1 * fs.hpf5[ch] + hpfB2 * fs.hpf6[ch] - hpfA1 * fs.hpf7[ch] - hpfA2 * fs.hpf8[ch]) / hpfA0;
      fs.hpf6[ch] = fs.hpf5[ch];
      fs.hpf5[ch] = x;
      fs.hpf8[ch] = fs.hpf7[ch];
      fs.hpf7[ch] = y;
      sample = y;
    }
    
    // First-stage LPF
    x = sample;
    y = (lpfB0 * x + lpfB1 * fs.lpf1[ch] + lpfB2 * fs.lpf2[ch] - lpfA1 * fs.lpf3[ch] - lpfA2 * fs.lpf4[ch]) / lpfA0;
    fs.lpf2[ch] = fs.lpf1[ch];
    fs.lpf1[ch] = x;
    fs.lpf4[ch] = fs.lpf3[ch];
    fs.lpf3[ch] = y;
    sample = y;
    
    // Second-stage LPF for -12dB/oct
    if (doLpf2) {
      x = sample;
      y = (lpfB0 * x + lpfB1 * fs.lpf5[ch] + lpfB2 * fs.lpf6[ch] - lpfA1 * fs.lpf7[ch] - lpfA2 * fs.lpf8[ch]) / lpfA0;
      fs.lpf6[ch] = fs.lpf5[ch];
      fs.lpf5[ch] = x;
      fs.lpf8[ch] = fs.lpf7[ch];
      fs.lpf7[ch] = y;
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
    super('Narrow Range', 'High-pass and low-pass filter combination for narrow band filtering');
    this.hf = 60;    // HPF Frequency
    this.hs = -12;   // HPF Slope (-6 or -12 dB/oct)
    this.lf = 5000;  // LPF Frequency
    this.ls = -6;    // LPF Slope (-6 or -12 dB/oct)
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
      this.hf = Math.max(20, Math.min(1000, typeof params.hf === 'number' ? params.hf : parseFloat(params.hf)));
    if (params.hs !== undefined) {
      const intSlope = typeof params.hs === 'number' ? params.hs : parseInt(params.hs);
      this.hs = intSlope === -12 ? -12 : -6;
    }
    if (params.lf !== undefined)
      this.lf = Math.max(1000, Math.min(20000, typeof params.lf === 'number' ? params.lf : parseFloat(params.lf)));
    if (params.ls !== undefined) {
      const intSlope = typeof params.ls === 'number' ? params.ls : parseInt(params.ls);
      this.ls = intSlope === -12 ? -12 : -6;
    }
    this.updateParameters();
  }

  createUI() {
    const container = document.createElement('div');
    container.className = 'narrow-range-plugin-ui plugin-parameter-ui';

    // Helper to create a parameter row with slider and number input
    const createRow = (labelText, min, max, step, value, onInput) => {
      const row = document.createElement('div');
      row.className = 'parameter-row';
      const label = document.createElement('label');
      label.textContent = labelText;
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
      slider.addEventListener('input', e => {
        onInput(parseFloat(e.target.value));
        numberInput.value = onInput === this.setHf ? this.hf : this.lf;
        this.drawGraph(canvas);
      });
      numberInput.addEventListener('input', e => {
        onInput(parseFloat(e.target.value) || 0);
        slider.value = onInput === this.setHf ? this.hf : this.lf;
        this.drawGraph(canvas);
        e.target.value = onInput === this.setHf ? this.hf : this.lf;
      });
      row.appendChild(label);
      row.appendChild(slider);
      row.appendChild(numberInput);
      return row;
    };

    // Helper to create a slope radio group
    const createRadioGroup = (name, current, onChange) => {
      const group = document.createElement('div');
      group.className = 'radio-group';
      [-6, -12].forEach(slope => {
        const label = document.createElement('label');
        label.className = 'radio-label';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = name;
        radio.value = slope;
        radio.checked = current === slope;
        radio.addEventListener('change', e => {
          onChange(parseInt(e.target.value));
          this.drawGraph(canvas);
        });
        label.appendChild(radio);
        label.appendChild(document.createTextNode(`${Math.abs(slope)}dB/oct`));
        group.appendChild(label);
      });
      return group;
    };

    // Create HPF and LPF parameter rows
    const hpfRow = createRow('HPF Freq (Hz):', 20, 1000, 1, this.hf, v => this.setHf(v));
    hpfRow.appendChild(createRadioGroup(`hpf-slope-${this.id}`, this.hs, v => this.setHs(v)));
    const lpfRow = createRow('LPF Freq (Hz):', 1000, 20000, 100, this.lf, v => this.setLf(v));
    lpfRow.appendChild(createRadioGroup(`lpf-slope-${this.id}`, this.ls, v => this.setLs(v)));

    // Create graph container and canvas
    const graphContainer = document.createElement('div');
    graphContainer.style.position = 'relative';
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 480;
    canvas.style.width = '600px';
    canvas.style.height = '240px';
    graphContainer.appendChild(canvas);

    container.appendChild(hpfRow);
    container.appendChild(lpfRow);
    container.appendChild(graphContainer);
    this.drawGraph(canvas);
    return container;
  }

  drawGraph(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width, height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    const freqs = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
    freqs.forEach(freq => {
      const x = width * (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      if (freq > 20 && freq < 20000) {
        ctx.fillStyle = '#666';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
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
        ctx.fillStyle = '#666';
        ctx.font = '20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`${db}dB`, 80, y + 6);
      }
    });
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Frequency (Hz)', width / 2, height - 5);
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Level (dB)', 0, 0);
    ctx.restore();

    // Draw frequency response curve
    ctx.beginPath();
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    for (let i = 0; i < width; i++) {
      const freq = Math.pow(10, Math.log10(20) + (i / width) * (Math.log10(20000) - Math.log10(20)));
      const hpfOmega = freq / this.hf;
      const lpfOmega = freq / this.lf;
      const hpfBase = Math.sqrt((hpfOmega * hpfOmega) / (1 + hpfOmega * hpfOmega));
      const lpfBase = Math.sqrt(1 / (1 + lpfOmega * lpfOmega));
      const hpfMag = this.hs === -12 ? hpfBase * hpfBase : hpfBase;
      const lpfMag = this.ls === -12 ? lpfBase * lpfBase : lpfBase;
      const totalMag = hpfMag * lpfMag;
      const response = 20 * Math.log10(totalMag);
      const y = height * (1 - (response + 30) / 36);
      i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
    }
    ctx.stroke();
  }
}

window.NarrowRangePlugin = NarrowRangePlugin;
