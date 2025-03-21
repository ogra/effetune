/**
 * AudioContextManager - Handles Web Audio API integration and metadata processing
 * Manages media sources and audio connections
 */
export class AudioContextManager {
  constructor(audioPlayer, audioManager) {
    this.audioPlayer = audioPlayer;
    this.audioManager = audioManager;
    this.mediaSource = null;
    this.originalSourceNode = null;
    this.currentObjectURL = null;
    
    // Store event handler references for proper removal
    this.eventHandlers = {
      ended: null,
      timeupdate: null,
      error: null,
      loadedmetadata: null
    };
    
    // Store original source node for restoration
    if (audioManager.sourceNode) {
      this.originalSourceNode = audioManager.sourceNode;
    }
  }
  
  /**
   * Set up audio element for a track
   * @param {Object} track - The track to set up
   */
  setupAudioElement(track) {
    // Create audio element if it doesn't exist
    if (!this.audioPlayer.audioElement) {
      this.audioPlayer.audioElement = new Audio();
      
      // Create and store event handlers with proper references
      this.eventHandlers.ended = () => this.audioPlayer.playbackManager.onTrackEnded();
      this.eventHandlers.timeupdate = () => {
        if (this.audioPlayer.ui) {
          this.audioPlayer.ui.updateTimeDisplay();
        }
      };
      this.eventHandlers.error = (e) => {
        // Only log errors if they're not related to empty src (which happens during cleanup)
        if (e.target.error && e.target.error.code !== MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          console.error('Audio element error:', e);
          if (window.uiManager) {
            window.uiManager.setError(`Audio playback error: ${e.target.error?.message || 'Unknown error'}`);
          }
        }
      };
      
      // Add event listeners using stored references
      this.audioPlayer.audioElement.addEventListener('ended', this.eventHandlers.ended);
      this.audioPlayer.audioElement.addEventListener('timeupdate', this.eventHandlers.timeupdate);
      this.audioPlayer.audioElement.addEventListener('error', this.eventHandlers.error);
    }
    
    // Store metadata handler function
    this.eventHandlers.loadedmetadata = () => {
      this.updateTrackNameFromMetadata();
    };
    
    // Clear any existing metadata listeners to prevent duplicates
    if (this.audioPlayer.audioElement) {
      this.audioPlayer.audioElement.removeEventListener('loadedmetadata', this.eventHandlers.loadedmetadata);
    }
    
    // Add metadata listener for the audio element
    this.audioPlayer.audioElement.addEventListener('loadedmetadata', this.eventHandlers.loadedmetadata);
    
    // Stop current playback if any
    const wasPlaying = !this.audioPlayer.audioElement.paused;
    if (wasPlaying) {
      this.audioPlayer.audioElement.pause();
    }
    
    // Set audio source based on whether we have a File object or a path
    if (track.file instanceof File) {
      // Revoke any existing object URL
      if (this.currentObjectURL) {
        URL.revokeObjectURL(this.currentObjectURL);
      }
      
      // Create a new object URL
      this.currentObjectURL = URL.createObjectURL(track.file);
      
      // Set the object URL as the source
      this.audioPlayer.audioElement.src = this.currentObjectURL;
    } else if (track.path) {
      // Format path for different platforms
      let formattedPath = track.path;
      
      // For Electron, handle file:// protocol
      if (window.electronAPI && window.electronIntegration) {
        // Convert backslashes to forward slashes for URLs
        formattedPath = formattedPath.replace(/\\/g, '/');
        
        // Add file:// protocol if not already present
        if (!formattedPath.startsWith('file://')) {
          formattedPath = `file://${formattedPath}`;
        }
      }
      
      this.audioPlayer.audioElement.src = formattedPath;
    } else {
      console.error('Invalid track: no file or path provided');
      return;
    }
    
    // Load the audio
    this.audioPlayer.audioElement.load();
    
    // Connect to audio context if not already connected
    this.connectToAudioContext();
    
    // Resume playback if it was playing
    if (wasPlaying) {
      this.audioPlayer.audioElement.play().catch(() => {});
    }
  }
  
