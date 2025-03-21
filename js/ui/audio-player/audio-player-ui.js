/**
 * AudioPlayerUI - Handles player UI creation and management
 * Manages user input and display updates
 */
export class AudioPlayerUI {
  constructor(audioPlayer) {
    this.audioPlayer = audioPlayer;
    this.container = null;
    this.trackNameDisplay = null;
    this.seekBar = null;
    this.timeDisplay = null;
    this.playPauseButton = null;
    this.stopButton = null;
    this.prevButton = null;
    this.nextButton = null;
    this.repeatButton = null;
    this.shuffleButton = null;
    this.closeButton = null;
    this.updateInterval = null;
  }
  
  /**
   * Create the player UI
   * @returns {HTMLElement} The player container element
   */
  createPlayerUI() {
    // Create container
    const container = document.createElement('div');
    container.className = 'audio-player';
    
    // Set initial button image based on repeat mode
    let repeatButtonImg = 'repeat_button.png';
    if (this.audioPlayer.playbackManager.repeatMode === 'ONE') {
      repeatButtonImg = 'repeat1_button.png';
    }
    
    container.innerHTML = `
     <h2>Player</h2>
     <div class="track-name-container">
       <div class="track-name">No track loaded</div>
     </div>
     <div class="player-controls">
        <input type="range" class="seek-bar" min="0" max="100" value="0" step="0.1">
        <div class="time-display">00:00</div>
        <button class="player-button play-pause-button"><img src="images/play_button.png" width="16" height="16"></button>
        <button class="player-button stop-button"><img src="images/stop_button.png" width="16" height="16"></button>
        <button class="player-button prev-button"><img src="images/previous_button.png" width="16" height="16"></button>
        <button class="player-button next-button"><img src="images/next_button.png" width="16" height="16"></button>
        <button class="player-button repeat-button"><img src="images/${repeatButtonImg}" width="16" height="16"></button>
        <button class="player-button shuffle-button"><img src="images/shuffle_button.png" width="16" height="16"></button>
        <button class="player-button close-button">✖</button>
      </div>
    `;

    // Store references to UI elements
    this.container = container;
    this.trackNameDisplay = container.querySelector('.track-name');
    this.seekBar = container.querySelector('.seek-bar');
    this.timeDisplay = container.querySelector('.time-display');
    this.playPauseButton = container.querySelector('.play-pause-button');
    this.stopButton = container.querySelector('.stop-button');
    this.prevButton = container.querySelector('.prev-button');
    this.nextButton = container.querySelector('.next-button');
    this.repeatButton = container.querySelector('.repeat-button');
    this.shuffleButton = container.querySelector('.shuffle-button');
    this.closeButton = container.querySelector('.close-button');

    // Add event listeners
    this.playPauseButton.addEventListener('click', () => this.audioPlayer.togglePlayPause());
    this.stopButton.addEventListener('click', () => this.audioPlayer.stop());
    this.prevButton.addEventListener('click', () => this.audioPlayer.playPrevious());
    this.nextButton.addEventListener('click', () => this.audioPlayer.playNext());
    this.closeButton.addEventListener('click', () => this.audioPlayer.close());
    
    // Add repeat button event listener
    this.repeatButton.addEventListener('click', () => this.audioPlayer.playbackManager.toggleRepeatMode());
    
    // Add shuffle button event listener
    this.shuffleButton.addEventListener('click', () => this.audioPlayer.playbackManager.toggleShuffleMode());
    
    // Update UI based on loaded state
    this.updatePlayerUIState();
    
    this.seekBar.addEventListener('input', () => {
      if (this.audioPlayer.audioElement) {
        const seekTime = (this.seekBar.value / 100) * this.audioPlayer.audioElement.duration;
        this.audioPlayer.audioElement.currentTime = seekTime;
        this.updateTimeDisplay();
      }
    });

    // Insert player into DOM
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
      // Insert player before main-container instead of inside it
      mainContainer.parentNode.insertBefore(container, mainContainer);
    }

