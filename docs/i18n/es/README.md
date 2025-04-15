# Frieve EffeTune <img src="../../../images/icon_64x64.png" alt="EffeTune Icon" width="30" height="30" align="bottom">

[Open Web App](https://frieve-a.github.io/effetune/effetune.html)  [Download Desktop App](https://github.com/Frieve-A/effetune/releases/)

Un procesador de efectos de audio en tiempo real, diseñado para entusiastas del audio que desean mejorar su experiencia musical. EffeTune te permite procesar cualquier fuente de audio a través de diversos efectos de alta calidad, lo que te posibilita personalizar y perfeccionar tu experiencia auditiva en tiempo real.

[![Screenshot](../../../images/screenshot.png)](https://frieve-a.github.io/effetune/effetune.html)

## Concepto

EffeTune ha sido creado para los entusiastas del audio que quieren elevar su experiencia musical. Ya sea que estés transmitiendo música o reproduciéndola desde un medio físico, EffeTune te permite añadir efectos de nivel profesional para personalizar el sonido según tus preferencias exactas. Transforma tu computadora en un potente procesador de efectos de audio que se sitúa entre tu fuente de audio y tus altavoces o amplificador.

Sin mitos audiophiles, solo pura ciencia.

## Características

- Procesamiento de audio en tiempo real
- Interfaz de arrastrar y soltar para construir cadenas de efectos
- Sistema de efectos ampliable con efectos categorizados
- Visualización de audio en vivo
- Cadena de procesamiento de audio que se puede modificar en tiempo real
- Procesamiento de archivos de audio sin conexión con la cadena de efectos actual

## Guía de Configuración

Antes de usar EffeTune, deberás configurar el enrutamiento de audio. Aquí se explica cómo configurar diferentes fuentes de audio:

### Configuración del Reproductor de Archivos de Música

- Abre la aplicación web EffeTune en tu navegador, o inicia la aplicación de escritorio EffeTune
- Abre y reproduce un archivo de música para asegurar una reproducción adecuada
   - Abre un archivo de música y selecciona EffeTune como la aplicación (solo aplicación de escritorio)
   - O selecciona Abrir archivo de música... desde el menú Archivo (solo aplicación de escritorio)
   - O arrastra el archivo de música a la ventana

### Configuración para Servicios de Streaming

Para procesar audio de servicios de streaming (Spotify, YouTube Music, etc.):

1. Requisitos:
   - Instala un dispositivo de audio virtual (por ejemplo, VB Cable, Voice Meeter o ASIO Link Tool)
   - Configura tu servicio de streaming para enviar el audio al dispositivo de audio virtual

2. Configuración:
   - Abre la aplicación web EffeTune en tu navegador, o inicia la aplicación de escritorio EffeTune
   - Selecciona el dispositivo de audio virtual como fuente de entrada
     - En Chrome, la primera vez que lo abras, aparecerá un cuadro de diálogo pidiéndote que selecciones y permitas la entrada de audio
     - En la aplicación de escritorio, configúralo haciendo clic en el botón Config Audio en la esquina superior derecha de la pantalla
   - Comienza a reproducir música desde tu servicio de streaming
   - Verifica que el audio esté fluyendo a través de EffeTune

### Configuración para Fuentes de Audio Físicas

Para usar EffeTune con reproductores de CD, reproductores de red u otras fuentes físicas:

- Conecta tu interfaz de audio a tu computadora
- Abre la aplicación web EffeTune en tu navegador, o inicia la aplicación de escritorio EffeTune
- Selecciona tu interfaz de audio como fuente de entrada y salida
   - En Chrome, la primera vez que lo abras, aparecerá un cuadro de diálogo pidiéndote que selecciones y permitas la entrada de audio
   - En la aplicación de escritorio, configúralo haciendo clic en el botón Config Audio en la esquina superior derecha de la pantalla
- Tu interfaz de audio ahora funciona como un procesador de múltiples efectos:
   * **Entrada:** Tu reproductor de CD, reproductor de red u otra fuente de audio
   * **Procesamiento:** Efectos en tiempo real a través de EffeTune
   * **Salida:** Audio procesado hacia tu amplificador o altavoces

## Uso

### Creando tu Cadena de Efectos

1. Los **Available Effects** se encuentran listados en el lado izquierdo de la pantalla  
   - Utiliza el botón de búsqueda al lado de **Available Effects** para filtrar los efectos  
   - Escribe cualquier texto para encontrar efectos por nombre o categoría  
   - Presiona ESC para limpiar la búsqueda
2. Arrastra los efectos desde la lista hasta el área de **Effect Pipeline**
3. Los efectos se procesan en orden de arriba a abajo
4. Arrastra el manejador (⋮) o pulsa los botones ▲▼ para reordenar los efectos
5. Haz clic en el nombre de un efecto para expandir o colapsar sus ajustes
   - Shift+clic para colapsar/expandir todos los efectos excepto la categoría Analizador
6. Utiliza el botón **ON** para omitir efectos individuales
7. Haz clic en el botón **?** para abrir su documentación detallada en una nueva pestaña
8. Elimina efectos utilizando el botón ×
9. Haz clic en el botón de enrutamiento para configurar los buses de entrada y salida  
   - [Más información sobre las funciones de los buses](bus-function.md)

### Uso de Presets

1. Guarda tu cadena de efectos:
   - Configura la cadena de efectos y los parámetros deseados
   - Ingresa un nombre para tu preset en el campo de entrada
   - Haz clic en el botón de guardar para almacenar tu preset

2. Cargar un Preset:
   - Escribe o selecciona un nombre de preset de la lista desplegable
   - El preset se cargará automáticamente
   - Se restaurarán todos los efectos y sus configuraciones

3. Eliminar un Preset:
   - Selecciona el preset que deseas eliminar
   - Haz clic en el botón de eliminar
   - Confirma la eliminación cuando se te solicite

4. Información del Preset:
   - Cada preset almacena la configuración completa de tu cadena de efectos
   - Incluye el orden de los efectos, los parámetros y los estados

### Selección de Efectos y Atajos de Teclado

1. Métodos de Selección de Efectos:
   - Haz clic en los encabezados de los efectos para seleccionar efectos individuales
   - Mantén presionada la tecla Ctrl mientras haces clic para seleccionar múltiples efectos
   - Haz clic en un espacio vacío en el área de Pipeline para deseleccionar todos los efectos

2. Atajos de Teclado:
   - Ctrl + Z: Deshacer
   - Ctrl + Y: Rehacer
   - Ctrl + S: Guardar el pipeline actual
   - Ctrl + Shift + S: Guardar el pipeline actual como
   - Ctrl + X: Cortar los efectos seleccionados
   - Ctrl + C: Copiar los efectos seleccionados
   - Ctrl + V: Pegar los efectos desde el portapapeles
   - Ctrl + F: Buscar efectos
   - Ctrl + A: Seleccionar todos los efectos en el pipeline
   - Delete: Eliminar los efectos seleccionados
   - ESC: Deseleccionar todos los efectos

3. Usando Secciones:
   - Añade un efecto de Sección al principio de un grupo de efectos
   - Ingresa un nombre descriptivo en el campo de comentario
   - Alternar el efecto de Sección ON/OFF activará/desactivará todos los efectos dentro de esa sección
   - Usa múltiples efectos de Sección para organizar tu cadena de efectos en grupos lógicos
   - [Más sobre efectos de control](plugins/control.md)

4. Atajos de teclado (al usar el reproductor):
   - Espacio: Reproducir/Pausar
   - Ctrl + → o N: Siguiente pista
   - Ctrl + ← o P: Pista anterior
   - Shift + → o F o .: Avanzar 10 segundos
   - Shift + ← o B o ,: Retroceder 10 segundos
   - Ctrl + T: Alternar modo repetición
   - Ctrl + H: Alternar modo aleatorio

### Procesamiento de Archivos de Audio

1. Área de Arrastre o Especificación de Archivos:
   - Un área de arrastre dedicada siempre es visible debajo de la **Effect Pipeline**
   - Soporta uno o múltiples archivos de audio
   - Los archivos se procesan utilizando la configuración actual de la pipeline
   - Todo el procesamiento se realiza a la tasa de muestreo de la pipeline

2. Estado del Procesamiento:
   - La barra de progreso muestra el estado actual del procesamiento
   - El tiempo de procesamiento depende del tamaño del archivo y la complejidad de la cadena de efectos

3. Opciones de Descarga o Guardado:
   - El archivo procesado se genera en formato WAV
   - Los múltiples archivos se empaquetan automáticamente en un archivo ZIP

### Compartir Cadenas de Efectos

Puedes compartir la configuración de tu cadena de efectos con otros usuarios:
1. Después de configurar la cadena de efectos deseada, haz clic en el botón **Share** en la esquina superior derecha del área de **Effect Pipeline**
2. La URL de la aplicación web se copiará automáticamente en tu portapapeles
3. Comparte la URL copiada con otros: podrán recrear exactamente tu cadena de efectos al abrirla
4. En la aplicación web, todos los ajustes de los efectos se almacenan en la URL, facilitando su guardado y compartición
5. En la versión de aplicación de escritorio, exporta la configuración a un archivo effetune_preset desde el menú Archivo
6. Comparte el archivo effetune_preset exportado. El archivo effetune_preset también puede cargarse arrastrándolo a la ventana de la aplicación web

### Reinicio de Audio

Si experimentas problemas de audio (interrupciones, fallos):
1. Haz clic en el botón **Reset Audio** en la esquina superior izquierda en la aplicación web o selecciona Reload desde el menú View en la aplicación de escritorio
2. La pipeline de audio se reconstruirá automáticamente
3. La configuración de tu cadena de efectos se conservará

## Combinaciones Comunes de Efectos

Aquí hay algunas combinaciones populares de efectos para mejorar tu experiencia de escucha:

### Mejora para Auriculares
1. **Stereo Blend** -> **RS Reverb**
   - **Stereo Blend:** Ajusta la anchura estéreo para mayor comodidad (60-100%)
   - **RS Reverb:** Añade una sutil ambientación de sala (mezcla 10-20%)
   - **Resultado:** Escucha con auriculares más natural y menos fatigante

### Simulación de Vinilo
1. **Wow Flutter** -> **Noise Blender** -> **Saturation**
   - **Wow Flutter:** Añade una suave variación de tono
   - **Noise Blender:** Crea una atmósfera similar a la de un vinilo
   - **Saturation:** Añade calidez analógica
   - **Resultado:** Experiencia auténtica de un disco de vinilo

### Estilo de Radio FM
1. **Multiband Compressor** -> **Stereo Blend**
   - **Multiband Compressor:** Crea ese sonido de "radio"
   - **Stereo Blend:** Ajusta la anchura estéreo para mayor comodidad (100-150%)
   - **Resultado:** Sonido profesional similar a una transmisión

### Carácter Lo-Fi
1. **Bit Crusher** -> **Simple Jitter** -> **RS Reverb**
   - **Bit Crusher:** Reduce la profundidad de bits para una sensación retro
   - **Simple Jitter:** Añade imperfecciones digitales
   - **RS Reverb:** Crea un espacio atmosférico
   - **Resultado:** Estética clásica lo-fi

## Resolución de Problemas

### Problemas de Audio

1. **Interrupciones o Fallos**
   - Haz clic en el botón **Reset Audio** en la esquina superior izquierda en la aplicación web o selecciona Reload desde el menú View en la aplicación de escritorio para reconstruir la pipeline de audio
   - Intenta reducir el número de efectos activos

2. **Alto Uso de CPU**
   - Desactiva los efectos que no estés utilizando activamente
   - Considera usar menos efectos en tu cadena

3. **Aparece Eco**
   - Es probable que tus entradas y salidas de audio no estén configuradas correctamente
   - Para procesar la salida de audio del navegador, considera instalar un navegador dedicado exclusivamente para EffeTune, o usa la aplicación de escritorio en lugar de la aplicación web

### Problemas Comunes de Configuración

1. **Sin Entrada de Audio**
   - Verifica que el audio se esté reproduciendo desde una fuente y saliendo a un dispositivo de audio virtual
   - Para la versión de aplicación web, asegúrate de que los permisos de entrada de audio estén permitidos en tu navegador y que el dispositivo de audio virtual esté seleccionado como dispositivo de entrada
   - Para la versión de aplicación de escritorio, ve a Config Audio en la esquina superior derecha de la pantalla y asegúrate de que el dispositivo de audio virtual esté seleccionado como dispositivo de entrada

2. **El Efecto No Funciona**
   - Verifica que el efecto esté habilitado (botón **ON/OFF**)
   - Revisa los ajustes de los parámetros

3. **Sin Salida de Audio**
   - Para la versión de aplicación web, asegúrate de que la salida de audio del sistema operativo esté configurada como dispositivo de salida
   - Para la versión de aplicación de escritorio, ve a "Config Audio" en la esquina superior derecha de la pantalla y asegúrate de que el dispositivo de salida correcto esté seleccionado

## Preguntas Frecuentes

**P. ¿Esta aplicación soporta sonido envolvente?**
Actualmente, debido a las limitaciones del navegador, no podemos manejar más de 2 canales, y no existe un historial comprobado de funcionamiento con sonido envolvente. Aunque la implementación del efecto en sí soporta sonido envolvente, tendremos que esperar a que el navegador ofrezca soporte en el futuro.

**P. ¿Cuál es la longitud recomendada para la cadena de efectos?**
Aunque no existe un límite estricto, recomendamos mantener tu cadena de efectos en 8-10 efectos para un rendimiento óptimo. Cadenas más complejas pueden afectar el rendimiento del sistema.

**P. ¿Cómo logro la mejor calidad de sonido?**
Usa tasas de muestreo de 96kHz o superiores cuando sea posible, comienza con ajustes sutiles en los efectos y construye tu cadena gradualmente. Monitorea los niveles para evitar distorsiones.

**P. ¿Funcionará esto con cualquier fuente de audio?**
Sí, EffeTune puede procesar cualquier audio que se reproduzca a través del dispositivo de entrada seleccionado, incluyendo servicios de streaming, archivos locales y medios físicos.

## Efectos Disponibles

| Categoría | Efecto | Descripción | Documentación |
|-----------|--------|-------------|---------------|
| Analyzer  | Level Meter | Muestra el nivel de audio con retención de picos | [Detalles](plugins/analyzer.md#level-meter) |
| Analyzer  | Oscilloscope | Visualización en tiempo real de la forma de onda | [Detalles](plugins/analyzer.md#oscilloscope) |
| Analyzer  | Spectrogram | Muestra los cambios en el espectro de frecuencias a lo largo del tiempo | [Detalles](plugins/analyzer.md#spectrogram) |
| Analyzer  | Spectrum Analyzer | Análisis de espectro en tiempo real | [Detalles](plugins/analyzer.md#spectrum-analyzer) |
| Analyzer  | Stereo Meter | Visualiza el balance estéreo y el movimiento del sonido | [Detalles](plugins/analyzer.md#stereo-meter) |
| Basics    | DC Offset | Ajuste del desplazamiento de DC | [Detalles](plugins/basics.md#dc-offset) |
| Basics    | Polarity Inversion | Inversión de la polaridad de la señal | [Detalles](plugins/basics.md#polarity-inversion) |
| Basics    | Stereo Balance | Control del balance entre canales estéreo | [Detalles](plugins/basics.md#stereo-balance) |
| Basics    | Volume | Control básico de volumen | [Detalles](plugins/basics.md#volume) |
| Delay     | Delay          | Efecto de retardo estándar                  | [Detalles](plugins/delay.md#delay) |
| Delay     | Modal Resonator | Efecto de resonancia de frecuencia con hasta 5 resonadores | [Detalles](plugins/delay.md#modal-resonator) |
| Delay     | Time Alignment | Ajustes precisos de sincronización para canales de audio | [Detalles](plugins/delay.md#time-alignment) |
| Dynamics  | Auto Leveler | Ajuste automático de volumen basado en medición LUFS para una experiencia de escucha consistente | [Detalles](plugins/dynamics.md#auto-leveler) |
| Dynamics  | Brickwall Limiter | Control transparente de picos para una escucha segura y cómoda | [Detalles](plugins/dynamics.md#brickwall-limiter) |
| Dynamics  | Compressor | Compresión del rango dinámico con control de umbral, ratio y knee | [Detalles](plugins/dynamics.md#compressor) |
| Dynamics  | Gate | Noise gate con control de umbral, ratio y knee para la reducción de ruido | [Detalles](plugins/dynamics.md#gate) |
| Dynamics  | Multiband Compressor | Procesador dinámico profesional de 5 bandas con modelado de sonido al estilo de radio FM | [Detalles](plugins/dynamics.md#multiband-compressor) |
| EQ        | 15Band GEQ | Ecualizador gráfico de 15 bandas | [Detalles](plugins/eq.md#15band-geq) |
| EQ        | 5Band PEQ | Ecualizador paramétrico profesional con 5 bandas completamente configurables | [Detalles](plugins/eq.md#5band-peq) |
| EQ | Hi Pass Filter | Elimina frecuencias bajas no deseadas con precisión | [Detalles](plugins/eq.md#hi-pass-filter) |
| EQ | Lo Pass Filter | Elimina frecuencias altas no deseadas con precisión | [Detalles](plugins/eq.md#lo-pass-filter) |
| EQ        | Loudness Equalizer | Corrección del balance de frecuencias para la escucha a bajo volumen | [Detalles](plugins/eq.md#loudness-equalizer) |
| EQ        | Narrow Range | Combinación de filtro pasa altos y pasa bajos | [Detalles](plugins/eq.md#narrow-range) |
| EQ        | Tilt EQ      | Ecualizador de inclinación para una rápida modelación del tono | [Detalles](plugins/eq.md#tilt-eq)      |
| EQ        | Tone Control | Control de tono de tres bandas | [Detalles](plugins/eq.md#tone-control) |
| Lo-Fi     | Bit Crusher | Reducción de la profundidad de bits y efecto de retención de orden cero | [Detalles](plugins/lofi.md#bit-crusher) |
| Lo-Fi     | Noise Blender | Generación y mezcla de ruido | [Detalles](plugins/lofi.md#noise-blender) |
| Lo-Fi     | Simple Jitter | Simulación digital de jitter | [Detalles](plugins/lofi.md#simple-jitter) |
| Modulation | Doppler Distortion | Simula los cambios naturales y dinámicos en el sonido debido a los sutiles movimientos del cono del altavoz | [Detalles](plugins/modulation.md#doppler-distortion) |
| Modulation | Pitch Shifter | Efecto ligero de cambio de tono | [Detalles](docs/plugins/modulation.md#pitch-shifter) |
| Modulation | Tremolo | Efecto de modulación basado en volumen | [Detalles](docs/plugins/modulation.md#tremolo) |
| Modulation | Wow Flutter | Efecto de modulación basado en tiempo | [Detalles](docs/plugins/modulation.md#wow-flutter) |
| Reverb    | RS Reverb | Reverb de dispersión aleatoria con difusión natural | [Detalles](plugins/reverb.md#rs-reverb) |
| Saturation| Hard Clipping | Efecto de hard clipping digital | [Detalles](plugins/saturation.md#hard-clipping) |
| Saturation | Harmonic Distortion | Agrega un carácter único a través de la distorsión armónica con control independiente de cada armónico | [Detalles](plugins/saturation.md#harmonic-distortion) |
| Saturation| Multiband Saturation | Efecto de saturación de 3 bandas para una calidez precisa basada en frecuencias | [Detalles](plugins/saturation.md#multiband-saturation) |
| Saturation| Saturation | Efecto de saturación | [Detalles](plugins/saturation.md#saturation) |
| Saturation| Sub Synth | Mezcla señales subarmónicas para realzar los graves | [Detalles](plugins/saturation.md#sub-synth) |
| Spatial   | Multiband Balance | Control de balance estéreo dependiente de la frecuencia en 5 bandas | [Detalles](plugins/spatial.md#multiband-balance) |
| Spatial   | Stereo Blend | Efecto de control de la anchura estéreo | [Detalles](plugins/spatial.md#stereo-blend) |
| Others    | Oscillator | Generador de señal de audio con múltiples formas de onda | [Detalles](plugins/others.md#oscillator) |
| Control   | Section    | Agrupar múltiples efectos para un control unificado | [Detalles](plugins/control.md) |

## Información Técnica

### Compatibilidad del Navegador

Frieve EffeTune ha sido probado y se ha verificado que funciona en Google Chrome. La aplicación requiere un navegador moderno con soporte para:
- Web Audio API
- Audio Worklet
- getUserMedia API
- Drag and Drop API

### Detalles de Soporte del Navegador
1. **Chrome/Chromium**
   - Totalmente soportado y recomendado
   - Actualiza a la última versión para un mejor rendimiento

2. **Firefox/Safari**
   - Soporte limitado
   - Algunas funciones pueden no funcionar como se espera
   - Considera usar Chrome para una mejor experiencia

### Tasa de Muestreo Recomendada

Para un rendimiento óptimo con efectos no lineales, se recomienda usar EffeTune a una tasa de muestreo de 96kHz o superior. Esta tasa de muestreo más alta ayuda a lograr características ideales al procesar audio a través de efectos no lineales como la saturación y la compresión.

## Guía de Desarrollo

¿Quieres crear tus propios plugins de audio? Consulta nuestra [Plugin Development Guide](../../plugin-development.md).
¿Quieres construir una aplicación de escritorio? Consulta nuestra [Guía de Construcción](../../build.md).

## Enlaces

[Version History](../../version-history.md)

[Source Code](https://github.com/Frieve-A/effetune)

[YouTube](https://www.youtube.com/@frieveamusic)
