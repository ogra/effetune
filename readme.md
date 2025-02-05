# Frieve EffeTune

[Open App](https://frieve-a.github.io/effetune/effetune.html)

A web-based real-time audio effect processor designed for audio enthusiasts to enhance their music listening experience. EffeTune allows you to process any audio source through various high-quality effects, enabling you to customize and perfect your listening experience in real-time.

## Concept

EffeTune is created for audio enthusiasts who want to take their music listening experience to the next level. Whether you're streaming music or playing from physical media, EffeTune lets you add professional-grade effects to customize the sound to your exact preferences. Transform your computer into a powerful audio effects processor that sits between your audio source and your speakers or amplifier.

No audiophile myths, Just pure science.

## Features

- Real-time audio processing
- Drag-and-drop interface for building effect chains
- Expandable plugin system with categorized effects
- Live audio visualization
- Audio pipeline that can be modified in real-time

## Setup Guide

Before using EffeTune, you'll need to set up your audio routing. Here's how to configure different audio sources:

### Streaming Service Setup

To process audio from streaming services (Spotify, YouTube Music, etc.):

1. Prerequisites:
   - Install a virtual audio device (e.g., VB Cable, Voice Meeter, or ASIO Link Tool)
   - Configure your streaming service to output audio to the virtual audio device

2. Configuration:
   - Launch EffeTune
   - Select the virtual audio device as your input source
   - Start playing music from your streaming service
   - Verify that audio is flowing through EffeTune
   - Add effects to the Pipeline to enhance your listening experience

### Physical Audio Source Setup

To use EffeTune with CD players, network players, or other physical sources:

1. Configuration:
   - Connect your audio interface to your computer
   - Launch EffeTune
   - Select your audio interface as the input source
   - Configure your browser's audio output to your audio interface
   - Your audio interface now functions as a multi-effects processor:
     * Input: Your CD player, network player, or other audio source
     * Processing: Real-time effects through EffeTune
     * Output: Processed audio to your amplifier or speakers

## Usage

### Building Your Effect Chain

1. Available plugins are listed on the left side of the screen
2. Drag plugins from the list to the Effect Pipeline area
3. Plugins are processed in order from top to bottom
4. Use the handle (⋮) to reorder plugins by dragging
5. Click a plugin's name to expand/collapse its settings
6. Use the ON/OFF button to bypass individual effects
7. Remove plugins using the trash can icon

### Plugin Selection and Keyboard Shortcuts

1. Plugin Selection Methods:
   - Click on plugin headers to select individual plugins
   - Hold Ctrl while clicking to select multiple plugins
   - Click on empty space in the Pipeline area to deselect all plugins

2. Keyboard Shortcuts:
   - Ctrl + A: Select all plugins in the Pipeline
   - Ctrl + C: Copy selected plugins
   - Ctrl + V: Paste plugins from clipboard
   - ESC: Deselect all plugins

3. Plugin Documentation:
   - Click the ? button on any plugin to open its detailed documentation in a new tab

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

## Common Effect Combinations

Here are some popular effect combinations to enhance your listening experience:

### Headphone Enhancement
1. Stereo Blend -> RS Reverb
   - Stereo Blend: Adjusts stereo width for comfort (90-110%)
   - RS Reverb: Adds subtle room ambience (10-20% mix)
   - Result: More natural, less fatiguing headphone listening

### Vinyl Simulation
1. Wow Flutter -> Noise Blender -> Simple Tube
   - Wow Flutter: Adds gentle pitch variation
   - Noise Blender: Creates vinyl-like atmosphere
   - Simple Tube: Adds analog warmth
   - Result: Authentic vinyl record experience

### FM Radio Style
1. Multiband Compressor -> 5Band PEQ -> Hard Clipping
   - Multiband Compressor: Creates that "radio" sound
   - 5Band PEQ: Enhances presence and clarity
   - Hard Clipping: Adds subtle warmth
   - Result: Professional broadcast-like sound

### Lo-Fi Character
1. Bit Crusher -> Simple Jitter -> RS Reverb
   - Bit Crusher: Reduces bit depth for retro feel
   - Simple Jitter: Adds digital imperfections
   - RS Reverb: Creates atmospheric space
   - Result: Classic lo-fi aesthetic

## Troubleshooting

### Audio Issues
1. Dropouts or Glitches
   - Click "Reset Audio" to rebuild the audio pipeline
   - Try reducing the number of active effects
   - Close other browser tabs using audio

2. High CPU Usage
   - Disable effects you're not actively using
   - Consider using fewer effects in your chain

### Common Setup Issues
1. No Audio Input
   - Check input device selection in EffeTune
   - Verify browser microphone permissions
   - Ensure audio is playing from your source

2. Effect Not Working
   - Verify effect is enabled (ON/OFF button)
   - Check parameter settings
   - Try removing and re-adding the effect

3. Sharing Issues
   - Use the "Share" button to generate a URL
   - Copy the entire URL when sharing
   - Test the shared link in a new browser window

## FAQ

Q. Does this app support surround sound?
A. Currently, due to browser limitations, we cannot handle more than 2 channels in the browser, and there is no proven track record of surround sound operation. While the plugin implementation itself supports surround sound, we'll need to wait for future browser support.

Q. What's the recommended effect chain length?
A. While there's no strict limit, we recommend keeping your effect chain to 8-10 effects for optimal performance. More complex chains may impact system performance.

Q. Can I save my favorite effect combinations?
A. Yes! Use the "Share" button to generate a URL that contains your entire effect chain configuration. Bookmark this URL to save your settings.

Q. How do I achieve the best sound quality?
A. Use 96kHz sample rate when possible, start with subtle effect settings, and build your chain gradually. Monitor levels to avoid distortion.

Q. Will this work with any audio source?
A. Yes, EffeTune can process any audio playing through your selected input device, including streaming services, local files, and physical media.

## Available Effects

| Category | Effect | Description | Documentation |
|----------|--------|-------------|---------------|
| Analyzer | Level Meter | Displays audio level with peak hold | [Details](plugins/analyzer/readme.md#level-meter) |
| Analyzer | Oscilloscope | Real-time waveform visualization | [Details](plugins/analyzer/readme.md#oscilloscope) |
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

## Technical Information

### Browser Compatibility

Frieve EffeTune has been tested and verified to work on Google Chrome. The application requires a modern browser with support for:
- Web Audio API
- Audio Worklet
- getUserMedia API
- Drag and Drop API

### Browser Support Details
1. Chrome/Chromium
   - Fully supported and recommended
   - Update to latest version for best performance

2. Firefox/Safari
   - Limited support
   - Some features may not work as expected
   - Consider using Chrome for best experience

### Recommended Sample Rate

For optimal performance with nonlinear effects, it is recommended to use EffeTune at a sample rate of 96kHz or higher. This higher sample rate helps achieve ideal characteristics when processing audio through nonlinear effects such as saturation and compression.

## Plugin Development

Want to create your own audio plugins? Check out our [Plugin Development Guide](docs/plugin-development.md).

## Version History

### Version 0.30 (February 5, 2025)
- Added plugin selection and keyboard shortcuts (Ctrl+A, Ctrl+C, Ctrl+V)
- Added Oscilloscope plugin for real-time waveform visualization
- Various minor improvements

### Version 0.10 (February 3, 2025)
- Added touch operation support
- Improved processing efficiency
- Optimized heavy processing tasks
- Reduced audio dropouts
- Various minor improvements

### Version 0.01 (February 2, 2025)
- Initial release

## Links

[Source Code](https://github.com/Frieve-A/effetune)

[YouTube](https://www.youtube.com/@frieveamusic)
