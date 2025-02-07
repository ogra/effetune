# Equalizer Plugins

A collection of plugins that let you adjust different aspects of your music's sound, from deep bass to crisp highs. These tools help you personalize your listening experience by enhancing or reducing specific sound elements.

## Plugin List

- [15Band GEQ](#15band-geq) - Detailed sound adjustment with 15 precise controls
- [5Band PEQ](#5band-peq) - Professional parametric equalizer with flexible controls
- [Tone Control](#tone-control) - Simple bass, mid, and treble adjustment
- [Narrow Range](#narrow-range) - Focus on specific parts of the sound

## 15Band GEQ

A detailed sound adjustment tool with 15 separate controls, each affecting a specific part of the sound spectrum. Perfect for fine-tuning your music exactly how you like it.

### Listening Enhancement Guide
- Bass Region (25Hz-160Hz):
  - Enhance the power of bass drums and deep bass
  - Adjust the fullness of bass instruments
  - Control room-shaking sub-bass
- Lower Midrange (250Hz-630Hz):
  - Adjust the warmth of the music
  - Control the fullness of the overall sound
  - Reduce or enhance the "thickness" of the sound
- Upper Midrange (1kHz-2.5kHz):
  - Make vocals more clear and present
  - Adjust the prominence of main instruments
  - Control the "forward" feeling of the sound
- High Frequencies (4kHz-16kHz):
  - Enhance the crispness and detail
  - Control the "sparkle" and "air" in the music
  - Adjust the overall brightness

### Parameters
- **Band Gains** - Individual controls for each frequency range (-12dB to +12dB)
  - Deep Bass
    - 25Hz: Lowest bass feeling
    - 40Hz: Deep bass impact
    - 63Hz: Bass power
    - 100Hz: Bass fullness
    - 160Hz: Upper bass
  - Lower Sound
    - 250Hz: Sound warmth
    - 400Hz: Sound fullness
    - 630Hz: Sound body
  - Middle Sound
    - 1kHz: Main sound presence
    - 1.6kHz: Sound clarity
    - 2.5kHz: Sound detail
  - High Sound
    - 4kHz: Sound crispness
    - 6.3kHz: Sound brilliance
    - 10kHz: Sound air
    - 16kHz: Sound sparkle
- **Enabled** - Turns the effect on or off

### Visual Display
- Real-time graph showing your sound adjustments
- Easy-to-use sliders with precise control
- One-click reset to default settings

## Tone Control

A simple three-band sound adjuster for quick and easy sound personalization. Perfect for basic sound shaping without getting too technical.

### Music Enhancement Guide
- Classical Music:
  - Light treble boost for more detail in strings
  - Gentle bass boost for fuller orchestra sound
  - Neutral mids for natural sound
- Rock/Pop Music:
  - Moderate bass boost for more impact
  - Slight mid reduction for clearer sound
  - Treble boost for crisp cymbals and details
- Jazz Music:
  - Warm bass for fuller sound
  - Clear mids for instrument detail
  - Gentle treble for cymbal sparkle
- Electronic Music:
  - Strong bass for deep impact
  - Reduced mids for cleaner sound
  - Enhanced treble for crisp details

### Parameters
- **Bass** - Controls the low sounds (-24dB to +24dB)
  - Increase for more powerful bass
  - Decrease for lighter, cleaner sound
  - Affects the "weight" of the music
- **Mid** - Controls the main body of sound (-24dB to +24dB)
  - Increase for more prominent vocals/instruments
  - Decrease for more spacious sound
  - Affects the "fullness" of the music
- **Treble** - Controls the high sounds (-24dB to +24dB)
  - Increase for more sparkle and detail
  - Decrease for smoother, softer sound
  - Affects the "brightness" of the music
- **Enabled** - Turns the effect on or off

### Visual Display
- Easy-to-read graph showing your adjustments
- Simple sliders for each control
- Quick reset button

## 5Band PEQ

A professional-grade parametric equalizer based on scientific principles, offering five fully configurable bands with precise frequency control. Perfect for both subtle sound refinement and corrective audio processing.

### Sound Enhancement Guide
- Vocal and Instrument Clarity:
  - Use 3.2kHz band with moderate Q (1.0-2.0) for natural presence
  - Apply narrow Q (4.0-8.0) cuts to remove resonances
  - Add gentle air with 10kHz high shelf (+2 to +4dB)
- Bass Quality Control:
  - Shape fundamentals with 100Hz peaking filter
  - Remove room resonance using narrow Q at specific frequencies
  - Create smooth bass extension with low shelf
- Scientific Sound Adjustment:
  - Target specific frequencies with precision
  - Use analyzers to identify problem areas
  - Apply measured corrections with minimal phase impact

### Technical Parameters
- **Precision-Engineered Bands**
  - Band 1: 100Hz (Sub & Bass Control)
  - Band 2: 316Hz (Lower Midrange Definition)
  - Band 3: 1.0kHz (Midrange Presence)
  - Band 4: 3.2kHz (Upper Midrange Detail)
  - Band 5: 10kHz (High Frequency Extension)
- **Professional Controls Per Band**
  - Center Frequency: Logarithmically spaced for optimal coverage
  - Gain Range: Precise ±18dB adjustment
  - Q Factor: Wide 0.1 to Precise 10.0
  - Multiple Filter Types:
    - Peaking: Symmetrical frequency adjustment
    - Low/High Pass: 12dB/octave slope
    - Low/High Shelf: Gentle spectral shaping
    - Band Pass: Focused frequency isolation
- **Enabled** - Turns the effect on or off

### Technical Display
- High-resolution frequency response visualization
- Interactive control points with precise parameter display
- Real-time transfer function calculation
- Calibrated frequency and gain grid
- Accurate numerical readouts for all parameters

## Narrow Range

A tool that lets you focus on specific parts of the music by filtering out unwanted frequencies. Useful for creating special sound effects or removing unwanted sounds.

### Listening Enhancement Guide
- Create unique sound effects:
  - "Telephone voice" effect
  - "Old radio" sound
  - "Underwater" effect
- Focus on specific instruments:
  - Isolate bass frequencies
  - Focus on vocal range
  - Highlight specific instruments
- Remove unwanted sounds:
  - Reduce low-frequency rumble
  - Cut excessive high-frequency hiss
  - Focus on the most important parts of the music

### Parameters
- **HPF Frequency** - Controls where low sounds start being reduced (20Hz to 1000Hz)
  - Higher values: Removes more bass
  - Lower values: Keeps more bass
  - Start with low values and adjust to taste
- **HPF Slope** - How quickly low sounds are reduced (-6 or -12 dB/octave)
  - -6dB: Gentle reduction
  - -12dB: Stronger reduction
- **LPF Frequency** - Controls where high sounds start being reduced (200Hz to 20000Hz)
  - Lower values: Removes more highs
  - Higher values: Keeps more highs
  - Start high and adjust down as needed
- **LPF Slope** - How quickly high sounds are reduced (-6 or -12 dB/octave)
  - -6dB: Gentle reduction
  - -12dB: Stronger reduction
- **Enabled** - Turns the effect on or off

### Visual Display
- Clear graph showing frequency response
- Easy-to-adjust frequency controls
- Simple slope selection buttons
