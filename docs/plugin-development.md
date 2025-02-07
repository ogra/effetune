# Plugin Development Guide

This guide explains how to create new plugins for Frieve EffeTune.

## Basic Structure

All plugins must extend the `PluginBase` class and implement its core methods. Each method has specific responsibilities and timing considerations:

### Function Responsibilities

1. **constructor**
   - When: Executed once when the plugin instance is created
   - Role:
     * Set basic information (name, description via super())
     * Initialize parameters with default values (e.g., this.gain = 1.0)
     * Initialize state variables (buffers, arrays, etc.)
     * Register processor function (registerProcessor)
   - Notes:
     * Do not create UI or set up event listeners here
     * Avoid heavy initialization operations

2. **registerProcessor**
   - When: Called from constructor to register processing function with Audio Worklet
   - Role:
     * Define audio processing function
     * Check context state initialization
     * Handle enabled state check and skip processing
   - Notes:
     * Always check enabled state first
     * Initialize context only when necessary
     * Reset state when channel count changes

3. **process**
   - When: Called periodically during audio buffer processing
   - Role:
     * Validate messages and buffers
     * Check enabled state (early return if disabled)
     * Execute audio processing (only if enabled=true)
     * Update state for UI updates
   - Notes:
     * Continue UI updates regardless of enabled state
     * Avoid heavy processing operations

4. **cleanup**
   - When: Called when plugin is disabled or removed
   - Role:
     * Cancel animation frames
     * Remove event listeners
     * Release temporary resources
   - Notes:
     * Do not stop UI updates
     * Maintain state variables
     * Perform minimal cleanup only

Here's the basic structure of a plugin:

```javascript
class MyPlugin extends PluginBase {
    constructor() {
        super('Plugin Name', 'Plugin Description');
        
        // Initialize plugin parameters
        this.myParameter = 0;

        // Register the audio processing function
        this.registerProcessor(`
            // Your audio processing code here
            // This runs in the Audio Worklet
            return data;
        `);
    }

    // Get current parameters (required)
    getParameters() {
        return {
            type: this.constructor.name,
            myParameter: this.myParameter,
            enabled: this.enabled
        };
    }

    // Create UI elements (required)
    createUI() {
        const container = document.createElement('div');
        // Add your UI elements here
        return container;
    }
}

// Register the plugin globally
window.MyPlugin = MyPlugin;
```

## Key Components

### 1. Constructor
- Call `super()` with the plugin name and description
- Initialize plugin parameters with default values
- Initialize state variables (e.g., buffers, arrays) with appropriate sizes
- Register the audio processing function using `this.registerProcessor()`
- Example:
  ```javascript
  constructor() {
      super('My Plugin', 'Description');
      
      // Initialize parameters with defaults
      this.gain = 1.0;
      
      // Initialize state variables
      this.buffer = new Float32Array(1024);
      this.lastProcessTime = performance.now() / 1000;
      
      // Register processor
      this.registerProcessor(`...`);
  }
  ```

### 2. Audio Processing Function

### 2. Audio Processing Function
- Runs in the Audio Worklet context
- Receives these parameters:
  - `data`: Float32Array containing interleaved audio samples from all channels
    * For stereo: [L0,L1,...,L127,R0,R1,...,R127]
    * Length is (blockSize × channelCount)
  - `parameters`: Object containing your plugin's parameters
    * `channelCount`: Number of audio channels (e.g., 2 for stereo)
    * `blockSize`: Number of samples per channel (typically 128)
    * `enabled`: Boolean indicating if the plugin is enabled
    * Your custom parameters as defined in getParameters()
  - `time`: Current audio context time
- Must return the processed audio data in the same interleaved format
- Use `getChannelData(channelIndex)` from context to access individual channel data if needed
- Always check enabled state first and return unmodified data if disabled
- Initialize context state if needed (e.g., filter states, buffers)
- Example:
  ```javascript
  registerProcessor(`
      // Skip processing if disabled
      if (!parameters.enabled) return data;

      // Initialize context state if needed
      if (!context.initialized) {
          context.buffer = new Array(parameters.channelCount)
              .fill()
              .map(() => new Float32Array(1024));
          context.initialized = true;
      }

      // Reset state if channel count changes
      if (context.buffer.length !== parameters.channelCount) {
          context.buffer = new Array(parameters.channelCount)
              .fill()
              .map(() => new Float32Array(1024));
      }

      // Process audio data...
      return data;
  `);
  ```

