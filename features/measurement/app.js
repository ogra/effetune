/**
 * Main application entry point
 * Initializes and connects all components
 */

import audioUtils from './audioUtils.js';
import dataStorage from './dataStorage.js';
import uiManager from './uiManager.js';
import measurementController from './measurementController.js';
import i18n from './i18n.js'; // Import the i18n module
import './peqCalculator.js'; // Import the new PEQ calculator

/**
 * Initialize all application components
 */
async function initializeApp() {
    try {
        // Initialize internationalization first
        await i18n.initI18n();
        
        // Initialize data storage first
        await dataStorage.initialize();
        
        // Check browser audio capabilities
        checkBrowserAudioSupport();
        
        // Initialize measurement controller (which initializes audio)
        await measurementController.initialize();
        
        // Initialize PEQ Calculator and override the existing method
        initializePEQCalculator();
        
        // Initialize UI last (after data is loaded)
        await uiManager.initialize();
        
        // Connect UI events to measurement controller
        setupEventConnections();
    } catch (error) {
        console.error('Error initializing application:', error);
        alert(`Initialization Error: ${error.message}`);
    }
}

/**
 * Check browser audio support and limitations
 */
function checkBrowserAudioSupport() {
    // Check if AudioContext is supported
    if (!(window.AudioContext || window.webkitAudioContext)) {
        console.error('AudioContext is not supported in this browser');
        alert('This browser does not support Web Audio API. Please try another browser.');
        return;
    }
    
    // Check if AudioWorklet is supported
    const tempContext = new (window.AudioContext || window.webkitAudioContext)();
    if (!tempContext.audioWorklet) {
        console.warn('AudioWorklet is not supported in this browser, will use fallback');
    }
    
    // Suspend the temporary context to avoid resource leak
    tempContext.close().catch(e => console.error('Error closing temp context:', e));
}

/**
 * Initialize and override PEQ calculator
 */
function initializePEQCalculator() {
    // Create an instance of the new calculator
    const peqCalculator = new window.PEQCalculator();
    
    // Override the existing method with the new implementation
    audioUtils.calculatePEQParameters = function(frequencyResponse, lowFreq, highFreq, bandCount, smoothing) {
        // Convert smoothing value (0.01-1.0) to binsPerOct (3-24)
        // Lower smoothing = more smoothing (counterintuitive)
        // So: 0.01 (max smoothing) -> 3 (few bins)
        //     1.00 (min smoothing) -> 24 (many bins)
        const binsPerOct = 3 + (smoothing * 21);
        
        // Use the new algorithm with converted smoothing parameter
        // frequencyResponse should already be normalized to 0dB by uiManager.normalizeResponseToZeroDb
        return peqCalculator.calculatePEQParameters(frequencyResponse, lowFreq, highFreq, bandCount, undefined, binsPerOct);
    };
}

/**
 * Connect UI events to measurement controller functions
 */
