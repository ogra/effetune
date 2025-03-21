/**
 * Audio Player class for music file playback
 * Handles playback of audio files and integration with the effect pipeline
 * This is the main entry point that coordinates between specialized modules
 */
import { PlaybackManager } from './audio-player/playback-manager.js';
import { AudioPlayerUI } from './audio-player/audio-player-ui.js';
import { AudioContextManager } from './audio-player/audio-context-manager.js';

export class AudioPlayer {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.audioContext = audioManager.audioContext;
    this.audioElement = null;
    
    // Initialize sub-modules
    this.playbackManager = new PlaybackManager(this);
    this.ui = new AudioPlayerUI(this);
    this.contextManager = new AudioContextManager(this, audioManager);
    
    // Load saved player state
    this.playbackManager.loadPlayerState().then(() => {
      if (this.ui.container) {
        this.ui.updatePlayerUIState();
      }
    });
  }
  
  /**
   * Load audio files into the playlist
   * @param {(string[]|File[])} files - Array of file paths or File objects to load
   * @param {boolean} append - Whether to append to existing playlist or replace it
   */
  loadFiles(files, append = false) {
    this.playbackManager.loadFiles(files, append);
    if (!this.ui.container) {
      this.ui.createPlayerUI();
    }
    this.loadTrack(this.playbackManager.currentTrackIndex);
    this.play();
  }
  
  /**
   * Load a track at the specified index
   * @param {number} index - Index of the track to load
   */
  loadTrack(index) {
    const track = this.playbackManager.getTrack(index);
    if (track) {
      this.contextManager.setupAudioElement(track);
      this.contextManager.loadMetadata(track);
      this.ui.updateTrackDisplay(track);
    }
  }
  
  /**
   * Play the current track
   */
  play() {
    this.playbackManager.play();
  }
  
  /**
   * Pause the current track
   */
  pause() {
    this.playbackManager.pause();
  }
  
  /**
   * Toggle between play and pause
   */
  togglePlayPause() {
    this.playbackManager.togglePlayPause();
  }
  
  /**
   * Stop playback and reset position
   */
  stop() {
    this.playbackManager.stop();
  }
  
  /**
   * Play the previous track
   */
  playPrevious() {
    this.playbackManager.playPrevious();
  }
  
  /**
   * Play the next track
   * @param {boolean} userInitiated - Whether this was initiated by user action (default: true)
   */
  playNext(userInitiated = true) {
    this.playbackManager.playNext(userInitiated);
  }
  
  /**
   * Fast forward the current track by 10 seconds
   */
  fastForward() {
    this.playbackManager.fastForward();
  }
  
  /**
   * Rewind the current track by 10 seconds
   */
  rewind() {
    this.playbackManager.rewind();
  }
  
  /**
   * Close the player and restore original audio input
   */
  close() {
    this.playbackManager.savePlayerState();
    this.contextManager.disconnect();
    this.ui.removeUI();
    this.playbackManager.clear();
    
    // Clean up references
    this.audioElement = null;
    if (window.uiManager) {
      window.uiManager.audioPlayer = null;
    }
  }
}