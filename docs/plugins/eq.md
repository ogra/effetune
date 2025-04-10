# Equalizer Plugins

A collection of plugins that let you adjust different aspects of your music's sound, from deep bass to crisp highs. These tools help you personalize your listening experience by enhancing or reducing specific sound elements.

## Plugin List

- [15Band GEQ](#15band-geq) - Detailed sound adjustment with 15 precise controls
- [5Band PEQ](#5band-peq) - Professional parametric equalizer with flexible controls
- [Hi Pass Filter](#hi-pass-filter) - Remove unwanted low frequencies with precision
- [Lo Pass Filter](#lo-pass-filter) - Remove unwanted high frequencies with precision
- [Loudness Equalizer](#loudness-equalizer) - Frequency balance correction for low volume listening
- [Narrow Range](#narrow-range) - Focus on specific parts of the sound
- [Tilt EQ](#tilt-eq) - Simple EQ that tilts the sound spectrum
- [Tone Control](#tone-control) - Simple bass, mid, and treble adjustment

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

### Visual Display
- Real-time graph showing your sound adjustments
- Easy-to-use sliders with precise control
- One-click reset to default settings

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
    - Notch: Precise frequency removal
    - AllPass: Phase-focused frequency alignment

### Technical Display
- High-resolution frequency response visualization
- Interactive control points with precise parameter display
- Real-time transfer function calculation
- Calibrated frequency and gain grid
- Accurate numerical readouts for all parameters

## Hi Pass Filter

A precision high-pass filter that removes unwanted low frequencies while preserving the clarity of higher frequencies. Based on Linkwitz-Riley filter design for optimal phase response and transparent sound quality.

### Listening Enhancement Guide
- Remove Unwanted Rumble:
  - Set frequency between 20-40Hz to eliminate subsonic noise
  - Use steeper slopes (-24dB/oct or higher) for cleaner bass
  - Ideal for vinyl recordings or live performances with stage vibrations
- Clean Up Bass-Heavy Music:
  - Set frequency between 60-100Hz to tighten bass response
  - Use moderate slopes (-12dB/oct to -24dB/oct) for natural transition
  - Helps prevent speaker overload and improves clarity
- Create Special Effects:
  - Set frequency between 200-500Hz for telephone-like voice effect
  - Use steep slopes (-48dB/oct or higher) for dramatic filtering
  - Combine with Lo Pass Filter for band-pass effects

### Parameters
- **Frequency (Hz)** - Controls where low frequencies are filtered out (1Hz to 40000Hz)
  - Lower values: Only the very lowest frequencies are removed
  - Higher values: More low frequencies are removed
  - Adjust based on the specific low-frequency content you want to eliminate
- **Slope** - Controls how aggressively frequencies below the cutoff are reduced
  - Off: No filtering applied
  - -12dB/oct: Gentle filtering (LR2 - 2nd order Linkwitz-Riley)
  - -24dB/oct: Standard filtering (LR4 - 4th order Linkwitz-Riley)
  - -36dB/oct: Stronger filtering (LR6 - 6th order Linkwitz-Riley)
  - -48dB/oct: Very strong filtering (LR8 - 8th order Linkwitz-Riley)
  - -60dB/oct to -96dB/oct: Extremely steep filtering for special applications

### Visual Display
- Real-time frequency response graph with logarithmic frequency scale
- Clear visualization of the filter slope and cutoff point
- Interactive controls for precise adjustment
- Frequency grid with markers at key reference points

## Lo Pass Filter

A precision low-pass filter that removes unwanted high frequencies while preserving the warmth and body of lower frequencies. Based on Linkwitz-Riley filter design for optimal phase response and transparent sound quality.

### Listening Enhancement Guide
- Reduce Harshness and Sibilance:
  - Set frequency between 8-12kHz to tame harsh recordings
  - Use moderate slopes (-12dB/oct to -24dB/oct) for natural sound
  - Helps reduce listening fatigue with bright recordings
- Warm Up Digital Recordings:
  - Set frequency between 12-16kHz to reduce digital "edge"
  - Use gentle slopes (-12dB/oct) for subtle warming effect
  - Creates a more analog-like sound character
- Create Special Effects:
  - Set frequency between 1-3kHz for vintage radio effect
  - Use steep slopes (-48dB/oct or higher) for dramatic filtering
  - Combine with Hi Pass Filter for band-pass effects
- Control Noise and Hiss:
  - Set frequency just above the musical content (typically 14-18kHz)
  - Use steeper slopes (-36dB/oct or higher) for effective noise control
  - Reduces tape hiss or background noise while preserving most musical content

### Parameters
- **Frequency (Hz)** - Controls where high frequencies are filtered out (1Hz to 40000Hz)
  - Lower values: More high frequencies are removed
  - Higher values: Only the very highest frequencies are removed
  - Adjust based on the specific high-frequency content you want to eliminate
- **Slope** - Controls how aggressively frequencies above the cutoff are reduced
  - Off: No filtering applied
  - -12dB/oct: Gentle filtering (LR2 - 2nd order Linkwitz-Riley)
  - -24dB/oct: Standard filtering (LR4 - 4th order Linkwitz-Riley)
  - -36dB/oct: Stronger filtering (LR6 - 6th order Linkwitz-Riley)
  - -48dB/oct: Very strong filtering (LR8 - 8th order Linkwitz-Riley)
  - -60dB/oct to -96dB/oct: Extremely steep filtering for special applications

### Visual Display
- Real-time frequency response graph with logarithmic frequency scale
- Clear visualization of the filter slope and cutoff point
- Interactive controls for precise adjustment
- Frequency grid with markers at key reference points

## Loudness Equalizer

A specialized equalizer that automatically adjusts frequency balance based on your listening volume. This plugin compensates for the human ear's reduced sensitivity to low and high frequencies at lower volumes, ensuring a consistent and enjoyable listening experience regardless of playback level.

### Listening Enhancement Guide
- Low Volume Listening:
  - Enhances bass and treble frequencies
  - Maintains musical balance at quiet levels
  - Compensates for human hearing characteristics
- Volume-Dependent Processing:
  - More enhancement at lower volumes
  - Gradual reduction of processing as volume increases
  - Natural sound at higher listening levels
- Frequency Balance:
  - Low shelf for bass enhancement (100-300Hz)
  - High shelf for treble enhancement (3-6kHz)
  - Smooth transition between frequency ranges

### Parameters
- **Average SPL** - Current listening level (60dB to 85dB)
  - Lower values: More enhancement
  - Higher values: Less enhancement
  - Represents typical listening volume
- **Low Frequency Controls**
  - Frequency: Bass enhancement center (100Hz to 300Hz)
  - Gain: Maximum bass boost (0dB to 15dB)
  - Q: Shape of bass enhancement (0.5 to 1.0)
- **High Frequency Controls**
  - Frequency: Treble enhancement center (3kHz to 6kHz)
  - Gain: Maximum treble boost (0dB to 15dB)
  - Q: Shape of treble enhancement (0.5 to 1.0)

### Visual Display
- Real-time frequency response graph
- Interactive parameter controls
- Volume-dependent curve visualization
- Precise numerical readouts

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
- **HPF Slope** - How quickly low sounds are reduced (0 to -48 dB/octave)
  - 0dB: No reduction (off)
  - -6dB to -48dB: Increasingly stronger reduction in 6dB steps
- **LPF Frequency** - Controls where high sounds start being reduced (200Hz to 20000Hz)
  - Lower values: Removes more highs
  - Higher values: Keeps more highs
  - Start high and adjust down as needed
- **LPF Slope** - How quickly high sounds are reduced (0 to -48 dB/octave)
  - 0dB: No reduction (off)
  - -6dB to -48dB: Increasingly stronger reduction in 6dB steps

### Visual Display
- Clear graph showing frequency response
- Easy-to-adjust frequency controls
- Simple slope selection buttons

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

### Visual Display
- Easy-to-read graph showing your adjustments
- Simple sliders for each control

## Tilt EQ

A simple yet effective equalizer that gently tilts the frequency balance of your music. It's designed for subtle adjustments, making your music sound warmer or brighter without complex controls. Ideal for quickly tailoring the overall tone to your preference.

### Listening Enhancement Guide
- Make Music Warmer:
  - Use negative gain values to reduce high frequencies and increase low frequencies.
  - Perfect for bright recordings or headphones that sound too sharp.
  - Creates a cozy and relaxed listening experience.
- Make Music Brighter:
  - Use positive gain values to increase high frequencies and reduce low frequencies.
  - Ideal for dull recordings or speakers that sound muffled.
  - Adds clarity and sparkle to your music.
- Subtle Tone Adjustments:
  - Use small gain values for gentle overall tone shaping.
  - Fine-tune the balance to match your listening environment or mood.

### Parameters
- **Pivot Frequency** - Controls the center frequency of the tilt (20Hz to ~20kHz)
  - Adjust to set the frequency point around which the tilt occurs.
- **Slope** - Controls the steepness of the tilt around the Pivot Frequency (-12dB to +12dB)
  - Adjust to control how steeply frequencies around the Pivot Frequency are tilted.

### Visual Display
- Simple slider for easy gain adjustment
- Real-time frequency response curve to show the tilt effect
- Clear indication of current gain value

- Quick reset button