function setupEventConnections() {
    // Configuration form submission
    document.getElementById('configForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form values
        const config = {
            name: document.getElementById('measurementName').value.trim(),
            audioInput: document.getElementById('audioInput').options[document.getElementById('audioInput').selectedIndex].text,
            audioInputId: document.getElementById('audioInput').value,
            audioOutput: document.getElementById('audioOutput').options[document.getElementById('audioOutput').selectedIndex].text,
            audioOutputId: document.getElementById('audioOutput').value,
            sampleRate: parseInt(document.getElementById('sampleRate').value),
            sweepLength: document.getElementById('sweepLength').value,
            averaging: parseInt(document.getElementById('averaging').value),
            inputChannel: document.getElementById('inputChannel').value,
            outputChannel: document.getElementById('outputChannel').value
        };
        
        // Validate form
        if (!config.name) {
            alert('Please enter a measurement name');
            return;
        }
        
        // Start measurement
        measurementController.startNewMeasurement(config);
    });
    
    // White noise toggle button
    document.getElementById('noiseToggleBtn').addEventListener('click', async () => {
        try {
            await measurementController.toggleWhiteNoise();
        } catch (error) {
            console.error('Error in noise toggle handler:', error);
            alert(`Toggle Button Error: ${error.message}`);
        }
    });
    
    // Noise level slider
    document.getElementById('noiseLevel').addEventListener('input', (e) => {
        measurementController.updateNoiseLevel(e.target.value);
    });
    
    // Start measurement button
    document.getElementById('startMeasurementBtn').addEventListener('click', () => {
        measurementController.startSweepMeasurement();
    });
    
    // Redo button
    document.getElementById('redoBtn').addEventListener('click', () => {
        measurementController.redoMeasurement();
    });
    
    // Save and continue button
    document.getElementById('saveAndContinueBtn').addEventListener('click', () => {
        measurementController.saveAndContinueMeasurement();
    });
    
    // Save and finish button
    document.getElementById('saveAndFinishBtn').addEventListener('click', async () => {
        try {
            // Call the measurement controller's method to save and finish
            const measurementId = await measurementController.finishMeasurement();
            
            if (measurementId) {
                // Navigate to results screen
                uiManager.showScreen('resultsDisplayScreen');
                // Select the newly saved measurement
                await uiManager.selectMeasurement(measurementId);
            }
        } catch (error) {
            console.error('Error finishing measurement:', error);
        }
    });

    // Connect back buttons to properly clean up audio
    document.getElementById('backFromLevelBtn').addEventListener('click', () => {
        // Ensure audio cleanup before navigation
        uiManager.cleanupAudioBeforeNavigation();
        // Return to config screen
        uiManager.showScreen('measurementConfigScreen');
    });
    
    document.getElementById('backFromSweepBtn').addEventListener('click', () => {
        // Ensure audio cleanup before navigation
        uiManager.cleanupAudioBeforeNavigation();
        // Return to level adjustment screen
        uiManager.showScreen('levelAdjustmentScreen');
        // Prepare for level adjustment again
        measurementController.prepareForLevelAdjustment();
    });
    
    // Add window beforeunload event to clean up audio
    window.addEventListener('beforeunload', () => {
        uiManager.cleanupAudioBeforeNavigation();
    });
    
    // Copy PEQ settings to clipboard button
    document.getElementById('copyPEQBtn').addEventListener('click', () => {
        const measurement = window.app.dataStorage.getMeasurementById(window.app.uiManager.selectedMeasurementId);
        if (!measurement || !measurement.peqParameters) {
            // Replace hardcoded message with i18n call
            const errorMessage = i18n.t('error:noPEQSettings') || 'No PEQ settings available for this measurement';
            alert(errorMessage);
            return;
        }
        
        copyPEQToClipboard();
        // Replace hardcoded message with i18n call
        const successMessage = i18n.t('message:peqCopied') || 'PEQ settings copied to clipboard successfully. The copied settings can be pasted into EffeTune\'s effect pipeline using Ctrl+V.';
        window.app.uiManager.showNotification(successMessage);
    });

    // Language selector - only add if element exists
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.addEventListener('change', async (e) => {
            const newLang = e.target.value;
            await i18n.setLanguage(newLang);
            localStorage.setItem('effetune-language', newLang);
        });
    }
}

/**
 * Populate audio device select elements
 */
async function populateAudioDevices() {
    try {
        // Wait for audio to be initialized
        if (!audioUtils.initialized) {
            await audioUtils.initialize();
        }
        
        // Get devices
        const devices = audioUtils.devices;
        
        // Populate input devices
        const inputSelect = document.getElementById('audioInput');
        inputSelect.innerHTML = '';
        
        devices.inputs.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.text = device.label;
            inputSelect.appendChild(option);
        });
        
        // Populate output devices
        const outputSelect = document.getElementById('audioOutput');
        outputSelect.innerHTML = '';
        
        devices.outputs.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.text = device.label;
            outputSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating audio devices:', error);
    }
}

