class StereoMeterPlugin extends PluginBase {
  constructor() {
    super('Stereo Meter', 'Stereo balance and phase visualization');

    // Parameter initialization (Window: 10–1000 ms, default 100 ms)
    this.windowTime = 0.1; // 0.1 sec = 100 ms

    // Canvas and drawing setup
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.lastDrawTime = 0;

    // Sample rate (will be updated from processor parameters)
    this.sampleRate = 44100;

    // Internal event listener bookkeeping
    this.boundEventListeners = new Map();

    // Precompute a color lookup table for green values (0–255)
    this._colorLookup = new Array(256);
    for (let i = 0; i < 256; i++) {
      this._colorLookup[i] = `rgb(0,${i},0)`;
    }

    // Register the Audio Worklet Processor
    this.registerProcessor(`
      // Compute a dynamic buffer size based on the sample rate.
      const maxWindowSec = 1.0; // Maximum window time (1 second)
      const requiredSamples = Math.ceil(parameters.sampleRate * maxWindowSec);
      let computedBufferSize = 1;
      while (computedBufferSize < requiredSamples) {
        computedBufferSize *= 2;
      }
      
      // Initialize or update state if the buffer size has changed.
      if (!context.initialized || context.bufferSize !== computedBufferSize) {
        context.bufferSize = computedBufferSize;
        const { channelCount } = parameters;
        context.buffer = new Array(channelCount);
        for (let i = 0; i < channelCount; i++) {
          context.buffer[i] = new Float32Array(context.bufferSize);
        }
        context.bufferPosition = 0;
        context.initialized = true;
        context.lastPeakUpdateTime = time;
        context.xBuffer = new Float32Array(context.bufferSize);
        context.yBuffer = new Float32Array(context.bufferSize);
        context.peakBuffer = new Float32Array(360);
      }

      // Copy the input data to a result buffer.
      const result = new Float32Array(data.length);
      result.set(data);

      const { channelCount, blockSize } = parameters;
      
      // Process each sample in the current block.
      for (let i = 0; i < blockSize; i++) {
        const left = data[i];
        const right = data[i + blockSize];

        // Calculate x and y values.
        const x = right - left; // x = R - L
        const y = left + right; // y = L + R

        // Store x and y in circular buffers.
        context.xBuffer[context.bufferPosition] = x;
        context.yBuffer[context.bufferPosition] = y;

        // Compute angle (in degrees) and magnitude.
        const angle = -Math.atan2(y, x) * 180 / Math.PI;
        const magnitude = Math.sqrt(x * x + y * y);

        // Update the peak value for the corresponding angle.
        const angleIndex = ((Math.round(angle) % 360) + 360) % 360;
        if (magnitude > context.peakBuffer[angleIndex]) {
          context.peakBuffer[angleIndex] = magnitude;
        }

        // Advance the circular buffer position.
        context.bufferPosition = (context.bufferPosition + 1) & (context.bufferSize - 1);
      }

      // Apply a peak decay of -20 dB/s.
      const timeDelta = time - context.lastPeakUpdateTime;
      if (timeDelta > 0) {
        const decayFactor = Math.pow(10, -timeDelta);
        for (let i = 0; i < 360; i++) {
          context.peakBuffer[i] *= decayFactor;
        }
        context.lastPeakUpdateTime = time;
      }

      result.measurements = {
        xBuffer: context.xBuffer,
        yBuffer: context.yBuffer,
        peakBuffer: context.peakBuffer,
        currentPosition: context.bufferPosition,
        time: time,
        sampleRate: parameters.sampleRate
      };

      return result;
    `);
  }

  createUI() {
    const container = document.createElement('div');
    container.className = 'plugin-parameter-ui stereo-meter';

    // Create window time controls.
    const windowRow = document.createElement('div');
    windowRow.className = 'parameter-row';

    const windowLabel = document.createElement('label');
    windowLabel.textContent = 'Window (ms):';
    windowLabel.htmlFor = `${this.id}-${this.name}-window-slider`;

    const windowSlider = document.createElement('input');
    windowSlider.type = 'range';
    windowSlider.id = `${this.id}-${this.name}-window-slider`;
    windowSlider.name = `${this.id}-${this.name}-window-slider`;
    windowSlider.min = 10;
    windowSlider.max = 1000;
    windowSlider.step = 1;
    windowSlider.value = (this.windowTime * 1000).toFixed(0);
    windowSlider.autocomplete = "off";

    const windowValue = document.createElement('input');
    windowValue.type = 'number';
    windowValue.id = `${this.id}-${this.name}-window-value`;
    windowValue.name = `${this.id}-${this.name}-window-value`;
    windowValue.value = (this.windowTime * 1000).toFixed(0);
    windowValue.step = 1;
    windowValue.min = 10;
    windowValue.max = 1000;
    windowValue.autocomplete = "off";

    const windowHandler = (e) => {
      const value = parseFloat(e.target.value) / 1000; // Convert ms to seconds.
      windowValue.value = (value * 1000).toFixed(0);
      windowSlider.value = (value * 1000).toFixed(0);
      this.setWindowTime(value);
    };

    windowSlider.addEventListener('input', windowHandler);
    windowValue.addEventListener('change', windowHandler);
    this.boundEventListeners.set(windowSlider, windowHandler);
    this.boundEventListeners.set(windowValue, windowHandler);

    windowRow.appendChild(windowLabel);
    windowRow.appendChild(windowSlider);
    windowRow.appendChild(windowValue);
    container.appendChild(windowRow);

    // Create the graph container and canvas.
    const graphContainer = document.createElement('div');
    graphContainer.className = 'graph-container';

    this.canvas = document.createElement('canvas');
    this.canvas.width = 480;
    this.canvas.height = 480;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    graphContainer.appendChild(this.canvas);

    container.appendChild(graphContainer);

    // Start the animation loop.
    this.startAnimation();

    return container;
  }

