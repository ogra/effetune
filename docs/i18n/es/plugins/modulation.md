# Modulation Plugins

Una colección de plugins que añaden movimiento y variación a tu música mediante efectos de modulación. Estos efectos pueden hacer que tu música digital se sienta más orgánica y dinámica, mejorando tu experiencia auditiva con variaciones sutiles o dramáticas en el sonido.

## Lista de Plugins

- [Tremolo](#tremolo) - Crea variaciones rítmicas en el volumen para un sonido pulsante y dinámico
- [Wow Flutter](#wow-flutter) - Recrea las sutiles variaciones de tono de los discos de vinilo y reproductores de casetes

## Tremolo

Un efecto que añade variaciones rítmicas en el volumen a tu música, similar al sonido pulsante que se encuentra en amplificadores vintage y grabaciones clásicas. Esto crea una cualidad dinámica y expresiva que aporta movimiento e interés a tu experiencia auditiva.

### Guía de Experiencia Auditiva
- Experiencia de Amplificador Clásico:
  - Recrea el icónico sonido pulsante de los amplificadores de válvulas vintage
  - Añade movimiento rítmico a grabaciones estáticas
  - Crea una experiencia auditiva hipnótica y cautivadora
- Carácter de Grabación Vintage:
  - Simula los efectos de tremolo naturales usados en grabaciones clásicas
  - Aporta carácter vintage y calidez
  - Perfecto para escuchar jazz, blues y rock
- Ambiente Creativo:
  - Crea aumentos y disminuciones dramáticas
  - Añade intensidad emocional a la música
  - Perfecto para música ambiental y de atmósfera

### Parámetros
- **Rate** - La velocidad a la que cambia el volumen (0.1 a 20 Hz)
  - Más lento (0.1-2 Hz): Pulsación suave y sutil
  - Medio (2-6 Hz): Efecto de tremolo clásico
  - Más rápido (6-20 Hz): Efectos dramáticos y entrecortados
- **Depth** - La magnitud del cambio de volumen (0 a 12 dB)
  - Sutil (0-3 dB): Variaciones suaves de volumen
  - Medio (3-6 dB): Efecto de pulsación notable
  - Fuerte (6-12 dB): Incrementos dramáticos de volumen
- **Ch Phase** - Diferencia de fase entre los canales estéreo (-180 a 180 grados)
  - 0°: Ambos canales pulsan juntos (tremolo mono)
  - 90° o -90°: Crea un efecto giratorio y remolinado
  - 180° o -180°: Los canales pulsan en direcciones opuestas (anchura estéreo máxima)
- **Randomness** - Qué tan irregulares se vuelven los cambios de volumen (0 a 96 dB)
  - Bajo: Pulsaciones más predecibles y regulares
  - Medio: Variación vintage natural
  - Alto: Sonido más inestable y orgánico
- **Randomness Cutoff** - La rapidez con la que ocurren los cambios aleatorios (1 a 1000 Hz)
  - Más bajo: Variaciones aleatorias más lentas y suaves
  - Más alto: Cambios más rápidos y erráticos
- **Ch Sync** - Cuán sincronizados están los cambios aleatorios entre los canales (0 a 100%)
  - 0%: Cada canal tiene una aleatoriedad independiente
  - 50%: Sincronización parcial entre canales
  - 100%: Ambos canales comparten el mismo patrón de aleatoriedad

### Configuraciones Recomendadas para Diferentes Estilos

1. Classic Guitar Amp Tremolo
   - Rate: 4-6 Hz (velocidad media)
   - Depth: 6-8 dB
   - Ch Phase: 0° (mono)
   - Randomness: 0-5 dB
   - Perfect for: Blues, Rock, Surf Music

2. Stereo Psychedelic Effect
   - Rate: 2-4 Hz
   - Depth: 4-6 dB
   - Ch Phase: 180° (canales opuestos)
   - Randomness: 10-20 dB
   - Perfect for: Rock psicodélico, Electrónica, Experimental

3. Subtle Enhancement
   - Rate: 1-2 Hz
   - Depth: 2-3 dB
   - Ch Phase: 0-45°
   - Randomness: 5-10 dB
   - Perfect for: Cualquier música que requiera un movimiento sutil

4. Dramatic Pulsing
   - Rate: 8-12 Hz
   - Depth: 8-12 dB
   - Ch Phase: 90°
   - Randomness: 20-30 dB
   - Perfect for: Electrónica, Dance, Ambient

### Guía Rápida de Inicio

1. Para un sonido clásico de Tremolo:
   - Comienza con un Rate medio (4-5 Hz)
   - Añade un Depth moderado (6 dB)
   - Configura Ch Phase en 0° para mono o 90° para movimiento estéreo
   - Mantén Randomness bajo (0-5 dB)
   - Ajusta según tu preferencia

2. Para mayor carácter:
   - Incrementa Randomness gradualmente
   - Experimenta con diferentes configuraciones de Ch Phase
   - Prueba distintas combinaciones de Rate y Depth
   - Confía en tu oído

## Wow Flutter

Un efecto que añade sutiles variaciones en el tono a tu música, similar al sonido de fluctuación natural que podrías recordar de los discos de vinilo o casetes. Esto crea una sensación cálida y nostálgica que muchas personas encuentran agradable y relajante.

### Guía de Experiencia Auditiva
- Experiencia de Disco de Vinilo:
  - Recrea la suave fluctuación de los tocadiscos
  - Añade un movimiento orgánico al sonido
  - Crea una atmósfera acogedora y nostálgica
- Recuerdo de Casete:
  - Simula el característico flutter de las grabadoras de casetes
  - Aporta el carácter de las grabadoras vintage
  - Perfecto para ambientes lo-fi y retro
- Ambiente Creativo:
  - Crea efectos oníricos, como si estuvieras bajo el agua
  - Añade movimiento y vitalidad a sonidos estáticos
  - Perfecto para escuchar ambient y experimental

### Parámetros
- **Rate** - La velocidad a la que fluctúa el sonido (0.1 a 20 Hz)
  - Más lento (0.1-2 Hz): Movimiento similar al de un disco de vinilo
  - Medio (2-6 Hz): Flutter similar al de un casete
  - Más rápido (6-20 Hz): Efectos creativos
- **Depth** - La magnitud del cambio de tono (0 a 40 ms)
  - Sutil (0-10 ms): Carácter vintage suave
  - Medio (10-20 ms): Sensación clásica de casete/vinilo
  - Fuerte (20-40 ms): Efectos dramáticos
- **Ch Phase** - Diferencia de fase entre canales estéreo (-180 a 180 grados)
  - 0°: Ambos canales fluctúan juntos
  - 90° o -90°: Crea un efecto giratorio y remolinado
  - 180° o -180°: Los canales fluctúan en direcciones opuestas
- **Randomness** - Qué tan irregular se vuelve la fluctuación (0 a 40 ms)
  - Bajo: Movimiento más predecible y regular
  - Medio: Variación vintage natural
  - Alto: Sonido más inestable, como de equipo desgastado
- **Randomness Cutoff** - La velocidad a la que ocurren los cambios aleatorios (0.1 a 20 Hz)
  - Más bajo: Cambios más lentos y suaves
  - Más alto: Cambios más rápidos y erráticos
- **Ch Sync** - Cuán sincronizados están los cambios aleatorios entre los canales (0 a 100%)
  - 0%: Cada canal tiene una aleatoriedad independiente
  - 50%: Sincronización parcial entre los canales
  - 100%: Ambos canales comparten el mismo patrón de aleatoriedad

### Configuraciones Recomendadas para Diferentes Estilos

1. Classic Vinyl Experience
   - Rate: 0.5-1 Hz (movimiento lento y suave)
   - Depth: 15-20 ms
   - Randomness: 10-15 ms
   - Ch Phase: 0°
   - Ch Sync: 100%
   - Perfect for: Jazz, Clásica, Vintage Rock

2. Retro Cassette Feel
   - Rate: 4-5 Hz (flutter más rápido)
   - Depth: 10-15 ms
   - Randomness: 15-20 ms
   - Ch Phase: 0-45°
   - Ch Sync: 80-100%
   - Perfect for: Lo-Fi, Pop, Rock

3. Dreamy Atmosphere
   - Rate: 1-2 Hz
   - Depth: 25-30 ms
   - Randomness: 20-25 ms
   - Ch Phase: 90-180°
   - Ch Sync: 50-70%
   - Perfect for: Ambient, Electronic, Experimental

4. Subtle Enhancement
   - Rate: 2-3 Hz
   - Depth: 5-10 ms
   - Randomness: 5-10 ms
   - Ch Phase: 0°
   - Ch Sync: 100%
   - Perfect for: Cualquier música que requiera un carácter vintage sutil

### Guía Rápida de Inicio

1. Para un sonido vintage natural:
   - Comienza con un Rate lento (1 Hz)
   - Añade un Depth moderado (15 ms)
   - Incluye algo de Randomness (10 ms)
   - Mantén Ch Phase en 0° y Ch Sync en 100%
   - Ajusta a tu gusto

2. Para mayor carácter:
   - Incrementa Depth gradualmente
   - Añade más Randomness
   - Experimenta con diferentes configuraciones de Ch Phase
   - Reduce Ch Sync para obtener más variación estéreo
   - Confía en tus oídos

Recuerda: El objetivo es añadir un agradable carácter vintage a tu música. Comienza de manera sutil y ajusta hasta encontrar el punto óptimo que realce tu experiencia auditiva!