/**
 * Copy PEQ settings to clipboard
 */
function copyPEQToClipboard() {
    // Get the current measurement
    const measurement = window.app.dataStorage.getMeasurementById(window.app.uiManager.selectedMeasurementId);
    if (!measurement || !measurement.peqParameters) {
        alert('No PEQ settings available for this measurement');
        return;
    }
    
    // Get the EQ band count
    const bandCount = parseInt(document.getElementById('eqBandCount').value);
    
    // Prepare PEQ JSON structure
    const peqJSON = [{
        "nm": "5Band PEQ",
        "en": true
    }];
    
    // Add channel information if needed
    if (measurement.outputChannel === 'left') {
        peqJSON[0].ch = "L";
    } else if (measurement.outputChannel === 'right') {
        peqJSON[0].ch = "R";
    }
    
    // Sort PEQ parameters by frequency
    const sortedParams = [...measurement.peqParameters].sort((a, b) => a.frequency - b.frequency);
    
    // Add parameters for each band
    const maxBands = 5;
    for (let i = 0; i < maxBands; i++) {
        const param = i < sortedParams.length && i < bandCount ? sortedParams[i] : null;
        
        peqJSON[0][`f${i}`] = param ? param.frequency : [100, 316, 1000, 3160, 10000][i];
        peqJSON[0][`g${i}`] = param ? param.gain : 0;
        peqJSON[0][`q${i}`] = param ? param.Q : 1;
        peqJSON[0][`t${i}`] = "pk";
        peqJSON[0][`e${i}`] = i < sortedParams.length && i < bandCount;
    }
    
    // Handle more than 5 bands if needed
    if (bandCount > 5 && sortedParams.length > 5) {
        // Create additional 5-band PEQ objects for the remaining bands
        const additionalBands = Math.min(sortedParams.length, bandCount) - 5;
        const additionalSets = Math.ceil(additionalBands / 5);
        
        for (let setIndex = 0; setIndex < additionalSets; setIndex++) {
            const setObj = {
                "nm": "5Band PEQ",
                "en": true
            };
            
            // Add channel information if needed
            if (measurement.outputChannel === 'left') {
                setObj.ch = "L";
            } else if (measurement.outputChannel === 'right') {
                setObj.ch = "R";
            }
            
            // Add parameters for each band in this set
            for (let i = 0; i < maxBands; i++) {
                const paramIndex = 5 + (setIndex * 5) + i;
                const param = paramIndex < sortedParams.length && paramIndex < bandCount ? sortedParams[paramIndex] : null;
                
                setObj[`f${i}`] = param ? param.frequency : [100, 316, 1000, 3160, 10000][i];
                setObj[`g${i}`] = param ? param.gain : 0;
                setObj[`q${i}`] = param ? param.Q : 1;
                setObj[`t${i}`] = "pk";
                setObj[`e${i}`] = param ? true : false;
            }
            
            peqJSON.push(setObj);
        }
    }
    
    // Convert to JSON string
    const jsonString = JSON.stringify(peqJSON, null, 2);
    
    // Copy to clipboard
    navigator.clipboard.writeText(jsonString).then(() => {
        // Log success but don't show alert
        console.log('PEQ parameters copied to clipboard.');
    }).catch(err => {
        console.error('Failed to copy PEQ parameters: ', err);
        alert('Failed to copy PEQ parameters: ' + err);
    });
}

/**
 * Save current form settings to localStorage
 */
