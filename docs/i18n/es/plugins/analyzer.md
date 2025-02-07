# Plugins de Análisis

Una colección de plugins que te permiten ver tu música de formas fascinantes. Estas herramientas visuales te ayudan a entender lo que estás escuchando mostrando diferentes aspectos del sonido, haciendo tu experiencia de escucha más atractiva e interactiva.

## Lista de Plugins

- [Level Meter](#level-meter) - Muestra qué tan fuerte se está reproduciendo la música
- [Oscilloscope](#oscilloscope) - Muestra la visualización de forma de onda en tiempo real
- [Spectrogram](#spectrogram) - Crea hermosos patrones visuales a partir de tu música
- [Spectrum Analyzer](#spectrum-analyzer) - Muestra las diferentes frecuencias en tu música

## Level Meter

Una visualización que muestra en tiempo real qué tan fuerte se está reproduciendo tu música. Te ayuda a asegurar que estás escuchando a niveles cómodos y evitar cualquier distorsión por volumen demasiado alto.

### Guía de Visualización
- El medidor se mueve arriba y abajo con el volumen de la música
- Más alto en el medidor significa sonido más fuerte
- El marcador rojo muestra el nivel más alto reciente
- La advertencia roja en la parte superior significa que el volumen podría ser demasiado alto
- Para una escucha cómoda, intenta mantener los niveles en el rango medio

### Parámetros
- **Enabled** - Activa o desactiva la visualización

## Oscilloscope

Un osciloscopio de grado profesional que muestra formas de onda de audio en tiempo real, ayudándote a visualizar la forma real de tus ondas sonoras. Cuenta con funcionalidad de disparo para una visualización estable de la forma de onda, facilitando el análisis de señales periódicas y transitorias.

### Guía de Visualización
- El eje horizontal muestra el tiempo (milisegundos)
- El eje vertical muestra la amplitud (-1 a 1)
- La línea verde traza la forma de onda real
- Las líneas de cuadrícula ayudan a medir valores de tiempo y amplitud
- El punto de disparo marca dónde comienza la captura de forma de onda

### Parámetros
- **Display Time** - Cuánto tiempo mostrar (1 a 100 ms)
  - Valores más bajos: Ver más detalle en eventos más cortos
  - Valores más altos: Ver patrones más largos
- **Trigger Mode**
  - Auto: Actualizaciones continuas incluso sin disparo
  - Normal: Congela la visualización hasta el siguiente disparo
- **Trigger Source** - Qué canal usar para el disparo
  - Selección de canal izquierdo/derecho
- **Trigger Level** - Nivel de amplitud que inicia la captura
  - Rango: -1 a 1 (amplitud normalizada)
- **Trigger Edge**
  - Rising: Dispara cuando la señal sube
  - Falling: Dispara cuando la señal baja
- **Holdoff** - Tiempo mínimo entre disparos (0.1 a 10 ms)
- **Display Level** - Escala vertical en dB (-96 a 0 dB)
- **Vertical Offset** - Desplaza la forma de onda arriba/abajo (-1 a 1)

### Nota sobre la Visualización de Forma de Onda
La forma de onda mostrada utiliza interpolación lineal entre puntos de muestra para una visualización suave. Esto significa que la señal de audio real entre muestras puede diferir de lo que se muestra. Para la representación más precisa, especialmente al analizar contenido de alta frecuencia, considera usar tasas de muestreo más altas (96kHz o superior).

## Spectrogram

Crea hermosos patrones coloridos que muestran cómo tu música cambia con el tiempo. Es como ver una pintura de tu música, donde diferentes colores representan diferentes sonidos y frecuencias.

### Guía de Visualización
- Los colores muestran qué tan fuertes son diferentes frecuencias:
  - Colores oscuros: Sonidos suaves
  - Colores brillantes: Sonidos fuertes
  - Observa cómo los patrones cambian con la música
- La posición vertical muestra la frecuencia:
  - Abajo: Sonidos graves
  - Medio: Instrumentos principales
  - Arriba: Frecuencias altas

### Lo Que Puedes Ver
- Melodías: Líneas fluidas de color
- Ritmos: Franjas verticales
- Graves: Colores brillantes en la parte inferior
- Armonías: Múltiples líneas paralelas
- Diferentes instrumentos crean patrones únicos

### Parámetros
- **DB Range** - Qué tan vibrantes son los colores (-144dB a -48dB)
  - Números más bajos: Ver más detalles sutiles
  - Números más altos: Enfocarse en los sonidos principales
- **Points** - Qué tan detallados son los patrones (256 a 16384)
  - Números más altos: Patrones más precisos
  - Números más bajos: Visuales más suaves
- **Channel** - Qué parte del campo estéreo mostrar
  - All: Todo combinado
  - Left/Right: Lados individuales

## Spectrum Analyzer

Crea una visualización en tiempo real de las frecuencias de tu música, desde graves profundos hasta agudos altos. Es como ver los ingredientes individuales que componen el sonido completo de tu música.

### Guía de Visualización
- El lado izquierdo muestra frecuencias graves (batería, bajo)
- El medio muestra frecuencias principales (voces, guitarras, piano)
- El lado derecho muestra frecuencias altas (platillos, brillo, aire)
- Picos más altos significan mayor presencia de esas frecuencias
- Observa cómo diferentes instrumentos crean diferentes patrones

### Lo Que Puedes Ver
- Caídas de Graves: Grandes movimientos a la izquierda
- Melodías Vocales: Actividad en el medio
- Agudos Nítidos: Destellos a la derecha
- Mezcla Completa: Cómo todas las frecuencias trabajan juntas

### Parámetros
- **DB Range** - Qué tan sensible es la visualización (-144dB a -48dB)
  - Números más bajos: Ver más detalles sutiles
  - Números más altos: Enfocarse en los sonidos principales
- **Points** - Qué tan detallada es la visualización (256 a 16384)
  - Números más altos: Más detalle preciso
  - Números más bajos: Movimiento más suave
- **Channel** - Qué parte del campo estéreo mostrar
  - All: Todo combinado
  - Left/Right: Lados individuales

### Formas Divertidas de Usar Estas Herramientas

1. Explorando Tu Música
   - Observa cómo diferentes géneros crean diferentes patrones
   - Ve la diferencia entre música acústica y electrónica
   - Observa cómo los instrumentos ocupan diferentes rangos de frecuencia

2. Aprendiendo Sobre el Sonido
   - Ve los graves en la música electrónica
   - Observa las melodías vocales moverse a través de la visualización
   - Observa cómo la batería crea patrones nítidos

3. Mejorando Tu Experiencia
   - Usa el Level Meter para encontrar volúmenes de escucha cómodos
   - Mira el Spectrum Analyzer bailar con la música
   - Crea un espectáculo de luces visual con el Spectrogram

¡Recuerda: Estas herramientas están diseñadas para mejorar tu disfrute de la música agregando una dimensión visual a tu experiencia de escucha. ¡Diviértete explorando y descubriendo nuevas formas de ver tu música favorita!