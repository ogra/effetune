/**
 * PlaybackManager - Handles playlist management and playback control
 * Includes functionality for playback modes, state management, and keyboard shortcuts
 */
export class PlaybackManager {
  constructor(audioPlayer) {
    this.audioPlayer = audioPlayer;
    this.playlist = [];
    this.originalPlaylist = []; // For shuffle mode
    this.currentTrackIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
    
    // Playback modes
    this.shuffleMode = false;
    this.repeatMode = 'OFF'; // OFF, ALL, ONE
    
    // Initialize keyboard shortcuts
    this.initKeyboardShortcuts();
  }
  
  /**
   * Load files into the playlist
   * @param {(string[]|File[])} files - Array of file paths or File objects
   * @param {boolean} append - Whether to append to existing playlist or replace it
   */
  loadFiles(files, append = false) {
    if (!files || files.length === 0) {
      return;
    }
    
    // Debug logs removed for release
    
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
        // Debug logs removed for release
        this.playlist.push(trackEntry);
        this.originalPlaylist.push({...trackEntry}); // Store a copy in original playlist
      } else if (file instanceof File) {
        // Handle File object
        const trackEntry = {
          path: null, // No path for File object-based entries
          name: file.name,
          file: file
        };
        // Debug logs removed for release
        this.playlist.push(trackEntry);
        this.originalPlaylist.push({...trackEntry}); // Store a copy in original playlist
      } else {
        console.warn('Unknown file type in loadFiles:', typeof file, file);
      }
    });
    
    // Debug logs removed for release
  }
  
  /**
   * Get track at specified index
   * @param {number} index - Index of the track to get
   * @returns {Object|null} Track object or null if index is invalid
   */
  getTrack(index) {
    if (index >= 0 && index < this.playlist.length) {
      return this.playlist[index];
    }
    return null;
  }
  
  /**
   * Play the current track
   */
  play() {
    if (!this.audioPlayer.audioElement) return;
    
    this.audioPlayer.audioElement.play()
      .then(() => {
        this.isPlaying = true;
        this.isPaused = false;
        if (this.audioPlayer.ui) {
          this.audioPlayer.ui.updatePlayPauseButton();
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
    if (!this.audioPlayer.audioElement) return;
    
    this.audioPlayer.audioElement.pause();
    this.isPlaying = false;
    this.isPaused = true;
    
    if (this.audioPlayer.ui) {
      this.audioPlayer.ui.updatePlayPauseButton();
    }
  }
  
  /**
   * Toggle between play and pause
   */
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  /**
   * Stop playback and reset position
   */
  stop() {
    if (!this.audioPlayer.audioElement) return;
    
    this.audioPlayer.audioElement.pause();
    this.audioPlayer.audioElement.currentTime = 0;
    this.isPlaying = false;
    this.isPaused = false;
    
    if (this.audioPlayer.ui) {
      this.audioPlayer.ui.updatePlayPauseButton();
      this.audioPlayer.ui.updateTimeDisplay();
    }
  }
  
  /**
   * Play the previous track
   */
  playPrevious() {
    if (this.playlist.length === 0) return;
    
    // If current time is more than 3 seconds, restart the current track
    if (this.audioPlayer.audioElement && this.audioPlayer.audioElement.currentTime > 3) {
      this.audioPlayer.audioElement.currentTime = 0;
      this.play();
      return;
    }
    
    // If we're at the first track, just restart it instead of going to the last track
    if (this.currentTrackIndex === 0) {
      this.audioPlayer.audioElement.currentTime = 0;
      this.play();
      return;
    }
    
    // Go to previous track
    const newIndex = this.currentTrackIndex - 1;
    this.currentTrackIndex = newIndex;
    this.audioPlayer.loadTrack(this.currentTrackIndex);
    this.play();
  }
  
  /**
   * Play the next track
   * @param {boolean} userInitiated - Whether this was initiated by user action (button click)
   */
  playNext(userInitiated = true) {
    if (this.playlist.length === 0) return;
    
    // If in repeat ONE mode and not user initiated, just restart the current track
    // This happens when a track ends naturally
    if (this.repeatMode === 'ONE' && !userInitiated) {
      this.audioPlayer.audioElement.currentTime = 0;
      this.play();
      return;
    }
    
    // Go to next track
    let newIndex = this.currentTrackIndex + 1;
    if (newIndex >= this.playlist.length) {
      // If in repeat ALL mode, wrap around to the first track
      // Otherwise, stop at the end
      if (this.repeatMode === 'ALL') {
        newIndex = 0;
      } else {
        this.stop();
        return;
      }
    }
    
    this.currentTrackIndex = newIndex;
    this.audioPlayer.loadTrack(this.currentTrackIndex);
    this.play();
  }
  
  /**
   * Handle track ended event
   * This is called automatically when a track finishes playing
   */
  onTrackEnded() {
    // Call playNext with userInitiated = false to indicate this was not a manual action
    this.playNext(false);
  }
  
  /**
   * Toggle shuffle mode
   */
  toggleShuffleMode() {
    if (this.repeatMode === 'ONE') return;
    
    this.shuffleMode = !this.shuffleMode;
    
    if (this.shuffleMode) {
      // Enable shuffle mode
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
    
    // Update UI if available
    if (this.audioPlayer.ui) {
      this.audioPlayer.ui.updatePlayerUIState();
    }
    
    // Save player state
    this.savePlayerState();
  }
  
  /**
   * Toggle repeat mode (OFF -> ALL -> ONE -> OFF)
   */
  toggleRepeatMode() {
    // Cycle through repeat modes: OFF -> ALL -> ONE -> OFF
    switch (this.repeatMode) {
      case 'OFF':
        this.repeatMode = 'ALL';
        break;
      case 'ALL':
        this.repeatMode = 'ONE';
        
        // Disable shuffle button when in ONE mode
        if (this.shuffleMode) {
          this.toggleShuffleMode(); // Turn off shuffle mode
        }
        break;
      case 'ONE':
        this.repeatMode = 'OFF';
        break;
    }
    
    // Update UI if available
    if (this.audioPlayer.ui) {
      this.audioPlayer.ui.updatePlayerUIState();
    }
    
    // Save player state
    this.savePlayerState();
  }
  
  /**
   * Initialize keyboard shortcuts
   */
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Skip if audio player is not initialized or no audio element exists
      if (!this.audioPlayer.audioElement) return;
      
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
          
        case 't': // Ctrl+T - Toggle Repeat mode
        case 'T':
          if (e.ctrlKey && !e.target.matches('input, textarea')) {
            e.preventDefault();
            this.toggleRepeatMode();
          }
          break;
          
        case 'h': // Ctrl+H - Toggle Shuffle mode
        case 'H':
          if (e.ctrlKey && !e.target.matches('input, textarea')) {
            e.preventDefault();
            this.toggleShuffleMode();
          }
          break;
      }
    });
  }
  
  /**
   * Fast forward the current track by 10 seconds
   */
  fastForward() {
    if (!this.audioPlayer.audioElement) return;
    
    const newTime = Math.min(this.audioPlayer.audioElement.currentTime + 10, this.audioPlayer.audioElement.duration);
    this.audioPlayer.audioElement.currentTime = newTime;
    if (this.audioPlayer.ui) {
      this.audioPlayer.ui.updateTimeDisplay();
    }
  }
  
  /**
   * Rewind the current track by 10 seconds
   */
  rewind() {
    if (!this.audioPlayer.audioElement) return;
    
    const newTime = Math.max(this.audioPlayer.audioElement.currentTime - 10, 0);
    this.audioPlayer.audioElement.currentTime = newTime;
    if (this.audioPlayer.ui) {
      this.audioPlayer.ui.updateTimeDisplay();
    }
  }
  
  /**
   * Load player state from storage
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
   * Save player state to storage
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
   * Clear playlist and reset state
   */
  clear() {
    this.playlist = [];
    this.originalPlaylist = [];
    this.currentTrackIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
  }
}