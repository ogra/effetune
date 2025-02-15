# Other Audio Tools

A collection of specialized audio tools and generators that complement the main effect categories. These plugins provide unique capabilities for sound generation and audio experimentation.

## Plugin List

- [Oscillator](#oscillator) - Multi-waveform audio signal generator with precise frequency control

## Oscillator

A versatile audio signal generator that produces various waveforms with precise frequency control. Perfect for testing audio systems, creating reference tones, or experimenting with sound synthesis.

### Features
- Multiple waveform types:
  - Pure sine wave for reference tones
  - Square wave for rich harmonic content
  - Triangle wave for softer harmonics
  - Sawtooth wave for bright timbres
  - White noise for system testing
  - Pink noise for acoustic measurements

### Parameters
- **Frequency (Hz)** - Controls the pitch of the generated tone (20 Hz to 96 kHz)
  - Low frequencies: Deep bass tones
  - Mid frequencies: Musical range
  - High frequencies: System testing
- **Volume (dB)** - Adjusts output level (-96 dB to 0 dB)
  - Use lower values for reference tones
  - Higher values for system testing
- **Panning (L/R)** - Controls stereo placement
  - Center: Equal in both channels
  - Left/Right: Channel balance testing
- **Waveform Type** - Selects the type of signal
  - Sine: Clean reference tone
  - Square: Rich in odd harmonics
  - Triangle: Softer harmonic content
  - Sawtooth: Full harmonic series
  - White Noise: Equal energy per Hz
  - Pink Noise: Equal energy per octave

### Example Uses

1. Speaker Testing
   - Check frequency reproduction range
     * Use sine wave sweep from low to high frequencies
     * Note where sound becomes inaudible or distorted
   - Test distortion characteristics
     * Use pure sine waves at different frequencies
     * Listen for unwanted harmonics or distortion
     * Compare behavior at different volume levels

2. Room Acoustics Analysis
   - Identify standing waves
     * Use sine waves at suspected room mode frequencies
     * Move around the room to find nodes and antinodes
   - Check resonance and reverberation
     * Test different frequencies to find problematic resonances
     * Use pink noise to evaluate overall room response
   - Map frequency response at different positions
     * Use sine sweeps to check consistency across listening area

3. Headphone/Earphone Testing
   - Evaluate crosstalk between channels
     * Send signal to one channel only
     * Check for unwanted bleed into the other channel
   - Test frequency response
     * Use sine sweeps to check frequency balance
     * Compare left and right channel responses

4. Hearing Tests
   - Check personal hearing range
     * Sweep frequencies to find upper and lower limits
     * Note any frequency gaps or weaknesses
   - Determine minimum audible volume
     * Test different frequencies at varying volumes
     * Map personal equal-loudness contours

5. System Calibration
   - Level matching between components
     * Use sine waves at reference frequencies
     * Ensure consistent levels across the signal chain
   - Channel balance verification
     * Test left/right balance at different frequencies
     * Ensure proper stereo imaging

Remember: The Oscillator is a precision tool - start with lower volumes and increase gradually to avoid potential equipment damage or hearing fatigue.
