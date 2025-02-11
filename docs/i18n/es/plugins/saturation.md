# Plugins de Saturación

Una colección de plugins que agregan calidez y carácter a tu música. Estos efectos pueden hacer que la música digital suene más analógica y agregar una agradable riqueza al sonido, similar a cómo el equipo de audio vintage colorea el sonido.

## Lista de Plugins

- [Hard Clipping](#hard-clipping) - Agrega intensidad y borde al sonido
- [Multiband Saturation](#multiband-saturation) - Moldea y mejora diferentes rangos de frecuencia independientemente
- [Saturation](#saturation) - Agrega calidez y riqueza como equipo vintage

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
- **Enabled** - Activa o desactiva el efecto

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
- **Enabled** - Activa o desactiva el efecto

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