    // Start update interval for time display
    this.startUpdateInterval();

    return container;
  }

  /**
   * Update player UI based on current state
   */
  updatePlayerUIState() {
    if (!this.repeatButton || !this.shuffleButton) return;
    
    // Update repeat button state
    switch (this.audioPlayer.playbackManager.repeatMode) {
      case 'ALL':
        this.repeatButton.innerHTML = '<img src="images/repeat_button.png" width="16" height="16">';
        this.repeatButton.style.backgroundColor = '#4a9eff'; // Highlight button when active
        break;
      case 'ONE':
        this.repeatButton.innerHTML = '<img src="images/repeat1_button.png" width="16" height="16">';
        this.repeatButton.style.backgroundColor = '#4a9eff';
        
        // Disable shuffle button in ONE mode
        this.shuffleButton.disabled = true;
        this.shuffleButton.style.opacity = '0.5';
        break;
      case 'OFF':
      default:
        this.repeatButton.innerHTML = '<img src="images/repeat_button.png" width="16" height="16">';
        this.repeatButton.style.backgroundColor = ''; // Reset button color
        
        // Enable shuffle button
        this.shuffleButton.disabled = false;
        this.shuffleButton.style.opacity = '1';
        break;
    }
    
    // Update shuffle button state
    if (this.audioPlayer.playbackManager.shuffleMode && this.audioPlayer.playbackManager.repeatMode !== 'ONE') {
      this.shuffleButton.style.backgroundColor = '#4a9eff'; // Highlight button when active
    } else {
      this.shuffleButton.style.backgroundColor = ''; // Reset button color
    }
  }

  /**
   * Update play/pause button state
   */
  updatePlayPauseButton() {
    if (!this.playPauseButton) return;
    
    if (this.audioPlayer.playbackManager.isPlaying) {
      this.playPauseButton.innerHTML = '<img src="images/pause_button.png" width="16" height="16">';
    } else {
      this.playPauseButton.innerHTML = '<img src="images/play_button.png" width="16" height="16">';
    }
  }

  /**
   * Update track display with track name
   * @param {Object} track - The track object
   */
  updateTrackDisplay(track) {
    if (!this.trackNameDisplay) return;
    
    if (track && track.name) {
      this.trackNameDisplay.textContent = track.name;
    } else {
      this.trackNameDisplay.textContent = 'No track loaded';
    }
  }

  /**
   * Update time display and seek bar
   */
  updateTimeDisplay() {
    if (!this.audioPlayer.audioElement || !this.timeDisplay || !this.seekBar) return;
    
    // Update time display
    const currentTime = this.audioPlayer.audioElement.currentTime;
    const duration = this.audioPlayer.audioElement.duration || 0;
    
    // Format time display
    this.timeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
    
    // Update seek bar position
    if (!isNaN(duration) && duration > 0) {
      this.seekBar.value = (currentTime / duration) * 100;
    }
  }

  /**
   * Format time in seconds to MM:SS format
   * @param {number} time - Time in seconds
   * @returns {string} Formatted time string
   */
  formatTime(time) {
    if (isNaN(time)) return '00:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Start interval for updating time display
   */
  startUpdateInterval() {
    // Clear any existing interval
    this.stopUpdateInterval();
    
    // Update every 250ms
    this.updateInterval = setInterval(() => {
      this.updateTimeDisplay();
    }, 250);
  }

  /**
   * Stop time display update interval
   */
  stopUpdateInterval() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Remove player UI from DOM
   */
  removeUI() {
    this.stopUpdateInterval();
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    this.container = null;
    this.trackNameDisplay = null;
    this.seekBar = null;
    this.timeDisplay = null;
    this.playPauseButton = null;
    this.stopButton = null;
    this.prevButton = null;
    this.nextButton = null;
    this.repeatButton = null;
    this.shuffleButton = null;
    this.closeButton = null;
  }
}