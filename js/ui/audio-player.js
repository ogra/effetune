/**
 * Audio Player class for music file playback
 * Handles playback of audio files and integration with the effect pipeline
 */
export class AudioPlayer {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.audioContext = audioManager.audioContext;
    this.playlist = [];
    this.currentTrackIndex = 0;
    this.audioElement = null;
    this.mediaSource = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.originalSourceNode = null;
    this.container = null;
    this.seekBar = null;
    this.timeDisplay = null;
    this.trackNameDisplay = null;
    this.playPauseButton = null;
    this.stopButton = null;
    this.prevButton = null;
    this.nextButton = null;
    this.closeButton = null;
    this.repeatButton = null;
    this.shuffleButton = null;
    this.updateInterval = null;
    this.currentObjectURL = null; // Store current object URL for cleanup
    
    // Repeat and shuffle state
    this.repeatMode = 'OFF'; // OFF, ALL, ONE
    this.shuffleMode = false;
    this.originalPlaylist = []; // Store original playlist order for shuffle mode
    
    // Store original source node for restoration
    if (this.audioManager.sourceNode) {
      this.originalSourceNode = this.audioManager.sourceNode;
    }
    
    // Load saved player state
    this.loadPlayerState().then(() => {
      // After loading player state, make sure UI is updated when created
      if (this.container) {
        this.updatePlayerUIState();
      }
    });
    
