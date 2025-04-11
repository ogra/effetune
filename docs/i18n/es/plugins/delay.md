# Plugins de Delay

Una colección de herramientas para ajustar la sincronización de tus señales de audio o añadir repeticiones distintivas. Estos plugins te ayudan a afinar la alineación temporal de tu audio, crear ecos rítmicos o añadir una sensación de espacio y profundidad a tu experiencia auditiva.

## Lista de Plugins

- [Delay](#delay) - Crea ecos con control sobre el tiempo, tono y dispersión estéreo.
- [Modal Resonator](#modal-resonator) - Efecto de resonancia de frecuencia con hasta 5 resonadores
- [Time Alignment](#time-alignment) - Ajustes precisos de tiempo para canales de audio.

## Delay

Este efecto añade ecos distintivos a tu audio. Puedes controlar la rapidez con la que se repiten los ecos, cómo se desvanecen y cómo se dispersan entre tus altavoces, permitiéndote añadir una profundidad sutil, interés rítmico o efectos espaciales creativos a tu reproducción de música.

### Guía de Experiencia Auditiva

- **Profundidad y Espacio Sutiles:**
  - Añade una suave sensación de espacio sin enturbiar el sonido.
  - Puede hacer que las voces o los instrumentos principales se sientan ligeramente más grandes o presentes.
  - Usa tiempos de delay cortos y bajo feedback/mix.
- **Mejora Rítmica:**
  - Crea ecos que se sincronizan con el tempo de la música (ajustado manualmente).
  - Añade ritmo y energía, especialmente a la música electrónica, baterías o guitarras.
  - Experimenta con diferentes tiempos de delay (p. ej., igualando corcheas o negras de oído).
- **Eco Slapback:**
  - Un eco muy corto y único, usado a menudo en voces o guitarras en rock y country.
  - Añade un efecto percusivo de duplicación.
  - Usa tiempos de delay muy cortos (30-120ms), feedback cero y mix moderado.
- **Dispersión Estéreo Creativa:**
  - Usando el control Ping-Pong, los ecos pueden rebotar entre los altavoces izquierdo y derecho.
  - Crea una imagen estéreo más amplia y atractiva.
  - Puede hacer que el sonido se sienta más dinámico e interesante.

### Parámetros

- **Pre-Delay (ms)** - Cuánto tiempo antes de que se escuche el *primer* eco (0 a 100 ms).
  - Valores bajos (0-20ms): El eco comienza casi inmediatamente.
  - Valores altos (20-100ms): Crea un espacio notable antes del eco, separándolo del sonido original.
- **Delay Size (ms)** - El tiempo entre cada eco (1 a 5000 ms).
  - Corto (1-100ms): Crea efectos de engrosamiento o 'slapback'.
  - Medio (100-600ms): Efectos de eco estándar, buenos para la mejora rítmica.
  - Largo (600ms+): Ecos distintivos y muy espaciados.
  - *Consejo:* Intenta seguir el ritmo de la música con los dedos para encontrar un tiempo de delay que se sienta rítmico.
- **Damping (%)** - Controla cuánto se desvanecen las frecuencias altas y bajas con cada eco (0 a 100%).
  - 0%: Los ecos mantienen su tono original (más brillante).
  - 50%: Un desvanecimiento natural y equilibrado.
  - 100%: Los ecos se vuelven significativamente más oscuros y delgados rápidamente (más apagados).
  - Usar junto con High/Low Damp.
- **High Damp (Hz)** - Establece la frecuencia por encima de la cual los ecos comienzan a perder brillo (1000 a 20000 Hz).
  - Valores bajos (p. ej., 2000Hz): Los ecos se oscurecen rápidamente.
  - Valores altos (p. ej., 10000Hz): Los ecos permanecen brillantes por más tiempo.
  - Ajustar con Damping para el control tonal de los ecos.
- **Low Damp (Hz)** - Establece la frecuencia por debajo de la cual los ecos comienzan a perder cuerpo (20 a 1000 Hz).
  - Valores bajos (p. ej., 50Hz): Los ecos retienen más graves.
  - Valores altos (p. ej., 500Hz): Los ecos se vuelven más delgados rápidamente.
  - Ajustar con Damping para el control tonal de los ecos.
- **Feedback (%)** - Cuántos ecos escuchas, o cuánto duran (0 a 99%).
  - 0%: Solo se escucha un eco.
  - 10-40%: Unas pocas repeticiones notables.
  - 40-70%: Colas de ecos más largas y que se desvanecen.
  - 70-99%: Colas muy largas, acercándose a la auto-oscilación (¡usar con cuidado!).
- **Ping-Pong (%)** - Controla cómo rebotan los ecos entre los canales estéreo (0 a 100%). (Solo afecta la reproducción estéreo).
  - 0%: Delay estándar - el eco de la entrada izquierda en la izquierda, el de la derecha en la derecha.
  - 50%: Feedback mono - los ecos se centran entre los altavoces.
  - 100%: Ping-Pong completo - los ecos alternan entre los altavoces izquierdo y derecho.
  - Los valores intermedios crean grados variables de dispersión estéreo.
- **Mix (%)** - Equilibra el volumen de los ecos con el sonido original (0 a 100%).
  - 0%: Sin efecto.
  - 5-15%: Profundidad o ritmo sutil.
  - 15-30%: Ecos claramente audibles (buen punto de partida).
  - 30%+: Efecto más fuerte y pronunciado. El valor predeterminado es 16%.

### Configuraciones Recomendadas para la Mejora Auditiva

1.  **Profundidad Sutil Vocal/Instrumental:**
    - Delay Size: 80-150ms
    - Feedback: 0-15%
    - Mix: 8-16%
    - Ping-Pong: 0% (o prueba 20-40% para una ligera amplitud)
    - Damping: 40-60%
2.  **Mejora Rítmica (Electrónica/Pop):**
    - Delay Size: Intenta igualar el tempo de oído (p. ej., 120-500ms)
    - Feedback: 20-40%
    - Mix: 15-25%
    - Ping-Pong: 0% o 100%
    - Damping: Ajusta al gusto (más bajo para repeticiones más brillantes)
3.  **Slapback Rock Clásico (Guitarras/Voces):**
    - Delay Size: 50-120ms
    - Feedback: 0%
    - Mix: 15-30%
    - Ping-Pong: 0%
    - Damping: 20-40%
4.  **Ecos Estéreo Amplios (Ambient/Pads):**
    - Delay Size: 300-800ms
    - Feedback: 40-60%
    - Mix: 20-35%
    - Ping-Pong: 70-100%
    - Damping: 50-70% (para colas más suaves)

### Guía de Inicio Rápido

1.  **Establecer el Tiempo:**
    - Comienza con `Delay Size` para establecer el ritmo principal del eco.
    - Ajusta `Feedback` para controlar cuántos ecos escuchas.
    - Usa `Pre-Delay` si quieres un espacio antes del primer eco.
2.  **Ajustar el Tono:**
    - Usa `Damping`, `High Damp` y `Low Damp` juntos para dar forma a cómo suenan los ecos mientras se desvanecen. Comienza con Damping alrededor del 50% y ajusta las frecuencias de Damp.
3.  **Posición en Estéreo (Opcional):**
    - Si escuchas en estéreo, experimenta con `Ping-Pong` para controlar la amplitud de los ecos.
4.  **Mezclar:**
    - Usa `Mix` para equilibrar el volumen del eco con la música original. Comienza bajo (alrededor del 16%) y aumenta hasta que el efecto se sienta bien.

---

## Modal Resonator

Un efecto creativo que añade frecuencias resonantes a tu audio. Este plugin crea resonancias afinadas en frecuencias específicas, similar a cómo los objetos físicos vibran en sus frecuencias resonantes naturales. Es perfecto para añadir características tonales únicas, simular las propiedades resonantes de diferentes materiales o crear efectos especiales.

### Guía de Experiencia Auditiva

- **Resonancia Metálica:**
  - Crea tonos metálicos o similares a campanas que siguen la dinámica del material fuente.
  - Útil para añadir brillo o un carácter metálico a percusión, sintetizadores o mezclas completas.
  - Usa múltiples resonadores en frecuencias cuidadosamente afinadas con tiempos de decaimiento moderados.
- **Mejora Tonal:**
  - Refuerza sutilmente frecuencias específicas en la música.
  - Puede acentuar armónicos o añadir cuerpo a rangos de frecuencia específicos.
  - Úsalo con valores bajos de mix (10-20%) para una mejora sutil.
- **Simulación de Altavoz de Rango Completo:**
  - Simula el comportamiento modal de los altavoces físicos.
  - Recrea las resonancias distintivas que ocurren cuando los drivers dividen sus vibraciones en diferentes frecuencias.
  - Ayuda a simular el sonido característico de tipos específicos de altavoces.
- **Efectos Especiales:**
  - Crea cualidades tímbricas inusuales y texturas de otro mundo.
  - Excelente para diseño de sonido y procesamiento experimental.
  - Prueba configuraciones extremas para una transformación sonora creativa.

### Parámetros

- **Resonator Selection (1-5)** - Cinco resonadores independientes que pueden ser habilitados/deshabilitados y configurados por separado.
  - Usa múltiples resonadores para efectos de resonancia complejos y en capas.
  - Cada resonador puede apuntar a diferentes regiones de frecuencia.
  - Prueba relaciones armónicas entre resonadores para resultados más musicales.

Para cada resonador:

- **Enable** - Activa/desactiva el resonador individual.
  - Permite la habilitación selectiva de resonancias de frecuencia específicas.
  - Útil para pruebas A/B de diferentes combinaciones de resonadores.

- **Freq (Hz)** - Establece la frecuencia resonante primaria (20 a 20,000 Hz).
  - Frecuencias bajas (20-200 Hz): Añade cuerpo y resonancias fundamentales.
  - Frecuencias medias (200-2000 Hz): Añade presencia y carácter tonal.
  - Frecuencias altas (2000+ Hz): Crea cualidades metálicas, similares a campanas.
  - *Consejo:* Para aplicaciones musicales, intenta afinar los resonadores a notas de la escala musical o a armónicos de la frecuencia fundamental.

- **Decay (ms)** - Controla cuánto tiempo continúa la resonancia después del sonido de entrada (1 a 500 ms).
  - Corto (1-50ms): Resonancias rápidas y percusivas.
  - Medio (50-200ms): Resonancias de sonido natural similares a objetos pequeños de metal o madera.
  - Largo (200-500ms): Resonancias sostenidas, similares a campanas.
  - *Nota:* Las frecuencias más altas decaen automáticamente más rápido que las frecuencias más bajas para un sonido natural.

- **LPF Freq (Hz)** - Filtro paso bajo que da forma al tono de la resonancia (20 a 20,000 Hz).
  - Valores bajos: Resonancias más oscuras y apagadas.
  - Valores altos: Resonancias más brillantes y presentes.
  - Ajusta para controlar el contenido armónico de la resonancia.

- **Mix (%)** - Equilibra el volumen de las resonancias con el sonido original (0 a 100%).
  - 0%: Sin efecto.
  - 5-25%: Mejora sutil.
  - 25-50%: Mezcla equilibrada de sonidos originales y resonantes.
  - 50-100%: Las resonancias se vuelven más dominantes que el sonido original.

### Configuraciones Recomendadas para la Mejora Auditiva

1. **Mejora Sutil de Altavoz:**
   - Habilitar 2-3 resonadores
   - Configuraciones de Freq: 400 Hz, 900 Hz, 1600 Hz
   - Decay: 60-100ms
   - LPF Freq: 2000-4000 Hz
   - Mix: 10-20%

2. **Carácter Metálico:**
   - Habilitar 3-5 resonadores
   - Configuraciones de Freq: distribuidas entre 1000-6500 Hz
   - Decay: 100-200ms
   - LPF Freq: 4000-8000 Hz
   - Mix: 15-30%

3. **Mejora de Graves:**
   - Habilitar 1-2 resonadores
   - Configuraciones de Freq: 50-150 Hz
   - Decay: 50-100ms
   - LPF Freq: 1000-2000 Hz
   - Mix: 10-25%

4. **Simulación de Altavoz de Rango Completo:**
   - Habilitar los 5 resonadores
   - Configuraciones de Freq: 100 Hz, 400 Hz, 800 Hz, 1600 Hz, 3000 Hz
   - Decay: Progresivamente más corto de bajo a alto (100ms a 30ms)
   - LPF Freq: Progresivamente más alto de bajo a alto (2000Hz a 4000Hz)
   - Mix: 20-40%

### Guía de Inicio Rápido

1. **Elegir Puntos de Resonancia:**
   - Comienza habilitando uno o dos resonadores.
   - Establece sus frecuencias para apuntar a las áreas que deseas mejorar.
   - Para efectos más complejos, añade más resonadores con frecuencias complementarias.

2. **Ajustar el Carácter:**
   - Usa el parámetro `Decay` para controlar cuánto tiempo se sostienen las resonancias.
   - Da forma al tono con el control `LPF Freq`.
   - Tiempos de decaimiento más largos crean tonos más obvios, similares a campanas.

3. **Mezclar con el Original:**
   - Usa `Mix` para equilibrar el efecto con tu material fuente.
   - Comienza con valores de mix bajos (10-20%) para una mejora sutil.
   - Aumenta para efectos más dramáticos.

4. **Afinar:**
   - Realiza pequeños ajustes a las frecuencias y tiempos de decaimiento.
   - Habilita/deshabilita resonadores individuales para encontrar la combinación perfecta.
   - Recuerda que cambios sutiles pueden tener un impacto significativo en el sonido general.

---

## Time Alignment

Una herramienta de precisión que te permite ajustar la sincronización de los canales de audio con precisión de milisegundos. Perfecto para corregir problemas de fase o crear efectos estéreo específicos.

### Cuándo Usar
- Corregir la alineación de fase entre canales estéreo
- Compensar las diferencias de distancia de los altavoces
- Afinar la imagen estéreo
- Corregir desajustes de tiempo en grabaciones

### Parámetros
- **Delay** - Controla el tiempo de delay (0 a 100ms)
  - 0ms: Sin delay (tiempo original)
  - Valores altos: Mayor delay
  - Ajustes finos para un control preciso
- **Channel** - Selecciona qué canal retrasar
  - All: Afecta a ambos canales
  - Left: Solo retrasa el canal izquierdo
  - Right: Solo retrasa el canal derecho

### Usos Recomendados

1. Alineación de Altavoces
   - Compensar diferentes distancias de altavoces
   - Igualar la sincronización entre monitores
   - Ajustar a la acústica de la sala

2. Corrección de Grabación
   - Corregir problemas de fase entre micrófonos
   - Alinear múltiples fuentes de audio
   - Corregir discrepancias de tiempo

3. Efectos Creativos
   - Crear una sutil ampliación estéreo
   - Diseñar efectos espaciales
   - Experimentar con la sincronización de canales

Recuerda: El objetivo es mejorar tu disfrute auditivo. Experimenta con los controles para encontrar sonidos que añadan interés y profundidad a tu música favorita sin sobrecargarla.
