# Lo-Fi Audio Plugins

A collection of plugins that add vintage character and nostalgic qualities to your music. These effects can make modern digital music sound like it's being played through classic equipment or give it that popular "lo-fi" sound that's both relaxing and atmospheric.

## Plugin List

- [Bit Crusher](#bit-crusher) - Creates retro gaming and vintage digital sounds
- [Noise Blender](#noise-blender) - Adds atmospheric background texture
- [Simple Jitter](#simple-jitter) - Creates subtle vintage digital imperfections

## Bit Crusher

An effect that recreates the sound of vintage digital devices like old gaming consoles and early samplers. Perfect for adding retro character or creating a lo-fi atmosphere.

### Sound Character Guide
- Retro Gaming Style:
  - Creates classic 8-bit console sounds
  - Perfect for video game music nostalgia
  - Adds pixelated texture to the sound
- Lo-Fi Hip Hop Style:
  - Creates that relaxing, study-beats sound
  - Warm, gentle digital degradation
  - Perfect for background listening
- Creative Effects:
  - Create unique glitch-style sounds
  - Transform modern music into retro versions
  - Add digital character to any music

### Parameters
- **Bit Depth** - Controls how "digital" the sound becomes (4 to 24 bits)
  - 4-6 bits: Extreme retro gaming sound
  - 8 bits: Classic vintage digital
  - 12-16 bits: Subtle lo-fi character
  - Higher values: Very gentle effect
- **TPDF Dither** - Makes the effect sound smoother
  - On: Gentler, more musical sound
  - Off: Raw, more aggressive effect
- **ZOH Frequency** - Affects the overall clarity (4000Hz to 96000Hz)
  - Lower values: More retro, less clear
  - Higher values: Clearer, more subtle effect
- **Bit Error** - Adds vintage hardware character (0.00% to 10.00%)
  - 0-1%: Subtle vintage warmth
  - 1-3%: Classic hardware imperfections
  - 3-10%: Creative lo-fi character
- **Random Seed** - Controls the unique character of imperfections (0 to 1000)
  - Different values create different vintage "personalities"
  - Same value always creates the same character
  - Perfect for finding and saving your favorite vintage sound

## Noise Blender

An effect that adds atmospheric background texture to your music, similar to the sound of vinyl records or vintage equipment. Perfect for creating cozy, nostalgic atmospheres.

### Sound Character Guide
- Vintage Equipment Sound:
  - Recreates the warmth of old audio gear
  - Adds subtle "life" to digital recordings
  - Creates an authentic vintage feel
- Vinyl Record Experience:
  - Adds that classic record player atmosphere
  - Creates a cozy, familiar feeling
  - Perfect for late-night listening
- Ambient Texture:
  - Adds atmospheric background
  - Creates depth and space
  - Makes digital music feel more organic

### Parameters
- **Noise Type** - Chooses the character of the background texture
  - White: Brighter, more present texture
  - Pink: Warmer, more natural sound
- **Level** - Controls how noticeable the effect is (-96dB to 0dB)
  - Very Subtle (-96dB to -72dB): Just a hint
  - Gentle (-72dB to -48dB): Noticeable texture
  - Strong (-48dB to -24dB): Dominant vintage character
- **Per Channel** - Creates a more spacious effect
  - On: Wider, more immersive sound
  - Off: More focused, centered texture

## Simple Jitter

An effect that adds subtle timing variations to create that imperfect, vintage digital sound. It can make music sound like it's playing through old CD players or vintage digital equipment.

### Sound Character Guide
- Subtle Vintage Feel:
  - Adds gentle instability like old equipment
  - Creates a more organic, less perfect sound
  - Perfect for adding character subtly
- Classic CD Player Sound:
  - Recreates the sound of early digital players
  - Adds nostalgic digital character
  - Great for 90s music appreciation
- Creative Effects:
  - Create unique wobble effects
  - Transform modern sounds into vintage ones
  - Add experimental character

### Parameters
- **RMS Jitter** - Controls the amount of timing variation (1ps to 10ms)
  - Subtle (1-10ps): Gentle vintage character
  - Medium (10-100ps): Classic CD player feel
  - Strong (100ps-1ms): Creative wobble effects

### Recommended Settings for Different Styles

1. Relaxing Lo-Fi
   - Bit Crusher: 12 bits, dither on, bit error 1.5%, seed 42
   - Noise Blender: Pink noise, -60dB
   - Jitter: Light (10ps)
   - Perfect for: Study sessions, relaxation

2. Retro Gaming
   - Bit Crusher: 8 bits, dither off, bit error 3%, seed 888
   - Noise Blender: White noise, -72dB
   - Jitter: None
   - Perfect for: Video game music appreciation

3. Vintage Digital
   - Bit Crusher: 16 bits, bit error 0.8%, seed 123
   - Noise Blender: Pink noise, -66dB
   - Jitter: Medium (50ps)
   - Perfect for: 90s music nostalgia

4. Ambient Lo-Fi
   - Bit Crusher: 14 bits, dither on, bit error 2%, seed 456
   - Noise Blender: Pink noise, -54dB
   - Jitter: Light (20ps)
   - Perfect for: Background atmosphere

Remember: These effects are meant to add character and nostalgia to your music. Start with subtle settings and adjust to taste!