    // Initialize keyboard shortcuts
    this.initKeyboardShortcuts();
  }
  
  /**
   * Load player state from player-state.json
   * @returns {Promise} A promise that resolves when the player state is loaded
   */
  async loadPlayerState() {
    if (!window.electronAPI || !window.electronIntegration) return Promise.resolve();
    
    try {
      // Get user data path
      const userDataPath = await window.electronAPI.getPath('userData');
      
      // Get player state file path
      const stateFilePath = await window.electronAPI.joinPaths(userDataPath, 'player-state.json');
      
      // Check if file exists
      const fileExists = await window.electronAPI.fileExists(stateFilePath);
      
      if (fileExists) {
        // Read player state file
        const result = await window.electronAPI.readFile(stateFilePath);
        
        if (result.success) {
          // Parse player state
          const playerState = JSON.parse(result.content);
          
          // Load repeat and shuffle state if available
          if (playerState.repeatMode) {
            this.repeatMode = playerState.repeatMode;
          }
          
          if (playerState.shuffleMode !== undefined) {
            this.shuffleMode = playerState.shuffleMode;
          }
        }
      }
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to load player state:', error);
      return Promise.resolve();
    }
  }
  
  /**
   * Save player state to player-state.json
   */
  async savePlayerState() {
    if (!window.electronAPI || !window.electronIntegration) return;
    
    try {
      // Get user data path
      const userDataPath = await window.electronAPI.getPath('userData');
      
      // Get player state file path
      const stateFilePath = await window.electronAPI.joinPaths(userDataPath, 'player-state.json');
      
      // Create player state object
      const playerState = {
        repeatMode: this.repeatMode,
        shuffleMode: this.shuffleMode
      };
      
      // Save player state
      await window.electronAPI.saveFile(stateFilePath, JSON.stringify(playerState, null, 2));
    } catch (error) {
      console.error('Failed to save player state:', error);
    }
  }
  
  /**
   * Initialize keyboard shortcuts for audio player
   */
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Skip if audio player is not initialized or no audio element exists
      if (!this.audioElement) return;
      
      // Skip if focus is on an input, textarea, or select element (except for Space key on range inputs)
      if (e.target.matches('input:not([type="range"]), textarea, select')) {
        return;
      }
      
      // Handle keyboard shortcuts
      switch (e.key) {
        case ' ': // Space - Play/Pause
          // Only handle space if not on a button or other interactive element
          if (!e.target.matches('button, [role="button"], a, .interactive')) {
            e.preventDefault();
            this.togglePlayPause();
          }
          break;
          
        case 'n': // N - Next track
        case 'N':
          if (!e.target.matches('input, textarea')) {
            e.preventDefault();
            this.playNext();
          }
          break;
          
        case 'p': // P - Previous track
        case 'P':
          if (!e.target.matches('input, textarea')) {
            e.preventDefault();
            this.playPrevious();
          }
          break;
          
        case 'ArrowRight': // Right arrow
          if (e.ctrlKey) { // Ctrl+Right - Next track
            e.preventDefault();
            this.playNext();
          } else if (e.shiftKey) { // Shift+Right - Fast forward
            e.preventDefault();
            this.fastForward();
          }
          break;
          
        case 'ArrowLeft': // Left arrow
          if (e.ctrlKey) { // Ctrl+Left - Previous track
            e.preventDefault();
            this.playPrevious();
          } else if (e.shiftKey) { // Shift+Left - Rewind
            e.preventDefault();
            this.rewind();
          }
          break;
          
        case 'f': // F - Fast forward
        case 'F':
        case '.': // Period - Fast forward
          if (!e.target.matches('input, textarea')) {
            e.preventDefault();
            this.fastForward();
          }
          break;
          
        case 'b': // B - Rewind
        case 'B':
        case ',': // Comma - Rewind
          if (!e.target.matches('input, textarea')) {
            e.preventDefault();
            this.rewind();
          }
          break;
      }
    });
  }
  
  /**
   * Fast forward the current track by 10 seconds
   */
  fastForward() {
    if (!this.audioElement) return;
    
    const newTime = Math.min(this.audioElement.currentTime + 10, this.audioElement.duration);
    this.audioElement.currentTime = newTime;
    this.updateTimeDisplay();
  }
  
  /**
   * Rewind the current track by 10 seconds
   */
  rewind() {
    if (!this.audioElement) return;
    
    const newTime = Math.max(this.audioElement.currentTime - 10, 0);
    this.audioElement.currentTime = newTime;
    this.updateTimeDisplay();
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
    if (this.repeatMode === 'ONE') {
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
    this.playPauseButton.addEventListener('click', () => this.togglePlayPause());
    this.stopButton.addEventListener('click', () => this.stop());
    this.prevButton.addEventListener('click', () => this.playPrevious());
    this.nextButton.addEventListener('click', () => this.playNext());
    this.closeButton.addEventListener('click', () => this.close());
    
    // Add repeat button event listener
    this.repeatButton.addEventListener('click', () => this.toggleRepeatMode());
    
    // Add shuffle button event listener
    this.shuffleButton.addEventListener('click', () => this.toggleShuffleMode());
    
    // Update UI based on loaded state
    this.updatePlayerUIState();
    
    this.seekBar.addEventListener('input', () => {
      if (this.audioElement) {
        const seekTime = (this.seekBar.value / 100) * this.audioElement.duration;
        this.audioElement.currentTime = seekTime;
        this.updateTimeDisplay();
      }
    });

    return container;
  }

  /**
   * Load audio files into the playlist
   * @param {(string[]|File[])} files - Array of file paths or File objects to load
   * @param {boolean} append - Whether to append to existing playlist or replace it
   */
  loadFiles(files, append = false) {
    if (!files || files.length === 0) {
      return;
    }
    
    // Clear current playlist if not appending
    if (!append) {
      this.playlist = [];
      this.originalPlaylist = []; // Clear original playlist as well
    }
    
    // Add files to playlist
    files.forEach(file => {
      if (typeof file === 'string') {
        // Handle file path string
        const fileName = file.split(/[\\/]/).pop();
        const trackEntry = {
          path: file,
          name: fileName,
          file: null // No File object for path-based entries
        };
        this.playlist.push(trackEntry);
        this.originalPlaylist.push({...trackEntry}); // Store a copy in original playlist
      } else if (file instanceof File) {
        // Handle File object
        const trackEntry = {
          path: null, // No path for File object-based entries
          name: file.name,
          file: file
        };
        this.playlist.push(trackEntry);
        this.originalPlaylist.push({...trackEntry}); // Store a copy in original playlist
      }
    });
    
    // Create player UI if it doesn't exist
    if (!this.container) {
      const playerUI = this.createPlayerUI();
      const mainContainer = document.querySelector('.main-container');
      if (mainContainer) {
        // Insert player before main-container instead of inside it
        mainContainer.parentNode.insertBefore(playerUI, mainContainer);
      }
      
      // Set current track to the first one if we're creating a new player
      this.currentTrackIndex = 0;
    } else if (!append) {
      // If we're replacing the playlist, reset the track index
      this.currentTrackIndex = 0;
    }
    
    // Update track name display if we have a container
    if (this.container && this.trackNameDisplay && this.playlist.length > 0) {
      this.trackNameDisplay.textContent = this.playlist[this.currentTrackIndex].name;
    }
    
    // Load and play the current track
    this.loadTrack(this.currentTrackIndex);
    this.play();
  }
  
  /**
   * Toggle repeat mode (OFF -> ALL -> ONE -> OFF)
   */
  toggleRepeatMode() {
    if (!this.repeatButton) return;
    
    // Cycle through repeat modes: OFF -> ALL -> ONE -> OFF
    switch (this.repeatMode) {
      case 'OFF':
        this.repeatMode = 'ALL';
        this.repeatButton.innerHTML = '<img src="images/repeat_button.png" width="16" height="16">';
        this.repeatButton.style.backgroundColor = '#4CAF50'; // Highlight button when active
        break;
      case 'ALL':
        this.repeatMode = 'ONE';
        this.repeatButton.innerHTML = '<img src="images/repeat1_button.png" width="16" height="16">';
        this.repeatButton.style.backgroundColor = '#4CAF50';
        
        // Disable shuffle button when in ONE mode
        if (this.shuffleMode) {
          this.toggleShuffleMode(); // Turn off shuffle mode
        }
        this.shuffleButton.disabled = true;
        this.shuffleButton.style.opacity = '0.5';
        break;
      case 'ONE':
        this.repeatMode = 'OFF';
        this.repeatButton.innerHTML = '<img src="images/repeat_button.png" width="16" height="16">';
        this.repeatButton.style.backgroundColor = ''; // Reset button color
        
        // Re-enable shuffle button
        this.shuffleButton.disabled = false;
        this.shuffleButton.style.opacity = '1';
        break;
    }
    
    // Save player state after changing repeat mode
    this.savePlayerState();
  }
  
  /**
   * Toggle shuffle mode (ON/OFF)
   */
  toggleShuffleMode() {
    if (!this.shuffleButton || this.repeatMode === 'ONE') return;
    
    this.shuffleMode = !this.shuffleMode;
    
    if (this.shuffleMode) {
      // Enable shuffle mode
      this.shuffleButton.style.backgroundColor = '#4CAF50'; // Highlight button when active
      
      // Save current track
      const currentTrack = this.playlist[this.currentTrackIndex];
      
      // Create a copy of the original playlist
      const playlistCopy = [...this.originalPlaylist];
      
      // Shuffle the playlist copy using Fisher-Yates algorithm
      for (let i = playlistCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlistCopy[i], playlistCopy[j]] = [playlistCopy[j], playlistCopy[i]];
      }
      
      // Replace the playlist with the shuffled copy
      this.playlist = playlistCopy;
      
      // Find the current track in the shuffled playlist
      this.currentTrackIndex = this.playlist.findIndex(track =>
        (track.path === currentTrack.path && track.name === currentTrack.name) ||
        (track.file && currentTrack.file && track.file.name === currentTrack.file.name)
      );
      
      // If track not found (shouldn't happen), reset to first track
      if (this.currentTrackIndex === -1) {
        this.currentTrackIndex = 0;
      }
    } else {
      // Disable shuffle mode
      this.shuffleButton.style.backgroundColor = ''; // Reset button color
      
      // Save current track
      const currentTrack = this.playlist[this.currentTrackIndex];
      
      // Restore original playlist
      this.playlist = [...this.originalPlaylist];
      
      // Find the current track in the original playlist
      this.currentTrackIndex = this.playlist.findIndex(track =>
        (track.path === currentTrack.path && track.name === currentTrack.name) ||
        (track.file && currentTrack.file && track.file.name === currentTrack.file.name)
      );
      
      // If track not found (shouldn't happen), reset to first track
      if (this.currentTrackIndex === -1) {
        this.currentTrackIndex = 0;
      }
    }
    
    // Save player state after changing shuffle mode
    this.savePlayerState();
  }
  
  /**
   * Update player UI based on current state
   */
  updatePlayerUIState() {
    if (!this.repeatButton || !this.shuffleButton) return;
    
    // Update repeat button state
    switch (this.repeatMode) {
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
    if (this.shuffleMode && this.repeatMode !== 'ONE') {
      this.shuffleButton.style.backgroundColor = '#4a9eff'; // Highlight button when active
    } else {
      this.shuffleButton.style.backgroundColor = ''; // Reset button color
    }
  }
  
  // CSS styles for the player are now in effetune.css

  /**
   * Load a track from the playlist
   * @param {number} index - Index of the track to load
   */
  loadTrack(index) {
    if (index < 0 || index >= this.playlist.length) {
      return;
    }
    
    this.currentTrackIndex = index;
    const track = this.playlist[index];
    
    // Clear any existing metadata listeners to prevent duplicates
    if (this.audioElement) {
      this.audioElement.removeEventListener('loadedmetadata', this.metadataHandler);
    }
    
    // Clear MediaSession metadata if supported
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = null;
      } catch (e) {
        console.error('Error clearing MediaSession metadata:', e);
      }
    }
    
    // Initially update track name display with file name
    if (this.trackNameDisplay) {
      this.trackNameDisplay.textContent = track.name;
    }
    
    // Create audio element if it doesn't exist
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.addEventListener('ended', () => this.onTrackEnded());
      this.audioElement.addEventListener('timeupdate', () => this.updateTimeDisplay());
      this.audioElement.addEventListener('error', (e) => {
        console.error('Audio element error:', e);
      });
    }
    
    // Define metadata handler
    this.metadataHandler = () => {
      this.updateTimeDisplay();
      // Try to get metadata after it's loaded
      this.updateTrackNameFromMetadata();
    };
    
    // Add metadata listener for the audio element
    this.audioElement.addEventListener('loadedmetadata', this.metadataHandler);
    
    // Stop current playback if any
    const wasPlaying = !this.audioElement.paused;
    if (wasPlaying) {
      this.audioElement.pause();
    }
    
    // Revoke previous object URL if exists
    if (this.currentObjectURL) {
      URL.revokeObjectURL(this.currentObjectURL);
      this.currentObjectURL = null;
    }
    
    // Set audio source based on whether we have a File object or a path
    if (track.file instanceof File) {
      // Use File object directly
      
      // Create object URL from File object
      const objectURL = URL.createObjectURL(track.file);
      
      // Set the object URL as the source
      this.audioElement.src = objectURL;
      
      // Store the object URL to revoke it later
      this.currentObjectURL = objectURL;
    } else if (track.path) {
      // Use file path
      
      // Try to format the path correctly for Electron
      let formattedPath = track.path;
      
      // If the path doesn't start with file://, add it
      if (!formattedPath.startsWith('file://')) {
        // For Windows paths, we need to add an extra / before the drive letter
        if (formattedPath.match(/^[A-Za-z]:\\/)) {
          // Windows path with drive letter (e.g., C:\path\to\file.mp3)
          formattedPath = `file:///${formattedPath.replace(/\\/g, '/')}`;
        } else {
          // Unix-like path or relative path
          formattedPath = `file://${formattedPath}`;
        }
      }
      
      this.audioElement.src = formattedPath;
    } else {
      console.error('No valid source for track:', track);
      return;
    }
    
    // Load the audio
    this.audioElement.load();
    
    // Reset seek bar
    if (this.seekBar) {
      this.seekBar.value = 0;
    }
    
    // Reset time display
    if (this.timeDisplay) {
      this.timeDisplay.textContent = '00:00';
    }
    
    // Connect to audio context if not already connected
    this.connectToAudioContext();
  }
  
  /**
   * Connect the audio element to the Web Audio API context
   */
  connectToAudioContext() {
    // Disconnect existing source node if any
    if (this.mediaSource) {
      this.mediaSource.disconnect();
      
      // We already have a media source connected to this audio element
      // Just update the connections and return
      
      // Replace the audio manager's source node with our media source
      this.audioManager.sourceNode = this.mediaSource;
      
      // Connect to worklet node
      if (this.audioManager.workletNode) {
        this.mediaSource.connect(this.audioManager.workletNode);
      }
      
      return;
    }
    
    try {
      // Create media element source
      this.mediaSource = this.audioContext.createMediaElementSource(this.audioElement);
      // Check if we should use input with player
      const useInputWithPlayer = window.electronIntegration?.audioPreferences?.useInputWithPlayer || false;
      
      if (useInputWithPlayer) {
        // Keep the original source node (microphone) and connect our media source directly to the worklet
        if (this.audioManager.workletNode) {
          this.mediaSource.connect(this.audioManager.workletNode);
        }
      } else {
        // Disconnect the original source node if it exists
        if (this.originalSourceNode && this.audioManager.workletNode) {
          try {
            this.originalSourceNode.disconnect(this.audioManager.workletNode);
          } catch (e) {
            // Ignore disconnection errors
          }
        }
        
        // Replace the audio manager's source node with our media source
        this.audioManager.sourceNode = this.mediaSource;
        
        // Connect to worklet node
        if (this.audioManager.workletNode) {
          this.mediaSource.connect(this.audioManager.workletNode);
        }
      }
    } catch (error) {
      // If we get an error about the audio element already being connected,
      // we need to create a new audio element
      if (error.name === 'InvalidStateError' && error.message.includes('already connected')) {
        // Create a new audio element
        const oldAudioElement = this.audioElement;
        this.audioElement = new Audio();
        
        // Copy event listeners from old element
        this.audioElement.addEventListener('ended', () => this.onTrackEnded());
        this.audioElement.addEventListener('timeupdate', () => this.updateTimeDisplay());
        this.audioElement.addEventListener('loadedmetadata', () => this.updateTimeDisplay());
        
        // Copy current source and state
        if (oldAudioElement.src) {
          this.audioElement.src = oldAudioElement.src;
        }
        
        // Try to create media source again with new element
        this.mediaSource = this.audioContext.createMediaElementSource(this.audioElement);
        
        // Replace the audio manager's source node with our media source
        this.audioManager.sourceNode = this.mediaSource;
        
        // Connect to worklet node
        if (this.audioManager.workletNode) {
          this.mediaSource.connect(this.audioManager.workletNode);
        }
        
        // If the old element was playing, start playing the new one
        if (!oldAudioElement.paused) {
          this.audioElement.play()
            .catch(() => {});
        }
      } else {
        console.error('Error connecting audio element to context:', error);
      }
    }
  }

  /**
   * Play the current track
   */
  play() {
    if (!this.audioElement) {
      return;
    }
    
    this.audioElement.play()
      .then(() => {
        this.isPlaying = true;
        this.isPaused = false;
        
        // Update button image
        if (this.playPauseButton) {
          this.playPauseButton.innerHTML = '<img src="images/pause_button.png" width="16" height="16">';
        }
        
        // Start update interval
        this.startUpdateInterval();
        
        // Set MediaSession metadata if supported
        if ('mediaSession' in navigator) {
          try {
            const track = this.playlist[this.currentTrackIndex];
            if (track) {
              // Get current track again to ensure we're using the correct one
              const currentTrack = this.playlist[this.currentTrackIndex];
              if (currentTrack) {
                navigator.mediaSession.metadata = new MediaMetadata({
                  title: currentTrack.name, // Always use the current track name
                  artist: '', // We don't have artist info yet
                  album: ''   // We don't have album info yet
                  // Artwork is omitted to avoid file:// scheme issues
                });
              }
              
              // Set MediaSession action handlers
              navigator.mediaSession.setActionHandler('play', () => this.play());
              navigator.mediaSession.setActionHandler('pause', () => this.pause());
              navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
              navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
            }
          } catch (e) {
            console.error('Error setting MediaSession metadata:', e);
          }
        }
      })
      .catch(error => {
        console.error('Error playing audio:', error);
        if (window.uiManager) {
          window.uiManager.setError(`Error playing audio: ${error.message}`);
        }
      });
  }

  /**
   * Pause the current track
   */
  pause() {
    if (!this.audioElement) return;
    
    this.audioElement.pause();
    this.isPlaying = false;
    this.isPaused = true;
    
    // Update button image
    if (this.playPauseButton) {
      this.playPauseButton.innerHTML = '<img src="images/play_button.png" width="16" height="16">';
    }
    
    // Stop update interval
    this.stopUpdateInterval();
  }

  /**
   * Toggle play/pause state
   */
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Stop playback
   */
  stop() {
    if (!this.audioElement) return;
    
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
    this.isPlaying = false;
    this.isPaused = false;
    
    // Update button image
    if (this.playPauseButton) {
      this.playPauseButton.innerHTML = '<img src="images/play_button.png" width="16" height="16">';
    }
    
    // Update seek bar
    if (this.seekBar) {
      this.seekBar.value = 0;
    }
    
    // Update time display
    if (this.timeDisplay) {
      this.timeDisplay.textContent = '00:00';
    }
    
    // Stop update interval
    this.stopUpdateInterval();
  }

  /**
   * Play the previous track in the playlist
   */
  playPrevious() {
    // If in repeat ONE mode, just restart the current track
    if (this.repeatMode === 'ONE') {
      this.audioElement.currentTime = 0;
      this.play();
      return;
    }
    
    const newIndex = this.currentTrackIndex - 1;
    
    if (newIndex >= 0) {
      // Normal case - previous track exists
      this.loadTrack(newIndex);
      this.play();
    } else if (this.repeatMode === 'ALL' && this.playlist.length > 0) {
      // In repeat ALL mode, wrap around to the last track
      this.loadTrack(this.playlist.length - 1);
      this.play();
    }
  }

  /**
   * Play the next track in the playlist
   */
  playNext() {
    // If in repeat ONE mode, just restart the current track
    if (this.repeatMode === 'ONE') {
      this.audioElement.currentTime = 0;
      this.play();
      return;
    }
    
    const newIndex = this.currentTrackIndex + 1;
    
    if (newIndex < this.playlist.length) {
      // Normal case - next track exists
      this.loadTrack(newIndex);
      this.play();
    } else if (this.repeatMode === 'ALL' && this.playlist.length > 0) {
      // In repeat ALL mode, wrap around to the first track
      this.loadTrack(0);
      this.play();
    }
  }

  /**
   * Handle track ended event
   */
  onTrackEnded() {
    // Handle based on repeat mode
    switch (this.repeatMode) {
      case 'ONE':
        // Repeat the current track
        this.loadTrack(this.currentTrackIndex);
        this.play();
        break;
        
      case 'ALL':
        // If at the end of playlist, go back to the beginning
        const nextIndex = this.currentTrackIndex + 1;
        if (nextIndex < this.playlist.length) {
          this.loadTrack(nextIndex);
          this.play();
        } else {
          // Restart from the first track
          this.loadTrack(0);
          this.play();
        }
        break;
        
      case 'OFF':
      default:
        // Standard behavior - play next track if available
        const standardNextIndex = this.currentTrackIndex + 1;
        if (standardNextIndex < this.playlist.length) {
          this.loadTrack(standardNextIndex);
          this.play();
        } else {
          // Stop playback if at the end of playlist
          this.stop();
        }
        break;
    }
  }

  /**
   * Update time display and seek bar
   */
  updateTimeDisplay() {
    if (!this.audioElement || !this.timeDisplay || !this.seekBar) return;
    
    // Update time display
    const currentTime = this.audioElement.currentTime;
    const duration = this.audioElement.duration || 0;
    
    // Format time as MM:SS
    const formatTime = (time) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };
    
    this.timeDisplay.textContent = formatTime(currentTime);
    
    // Update seek bar (only if not being dragged)
    if (!this.seekBar.matches(':active')) {
      const percent = (currentTime / duration) * 100;
      this.seekBar.value = isNaN(percent) ? 0 : percent;
    }
  }

  /**
   * Start the update interval for time display
   */
  startUpdateInterval() {
    // Clear existing interval if any
    this.stopUpdateInterval();
    
    // Start new interval
    this.updateInterval = setInterval(() => {
      this.updateTimeDisplay();
    }, 250);
  }

  /**
   * Stop the update interval
   */
  stopUpdateInterval() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  /**
   * Update track name display from audio metadata if available
   */
  updateTrackNameFromMetadata() {
    if (!this.audioElement || !this.trackNameDisplay) return;
    
    try {
      // Get current track
      const track = this.playlist[this.currentTrackIndex];
      if (!track) return;
      
      // Store current track index to verify it hasn't changed during async operations
      const currentIndex = this.currentTrackIndex;
      
      // Check if jsmediatags is available
      if (typeof window.jsmediatags === 'undefined') {
        console.warn('jsmediatags library is not available');
      }
      
      // For MP3 files, try to extract ID3 tags first
      if (window.jsmediatags) {
        // Handle both File objects and file paths
        if (track.file) {
          this.readID3Tags(track.file, currentIndex);
          return; // Let the async ID3 reading complete
        }
        else if (track.path) {
          // For Electron environment, we need to handle file:// URLs differently
          if (window.electronAPI && track.path) {
            // Use Electron's API to read the file as a buffer
            window.electronAPI.readFileAsBuffer(track.path)
              .then(result => {
                if (currentIndex !== this.currentTrackIndex) return;
                
                if (!result.success) {
                  console.error('Failed to read file:', result.error);
                  this.fallbackToMediaSession(currentIndex);
                  return;
                }
                
                try {
                  // Convert base64 to ArrayBuffer
                  const binaryString = atob(result.buffer);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  
                  // Create a blob from the ArrayBuffer
                  const blob = new Blob([bytes.buffer], { type: 'audio/mpeg' });
                  
                  // Read ID3 tags from blob
                  window.jsmediatags.read(blob, {
                    onSuccess: (tag) => {
                      if (currentIndex !== this.currentTrackIndex) return;
                      
                      if (tag.tags) {
                        const { title, artist, album } = tag.tags;
                        if (title) {
                          if (artist) {
                            this.trackNameDisplay.textContent = `${artist} - ${title}`;
                          } else {
                            this.trackNameDisplay.textContent = title;
                          }
                          
                          // Also update MediaSession metadata
                          this.updateMediaSessionWithTags(title, artist, album);
                        } else {
                          this.fallbackToMediaSession(currentIndex);
                        }
                      } else {
                        this.fallbackToMediaSession(currentIndex);
                      }
                    },
                    onError: () => {
                      this.fallbackToMediaSession(currentIndex);
                    }
                  });
                } catch (error) {
                  console.error('Error processing buffer:', error);
                  this.fallbackToMediaSession(currentIndex);
                }
              })
              .catch(() => {
                this.tryReadFromAudioElementSrc(track, currentIndex);
              });
            return;
          } else {
            // For web environment, try to use the audio element's src
            this.tryReadFromAudioElementSrc(track, currentIndex);
            return;
          }
        }
      }
      
      // If we can't use jsmediatags or it's not available, fall back to other methods
      this.fallbackToMediaSession(currentIndex);
      
    } catch (error) {
      console.error('Error updating track name from metadata:', error);
      // Keep the file name as fallback (already set)
    }
  }
  
  /**
   * Read ID3 tags from a file
   * @param {File} file - The file to read ID3 tags from
   * @param {number} currentIndex - The current track index to verify
   */
  readID3Tags(file, currentIndex) {
    window.jsmediatags.read(file, {
      onSuccess: (tag) => {
        // Verify the track hasn't changed during async operation
        if (currentIndex !== this.currentTrackIndex) return;
        
        if (tag.tags && tag.tags.title) {
          const { title, artist, album } = tag.tags;
          
          // Update track display
          this.trackNameDisplay.textContent = artist 
            ? `${artist} - ${title}` 
            : title;
          
          // Update MediaSession metadata if supported
          if ('mediaSession' in navigator) {
            try {
              navigator.mediaSession.metadata = new MediaMetadata({
                title: title,
                artist: artist || '',
                album: album || ''
              });
            } catch (e) {}
          }
        } else {
          this.fallbackToMediaSession(currentIndex);
        }
      },
      onError: () => this.fallbackToMediaSession(currentIndex)
    });
  }
  
  /**
   * Try to read ID3 tags from audio element src
   * @param {Object} track - The track to read ID3 tags from
   * @param {number} currentIndex - The current track index to verify
   */
  tryReadFromAudioElementSrc(track, currentIndex) {
    // Use a timeout to ensure the audio element has loaded enough data
    setTimeout(() => {
      if (currentIndex !== this.currentTrackIndex) return;
      
      try {
        // Try to read from the audio element's src
        if (window.jsmediatags && this.audioElement.src) {
          window.jsmediatags.read(this.audioElement.src, {
            onSuccess: (tag) => {
              // Verify the track hasn't changed during async operation
              if (currentIndex !== this.currentTrackIndex) return;
              
              if (tag.tags) {
                const { title, artist, album } = tag.tags;
                if (title) {
                  if (artist) {
                    this.trackNameDisplay.textContent = `${artist} - ${title}`;
                  } else {
                    this.trackNameDisplay.textContent = title;
                  }
                  
                  // Also update MediaSession metadata
                  this.updateMediaSessionWithTags(title, artist, album);
                } else {
                  this.fallbackToMediaSession(currentIndex);
                }
              } else {
                this.fallbackToMediaSession(currentIndex);
              }
            },
            onError: () => {
              this.fallbackToMediaSession(currentIndex);
            }
          });
        } else {
          this.fallbackToMediaSession(currentIndex);
        }
      } catch (e) {
        this.fallbackToMediaSession(currentIndex);
      }
    }, 500);
  }
  
  /**
   * Update MediaSession metadata with ID3 tags
   * @param {string} title - The track title
   * @param {string} artist - The track artist
   * @param {string} album - The track album
   */
  updateMediaSessionWithTags(title, artist, album) {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: title,
          artist: artist || '',
          album: album || ''
          // Artwork is omitted to avoid file:// scheme issues
        });
      } catch (e) {}
    }
  }
  
  /**
   * Fall back to MediaSession API and other methods
   * @param {number} currentIndex - The current track index to verify
   */
  fallbackToMediaSession(currentIndex) {
    // Verify the track hasn't changed
    if (currentIndex !== this.currentTrackIndex) return;
    
    const track = this.playlist[this.currentTrackIndex];
    if (!track) return;
    
    // Try to get metadata from MediaSession API
    if (navigator.mediaSession && navigator.mediaSession.metadata) {
      const metadata = navigator.mediaSession.metadata;
      if (metadata.title) {
        // If we have a title, use it
        this.trackNameDisplay.textContent = metadata.title;
        if (metadata.artist) {
          // If we also have an artist, show "Artist - Title"
          this.trackNameDisplay.textContent = `${metadata.artist} - ${metadata.title}`;
        }
        return;
      }
    }
    
    // Try to get metadata from audio element
    if (this.audioElement.duration > 0) {
      // Check if the audio element has a title attribute
      if (this.audioElement.title) {
        this.trackNameDisplay.textContent = this.audioElement.title;
        return;
      }
    }
    
    // If we couldn't get metadata, use the file name (already set)
  }

  /**
   * Close the player and restore original audio input
   */
  close() {
    // Save player state before closing
    this.savePlayerState();
    
    // Stop playback
    this.stop();
    
    // Disconnect media source
    if (this.mediaSource) {
      this.mediaSource.disconnect();
    }
    
    // Revoke object URL if one was created
    if (this.currentObjectURL) {
      try {
        // Set src to empty before revoking to prevent errors
        if (this.audioElement) {
          this.audioElement.src = '';
        }
        URL.revokeObjectURL(this.currentObjectURL);
      } catch (error) {
        console.warn('Error revoking object URL:', error);
      } finally {
        this.currentObjectURL = null;
      }
    }
    
    // Check if we were using input with player
    const useInputWithPlayer = window.electronIntegration?.audioPreferences?.useInputWithPlayer || false;
    
    if (useInputWithPlayer) {
      // If we were using input with player, the original source node is still connected
      // We just need to make sure the media source is disconnected (already done above)
    } else {
      // If we weren't using input with player, restore the original source node
      if (this.originalSourceNode) {
        this.audioManager.sourceNode = this.originalSourceNode;
        
        // Reconnect to worklet node
        if (this.audioManager.workletNode) {
          this.audioManager.sourceNode.connect(this.audioManager.workletNode);
        }
      }
    }
    
    // Remove player UI
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Clean up
    this.container = null;
    this.audioElement = null;
    this.mediaSource = null;
    this.playlist = [];
    this.stopUpdateInterval();
    
    // Notify UI manager
    if (window.uiManager) {
      window.uiManager.audioPlayer = null;
    }
  }
}