/**
 * PEQ Parameter Calculator
 * Calculates parametric EQ correction parameters based on frequency response measurements.
 */
class PEQCalculator {
  /**
   * Calculate PEQ parameters from a measured frequency response.
   * This is the main entry point function.
   * @param {Array<Array<number>>} fr - Array of [frequency, magnitude] pairs.
   * @param {number} [lowFreq=20] - Low frequency limit for correction.
   * @param {number} [highFreq=20000] - High frequency limit for correction.
   * @param {number} [bandCount=5] - Desired number of PEQ bands (1-15 supported).
   * @param {number} [fs=96000] - Sampling frequency in Hz for digital filter calculations.
   * @param {number} [binsPerOct=6] - Bins per octave for smoothing (1-24, higher values = less smoothing).
   * @returns {Array<{frequency: number, gain: number, Q: number, type: string}>} Array of calculated PEQ parameters.
   */
  calculatePEQParameters(fr, lowFreq = 20, highFreq = 20000, bandCount = 5, fs = 96000, binsPerOct = 6) {
    this.fs = fs;
    // Clamp frequency limits to sensible values
    this.lowFreq = Math.max(10, Math.min(lowFreq, 1000));
    this.highFreq = Math.max(this.lowFreq * 2, Math.min(highFreq, fs / 2 * 0.95)); // Ensure highFreq > lowFreq and below Nyquist
    // Clamp band count
    bandCount = Math.max(1, Math.min(15, bandCount));
    // Clamp binsPerOct
    binsPerOct = Math.max(1, Math.min(24, binsPerOct));

    // --- 1. Pre-filter and de-mean the input data ---
    // Filter data to be within slightly wider bounds than the target range
    const data = fr.filter(([f]) => f >= this.lowFreq * 0.8 && f <= this.highFreq * 1.2);
    if (data.length < 5) {
        console.error("calculatePEQParameters: Not enough valid data points in the specified frequency range.");
        return this.createDefaultBands(bandCount);
    }

    const freq = data.map(([f]) => f);
    const magRaw = data.map(([,m]) => m);

    // Calculate the mean magnitude within the specified frequency range [lowFreq, highFreq]
    const relevantMags = data.filter(([f]) => f >= this.lowFreq && f <= this.highFreq).map(([,m]) => m);
    let mean = 0;
    if (relevantMags.length > 0) {
        mean = relevantMags.reduce((s, d) => s + d, 0) / relevantMags.length;
    } else {
        // Fallback if no data in the exact range
        mean = magRaw.reduce((s, d) => s + d, 0) / magRaw.length;
    }

    // Normalize magnitude by subtracting the mean
    const magN = magRaw.map(d => d - mean);

    // --- 2. Design PEQ parameters using the core algorithm ---
    try {
      // Call the main design function
      const peqParams = this.designPEQ(freq, magN, bandCount, binsPerOct);

      // --- 3. Format and clamp the final parameters ---
      return peqParams.map(b => ({
        frequency: Math.max(20, Math.min(20000, Math.round(b.frequency))), // Clamp frequency to standard audio range
        gain: Math.max(-18, Math.min(18, +b.gain.toFixed(1))), // Clamp gain and round
        Q: Math.max(0.1, Math.min(10, +b.Q.toFixed(2))), // Clamp Q and round
        type: 'peaking' // This implementation only uses peaking filters
      }));
    } catch (error) {
      console.error("Error in calculatePEQParameters during PEQ design:", error);
      // Fallback to default bands in case of any error during design
      return this.createDefaultBands(bandCount);
    }
  }

  /**
   * Smooth frequency response using logarithmic windowing.
   * @param {number[]} freq - Array of frequency values.
   * @param {number[]} magDb - Array of magnitude values in dB.
   * @param {number} binsPerOct - Number of bins per octave for smoothing.
   * @returns {number[]} Smoothed magnitude values.
   */
  smoothLog(freq, magDb, binsPerOct) {
    // Basic input validation
    if (!freq || !magDb || freq.length < 3 || magDb.length < 3 || freq.length !== magDb.length) {
      console.warn("smoothLog: Invalid input data, returning original");
      return magDb;
    }

    // Ensure frequency values are valid (ascending and positive)
    for (let i = 0; i < freq.length; i++) {
        if (typeof freq[i] !== 'number' || !isFinite(freq[i]) || freq[i] <= 0) {
            console.warn("smoothLog: Invalid frequency value, returning original");
            return magDb;
        }
        if (i > 0 && freq[i] <= freq[i - 1]) {
            console.warn("smoothLog: Frequencies not ascending, returning original");
            return magDb;
        }
    }
    // Ensure magnitude values are valid
    if (magDb.some(m => typeof m !== 'number' || !isFinite(m))) {
        console.warn("smoothLog: Invalid magnitude value, returning original");
        return magDb;
    }


    const minFreq = Math.max(1, freq[0]); // Avoid log(0)
    const maxFreq = freq[freq.length - 1];
    if (maxFreq <= minFreq * 1.01) { // Ensure a minimal range
        console.warn("smoothLog: Frequency range too narrow, returning original");
        return magDb;
    }

    const minLogFreq = Math.log10(minFreq);
    const maxLogFreq = Math.log10(maxFreq);
    const octaveRange = (maxLogFreq - minLogFreq) / Math.log10(2);

    if (octaveRange <= 0 || !isFinite(octaveRange)) {
        console.warn("smoothLog: Invalid octave range, returning original");
        return magDb;
    }

    // Determine the number of points for the log-spaced grid
    // Aim for roughly binsPerOct points per octave, but ensure enough points for smoothing
    const numBins = Math.max(5, Math.min(1000, Math.ceil(octaveRange * binsPerOct) + 1));
    const logSpacedFreq = new Array(numBins);
    const logStep = (maxLogFreq - minLogFreq) / Math.max(1, numBins - 1);

    try {
        // Generate log-spaced frequency points
        for (let i = 0; i < numBins; i++) {
            logSpacedFreq[i] = 10**(minLogFreq + i * logStep);
        }

        // Interpolate magnitude values onto the log-spaced grid
        const logSpacedMag = new Array(numBins);
        let currentInputIdx = 0;
        for (let i = 0; i < numBins; i++) {
            const targetFreq = logSpacedFreq[i];

            // Find the segment in the original data that contains targetFreq
            while (currentInputIdx < freq.length - 2 && freq[currentInputIdx + 1] < targetFreq) {
                currentInputIdx++;
            }

            // Linear interpolation
            const f1 = freq[currentInputIdx];
            const f2 = freq[currentInputIdx + 1];
            const m1 = magDb[currentInputIdx];
            const m2 = magDb[currentInputIdx + 1];

            if (targetFreq <= f1) {
                logSpacedMag[i] = m1;
            } else if (targetFreq >= f2) {
                 logSpacedMag[i] = m2;
                 // Optimization: If the next target freq is also beyond f2, keep currentInputIdx
                 if (i + 1 < numBins && logSpacedFreq[i+1] >= f2) {
                     // no change needed
                 } else {
                     // move index forward if we are not at the end
                     if (currentInputIdx < freq.length - 2) currentInputIdx++;
                 }
            } else {
                // Interpolate: m = m1 + (targetFreq - f1) * (m2 - m1) / (f2 - f1)
                // Use log-frequency interpolation for potentially better results in audio
                const logTarget = Math.log10(targetFreq);
                const logF1 = Math.log10(f1);
                const logF2 = Math.log10(f2);
                const ratio = (logTarget - logF1) / (logF2 - logF1);
                logSpacedMag[i] = m1 + ratio * (m2 - m1);
                // If the next target freq is also in this segment, keep currentInputIdx
                if (i + 1 < numBins && logSpacedFreq[i+1] < f2) {
                     // no change needed
                } else {
                    // move index forward if we are not at the end
                     if (currentInputIdx < freq.length - 2) currentInputIdx++;
                }
            }
             if (typeof logSpacedMag[i] !== 'number' || !isFinite(logSpacedMag[i])) {
                console.warn(`smoothLog: Interpolation yielded invalid value at bin ${i}, using previous.`);
                logSpacedMag[i] = (i > 0) ? logSpacedMag[i-1] : 0; // Use previous or 0
             }
        }

        // Apply smoothing using a Hanning window on the log-spaced data
        // Window size related to binsPerOct, ensuring it's odd and within bounds
        let windowSize = Math.min(numBins, 2 * Math.floor(binsPerOct / 2) + 1); // Ensure odd
        windowSize = Math.max(3, windowSize); // Minimum size of 3

        const win = new Array(windowSize);
        for (let i = 0; i < windowSize; i++) {
            win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (windowSize - 1)));
        }
        const windowSum = win.reduce((a, b) => a + b, 0);
        if (Math.abs(windowSum) < 1e-10) {
             console.warn("smoothLog: Window sum too small, returning original");
             return magDb; // Avoid division by zero
        }
        const normalizedWin = win.map(w => w / windowSum);

