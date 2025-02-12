export class StateManager {
    constructor(audioManager) {
        this.audioManager = audioManager;
        
        // UI elements
        this.errorDisplay = document.getElementById('errorDisplay');
        this.resetButton = document.getElementById('resetButton');
        this.shareButton = document.getElementById('shareButton');
        this.sampleRate = document.getElementById('sampleRate');
        
        this.initEventListeners();
    }

    initEventListeners() {
        this.resetButton.addEventListener('click', () => {
            this.setError('Reloading...');
            window.location.reload();
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
