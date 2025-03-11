export class StateManager {
    constructor(audioManager) {
        this.audioManager = audioManager;
        
        // UI elements
        this.errorDisplay = document.getElementById('errorDisplay');
        this.resetButton = document.getElementById('resetButton');
        this.shareButton = document.getElementById('shareButton');
        this.sampleRate = document.getElementById('sampleRate');
        
        // More robust detection of Electron environment
        const userAgent = navigator.userAgent.toLowerCase();
        const isElectronUA = userAgent.indexOf(' electron/') > -1;
        const isElectron = (window.electronAPI !== undefined) ||
                          (window.electronIntegration && window.electronIntegration.isElectronEnvironment()) ||
                          isElectronUA;
        
        // Update button text if running in Electron
        if (isElectron) {
            this.resetButton.textContent = 'Config Audio';
        }
        
        this.initEventListeners();
    }

    initEventListeners() {
        this.resetButton.addEventListener('click', () => {
            // More robust detection of Electron environment
            const userAgent = navigator.userAgent.toLowerCase();
            const isElectronUA = userAgent.indexOf(' electron/') > -1;
            const isElectron = (window.electronAPI !== undefined) ||
                              (window.electronIntegration && window.electronIntegration.isElectronEnvironment()) ||
                              isElectronUA;
            
            // If running in Electron, show audio config dialog
            if (isElectron && window.electronIntegration) {
                // Use translation key if UIManager is available
                if (window.uiManager && window.uiManager.t) {
                    this.setError(window.uiManager.t('status.configuringAudio'));
                } else {
                    this.setError('Configuring audio devices...');
                }
                // Just show the dialog - the dialog itself will handle reloading
                window.electronIntegration.showAudioConfigDialog();
            } else {
                // Default behavior for web version
                if (window.uiManager && window.uiManager.t) {
                    this.setError(window.uiManager.t('status.reloading'));
                } else {
                    this.setError('Reloading...');
                }
                window.location.reload();
            }
        });
    }

    setError(message, isError = false) {
        this.errorDisplay.textContent = message;
        this.errorDisplay.classList.toggle('error-message', isError);
    }

    clearError() {
        this.errorDisplay.textContent = '';
    }

    // Call this method after audio context is initialized
    initAudio() {
        if (this.audioManager.audioContext) {
            this.sampleRate.textContent = `${this.audioManager.audioContext.sampleRate} Hz`;
        }
    }
}