### 3. Parameter Management
- Parameter Naming Convention
  * Use shortened parameter names to optimize storage and transmission
  * Shorten using the following patterns:
    - For single words: Use the first letters (e.g., volume → vl, bass → bs)
    - For compound words: Use the first letter of each word (e.g., tpdfDither → td, zohFreq → zf)
  * Document the original parameter name in comments for clarity

- Implement `getParameters()` to return current plugin state
  * Must include `type` and `enabled` fields
  * Return all parameters that affect audio processing
  * Example: `{ type: this.constructor.name, enabled: this.enabled, gain: this.gain }`

- Implement `setParameters(params)` to handle parameter updates
  * Validate all input parameters before applying
  * Use type checking and range validation
  * Ignore invalid values, keeping current state
  * Call `this.updateParameters()` after successful changes

- Use `setEnabled(enabled)` for enable/disable control
  * This method is provided by PluginBase
  * Automatically handles state updates
  * Do not modify `this.enabled` directly
  * Example: `plugin.setEnabled(false)` instead of `plugin.enabled = false`

- Parameter Validation Best Practices
  * Always validate parameter types (e.g., `typeof value === 'number'`)
  * Check value ranges (e.g., `value >= 0 && value <= 1`)
  * Provide fallback values for invalid inputs
  * Document valid parameter ranges in comments
- Example:
  ```javascript
  getParameters() {
      return {
          type: this.constructor.name,
          enabled: this.enabled,
          gain: this.gain,
          // Include all parameters that affect audio processing
      };
  }

  setParameters(params) {
      if (params.enabled !== undefined) {
          this.enabled = params.enabled;
      }
      if (params.gain !== undefined) {
          this.setGain(params.gain); // Use dedicated setter for validation
      }
      this.updateParameters();
  }

  // Individual parameter setter with validation
  setGain(value) {
      this.gain = Math.max(0, Math.min(2, 
          typeof value === 'number' ? value : parseFloat(value)
      ));
      this.updateParameters();
  }
  ```

Example parameter management:
```javascript
class MyPlugin extends PluginBase {
    constructor() {
        super('My Plugin', 'Description');
        this.gain = 1.0;  // Default value
    }

    // Get current parameters
    getParameters() {
        return {
            type: this.constructor.name,  // Required
            enabled: this.enabled,        // Required
            gain: this.gain              // Plugin-specific
        };
    }

    // Set parameters with validation
    setParameters(params) {
        if (params.gain !== undefined) {
            // Type check
            const value = typeof params.gain === 'number' 
                ? params.gain 
                : parseFloat(params.gain);
            
            // Range validation
            if (!isNaN(value)) {
                this.gain = Math.max(0, Math.min(2, value));
            }
        }
        // Note: Don't handle enabled here, use setEnabled instead
        this.updateParameters();
    }

    // Individual parameter setter with validation
    setGain(value) {
        this.setParameters({ gain: value });
    }
}
```

### 4. User Interface
- Implement `createUI()` to return a DOM element containing your plugin's controls
- Use event listeners to update parameters when UI elements change
- Store UI element references if needed for updates
- Initialize animation frames for visualization plugins
- Clean up event listeners and animation frames in cleanup()
- Example:
  ```javascript
  createUI() {
      const container = document.createElement('div');
      container.className = 'my-plugin-ui';

      // Create parameter controls
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.addEventListener('input', e => {
          this.setGain(parseFloat(e.target.value));
      });

      // For visualization plugins
      const canvas = document.createElement('canvas');
      this.canvas = canvas; // Store reference if needed for updates
      
      // Start animation if needed
      this.startAnimation();

      container.appendChild(slider);
      container.appendChild(canvas);
      return container;
  }

  // Animation control for visualization plugins
  startAnimation() {
      const animate = () => {
          this.updateDisplay();
          this.animationFrameId = requestAnimationFrame(animate);
      };
      this.animationFrameId = requestAnimationFrame(animate);
  }

  cleanup() {
      // Cancel animation frame if exists
      if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
      }
  }
  ```

## Example Plugins

### 1. Basic Gain Plugin

A simple example showing parameter control:

```javascript
class GainPlugin extends PluginBase {
    constructor() {
        super('Gain', 'Simple gain adjustment');
        this.gain = 1.0;

        this.registerProcessor(`
            if (!parameters.enabled) return data;
            const gain = parameters.gain;
            
            // Process all channels
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                for (let i = 0; i < parameters.blockSize; i++) {
                    data[offset + i] *= gain;
                }
            }
            return data;
        `);
    }

    // Get current parameters
    getParameters() {
        return {
            type: this.constructor.name,
            gain: this.gain,
            enabled: this.enabled
        };
    }

    // Set parameters
    setParameters(params) {
        if (params.gain !== undefined) {
            this.gain = Math.max(0, Math.min(2, params.gain));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    // Individual parameter setter
    setGain(value) {
        this.setParameters({ gain: value });
    }

    createUI() {
        const container = document.createElement('div');
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0;
        slider.max = 2;
        slider.step = 0.01;
        slider.value = this.gain;
        slider.addEventListener('input', (e) => {
            this.setGain(parseFloat(e.target.value));
        });

        const label = document.createElement('label');
        label.textContent = 'Gain:';

        container.appendChild(label);
        container.appendChild(slider);
        
        return container;
    }
}
```

### 2. Level Meter Plugin

An advanced example showing visualization and message passing:

```javascript
class LevelMeterPlugin extends PluginBase {
    constructor() {
        super('Level Meter', 'Displays audio level with peak hold');
        
        // Initialize state with fixed size for stereo
        this.levels = new Array(2).fill(-96);
        this.peakLevels = new Array(2).fill(-96);
        this.peakHoldTimes = new Array(2).fill(0);
        this.lastProcessTime = performance.now() / 1000;
        
        // Register processor function
        this.registerProcessor(`
            // Create result buffer with measurements
            const result = new Float32Array(data.length);
            result.set(data);
            
            // Calculate peaks for all channels
            const peaks = new Float32Array(parameters.channelCount);
            
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                let peak = 0;
                for (let i = 0; i < parameters.blockSize; i++) {
                    peak = Math.max(peak, Math.abs(data[offset + i]));
                }
                peaks[ch] = peak;
            }

            // Create measurements object
            result.measurements = {
                channels: Array.from(peaks).map(peak => ({ peak })),
                time: time
            };

            return result;
        `);
    }

    // Handle messages from audio processor
    onMessage(message) {
        if (message.type === 'processBuffer' && message.buffer) {
            this.process(message.buffer, message);
        }
    }

    // Convert linear amplitude to dB
    amplitudeToDB(amplitude) {
        return 20 * Math.log10(Math.max(amplitude, 1e-6));
    }

    process(audioBuffer, message) {
        if (!audioBuffer || !message?.measurements?.channels) {
            return audioBuffer;
        }

        const time = performance.now() / 1000;
        const deltaTime = time - this.lastProcessTime;
        this.lastProcessTime = time;

        // Process each channel
        for (let ch = 0; ch < message.measurements.channels.length; ch++) {
            const channelPeak = message.measurements.channels[ch].peak;
            const dbLevel = this.amplitudeToDB(channelPeak);
            
            // Update level with fall rate
            this.levels[ch] = Math.max(
                Math.max(-96, this.levels[ch] - this.FALL_RATE * deltaTime),
                dbLevel
            );

            // Update peak hold
            if (time > this.peakHoldTimes[ch] + this.PEAK_HOLD_TIME) {
                this.peakLevels[ch] = -96;
            }
            if (dbLevel > this.peakLevels[ch]) {
                this.peakLevels[ch] = dbLevel;
                this.peakHoldTimes[ch] = time;
            }
        }

        // Update overload state
        const maxPeak = Math.max(...message.measurements.channels.map(ch => ch.peak));
        if (maxPeak > 1.0) {
            this.overload = true;
            this.overloadTime = time;
        } else if (time > this.overloadTime + this.OVERLOAD_DISPLAY_TIME) {
            this.overload = false;
        }

        this.updateParameters();
        return audioBuffer;
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'level-meter-plugin-ui';

        // Create canvas for meter display
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 100;
        container.appendChild(canvas);
        
        // Animation function
        const draw = () => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw each channel
            for (let ch = 0; ch < this.levels.length; ch++) {
                const y = ch * (canvas.height / 2);
                const height = (canvas.height / 2) - 2;
                
                // Draw level meter
                const levelWidth = canvas.width * 
                    (this.levels[ch] + 96) / 96; // -96dB to 0dB range
                ctx.fillStyle = this.levels[ch] > -6 ? 'red' : 'green';
                ctx.fillRect(0, y, levelWidth, height);
                
                // Draw peak hold
                const peakX = canvas.width * 
                    (this.peakLevels[ch] + 96) / 96;
                ctx.fillStyle = 'white';
                ctx.fillRect(peakX - 1, y, 2, height);
            }
            
            requestAnimationFrame(draw);
        };
        
        // Start animation
        draw();
        
        return container;
    }
}
```

