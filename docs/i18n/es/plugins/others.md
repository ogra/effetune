# Otras Herramientas de Audio

Una colección de herramientas de audio especializadas y generadores que complementan las categorías principales de efectos. Estos plugins proporcionan capacidades únicas para generación de sonido y experimentación de audio.

## Lista de Plugins

- [Oscillator](#oscillator) - Generador de señal de audio multi-forma de onda con control preciso de frecuencia

## Oscillator

Un generador de señal de audio versátil que produce varias formas de onda con control preciso de frecuencia. Perfecto para probar sistemas de audio, crear tonos de referencia o experimentar con síntesis de sonido.

### Características
- Múltiples tipos de forma de onda:
  - Onda sinusoidal pura para tonos de referencia
  - Onda cuadrada para contenido armónico rico
  - Onda triangular para armónicos más suaves
  - Onda de sierra para timbres brillantes
  - Ruido blanco para pruebas de sistema
  - Ruido rosa para mediciones acústicas

### Parámetros
- **Frequency (Hz)** - Controla el tono de la señal generada (20 Hz a 96 kHz)
  - Frecuencias bajas: Tonos graves profundos
  - Frecuencias medias: Rango musical
  - Frecuencias altas: Pruebas de sistema
- **Volume (dB)** - Ajusta el nivel de salida (-96 dB a 0 dB)
  - Usa valores más bajos para tonos de referencia
  - Valores más altos para pruebas de sistema
- **Panning (L/R)** - Controla la ubicación estéreo
  - Centro: Igual en ambos canales
  - Izquierda/Derecha: Pruebas de balance de canales
- **Waveform Type** - Selecciona el tipo de señal
  - Sine: Tono de referencia limpio
  - Square: Rico en armónicos impares
  - Triangle: Contenido armónico más suave
  - Sawtooth: Serie armónica completa
  - White Noise: Energía igual por Hz
  - Pink Noise: Energía igual por octava

### Ejemplos de Uso

1. Prueba de Altavoces
   - Verificar rango de reproducción de frecuencia
     * Usar barrido de onda sinusoidal de frecuencias bajas a altas
     * Notar dónde el sonido se vuelve inaudible o distorsionado
   - Probar características de distorsión
     * Usar ondas sinusoidales puras a diferentes frecuencias
     * Escuchar armónicos o distorsión no deseados
     * Comparar comportamiento a diferentes niveles de volumen

2. Análisis de Acústica de Sala
   - Identificar ondas estacionarias
     * Usar ondas sinusoidales en frecuencias sospechosas de modos de sala
     * Moverse por la sala para encontrar nodos y antinodos
   - Verificar resonancia y reverberación
     * Probar diferentes frecuencias para encontrar resonancias problemáticas
     * Usar ruido rosa para evaluar respuesta general de la sala
   - Mapear respuesta de frecuencia en diferentes posiciones
     * Usar barridos sinusoidales para verificar consistencia en el área de escucha

3. Prueba de Auriculares
   - Evaluar diafonía entre canales
     * Enviar señal a un solo canal
     * Verificar filtración no deseada al otro canal
   - Probar respuesta de frecuencia
     * Usar barridos sinusoidales para verificar balance de frecuencia
     * Comparar respuestas de canal izquierdo y derecho

4. Pruebas de Audición
   - Verificar rango de audición personal
     * Barrer frecuencias para encontrar límites superior e inferior
     * Notar cualquier brecha o debilidad de frecuencia
   - Determinar volumen mínimo audible
     * Probar diferentes frecuencias a volúmenes variables
     * Mapear contornos personales de igual sonoridad

5. Calibración de Sistema
   - Ajuste de nivel entre componentes
     * Usar ondas sinusoidales en frecuencias de referencia
     * Asegurar niveles consistentes a través de la cadena de señal
   - Verificación de balance de canales
     * Probar balance izquierda/derecha a diferentes frecuencias
     * Asegurar imagen estéreo adecuada

Recuerda: El Oscillator es una herramienta de precisión - comienza con volúmenes bajos y aumenta gradualmente para evitar posible daño al equipo o fatiga auditiva.