        const smoothedLogMag = new Array(numBins);
        const halfWin = Math.floor(windowSize / 2);

        for (let i = 0; i < numBins; i++) {
            let sum = 0;
            for (let j = 0; j < windowSize; j++) {
                let sampleIdx = i - halfWin + j;
                // Boundary handling (reflection)
                if (sampleIdx < 0) sampleIdx = -sampleIdx;
                if (sampleIdx >= numBins) sampleIdx = 2 * numBins - sampleIdx - 2;
                sampleIdx = Math.max(0, Math.min(numBins - 1, sampleIdx)); // Clamp index
                sum += logSpacedMag[sampleIdx] * normalizedWin[j];
            }
             if (typeof sum !== 'number' || !isFinite(sum)) {
                 console.warn(`smoothLog: Smoothing yielded invalid value at bin ${i}, using original interpolated.`);
                 smoothedLogMag[i] = logSpacedMag[i]; // Use original interpolated value as fallback
             } else {
                smoothedLogMag[i] = sum;
             }
        }

        // Interpolate back to the original frequency points
        const smoothed = new Array(freq.length);
        currentInputIdx = 0; // Reset index for log-spaced data
        for (let i = 0; i < freq.length; i++) {
            const targetFreq = freq[i];

            // Find the segment in the log-spaced data
            while (currentInputIdx < numBins - 2 && logSpacedFreq[currentInputIdx + 1] < targetFreq) {
                currentInputIdx++;
            }

            const f1 = logSpacedFreq[currentInputIdx];
            const f2 = logSpacedFreq[currentInputIdx + 1];
            const m1 = smoothedLogMag[currentInputIdx];
            const m2 = smoothedLogMag[currentInputIdx + 1];

            if (targetFreq <= f1) {
                smoothed[i] = m1;
            } else if (targetFreq >= f2) {
                smoothed[i] = m2;
                 if (currentInputIdx < numBins - 2) currentInputIdx++;
            } else {
                 const logTarget = Math.log10(targetFreq);
                 const logF1 = Math.log10(f1);
                 const logF2 = Math.log10(f2);
                 const ratio = (logTarget - logF1) / (logF2 - logF1);
                 smoothed[i] = m1 + ratio * (m2 - m1);
                  if (currentInputIdx < numBins - 2) currentInputIdx++;
            }
             if (typeof smoothed[i] !== 'number' || !isFinite(smoothed[i])) {
                 console.warn(`smoothLog: Final interpolation yielded invalid value at index ${i}, using original.`);
                 smoothed[i] = magDb[i]; // Fallback to original unsmoothed data
             }
        }