## Advanced Features

### Message Passing with Audio Worklet

Plugins can communicate between the main thread and Audio Worklet using message passing:

1. From Audio Worklet to main thread:
```javascript
port.postMessage({
    type: 'myMessageType',
    pluginId: parameters.id,
    data: myData
});
```

2. Receive messages in the main thread:
```javascript
constructor() {
    super('My Plugin', 'Description');
    
    // Listen for messages from Audio Worklet
    if (window.workletNode) {
        window.workletNode.port.addEventListener('message', (e) => {
            if (e.data.pluginId === this.id) {
                // Handle message
            }
        });
    }
}
```

## Instance-Specific State Management

Plugins can maintain instance-specific state in the audio processor using the `context` object. This is particularly useful for effects that need to track state between processing blocks, such as filters, modulation effects, or any effect requiring sample history.

### Using the Context Object

The `context` object is unique to each plugin instance and persists across processing calls. Here's how to use it:

1. **Initialize State Variables**
```javascript
// Check if state exists first
context.myState = context.myState || initialValue;

// Or use an initialization flag
if (!context.initialized) {
    context.myState = initialValue;
    context.initialized = true;
}
```

2. **Handle Channel Count Changes**
```javascript
// Reset state if channel configuration changes
if (context.buffers?.length !== parameters.channelCount) {
    context.buffers = new Array(parameters.channelCount)
        .fill()
        .map(() => new Float32Array(bufferSize));
}
```

### Examples

1. **Filter State (from Narrow Range plugin)**
```javascript
// Initialize filter states for all channels
if (!context.initialized) {
    context.filterStates = {
        // HPF states (first stage)
        hpf1: new Array(channelCount).fill(0),
        hpf2: new Array(channelCount).fill(0),
        // ... more filter states
    };
    context.initialized = true;
}

// Reset if channel count changes
if (context.filterStates.hpf1.length !== channelCount) {
    Object.keys(context.filterStates).forEach(key => {
        context.filterStates[key] = new Array(channelCount).fill(0);
    });
}
```

2. **Modulation State (from Wow Flutter plugin)**
```javascript
// Initialize modulation state
context.phase = context.phase || 0;
context.lpfState = context.lpfState || 0;
context.sampleBufferPos = context.sampleBufferPos || 0;

// Initialize delay buffer if needed
if (!context.initialized) {
    context.sampleBuffer = new Array(parameters.channelCount)
        .fill()
        .map(() => new Float32Array(MAX_BUFFER_SIZE).fill(0));
    context.initialized = true;
}
```

3. **Envelope State (from Compressor plugin)**
```javascript
// Initialize envelope states for dynamics processing
if (!context.initialized) {
    context.envelopeStates = new Array(channelCount).fill(0);
    context.initialized = true;
}

// Reset envelope states if channel count changes
if (context.envelopeStates.length !== channelCount) {
    context.envelopeStates = new Array(channelCount).fill(0);
}

// Example usage in dynamics processing
for (let ch = 0; ch < channelCount; ch++) {
    let envelope = context.envelopeStates[ch];
    
    // Process samples with envelope follower
    for (let i = 0; i < blockSize; i++) {
        const inputAbs = Math.abs(data[offset + i]);
        if (inputAbs > envelope) {
            envelope = attackSamples * (envelope - inputAbs) + inputAbs;
        } else {
            envelope = releaseSamples * (envelope - inputAbs) + inputAbs;
        }
        // Apply envelope-based processing...
    }
    
    // Store envelope state for next buffer
    context.envelopeStates[ch] = envelope;
}
```

### Best Practices for State Management

1. **Initialization**
   - Always check if state exists before using it
   - Use an initialization flag for complex setup
   - Initialize arrays and buffers to appropriate sizes

2. **Channel Count Changes**
   - Monitor and handle changes in channel configuration
   - Reset or resize state arrays when needed
   - Maintain state per channel when appropriate

3. **Memory Management**
   - Pre-allocate buffers to avoid garbage collection
   - Use typed arrays (Float32Array) for better performance
   - Clear or reset large buffers when plugin is disabled

4. **State Access**
   - Access state variables through the context object
   - Update state consistently across processing blocks
   - Consider thread safety in state modifications

## Testing and Debugging

### Using the Test Tool

The project includes a test tool for validating plugin implementations. To use it:

1. Start the development server:
```bash
python server.py
```

2. Open the test page in your browser:
```
http://localhost:8000/dev/effetune_test.html
```

