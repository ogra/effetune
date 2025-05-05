/**
 * Filter response calculation functions.
 */

/**
 * Calculate the frequency response of a single parametric EQ (peaking filter).
 * Uses the standard Audio EQ Cookbook biquad implementation.
 * @param {number[]} freq - Array of frequency values to calculate the response at.
 * @param {number} fc - Center frequency of the PEQ band.
 * @param {number} gainDb - Gain of the PEQ band in dB.
 * @param {number} Q - Q factor of the PEQ band.
 * @param {number} [fs=96000] - Sampling frequency in Hz.
 * @returns {number[]} Array of filter responses in dB at each frequency in `freq`.
 */
export function peqResponse(freq, fc, gainDb, Q, fs = 96000) {
  // Basic validation for fc and Q
  if (typeof fc !== 'number' || !isFinite(fc) || fc <= 0 || fc >= fs / 2) {
      console.warn(`Invalid fc (${fc}) for fs=${fs}. Returning flat response.`);
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
  const w0 = 2 * Math.PI * fc / fs;
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
    if (f <= 0 || f >= fs / 2) return 0; // Response is 0 outside valid range

    const omega = 2 * Math.PI * f / fs;
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