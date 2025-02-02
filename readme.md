# Frieve EffeTune

[Open App](https://frieve-a.github.io/effetune/effetune.html)

A web-based real-time audio effect processor designed for audio enthusiasts to enhance their music listening experience. EffeTune allows you to process any audio source through various high-quality effects, enabling you to customize and perfect your listening experience in real-time.

## Concept

EffeTune is created for audio enthusiasts who want to take their music listening experience to the next level. Whether you're streaming music or playing from physical media, EffeTune lets you add professional-grade effects to customize the sound to your exact preferences. Transform your computer into a powerful audio effects processor that sits between your audio source and your speakers or amplifier.

No audiophile myths, Just pure science.

## Use Cases

### Streaming Service Integration

Process audio from your favorite streaming services:

1. Prerequisites:
   - Install a virtual audio device (e.g., VB Cable, Voice Meeter, or ASIO Link Tool)
   - Configure your streaming service to output audio to the virtual audio device

2. Setup:
   - Launch EffeTune
   - Select the virtual audio device as your input source
   - Start playing music from your streaming service
   - Verify that audio is flowing through EffeTune
   - Add effects to the Pipeline to enhance your listening experience

### Physical Audio Source Integration

Use EffeTune as a multi-effects processor between your CD player/network player and amplifier:

1. Setup:
   - Connect your audio interface to your computer
   - Launch EffeTune
   - Select your audio interface as the input source
   - Configure your browser's audio output to your audio interface
   - Your audio interface now functions as a multi-effects processor:
     * Input: Your CD player, network player, or other audio source
     * Processing: Real-time effects through EffeTune
     * Output: Processed audio to your amplifier or speakers

## Features

- Real-time audio processing
- Drag-and-drop interface for building effect chains
- Expandable plugin system with categorized effects
- Live audio visualization
- Audio pipeline that can be modified in real-time

## Available Effects

| Category | Effect | Description | Documentation |
|----------|--------|-------------|---------------|
| Analyzer | Level Meter | Displays audio level with peak hold | [Details](plugins/analyzer/readme.md#level-meter) |
| Analyzer | Spectrogram | Displays frequency spectrum changes over time | [Details](plugins/analyzer/readme.md#spectrogram) |
| Analyzer | Spectrum Analyzer | Real-time spectrum analysis | [Details](plugins/analyzer/readme.md#spectrum-analyzer) |
| Basics | DC Offset | DC offset adjustment | [Details](plugins/basics/readme.md#dc-offset) |
| Basics | Polarity Inversion | Signal polarity inversion | [Details](plugins/basics/readme.md#polarity-inversion) |
| Basics | Stereo Balance | Stereo channel balance control | [Details](plugins/basics/readme.md#stereo-balance) |
| Basics | Volume | Basic volume control | [Details](plugins/basics/readme.md#volume) |
| Dynamics | Compressor | Dynamic range compression with threshold, ratio, and knee control | [Details](plugins/dynamics/readme.md#compressor) |
| Dynamics | Gate | Noise gate with threshold, ratio, and knee control for noise reduction | [Details](plugins/dynamics/readme.md#gate) |
| Dynamics | Multiband Compressor | Professional 5-band dynamics processor with FM radio-style sound shaping | [Details](plugins/dynamics/readme.md#multiband-compressor) |
| EQ | 15Band GEQ | 15-band graphic equalizer | [Details](plugins/eq/readme.md#15band-geq) |
| EQ | 5Band PEQ | Professional parametric equalizer with 5 fully configurable bands | [Details](plugins/eq/readme.md#5band-peq) |
| EQ | Narrow Range | High-pass and low-pass filter combination | [Details](plugins/eq/readme.md#narrow-range) |
| EQ | Tone Control | Three-band tone control | [Details](plugins/eq/readme.md#tone-control) |
| Filter | Wow Flutter | Time-based modulation effect | [Details](plugins/filter/readme.md#wow-flutter) |
| Lo-Fi | Bit Crusher | Bit depth reduction and zero-order hold effect | [Details](plugins/lofi/readme.md#bit-crusher) |
| Lo-Fi | Noise Blender | Noise generation and mixing | [Details](plugins/lofi/readme.md#noise-blender) |
| Lo-Fi | Simple Jitter | Digital jitter simulation | [Details](plugins/lofi/readme.md#simple-jitter) |
| Reverb | RS Reverb | Random scattering reverb with natural diffusion | [Details](plugins/reverb/readme.md#rs-reverb) |
| Saturation | Hard Clipping | Digital hard clipping effect | [Details](plugins/saturation/readme.md#hard-clipping) |
| Saturation | Saturation | Saturation effect | [Details](plugins/saturation/readme.md#saturation) |
| Spatial | Stereo Blend | Stereo width control effect | [Details](plugins/spatial/readme.md#stereo-blend) |
| Others | Oscillator | Multi-waveform audio signal generator | [Details](plugins/others/readme.md#oscillator) |

## Usage

### Building Your Effect Chain

1. Available plugins are listed on the left side of the screen
2. Drag plugins from the list to the Effect Pipeline area
3. Plugins are processed in order from top to bottom
4. Use the handle (⋮) to reorder plugins by dragging
5. Click a plugin's name to expand/collapse its settings
6. Use the ON/OFF button to bypass individual effects
7. Remove plugins using the trash can icon

### Sharing Effect Chains

You can share your effect chain configuration with other users:
1. After setting up your desired effect chain, click the "Share" button in the top-right corner of the Effect Pipeline area
2. The URL will be automatically copied to your clipboard
3. Share the copied URL with others - they can recreate your exact effect chain by opening it
4. All effect settings are stored in the URL, making them easy to save and share

### Audio Reset

If you experience audio issues (dropouts, glitches):
1. Click the "Reset Audio" button in the top-left corner
2. The audio pipeline will be rebuilt automatically
3. Your effect chain configuration will be preserved

## Plugin Development

Want to create your own audio plugins? Check out our [Plugin Development Guide](docs/plugin-development.md).

## Browser Compatibility

Frieve EffeTune has been tested and verified to work on Google Chrome. The application requires a modern browser with support for:
- Web Audio API
- Audio Worklet
- getUserMedia API
- Drag and Drop API

## Recommended Sample Rate

For optimal performance with nonlinear effects, it is recommended to use EffeTune at a sample rate of 96kHz or higher. This higher sample rate helps achieve ideal characteristics when processing audio through nonlinear effects such as saturation and compression.

## Links

[Source Code](https://github.com/Frieve-A/effetune)

[YouTube](https://www.youtube.com/@frieveamusic)
