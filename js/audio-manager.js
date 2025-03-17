export class AudioManager {
    constructor(pipelineManager) {
        this.audioContext = null;
        this.stream = null;
        this.sourceNode = null;
        this.workletNode = null;
        this.pipeline = [];
        this.masterBypass = false;
        this.offlineContext = null;
        this.offlineWorkletNode = null;
        this.pipelineManager = pipelineManager;
        this.isOfflineProcessing = false;
        this.isCancelled = false;
        
        // Flag to control audio initialization during sample rate adjustment
        this._skipAudioInitDuringSampleRateChange = false;
        
        // Flag for first launch audio workaround
        this.isFirstLaunch = false;
        
        // Event listeners for audio state changes
        this.eventListeners = {
            sleepModeChanged: []
        };
        
        // Setup user activity detection
        this.setupUserActivityDetection();
    }
    
    setupUserActivityDetection() {
        // Detect user activity events
        const userActivityEvents = [
            'mousedown', 'mouseup', 'mousemove',
            'keydown', 'keyup',
            'touchstart', 'touchend', 'touchmove',
            'click', 'dblclick', 'wheel'
        ];
        
        // Add event listeners for all user activity events
        userActivityEvents.forEach(eventType => {
            document.addEventListener(eventType, this.handleUserActivity.bind(this), { passive: true });
        });
    }
    
    handleUserActivity() {
        // Notify audio processor about user activity
        if (this.workletNode) {
            this.workletNode.port.postMessage({
                type: 'userActivity'
            });
        }
    }
    
    // Event listener management methods
    addEventListener(eventName, callback) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].push(callback);
        }
    }
    
    removeEventListener(eventName, callback) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName] = this.eventListeners[eventName].filter(
                listener => listener !== callback
            );
        }
    }
    
    // Trigger event listeners for a specific event
    dispatchEvent(eventName, data) {
        if (this.eventListeners[eventName]) {
            for (const listener of this.eventListeners[eventName]) {
                listener(data);
            }
        }
    }

    async initAudio() {
        try {
            // Variable to store microphone error message
            let microphoneError = null;
            
            // Check if this is the first launch
            if (window.electronAPI && window.electronAPI.isFirstLaunch) {
                try {
                    const firstLaunchPromise = window.electronAPI.isFirstLaunch();
                    if (firstLaunchPromise && typeof firstLaunchPromise.then === 'function') {
                        this.isFirstLaunch = await firstLaunchPromise;
                    } else {
                        this.isFirstLaunch = false;
                    }
                } catch (error) {
                    this.isFirstLaunch = false;
                }
            } else if (window.isFirstLaunchConfirmed !== undefined) {
                this.isFirstLaunch = window.isFirstLaunchConfirmed;
            }
            
            // Create audio context if not exists
            if (!this.audioContext) {
                // Enhanced browser compatibility for AudioContext
                const AudioContext = window.AudioContext ||
                                    window.webkitAudioContext ||
                                    window.mozAudioContext ||
                                    window.msAudioContext;
                
                if (!AudioContext) {
                    throw new Error('Web Audio API is not supported in this browser');
                }
                
                // Default audio context options
                let audioContextOptions = { latencyHint: 'playback' };
                
                // If running in Electron, try to use saved sample rate preference
                if (window.electronAPI && window.electronIntegration) {
                    const preferences = await window.electronIntegration.loadAudioPreferences();
                    if (preferences && preferences.sampleRate) {
                        audioContextOptions.sampleRate = preferences.sampleRate;
                    }
                }
                
                // Create audio context with options
                this.audioContext = new AudioContext(audioContextOptions);
                window.audioContext = this.audioContext; // Global reference
                
                // If this is the first launch, create a gain node with zero gain to ensure silence
                if (this.isFirstLaunch) {
                    // Create a gain node with zero gain
                    const silenceGain = this.audioContext.createGain();
                    silenceGain.gain.value = 0;
                    this.silenceGain = silenceGain;
                    
                    // Store original connect method
                    AudioManager.originalConnect = AudioNode.prototype.connect;
                    
                    // Override connect method to force all connections through the silence gain
                    // Handle all possible overloads of the connect method
                    AudioNode.prototype.connect = function(destination, outputIndex, inputIndex) {
                        // Connect to silence gain instead, preserving all arguments
                        if (arguments.length === 1) {
                            return AudioManager.originalConnect.call(this, silenceGain);
                        } else if (arguments.length === 2) {
                            return AudioManager.originalConnect.call(this, silenceGain, outputIndex);
                        } else {
                            return AudioManager.originalConnect.call(this, silenceGain, outputIndex, inputIndex);
                        }
                    };
                    
                    // Connect silence gain to destination
                    AudioManager.originalConnect.call(silenceGain, this.audioContext.destination);
                }
            }

            // Load audio worklet with absolute path
            const currentPath = window.location.pathname;
            const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
            
            // Check if AudioWorklet is supported
            if (this.audioContext.audioWorklet) {
                try {
                    await this.audioContext.audioWorklet.addModule(`${basePath}/plugins/audio-processor.js`);
                } catch (error) {
                    console.error('Failed to load audio worklet module:', error);
                    throw new Error(`AudioWorklet failed to load: ${error.message}`);
                }
            } else {
                throw new Error('AudioWorklet is not supported in this browser. Please use a modern browser.');
            }

            // Flag to track if we're using microphone input
            let usingMicrophoneInput = true;
            
            // Check if we're running in Electron and have audio preferences
            let audioConstraints = {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            };

            // If running in Electron, try to use saved audio preferences
            if (window.electronAPI && window.electronIntegration) {
                const preferences = await window.electronIntegration.loadAudioPreferences();
                if (preferences && preferences.inputDeviceId) {
                    audioConstraints.deviceId = { exact: preferences.inputDeviceId };
                }
            }

            // Try to get user media with audio constraints
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({
                    audio: audioConstraints
                });
            } catch (error) {
                // If failed with saved device, try again with default device
                if (audioConstraints.deviceId) {
                    console.warn('Failed to use saved audio input device, falling back to default:', error);
                    delete audioConstraints.deviceId;
                    try {
                        this.stream = await navigator.mediaDevices.getUserMedia({
                            audio: audioConstraints
                        });
                    } catch (innerError) {
                        // If permission is denied, try to clear permission overrides and ask again
                        if (innerError.name === 'NotAllowedError' || innerError.name === 'PermissionDeniedError') {
                            if (window.electronAPI && window.electronAPI.clearMicrophonePermission) {
                                console.log('Microphone permission denied, attempting to clear permission overrides');
                                try {
                                    await window.electronAPI.clearMicrophonePermission();
                                    // Try one more time after clearing permissions
                                    this.stream = await navigator.mediaDevices.getUserMedia({
                                        audio: audioConstraints
                                    });
                                } catch (finalError) {
                                    console.warn('Failed to get microphone access after clearing permissions:', finalError);
                                    usingMicrophoneInput = false;
                                }
                            } else {
                                console.warn('Microphone permission denied:', innerError);
                                usingMicrophoneInput = false;
                            }
                        } else {
                            console.warn('Failed to get microphone access:', innerError);
                            usingMicrophoneInput = false;
                        }
                    }
                } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    // If permission is denied on first attempt, try to clear permission overrides and ask again
                    if (window.electronAPI && window.electronAPI.clearMicrophonePermission) {
                        console.log('Microphone permission denied, attempting to clear permission overrides');
                        try {
                            await window.electronAPI.clearMicrophonePermission();
                            // Try one more time after clearing permissions
                            this.stream = await navigator.mediaDevices.getUserMedia({
                                audio: audioConstraints
                            });
                        } catch (finalError) {
                            console.warn('Failed to get microphone access after clearing permissions:', finalError);
                            usingMicrophoneInput = false;
                        }
                    } else {
                        console.warn('Microphone permission denied:', error);
                        usingMicrophoneInput = false;
                    }
                } else {
                    console.warn('Failed to get microphone access:', error);
                    usingMicrophoneInput = false;
                }
            }

            // If we have microphone access, create source from stream
            if (usingMicrophoneInput && this.stream) {
                this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
            } else {
                // No microphone access, create a stereo-compatible silent source as a fallback
                console.log('Creating stereo-compatible silent source as fallback');
                
                // Create a buffer source instead of oscillator for better stereo support
                const bufferSize = this.audioContext.sampleRate * 2; // 2 seconds of silence
                const silentBuffer = this.audioContext.createBuffer(
                    2, // 2 channels for stereo
                    bufferSize,
                    this.audioContext.sampleRate
                );
                
                // Create a buffer source node
                const bufferSource = this.audioContext.createBufferSource();
                bufferSource.buffer = silentBuffer;
                bufferSource.loop = true; // Loop the silent buffer
                
                // Create a gain node to ensure silence
                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = 0; // Mute
                
                // Connect buffer source to gain node
                bufferSource.connect(gainNode);
                bufferSource.start();
                
                // Use the gain node as our source node
                this.sourceNode = gainNode;
                
                // Log message for Electron users
                if (window.electronAPI && window.electronIntegration) {
                    console.log('Microphone access not available. Music file playback mode will still work.');
                }
                
                // Store the error message if microphone access was denied, but don't return it yet
                // This allows us to continue setting up the audio nodes for playback
                if (!usingMicrophoneInput) {
                    // Use the same error format as before so app.js can detect it properly
                    microphoneError = `Audio Error: Microphone access denied. Music file playback mode will still work.`;
                }
            }

            // Create worklet node
            this.workletNode = new AudioWorkletNode(this.audioContext, 'plugin-processor');
            window.workletNode = this.workletNode;
            window.pipeline = this.pipeline; // Global pipeline reference

            // Setup worklet message handler
            this.workletNode.port.onmessage = (event) => {
                const data = event.data;
                if (data.type === 'sleepModeChanged') {
                    // Dispatch sleep mode changed event instead of directly updating UI
                    this.dispatchEvent('sleepModeChanged', {
                        isSleepMode: data.isSleepMode,
                        sampleRate: this.audioContext.sampleRate
                    });
                }
            };

            // Build initial pipeline with initialization flag
            await this.rebuildPipeline(true);

            // Resume context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // If we had a microphone error, return it now after all audio nodes are set up
            // This ensures the error is displayed in the UI but audio playback still works
            if (microphoneError) {
                console.warn('Returning microphone error for display:', microphoneError);
                return microphoneError;
            }
            
            // Return success (empty string means no error)
            return '';
        } catch (error) {
            console.error('Audio initialization error:', error);
            // Instead of throwing, return an error message
            const errorMessage = `Audio Error: ${error.message}`;
            // Make sure we return a resolved promise with the error message
            return errorMessage;
        }
    }

    // Add isInitializing flag to control logging
    async rebuildPipeline(isInitializing = false) {
        if (!this.audioContext || !this.sourceNode) return;

        // Disconnect existing connections
        try {
            if (this.sourceNode) {
                this.sourceNode.disconnect();
            }
            if (this.workletNode) {
                this.workletNode.disconnect();
            }
        } catch (error) {
            console.warn('Error disconnecting audio nodes:', error);
            // Continue execution, as we'll try to establish new connections
        }

        // Create missing nodes if needed
        if (!this.sourceNode && this.audioContext) {
            console.warn('Source node missing, creating fallback silent source');
            // Create a silent source node as fallback
            const bufferSize = this.audioContext.sampleRate * 2;
            const silentBuffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
            const bufferSource = this.audioContext.createBufferSource();
            bufferSource.buffer = silentBuffer;
            bufferSource.loop = true;
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0;
            
            bufferSource.connect(gainNode);
            bufferSource.start();
            
            this.sourceNode = gainNode;
        }
        
        if (!this.workletNode && this.audioContext) {
            console.warn('Worklet node missing, creating new worklet node');
            try {
                this.workletNode = new AudioWorkletNode(this.audioContext, 'plugin-processor');
                window.workletNode = this.workletNode;
            } catch (error) {
                console.error('Failed to create worklet node:', error);
                return `Audio Error: Failed to create audio processor: ${error.message}`;
            }
        }
        
        // Connect source to worklet
        try {
            // Make sure both nodes exist after our recovery attempts
            if (!this.sourceNode || !this.workletNode) {
                console.error('Source or worklet node is still missing after recovery attempt');
                return `Audio Error: Audio initialization incomplete - missing audio nodes`;
            }
            
            // Use the original connect method to avoid any overridden connect methods
            if (AudioManager.originalConnect && this.isFirstLaunch) {
                AudioManager.originalConnect.call(this.sourceNode, this.workletNode);
            } else {
                this.sourceNode.connect(this.workletNode);
            }
        } catch (error) {
            console.error('Error connecting source to worklet:', error);
            // Return an error message that will be propagated to app.js
            return `Audio Error: Failed to connect audio nodes: ${error.message}`;
        }
        
        // Create a MediaStreamDestination to get a MediaStream
        // Check if createMediaStreamDestination is supported
        try {
            if (typeof this.audioContext.createMediaStreamDestination === 'function') {
                this.destinationNode = this.audioContext.createMediaStreamDestination();
                
                // Connect worklet to the MediaStreamDestination
                try {
                    this.workletNode.connect(this.destinationNode);
                } catch (connectError) {
                    console.error('Error connecting worklet to MediaStreamDestination:', connectError);
                    // Return an error message that will be propagated to app.js
                    return `Audio Error: Failed to connect to audio destination: ${connectError.message}`;
                }
            } else {
                console.warn('createMediaStreamDestination is not supported in this browser');
                // Fall back to default destination only
                this.destinationNode = null;
            }
        } catch (error) {
            console.error('Error creating MediaStreamDestination:', error);
            // Fall back to default destination only
            this.destinationNode = null;
            // Return an error message that will be propagated to app.js
            return `Audio Error: Failed to create audio destination: ${error.message}`;
        }
        
        // Store the connection to default destination so we can disconnect it later if needed
        this.defaultDestinationConnection = null;
        // If this is the first launch, set up a processor to mute audio output
        if (this.isFirstLaunch && window.electronIntegration && window.electronIntegration.isElectron) {
            
            // Create a script processor node to zero-fill audio output
            const bufferSize = 4096;
            // Handle vendor prefixes for ScriptProcessorNode (deprecated but still used)
            let silenceNode;
            if (typeof this.audioContext.createScriptProcessor === 'function') {
                silenceNode = this.audioContext.createScriptProcessor(bufferSize, 2, 2);
            } else if (typeof this.audioContext.createJavaScriptNode === 'function') {
                // Older browsers used createJavaScriptNode
                silenceNode = this.audioContext.createJavaScriptNode(bufferSize, 2, 2);
            } else {
                console.warn('ScriptProcessorNode is not supported in this browser');
                // Skip silence node creation and continue with normal audio output
                return;
            }
            
            silenceNode.onaudioprocess = (e) => {
                // Get output buffer
                const outputL = e.outputBuffer.getChannelData(0);
                const outputR = e.outputBuffer.getChannelData(1);
                
                // Fill with zeros (silence)
                for (let i = 0; i < outputL.length; i++) {
                    outputL[i] = 0;
                    outputR[i] = 0;
                }
            };
            
            // Insert the silence node between worklet and destination
            try {
                // Only disconnect if connected
                if (this.destinationNode) {
                    this.workletNode.disconnect(this.destinationNode);
                }
                this.workletNode.connect(silenceNode);
                silenceNode.connect(this.destinationNode);
            } catch (error) {
                console.warn('Error connecting silence node:', error);
                // Fall back to direct connection if there's an error
                if (this.destinationNode) {
                    this.workletNode.connect(this.destinationNode);
                }
            }
            
            // Store reference to remove on cleanup
            this.silenceNode = silenceNode;
        }
        
        // For web app (non-Electron), always connect to default destination
        if (!window.electronAPI || !window.electronIntegration) {
            // Only log during initialization
            if (isInitializing) {
                console.log('Using default audio destination');
            }
            try {
                this.defaultDestinationConnection = this.workletNode.connect(this.audioContext.destination);
            } catch (error) {
                console.error('Error connecting to default audio destination:', error);
                // Return an error message that will be propagated to app.js
                return `Audio Error: Failed to connect to default audio destination: ${error.message}`;
            }
            
            // Skip the Electron-specific code and continue with the rest of the method
            // Don't return early, let the method continue to update the worklet
        } else {
            // If running in Electron, try to use saved output device
            const preferences = await window.electronIntegration.loadAudioPreferences();
            if (preferences && preferences.outputDeviceId) {
                
                try {
                    // Create a new audio element for actual use
                    if (this.audioElement) {
                        this.audioElement.pause();
                        this.audioElement.srcObject = null;
                    }
                    
                    this.audioElement = new Audio();
                    this.audioElement.autoplay = true;
                    this.audioElement.volume = 1.0;
                    this.audioElement.muted = false;
                    
                    
                    // Check for Audio Output Devices API support
                    // The setSinkId method is part of the Audio Output Devices API
                    const hasSinkIdSupport =
                        typeof this.audioElement.setSinkId === 'function';
                    
                    if (hasSinkIdSupport) {
                        try {
                            // Get available devices - this doesn't require microphone permission
                            let outputDevice = null;
                            
                            try {
                                // Try to enumerate devices - this works even without microphone permission
                                if (typeof navigator.mediaDevices !== 'undefined' &&
                                    typeof navigator.mediaDevices.enumerateDevices === 'function') {
                                    const devices = await navigator.mediaDevices.enumerateDevices();
                                    outputDevice = devices.find(device =>
                                        device.kind === 'audiooutput' &&
                                        device.deviceId === preferences.outputDeviceId
                                    );
                                }
                            } catch (enumError) {
                                console.warn('Failed to enumerate devices:', enumError);
                                // Continue with the saved device ID even if we can't verify it exists
                            }
                            
                            if (outputDevice) {
                                await this.audioElement.setSinkId(preferences.outputDeviceId);
                                console.log(`Audio output set to: ${outputDevice.label || 'unnamed device'}`);
                            } else {
                                // Try to use the saved device ID directly even if we couldn't verify it
                                try {
                                    await this.audioElement.setSinkId(preferences.outputDeviceId);
                                    console.log(`Audio output set to saved device ID: ${preferences.outputDeviceId}`);
                                } catch (directSinkError) {
                                    console.warn('Failed to set audio output to saved device, using default:', directSinkError);
                                    // Fall back to default device
                                    await this.audioElement.setSinkId('default');
                                }
                            }
                            
                            // Now set the srcObject after sinkId is set
                            if (this.destinationNode && this.destinationNode.stream) {
                                this.audioElement.srcObject = this.destinationNode.stream;
                            } else {
                                console.warn('No destination stream available');
                                // Fall back to default output
                                try {
                                    this.defaultDestinationConnection = this.workletNode.connect(this.audioContext.destination);
                                } catch (connectError) {
                                    console.error('Error connecting to default audio destination:', connectError);
                                    return `Audio Error: Failed to connect to default audio destination: ${connectError.message}`;
                                }
                            }
                            
                            // Explicitly call play()
                            try {
                                await this.audioElement.play();
                            } catch (playError) {
                                console.warn('Failed to play audio:', playError);
                                // Fall back to default output
                                this.defaultDestinationConnection = this.workletNode.connect(this.audioContext.destination);
                            }
                        } catch (sinkError) {
                            console.warn('Failed to set audio output device:', sinkError);
                            this.defaultDestinationConnection = this.workletNode.connect(this.audioContext.destination);
                            
                            // Still try to use the audio element as a fallback
                            if (this.destinationNode && this.destinationNode.stream) {
                                this.audioElement.srcObject = this.destinationNode.stream;
                            }
                        }
                    } else {
                        console.warn('Audio Output Devices API not supported in this browser');
                        // Fall back to default output
                        this.defaultDestinationConnection = this.workletNode.connect(this.audioContext.destination);
                        
                        // Still try to use the audio element as a fallback
                        if (this.destinationNode && this.destinationNode.stream) {
                            this.audioElement.srcObject = this.destinationNode.stream;
                        }
                    }
                    
                    // Add event listeners for debugging
                    
                    this.audioElement.addEventListener('error', (e) => {
                        // If there's an error with the audio element, make sure we're using the default output
                        if (!this.defaultDestinationConnection) {
                            this.defaultDestinationConnection = this.workletNode.connect(this.audioContext.destination);
                        }
                    });
                } catch (error) {
                    // Ensure we have audio output in case of error
                    if (!this.defaultDestinationConnection) {
                        this.defaultDestinationConnection = this.workletNode.connect(this.audioContext.destination);
                    }
                }
            }
        }

        // Update worklet with current pipeline state
        if (this.pipeline.length === 0 || this.masterBypass) {
            this.workletNode.port.postMessage({
                type: 'updatePlugins',
                plugins: [],
                masterBypass: true
            });
            return;
        }

        // Send plugin data to worklet
        const pluginData = this.pipeline.map(plugin => {
            const params = plugin.getParameters();
            return {
                id: plugin.id,
                type: plugin.constructor.name,
                enabled: plugin.enabled,
                parameters: params
            };
        });
        
        // Add message handler if not already added
        if (!this.workletNode.port.onmessage) {
            this.workletNode.port.onmessage = (event) => {
                const data = event.data;
            };
        }
        
        // Send message to worklet
        this.workletNode.port.postMessage({
            type: 'updatePlugins',
            plugins: pluginData,
            masterBypass: this.masterBypass
        });
    }

    async reset(audioPreferences = null) {
        // Stop audio element if it exists
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.srcObject = null;
            this.audioElement = null;
        }
        
        // Disconnect from default destination if connected
        if (this.defaultDestinationConnection && this.workletNode && this.audioContext) {
            try {
                this.workletNode.disconnect(this.audioContext.destination);
            } catch (error) {
            }
        }
        
        // Disconnect silence node if it exists
        if (this.silenceNode && this.audioContext) {
            try {
                this.silenceNode.disconnect();
                this.silenceNode = null;
            } catch (error) {
            }
        }
        
        // Restore original connect method if it was overridden
        if (AudioManager.originalConnect) {
            try {
                // Restore original connect method
                AudioNode.prototype.connect = AudioManager.originalConnect;
                AudioManager.originalConnect = null;
            } catch (error) {
            }
        }
        
        // Disconnect silence gain if it exists
        if (this.silenceGain) {
            try {
                this.silenceGain.disconnect();
                this.silenceGain = null;
            } catch (error) {
            }
        }
        
        // Clear default destination connection
        this.defaultDestinationConnection = null;
        
        // Close audio context and clear global reference
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
            window.audioContext = null;
        }
        
        // Stop all media tracks
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // Clear nodes
        this.sourceNode = null;
        this.workletNode = null;
        this.destinationNode = null;
        
        // If audio preferences were provided, save them first
        if (audioPreferences && window.electronAPI && window.electronIntegration) {
            await window.electronIntegration.saveAudioPreferences(audioPreferences);
        }
        
        // Skip initialization if we're being called from the sample rate adjustment code
        if (this._skipAudioInitDuringSampleRateChange) {
            this._skipAudioInitDuringSampleRateChange = false;
            return '';
        }
        
        // Get current sample rate before reinitializing
        let currentSampleRate = null;
        if (window.electronAPI && window.electronIntegration) {
            const preferences = await window.electronIntegration.loadAudioPreferences();
            if (preferences && preferences.sampleRate) {
                currentSampleRate = preferences.sampleRate;
            }
        }
        
        // Initialize audio and rebuild pipeline
        await this.initAudio();
        
        // Make sure pipeline is rebuilt with the new audio context
        if (this.pipeline && this.pipeline.length > 0) {
            await this.rebuildPipeline(true);
        }
        
        return '';
    }

    // Only rebuild pipeline when necessary (when pipeline structure changes)
    setPipeline(pipeline) {
        // Check if pipeline structure has changed
        const needsRebuild = this.pipeline.length !== pipeline.length ||
            pipeline.some((plugin, index) =>
                this.pipeline[index]?.id !== plugin.id ||
                this.pipeline[index]?.enabled !== plugin.enabled
            );
        
        this.pipeline = pipeline;
        
        // Only rebuild if necessary
        if (needsRebuild) {
            return this.rebuildPipeline();
        } else {
            // Just update parameters without rebuilding
            if (window.workletNode) {
                const pluginData = this.pipeline.map(plugin => ({
                    id: plugin.id,
                    type: plugin.constructor.name,
                    enabled: plugin.enabled,
                    parameters: plugin.getParameters()
                }));
                
                window.workletNode.port.postMessage({
                    type: 'updatePlugins',
                    plugins: pluginData,
                    masterBypass: this.masterBypass
                });
            }
            return Promise.resolve();
        }
    }

    // Only rebuild pipeline when bypass state changes
    setMasterBypass(bypass) {
        if (this.masterBypass !== bypass) {
            this.masterBypass = bypass;
            return this.rebuildPipeline();
        }
        return Promise.resolve();
    }

    // Process an audio file offline
    async processAudioFile(file, progressCallback = null) {
        this.isOfflineProcessing = true;
        this.isCancelled = false;
        try {
            // Read file as ArrayBuffer and decode audio data
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // If no active plugins, encode directly to WAV
            const activePlugins = this.pipeline.filter(plugin => plugin.enabled);
            if (activePlugins.length === 0) {
                return this.encodeWAV(audioBuffer);
            }

            const { numberOfChannels, length: totalSamples, sampleRate } = audioBuffer;
            
            // Handle browser compatibility for OfflineAudioContext
            const OfflineAudioCtx = window.OfflineAudioContext ||
                                   window.webkitOfflineAudioContext ||
                                   window.mozOfflineAudioContext;
            
            if (!OfflineAudioCtx) {
                throw new Error('OfflineAudioContext is not supported in this browser');
            }
            
            // Create offline context for final rendering
            // Different browsers may have different constructor signatures
            try {
                // Modern constructor with options object
                this.offlineContext = new OfflineAudioCtx({
                    numberOfChannels,
                    length: totalSamples,
                    sampleRate
                });
            } catch (error) {
                try {
                    // Legacy constructor with separate arguments
                    this.offlineContext = new OfflineAudioCtx(numberOfChannels, totalSamples, sampleRate);
                } catch (legacyError) {
                    throw new Error(`Failed to create OfflineAudioContext: ${legacyError.message}`);
                }
            }

            const BLOCK_SIZE = 128;
            // Create buffer for processed audio
            const processedBuffer = this.offlineContext.createBuffer(numberOfChannels, totalSamples, sampleRate);

            // Map to hold plugin-specific processing contexts
            const pluginContexts = new Map();
            const createContext = (pluginId) => {
                if (!pluginContexts.has(pluginId)) {
                    pluginContexts.set(pluginId, {
                        sampleRate,
                        currentTime: 0,
                        initialized: false,
                        fadeStates: new Map(),
                        getFadeValue: (id, currentValue, time) => {
                            const FADE_DURATION = 0.010; // 10ms fade
                            const context = pluginContexts.get(pluginId);
                            let fadeState = context.fadeStates.get(id);
                            if (!fadeState) {
                                fadeState = {
                                    prevValue: currentValue,
                                    targetValue: currentValue,
                                    startTime: time
                                };
                                context.fadeStates.set(id, fadeState);
                                return currentValue;
                            }
                            if (fadeState.prevValue === null) {
                                fadeState.prevValue = currentValue;
                                fadeState.targetValue = currentValue;
                            } else if (fadeState.targetValue !== currentValue) {
                                fadeState.prevValue = fadeState.targetValue;
                                fadeState.targetValue = currentValue;
                                fadeState.startTime = time;
                            }
                            const fadeProgress = Math.min(1, (time - fadeState.startTime) / FADE_DURATION);
                            return fadeState.prevValue + (fadeState.targetValue - fadeState.prevValue) * fadeProgress;
                        }
                    });
                }
                return pluginContexts.get(pluginId);
            };

            let lastProgressUpdate = 0;
            const PROGRESS_UPDATE_INTERVAL = 16; // ~60fps

            // Process audio in blocks
            for (let offset = 0; offset < totalSamples; offset += BLOCK_SIZE) {
                const blockSize = Math.min(BLOCK_SIZE, totalSamples - offset);
                const inputBlock = new Float32Array(blockSize * numberOfChannels);

                // Interleave channel data into a single block
                for (let ch = 0; ch < numberOfChannels; ch++) {
                    const channelData = audioBuffer.getChannelData(ch);
                    const channelOffset = ch * blockSize;
                    for (let i = 0; i < blockSize; i++) {
                        inputBlock[channelOffset + i] = channelData[offset + i];
                    }
                }

                // Process block through each active plugin
                let processedBlock = new Float32Array(inputBlock);
                for (const plugin of activePlugins) {
                    if (!plugin.enabled) continue;

                    const parameters = {
                        ...plugin.getParameters(),
                        channelCount: numberOfChannels,
                        blockSize,
                        sampleRate,
                        initialized: pluginContexts.has(plugin.id)
                    };

                    try {
                        const pluginContext = createContext(plugin.id);
                        pluginContext.currentTime = offset / sampleRate;

                        if (!(processedBlock instanceof Float32Array)) {
                            processedBlock = new Float32Array(processedBlock);
                        }
                        
                        const result = plugin.executeProcessor(
                            pluginContext,
                            processedBlock,
                            parameters,
                            pluginContext.currentTime
                        );

                        if (!result || !(result instanceof Float32Array) || result.length !== blockSize * numberOfChannels) {
                            throw new Error('Invalid plugin output');
                        }
                        processedBlock = result;
                    } catch (error) {
                        // On error, pass through the original block
                        processedBlock = inputBlock;
                    }
                }

                // De-interleave processed data back into the processed buffer
                for (let ch = 0; ch < numberOfChannels; ch++) {
                    const channelData = processedBuffer.getChannelData(ch);
                    const channelOffset = ch * blockSize;
                    for (let i = 0; i < blockSize; i++) {
                        channelData[offset + i] = processedBlock[channelOffset + i];
                    }
                }

                // Throttle progress updates (~60fps)
                const currentTime = performance.now();
                if (progressCallback && currentTime - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
                    const progress = Math.round(((offset + blockSize) / totalSamples) * 100);
                    await new Promise(resolve =>
                        requestAnimationFrame(() => {
                            progressCallback(progress);
                            resolve();
                        })
                    );
                    lastProgressUpdate = currentTime;
                }

                // Check for cancellation
                if (this.isCancelled) return null;

                // Yield to UI updates between blocks
                if (offset % (BLOCK_SIZE * 8) === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            // Create source node for final offline rendering
            const sourceNode = this.offlineContext.createBufferSource();
            sourceNode.buffer = processedBuffer;
            sourceNode.connect(this.offlineContext.destination);

            try {
                sourceNode.start();
                const renderedBuffer = await this.offlineContext.startRendering();
                if (!renderedBuffer || renderedBuffer.length === 0) {
                    throw new Error('Rendering produced empty buffer');
                }
                if (progressCallback) {
                    await new Promise(resolve =>
                        requestAnimationFrame(() => {
                            progressCallback(100);
                            resolve();
                        })
                    );
                }
                return this.encodeWAV(renderedBuffer);
            } catch (error) {
                throw new Error(`Processing failed: ${error.message}`);
            } finally {
                // Clean up offline nodes and context
                sourceNode.disconnect();
                if (this.offlineWorkletNode) {
                    this.offlineWorkletNode.disconnect();
                    this.offlineWorkletNode = null;
                }
                this.offlineContext = null;
            }
        } catch (error) {
            throw new Error(`File processing error: ${error.message}`);
        } finally {
            this.isOfflineProcessing = false;
        }
    }

    // Encode audio buffer to WAV format with 24-bit samples
    encodeWAV(audioBuffer) {
        // Helper function to write string data into DataView
        const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        const format = 1; // PCM
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const bitsPerSample = 24; // Changed to 24-bit
        const bytesPerSample = bitsPerSample / 8; // 3 bytes per sample
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const samples = audioBuffer.length;
        const dataSize = samples * blockAlign;
        const fileSize = 36 + dataSize;

        // Create buffer for WAV file
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);
        let offset = 0;

        // RIFF chunk descriptor
        writeString(view, offset, 'RIFF'); offset += 4;
        view.setUint32(offset, fileSize, true); offset += 4;
        writeString(view, offset, 'WAVE'); offset += 4;

        // fmt sub-chunk
        writeString(view, offset, 'fmt '); offset += 4;
        view.setUint32(offset, 16, true); offset += 4; // Subchunk1Size for PCM
        view.setUint16(offset, format, true); offset += 2;
        view.setUint16(offset, numChannels, true); offset += 2;
        view.setUint32(offset, sampleRate, true); offset += 4;
        view.setUint32(offset, byteRate, true); offset += 4;
        view.setUint16(offset, blockAlign, true); offset += 2;
        view.setUint16(offset, bitsPerSample, true); offset += 2;

        // data sub-chunk
        writeString(view, offset, 'data'); offset += 4;
        view.setUint32(offset, dataSize, true); offset += 4;

        // Write audio samples to buffer as 24-bit little endian
        const channels = [];
        for (let i = 0; i < numChannels; i++) {
            channels.push(audioBuffer.getChannelData(i));
        }

        let index = 0;
        for (let i = 0; i < samples; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
                let sample = channels[ch][i];
                // Clamp the sample value between -1 and 1
                sample = Math.max(-1, Math.min(1, sample));
                // Scale sample to 24-bit range
                let intSample;
                if (sample < 0) {
                    intSample = Math.round(sample * 0x800000);
                } else {
                    intSample = Math.round(sample * 0x7FFFFF);
                }
                // Convert to unsigned 24-bit integer (two's complement)
                let intSample24 = intSample & 0xFFFFFF;
                view.setUint8(offset + index, intSample24 & 0xFF); // Least significant byte
                view.setUint8(offset + index + 1, (intSample24 >> 8) & 0xFF);
                view.setUint8(offset + index + 2, (intSample24 >> 16) & 0xFF);
                index += 3;
            }
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }
}