  setWindowTime(value) {
    const newValue = typeof value === 'number' ? value : parseFloat(value);
    if (!isNaN(newValue)) {
      // Clamp the value between 10 ms (0.01 sec) and 1000 ms (1 sec).
      this.windowTime = Math.max(0.01, Math.min(newValue, 1.0));
    }
    this.updateParameters();
  }

  getParameters() {
    return {
      type: this.constructor.name,
      enabled: this.enabled,
      wt: this.windowTime
    };
  }

  setParameters(params) {
    if (params.wt !== undefined) this.setWindowTime(params.wt);
    this.updateParameters();
  }

  onMessage(message) {
    if (message.type === 'processBuffer' && message.measurements) {
      this.process(message.measurements);
    }
  }

  process(measurements) {
    if (!measurements || !this.enabled) {
      return;
    }
    if (measurements.sampleRate) {
      this.sampleRate = measurements.sampleRate;
    }
    this.currentMeasurements = measurements;
  }

  startAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    const animate = (timestamp) => {
      if (!this.canvas) return;
      // Draw at approximately 60 FPS (~16 ms interval)
      if (timestamp - this.lastDrawTime >= 16) {
        this.drawMeter();
        this.lastDrawTime = timestamp;
      }
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  drawMeter() {
    if (!this.currentMeasurements) return;

    const { ctx, canvas } = this;
    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const size = Math.min(width, height);
    const radius = size * 0.45;

    // Clear the canvas.
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Draw the diamond shape.
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX + radius, centerY);
    ctx.lineTo(centerX, centerY + radius);
    ctx.lineTo(centerX - radius, centerY);
    ctx.closePath();
    ctx.stroke();

    // Draw vertical and horizontal grid lines.
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();

    // Draw additional 45-degree grid lines.
    ctx.beginPath();
    for (let angle = 45; angle < 360; angle += 90) {
      const rad = angle * Math.PI / 180;
      const x = Math.cos(rad);
      const y = Math.sin(rad);
      ctx.moveTo(centerX, centerY);
      const scale = Math.min(Math.abs(radius / x), Math.abs(radius / y));
      ctx.lineTo(centerX + x * scale, centerY + y * scale);
    }
    ctx.stroke();

    // Draw labels.
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelOffset = 96;
    ctx.fillText('L+', centerX - radius + labelOffset, centerY - radius + labelOffset);
    ctx.fillText('R-', centerX - radius + labelOffset, centerY + radius - labelOffset);
    ctx.fillText('R+', centerX + radius - labelOffset, centerY - radius + labelOffset);
    ctx.fillText('L-', centerX + radius - labelOffset, centerY + radius - labelOffset);

    // Optimized drawing of xy samples.
    const samplesNeeded = Math.ceil(this.windowTime * this.sampleRate);
    const { xBuffer, yBuffer } = this.currentMeasurements;
    const bufferLength = xBuffer.length;
    const endPos = this.currentMeasurements.currentPosition;
    const startIndex = (endPos - samplesNeeded + bufferLength) % bufferLength;

    // Create buckets for each green value (0–255)
    const buckets = new Array(256);
    for (let i = 0; i < 256; i++) {
      buckets[i] = [];
    }
    
    // Distribute samples into buckets based on intensity.
    for (let i = 0; i < samplesNeeded; i++) {
      const pos = (startIndex + i) % bufferLength;
      const sampleX = xBuffer[pos];
      const sampleY = yBuffer[pos];
      const screenX = centerX + (sampleX * 0.5) * radius;
      const screenY = centerY - (sampleY * 0.5) * radius;
      
      // Calculate intensity from 0 to 1 (older samples are darker).
      const intensity = samplesNeeded > 1 ? (i / (samplesNeeded - 1)) : 0;
      const green = Math.floor(255 * intensity);
      buckets[green].push({ x: screenX, y: screenY });
    }
    
    // Batch draw points for each color bucket.
    for (let g = 0; g < 256; g++) {
      const points = buckets[g];
      if (points.length === 0) continue;
      
      ctx.fillStyle = this._colorLookup[g];
      ctx.beginPath();
      for (let j = 0; j < points.length; j++) {
        ctx.rect(points[j].x - 1, points[j].y - 1, 1, 1);
      }
      ctx.fill();
    }

    // Smooth the 360° peak buffer using a Gaussian (sigma = 5°).
    const smoothedPeaks = new Float32Array(360);
    const sigma = 5;
    const gaussianRange = Math.ceil(sigma * 3);
    const { peakBuffer } = this.currentMeasurements;
    
    for (let i = 0; i < 360; i++) {
      let sum = 0;
      let weightSum = 0;
      for (let j = -gaussianRange; j <= gaussianRange; j++) {
        const angle = ((i + j) % 360 + 360) % 360;
        const weight = Math.exp(-(j * j) / (2 * sigma * sigma));
        sum += peakBuffer[angle] * weight;
        weightSum += weight;
      }
      smoothedPeaks[i] = sum / weightSum;
    }
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 360; i++) {
      const rad = i * Math.PI / 180;
      const r = smoothedPeaks[i] * 0.5 * radius;
      const x = centerX + Math.cos(rad) * r;
      const y = centerY + Math.sin(rad) * r;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();

    // Calculate correlation and energy difference.
    let sumLR = 0, sumL2 = 0, sumR2 = 0;
    let energyL = 0, energyR = 0;
    for (let i = 0; i < samplesNeeded; i++) {
      const pos = (startIndex + i) % bufferLength;
      const x = xBuffer[pos];
      const y = yBuffer[pos];
      // Restore left (L) and right (R) channels.
      const L = (y - x) / 2;
      const R = (x + y) / 2;
      sumLR += L * R;
      sumL2 += L * L;
      sumR2 += R * R;
      energyL += L * L;
      energyR += R * R;
    }
    let correlation = 0;
    if (sumL2 > 0 && sumR2 > 0) {
      correlation = sumLR / Math.sqrt(sumL2 * sumR2);
    }
    const epsilon = 1e-12;
    const energyL_dB = 10 * Math.log10(energyL + epsilon);
    const energyR_dB = 10 * Math.log10(energyR + epsilon);
    const energyDiff = energyR_dB - energyL_dB;

    // Draw the correlation bar on the left edge.
    const barThickness = 16;
    const corrBarHeight = Math.abs(correlation) * centerY;
    ctx.fillStyle = '#008000';
    if (correlation >= 0) {
      ctx.fillRect(0, centerY - corrBarHeight, barThickness, corrBarHeight);
    } else {
      ctx.fillRect(0, centerY, barThickness, corrBarHeight);
    }

    // Draw correlation tick marks and labels.
    ctx.fillStyle = '#808080';
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 1;
    const corrTickX = 2;
    const correlationTicks = [0.5, 0, -0.5];
    correlationTicks.forEach(tick => {
      const yTick = centerY - (tick * centerY);
      ctx.beginPath();
      ctx.moveTo(corrTickX + 16, yTick);
      ctx.lineTo(corrTickX + 21, yTick);
      ctx.stroke();
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(tick.toFixed(1), corrTickX + 23, yTick);
    });

    // Draw the energy difference bar at the bottom.
    const energyMax = 18;
    const energyDiffClamped = Math.max(-energyMax, Math.min(energyMax, energyDiff));
    const halfCanvasWidth = width / 2;
    const energyBarLength = (energyDiffClamped / energyMax) * halfCanvasWidth;
    const energyBarY = height - barThickness;
    ctx.fillStyle = '#008000';
    if (energyBarLength >= 0) {
      ctx.fillRect(centerX, energyBarY, energyBarLength, barThickness);
    } else {
      ctx.fillRect(centerX + energyBarLength, energyBarY, -energyBarLength, barThickness);
    }

    // Draw energy tick marks and labels.
    ctx.fillStyle = '#808080';
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 1;
    const energyTicks = [-12, -6, 0, 6, 12];
    const energyTickY = height - 2;
    energyTicks.forEach(tick => {
      const xTick = centerX + (tick / energyMax) * halfCanvasWidth;
      ctx.beginPath();
      ctx.moveTo(xTick, energyTickY - 21);
      ctx.lineTo(xTick, energyTickY - 16);
      ctx.stroke();
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(tick.toString() + 'dB', xTick, energyTickY - 23);
    });

    // Draw axis labels.
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('LR Balance', width / 2, height - 1);
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('LR Correlation', 0, -3);
    ctx.restore();
  }

  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    for (const [element, listener] of this.boundEventListeners) {
      element.removeEventListener('change', listener);
      element.removeEventListener('input', listener);
    }
    this.boundEventListeners.clear();
  }
}

// Register the plugin globally
if (typeof window !== 'undefined') {
  window.StereoMeterPlugin = StereoMeterPlugin;
}
