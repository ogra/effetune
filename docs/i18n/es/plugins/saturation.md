# Plugins de Saturación

Una colección de plugins que agregan calidez y carácter a tu música. Estos efectos pueden hacer que la música digital suene más analógica y agregar una agradable riqueza al sonido, similar a cómo el equipo de audio vintage colorea el sonido.

## Lista de Plugins

- [Hard Clipping](#hard-clipping) - Agrega intensidad y borde al sonido
- [Intermodulator](#intermodulator) - Añade un carácter único a través de la distorsión de intermodulación armónica
- [Multiband Saturation](#multiband-saturation) - Moldea y mejora diferentes rangos de frecuencia independientemente
- [Saturation](#saturation) - Agrega calidez y riqueza como equipo vintage
- [Sub Synth](#sub-synth) - Genera y mezcla señales subarmónicas para mejorar los graves

## Hard Clipping

Un efecto que puede agregar desde calidez sutil hasta carácter intenso a tu música. Funciona moldeando suave o agresivamente las ondas sonoras, creando desde mejoras sutiles hasta efectos dramáticos.

### Guía de Mejora de Escucha
- Mejora Sutil:
  - Hace que la música digital suene ligeramente más cálida
  - Agrega una suave cualidad "tipo analógica"
  - Mantiene la claridad mientras reduce la dureza
- Efecto Moderado:
  - Crea un sonido más enérgico
  - Agrega emoción a elementos rítmicos
  - Hace que la música se sienta más "impulsada"
- Efecto Creativo:
  - Crea transformaciones dramáticas del sonido
  - Agrega carácter agresivo a la música
  - Perfecto para escucha experimental

### Parámetros
- **Threshold** - Controla cuánto del sonido es afectado (-60dB a 0dB)
  - Valores más altos (-6dB a 0dB): Calidez sutil
  - Valores medios (-24dB a -6dB): Carácter notable
  - Valores más bajos (-60dB a -24dB): Efecto dramático
- **Mode** - Elige qué partes del sonido afectar
  - Both Sides: Efecto equilibrado y natural
  - Positive Only: Sonido más brillante y agresivo
  - Negative Only: Carácter más oscuro y único

### Visualización
- Gráfico en tiempo real mostrando cómo se está moldeando el sonido
- Retroalimentación visual clara al ajustar configuraciones
- Líneas de referencia para ayudar a guiar tus ajustes

### Consejos de Escucha
- Para mejora sutil:
  1. Comienza con un Threshold alto (-6dB)
  2. Usa modo "Both Sides"
  3. Escucha la calidez agregada
- Para efectos creativos:
  1. Baja el Threshold gradualmente
  2. Prueba diferentes Modos
  3. Combina con otros efectos para sonidos únicos

## Intermodulator

El plugin Intermodulator introduce un efecto de distorsión de intermodulación armónica que va más allá de la saturación tradicional. Al inyectar intencionalmente componentes armónicos controlados, crea interacciones complejas que enriquecen tu sonido con nuevas texturas y un carácter dinámico.

### Guía para la Mejora Auditiva
- **Efecto Sutil:**
  - Añade una capa suave de calidez armónica
  - Realza el tono natural sin sobrecargar la señal original
  - Ideal para añadir una sutil profundidad similar a la analógica
- **Efecto Moderado:**
  - Enfatiza armónicos definidos para otorgar un carácter más pronunciado
  - Aporta claridad y brillo a diversos elementos musicales
  - Adecuado para géneros que requieren un sonido equilibrado pero enriquecido
- **Efecto Agresivo:**
  - Intensifica múltiples armónicos para crear una distorsión rica y compleja
  - Proporciona posibilidades creativas de diseño sonoro para pistas experimentales
  - Perfecto para agregar texturas atrevidas y poco convencionales

### Parámetros
- **2nd Harm (%):** Controla la cantidad del segundo armónico añadido (0–30%, defecto: 2%)
  - Valores más bajos generan una calidez sutil, mientras que valores más altos acentúan claramente el segundo armónico.
- **3rd Harm (%):** Ajusta la contribución del tercer armónico (0–30%, defecto: 3%)
  - Realza la claridad y añade brillo, dotando al sonido de un carácter más vibrante.
- **4th Harm (%):** Modifica la intensidad del cuarto armónico (0–30%, defecto: 0.5%)
  - Introduce un detalle delicado al perfil armónico general.
- **5th Harm (%):** Establece el nivel del quinto armónico (0–30%, defecto: 0.3%)
  - Añade una complejidad matizada, contribuyendo a un tono estratificado y texturizado.
- **Sensitivity (x):** Ajusta la sensibilidad general de entrada (0.1–2.0, defecto: 0.5)
  - Una sensibilidad más baja proporciona un efecto más sutil, mientras que una sensibilidad más alta aumenta la intensidad de la distorsión.

### Visualización
- Visualización en tiempo real de la interacción armónica y la curva de distorsión
- Controles deslizantes e campos de entrada intuitivos que ofrecen retroalimentación inmediata
- Gráfico dinámico que muestra los cambios en el contenido armónico a medida que se ajustan los parámetros

### Guía de Inicio Rápido
1. **Inicialización:** Comienza con la configuración predeterminada (2nd: 2%, 3rd: 3%, 4th: 0.5%, 5th: 0.3%, Sensitivity: 0.5)
2. **Ajusta los Parámetros:** Utiliza la retroalimentación en tiempo real para ajustar finamente cada nivel armónico según tu contexto musical
3. **Mezcla Tu Sonido:** Equilibra el efecto utilizando Sensitivity para lograr una calidez sutil o una distorsión pronunciada

## Multiband Saturation

Un efecto versátil que te permite agregar calidez y carácter a rangos de frecuencia específicos de tu música. Al dividir el sonido en bandas bajas, medias y altas, puedes moldear cada rango independientemente para una mejora precisa del sonido.

### Guía de Mejora de Escucha
- Mejora de Graves:
  - Agrega calidez y punch a las frecuencias bajas
  - Perfecto para mejorar bajos y bombos
  - Crea graves más llenos y ricos
- Moldeado de Medios:
  - Resalta el cuerpo de voces e instrumentos
  - Agrega presencia a guitarras y teclados
  - Crea un sonido más claro y definido
- Mejora de Agudos:
  - Agrega brillo a platillos y hi-hats
  - Mejora el aire y la brillantez
  - Crea agudos nítidos y detallados

### Parámetros
- **Frecuencias de Crossover**
  - Freq 1 (20Hz-2kHz): Define dónde termina la banda baja y comienza la media
  - Freq 2 (200Hz-20kHz): Define dónde termina la banda media y comienza la alta
- **Controles de Banda** (para cada banda Baja, Media y Alta):
  - **Drive** (0.0-10.0): Controla la intensidad de saturación
    - Ligero (0.0-3.0): Mejora sutil
    - Medio (3.0-6.0): Calidez notable
    - Alto (6.0-10.0): Carácter fuerte
  - **Bias** (-0.3 a 0.3): Ajusta la simetría de la curva de saturación
    - Negativo: Enfatiza picos negativos
    - Cero: Saturación simétrica
    - Positivo: Enfatiza picos positivos
  - **Mix** (0-100%): Mezcla el efecto con el original
    - Bajo (0-30%): Mejora sutil
    - Medio (30-70%): Efecto equilibrado
    - Alto (70-100%): Carácter fuerte
  - **Gain** (-18dB a +18dB): Ajusta el volumen de la banda
    - Usado para equilibrar las bandas entre sí
    - Compensa cambios de volumen

### Visualización
- Pestañas interactivas de selección de banda
- Gráfico de curva de transferencia en tiempo real para cada banda
- Retroalimentación visual clara al ajustar configuraciones

### Consejos de Mejora Musical
- Para Mejora Global del Mix:
  1. Comienza con Drive suave (2.0-3.0) en todas las bandas
  2. Mantén Bias en 0.0 para saturación natural
  3. Ajusta Mix alrededor de 40-50% para mezcla natural
  4. Afina el Gain para cada banda

- Para Mejora de Graves:
  1. Concéntrate en la banda baja
  2. Usa Drive moderado (3.0-5.0)
  3. Mantén Bias neutral para respuesta consistente
  4. Mantén Mix alrededor de 50-70%

- Para Mejora de Voces:
  1. Concéntrate en la banda media
  2. Usa Drive ligero (1.0-3.0)
  3. Mantén Bias en 0.0 para sonido natural
  4. Ajusta Mix al gusto (30-50%)

- Para Agregar Brillo:
  1. Concéntrate en la banda alta
  2. Usa Drive suave (1.0-2.0)
  3. Mantén Bias neutral para saturación limpia
  4. Mantén Mix sutil (20-40%)

### Guía de Inicio Rápido
1. Ajusta frecuencias de crossover para dividir tu sonido
2. Comienza con valores bajos de Drive en todas las bandas
3. Mantén inicialmente Bias en 0.0
4. Usa Mix para mezclar el efecto naturalmente
5. Afina con controles de Gain
6. ¡Confía en tus oídos y ajusta a gusto!

## Saturation

Un efecto que simula el sonido cálido y agradable del equipo de válvulas vintage. Puede agregar riqueza y carácter a tu música, haciéndola sonar más "analógica" y menos "digital".

### Guía de Mejora de Escucha
- Agregando Calidez:
  - Hace que la música digital suene más natural
  - Agrega riqueza agradable al sonido
  - Perfecto para jazz y música acústica
- Carácter Rico:
  - Crea un sonido más "vintage"
  - Agrega profundidad y dimensión
  - Genial para rock y música electrónica
- Efecto Fuerte:
  - Transforma el sonido dramáticamente
  - Crea tonos audaces y con carácter
  - Ideal para escucha experimental

### Parámetros
- **Drive** - Controla la cantidad de calidez y carácter (0.0 a 10.0)
  - Ligero (0.0-3.0): Calidez analógica sutil
  - Medio (3.0-6.0): Carácter vintage rico
  - Fuerte (6.0-10.0): Efecto audaz y dramático
- **Bias** - Ajusta la simetría de la curva de saturación (-0.3 a 0.3)
  - 0.0: Saturación simétrica
  - Positivo: Enfatiza picos positivos
  - Negativo: Enfatiza picos negativos
- **Mix** - Equilibra el efecto con el sonido original (0% a 100%)
  - 0-30%: Mejora sutil
  - 30-70%: Efecto equilibrado
  - 70-100%: Carácter fuerte
- **Gain** - Ajusta el volumen general (-18dB a +18dB)
  - Usa valores negativos si el efecto está muy fuerte
  - Usa valores positivos si el efecto está muy suave

### Visualización
- Gráfico claro mostrando cómo se está moldeando el sonido
- Retroalimentación visual en tiempo real
- Controles fáciles de leer

### Consejos de Mejora Musical
- Clásica y Jazz:
  - Drive ligero (1.0-2.0) para calidez natural
  - Mantén Bias en 0.0 para saturación limpia
  - Mix bajo (20-40%) para sutileza
- Rock y Pop:
  - Drive medio (3.0-5.0) para carácter rico
  - Mantén Bias neutral para respuesta consistente
  - Mix medio (40-60%) para balance
- Electrónica:
  - Drive más alto (4.0-7.0) para efecto audaz
  - Experimenta con diferentes valores de Bias
  - Mix más alto (60-80%) para carácter

### Guía de Inicio Rápido
1. Comienza con Drive bajo para calidez suave
2. Mantén inicialmente Bias en 0.0
3. Ajusta Mix para equilibrar el efecto
4. Ajusta Gain si es necesario para volumen adecuado
5. ¡Experimenta y confía en tus oídos!

## Sub Synth

Un efecto especializado que mejora los graves de tu música mediante la generación y mezcla de señales subarmónicas. Perfecto para agregar profundidad y potencia a grabaciones con pocos graves o crear sonidos graves ricos y corpulentos.

### Guía de Mejora de Escucha
- Mejora de Graves:
  - Agrega profundidad y potencia a grabaciones delgadas
  - Crea graves más llenos y ricos
  - Perfecto para escucha con auriculares
- Control de Frecuencia:
  - Control preciso sobre frecuencias subarmónicas
  - Filtrado independiente para graves limpios
  - Mantiene la claridad mientras agrega potencia

### Parámetros
- **Sub Level** - Controla el nivel de la señal subarmónica (0-200%)
  - Ligero (0-50%): Mejora sutil de graves
  - Medio (50-100%): Refuerzo equilibrado de graves
  - Alto (100-200%): Efecto dramático de graves
- **Dry Level** - Ajusta el nivel de la señal original (0-200%)
  - Usado para equilibrar con la señal subarmónica
  - Mantiene la claridad del sonido original
- **Sub LPF** - Filtro paso bajo para señal subarmónica (5-400Hz)
  - Frecuencia: Controla el límite superior del sub
  - Pendiente: Ajusta la pendiente del filtro (Off a -24dB/oct)
- **Sub HPF** - Filtro paso alto para señal subarmónica (5-400Hz)
  - Frecuencia: Elimina retumbe no deseado
  - Pendiente: Controla la pendiente del filtro (Off a -24dB/oct)
- **Dry HPF** - Filtro paso alto para señal original (5-400Hz)
  - Frecuencia: Previene acumulación de graves
  - Pendiente: Ajusta la pendiente del filtro (Off a -24dB/oct)

### Visualización
- Gráfico interactivo de respuesta en frecuencia
- Visualización clara de curvas de filtro
- Retroalimentación visual en tiempo real

### Consejos de Mejora Musical
- Para Mejora General de Graves:
  1. Comienza con Sub Level al 50%
  2. Ajusta Sub LPF alrededor de 100Hz (-12dB/oct)
  3. Mantén Sub HPF en 20Hz (-6dB/oct)
  4. Ajusta Dry Level a gusto

- Para Refuerzo Limpio de Graves:
  1. Ajusta Sub Level a 70-100%
  2. Usa Sub LPF en 80Hz (-18dB/oct)
  3. Ajusta Sub HPF a 30Hz (-12dB/oct)
  4. Activa Dry HPF en 40Hz

- Para Máximo Impacto:
  1. Aumenta Sub Level a 150%
  2. Ajusta Sub LPF a 120Hz (-24dB/oct)
  3. Mantén Sub HPF en 15Hz (-6dB/oct)
  4. Equilibra con Dry Level

### Guía de Inicio Rápido
1. Comienza con Sub Level moderado (50-70%)
2. Ajusta Sub LPF alrededor de 100Hz
3. Activa Sub HPF alrededor de 20Hz
4. Ajusta Dry Level para equilibrio
5. Afina filtros a gusto
6. ¡Confía en tus oídos y ajusta gradualmente!
