# Analyzer Plugins

A collection of plugins that let you see your music in fascinating ways. These visual tools help you understand what you're hearing by showing different aspects of the sound, making your listening experience more engaging and interactive.

## Plugin List

- [Level Meter](#level-meter) - Shows how loud the music is playing
- [Oscilloscope](#oscilloscope) - Shows real-time waveform visualization
- [Spectrogram](#spectrogram) - Creates beautiful visual patterns from your music
- [Spectrum Analyzer](#spectrum-analyzer) - Shows the different frequencies in your music

## Level Meter

A visual display that shows you how loud your music is playing in real-time. It helps you ensure you're listening at comfortable levels and avoid any distortion from volume that's too high.

### Visualization Guide
- The meter moves up and down with the music's volume
- Higher on the meter means louder sound
- Red marker shows the highest recent level
- Red warning at the top means the volume might be too loud
- For comfortable listening, try to keep levels in the middle range

### Parameters
- **Enabled** - Turns the display on or off

## Oscilloscope

A professional-grade oscilloscope that displays real-time audio waveforms, helping you visualize the actual shape of your sound waves. It features trigger functionality for stable waveform display, making it easier to analyze periodic signals and transients.

### Visualization Guide
- Horizontal axis shows time (milliseconds)
- Vertical axis shows amplitude (-1 to 1)
- Green line traces the actual waveform
- Grid lines help measure time and amplitude values
- Trigger point marks where the waveform capture begins

### Parameters
- **Display Time** - How much time to show (1 to 100 ms)
  - Lower values: See more detail in shorter events
  - Higher values: View longer patterns
- **Trigger Mode**
  - Auto: Continuous updates even without trigger
  - Normal: Freezes display until next trigger
- **Trigger Source** - Which channel to trigger from
  - Left/Right channel selection
- **Trigger Level** - Amplitude level that starts capture
  - Range: -1 to 1 (normalized amplitude)
- **Trigger Edge**
  - Rising: Trigger when signal goes up
  - Falling: Trigger when signal goes down
- **Holdoff** - Minimum time between triggers (0.1 to 10 ms)
- **Display Level** - Vertical scale in dB (-96 to 0 dB)
- **Vertical Offset** - Shifts waveform up/down (-1 to 1)

### Note on Waveform Display
The displayed waveform uses linear interpolation between sample points for smooth visualization. This means the actual audio signal between samples may differ from what is shown. For the most accurate representation, especially when analyzing high-frequency content, consider using higher sample rates (96kHz or above).

## Spectrogram

Creates beautiful, colorful patterns that show how your music changes over time. It's like seeing a painting of your music, where different colors represent different sounds and frequencies.

### Visualization Guide
- Colors show how strong different frequencies are:
  - Dark colors: Quiet sounds
  - Bright colors: Loud sounds
  - Watch the patterns change with the music
- Vertical position shows frequency:
  - Bottom: Bass sounds
  - Middle: Main instruments
  - Top: High frequencies

### What You Can See
- Melodies: Flowing lines of color
- Beats: Vertical stripes
- Bass: Bright colors at the bottom
- Harmonies: Multiple parallel lines
- Different instruments create unique patterns

### Parameters
- **DB Range** - How vibrant the colors are (-144dB to -48dB)
  - Lower numbers: See more subtle details
  - Higher numbers: Focus on the main sounds
- **Points** - How detailed the patterns are (256 to 2048)
  - Higher numbers: More precise patterns
  - Lower numbers: Smoother visuals
- **Channel** - Which part of the stereo field to show
  - All: Everything combined
  - Left/Right: Individual sides

## Spectrum Analyzer

Creates a real-time visual display of your music's frequencies, from deep bass to high treble. It's like seeing the individual ingredients that make up the complete sound of your music.

### Visualization Guide
- Left side shows bass frequencies (drums, bass guitar)
- Middle shows main frequencies (vocals, guitars, piano)
- Right side shows high frequencies (cymbals, sparkle, air)
- Higher peaks mean stronger presence of those frequencies
- Watch how different instruments create different patterns

### What You Can See
- Bass Drops: Big movements on the left
- Vocal Melodies: Activity in the middle
- Crisp Highs: Sparkles on the right
- Full Mix: How all frequencies work together

### Parameters
- **DB Range** - How sensitive the display is (-144dB to -48dB)
  - Lower numbers: See more subtle details
  - Higher numbers: Focus on the main sounds
- **Points** - How detailed the display is (256 to 2048)
  - Higher numbers: More precise detail
  - Lower numbers: Smoother movement
- **Channel** - Which part of the stereo field to show
  - All: Everything combined
  - Left/Right: Individual sides

### Fun Ways to Use These Tools

1. Exploring Your Music
   - Watch how different genres create different patterns
   - See the difference between acoustic and electronic music
   - Observe how instruments occupy different frequency ranges

2. Learning About Sound
   - See the bass in electronic music
   - Watch vocal melodies move across the display
   - Observe how drums create sharp patterns

3. Enhancing Your Experience
   - Use the Level Meter to find comfortable listening volumes
   - Watch the Spectrum Analyzer dance with the music
   - Create a visual light show with the Spectrogram

Remember: These tools are meant to enhance your enjoyment of music by adding a visual dimension to your listening experience. Have fun exploring and discovering new ways to see your favorite music!
