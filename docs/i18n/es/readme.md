# Frieve EffeTune <img src="../../../images/icon.png" alt="EffeTune Icon" width="30" heignt="30" align="bottom">

[Abrir Aplicación](https://frieve-a.github.io/effetune/effetune.html)

Un procesador de efectos de audio en tiempo real basado en web diseñado para entusiastas del audio para mejorar su experiencia de escucha musical. EffeTune te permite procesar cualquier fuente de audio a través de varios efectos de alta calidad, permitiéndote personalizar y perfeccionar tu experiencia de escucha en tiempo real.

[![Captura de pantalla](../../../images/screenshot.png)](https://frieve-a.github.io/effetune/effetune.html)

## Concepto

EffeTune está creado para entusiastas del audio que quieren llevar su experiencia de escucha musical al siguiente nivel. Ya sea que estés reproduciendo música en streaming o desde medios físicos, EffeTune te permite agregar efectos de grado profesional para personalizar el sonido según tus preferencias exactas. Transforma tu computadora en un potente procesador de efectos de audio que se sitúa entre tu fuente de audio y tus altavoces o amplificador.

Sin mitos audiófilos, solo ciencia pura.

## Características

- Procesamiento de audio en tiempo real
- Interfaz de arrastrar y soltar para construir cadenas de efectos
- Sistema de plugins expandible con efectos categorizados
- Visualización de audio en vivo
- Pipeline de audio que puede modificarse en tiempo real
- Procesamiento de archivos de audio sin conexión usando la cadena de efectos actual

## Guía de Configuración

Antes de usar EffeTune, necesitarás configurar tu enrutamiento de audio. Aquí te explicamos cómo configurar diferentes fuentes de audio:

### Configuración de Servicio de Streaming

Para procesar audio de servicios de streaming (Spotify, YouTube Music, etc.):

1. Prerrequisitos:
   - Instalar un dispositivo de audio virtual (por ejemplo, VB Cable, Voice Meeter o ASIO Link Tool)
   - Configurar tu servicio de streaming para enviar audio al dispositivo de audio virtual

2. Configuración:
   - Iniciar EffeTune
   - Seleccionar el dispositivo de audio virtual como fuente de entrada
   - Comenzar a reproducir música desde tu servicio de streaming
   - Verificar que el audio fluye a través de EffeTune
   - Agregar efectos al Pipeline para mejorar tu experiencia de escucha

### Configuración de Fuente de Audio Física

Para usar EffeTune con reproductores de CD, reproductores de red u otras fuentes físicas:

1. Configuración:
   - Conectar tu interfaz de audio a tu computadora
   - Iniciar EffeTune
   - Seleccionar tu interfaz de audio como fuente de entrada
   - Configurar la salida de audio de tu navegador a tu interfaz de audio
   - Tu interfaz de audio ahora funciona como un procesador multi-efectos:
     * Entrada: Tu reproductor de CD, reproductor de red u otra fuente de audio
     * Procesamiento: Efectos en tiempo real a través de EffeTune
     * Salida: Audio procesado a tu amplificador o altavoces

## Uso

### Construyendo Tu Cadena de Efectos

1. Los plugins disponibles se listan en el lado izquierdo de la pantalla
2. Arrastra plugins desde la lista al área de Pipeline de Efectos
3. Los plugins se procesan en orden de arriba a abajo
4. Usa el manejador (⋮) para reordenar plugins arrastrándolos
5. Haz clic en el nombre de un plugin para expandir/colapsar sus ajustes
6. Usa el botón ON/OFF para omitir efectos individuales
7. Elimina plugins usando el icono de papelera

### Usando Presets

1. Guardar Tu Cadena de Efectos:
   - Configura tu cadena de efectos y parámetros deseados
   - Ingresa un nombre en el campo de preset
   - Haz clic en el botón Guardar para almacenar tu preset

2. Cargar un Preset:
   - Escribe o selecciona un nombre de preset de la lista desplegable
   - El preset se cargará automáticamente
   - Todos los plugins y sus ajustes serán restaurados

3. Eliminar un Preset:
   - Selecciona el preset que deseas eliminar
   - Haz clic en el botón Eliminar
   - Confirma la eliminación cuando se te solicite

4. Información de Preset:
   - Cada preset almacena tu configuración completa de cadena de efectos
   - Incluye orden de plugins, parámetros y estados

### Selección de Plugins y Atajos de Teclado

1. Métodos de Selección de Plugins:
   - Haz clic en los encabezados de plugins para seleccionar plugins individuales
   - Mantén presionado Ctrl mientras haces clic para seleccionar múltiples plugins
   - Haz clic en espacio vacío en el área de Pipeline para deseleccionar todos los plugins

2. Atajos de Teclado:
   - Ctrl + A: Seleccionar todos los plugins en el Pipeline
   - Ctrl + C: Copiar plugins seleccionados
   - Ctrl + V: Pegar plugins desde el portapapeles
   - ESC: Deseleccionar todos los plugins

3. Documentación de Plugins:
   - Haz clic en el botón ? en cualquier plugin para abrir su documentación detallada en una nueva pestaña

### Procesando Archivos de Audio

1. Área de Soltar Archivos:
    - Un área dedicada para soltar archivos siempre visible debajo del Pipeline de Efectos
    - Soporta archivos de audio individuales o múltiples
    - Los archivos se procesan usando la configuración actual del Pipeline
    - Todo el procesamiento se realiza a la tasa de muestreo del Pipeline

2. Estado del Procesamiento:
    - La barra de progreso muestra el estado actual del procesamiento
    - El tiempo de procesamiento depende del tamaño del archivo y la complejidad de la cadena de efectos

3. Opciones de Descarga:
    - Los archivos individuales se descargan en formato WAV
    - Los archivos múltiples se empaquetan automáticamente en un archivo ZIP

### Compartiendo Cadenas de Efectos

Puedes compartir tu configuración de cadena de efectos con otros usuarios:
1. Después de configurar tu cadena de efectos deseada, haz clic en el botón "Compartir" en la esquina superior derecha del área de Pipeline de Efectos
2. La URL se copiará automáticamente a tu portapapeles
3. Comparte la URL copiada con otros - ellos pueden recrear tu cadena de efectos exacta abriéndola
4. Todos los ajustes de efectos se almacenan en la URL, haciéndolos fáciles de guardar y compartir

### Reinicio de Audio

Si experimentas problemas de audio (cortes, fallos):
1. Haz clic en el botón "Reiniciar Audio" en la esquina superior izquierda
2. El pipeline de audio se reconstruirá automáticamente
3. Tu configuración de cadena de efectos se preservará

## Combinaciones Comunes de Efectos

Aquí hay algunas combinaciones populares de efectos para mejorar tu experiencia de escucha:

### Mejora de Auriculares
1. Stereo Blend -> RS Reverb
   - Stereo Blend: Ajusta el ancho estéreo para comodidad (90-110%)
   - RS Reverb: Agrega ambiente sutil de sala (10-20% mix)
   - Resultado: Escucha con auriculares más natural y menos fatigante

### Simulación de Vinilo
1. Wow Flutter -> Noise Blender -> Simple Tube
   - Wow Flutter: Agrega variación suave de tono
   - Noise Blender: Crea atmósfera tipo vinilo
   - Simple Tube: Agrega calidez analógica
   - Resultado: Experiencia auténtica de disco de vinilo

### Estilo Radio FM
1. Multiband Compressor -> 5Band PEQ -> Hard Clipping
   - Multiband Compressor: Crea ese sonido "radio"
   - 5Band PEQ: Mejora presencia y claridad
   - Hard Clipping: Agrega calidez sutil
   - Resultado: Sonido tipo transmisión profesional

### Carácter Lo-Fi
1. Bit Crusher -> Simple Jitter -> RS Reverb
   - Bit Crusher: Reduce profundidad de bits para sensación retro
   - Simple Jitter: Agrega imperfecciones digitales
   - RS Reverb: Crea espacio atmosférico
   - Resultado: Estética lo-fi clásica

## Solución de Problemas

### Problemas de Audio
1. Cortes o Fallos
   - Haz clic en "Reiniciar Audio" para reconstruir el pipeline de audio
   - Intenta reducir el número de efectos activos
   - Cierra otras pestañas del navegador que usen audio

2. Alto Uso de CPU
   - Desactiva efectos que no estés usando activamente
   - Considera usar menos efectos en tu cadena

### Problemas Comunes de Configuración
1. Sin Entrada de Audio
   - Verifica la selección de dispositivo de entrada en EffeTune
   - Verifica los permisos de micrófono del navegador
   - Asegúrate de que el audio se está reproduciendo desde tu fuente

2. Efecto No Funciona
   - Verifica que el efecto está habilitado (botón ON/OFF)
   - Revisa los ajustes de parámetros
   - Intenta eliminar y volver a agregar el efecto

3. Problemas de Compartir
   - Usa el botón "Compartir" para generar una URL
   - Copia la URL completa al compartir
   - Prueba el enlace compartido en una nueva ventana del navegador

## Preguntas Frecuentes

P. ¿Esta aplicación soporta sonido envolvente?
R. Actualmente, debido a limitaciones del navegador, no podemos manejar más de 2 canales en el navegador, y no hay un historial probado de operación de sonido envolvente. Si bien la implementación del plugin en sí soporta sonido envolvente, necesitaremos esperar soporte futuro del navegador.

P. ¿Cuál es la longitud recomendada de cadena de efectos?
R. Aunque no hay un límite estricto, recomendamos mantener tu cadena de efectos en 8-10 efectos para un rendimiento óptimo. Cadenas más complejas pueden impactar el rendimiento del sistema.

P. ¿Puedo guardar mis combinaciones favoritas de efectos?
R. ¡Sí! Usa el botón "Compartir" para generar una URL que contiene tu configuración completa de cadena de efectos. Marca esta URL para guardar tus ajustes.

P. ¿Cómo logro la mejor calidad de sonido?
R. Usa tasa de muestreo de 96kHz cuando sea posible, comienza con ajustes sutiles de efectos y construye tu cadena gradualmente. Monitorea los niveles para evitar distorsión.

P. ¿Funcionará con cualquier fuente de audio?
R. Sí, EffeTune puede procesar cualquier audio que se reproduzca a través de tu dispositivo de entrada seleccionado, incluyendo servicios de streaming, archivos locales y medios físicos.

## Efectos Disponibles

| Categoría | Efecto | Descripción | Documentación |
|----------|--------|-------------|---------------|
| Analyzer | Level Meter | Muestra nivel de audio con retención de picos | [Detalles](plugins/analyzer.md#level-meter) |
| Analyzer | Oscilloscope | Visualización de forma de onda en tiempo real | [Detalles](plugins/analyzer.md#oscilloscope) |
| Analyzer | Spectrogram | Muestra cambios del espectro de frecuencia en el tiempo | [Detalles](plugins/analyzer.md#spectrogram) |
| Analyzer | Spectrum Analyzer | Análisis de espectro en tiempo real | [Detalles](plugins/analyzer.md#spectrum-analyzer) |
| Basics | DC Offset | Ajuste de offset DC | [Detalles](plugins/basics.md#dc-offset) |
| Basics | Polarity Inversion | Inversión de polaridad de señal | [Detalles](plugins/basics.md#polarity-inversion) |
| Basics | Stereo Balance | Control de balance de canales estéreo | [Detalles](plugins/basics.md#stereo-balance) |
| Basics | Volume | Control básico de volumen | [Detalles](plugins/basics.md#volume) |
| Dynamics | Compressor | Compresión de rango dinámico con control de threshold, ratio y knee | [Detalles](plugins/dynamics.md#compressor) |
| Dynamics | Gate | Puerta de ruido con control de threshold, ratio y knee para reducción de ruido | [Detalles](plugins/dynamics.md#gate) |
| Dynamics | Multiband Compressor | Procesador de dinámica profesional de 5 bandas con modelado de sonido estilo radio FM | [Detalles](plugins/dynamics.md#multiband-compressor) |
| EQ | 15Band GEQ | Ecualizador gráfico de 15 bandas | [Detalles](plugins/eq.md#15band-geq) |
| EQ | 5Band PEQ | Ecualizador paramétrico profesional con 5 bandas totalmente configurables | [Detalles](plugins/eq.md#5band-peq) |
| EQ | Narrow Range | Combinación de filtros paso alto y paso bajo | [Detalles](plugins/eq.md#narrow-range) |
| EQ | Tone Control | Control de tono de tres bandas | [Detalles](plugins/eq.md#tone-control) |
| Filter | Wow Flutter | Efecto de modulación basado en tiempo | [Detalles](plugins/filter.md#wow-flutter) |
| Lo-Fi | Bit Crusher | Reducción de profundidad de bits y efecto de retención de orden cero | [Detalles](plugins/lofi.md#bit-crusher) |
| Lo-Fi | Noise Blender | Generación y mezcla de ruido | [Detalles](plugins/lofi.md#noise-blender) |
| Lo-Fi | Simple Jitter | Simulación de jitter digital | [Detalles](plugins/lofi.md#simple-jitter) |
| Reverb | RS Reverb | Reverberación de dispersión aleatoria con difusión natural | [Detalles](plugins/reverb.md#rs-reverb) |
| Saturation | Hard Clipping | Efecto de recorte duro digital | [Detalles](plugins/saturation.md#hard-clipping) |
| Saturation | Saturation | Efecto de saturación | [Detalles](plugins/saturation.md#saturation) |
| Spatial | Multiband Balance | Control de balance estéreo de 5 bandas dependiente de frecuencia | [Detalles](plugins/spatial.md#multiband-balance) |
| Spatial | Stereo Blend | Efecto de control de ancho estéreo | [Detalles](plugins/spatial.md#stereo-blend) |
| Others | Oscillator | Generador de señal de audio multi-forma de onda | [Detalles](plugins/others.md#oscillator) |

## Información Técnica

### Compatibilidad de Navegadores

Frieve EffeTune ha sido probado y verificado para funcionar en Google Chrome. La aplicación requiere un navegador moderno con soporte para:
- Web Audio API
- Audio Worklet
- getUserMedia API
- Drag and Drop API

### Detalles de Soporte de Navegadores
1. Chrome/Chromium
   - Totalmente soportado y recomendado
   - Actualiza a la última versión para mejor rendimiento

2. Firefox/Safari
   - Soporte limitado
   - Algunas características pueden no funcionar como se espera
   - Considera usar Chrome para mejor experiencia

### Tasa de Muestreo Recomendada

Para un rendimiento óptimo con efectos no lineales, se recomienda usar EffeTune a una tasa de muestreo de 96kHz o superior. Esta tasa de muestreo más alta ayuda a lograr características ideales al procesar audio a través de efectos no lineales como saturación y compresión.

## Desarrollo de Plugins

¿Quieres crear tus propios plugins de audio? Consulta nuestra [Guía de Desarrollo de Plugins](plugin-development.md).

## Historial de Versiones

### Versión 1.10 (9 de febrero de 2025)
- Agregada funcionalidad de procesamiento de archivos de audio
- Varias mejoras menores

### Versión 1.00 (8 de febrero de 2025)
- Mejorada eficiencia de procesamiento
- Varias mejoras menores

### Versión 0.50 (7 de febrero de 2025)
- Agregada funcionalidad de presets para guardar y cargar configuraciones de cadena de efectos
- Nuestra documentación de uso ahora está disponible en los siguientes idiomas: 中文 (简体), Español, हिन्दी, العربية, Português, Русский, 日本語, 한국어, y Français
- Varias mejoras menores

### Versión 0.30 (5 de febrero de 2025)
- Mejorada eficiencia de procesamiento
- Agregada selección de plugins y atajos de teclado (Ctrl+A, Ctrl+C, Ctrl+V)
- Agregado plugin Oscilloscope para visualización de forma de onda en tiempo real
- Varias mejoras menores

### Versión 0.10 (3 de febrero de 2025)
- Agregado soporte de operación táctil
- Mejorada eficiencia de procesamiento
- Optimizadas tareas de procesamiento pesado
- Reducidos cortes de audio
- Varias mejoras menores

### Versión 0.01 (2 de febrero de 2025)
- Lanzamiento inicial

## Enlaces

[Código Fuente](https://github.com/Frieve-A/effetune)

[YouTube](https://www.youtube.com/@frieveamusic)