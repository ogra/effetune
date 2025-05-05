/**
 * UI Manager for handling UI components and interactions
 * This file is a legacy entry point that now uses the modular UI components
 */

import uiManager from './ui/ui-manager.js';

// Compatibility functions for legacy code
// These were moved to the CorrectionHandler class during refactoring
uiManager.logSliderToValue = function(sliderValue, minValue, maxValue) {
    return this.correctionHandler.logSliderToValue(sliderValue, minValue, maxValue);
};

uiManager.valueToLogSlider = function(value, minValue, maxValue) {
    return this.correctionHandler.valueToLogSlider(value, minValue, maxValue);
};

// Export the UI manager singleton for backward compatibility
export default uiManager; 