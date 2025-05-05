/**
 * Audio utility functions for frequency response measurements
 */

import AudioUtils from './core.js';
import * as DevicesMethods from './devices.js';
import * as SignalGenerationMethods from './signal-generation.js';
import * as SignalProcessingMethods from './signal-processing.js';
import FFT from './fft.js';

// Create a new AudioUtils instance
const audioUtils = new AudioUtils();

// Add methods from DevicesMethods to AudioUtils prototype
Object.keys(DevicesMethods).forEach(key => {
    AudioUtils.prototype[key] = DevicesMethods[key];
});

// Add methods from SignalGenerationMethods to AudioUtils prototype
Object.keys(SignalGenerationMethods).forEach(key => {
    AudioUtils.prototype[key] = SignalGenerationMethods[key];
});

// Add methods from SignalProcessingMethods to AudioUtils prototype
Object.keys(SignalProcessingMethods).forEach(key => {
    AudioUtils.prototype[key] = SignalProcessingMethods[key];
});

// Export singleton instance, AudioUtils class, and FFT class
export default audioUtils;
export { audioUtils, AudioUtils, FFT }; 