function saveUserSettings() {
    // Get current settings
    const settings = {
        // Measurement config settings
        sampleRate: document.getElementById('sampleRate').value,
        inputChannel: document.getElementById('inputChannel').value,
        outputChannel: document.getElementById('outputChannel').value,
        sweepLength: document.getElementById('sweepLength').value,
        averaging: document.getElementById('averaging').value,
    };
    
    // Save audio devices if available
    const audioInput = document.getElementById('audioInput');
    const audioOutput = document.getElementById('audioOutput');
    
    if (audioInput && audioInput.value) {
        settings.audioInputId = audioInput.value;
        const selectedOption = audioInput.options[audioInput.selectedIndex];
        if (selectedOption) {
            settings.audioInputLabel = selectedOption.text;
        }
    }
    
    if (audioOutput && audioOutput.value) {
        settings.audioOutputId = audioOutput.value;
        const selectedOption = audioOutput.options[audioOutput.selectedIndex];
        if (selectedOption) {
            settings.audioOutputLabel = selectedOption.text;
        }
    }
    
    window.app.dataStorage.saveUserSettings(settings);
}

/**
 * Save current PEQ parameters to global settings
 * These are shared across all measurements
 */
function savePEQSettings() {
    const peqSettings = {
        // PEQ settings
        smoothing: document.getElementById('smoothing').value,
        lowFreq: document.getElementById('targetLowFreqSlider').value,
        highFreq: document.getElementById('targetHighFreqSlider').value,
        eqBandCount: document.getElementById('eqBandCount').value
    };
    
    window.app.dataStorage.savePEQSettings(peqSettings);
}

/**
 * Load user settings from localStorage and apply them
 */
function loadUserSettings() {
    const settings = window.app.dataStorage.loadUserSettings();
    
    // Apply settings if they exist
    if (settings) {
        // Measurement config settings
        if (settings.sampleRate) document.getElementById('sampleRate').value = settings.sampleRate;
        if (settings.inputChannel) document.getElementById('inputChannel').value = settings.inputChannel;
        if (settings.outputChannel) document.getElementById('outputChannel').value = settings.outputChannel;
        if (settings.sweepLength) document.getElementById('sweepLength').value = settings.sweepLength;
        if (settings.averaging) document.getElementById('averaging').value = settings.averaging;
    }
}

/**
 * Load PEQ settings and apply them to the UI
 */
function loadPEQSettings() {
    const peqSettings = window.app.dataStorage.loadPEQSettings();
    
    if (peqSettings) {
        // PEQ settings
        if (peqSettings.smoothing) {
            const smoothingSlider = document.getElementById('smoothing');
            const smoothingValue = document.getElementById('smoothingValue');
            if (smoothingSlider && smoothingValue) {
                smoothingSlider.value = peqSettings.smoothing;
                smoothingValue.textContent = parseFloat(peqSettings.smoothing).toFixed(2);
            }
        }
        
        if (peqSettings.lowFreq) {
            const lowFreqSlider = document.getElementById('targetLowFreqSlider');
            const lowFreqValue = document.getElementById('targetLowFreqValue');
            if (lowFreqSlider && lowFreqValue) {
                lowFreqSlider.value = peqSettings.lowFreq;
                lowFreqValue.textContent = Math.round(window.app.uiManager.logSliderToValue(peqSettings.lowFreq, 20, 1000));
            }
        }
        
        if (peqSettings.highFreq) {
            const highFreqSlider = document.getElementById('targetHighFreqSlider');
            const highFreqValue = document.getElementById('targetHighFreqValue');
            if (highFreqSlider && highFreqValue) {
                highFreqSlider.value = peqSettings.highFreq;
                highFreqValue.textContent = Math.round(window.app.uiManager.logSliderToValue(peqSettings.highFreq, 1000, 20000));
            }
        }
        
        if (peqSettings.eqBandCount) {
            const eqBandCountSlider = document.getElementById('eqBandCount');
            const eqBandCountValue = document.getElementById('eqBandCountValue');
            if (eqBandCountSlider && eqBandCountValue) {
                eqBandCountSlider.value = peqSettings.eqBandCount;
                eqBandCountValue.textContent = peqSettings.eqBandCount;
            }
        }
        
        // Apply settings to current measurement display if any
        if (window.app.uiManager.selectedMeasurementId) {
            window.app.uiManager.updateResultsGraph();
            window.app.uiManager.updateCorrection();
        }
    }
}