        return smoothed;

    } catch (error) {
        console.error("Error during smoothLog execution:", error);
        return magDb; // Return original data on error
    }
  }


  /**
   * Find peaks and dips in the frequency response.
   * @param {number[]} freq - Array of frequency values.
   * @param {number[]} magDb - Array of magnitude values in dB (should be normalized around 0 dB).
   * @param {number} [threshold=1.5] - Minimum prominence in dB to consider a peak/dip.
   * @param {number} [minAbsolutePeak=0.5] - Minimum absolute magnitude in dB for a peak/dip to be considered.
   * @returns {number[]} Indices of significant peaks and dips, sorted by absolute magnitude.
   */
  findPeaksDips(freq, magDb, threshold = 1.5, minAbsolutePeak = 0.5) {
      const n = magDb.length;
      if (n < 3) return []; // Need at least 3 points

      const peaks = [];
      const dips = [];

      // Check the first point (low end) if it could be a peak or dip
      if (n > 1) {
          const first = magDb[0];
          const second = magDb[1];
          
          if ((first > second && first > minAbsolutePeak) || (first < second && first < -minAbsolutePeak)) {
              if (first > 0) peaks.push(0); else dips.push(0);
          }
      }

      // Find local maxima (peaks) and minima (dips)
      for (let i = 1; i < n - 1; i++) {
          const current = magDb[i];
          const prev = magDb[i - 1];
          const next = magDb[i + 1];

          if (current > prev && current > next && current > minAbsolutePeak) {
              peaks.push(i); // Potential peak
          } else if (current < prev && current < next && current < -minAbsolutePeak) {
              dips.push(i); // Potential dip
          }
          // Handle plateaus: check if it's higher/lower than neighbors further away
          else if (current === next && current !== prev) {
              let k = i + 1;
              while (k < n - 1 && magDb[k] === current) {
                  k++;
              }
              if (k < n && ((current > prev && current > magDb[k] && current > minAbsolutePeak) || (current < prev && current < magDb[k] && current < -minAbsolutePeak))) {
                 const plateauCenter = Math.floor((i + k -1) / 2);
                 if (current > 0) peaks.push(plateauCenter); else dips.push(plateauCenter);
                 i = k - 1; // Skip the rest of the plateau
              }
          }
      }

      // Check the last point (high end) if it could be a peak or dip
      if (n > 1) {
          const last = magDb[n - 1];
          const secondLast = magDb[n - 2];
          
          if ((last > secondLast && last > minAbsolutePeak) || (last < secondLast && last < -minAbsolutePeak)) {
              if (last > 0) peaks.push(n - 1); else dips.push(n - 1);
          }
      }

      // Combine peaks and dips into candidates
      const candidates = [...peaks, ...dips].map(index => ({ index, magnitude: magDb[index] }));

      // Calculate prominence for each candidate
      const significantIndices = [];
      for (const candidate of candidates) {
          const i = candidate.index;
          const currentMag = candidate.magnitude;
          const isPeak = currentMag > 0;

          // Find the reference level for prominence calculation
          // Search left and right for the lowest point (for peaks) or highest point (for dips)
          // until we hit a point higher (for peaks) or lower (for dips) than the candidate itself.

          let leftMin = currentMag; // For peaks
          let leftMax = currentMag; // For dips
          let leftBound = 0;
          
          // Special handling for leftward search when at index 0 (low end)
          if (i === 0) {
              // For the low end, we can't search left, so we use current value
              leftMin = currentMag;
              leftMax = currentMag;
              leftBound = 0;
          } else {
              // Normal leftward search
              for (let j = i - 1; j >= 0; j--) {
                  if ((isPeak && magDb[j] > currentMag) || (!isPeak && magDb[j] < currentMag)) {
                      leftBound = j; // Found the bounding higher/lower point
                      break;
                  }
                  if (isPeak) leftMin = Math.min(leftMin, magDb[j]);
                  else leftMax = Math.max(leftMax, magDb[j]);
                  leftBound = j; // Keep track of the search extent
              }
          }

          let rightMin = currentMag; // For peaks
          let rightMax = currentMag; // For dips
          let rightBound = n - 1;
          
          // Special handling for rightward search when at index n-1 (high end)
          if (i === n - 1) {
              // For the high end, we can't search right, so we use current value
              rightMin = currentMag;
              rightMax = currentMag;
              rightBound = n - 1;
          } else {
              // Normal rightward search
              for (let j = i + 1; j < n; j++) {
                  if ((isPeak && magDb[j] > currentMag) || (!isPeak && magDb[j] < currentMag)) {
                      rightBound = j; // Found the bounding higher/lower point
                      break;
                  }
                  if (isPeak) rightMin = Math.min(rightMin, magDb[j]);
                  else rightMax = Math.max(rightMax, magDb[j]);
                  rightBound = j; // Keep track of the search extent
              }
          }

          // The prominence baseline is the higher of the two minima (for peaks)
          // or the lower of the two maxima (for dips) found during the search.
          let baseLevel;
          let prominence;
          
          // Special handling for endpoints to avoid setting their prominence to zero
          if (i === 0 || i === n - 1) {
              // For endpoints, use just the one-sided search result
              // This prevents endpoints from getting zero prominence
              if (i === 0) {
                  // Low end - use only rightward search
                  baseLevel = isPeak ? rightMin : rightMax;
              } else {
                  // High end - use only leftward search
                  baseLevel = isPeak ? leftMin : leftMax;
              }
              // Calculate prominence using one-sided baseline
              prominence = Math.abs(currentMag - baseLevel);
              
              // Optionally, reduce threshold for endpoints to make them more likely to be included
              // Only do this if prominence would otherwise be below the threshold
              if (prominence < threshold && prominence >= threshold * 0.75) {
                  prominence = threshold; // Force it to just meet the threshold
              }
          } else {
              // Normal case - use both sides
              baseLevel = isPeak ? Math.max(leftMin, rightMin) : Math.min(leftMax, rightMax);
              prominence = Math.abs(currentMag - baseLevel);
          }

          if (prominence >= threshold && Math.abs(currentMag) >= minAbsolutePeak) {
              significantIndices.push({
                  index: i,
                  magnitude: Math.abs(currentMag), // Sort by absolute magnitude
                  prominence: prominence
              });
          }
      }

      // Sort by prominence first, then by absolute magnitude (descending)
      significantIndices.sort((a, b) => {
          const promDiff = b.prominence - a.prominence;
          if (Math.abs(promDiff) > 0.1) { // Use prominence if difference is significant
              return promDiff;
          } else {
              return b.magnitude - a.magnitude; // Otherwise use magnitude
          }
      });

      // Return only the indices
      return significantIndices.map(item => item.index);
  }

  /**
   * Calculate the frequency response of a single parametric EQ (peaking filter).
   * Uses the standard Audio EQ Cookbook biquad implementation.
   * @param {number[]} freq - Array of frequency values to calculate the response at.
   * @param {number} fc - Center frequency of the PEQ band.
   * @param {number} gainDb - Gain of the PEQ band in dB.
   * @param {number} Q - Q factor of the PEQ band.
   * @param {number} [fs] - Sampling frequency in Hz. Defaults to internal this.fs or 96000.
   * @returns {number[]} Array of filter responses in dB at each frequency in `freq`.
   */
  peqResponse(freq, fc, gainDb, Q, fs) {
    const sampleRate = fs || this.fs || 96000;

    // Basic validation for fc and Q
    if (typeof fc !== 'number' || !isFinite(fc) || fc <= 0 || fc >= sampleRate / 2) {
        console.warn(`Invalid fc (${fc}) for fs=${sampleRate}. Returning flat response.`);
        return new Array(freq.length).fill(0);
    }
     if (typeof Q !== 'number' || !isFinite(Q) || Q <= 0) {
         console.warn(`Invalid Q (${Q}). Returning flat response.`);
         return new Array(freq.length).fill(0);
     }
     if (typeof gainDb !== 'number' || !isFinite(gainDb)) {
          console.warn(`Invalid gainDb (${gainDb}). Returning flat response.`);
          return new Array(freq.length).fill(0);
     }

    const A = 10**(gainDb / 40); // Amplitude ratio (sqrt gain)
    const w0 = 2 * Math.PI * fc / sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    // Ensure alpha is positive and avoids potential division by zero in Q
    const alpha = sinW0 / (2 * Math.max(1e-6, Q));

    // Biquad coefficients for peaking EQ
    const b0 = 1 + alpha * A;
    const b1 = -2 * cosW0;
    const b2 = 1 - alpha * A;
    const a0 = 1 + alpha / A;
    const a1 = -2 * cosW0;
    const a2 = 1 - alpha / A;

    // Avoid division by zero for a0
    if (Math.abs(a0) < 1e-18) {
        console.warn(`Near-zero a0 coefficient (fc=${fc}, Q=${Q}, gain=${gainDb}). Returning flat response.`);
        return new Array(freq.length).fill(0);
    }

    // Normalize coefficients by a0
    const bz0 = b0 / a0;
    const bz1 = b1 / a0;
    const bz2 = b2 / a0;
    const az1 = a1 / a0;
    const az2 = a2 / a0;

    // Calculate magnitude response H(f) for each frequency
    return freq.map(f => {
      if (f <= 0 || f >= sampleRate / 2) return 0; // Response is 0 outside valid range

      const omega = 2 * Math.PI * f / sampleRate;
      const cosOmega = Math.cos(omega);
      const sinOmega = Math.sin(omega);

      // Calculate H(z) = (b0 + b1*z^-1 + b2*z^-2) / (1 + a1*z^-1 + a2*z^-2)
      // Substitute z = e^(j*omega)
      // Numerator: b0 + b1*e^(-j*omega) + b2*e^(-2j*omega)
      // Denominator: 1 + a1*e^(-j*omega) + a2*e^(-2j*omega)

      // Real and Imaginary parts of the numerator
      const numRe = bz0 + bz1 * cosOmega + bz2 * Math.cos(2 * omega);
      const numIm = -bz1 * sinOmega - bz2 * Math.sin(2 * omega);

      // Real and Imaginary parts of the denominator
      const denRe = 1 + az1 * cosOmega + az2 * Math.cos(2 * omega);
      const denIm = -az1 * sinOmega - az2 * Math.sin(2 * omega);

      // Magnitude squared |H(e^jω)|^2 = |Num|^2 / |Den|^2
      const numMagSq = numRe * numRe + numIm * numIm;
      const denMagSq = denRe * denRe + denIm * denIm;

      // Avoid division by zero or log(0)
      if (denMagSq < 1e-36) return 0; // Flat response if denominator is zero

      const magnitude = Math.sqrt(numMagSq / denMagSq);

      // Convert magnitude to dB, adding small epsilon for log stability
      return 20 * Math.log10(magnitude + 1e-18);
    });
  }


  /**
   * Compute the error vector for least squares optimization (log-space parameters).
   * Error = target_linear * combined_response_linear - 1.0
   * @param {number[]} logParams - Filter parameters [g1, logQ1, logFc1, ...].
   * @param {number[]} freq - Array of frequency values.
   * @param {number[]} targetDb - Target response in dB (deviation to be corrected).
   * @returns {number[]} Array of error values at each frequency.
   */
  errorFunctionLogSpace(logParams, freq, targetDb) {
    const nFreq = freq.length;
    const combinedRespDb = new Array(nFreq).fill(0);

    // Calculate the combined response of all PEQ filters
    const numFilters = Math.floor(logParams.length / 3);
    for (let i = 0; i < numFilters; i++) {
      const baseIdx = i * 3;
      const gain = logParams[baseIdx];
      const Q = 10**logParams[baseIdx + 1]; // Convert logQ to Q
      const fc = 10**logParams[baseIdx + 2]; // Convert logFc to fc

      // Skip if parameters are invalid (e.g., during numerical differentiation)
      if (fc <= 0 || Q <= 0 || !isFinite(gain) || !isFinite(Q) || !isFinite(fc)) {
           console.warn(`Skipping filter ${i} due to invalid parameters: gain=${gain}, Q=${Q}, fc=${fc}`);
           continue;
      }

      const singleRespDb = this.peqResponse(freq, fc, gain, Q);
      for (let k = 0; k < nFreq; k++) {
        combinedRespDb[k] += singleRespDb[k];
      }
    }

    // Calculate the error in the linear amplitude domain
    // Error aims to make target * response = 1 (0 dB flat)
    const errors = new Array(nFreq);
    const lo = this.lowFreq, hi = this.highFreq;

    for (let k = 0; k < nFreq; k++) {
        // Apply weighting: 0 outside the [lowFreq, highFreq] range
        const weight = (freq[k] < lo || freq[k] > hi) ? 0 : 1;

        const targetLin = 10**(targetDb[k] / 20);
        const respLin = 10**(combinedRespDb[k] / 20);

        // Error = Target_Linear * Response_Linear - 1.0 (deviation from flat 0dB)
        // Weighted error
        errors[k] = weight * (targetLin * respLin - 1.0);

         if (typeof errors[k] !== 'number' || !isFinite(errors[k])) {
             console.warn(`errorFunctionLogSpace: Invalid error calculated at freq ${freq[k]}, setting to 0.`);
             errors[k] = 0; // Set to 0 to avoid disrupting optimization
         }
    }
    return errors;
  }


  /**
   * Fit parametric EQ parameters using Levenberg-Marquardt optimization.
   * @param {number[]} freq - Array of frequency values.
   * @param {number[]} targetDb - Target response in dB (deviation from flat).
   * @param {number[]} initParams - Initial guess [g1, Q1, fc1, ...].
   * @returns {number[]} Optimized parameters [g1, Q1, fc1, ...].
   */
  fitPEQ(freq, targetDb, initParams) {
    const numFilters = Math.floor(initParams.length / 3);
    if (numFilters === 0) return [];

    // Convert initial parameters to log-space for optimization
    // [gain, log10(Q), log10(fc)]
    let params = [];
    const logQMin = Math.log10(0.5); // Q lower bound
    const logQMax = Math.log10(10);  // Q upper bound
    const logFcMin = Math.log10(this.lowFreq * 0.9); // Fc lower bound (slightly below lowFreq)
    const logFcMax = Math.log10(this.highFreq * 1.1); // Fc upper bound (slightly above highFreq)
    const gainMin = -18;
    const gainMax = 18;

    for (let i = 0; i < numFilters; i++) {
        const baseIdx = i * 3;
        const gain = Math.max(gainMin, Math.min(gainMax, initParams[baseIdx]));
        const Q = Math.max(0.5, Math.min(10, initParams[baseIdx + 1]));
        const fc = Math.max(this.lowFreq * 0.9, Math.min(this.highFreq * 1.1, initParams[baseIdx + 2]));

        params.push(
            gain,
            Math.max(logQMin, Math.min(logQMax, Math.log10(Q))), // Clamp logQ
            Math.max(logFcMin, Math.min(logFcMax, Math.log10(fc))) // Clamp logFc
        );
    }


    // Parameter bounds for optimization
    const boundsLow = [];
    const boundsHigh = [];
    for (let i = 0; i < numFilters; i++) {
      boundsLow.push(gainMin, logQMin, logFcMin);
      boundsHigh.push(gainMax, logQMax, logFcMax);
    }

    // Levenberg-Marquardt parameters
    let lambda = 0.001; // Initial damping factor
    const lambdaDecrease = 0.25;
    const lambdaIncrease = 4.0;
    const maxIterations = 100;
    const costEpsilon = 1e-7; // Stricter tolerance for cost change
    const gradEpsilon = 1e-9; // Stricter tolerance for gradient
    const paramEpsilon = 1e-7; // Tolerance for parameter change


    let errors = this.errorFunctionLogSpace(params, freq, targetDb);
    let currentCost = errors.reduce((sum, err) => sum + err * err, 0) / errors.length; // Mean squared error
    let lastCost = currentCost;

    // Optimization loop
    for (let iter = 0; iter < maxIterations; iter++) {
      lastCost = currentCost;
      const oldParams = [...params];

      // Calculate Jacobian matrix J = ∂error / ∂param
      const jacobian = this.calculateJacobian(params, freq, targetDb, boundsLow, boundsHigh);

      // Calculate JᵀJ (approx Hessian) and Jᵀe (gradient direction)
      const [JtJ, Jte] = this.calculateJtJandJte(jacobian, errors);

      // Check for gradient convergence
      const gradNorm = Math.sqrt(Jte.reduce((sum, val) => sum + val * val, 0));
       if (gradNorm < gradEpsilon && iter > 0) { // Avoid stopping at iter 0 if gradient is already small
           break;
       }

      // Levenberg-Marquardt step: Solve (JᵀJ + λ * diag(JᵀJ)) * deltaParams = -Jᵀe
       let deltaParams;
       let solved = false;
       let currentLambda = lambda;

       // Try solving the system, increasing lambda if it fails (matrix is singular)
       for(let attempt = 0; attempt < 5; attempt++) {
            const augmentedJtJ = JtJ.map((row, i) => {
                const newRow = [...row];
                // Add damping factor: use max(diag(JtJ), 1e-6) to prevent issues with zero diagonal
                const diagElement = Math.max(Math.abs(JtJ[i][i]), 1e-6);
                newRow[i] += currentLambda * diagElement;
                return newRow;
            });

            const negJte = Jte.map(val => -val);
            try {
                deltaParams = this.solveEquation(augmentedJtJ, negJte);
                // Check if the solution is valid (not all zeros, not NaN/Infinity)
                 if (deltaParams.some(val => !isFinite(val))) {
                     throw new Error("Solution contains non-finite values");
                 }
                 if (deltaParams.every(val => Math.abs(val) < 1e-15)) {
                    // If delta is essentially zero, it might indicate convergence or a problem
                    // Check if gradient norm is also very small
                    if (gradNorm < gradEpsilon * 10) {
                        solved = true; // Treat as solved/converged
                        break;
                    } else {
                        // Gradient still large, but delta is zero - matrix likely singular
                         throw new Error("Solution is zero vector despite non-zero gradient");
                    }
                 }
                solved = true;
                break; // Success
            } catch (error) {
                currentLambda *= lambdaIncrease * 2; // Increase lambda more aggressively if solve fails
                 if (currentLambda > 1e10) {
                     iter = maxIterations; // Force exit
                     break;
                 }
            }
       }

       if (!solved) {
            break;
       }

       // Update lambda based on the final lambda used for solving
       lambda = currentLambda;


      // Calculate candidate new parameters
      let newParams = params.map((p, i) => p + deltaParams[i]);

      // Apply bounds constraints
      newParams = newParams.map((p, i) => Math.max(boundsLow[i], Math.min(boundsHigh[i], p)));

      // Calculate cost with the new parameters
      const newErrors = this.errorFunctionLogSpace(newParams, freq, targetDb);
      const newCost = newErrors.reduce((sum, err) => sum + err * err, 0) / newErrors.length;

      // Check if the cost improved
      if (newCost < currentCost) {
        const costChange = currentCost - newCost;
        const paramChangeNorm = Math.sqrt(deltaParams.reduce((sum, dp, i) => sum + dp*dp, 0));


        params = newParams;
        errors = newErrors;
        currentCost = newCost;
        lambda = Math.max(1e-9, lambda * lambdaDecrease); // Decrease lambda

        if (iter > 0 && (costChange < costEpsilon || paramChangeNorm < paramEpsilon)) {
             break;
         }

      } else {
        // Cost did not decrease. Increase lambda and keep old parameters.
        lambda *= lambdaIncrease;
         if (lambda > 1e10) {
           break;
         }
      }
       if (iter === maxIterations - 1) {
           break;
       }

    } // End of optimization loop

    // Convert back to linear-space parameters [g, Q, fc]
    const linearParams = [];
    for (let i = 0; i < numFilters; i++) {
      const baseIdx = i * 3;
      // Ensure parameters are finite before conversion
      const gain = isFinite(params[baseIdx]) ? params[baseIdx] : 0;
      const logQ = isFinite(params[baseIdx + 1]) ? params[baseIdx + 1] : Math.log10(1); // Default Q=1 if invalid
      const logFc = isFinite(params[baseIdx + 2]) ? params[baseIdx + 2] : Math.log10(1000); // Default Fc=1k if invalid

      linearParams.push(
        gain,
        10**logQ, // Q = 10^logQ
        10**logFc  // fc = 10^logFc
      );
    }
    return linearParams;
  }


  /**
   * Calculate the Jacobian matrix using numerical differentiation (central differences).
   * J[i][j] = ∂error[j] / ∂param[i]
   * @param {number[]} params - Current parameter vector (log-space).
   * @param {number[]} freq - Array of frequency values.
   * @param {number[]} targetDb - Target response in dB.
   * @param {number[]} boundsLow - Lower bounds for parameters.
   * @param {number[]} boundsHigh - Upper bounds for parameters.
   * @returns {Array<Array<number>>} Jacobian matrix (numParams x numFreqs).
   */
  calculateJacobian(params, freq, targetDb, boundsLow, boundsHigh) {
    const baseErrors = this.errorFunctionLogSpace(params, freq, targetDb);
    const numParams = params.length;
    const numFreqs = freq.length;
    const jacobian = Array(numParams).fill(null).map(() => new Array(numFreqs));

    // Optimal step size 'h' for numerical differentiation
    const eps = 2.22e-16; // Machine epsilon
    const baseStep = Math.sqrt(eps);

    for (let i = 0; i < numParams; i++) {
      const currentParam = params[i];
      // Calculate step size 'h', scaled by parameter magnitude
      let h = baseStep * Math.max(1.0, Math.abs(currentParam));
      // Ensure h is not excessively small compared to parameter
      h = Math.max(h, eps * 100);


      const paramsPlus = [...params];
      const paramsMinus = [...params];

      // Check bounds and decide differentiation method
      let errorsPlus, errorsMinus;
      const canStepUp = currentParam + h <= boundsHigh[i];
      const canStepDown = currentParam - h >= boundsLow[i];

      if (canStepUp && canStepDown) {
        // Central difference
        paramsPlus[i] = currentParam + h;
        paramsMinus[i] = currentParam - h;
        errorsPlus = this.errorFunctionLogSpace(paramsPlus, freq, targetDb);
        errorsMinus = this.errorFunctionLogSpace(paramsMinus, freq, targetDb);
        for (let j = 0; j < numFreqs; j++) {
           const derivative = (errorsPlus[j] - errorsMinus[j]) / (2 * h);
           jacobian[i][j] = isFinite(derivative) ? derivative : 0;
        }
      } else if (canStepUp) {
        // Forward difference (at lower bound)
         // Try a smaller step first if central diff failed due to bound
         h = Math.min(h, (boundsHigh[i] - currentParam) * 0.5);
         if (h < eps * 100) { // If step becomes too small, assume zero derivative
            for(let j=0; j<numFreqs; ++j) jacobian[i][j] = 0;
         } else {
            paramsPlus[i] = currentParam + h;
            errorsPlus = this.errorFunctionLogSpace(paramsPlus, freq, targetDb);
            for (let j = 0; j < numFreqs; j++) {
               const derivative = (errorsPlus[j] - baseErrors[j]) / h;
               jacobian[i][j] = isFinite(derivative) ? derivative : 0;
            }
         }
      } else if (canStepDown) {
        // Backward difference (at upper bound)
        h = Math.min(h, (currentParam - boundsLow[i]) * 0.5);
         if (h < eps * 100) {
            for(let j=0; j<numFreqs; ++j) jacobian[i][j] = 0;
         } else {
            paramsMinus[i] = currentParam - h;
            errorsMinus = this.errorFunctionLogSpace(paramsMinus, freq, targetDb);
            for (let j = 0; j < numFreqs; j++) {
                const derivative = (baseErrors[j] - errorsMinus[j]) / h;
                jacobian[i][j] = isFinite(derivative) ? derivative : 0;
            }
        }
      } else {
        // Cannot step in either direction (parameter likely fixed at bound)
        for (let j = 0; j < numFreqs; j++) {
          jacobian[i][j] = 0;
        }
      }
    }
    return jacobian;
  }


  /**
   * Calculate the JᵀJ matrix and Jᵀe vector.
   * @param {Array<Array<number>>} jacobian - Jacobian matrix (numParams x numFreqs).
   * @param {number[]} errors - Error vector (numFreqs).
   * @returns {[Array<Array<number>>, Array<number>]} [JᵀJ matrix (numParams x numParams), Jᵀe vector (numParams)].
   */
  calculateJtJandJte(jacobian, errors) {
    const numParams = jacobian.length;
    if (numParams === 0) return [[], []]; // Handle empty jacobian
    const numFreqs = errors.length;

    const JtJ = Array(numParams).fill(0).map(() => Array(numParams).fill(0));
    const Jte = Array(numParams).fill(0);

    // Calculate JᵀJ = Jacobianᵀ * Jacobian
    for (let i = 0; i < numParams; i++) {
      for (let j = i; j < numParams; j++) { // Calculate only upper triangle + diagonal
        let sum = 0;
        for (let k = 0; k < numFreqs; k++) {
           // Ensure values are finite before multiplication
           const val_i = isFinite(jacobian[i][k]) ? jacobian[i][k] : 0;
           const val_j = isFinite(jacobian[j][k]) ? jacobian[j][k] : 0;
           sum += val_i * val_j;
        }
         JtJ[i][j] = isFinite(sum) ? sum : 0;
        if (i !== j) {
          JtJ[j][i] = JtJ[i][j]; // Symmetric matrix
        }
      }
    }

    // Calculate Jᵀe = Jacobianᵀ * errors
    for (let i = 0; i < numParams; i++) {
      let sum = 0;
      for (let k = 0; k < numFreqs; k++) {
           const val_jac = isFinite(jacobian[i][k]) ? jacobian[i][k] : 0;
           const val_err = isFinite(errors[k]) ? errors[k] : 0;
           sum += val_jac * val_err;
      }
       Jte[i] = isFinite(sum) ? sum : 0;
    }

    return [JtJ, Jte];
  }


 /**
   * Solve the linear system Ax = b using Gaussian elimination with partial pivoting.
   * @param {Array<Array<number>>} A - The coefficient matrix (n x n). Modified in place.
   * @param {number[]} b - The right-hand side vector (n). Modified in place.
   * @returns {number[]} The solution vector x (n).
   * @throws {Error} If the matrix is singular or numerically unstable.
   */
  solveEquation(A, b) {
    const n = b.length;
    // Create copies to avoid modifying original arrays passed to fitPEQ
    const a = A.map(row => [...row]);
    const x = [...b]; // Will store results here temporarily

    // Forward Elimination with Partial Pivoting
    for (let i = 0; i < n; i++) {
      // Find pivot row (row with largest absolute value in column i, at or below row i)
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) {
          maxRow = k;
        }
      }

       // Swap rows i and maxRow in matrix A and vector x (representing b)
       [a[i], a[maxRow]] = [a[maxRow], a[i]];
       [x[i], x[maxRow]] = [x[maxRow], x[i]];

       // Check for singularity or near-singularity
       const pivot = a[i][i];
       if (Math.abs(pivot) < 1e-12) {
           // If pivot is near zero, the matrix is likely singular or ill-conditioned.
            // Check if other elements in the column below are also near zero
            let nonZeroBelow = false;
            for(let k=i+1; k<n; ++k) {
                if(Math.abs(a[k][i]) >= 1e-12) {
                    nonZeroBelow = true;
                    break;
                }
            }
            if (!nonZeroBelow) {
                // All elements below (and the pivot) are near zero.
                // Treat column as linearly dependent. This step might fail if not handled.
                 console.warn(`solveEquation: Matrix appears singular at column ${i}. Pivot ~0.`);
                 // Option 1: Throw error (safer, forces LM to increase lambda)
                 throw new Error(`Matrix is singular or near-singular at column ${i}. Pivot: ${pivot}`);
                 // Option 2: Return zero vector (can sometimes allow LM to proceed)
                 // return new Array(n).fill(0);
            }
            // If there's a non-zero element below, pivoting should have swapped it.
            // Getting here might indicate a numerical issue.
             console.warn(`solveEquation: Small pivot ${pivot} at column ${i} despite non-zero elements below.`);
             throw new Error(`Potential numerical instability with small pivot at column ${i}`);

       }


      // Eliminate column i for rows below row i
      for (let k = i + 1; k < n; k++) {
        const factor = a[k][i] / pivot;
        x[k] -= factor * x[i]; // Apply same operation to vector x
        // Apply to matrix row k
        // Start from column i because columns before i should already be zero
        // a[k][i] will become zero (or very close due to floating point)
        for (let j = i; j < n; j++) {
          a[k][j] -= factor * a[i][j];
        }
          // Explicitly set the element to 0 to avoid potential small non-zero values
           a[k][i] = 0.0;
      }
    }

    // Back Substitution
    const solution = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
        const diagElement = a[i][i];
        if (Math.abs(diagElement) < 1e-12) {
             // If diagonal element is zero during back substitution, matrix is singular
             console.error(`solveEquation: Zero or near-zero diagonal element ${diagElement} at row ${i} during back substitution.`);
             throw new Error(`Zero diagonal element during back substitution at row ${i}. Matrix is singular.`);
        }

        let sum = 0;
        for (let j = i + 1; j < n; j++) {
            sum += a[i][j] * solution[j];
        }
        solution[i] = (x[i] - sum) / diagElement;

        // Check for NaN/Infinity in solution (shouldn't happen if pivots are checked)
         if (!isFinite(solution[i])) {
             console.error(`solveEquation: Non-finite value (${solution[i]}) computed for solution element ${i}.`);
             throw new Error(`Non-finite solution element ${i} computed.`);
         }
    }

    return solution;
  }


  /**
   * Post-process optimized PEQ parameters: merge close bands and limit count.
   * @param {Array<{frequency: number, gain: number, Q: number, type: string}>} bands - Array of PEQ band objects.
   * @param {number} maxBands - Maximum number of bands allowed.
   * @returns {Array<{frequency: number, gain: number, Q: number, type: string}>} Processed array of PEQ bands.
   */
  processCollisions(bands, maxBands) {
    if (!bands || !Array.isArray(bands) || bands.length === 0) {
      return [];
    }

    // Filter out invalid or insignificant bands first
    const validBands = bands.filter(b =>
        b && typeof b.frequency === 'number' && isFinite(b.frequency) && b.frequency > 0 &&
        typeof b.gain === 'number' && isFinite(b.gain) && Math.abs(b.gain) >= 0.1 && // Keep only gains >= 0.1 dB
        typeof b.Q === 'number' && isFinite(b.Q) && b.Q > 0
    );

    if (validBands.length <= maxBands) {
        // If already within limit, just sort and return
        return validBands.sort((a, b) => a.frequency - b.frequency);
    }

    // Sort bands by frequency for collision detection/merging
    const sortedBands = [...validBands].sort((a, b) => a.frequency - b.frequency);

    // Merge bands that are too close (e.g., within 1/6 octave)
    const mergedBands = [];
    if (sortedBands.length > 0) {
        let currentBand = { ...sortedBands[0] }; // Work with a copy

        for (let i = 1; i < sortedBands.length; i++) {
            const nextBand = sortedBands[i];
            const freqRatio = nextBand.frequency / currentBand.frequency;
            const octaveDist = Math.abs(Math.log2(freqRatio));

            // Merge condition: close in frequency (e.g., < 1/6 octave) AND same gain sign (or one is near zero)
            const minOctaveDist = 1 / 6;
            if (octaveDist < minOctaveDist && (currentBand.gain * nextBand.gain >= 0 || Math.abs(currentBand.gain) < 0.5 || Math.abs(nextBand.gain) < 0.5)) {
                // Merge 'nextBand' into 'currentBand'
                currentBand.frequency = Math.exp(weight1 * Math.log(currentBand.frequency) + weight2 * Math.log(nextBand.frequency));

                 // Simple sum for gain (approximation, doesn't perfectly capture interaction)
                 currentBand.gain += nextBand.gain;

                 // Combine Q (approximation: resulting Q tends to be lower, reflecting wider influence)
                 // Use harmonic mean for bandwidths (BW = fc/Q), then calculate new Q
                 const bw1 = currentBand.frequency / currentBand.Q;
                 const bw2 = nextBand.frequency / nextBand.Q;
                  currentBand.Q = Math.min(currentBand.Q, nextBand.Q); // Simplest: use lower Q (wider band)


                 // Clamp parameters after merge
                 currentBand.gain = Math.max(-18, Math.min(18, currentBand.gain));
                 currentBand.Q = Math.max(0.5, Math.min(10, currentBand.Q));
                 currentBand.frequency = Math.max(20, Math.min(20000, currentBand.frequency));

            } else {
                // No merge, push the completed 'currentBand' and start new one
                mergedBands.push(currentBand);
                currentBand = { ...nextBand }; // Start new band
            }
        }
        mergedBands.push(currentBand); // Add the last band
    }


    // Filter again for significance after merging
     const finalBands = mergedBands.filter(b => Math.abs(b.gain) >= 0.2); // Stricter gain threshold after merge


    // If still too many bands, sort by absolute gain and take the top 'maxBands'
    if (finalBands.length > maxBands) {
      finalBands.sort((a, b) => Math.abs(b.gain) - Math.abs(a.gain));
      return finalBands.slice(0, maxBands).sort((a,b)=>a.frequency - b.frequency); // Return top N, sorted by freq
    } else {
       return finalBands.sort((a, b) => a.frequency - b.frequency); // Return all merged bands, sorted by freq
    }
  }


  /**
   * Design a parametric EQ to correct a frequency response.
   * @param {number[]} freq - Array of frequency values.
   * @param {number[]} magDb - Array of magnitude values in dB (normalized to ~0dB average).
   * @param {number} bandCount - Desired number of PEQ bands.
   * @param {number} binsPerOct - Smoothing factor.
   * @returns {Array<{frequency: number, gain: number, Q: number, type: string}>} Array of PEQ parameters.
   */
  designPEQ(freq, magDb, bandCount, binsPerOct) {
    // Basic validation already done in caller, but double-check lengths
    if (!freq || !magDb || freq.length !== magDb.length || freq.length < 3) {
        console.error("designPEQ: Invalid input data.");
        return this.createDefaultBands(bandCount);
    }

    try {
        // 1. Smooth the frequency response
        const smoothedMag = this.smoothLog(freq, magDb, binsPerOct);
        if (!smoothedMag || smoothedMag.length !== magDb.length) {
            console.error("designPEQ: Smoothing failed.");
            return this.createDefaultBands(bandCount);
        }

        // 2. Detect dominant errors (peaks and dips) on the smoothed data
        const candidates = this.findPeaksDips(freq, smoothedMag, 1.5, 0.5); // Use thresholds passed to findPeaksDips

        // 3. Generate Initial PEQ Parameters
        const initParams = []; // Flat array: [g1, Q1, fc1, g2, Q2, fc2, ...]
        const targetBands = bandCount; // Use the requested bandCount

        if (candidates.length === 0) {
            // No significant peaks/dips: create logarithmically spaced bands
            const logLow = Math.log10(this.lowFreq);
            const logHigh = Math.log10(this.highFreq);
            const logStep = (logHigh - logLow) / (targetBands + 1);

            for (let i = 1; i <= targetBands; i++) {
                const targetFc = 10**(logLow + i * logStep);
                // Find the closest frequency point in the input data
                let closestIdx = 0;
                let minLogDist = Infinity;
                for (let j = 0; j < freq.length; j++) {
                    const dist = Math.abs(Math.log10(freq[j]) - Math.log10(targetFc));
                    if (dist < minLogDist) {
                        minLogDist = dist;
                        closestIdx = j;
                    }
                }
                const fc = freq[closestIdx];
                // Initial gain aims to flatten the smoothed response at this point
                const gain = -smoothedMag[closestIdx];
                const Q = 1.41; // Default moderate Q

                initParams.push(gain, Q, fc);
            }
        } else {
            // Use detected peaks/dips for the first N bands
            const numBandsFromPeaks = Math.min(targetBands, candidates.length);
            for (let k = 0; k < numBandsFromPeaks; k++) {
                const i = candidates[k]; // Index in freq/smoothedMag array
                const fc = freq[i];
                const gain = -smoothedMag[i]; // Correct the deviation
                 const limitedGain = Math.max(-18, Math.min(18, gain));


                // Estimate Q based on bandwidth around the peak/dip in smoothed data
                 let Q = 1.41; // Default Q
                 const peakValue = smoothedMag[i];
                 const isPeak = peakValue > 0;
                 const targetRelLevel = isPeak ? -3.0 : 3.0; // Target relative level for -3dB points

                 // Search left for f1 (frequency at targetRelLevel)
                 let f1 = freq[0]; // Default to lowest freq
                 for (let j = i - 1; j >= 0; j--) {
                     if ((isPeak && smoothedMag[j] - peakValue <= targetRelLevel) ||
                         (!isPeak && smoothedMag[j] - peakValue >= targetRelLevel)) {
                          // Basic interpolation
                          const val1 = smoothedMag[j] - peakValue;
                          const val2 = smoothedMag[j+1] - peakValue;
                          const freq1 = freq[j];
                          const freq2 = freq[j+1];
                          if (Math.abs(val2 - val1) > 1e-3) { // Avoid division by zero
                             const t = (targetRelLevel - val1) / (val2 - val1);
                             f1 = freq1 + t * (freq2 - freq1);
                          } else {
                             f1 = freq[j];
                          }
                         break;
                     }
                     f1 = freq[j]; // Keep track of furthest point reached
                 }


                 // Search right for f2
                  let f2 = freq[freq.length - 1]; // Default to highest freq
                  for (let j = i + 1; j < freq.length; j++) {
                      if ((isPeak && smoothedMag[j] - peakValue <= targetRelLevel) ||
                          (!isPeak && smoothedMag[j] - peakValue >= targetRelLevel)) {
                           const val1 = smoothedMag[j-1] - peakValue;
                           const val2 = smoothedMag[j] - peakValue;
                           const freq1 = freq[j-1];
                           const freq2 = freq[j];
                          if (Math.abs(val2 - val1) > 1e-3) {
                             const t = (targetRelLevel - val1) / (val2 - val1);
                             f2 = freq1 + t * (freq2 - freq1);
                          } else {
                             f2 = freq[j];
                          }
                          break;
                      }
                       f2 = freq[j]; // Keep track of furthest point reached
                  }


                  // Calculate Q = fc / (f2 - f1)
                  if (f2 > f1) {
                      const bandwidth = f2 - f1;
                      if (bandwidth > 1e-3) { // Ensure bandwidth is positive
                          Q = fc / bandwidth;
                          Q = Math.max(0.5, Math.min(10, Q)); // Clamp Q
                      }
                  }


                 initParams.push(limitedGain, Q, fc);

            }

            // If more bands are needed, fill with logarithmically spaced bands
            if (numBandsFromPeaks < targetBands) {
                const logLow = Math.log10(this.lowFreq);
                const logHigh = Math.log10(this.highFreq);
                // Generate more points than needed initially
                const potentialFreqs = [];
                 for (let i = 1; i <= targetBands * 2; i++) {
                    const logF = logLow + (logHigh - logLow) * i / (targetBands * 2 + 1);
                    potentialFreqs.push(10**logF);
                 }

                // Filter potential frequencies to be far from existing initial bands
                const existingFreqs = initParams.filter((_, idx) => idx % 3 === 2);
                 const additionalFreqs = potentialFreqs.filter(pf => {
                    let minDist = Infinity;
                    existingFreqs.forEach(ef => {
                        minDist = Math.min(minDist, Math.abs(Math.log2(pf / ef)));
                    });
                    return minDist > 0.3; // Require at least ~1/3 octave separation
                 });

                const needed = targetBands - numBandsFromPeaks;
                 for (let i = 0; i < Math.min(needed, additionalFreqs.length); i++) {
                    const targetFc = additionalFreqs[i];
                    let closestIdx = 0;
                    let minLogDist = Infinity;
                    for (let j = 0; j < freq.length; j++) {
                       const dist = Math.abs(Math.log10(freq[j]) - Math.log10(targetFc));
                       if (dist < minLogDist) {
                           minLogDist = dist;
                           closestIdx = j;
                       }
                    }
                    const fc = freq[closestIdx];
                    const gain = -smoothedMag[closestIdx];
                    const Q = 1.41;
                    initParams.push(gain, Q, fc);
                 }

                 // If still not enough, add default bands
                 while(initParams.length / 3 < targetBands) {
                    initParams.push(0.0, 1.41, 1000); // Default band at 1kHz
                 }
            }
        }

        // Ensure we have exactly the target number of bands before optimization
        if (initParams.length / 3 !== targetBands) {
            // Truncate or pad if necessary (should ideally not happen with above logic)
             initParams.length = targetBands * 3;
             for(let i = 0; i < initParams.length; i++) {
                if (typeof initParams[i] === 'undefined') {
                    const type = i % 3; // 0=gain, 1=Q, 2=fc
                     initParams[i] = (type === 0) ? 0.0 : (type === 1 ? 1.41 : 1000);
                }
             }
        }


        console.log("Initial parameters prepared, starting optimization...");
        // 4. Optimize PEQ parameters using Levenberg-Marquardt
        let optimizedFlatParams = [];
        try {
            optimizedFlatParams = this.fitPEQ(freq, magDb, initParams); // Pass original non-smoothed magDb for optimization
            if (!optimizedFlatParams || optimizedFlatParams.length !== targetBands * 3) {
                 throw new Error("Optimization returned unexpected number of parameters or failed.");
            }
        } catch (error) {
            console.error("Error during PEQ optimization:", error);
            console.warn("Optimization failed, falling back to initial parameters.");
            optimizedFlatParams = initParams; // Use initial guess as fallback
        }


        // Convert flat optimized parameters to array of band objects
        const optimizedBands = [];
        for (let i = 0; i < targetBands; i++) {
            const idx = i * 3;
            const band = {
                frequency: optimizedFlatParams[idx + 2],
                gain: optimizedFlatParams[idx],
                Q: optimizedFlatParams[idx + 1],
                type: 'peaking'
            };
            // Basic validation of optimized parameters
             if (isFinite(band.frequency) && band.frequency > 0 &&
                 isFinite(band.gain) &&
                 isFinite(band.Q) && band.Q > 0) {
                 optimizedBands.push(band);
             } else {
                 console.warn(`Optimized band ${i+1} has invalid parameters, skipping.`);
             }
        }

        if (optimizedBands.length === 0) {
            console.error("designPEQ: No valid bands after optimization.");
            return this.createDefaultBands(bandCount);
        }


        // 5. Post-process: Resolve collisions and limit band count
        console.log("Optimization complete. Processing collisions and limiting bands...");
        const finalParams = this.processCollisions(optimizedBands, bandCount); // Use original bandCount target


         // Ensure the final number of bands matches the requested count, adding defaults if needed
         if (finalParams.length < bandCount) {
             console.warn(`designPEQ: Resulted in ${finalParams.length} bands, need ${bandCount}. Adding defaults.`);
             const defaultsNeeded = bandCount - finalParams.length;
             const defaultBands = this.createDefaultBands(defaultsNeeded);
             // Add defaults, trying to space them reasonably
             const existingFreqs = finalParams.map(b => b.frequency);
             let defaultIdx = 0;
             while (finalParams.length < bandCount && defaultIdx < defaultBands.length) {
                 const defaultBand = defaultBands[defaultIdx++];
                 // Check if frequency is too close to existing bands
                 let tooClose = false;
                 for(const ef of existingFreqs) {
                    if(Math.abs(Math.log2(defaultBand.frequency / ef)) < 0.2) { // Avoid bands closer than ~1/5 octave
                        tooClose = true;
                        break;
                    }
                 }
                 if (!tooClose) {
                    finalParams.push(defaultBand);
                    existingFreqs.push(defaultBand.frequency);
                 }
             }
             // If still not enough, force add remaining defaults
             while (finalParams.length < bandCount && defaultIdx < defaultBands.length) {
                  finalParams.push(defaultBands[defaultIdx++]);
             }
             finalParams.sort((a,b) => a.frequency - b.frequency); // Re-sort after adding defaults
         }


        console.log(`designPEQ: Returning ${finalParams.length} PEQ bands.`);
        return finalParams;

    } catch (error) {
        console.error("Exception in designPEQ:", error);
        return this.createDefaultBands(bandCount); // Fallback on any exception
    }
  }

  /**
   * Create default PEQ bands as a fallback.
   * @param {number} bandCount - Number of bands to create.
   * @returns {Array<{frequency: number, gain: number, Q: number, type: string}>} Array of default PEQ bands.
   */
  createDefaultBands(bandCount) {
    console.warn(`Creating ${bandCount} default PEQ bands.`);
    bandCount = Math.max(1, Math.min(15, bandCount)); // Ensure valid count

    const defaultBands = [];
    const lowFreq = this.lowFreq || 20;
    const highFreq = this.highFreq || 20000;

    // Create logarithmically spaced center frequencies
    const logLow = Math.log10(lowFreq);
    const logHigh = Math.log10(highFreq);
    // Place bands within the range, avoiding exact edges
    const logStep = (logHigh - logLow) / (bandCount + 1);

    for (let i = 1; i <= bandCount; i++) {
      const logF = logLow + i * logStep;
      const freq = Math.round(10**logF);
      defaultBands.push({
        frequency: freq,
        gain: 0.0,
        Q: 1.41, // Default Q
        type: 'peaking'
      });
    }
    return defaultBands;
  }
}

// Register the calculator class globally
window.PEQCalculator = PEQCalculator;