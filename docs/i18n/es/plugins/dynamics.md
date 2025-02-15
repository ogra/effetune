# Plugins de Dinámica

Una colección de plugins que ayudan a equilibrar las partes fuertes y suaves de tu música, haciendo tu experiencia de escucha más agradable y cómoda.

## Lista de Plugins

- [Brickwall Limiter](#brickwall-limiter) - Control transparente de picos para una escucha segura y cómoda
- [Compressor](#compressor) - Equilibra automáticamente los niveles de volumen para una escucha más cómoda
- [Gate](#gate) - Reduce el ruido de fondo no deseado atenuando señales por debajo de un umbral
- [Multiband Compressor](#multiband-compressor) - Procesador de dinámica profesional de 5 bandas con modelado de sonido estilo radio FM

## Brickwall Limiter

Un limitador de picos de alta calidad que asegura que tu música nunca exceda un nivel específico, previniendo la saturación digital mientras mantiene la calidad natural del sonido. Perfecto para proteger tu sistema de audio y asegurar niveles de escucha cómodos sin comprometer la dinámica de la música.

### Guía de Mejora de Escucha
- Música Clásica:
  - Disfruta de forma segura los crescendos orquestales completos
  - Mantiene la dinámica natural de las piezas de piano
  - Protege contra picos inesperados en grabaciones en vivo
- Música Pop/Rock:
  - Mantiene un volumen consistente durante pasajes intensos
  - Disfruta de música dinámica a cualquier nivel de escucha
  - Previene la distorsión en secciones con mucho bajo
- Música Electrónica:
  - Controla los picos de sintetizador de forma transparente
  - Mantiene el impacto mientras previene la sobrecarga
  - Mantiene los drops de bajo potentes pero controlados

### Parámetros
- **Input Gain** (-18dB a +18dB)
  - Ajusta el nivel que entra al limitador
  - Aumenta para impulsar más el limitador
  - Disminuye si escuchas demasiada limitación
  - Valor predeterminado 0dB

- **Threshold** (-24dB a 0dB)
  - Establece el nivel máximo de picos
  - Valores más bajos proporcionan más margen de seguridad
  - Valores más altos preservan más dinámica
  - Comienza en -3dB para protección suave

- **Release Time** (10ms a 500ms)
  - Qué tan rápido se libera la limitación
  - Tiempos más rápidos mantienen más dinámica
  - Tiempos más lentos para sonido más suave
  - Prueba con 100ms como punto de partida

- **Lookahead** (0ms a 10ms)
  - Permite al limitador anticipar los picos
  - Valores más altos para limitación más transparente
  - Valores más bajos para menos latencia
  - 3ms es un buen equilibrio

- **Margin** (-1.000dB a 0.000dB)
  - Ajuste fino del umbral efectivo
  - Proporciona margen de seguridad adicional
  - Valor predeterminado -1.000dB funciona bien para la mayoría del material
  - Ajusta para control preciso de picos

- **Oversampling** (1x, 2x, 4x, 8x)
  - Valores más altos para limitación más limpia
  - Valores más bajos para menos uso de CPU
  - 4x es un buen equilibrio entre calidad y rendimiento

### Visualización
- Medición de reducción de ganancia en tiempo real
- Indicación clara del nivel de threshold
- Ajuste interactivo de parámetros
- Monitoreo de nivel de picos

### Ajustes Recomendados

#### Protección Transparente
- Input Gain: 0dB
- Threshold: -3dB
- Release: 100ms
- Lookahead: 3ms
- Margin: -1.000dB
- Oversampling: 4x

#### Máxima Seguridad
- Input Gain: -6dB
- Threshold: -6dB
- Release: 50ms
- Lookahead: 5ms
- Margin: -1.000dB
- Oversampling: 8x

#### Dinámica Natural
- Input Gain: 0dB
- Threshold: -1.5dB
- Release: 200ms
- Lookahead: 2ms
- Margin: -0.500dB
- Oversampling: 4x

## Compressor
- Música Pop/Rock:
  - Crea una experiencia de escucha más cómoda durante secciones intensas
  - Hace que las voces sean más claras y fáciles de entender
  - Reduce la fatiga auditiva durante sesiones largas
- Música Jazz:
  - Equilibra el volumen entre diferentes instrumentos
  - Hace que las secciones de solo se mezclen más naturalmente con el conjunto
  - Mantiene la claridad durante pasajes tanto suaves como fuertes

### Parámetros

- **Threshold** - Establece el nivel de volumen donde el efecto comienza a trabajar (-60dB a 0dB)
  - Ajustes más altos: Solo afecta las partes más fuertes de la música
  - Ajustes más bajos: Crea más balance general
  - Comienza en -24dB para un balance suave
- **Ratio** - Controla qué tan fuertemente el efecto equilibra el volumen (1:1 a 20:1)
  - 1:1: Sin efecto (sonido original)
  - 2:1: Balance suave
  - 4:1: Balance moderado
  - 8:1+: Control de volumen fuerte
- **Attack Time** - Qué tan rápido responde el efecto a los sonidos fuertes (0.1ms a 100ms)
  - Tiempos más rápidos: Control de volumen más inmediato
  - Tiempos más lentos: Sonido más natural
  - Prueba 20ms como punto de partida
- **Release Time** - Qué tan rápido el volumen vuelve a la normalidad (10ms a 1000ms)
  - Tiempos más rápidos: Sonido más dinámico
  - Tiempos más lentos: Transiciones más suaves y naturales
  - Comienza con 200ms para escucha general
- **Knee** - Qué tan suavemente transiciona el efecto (0dB a 12dB)
  - Valores más bajos: Control más preciso
  - Valores más altos: Sonido más suave y natural
  - 6dB es un buen punto de partida
- **Gain** - Ajusta el volumen general después del procesamiento (-12dB a +12dB)
  - Usa esto para igualar el volumen con el sonido original
  - Aumenta si la música se siente muy silenciosa
  - Disminuye si está muy fuerte

### Visualización

- Gráfico interactivo que muestra cómo está funcionando el efecto
- Indicadores de nivel de volumen fáciles de leer
- Retroalimentación visual para todos los ajustes de parámetros
- Líneas de referencia para ayudar a guiar tus ajustes

### Ajustes Recomendados para Diferentes Escenarios de Escucha
- Escucha Casual de Fondo:
  - Threshold: -24dB
  - Ratio: 2:1
  - Attack: 20ms
  - Release: 200ms
  - Knee: 6dB
- Sesiones de Escucha Crítica:
  - Threshold: -18dB
  - Ratio: 1.5:1
  - Attack: 30ms
  - Release: 300ms
  - Knee: 3dB
- Escucha Nocturna:
  - Threshold: -30dB
  - Ratio: 4:1
  - Attack: 10ms
  - Release: 150ms
  - Knee: 9dB

## Gate

Una puerta de ruido que ayuda a reducir el ruido de fondo no deseado atenuando automáticamente señales que caen por debajo de un umbral específico. Este plugin es particularmente útil para limpiar fuentes de audio con ruido de fondo constante, como ruido de ventilador, zumbido o ruido ambiental de la habitación.

### Características Principales
- Control preciso del umbral para detección exacta de ruido
- Ratio ajustable para reducción de ruido natural o agresiva
- Tiempos de ataque y liberación variables para control óptimo de tiempo
- Opción de knee suave para transiciones suaves
- Medición de reducción de ganancia en tiempo real
- Visualización interactiva de función de transferencia

### Parámetros

- **Threshold** (-96dB a 0dB)
  - Establece el nivel donde comienza la reducción de ruido
  - Las señales por debajo de este nivel serán atenuadas
  - Valores más altos: Reducción de ruido más agresiva
  - Valores más bajos: Efecto más sutil
  - Comienza en -40dB y ajusta según tu piso de ruido

- **Ratio** (1:1 a 100:1)
  - Controla qué tan fuertemente se atenúan las señales por debajo del umbral
  - 1:1: Sin efecto
  - 10:1: Reducción de ruido fuerte
  - 100:1: Silencio casi completo por debajo del umbral
  - Comienza en 10:1 para reducción de ruido típica

- **Attack Time** (0.01ms a 50ms)
  - Qué tan rápido responde la puerta cuando la señal sube por encima del umbral
  - Tiempos más rápidos: Más preciso pero puede sonar abrupto
  - Tiempos más lentos: Transiciones más naturales
  - Prueba 1ms como punto de partida

- **Release Time** (10ms a 2000ms)
  - Qué tan rápido se cierra la puerta cuando la señal cae por debajo del umbral
  - Tiempos más rápidos: Control de ruido más ajustado
  - Tiempos más lentos: Decaimiento más natural
  - Comienza con 200ms para un sonido natural

- **Knee** (0dB a 6dB)
  - Controla qué tan gradualmente transiciona la puerta alrededor del umbral
  - 0dB: Knee duro para puerta precisa
  - 6dB: Knee suave para transiciones más suaves
  - Usa 1dB para reducción de ruido de propósito general

- **Gain** (-12dB a +12dB)
  - Ajusta el nivel de salida después del gating
  - Usa para compensar cualquier pérdida de volumen percibida
  - Típicamente se deja en 0dB a menos que sea necesario

### Retroalimentación Visual
- Gráfico de función de transferencia interactivo mostrando:
  - Relación entrada/salida
  - Punto de umbral
  - Curva de knee
  - Pendiente de ratio
- Medidor de reducción de ganancia en tiempo real mostrando:
  - Cantidad actual de reducción de ruido
  - Retroalimentación visual de actividad de la puerta

### Ajustes Recomendados

#### Reducción de Ruido Ligera
- Threshold: -50dB
- Ratio: 2:1
- Attack: 5ms
- Release: 300ms
- Knee: 3dB
- Gain: 0dB

#### Ruido de Fondo Moderado
- Threshold: -40dB
- Ratio: 10:1
- Attack: 1ms
- Release: 200ms
- Knee: 1dB
- Gain: 0dB

#### Eliminación de Ruido Fuerte
- Threshold: -30dB
- Ratio: 50:1
- Attack: 0.1ms
- Release: 100ms
- Knee: 0dB
- Gain: 0dB

### Consejos de Aplicación
- Establece el threshold justo por encima del piso de ruido para resultados óptimos
- Usa tiempos de release más largos para un sonido más natural
- Agrega algo de knee cuando proceses material complejo
- Monitorea el medidor de reducción de ganancia para asegurar un gating apropiado
- Combina con otros procesadores de dinámica para control integral

## Multiband Compressor

Un procesador de dinámica de grado profesional que divide tu audio en cinco bandas de frecuencia y procesa cada una independientemente. Este plugin es particularmente efectivo para crear ese sonido pulido "estilo radio FM", donde cada parte del espectro de frecuencia está perfectamente controlada y equilibrada.

### Características Principales
- Procesamiento de 5 bandas con frecuencias de cruce ajustables
- Controles de compresión independientes para cada banda
- Ajustes predeterminados optimizados para sonido estilo radio FM
- Visualización en tiempo real de reducción de ganancia por banda
- Filtros de cruce Linkwitz-Riley de alta calidad

### Bandas de Frecuencia
- Banda 1 (Graves): Por debajo de 100 Hz
  - Controla los graves profundos y subfrecuencias
  - Ratio más alto y release más largo para graves controlados y ajustados
- Banda 2 (Medios-Graves): 100-500 Hz
  - Maneja los graves superiores y medios inferiores
  - Compresión moderada para mantener la calidez
- Banda 3 (Medios): 500-2000 Hz
  - Rango crítico de presencia vocal e instrumental
  - Compresión suave para preservar la naturalidad
- Banda 4 (Medios-Agudos): 2000-8000 Hz
  - Controla presencia y aire
  - Compresión ligera con respuesta más rápida
- Banda 5 (Agudos): Por encima de 8000 Hz
  - Gestiona brillo y chispa
  - Tiempos de respuesta rápidos con ratio más alto

### Parámetros (Por Banda)
- **Threshold** (-60dB a 0dB)
  - Establece el nivel donde comienza la compresión
  - Ajustes más bajos crean niveles más consistentes
- **Ratio** (1:1 a 20:1)
  - Controla la cantidad de reducción de ganancia
  - Ratios más altos para control más agresivo
- **Attack** (0.1ms a 100ms)
  - Qué tan rápido responde la compresión
  - Tiempos más rápidos para control de transientes
- **Release** (10ms a 1000ms)
  - Qué tan rápido la ganancia vuelve a la normalidad
  - Tiempos más largos para sonido más suave
- **Knee** (0dB a 12dB)
  - Suavidad del inicio de la compresión
  - Valores más altos para transición más natural
- **Gain** (-12dB a +12dB)
  - Ajuste de nivel de salida por banda
  - Ajuste fino del balance de frecuencias

### Procesamiento Estilo Radio FM
El Multiband Compressor viene con ajustes predeterminados optimizados que recrean el sonido pulido y profesional de la radiodifusión FM:

- Banda Grave (< 100 Hz)
  - Ratio más alto (4:1) para control de graves ajustado
  - Attack/release más lentos para mantener el punch
  - Ligera reducción para prevenir empastamiento

- Banda Media-Grave (100-500 Hz)
  - Compresión moderada (3:1)
  - Tiempos equilibrados para respuesta natural
  - Ganancia neutral para mantener calidez

- Banda Media (500-2000 Hz)
  - Compresión suave (2.5:1)
  - Tiempos de respuesta rápidos
  - Ligero realce para presencia vocal

- Banda Media-Aguda (2000-8000 Hz)
  - Compresión ligera (2:1)
  - Attack/release rápidos
  - Realce de presencia mejorado

- Banda Aguda (> 8000 Hz)
  - Ratio más alto (5:1) para brillo consistente
  - Tiempos de respuesta muy rápidos
  - Reducción controlada para pulido

Esta configuración crea el característico sonido "listo para radio":
- Graves consistentes e impactantes
- Voces claras y frontales
- Dinámica controlada en todas las frecuencias
- Pulido y brillo profesional
- Presencia y claridad mejoradas
- Fatiga auditiva reducida

### Retroalimentación Visual
- Gráficos de función de transferencia interactivos para cada banda
- Medidores de reducción de ganancia en tiempo real
- Visualización de actividad de banda de frecuencia
- Indicadores claros de puntos de cruce

### Consejos de Uso
- Comienza con el preset predeterminado de radio FM
- Ajusta las frecuencias de cruce para que coincidan con tu material
- Ajusta el threshold de cada banda para la cantidad deseada de control
- Usa los controles de ganancia para moldear el balance de frecuencia final
- Monitorea los medidores de reducción de ganancia para asegurar un procesamiento apropiado