/**
 * Select saved audio devices if available
 */
function selectSavedAudioDevices() {
    const settings = window.app.dataStorage.loadUserSettings();
    
    if (settings) {
        const audioInput = document.getElementById('audioInput');
        const audioOutput = document.getElementById('audioOutput');
        
        // Select saved input device if available
        if (settings.audioInputId && audioInput) {
            for (let i = 0; i < audioInput.options.length; i++) {
                if (audioInput.options[i].value === settings.audioInputId) {
                    audioInput.selectedIndex = i;
                    break;
                }
            }
        }
        
        // Select saved output device if available
        if (settings.audioOutputId && audioOutput) {
            for (let i = 0; i < audioOutput.options.length; i++) {
                if (audioOutput.options[i].value === settings.audioOutputId) {
                    audioOutput.selectedIndex = i;
                    break;
                }
            }
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    
    // Load user settings when app starts
    loadUserSettings();
    
    // Load PEQ settings when app starts
    loadPEQSettings();
    
    // Handle new measurement button click
    document.getElementById('newMeasurementBtn').addEventListener('click', async () => {
        // Populate audio devices when starting a new measurement
        await populateAudioDevices();
        // Select saved devices if available
        setTimeout(() => selectSavedAudioDevices(), 100);
    });
    
    // Save measurement settings when values change
    document.getElementById('sampleRate').addEventListener('change', saveUserSettings);
    document.getElementById('inputChannel').addEventListener('change', saveUserSettings);
    document.getElementById('outputChannel').addEventListener('change', saveUserSettings);
    document.getElementById('sweepLength').addEventListener('change', saveUserSettings);
    document.getElementById('averaging').addEventListener('change', saveUserSettings);
    document.getElementById('audioInput').addEventListener('change', saveUserSettings);
    document.getElementById('audioOutput').addEventListener('change', saveUserSettings);
    
    // Save PEQ settings when values change
    document.getElementById('smoothing').addEventListener('change', savePEQSettings);
    document.getElementById('targetLowFreqSlider').addEventListener('change', savePEQSettings);
    document.getElementById('targetHighFreqSlider').addEventListener('change', savePEQSettings);
    document.getElementById('eqBandCount').addEventListener('change', savePEQSettings);
    
    // Add input handlers to update the display immediately
    document.getElementById('smoothing').addEventListener('input', () => {
        const value = document.getElementById('smoothing').value;
        document.getElementById('smoothingValue').textContent = parseFloat(value).toFixed(2);
    });
    
    document.getElementById('targetLowFreqSlider').addEventListener('input', () => {
        const value = document.getElementById('targetLowFreqSlider').value;
        const freq = window.app.uiManager.logSliderToValue(value, 20, 1000);
        document.getElementById('targetLowFreqValue').textContent = Math.round(freq);
    });
    
    document.getElementById('targetHighFreqSlider').addEventListener('input', () => {
        const value = document.getElementById('targetHighFreqSlider').value;
        const freq = window.app.uiManager.logSliderToValue(value, 1000, 20000);
        document.getElementById('targetHighFreqValue').textContent = Math.round(freq);
    });
    
    document.getElementById('eqBandCount').addEventListener('input', () => {
        const value = document.getElementById('eqBandCount').value;
        document.getElementById('eqBandCountValue').textContent = value;
    });
});

// Handle errors
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

// Export for debug access from console
window.app = {
    audioUtils,
    dataStorage,
    uiManager,
    measurementController
}; 

// Add compatibility wrapper functions for legacy code
window.app.uiManager.logSliderToValue = function(sliderValue, minValue, maxValue) {
    return this.correctionHandler.logSliderToValue(sliderValue, minValue, maxValue);
};

window.app.uiManager.valueToLogSlider = function(value, minValue, maxValue) {
    return this.correctionHandler.valueToLogSlider(value, minValue, maxValue);
}; 