  /**
   * Connect the audio element to the Web Audio API context
   */
  connectToAudioContext() {
    try {
      // Always create a new media source to ensure we have a clean connection
      // This is more reliable than trying to reuse the existing one
      
      // First, clean up any existing media source
      if (this.mediaSource) {
        try {
          this.mediaSource.disconnect();
        } catch (e) {
          console.warn('Error disconnecting existing media source:', e);
        }
        this.mediaSource = null;
      }
      
      // Create a new media element source
      try {
        this.mediaSource = this.audioPlayer.audioContext.createMediaElementSource(this.audioPlayer.audioElement);
      } catch (error) {
        // If we get an error about the audio element already being connected,
        // we need to create a new audio element
        if (error.name === 'InvalidStateError' && error.message.includes('already connected')) {
          // This is a normal part of the audio element lifecycle when changing tracks
          // Use debug log instead of warning
          console.debug('Audio element already connected, creating a new one');
          
          // Create a new audio element
          const oldAudioElement = this.audioPlayer.audioElement;
          const oldSrc = oldAudioElement.src;
          const wasPlaying = !oldAudioElement.paused;
          
          // Create a new audio element
          this.audioPlayer.audioElement = new Audio();
          
          // Set up event handlers before setting src
          this.setupEventHandlers();
          
          // Copy source from old element
          if (oldSrc) {
            this.audioPlayer.audioElement.src = oldSrc;
          }
          
          // Now try again to create the media source
          this.mediaSource = this.audioPlayer.audioContext.createMediaElementSource(this.audioPlayer.audioElement);
          
          // Resume playback if it was playing
          if (wasPlaying) {
            this.audioPlayer.audioElement.play().catch(() => {});
          }
        } else {
          // If it's another type of error, rethrow it
          throw error;
        }
      }
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
            // First try to disconnect without specifying the destination
            // This is safer as it disconnects from all destinations
            this.originalSourceNode.disconnect();
          } catch (e) {
            // If that fails, it's likely already disconnected, so we can ignore the error
            console.debug('Original source node already disconnected');
          }
        }
        
        // Replace the audio manager's source node with our media source
        this.audioManager.sourceNode = this.mediaSource;
        