The test tool performs the following checks for each plugin:
- Constructor implementation (plugin ID)
- Parameter management (required fields)
- UI creation
- Enabled state handling
- Parameter update notifications

Results are color-coded:
- 🟢 Green: Test passed successfully
- 🟡 Yellow: Warning (potential issue)
- 🔴 Red: Test failed

Use this tool during development to ensure your plugin follows the required implementation guidelines.

### Manual Testing

1. **Parameter Testing**
   - Test parameter validation thoroughly
   - Verify type checking and range validation
   - Test with invalid inputs to ensure proper handling
   - Use the provided `setEnabled` method for enable/disable
   - Example test cases:
     ```javascript
     // Test invalid type
     plugin.setParameters({ gain: 'invalid' });
     assert(plugin.gain === originalGain);  // Should keep original value

     // Test out of range
     plugin.setParameters({ gain: 999 });
     assert(plugin.gain <= 2);  // Should clamp to valid range

     // Test enable/disable
     plugin.setEnabled(false);
     assert(plugin.getParameters().enabled === false);
     ```

2. **Audio Processing Testing**
   - Note: Audio Worklet code runs in a separate context
   - Cannot directly test processor function
   - Focus on parameter validation and state management
   - Test enabled state handling:
     ```javascript
     process(audioBuffer, message) {
         if (!audioBuffer || !message?.measurements?.channels) {
             return audioBuffer;
         }

         // Skip processing if disabled
         if (!this.enabled) {
             return audioBuffer;
         }

         // Continue with audio processing...
     }
     ```

3. **UI Testing**
   - Verify UI updates reflect parameter changes
   - Test UI responsiveness in both enabled/disabled states
   - For visualization plugins:
     * Continue UI updates even when disabled
     * Only skip audio processing when disabled
     * Do not stop animations in cleanup()

2. **Parameter Validation**
   - Always validate and sanitize parameter values
   - Use appropriate min/max bounds for numerical values
   - Check channelCount and blockSize parameters

3. **Performance**
   - Keep audio processing code efficient
   - Minimize object creation in the processing function
   - Pre-calculate constants outside loops
   - Use simple mathematical operations where possible

3. **UI Design**
   - Keep controls intuitive and responsive
   - Provide appropriate value ranges and steps
   - Include units in labels where applicable
   - When using radio buttons, include plugin ID in the name attribute (e.g., `name="radio-group-${this.id}"`) to ensure each plugin instance has its own independent radio button group. This is critical when multiple instances of plugins with radio buttons are used simultaneously, as radio buttons with the same name attribute will interfere with each other. Example:
     ```javascript
     const radio = document.createElement('input');
     radio.type = 'radio';
     radio.name = `channel-${this.id}`; // Include plugin ID to make it unique
     radio.value = 'Left';
     ```
   - Follow the standard CSS styles for common UI elements to maintain consistency across plugins
   - Keep plugin-specific CSS minimal and focused on unique styling needs
   - Use the base CSS classes for standard elements (e.g., `.parameter-row`, `.radio-group`) to ensure consistent layout and appearance
   - Only add custom CSS for plugin-specific UI elements that require unique styling

4. **Error Handling**
   - Validate all inputs in both UI and processing code
   - Provide fallback values for invalid parameters
   - Handle edge cases gracefully (e.g., mono vs stereo)

## Available Utilities

The audio processing function has access to these utility functions:

- `getFadeValue(id, value, time)`: Smooth parameter changes to prevent audio clicks. Uses plugin ID to maintain independent fade states for each plugin instance
- `getChannelData(channelIndex)`: Get individual channel data if needed

## Plugin Categories

Plugins are organized into categories defined in `plugins/plugins.txt`:

- `Analyzer`: Analysis tools (level meters, spectrum analyzers, etc.)
- `Basics`: Basic audio effects (volume, balance, DC offset, etc.)
- `Dynamics`: Dynamic range processors (compressors, gates, etc.)
- `EQ`: Equalization effects (filters, frequency shaping)
- `Filter`: Time-based filter effects (modulation, wow flutter)
- `Lo-Fi`: Lo-Fi audio effects (bit crushing, jitter)
- `Others`: Miscellaneous effects (oscillators, etc.)
- `Reverb`: Reverberation effects (room simulation, etc.)
- `Saturation`: Saturation and distortion effects
- `Spatial`: Spatial audio effects (stereo field processing)

To add a new category:
1. Add it to the `[categories]` section in `plugins.txt`
2. Provide a clear description of what types of plugins belong in this category
3. Create an appropriate subdirectory in the `plugins` directory
