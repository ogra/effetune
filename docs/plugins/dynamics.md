# Dynamics Plugins

A collection of plugins that help balance the loud and quiet parts of your music, making your listening experience more enjoyable and comfortable.

## Plugin List

- [Brickwall Limiter](#brickwall-limiter) - Transparent peak control for safe and comfortable listening
- [Compressor](#compressor) - Automatically balances volume levels for more comfortable listening
- [Gate](#gate) - Reduces unwanted background noise by attenuating signals below a threshold
- [Multiband Compressor](#multiband-compressor) - Professional 5-band dynamics processor with FM radio-style sound shaping

## Brickwall Limiter

A high-quality peak limiter that ensures your music never exceeds a specified level, preventing digital clipping while maintaining natural sound quality. Perfect for protecting your audio system and ensuring comfortable listening levels without compromising the music's dynamics.

### Listening Enhancement Guide
- Classical Music:
  - Safely enjoy full orchestral crescendos
  - Maintain the natural dynamics of piano pieces
  - Protect against unexpected peaks in live recordings
- Pop/Rock Music:
  - Keep consistent volume during intense passages
  - Enjoy dynamic music at any listening level
  - Prevent distortion in bass-heavy sections
- Electronic Music:
  - Control synthesizer peaks transparently
  - Maintain impact while preventing overload
  - Keep bass drops powerful but controlled

### Parameters

- **Input Gain** (-18dB to +18dB)
  - Adjusts the level going into the limiter
  - Increase to drive the limiter harder
  - Decrease if you hear too much limiting
  - Default is 0dB

- **Threshold** (-24dB to 0dB)
  - Sets the maximum peak level
  - Lower values provide more safety margin
  - Higher values preserve more dynamics
  - Start at -3dB for gentle protection

- **Release Time** (10ms to 500ms)
  - How quickly limiting is released
  - Faster times maintain more dynamics
  - Slower times for smoother sound
  - Try 100ms as a starting point

- **Lookahead** (0ms to 10ms)
  - Allows the limiter to anticipate peaks
  - Higher values for more transparent limiting
  - Lower values for less latency
  - 3ms is a good balance

- **Margin** (-1.000dB to 0.000dB)
  - Fine-tune the effective threshold
  - Provides additional safety headroom
  - Default -1.000dB works well for most material
  - Adjust for precise peak control

- **Oversampling** (1x, 2x, 4x, 8x)
  - Higher values for cleaner limiting
  - Lower values for less CPU usage
  - 4x is a good balance of quality and performance

### Visual Display
- Real-time gain reduction metering
- Clear threshold level indication
- Interactive parameter adjustment
- Peak level monitoring

### Recommended Settings

#### Transparent Protection
- Input Gain: 0dB
- Threshold: -3dB
- Release: 100ms
- Lookahead: 3ms
- Margin: -1.000dB
- Oversampling: 4x

#### Maximum Safety
- Input Gain: -6dB
- Threshold: -6dB
- Release: 50ms
- Lookahead: 5ms
- Margin: -1.000dB
- Oversampling: 8x

#### Natural Dynamics
- Input Gain: 0dB
- Threshold: -1.5dB
- Release: 200ms
- Lookahead: 2ms
- Margin: -0.500dB
- Oversampling: 4x

## Compressor

An effect that automatically manages volume differences in your music by gently reducing loud sounds and enhancing quiet ones. This creates a more balanced and enjoyable listening experience by smoothing out sudden volume changes that might be jarring or uncomfortable.

### Listening Enhancement Guide
- Classical Music:
  - Makes dramatic orchestral crescendos more comfortable to listen to
  - Balances the difference between soft and loud piano passages
  - Helps hear quiet details even in powerful sections
- Pop/Rock Music:
  - Creates a more comfortable listening experience during intense sections
  - Makes vocals clearer and easier to understand
  - Reduces listening fatigue during long sessions
- Jazz Music:
  - Balances the volume between different instruments
  - Makes solo sections blend more naturally with the ensemble
  - Maintains clarity during both quiet and loud passages

### Parameters

- **Threshold** - Sets the volume level where the effect begins working (-60dB to 0dB)
  - Higher settings: Only affects the loudest parts of the music
  - Lower settings: Creates more overall balance
  - Start at -24dB for gentle balancing
- **Ratio** - Controls how strongly the effect balances the volume (1:1 to 20:1)
  - 1:1: No effect (original sound)
  - 2:1: Gentle balancing
  - 4:1: Moderate balancing
  - 8:1+: Strong volume control
- **Attack Time** - How quickly the effect responds to loud sounds (0.1ms to 100ms)
  - Faster times: More immediate volume control
  - Slower times: More natural sound
  - Try 20ms as a starting point
- **Release Time** - How quickly the volume returns to normal (10ms to 1000ms)
  - Faster times: More dynamic sound
  - Slower times: Smoother, more natural transitions
  - Start with 200ms for general listening
- **Knee** - How smoothly the effect transitions (0dB to 12dB)
  - Lower values: More precise control
  - Higher values: Gentler, more natural sound
  - 6dB is a good starting point
- **Gain** - Adjusts the overall volume after processing (-12dB to +12dB)
  - Use this to match the volume with the original sound
  - Increase if the music feels too quiet
  - Decrease if it's too loud

### Visual Display

- Interactive graph showing how the effect is working
- Easy-to-read volume level indicators
- Visual feedback for all parameter adjustments
- Reference lines to help guide your settings

### Recommended Settings for Different Listening Scenarios
- Casual Background Listening:
  - Threshold: -24dB
  - Ratio: 2:1
  - Attack: 20ms
  - Release: 200ms
  - Knee: 6dB
- Critical Listening Sessions:
  - Threshold: -18dB
  - Ratio: 1.5:1
  - Attack: 30ms
  - Release: 300ms
  - Knee: 3dB
- Late Night Listening:
  - Threshold: -30dB
  - Ratio: 4:1
  - Attack: 10ms
  - Release: 150ms
  - Knee: 9dB

## Gate

A noise gate that helps reduce unwanted background noise by automatically attenuating signals that fall below a specified threshold. This plugin is particularly useful for cleaning up audio sources with constant background noise, such as fan noise, hum, or ambient room noise.

### Key Features
- Precise threshold control for accurate noise detection
- Adjustable ratio for natural or aggressive noise reduction
- Variable attack and release times for optimal timing control
- Soft knee option for smooth transitions
- Real-time gain reduction metering
- Interactive transfer function display

### Parameters

- **Threshold** (-96dB to 0dB)
  - Sets the level where noise reduction begins
  - Signals below this level will be attenuated
  - Higher values: More aggressive noise reduction
  - Lower values: More subtle effect
  - Start at -40dB and adjust based on your noise floor

- **Ratio** (1:1 to 100:1)
  - Controls how strongly signals below threshold are attenuated
  - 1:1: No effect
  - 10:1: Strong noise reduction
  - 100:1: Near-complete silence below threshold
  - Start at 10:1 for typical noise reduction

- **Attack Time** (0.01ms to 50ms)
  - How quickly the gate responds when signal rises above threshold
  - Faster times: More precise but may sound abrupt
  - Slower times: More natural transitions
  - Try 1ms as a starting point

- **Release Time** (10ms to 2000ms)
  - How quickly the gate closes when signal falls below threshold
  - Faster times: Tighter noise control
  - Slower times: More natural decay
  - Start with 200ms for natural sound

- **Knee** (0dB to 6dB)
  - Controls how gradually the gate transitions around threshold
  - 0dB: Hard knee for precise gating
  - 6dB: Soft knee for smoother transitions
  - Use 1dB for general purpose noise reduction

- **Gain** (-12dB to +12dB)
  - Adjusts the output level after gating
  - Use to compensate for any perceived volume loss
  - Typically left at 0dB unless needed

### Visual Feedback
- Interactive transfer function graph showing:
  - Input/output relationship
  - Threshold point
  - Knee curve
  - Ratio slope
- Real-time gain reduction meter displaying:
  - Current amount of noise reduction
  - Visual feedback of gate activity

### Recommended Settings

#### Light Noise Reduction
- Threshold: -50dB
- Ratio: 2:1
- Attack: 5ms
- Release: 300ms
- Knee: 3dB
- Gain: 0dB

#### Moderate Background Noise
- Threshold: -40dB
- Ratio: 10:1
- Attack: 1ms
- Release: 200ms
- Knee: 1dB
- Gain: 0dB

#### Heavy Noise Removal
- Threshold: -30dB
- Ratio: 50:1
- Attack: 0.1ms
- Release: 100ms
- Knee: 0dB
- Gain: 0dB

### Application Tips
- Set threshold just above the noise floor for optimal results
- Use longer release times for more natural sound
- Add some knee when processing complex material
- Monitor the gain reduction meter to ensure proper gating
- Combine with other dynamics processors for comprehensive control

## Multiband Compressor

A professional-grade dynamics processor that splits your audio into five frequency bands and processes each independently. This plugin is particularly effective at creating that polished "FM radio" sound, where each part of the frequency spectrum is perfectly controlled and balanced.

### Key Features
- 5-band processing with adjustable crossover frequencies
- Independent compression controls for each band
- Optimized default settings for FM radio-style sound
- Real-time visualization of gain reduction per band
- High-quality Linkwitz-Riley crossover filters

### Frequency Bands
- Band 1 (Low): Below 100 Hz
  - Controls the deep bass and sub frequencies
  - Higher ratio and longer release for tight, controlled bass
- Band 2 (Low-Mid): 100-500 Hz
  - Handles the upper bass and lower midrange
  - Moderate compression to maintain warmth
- Band 3 (Mid): 500-2000 Hz
  - Critical vocal and instrument presence range
  - Gentle compression to preserve naturalness
- Band 4 (High-Mid): 2000-8000 Hz
  - Controls presence and air
  - Light compression with faster response
- Band 5 (High): Above 8000 Hz
  - Manages brightness and sparkle
  - Quick response times with higher ratio

### Parameters (Per Band)
- **Threshold** (-60dB to 0dB)
  - Sets the level where compression begins
  - Lower settings create more consistent levels
- **Ratio** (1:1 to 20:1)
  - Controls the amount of gain reduction
  - Higher ratios for more aggressive control
- **Attack** (0.1ms to 100ms)
  - How quickly compression responds
  - Faster times for transient control
- **Release** (10ms to 1000ms)
  - How quickly gain returns to normal
  - Longer times for smoother sound
- **Knee** (0dB to 12dB)
  - Smoothness of compression onset
  - Higher values for more natural transition
- **Gain** (-12dB to +12dB)
  - Output level adjustment per band
  - Fine-tune the frequency balance

### FM Radio Style Processing
The Multiband Compressor comes with optimized default settings that recreate the polished, professional sound of FM radio broadcasting:

- Low Band (< 100 Hz)
  - Higher ratio (4:1) for tight bass control
  - Slower attack/release to maintain punch
  - Slight reduction to prevent muddiness

- Low-Mid Band (100-500 Hz)
  - Moderate compression (3:1)
  - Balanced timing for natural response
  - Neutral gain to maintain warmth

- Mid Band (500-2000 Hz)
  - Gentle compression (2.5:1)
  - Quick response times
  - Slight boost for vocal presence

- High-Mid Band (2000-8000 Hz)
  - Light compression (2:1)
  - Fast attack/release
  - Enhanced presence boost

- High Band (> 8000 Hz)
  - Higher ratio (5:1) for consistent brilliance
  - Very quick response times
  - Controlled reduction for polish

This configuration creates the characteristic "radio-ready" sound:
- Consistent, impactful bass
- Clear, forward vocals
- Controlled dynamics across all frequencies
- Professional polish and sheen
- Enhanced presence and clarity
- Reduced listening fatigue

### Visual Feedback
- Interactive transfer function graphs for each band
- Real-time gain reduction meters
- Frequency band activity visualization
- Clear crossover point indicators

### Tips for Use
- Start with the default FM radio preset
- Adjust crossover frequencies to match your material
- Fine-tune each band's threshold for desired amount of control
- Use the gain controls to shape the final frequency balance
- Monitor the gain reduction meters to ensure appropriate processing