        // Connect to worklet node
        if (this.audioManager.workletNode) {
          try {
            this.mediaSource.connect(this.audioManager.workletNode);
          } catch (e) {
            console.debug('Error connecting media source to worklet node:', e);
            // Try disconnecting first and then connecting again
            try {
              this.mediaSource.disconnect();
              this.mediaSource.connect(this.audioManager.workletNode);
            } catch (innerError) {
              console.warn('Failed to connect media source after disconnect:', innerError);
            }
          }
        }
      }
    } catch (error) {
      // If we get an error about the audio element already being connected,
      // we need to create a new audio element
      if (error.name === 'InvalidStateError' && error.message.includes('already connected')) {
        // Create a new audio element
        const oldAudioElement = this.audioPlayer.audioElement;
        this.audioPlayer.audioElement = new Audio();
        // Create and store new event handlers with proper references
        this.eventHandlers.ended = () => this.audioPlayer.playbackManager.onTrackEnded();
        this.eventHandlers.timeupdate = () => {
          if (this.audioPlayer.ui) {
            this.audioPlayer.ui.updateTimeDisplay();
          }
        };
        this.eventHandlers.error = (e) => {
          // Only log errors if they're not related to empty src (which happens during cleanup)
          if (e.target.error && e.target.error.code !== MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
            console.error('Audio element error:', e);
            if (window.uiManager) {
              window.uiManager.setError(`Audio playback error: ${e.target.error?.message || 'Unknown error'}`);
            }
          }
        };
        this.eventHandlers.loadedmetadata = () => {
          this.updateTrackNameFromMetadata();
        };
        
        // Add event listeners using stored references
        this.audioPlayer.audioElement.addEventListener('ended', this.eventHandlers.ended);
        this.audioPlayer.audioElement.addEventListener('timeupdate', this.eventHandlers.timeupdate);
        this.audioPlayer.audioElement.addEventListener('error', this.eventHandlers.error);
        this.audioPlayer.audioElement.addEventListener('loadedmetadata', this.eventHandlers.loadedmetadata);
        this.audioPlayer.audioElement.addEventListener('loadedmetadata', this.metadataHandler);
        
        // Copy source from old element
        if (oldAudioElement.src) {
          this.audioPlayer.audioElement.src = oldAudioElement.src;
        }
        
        // Try to create media source again with new element
        this.mediaSource = this.audioPlayer.audioContext.createMediaElementSource(this.audioPlayer.audioElement);
        
        // Replace the audio manager's source node with our media source
        this.audioManager.sourceNode = this.mediaSource;
        
        // Connect to worklet node
        if (this.audioManager.workletNode) {
          try {
            this.mediaSource.connect(this.audioManager.workletNode);
          } catch (e) {
            console.debug('Error connecting media source to worklet node:', e);
            // Try disconnecting first and then connecting again
            try {
              this.mediaSource.disconnect();
              this.mediaSource.connect(this.audioManager.workletNode);
            } catch (innerError) {
              console.warn('Failed to connect media source after disconnect:', innerError);
            }
          }
        }
        
        // Resume playback if it was playing
        if (!oldAudioElement.paused) {
          this.audioPlayer.audioElement.play()
            .catch(() => {});
        }
      } else {
        console.error('Error connecting audio element to context:', error);
      }
    }
  }
  
  /**
   * Load metadata for a track
   * @param {Object} track - The track to load metadata for
   */
  loadMetadata(track) {
    const currentIndex = this.audioPlayer.playbackManager.currentTrackIndex;
    
    if (track.file instanceof File) {
      this.readID3Tags(track.file, currentIndex);
    } else {
      this.tryReadFromAudioElementSrc(track, currentIndex);
    }
  }
  
  /**
   * Read ID3 tags from a file
   * @param {File} file - The file to read tags from
   * @param {number} currentIndex - The current track index
   */
  readID3Tags(file, currentIndex) {
    // Check if jsmediatags is available
    if (window.jsmediatags) {
      window.jsmediatags.read(file, {
        onSuccess: (tag) => {
          // Extract tag information
          const tags = tag.tags;
          
          // Get title, artist, album
          const title = tags.title || '';
          const artist = tags.artist || '';
          const album = tags.album || '';
          
          // Update track name display
          if (this.audioPlayer.ui && this.audioPlayer.ui.trackNameDisplay) {
            // Only update if this is still the current track
            if (currentIndex === this.audioPlayer.playbackManager.currentTrackIndex) {
              let displayText = title;
              if (artist) {
                displayText = `${artist} - ${displayText}`;
              }
              this.audioPlayer.ui.trackNameDisplay.textContent = displayText || file.name;
            }
          }
          
          // Update MediaSession API
          this.updateMediaSessionWithTags(title || file.name, artist, album);
        },
        onError: (error) => {
          // Don't log an error if ID3 tags are simply missing (normal for some audio files)
          // Only log actual errors that might indicate a problem
          if (error && error.type !== 'tagFormat') {
            console.warn('Error reading ID3 tags:', error);
          }
          this.fallbackToMediaSession(currentIndex);
        }
      });
    } else {
      // Fallback if jsmediatags is not available
      this.fallbackToMediaSession(currentIndex);
    }
  }
  
  /**
   * Try to read metadata from audio element src
   * @param {Object} track - The track to read metadata from
   * @param {number} currentIndex - The current track index
   */
  tryReadFromAudioElementSrc(track, currentIndex) {
    // Use a timeout to ensure the audio element has loaded enough data
    setTimeout(() => {
      // Only update if this is still the current track
      if (currentIndex !== this.audioPlayer.playbackManager.currentTrackIndex) return;
      
      try {
        // Try to read from the audio element's src
        if (window.jsmediatags && this.audioPlayer.audioElement.src) {
          window.jsmediatags.read(this.audioPlayer.audioElement.src, {
            onSuccess: (tag) => {
              // Extract tag information
              const tags = tag.tags;
              
              // Get title, artist, album
              const title = tags.title || '';
              const artist = tags.artist || '';
              const album = tags.album || '';
              
              // Update track name display
              if (this.audioPlayer.ui && this.audioPlayer.ui.trackNameDisplay) {
                let displayText = title;
                if (artist) {
                  displayText = `${artist} - ${displayText}`;
                }
                this.audioPlayer.ui.trackNameDisplay.textContent = displayText || track.name;
              }
              
              // Update MediaSession API
              this.updateMediaSessionWithTags(title || track.name, artist, album);
            },
            onError: (error) => {
              // Don't log an error if ID3 tags are simply missing (normal for some audio files)
              // Only log actual errors that might indicate a problem
              if (error && error.type !== 'tagFormat') {
                console.warn('Error reading ID3 tags from src:', error);
              }
              this.fallbackToMediaSession(currentIndex);
            }
          });
        } else {
          this.fallbackToMediaSession(currentIndex);
        }
      } catch (error) {
        console.warn('Error reading metadata from audio element src:', error);
        this.fallbackToMediaSession(currentIndex);
      }
    }, 500);
  }
  
  /**
   * Update MediaSession API with metadata
   * @param {string} title - Track title
   * @param {string} artist - Track artist
   * @param {string} album - Track album
   */
  updateMediaSessionWithTags(title, artist, album) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Unknown Title',
        artist: artist || 'Unknown Artist',
        album: album || 'Unknown Album'
      });
    }
  }
  
  /**
   * Fallback to MediaSession API with basic track info
   * @param {number} currentIndex - The current track index
   */
  fallbackToMediaSession(currentIndex) {
    // Check if audio element still exists
    if (!this.audioPlayer.audioElement) return;
    
    // Only update if this is still the current track
    if (currentIndex !== this.audioPlayer.playbackManager.currentTrackIndex) return;
    
    // Try to get metadata from audio element
    if (this.audioPlayer.audioElement.duration > 0) {
      // Check if the audio element has a title attribute
      if (this.audioPlayer.audioElement.title) {
        if (this.audioPlayer.ui && this.audioPlayer.ui.trackNameDisplay) {
          this.audioPlayer.ui.trackNameDisplay.textContent = this.audioPlayer.audioElement.title;
        }
        return;
      }
    }
    
    // Use track name as fallback
    const track = this.audioPlayer.playbackManager.getTrack(currentIndex);
    if (track && track.name && this.audioPlayer.ui && this.audioPlayer.ui.trackNameDisplay) {
      this.audioPlayer.ui.trackNameDisplay.textContent = track.name;
    }
  }
  /**
   * Update track name from audio metadata
   */
  updateTrackNameFromMetadata() {
    // Check if audio element still exists
    if (!this.audioPlayer.audioElement) return;
    
    const currentIndex = this.audioPlayer.playbackManager.currentTrackIndex;
    this.fallbackToMediaSession(currentIndex);
  }
  
  /**
   * Set up event handlers for the audio element
   */
  setupEventHandlers() {
    // Create and store event handlers with proper references
    this.eventHandlers.ended = () => this.audioPlayer.playbackManager.onTrackEnded();
    this.eventHandlers.timeupdate = () => {
      if (this.audioPlayer.ui) {
        this.audioPlayer.ui.updateTimeDisplay();
      }
    };
    this.eventHandlers.error = (e) => {
      // Only log errors if they're not related to empty src (which happens during cleanup)
      if (e.target.error && e.target.error.code !== MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        console.error('Audio element error:', e);
        if (window.uiManager) {
          window.uiManager.setError(`Audio playback error: ${e.target.error?.message || 'Unknown error'}`);
        }
      }
    };
    this.eventHandlers.loadedmetadata = () => {
      this.updateTrackNameFromMetadata();
    };
    
    // Add event listeners using stored references
    this.audioPlayer.audioElement.addEventListener('ended', this.eventHandlers.ended);
    this.audioPlayer.audioElement.addEventListener('timeupdate', this.eventHandlers.timeupdate);
    this.audioPlayer.audioElement.addEventListener('error', this.eventHandlers.error);
    this.audioPlayer.audioElement.addEventListener('loadedmetadata', this.eventHandlers.loadedmetadata);
  }
  
  /**
   * Disconnect and clean up audio connections
   * Disconnect and clean up audio connections
   */
  disconnect() {
    try {
      // First, pause playback to prevent any further events
      if (this.audioPlayer.audioElement && !this.audioPlayer.audioElement.paused) {
        this.audioPlayer.audioElement.pause();
      }
      // Disconnect media source first
      if (this.mediaSource) {
        try {
          this.mediaSource.disconnect();
        } catch (e) {
          console.warn('Error disconnecting media source:', e);
        }
        // Set to null to ensure it's recreated on next use
        this.mediaSource = null;
      }
      
      // Revoke any object URLs
      if (this.currentObjectURL) {
        URL.revokeObjectURL(this.currentObjectURL);
        this.currentObjectURL = null;
      }
      
      // Clean up audio element
      if (this.audioPlayer.audioElement) {
        // Remove all event listeners first before changing src
        // Remove the loadedmetadata event listener first to prevent metadata events during cleanup
        if (this.eventHandlers.loadedmetadata) {
          this.audioPlayer.audioElement.removeEventListener('loadedmetadata', this.eventHandlers.loadedmetadata);
          // Clear the reference to prevent any future calls
          this.eventHandlers.loadedmetadata = null;
        }
        
        if (this.eventHandlers.ended) {
          this.audioPlayer.audioElement.removeEventListener('ended', this.eventHandlers.ended);
          this.eventHandlers.ended = null;
        }
        
        if (this.eventHandlers.timeupdate) {
          this.audioPlayer.audioElement.removeEventListener('timeupdate', this.eventHandlers.timeupdate);
          this.eventHandlers.timeupdate = null;
        }
        
        // Remove the error event listener before changing src
        if (this.eventHandlers.error) {
          this.audioPlayer.audioElement.removeEventListener('error', this.eventHandlers.error);
          this.eventHandlers.error = null;
        }
        
        // Now it's safe to change the src
        // Use a data URL with a tiny silent audio clip instead of empty string
        // This prevents the "Empty src attribute" error
        const silentDataUrl = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
        this.audioPlayer.audioElement.src = silentDataUrl;
        
        // Don't call load() as it can trigger events we just removed listeners for
        // this.audioPlayer.audioElement.load();
      }
      
      // Check if we were using input with player
      const useInputWithPlayer = window.electronIntegration?.audioPreferences?.useInputWithPlayer || false;
      
      if (!useInputWithPlayer) {
        // If we weren't using input with player, restore the original source node
        if (this.originalSourceNode) {
          this.audioManager.sourceNode = this.originalSourceNode;
          
          // Reconnect to worklet node
          if (this.audioManager.workletNode) {
            this.audioManager.sourceNode.connect(this.audioManager.workletNode);
          }
        }
      }
    } catch (error) {
      console.error('Error disconnecting audio context:', error);
    }
  }
}