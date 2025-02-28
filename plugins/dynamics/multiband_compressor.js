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

  // Returns the processor code string with optimized block processing
  getProcessorCode() {
    return `
      // Processor code for Multiband Compressor with optimized block processing
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

      // Cache filter coefficients if frequencies have changed
      if (!context.cachedFilters || !context.filterConfig || !context.filterConfig.frequencies ||
          frequencies.some((f, i) => f !== context.filterConfig.frequencies[i])) {
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

      // Helper function to apply filter to a block of samples (highly optimized)
      function applyFilterBlock(input, output, coeffs, state, ch, blockSize) {
        const { b0, b1, b2, a1, a2 } = coeffs;
        const s1 = state.stage1, s2 = state.stage2;
        
        // Local variables for filter state (faster access)
        let s1_x1 = s1.x1[ch], s1_x2 = s1.x2[ch], s1_y1 = s1.y1[ch], s1_y2 = s1.y2[ch];
        let s2_x1 = s2.x1[ch], s2_x2 = s2.x2[ch], s2_y1 = s2.y1[ch], s2_y2 = s2.y2[ch];
        
        // Process the entire block with loop unrolling for better performance
        // Process 4 samples at a time when possible
        const blockSizeMod4 = blockSize & ~3; // Fast way to calculate blockSize - (blockSize % 4)
        let i = 0;
        
        // Main loop with 4-sample unrolling
        for (; i < blockSizeMod4; i += 4) {
          // Sample 1
          let sample = input[i];
          let stage1_out = b0 * sample + b1 * s1_x1 + b2 * s1_x2 - a1 * s1_y1 - a2 * s1_y2;
          s1_x2 = s1_x1;
          s1_x1 = sample;
          s1_y2 = s1_y1;
          s1_y1 = stage1_out;
          
          let stage2_out = b0 * stage1_out + b1 * s2_x1 + b2 * s2_x2 - a1 * s2_y1 - a2 * s2_y2;
          s2_x2 = s2_x1;
          s2_x1 = stage1_out;
          s2_y2 = s2_y1;
          s2_y1 = stage2_out;
          
          output[i] = stage2_out;
          
          // Sample 2
          sample = input[i+1];
          stage1_out = b0 * sample + b1 * s1_x1 + b2 * s1_x2 - a1 * s1_y1 - a2 * s1_y2;
          s1_x2 = s1_x1;
          s1_x1 = sample;
          s1_y2 = s1_y1;
          s1_y1 = stage1_out;
          
          stage2_out = b0 * stage1_out + b1 * s2_x1 + b2 * s2_x2 - a1 * s2_y1 - a2 * s2_y2;
          s2_x2 = s2_x1;
          s2_x1 = stage1_out;
          s2_y2 = s2_y1;
          s2_y1 = stage2_out;
          
          output[i+1] = stage2_out;
          
          // Sample 3
          sample = input[i+2];
          stage1_out = b0 * sample + b1 * s1_x1 + b2 * s1_x2 - a1 * s1_y1 - a2 * s1_y2;
          s1_x2 = s1_x1;
          s1_x1 = sample;
          s1_y2 = s1_y1;
          s1_y1 = stage1_out;
          
          stage2_out = b0 * stage1_out + b1 * s2_x1 + b2 * s2_x2 - a1 * s2_y1 - a2 * s2_y2;
          s2_x2 = s2_x1;
          s2_x1 = stage1_out;
          s2_y2 = s2_y1;
          s2_y1 = stage2_out;
          
          output[i+2] = stage2_out;
          
          // Sample 4
          sample = input[i+3];
          stage1_out = b0 * sample + b1 * s1_x1 + b2 * s1_x2 - a1 * s1_y1 - a2 * s1_y2;
          s1_x2 = s1_x1;
          s1_x1 = sample;
          s1_y2 = s1_y1;
          s1_y1 = stage1_out;
          
          stage2_out = b0 * stage1_out + b1 * s2_x1 + b2 * s2_x2 - a1 * s2_y1 - a2 * s2_y2;
          s2_x2 = s2_x1;
          s2_x1 = stage1_out;
          s2_y2 = s2_y1;
          s2_y1 = stage2_out;
          
          output[i+3] = stage2_out;
        }
        
        // Handle remaining samples
        for (; i < blockSize; i++) {
          // First stage filtering
          const stage1_out = b0 * input[i] + b1 * s1_x1 + b2 * s1_x2 - a1 * s1_y1 - a2 * s1_y2;
          s1_x2 = s1_x1;
          s1_x1 = input[i];
          s1_y2 = s1_y1;
          s1_y1 = stage1_out;
          
          // Second stage filtering
          const stage2_out = b0 * stage1_out + b1 * s2_x1 + b2 * s2_x2 - a1 * s2_y1 - a2 * s2_y2;
          s2_x2 = s2_x1;
          s2_x1 = stage1_out;
          s2_y2 = s2_y1;
          s2_y1 = stage2_out;
          
          output[i] = stage2_out;
        }
        
        // Update filter state
        s1.x1[ch] = s1_x1; s1.x2[ch] = s1_x2; s1.y1[ch] = s1_y1; s1.y2[ch] = s1_y2;
        s2.x1[ch] = s2_x1; s2.x2[ch] = s2_x2; s2.y1[ch] = s2_y1; s2.y2[ch] = s2_y2;
      }

      // Create temporary buffers for intermediate results if they don't exist
      if (!context.tempBuffers || context.tempBuffers.length !== 3) {
        context.tempBuffers = [
          new Float32Array(parameters.blockSize),
          new Float32Array(parameters.blockSize),
          new Float32Array(parameters.blockSize)
        ];
      }

      // Process filtering for each channel (block processing)
      for (let ch = 0; ch < parameters.channelCount; ch++) {
        const offset = ch * parameters.blockSize;
        const bandSignals = context.bandSignals[ch];
        const filterStates = context.filterStates;
        
        // Extract channel data to temporary buffer
        const inputBuffer = context.tempBuffers[0];
        const hp1Buffer = context.tempBuffers[1];
        const hp2Buffer = context.tempBuffers[2];
        
        for (let i = 0; i < parameters.blockSize; i++) {
          inputBuffer[i] = data[offset + i];
        }
        
        // Apply filters in blocks for better cache locality
        // Band 0 (Low) - direct lowpass on input
        applyFilterBlock(inputBuffer, bandSignals[0], context.cachedFilters[0].lowpass, filterStates.lowpass[0], ch, parameters.blockSize);
        
        // Highpass branch for remaining bands
        applyFilterBlock(inputBuffer, hp1Buffer, context.cachedFilters[0].highpass, filterStates.highpass[0], ch, parameters.blockSize);
        
        // Band 1 (Low-Mid)
        applyFilterBlock(hp1Buffer, bandSignals[1], context.cachedFilters[1].lowpass, filterStates.lowpass[1], ch, parameters.blockSize);
        
        // Highpass for bands 2-4
        applyFilterBlock(hp1Buffer, hp2Buffer, context.cachedFilters[1].highpass, filterStates.highpass[1], ch, parameters.blockSize);
        
        // Band 2 (Mid)
        applyFilterBlock(hp2Buffer, bandSignals[2], context.cachedFilters[2].lowpass, filterStates.lowpass[2], ch, parameters.blockSize);
        
        // Highpass for bands 3-4
        applyFilterBlock(hp2Buffer, hp1Buffer, context.cachedFilters[2].highpass, filterStates.highpass[2], ch, parameters.blockSize); // Reuse hp1Buffer
        
        // Band 3 (High-Mid)
        applyFilterBlock(hp1Buffer, bandSignals[3], context.cachedFilters[3].lowpass, filterStates.lowpass[3], ch, parameters.blockSize);
        
        // Band 4 (High)
        applyFilterBlock(hp1Buffer, bandSignals[4], context.cachedFilters[3].highpass, filterStates.highpass[3], ch, parameters.blockSize);
      }

      // Prepare envelope and gain parameters
      if (!context.envelopeStates) {
        context.envelopeStates = new Float32Array(parameters.channelCount * 5).fill(1e-6);
      }
      
      // Precompute time constants if needed or if band parameters changed
      const sampleRateMs = parameters.sampleRate / 1000;
      const LOG2 = Math.log(2);
      let timeConstantsNeedUpdate = !context.timeConstants || context.timeConstants.length !== 10;
      
      if (!timeConstantsNeedUpdate && context.lastBandParams) {
        for (let b = 0; b < 5; b++) {
          const bandParams = parameters.bands[b];
          const lastParams = context.lastBandParams[b];
          if (bandParams.a !== lastParams.a || bandParams.rl !== lastParams.rl) {
            timeConstantsNeedUpdate = true;
            break;
          }
        }
      } else {
        timeConstantsNeedUpdate = true;
      }
      
      if (timeConstantsNeedUpdate) {
        if (!context.timeConstants) {
          context.timeConstants = new Float32Array(10); // 5 bands * 2 (attack & release)
        }
        if (!context.lastBandParams) {
          context.lastBandParams = new Array(5);
        }
        
        for (let b = 0; b < 5; b++) {
          const bandParams = parameters.bands[b];
          context.timeConstants[b * 2] = Math.exp(-LOG2 / Math.max(1, bandParams.a * sampleRateMs));
          context.timeConstants[b * 2 + 1] = Math.exp(-LOG2 / Math.max(1, bandParams.rl * sampleRateMs));
          
          // Store band params for future comparison
          context.lastBandParams[b] = {
            a: bandParams.a,
            rl: bandParams.rl
          };
        }
      }
      
      // Precompute band parameters to avoid recalculating in inner loops
      if (!context.bandParams) {
        context.bandParams = new Array(5);
      }
      
      const LOG10_20 = 8.685889638065035; // 20/ln(10)
      const gainFactor = 0.11512925464970229; // ln(10)/20
      
      for (let band = 0; band < 5; band++) {
        const bp = parameters.bands[band];
        if (!context.bandParams[band] || 
            context.bandParams[band].t !== bp.t || 
            context.bandParams[band].r !== bp.r || 
            context.bandParams[band].k !== bp.k || 
            context.bandParams[band].g !== bp.g) {
          
          const halfKnee = bp.k * 0.5;
          const invRatio = 1 - 1 / bp.r;
          
          context.bandParams[band] = {
            t: bp.t,
            r: bp.r,
            k: bp.k,
            g: bp.g,
            halfKnee: halfKnee,
            invRatio: invRatio,
            makeupGain: Math.exp(bp.g * gainFactor)
          };
        }
      }
      
      // Create output buffer for summing if it doesn't exist
      if (!context.outputBuffer || context.outputBuffer.length !== parameters.blockSize) {
        context.outputBuffer = new Float32Array(parameters.blockSize);
      }
      
      // Create shared work buffer for calculations if it doesn't exist
      if (!context.workBuffer || context.workBuffer.length !== parameters.blockSize) {
        context.workBuffer = new Float32Array(parameters.blockSize);
      }
      
      // Precompute lookup tables for expensive math operations if they don't exist
      if (!context.dbLookup) {
        // Create lookup table for LOG10_20 * Math.log(x) operation
        const LOG10_20 = 8.685889638065035; // 20/ln(10)
        const DB_LOOKUP_SIZE = 4096; // Increased for better precision
        const DB_LOOKUP_SCALE = DB_LOOKUP_SIZE / 10; // 0 to 10 range
        context.dbLookup = new Float32Array(DB_LOOKUP_SIZE);
        for (let i = 0; i < DB_LOOKUP_SIZE; i++) {
          const x = i / DB_LOOKUP_SCALE;
          if (x < 1e-6) {
            context.dbLookup[i] = -120; // Minimum dB value
          } else {
            context.dbLookup[i] = LOG10_20 * Math.log(x);
          }
        }
        
        // Create lookup table for Math.exp(-x * gainFactor) operation
        const EXP_LOOKUP_SIZE = 2048; // Increased for better precision
        const EXP_LOOKUP_SCALE = EXP_LOOKUP_SIZE / 60; // 0 to 60 dB range
        const gainFactor = 0.11512925464970229; // ln(10)/20
        context.expLookup = new Float32Array(EXP_LOOKUP_SIZE);
        for (let i = 0; i < EXP_LOOKUP_SIZE; i++) {
          const x = i / EXP_LOOKUP_SCALE;
          context.expLookup[i] = Math.exp(-x * gainFactor);
        }
        
        // Store constants for faster access
        context.DB_LOOKUP_SIZE = DB_LOOKUP_SIZE;
        context.DB_LOOKUP_SCALE = DB_LOOKUP_SCALE;
        context.EXP_LOOKUP_SIZE = EXP_LOOKUP_SIZE;
        context.EXP_LOOKUP_SCALE = EXP_LOOKUP_SCALE;
      }
      
      // Fast approximation functions using lookup tables
      function fastDb(x) {
        // Fast dB conversion using lookup table
        if (x <= 0) return -120;
        // Scale and clamp to lookup table range
        const idx = Math.min(context.dbLookup.length - 1, Math.floor(x * context.DB_LOOKUP_SCALE));
        return context.dbLookup[idx];
      }
      
      function fastExp(x) {
        // Fast exponential using lookup table
        if (x <= 0) return 1;
        if (x >= 60) return context.expLookup[context.expLookup.length - 1];
        // Scale and clamp to lookup table range
        const idx = Math.min(context.expLookup.length - 1, Math.floor(x * context.EXP_LOOKUP_SCALE));
        return context.expLookup[idx];
      }
      
      // Process envelope detection and gain reduction in blocks
      for (let ch = 0; ch < parameters.channelCount; ch++) {
        const bandSignals = context.bandSignals[ch];
        const offset = ch * parameters.blockSize;
        const envelopeOffset = ch * 5;
        const outputBuffer = context.outputBuffer;
        const workBuffer = context.workBuffer;
        
        // Clear output buffer - use a faster method with typed arrays
        outputBuffer.fill(0, 0, parameters.blockSize);
        
        // Process each band
        for (let band = 0; band < 5; band++) {
          const bp = parameters.bands[band];
          const bandParams = context.bandParams[band];
          const attackCoeff = context.timeConstants[band * 2];
          const releaseCoeff = context.timeConstants[band * 2 + 1];
          let envelope = context.envelopeStates[envelopeOffset + band];
          
          // Last sample gain reduction for metering
          let lastGainReduction = 0;
          
          // Cache frequently accessed values
          const halfKnee = bandParams.halfKnee;
          const invRatio = bandParams.invRatio;
          const threshold = bp.t;
          const knee = bp.k;
          const makeupGain = bandParams.makeupGain;
          const bandSignal = bandSignals[band];
          
          // Pre-calculate gain values for the entire block
          // This reduces per-sample calculations and improves cache locality
          const blockSize = parameters.blockSize;
          
          // First pass: calculate envelope and gain reduction
          let maxEnvelope = envelope;
          for (let i = 0; i < blockSize; i++) {
            const absVal = Math.abs(bandSignal[i]);
            
            // Envelope detection
            const coeff = absVal > envelope ? attackCoeff : releaseCoeff;
            envelope = envelope * coeff + absVal * (1 - coeff);
            if (envelope < 1e-6) envelope = 1e-6;
            
            // Track maximum envelope for optimization
            if (envelope > maxEnvelope) maxEnvelope = envelope;
            
            // Store envelope in work buffer for second pass
            workBuffer[i] = envelope;
          }
          
          // Calculate gain reduction once for the maximum envelope value
          // This is an optimization for when the signal level is below threshold
          const maxEnvelopeDb = fastDb(maxEnvelope);
          const maxDiff = maxEnvelopeDb - threshold;
          
          // If max envelope is below threshold - knee, we can skip per-sample gain calculation
          if (maxDiff <= -halfKnee) {
            // No gain reduction needed, just apply makeup gain
            for (let i = 0; i < blockSize; i++) {
              outputBuffer[i] += bandSignal[i] * makeupGain;
            }
          } else {
            // Second pass: apply gain reduction
            // Process in blocks of 8 for better cache performance
            const blockSizeMod8 = blockSize & ~7; // Fast way to calculate blockSize - (blockSize % 8)
            let i = 0;
            
            // Main loop with 8-sample unrolling
            for (; i < blockSizeMod8; i += 8) {
              // Calculate gain for 8 samples at once
              for (let j = 0; j < 8; j++) {
                const envelopeDb = fastDb(workBuffer[i + j]);
                const diff = envelopeDb - threshold;
                
                // Gain reduction calculation with knee
                let gainReduction;
                if (diff >= halfKnee) {
                  gainReduction = diff * invRatio;
                } else if (diff > -halfKnee) {
                  const tVal = (diff + halfKnee) / knee;
                  gainReduction = invRatio * knee * tVal * tVal * 0.5;
                } else {
                  gainReduction = 0;
                }
                
                // Apply gain reduction and makeup gain
                const totalGainLin = fastExp(gainReduction) * makeupGain;
                outputBuffer[i + j] += bandSignal[i + j] * totalGainLin;
                
                // Store last gain reduction for metering
                if (i + j === blockSize - 1) {
                  lastGainReduction = gainReduction;
                }
              }
            }
            
            // Handle remaining samples
            for (; i < blockSize; i++) {
              const envelopeDb = fastDb(workBuffer[i]);
              const diff = envelopeDb - threshold;
              
              // Gain reduction calculation with knee
              let gainReduction = 0;
              if (diff >= halfKnee) {
                gainReduction = diff * invRatio;
              } else if (diff > -halfKnee) {
                const tVal = (diff + halfKnee) / knee;
                gainReduction = invRatio * knee * tVal * tVal * 0.5;
              }
              
              // Apply gain reduction and makeup gain
              const totalGainLin = fastExp(gainReduction) * makeupGain;
              outputBuffer[i] += bandSignal[i] * totalGainLin;
              
              // Store last sample gain reduction for metering
              if (i === blockSize - 1) {
                lastGainReduction = gainReduction;
              }
            }
          }
          
          // Update envelope state
          context.envelopeStates[envelopeOffset + band] = envelope;
          
          // Store gain reduction for metering
          gainReductions[band] = lastGainReduction;
        }
        
        // Apply fade-in if needed and copy to result buffer
        if (context.fadeIn && context.fadeIn.counter < context.fadeIn.length) {
          for (let i = 0; i < parameters.blockSize; i++) {
            const fadeGain = Math.min(1, context.fadeIn.counter++ / context.fadeIn.length);
            result[offset + i] = outputBuffer[i] * fadeGain;
            if (context.fadeIn.counter >= context.fadeIn.length) break;
          }
        } else {
          // Copy output buffer to result
          for (let i = 0; i < parameters.blockSize; i++) {
            result[offset + i] = outputBuffer[i];
          }
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
      // Only update graphs if there's significant gain reduction (using a threshold to avoid lingering updates)
      const GR_THRESHOLD = 0.05; // 0.05 dB threshold for considering gain reduction significant
      if (this.canvas && this.bands.some(band => band.gr > GR_THRESHOLD)) {
        this.updateTransferGraphs();
      }
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
    } else if (params.band !== undefined) {
      // Check if band index is valid
      if (params.band >= this.bands.length) {
        console.warn(`Invalid band index: ${params.band}`);
        return;
      }
      // Update a single band parameter if provided
      const band = this.bands[params.band];
      if (!band) {
        console.warn(`Band ${params.band} is undefined`);
        return;
      }
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
    // Find container element
    const container = document.querySelector(`[data-instance-id="${this.instanceId}"]`);
    if (!container) return;  // Exit if container is not in DOM

    // Cache DOM query result to minimize reflows, scoped to this instance
    const canvases = Array.from(container.querySelectorAll('.multiband-compressor-band-graph canvas'));
    if (!canvases.length) return;  // Exit if no canvases found

    // Update canvas reference if needed
    if (!this.canvas || !document.contains(this.canvas)) {
      this.canvas = container.querySelector('.multiband-compressor-band-graph.active canvas');
      if (!this.canvas) return;  // Exit if active canvas not found
    }

    // Cached constants for drawing
    const DB_POINTS = [-48, -36, -24, -12];
    const GRID_COLOR = '#444';
    const LABEL_COLOR = '#666';
    const CURVE_COLOR = '#0f0';
    const METER_COLOR = '#008000';

    const graphContexts = canvases.map(canvas => ({
      ctx: canvas.getContext('2d'),
      width: canvas.width,
      height: canvas.height
    }));

    graphContexts.forEach((graph, bandIndex) => {
      // Check if band index is within valid range
      if (bandIndex >= this.bands.length) {
        console.warn(`Invalid band index: ${bandIndex}`);
        return;
      }
      const { ctx, width, height } = graph;
      const band = this.bands[bandIndex];
      
      // Skip processing if band is undefined
      if (!band) {
        console.warn(`Band ${bandIndex} is undefined`);
        return;
      }

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
      
      // Use a smaller number of points for the curve to improve performance
      const numPoints = Math.min(width, 100); // Reduce from width to 100 points
      const pointSpacing = width / numPoints;
      
      ctx.moveTo(0, height); // Start at bottom-left
      
      for (let i = 0; i < numPoints; i++) {
        const x = i * pointSpacing;
        const inputDb = (x / width) * 60 - 60;
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
        const y = height - ((outputDb + 60) / 60) * height;
        ctx.lineTo(x, Math.max(0, Math.min(height, y)));
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
    // Add unique instance identifier
    this.instanceId = `multiband-compressor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    container.className = 'multiband-compressor-container';
    container.setAttribute('data-instance-id', this.instanceId);

    // Frequency sliders UI
    const freqContainer = document.createElement('div');
    freqContainer.className = 'plugin-parameter-ui';
    const freqSliders = document.createElement('div');
    freqSliders.className = 'multiband-compressor-frequency-sliders';
    freqContainer.appendChild(freqSliders);

    const createFreqSlider = (label, min, max, value, setter) => {
      const sliderContainer = document.createElement('div');
      sliderContainer.className = 'multiband-compressor-frequency-slider';
      const topRow = document.createElement('div');
      topRow.className = 'multiband-compressor-frequency-slider-top parameter-row';
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
    bandSettings.className = 'multiband-compressor-band-settings';
    const bandTabs = document.createElement('div');
    bandTabs.className = 'multiband-compressor-band-tabs';
    const bandContents = document.createElement('div');
    bandContents.className = 'multiband-compressor-band-contents';

    for (let i = 0; i < this.bands.length; i++) {
      const tab = document.createElement('button');
      tab.className = `multiband-compressor-band-tab ${i === 0 ? 'active' : ''}`;
      tab.textContent = `Band ${i + 1}`;
      // Add instance ID to elements
      tab.setAttribute('data-instance-id', this.instanceId);
      
      tab.onclick = () => {
        if (i >= this.bands.length) {
          console.warn(`Invalid band index: ${i}`);
          return;
        }
        const container = document.querySelector(`[data-instance-id="${this.instanceId}"]`);
        container.querySelectorAll('.multiband-compressor-band-tab').forEach(t => t.classList.remove('active'));
        container.querySelectorAll('.multiband-compressor-band-content').forEach(c => c.classList.remove('active'));
        container.querySelectorAll('.multiband-compressor-band-graph').forEach(g => g.classList.remove('active'));
        tab.classList.add('active');
        content.classList.add('active');
        container.querySelectorAll('.multiband-compressor-band-graph')[i].classList.add('active');
        this.selectedBand = i;
        this.updateTransferGraphs();
      };
      bandTabs.appendChild(tab);

      // Generate band content
      const content = document.createElement('div');
      content.className = `multiband-compressor-band-content plugin-parameter-ui ${i === 0 ? 'active' : ''}`;
      content.setAttribute('data-instance-id', this.instanceId);

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
    graphsContainer.className = 'multiband-compressor-graphs';
    // Generate graphs based on number of bands
    for (let i = 0; i < this.bands.length; i++) {
      const graphDiv = document.createElement('div');
      graphDiv.className = `multiband-compressor-band-graph ${i === 0 ? 'active' : ''}`;
      graphDiv.setAttribute('data-instance-id', this.instanceId);
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 320;
      canvas.style.width = '160px';
      canvas.style.height = '160px';
      canvas.style.backgroundColor = '#222';
      const label = document.createElement('div');
      label.className = 'multiband-compressor-band-graph-label';
      label.textContent = `Band ${i + 1}`;
      graphDiv.appendChild(canvas);
      graphDiv.appendChild(label);
      graphsContainer.appendChild(graphDiv);
    }
    container.appendChild(graphsContainer);

    // Cache main canvas reference for animation updates
    this.canvas = container.querySelector('.multiband-compressor-band-graph.active canvas');
    this.updateTransferGraphs();
    this.startAnimation();

    return container;
  }

  startAnimation() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    
    let lastGraphState = null;
    
    const animate = () => {
      // Check if container still exists in DOM
      const container = document.querySelector(`[data-instance-id="${this.instanceId}"]`);
      if (!container) {
        this.cleanup();  // Stop animation if container is removed
        return;
      }
      
      // Check if the element is in the viewport before updating
      const rect = container.getBoundingClientRect();
      const isVisible = (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      );
      
      if (isVisible) {
        // Check if we need to update the graph
        const needsUpdate = this.needsGraphUpdate(lastGraphState);
        if (needsUpdate) {
          this.updateTransferGraphs();
          // Store current state for future comparison
          lastGraphState = this.getCurrentGraphState();
        }
      }
      
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }
  
  // Helper method to determine if graph update is needed
  needsGraphUpdate(lastState) {
    // Always update if no previous state exists
    if (!lastState) return true;
    
    // Use a threshold to determine significant gain reduction
    const GR_THRESHOLD = 0.05; // 0.05 dB threshold for considering gain reduction significant
    
    // Check if any band has significant gain reduction
    const hasActiveReduction = this.bands.some(band => band.gr > GR_THRESHOLD);
    
    // If any band has significant gain reduction, we should update
    if (hasActiveReduction) return true;
    
    // Compare current state with last state
    const currentState = this.getCurrentGraphState();
    
    // Check if any relevant parameters have changed
    return JSON.stringify(currentState) !== JSON.stringify(lastState);
  }
  
  // Get current state of parameters that affect graph appearance
  getCurrentGraphState() {
    const selectedBand = this.bands[this.selectedBand];
    return {
      selectedBand: this.selectedBand,
      threshold: selectedBand.t,
      ratio: selectedBand.r,
      knee: selectedBand.k,
      gain: selectedBand.g,
      gainReduction: selectedBand.gr
    };
  }

  cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.canvas = null;  // Clear canvas reference
    this.bands.forEach(band => band.gr = 0);
    this.lastProcessTime = performance.now() / 1000;
  }
}

window.MultibandCompressorPlugin = MultibandCompressorPlugin;
