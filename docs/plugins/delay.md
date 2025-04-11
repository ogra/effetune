# Delay Plugins

A collection of tools for adjusting the timing of your audio signals or adding distinct repetitions. These plugins help you fine-tune the temporal alignment of your audio, create rhythmic echoes, or add a sense of space and depth to your listening experience.

## Plugin List

- [Delay](#delay) - Creates echoes with control over timing, tone, and stereo spread.
- [Modal Resonator](#modal-resonator) - Frequency resonance effect with up to 5 resonators
- [Time Alignment](#time-alignment) - Precise timing adjustments for audio channels

## Delay

This effect adds distinct echoes to your audio. You can control how quickly the echoes repeat, how they fade away, and how they spread between your speakers, allowing you to add subtle depth, rhythmic interest, or creative spatial effects to your music playback.

### Listening Experience Guide

- **Subtle Depth & Space:**
  - Adds a gentle sense of space without washing out the sound.
  - Can make vocals or lead instruments feel slightly larger or more present.
  - Use short delay times and low feedback/mix.
- **Rhythmic Enhancement:**
  - Creates echoes that sync with the music's tempo (manually tuned).
  - Adds groove and energy, especially to electronic music, drums, or guitars.
  - Experiment with different delay times (e.g., matching eighth or quarter notes by ear).
- **Slapback Echo:**
  - A very short, single echo often used on vocals or guitars in rock and country.
  - Adds a percussive, doubling effect.
  - Use very short delay times (30-120ms), zero feedback, and moderate mix.
- **Creative Stereo Spreading:**
  - Using the Ping-Pong control, echoes can bounce between left and right speakers.
  - Creates a wider, more engaging stereo image.
  - Can make the sound feel more dynamic and interesting.

### Parameters

- **Pre-Delay (ms)** - How long before the *first* echo is heard (0 to 100 ms).
  - Lower values (0-20ms): Echo starts almost immediately.
  - Higher values (20-100ms): Creates a noticeable gap before the echo, separating it from the original sound.
- **Delay Size (ms)** - The time between each echo (1 to 5000 ms).
  - Short (1-100ms): Creates thickening or 'slapback' effects.
  - Medium (100-600ms): Standard echo effects, good for rhythmic enhancement.
  - Long (600ms+): Widely spaced, distinct echoes.
  - *Tip:* Try tapping along to the music to find a delay time that feels rhythmic.
- **Damping (%)** - Controls how much the high and low frequencies fade with each echo (0 to 100%).
  - 0%: Echoes keep their original tone (brighter).
  - 50%: A balanced, natural fade.
  - 100%: Echoes become significantly darker and thinner quickly (more muffled).
  - Use in conjunction with High/Low Damp.
- **High Damp (Hz)** - Sets the frequency above which echoes start losing brightness (1000 to 20000 Hz).
  - Lower values (e.g., 2000Hz): Echoes become dark quickly.
  - Higher values (e.g., 10000Hz): Echoes stay brighter for longer.
  - Adjust with Damping for tonal control of the echoes.
- **Low Damp (Hz)** - Sets the frequency below which echoes start losing fullness (20 to 1000 Hz).
  - Lower values (e.g., 50Hz): Echoes retain more bass.
  - Higher values (e.g., 500Hz): Echoes become thinner more quickly.
  - Adjust with Damping for tonal control of the echoes.
- **Feedback (%)** - How many echoes you hear, or how long they last (0 to 99%).
  - 0%: Only one echo is heard.
  - 10-40%: A few noticeable repeats.
  - 40-70%: Longer, fading trails of echoes.
  - 70-99%: Very long trails, approaching self-oscillation (use carefully!).
- **Ping-Pong (%)** - Controls how echoes bounce between stereo channels (0 to 100%). (Only affects stereo playback).
  - 0%: Standard delay - left input echoes on left, right on right.
  - 50%: Mono feedback - echoes are centered between speakers.
  - 100%: Full Ping-Pong - echoes alternate between left and right speakers.
  - Values in between create varying degrees of stereo spread.
- **Mix (%)** - Balances the volume of the echoes against the original sound (0 to 100%).
  - 0%: No effect.
  - 5-15%: Subtle depth or rhythm.
  - 15-30%: Clearly audible echoes (good starting point).
  - 30%+: Stronger, more pronounced effect. Default is 16%.

### Recommended Settings for Listening Enhancement

1.  **Subtle Vocal/Instrument Depth:**
    - Delay Size: 80-150ms
    - Feedback: 0-15%
    - Mix: 8-16%
    - Ping-Pong: 0% (or try 20-40% for slight width)
    - Damping: 40-60%
2.  **Rhythmic Enhancement (Electronic/Pop):**
    - Delay Size: Try matching tempo by ear (e.g., 120-500ms)
    - Feedback: 20-40%
    - Mix: 15-25%
    - Ping-Pong: 0% or 100%
    - Damping: Adjust to taste (lower for brighter repeats)
3.  **Classic Rock Slapback (Guitars/Vocals):**
    - Delay Size: 50-120ms
    - Feedback: 0%
    - Mix: 15-30%
    - Ping-Pong: 0%
    - Damping: 20-40%
4.  **Wide Stereo Echoes (Ambient/Pads):**
    - Delay Size: 300-800ms
    - Feedback: 40-60%
    - Mix: 20-35%
    - Ping-Pong: 70-100%
    - Damping: 50-70% (for smoother tails)

### Quick Start Guide

1.  **Set the Timing:**
    - Start with `Delay Size` to set the main echo rhythm.
    - Adjust `Feedback` to control how many echoes you hear.
    - Use `Pre-Delay` if you want a gap before the first echo.
2.  **Adjust the Tone:**
    - Use `Damping`, `High Damp`, and `Low Damp` together to shape how the echoes sound as they fade. Start with Damping around 50% and adjust the Damp frequencies.
3.  **Position in Stereo (Optional):**
    - If listening in stereo, experiment with `Ping-Pong` to control the width of the echoes.
4.  **Blend it In:**
    - Use `Mix` to balance the echo volume with the original music. Start low (around 16%) and increase until the effect feels right.

## Modal Resonator

A creative effect that adds resonant frequencies to your audio. This plugin creates tuned resonances at specific frequencies, similar to how physical objects vibrate at their natural resonant frequencies. It's perfect for adding unique tonal characteristics, simulating the resonant properties of different materials, or creating special effects.

### Listening Experience Guide

- **Metallic Resonance:**
  - Creates bell-like or metallic tones that follow the dynamics of the source material.
  - Useful for adding shimmer or a metallic character to percussion, synths, or full mixes.
  - Use multiple resonators at carefully tuned frequencies with moderate decay times.
- **Tonal Enhancement:**
  - Subtly reinforces specific frequencies in the music.
  - Can accentuate harmonics or add fullness to specific frequency ranges.
  - Use with low mix values (10-20%) for subtle enhancement.
- **Full-Range Speaker Simulation:**
  - Simulates the modal behavior of physical loudspeakers.
  - Recreates the distinctive resonances that occur when drivers divide their vibrations at different frequencies.
  - Helps simulate the characteristic sound of specific speaker types.
- **Special Effects:**
  - Creates unusual timbral qualities and otherworldly textures.
  - Excellent for sound design and experimental processing.
  - Try extreme settings for creative sound transformation.

### Parameters

- **Resonator Selection (1-5)** - Five independent resonators that can be enabled/disabled and configured separately.
  - Use multiple resonators for complex, layered resonance effects.
  - Each resonator can target different frequency regions.
  - Try harmonic relationships between resonators for more musical results.

For each resonator:

- **Enable** - Toggles the individual resonator on/off.
  - Allows for selective enabling of specific frequency resonances.
  - Useful for A/B testing different resonator combinations.

- **Freq (Hz)** - Sets the primary resonant frequency (20 to 20,000 Hz).
  - Lower frequencies (20-200 Hz): Adds body and fundamental resonances.
  - Mid frequencies (200-2000 Hz): Adds presence and tonal character.
  - High frequencies (2000+ Hz): Creates bell-like, metallic qualities.
  - *Tip:* For musical applications, try tuning resonators to notes in the musical scale or to harmonics of the fundamental frequency.

- **Decay (ms)** - Controls how long the resonance continues after the input sound (1 to 500 ms).
  - Short (1-50ms): Quick, percussive resonances.
  - Medium (50-200ms): Natural-sounding resonances similar to small metal or wooden objects.
  - Long (200-500ms): Bell-like, sustaining resonances.
  - *Note:* Higher frequencies automatically decay faster than lower frequencies for a natural sound.

- **LPF Freq (Hz)** - Low-pass filter that shapes the tone of the resonance (20 to 20,000 Hz).
  - Lower values: Darker, more muted resonances.
  - Higher values: Brighter, more present resonances.
  - Adjust to control the harmonic content of the resonance.

- **Mix (%)** - Balances the volume of the resonances against the original sound (0 to 100%).
  - 0%: No effect.
  - 5-25%: Subtle enhancement.
  - 25-50%: Equal blend of original and resonant sounds.
  - 50-100%: Resonances become more dominant than the original sound.

### Recommended Settings for Listening Enhancement

1. **Subtle Speaker Enhancement:**
   - Enable 2-3 resonators
   - Freq settings: 400 Hz, 900 Hz, 1600 Hz
   - Decay: 60-100ms
   - LPF Freq: 2000-4000 Hz
   - Mix: 10-20%

2. **Metallic Character:**
   - Enable 3-5 resonators
   - Freq settings: spread between 1000-6500 Hz
   - Decay: 100-200ms
   - LPF Freq: 4000-8000 Hz
   - Mix: 15-30%

3. **Bass Enhancement:**
   - Enable 1-2 resonators
   - Freq settings: 50-150 Hz
   - Decay: 50-100ms
   - LPF Freq: 1000-2000 Hz
   - Mix: 10-25%

4. **Full-Range Speaker Simulation:**
   - Enable all 5 resonators
   - Freq settings: 100 Hz, 400 Hz, 800 Hz, 1600 Hz, 3000 Hz
   - Decay: Progressively shorter from low to high (100ms to 30ms)
   - LPF Freq: Progressively higher from low to high (2000Hz to 4000Hz)
   - Mix: 20-40%

### Quick Start Guide

1. **Choose Resonance Points:**
   - Start by enabling one or two resonators.
   - Set their frequencies to target areas you want to enhance.
   - For more complex effects, add more resonators with complementary frequencies.

2. **Adjust the Character:**
   - Use the `Decay` parameter to control how long resonances sustain.
   - Shape the tone with the `LPF Freq` control.
   - Longer decay times create more obvious, bell-like tones.

3. **Blend with Original:**
   - Use `Mix` to balance the effect with your source material.
   - Start with lower mix values (10-20%) for subtle enhancement.
   - Increase for more dramatic effects.

4. **Fine-Tune:**
   - Make small adjustments to frequencies and decay times.
   - Enable/disable individual resonators to find the perfect combination.
   - Remember that subtle changes can have a significant impact on the overall sound.

## Time Alignment

A precision tool that lets you adjust the timing of audio channels with millisecond accuracy. Perfect for correcting phase issues or creating specific stereo effects.

### When to Use
- Fixing phase alignment between stereo channels
- Compensating for speaker distance differences
- Fine-tuning stereo imaging
- Correcting timing mismatches in recordings

### Parameters
- **Delay** - Controls the delay time (0 to 100ms)
  - 0ms: No delay (original timing)
  - Higher values: Increased delay
  - Fine adjustments for precise control
- **Channel** - Select which channel to delay
  - All: Affects both channels
  - Left: Only delays left channel
  - Right: Only delays right channel

### Recommended Uses

1. Speaker Alignment
   - Compensate for different speaker distances
   - Match timing between monitors
   - Adjust for room acoustics

2. Recording Correction
   - Fix phase issues between microphones
   - Align multiple audio sources
   - Correct timing discrepancies

3. Creative Effects
   - Create subtle stereo widening
   - Design spatial effects
   - Experiment with channel timing

Remember: The goal is to enhance your listening enjoyment. Experiment with the controls to find sounds that add interest and depth to your favorite music without overpowering it.