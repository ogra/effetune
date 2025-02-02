export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.stream = null;
        this.sourceNode = null;
        this.workletNode = null;
        this.pipeline = [];
    }

    async initAudio() {
        try {
            // Create audio context if not exists
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Load audio worklet with absolute path
            const currentPath = window.location.pathname;
            const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
            await this.audioContext.audioWorklet.addModule(basePath + '/plugins/audio-processor.js');
            
            // Get user media
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            // Create source node
            this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
            
            // Create worklet node and make it globally accessible
            this.workletNode = new AudioWorkletNode(this.audioContext, 'plugin-processor');
            window.workletNode = this.workletNode;

            // Make pipeline globally accessible
            window.pipeline = this.pipeline;

            // Handle messages from worklet if needed in the future
            this.workletNode.port.onmessage = (event) => {
                // Generic message handling can be added here
            };
            
            // Rebuild pipeline
            await this.rebuildPipeline();
            
            // Resume context
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            return '';
        } catch (error) {
            throw new Error(`Audio Error: ${error.message}`);
        }
    }

    async rebuildPipeline() {
        if (!this.audioContext || !this.sourceNode) return;

        // Disconnect all nodes
        this.sourceNode.disconnect();
        if (this.workletNode) {
            this.workletNode.disconnect();
        }

        // If pipeline is empty, connect source directly to destination
        if (this.pipeline.length === 0) {
            this.sourceNode.connect(this.audioContext.destination);
            return;
        }

        // Connect source to worklet
        this.sourceNode.connect(this.workletNode);
        this.workletNode.connect(this.audioContext.destination);

        // Update worklet with current plugins
        this.workletNode.port.postMessage({
            type: 'updatePlugins',
            plugins: this.pipeline.map(plugin => ({
                id: plugin.id,
                type: plugin.constructor.name,
                enabled: plugin.enabled,
                parameters: plugin.getParameters()
            }))
        });
    }

    reset() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.sourceNode = null;
        this.workletNode = null;
        return this.initAudio();
    }

    setPipeline(pipeline) {
        this.pipeline = pipeline;
        return this.rebuildPipeline();
    }
}
