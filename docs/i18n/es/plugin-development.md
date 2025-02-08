# Guía de Desarrollo de Plugins

Esta guía explica cómo crear nuevos plugins para Frieve EffeTune.

## Estructura Básica

Todos los plugins deben extender la clase `PluginBase` e implementar sus métodos principales. Cada método tiene responsabilidades y consideraciones de tiempo específicas:

### Responsabilidades de las Funciones

1. **constructor**
   - Cuándo: Se ejecuta una vez cuando se crea la instancia del plugin
   - Función:
     * Establecer información básica (nombre, descripción mediante super())
     * Inicializar parámetros con valores predeterminados (por ejemplo, this.gain = 1.0)
     * Inicializar variables de estado (buffers, arrays, etc.)
     * Registrar función de procesamiento (registerProcessor)
   - Notas:
     * No crear UI ni configurar event listeners aquí
     * Evitar operaciones pesadas de inicialización

2. **registerProcessor**
   - Cuándo: Se llama desde el constructor para registrar la función de procesamiento con Audio Worklet
   - Función:
     * Definir función de procesamiento de audio
     * Verificar inicialización del estado del contexto
     * Manejar verificación del estado habilitado y omitir procesamiento
   - Notas:
     * Siempre verificar el estado habilitado primero
     * Inicializar contexto solo cuando sea necesario
     * Restablecer estado cuando cambia el número de canales

3. **process**
   - Cuándo: Se llama periódicamente durante el procesamiento del buffer de audio
   - Función:
     * Validar mensajes y buffers
     * Verificar estado habilitado (retorno temprano si está deshabilitado)
     * Ejecutar procesamiento de audio (solo si enabled=true)
     * Actualizar estado para actualizaciones de UI
   - Notas:
     * Continuar actualizaciones de UI independientemente del estado habilitado
     * Evitar operaciones pesadas de procesamiento

4. **cleanup**
   - Cuándo: Se llama cuando el plugin está deshabilitado o se elimina
   - Función:
     * Cancelar frames de animación
     * Eliminar event listeners
     * Liberar recursos temporales
   - Notas:
     * No detener actualizaciones de UI
     * Mantener variables de estado
     * Realizar solo limpieza mínima

Aquí está la estructura básica de un plugin:

```javascript
class MyPlugin extends PluginBase {
    constructor() {
        super('Plugin Name', 'Plugin Description');
        
        // Inicializar parámetros del plugin
        this.myParameter = 0;

        // Registrar la función de procesamiento de audio
        this.registerProcessor(`
            // Tu código de procesamiento de audio aquí
            // Esto se ejecuta en el Audio Worklet
            return data;
        `);
    }

    // Obtener parámetros actuales (requerido)
    getParameters() {
        return {
            type: this.constructor.name,
            myParameter: this.myParameter,
            enabled: this.enabled
        };
    }

    // Crear elementos UI (requerido)
    createUI() {
        const container = document.createElement('div');
        // Agregar tus elementos UI aquí
        return container;
    }
}

// Registrar el plugin globalmente
window.MyPlugin = MyPlugin;
```

## Componentes Clave

### 1. Constructor
- Llamar a `super()` con el nombre y descripción del plugin
- Inicializar parámetros del plugin con valores predeterminados
- Inicializar variables de estado (por ejemplo, buffers, arrays) con tamaños apropiados
- Registrar la función de procesamiento de audio usando `this.registerProcessor()`
- Ejemplo:
  ```javascript
  constructor() {
      super('My Plugin', 'Description');
      
      // Inicializar parámetros con valores predeterminados
      this.gain = 1.0;
      
      // Inicializar variables de estado
      this.buffer = new Float32Array(1024);
      this.lastProcessTime = performance.now() / 1000;
      
      // Registrar procesador
      this.registerProcessor(`...`);
  }
  ```

### 2. Función de Procesamiento de Audio

La función de procesamiento de audio se ejecuta en el contexto de Audio Worklet y recibe estos parámetros:
- `data`: Float32Array que contiene muestras de audio entrelazadas de todos los canales
  * Para estéreo: [L0,L1,...,L127,R0,R1,...,R127]
  * La longitud es (blockSize × channelCount)
- `parameters`: Objeto que contiene los parámetros de tu plugin
  * `channelCount`: Número de canales de audio (por ejemplo, 2 para estéreo)
  * `blockSize`: Número de muestras por canal (típicamente 128)
  * `enabled`: Booleano que indica si el plugin está habilitado
  * Tus parámetros personalizados según lo definido en getParameters()
- `time`: Tiempo actual del contexto de audio

Debe retornar los datos de audio procesados en el mismo formato entrelazado.
Siempre verifica el estado habilitado primero y retorna datos sin modificar si está deshabilitado.
Inicializa el estado del contexto si es necesario (por ejemplo, estados de filtros, buffers).

Ejemplo:
```javascript
registerProcessor(`
    // Omitir procesamiento si está deshabilitado
    if (!parameters.enabled) return data;

    // Inicializar estado del contexto si es necesario
    if (!context.initialized) {
        context.buffer = new Array(parameters.channelCount)
            .fill()
            .map(() => new Float32Array(1024));
        context.initialized = true;
    }

    // Restablecer estado si cambia el número de canales
    if (context.buffer.length !== parameters.channelCount) {
        context.buffer = new Array(parameters.channelCount)
            .fill()
            .map(() => new Float32Array(1024));
    }

    // Procesar datos de audio...
    return data;
`);
```

### 3. Gestión de Parámetros

- Convención de Nombres de Parámetros
  * Usar nombres de parámetros abreviados para optimizar almacenamiento y transmisión
  * Abreviar siguiendo estos patrones:
    - Para palabras simples: Usar las primeras letras (por ejemplo, volume → vl, bass → bs)
    - Para palabras compuestas: Usar la primera letra de cada palabra (por ejemplo, tpdfDither → td, zohFreq → zf)
  * Documentar el nombre original del parámetro en comentarios para claridad

- Implementar `getParameters()` para retornar el estado actual del plugin
  * Debe incluir campos `type` y `enabled`
  * Retornar todos los parámetros que afectan el procesamiento de audio
  * Ejemplo: `{ type: this.constructor.name, enabled: this.enabled, gain: this.gain }`

- Implementar `setParameters(params)` para manejar actualizaciones de parámetros
  * Validar todos los parámetros de entrada antes de aplicarlos
  * Usar verificación de tipo y validación de rango
  * Ignorar valores inválidos, manteniendo el estado actual
  * Llamar a `this.updateParameters()` después de cambios exitosos

- Usar `setEnabled(enabled)` para control de habilitación/deshabilitación
  * Este método es proporcionado por PluginBase
  * Maneja automáticamente actualizaciones de estado
  * No modificar `this.enabled` directamente
  * Ejemplo: `plugin.setEnabled(false)` en lugar de `plugin.enabled = false`

- Mejores Prácticas de Validación de Parámetros
  * Siempre validar tipos de parámetros (por ejemplo, `typeof value === 'number'`)
  * Verificar rangos de valores (por ejemplo, `value >= 0 && value <= 1`)
  * Proporcionar valores predeterminados para entradas inválidas
  * Documentar rangos válidos de parámetros en comentarios

Ejemplo:
```javascript
getParameters() {
    return {
        type: this.constructor.name,
        enabled: this.enabled,
        gain: this.gain,
        // Incluir todos los parámetros que afectan el procesamiento de audio
    };
}

setParameters(params) {
    if (params.enabled !== undefined) {
        this.enabled = params.enabled;
    }
    if (params.gain !== undefined) {
        this.setGain(params.gain); // Usar setter dedicado para validación
    }
    this.updateParameters();
}

// Setter individual de parámetro con validación
setGain(value) {
    this.gain = Math.max(0, Math.min(2, 
        typeof value === 'number' ? value : parseFloat(value)
    ));
    this.updateParameters();
}
```

Ejemplo de gestión de parámetros:
```javascript
class MyPlugin extends PluginBase {
    constructor() {
        super('My Plugin', 'Description');
        this.gain = 1.0;  // Valor predeterminado
    }

    // Obtener parámetros actuales
    getParameters() {
        return {
            type: this.constructor.name,  // Requerido
            enabled: this.enabled,        // Requerido
            gain: this.gain              // Específico del plugin
        };
    }

    // Establecer parámetros con validación
    setParameters(params) {
        if (params.gain !== undefined) {
            // Verificación de tipo
            const value = typeof params.gain === 'number' 
                ? params.gain 
                : parseFloat(params.gain);
            
            // Validación de rango
            if (!isNaN(value)) {
                this.gain = Math.max(0, Math.min(2, value));
            }
        }
        // Nota: No manejar enabled aquí, usar setEnabled en su lugar
        this.updateParameters();
    }

    // Setter individual de parámetro con validación
    setGain(value) {
        this.setParameters({ gain: value });
    }
}
```

### 4. Interfaz de Usuario
- Implementar `createUI()` para retornar un elemento DOM que contenga los controles de tu plugin
- Usar event listeners para actualizar parámetros cuando cambien los elementos UI
- Almacenar referencias a elementos UI si se necesitan para actualizaciones
- Inicializar frames de animación para plugins de visualización
- Limpiar event listeners y frames de animación en cleanup()
- Ejemplo:
  ```javascript
  createUI() {
      const container = document.createElement('div');
      container.className = 'my-plugin-ui';

      // Crear controles de parámetros
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.addEventListener('input', e => {
          this.setGain(parseFloat(e.target.value));
      });

      // Para plugins de visualización
      const canvas = document.createElement('canvas');
      this.canvas = canvas; // Almacenar referencia si se necesita para actualizaciones
      
      // Iniciar animación si es necesario
      this.startAnimation();

      container.appendChild(slider);
      container.appendChild(canvas);
      return container;
  }

  // Control de animación para plugins de visualización
  startAnimation() {
      const animate = () => {
          this.updateDisplay();
          this.animationFrameId = requestAnimationFrame(animate);
      };
      this.animationFrameId = requestAnimationFrame(animate);
  }

  cleanup() {
      // Cancelar frame de animación si existe
      if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
      }
  }
  ```

## Plugins de Ejemplo

### 1. Plugin de Ganancia Básico

Un ejemplo simple que muestra control de parámetros:

```javascript
class GainPlugin extends PluginBase {
    constructor() {
        super('Gain', 'Simple gain adjustment');
        this.gain = 1.0;

        this.registerProcessor(`
            if (!parameters.enabled) return data;
            const gain = parameters.gain;
            
            // Procesar todos los canales
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                for (let i = 0; i < parameters.blockSize; i++) {
                    data[offset + i] *= gain;
                }
            }
            return data;
        `);
    }

    // Obtener parámetros actuales
    getParameters() {
        return {
            type: this.constructor.name,
            gain: this.gain,
            enabled: this.enabled
        };
    }

    // Establecer parámetros
    setParameters(params) {
        if (params.gain !== undefined) {
            this.gain = Math.max(0, Math.min(2, params.gain));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    // Setter individual de parámetro
    setGain(value) {
        this.setParameters({ gain: value });
    }

    createUI() {
        const container = document.createElement('div');
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0;
        slider.max = 2;
        slider.step = 0.01;
        slider.value = this.gain;
        slider.addEventListener('input', (e) => {
            this.setGain(parseFloat(e.target.value));
        });

        const label = document.createElement('label');
        label.textContent = 'Gain:';

        container.appendChild(label);
        container.appendChild(slider);
        
        return container;
    }
}
```

### 2. Plugin de Medidor de Nivel

Un ejemplo avanzado que muestra visualización y paso de mensajes:

```javascript
class LevelMeterPlugin extends PluginBase {
    constructor() {
        super('Level Meter', 'Displays audio level with peak hold');
        
        // Inicializar estado con tamaño fijo para estéreo
        this.levels = new Array(2).fill(-96);
        this.peakLevels = new Array(2).fill(-96);
        this.peakHoldTimes = new Array(2).fill(0);
        this.lastProcessTime = performance.now() / 1000;
        
        // Registrar función de procesamiento
        this.registerProcessor(`
            // Crear buffer de resultado con mediciones
            const result = new Float32Array(data.length);
            result.set(data);
            
            // Calcular picos para todos los canales
            const peaks = new Float32Array(parameters.channelCount);
            
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                let peak = 0;
                for (let i = 0; i < parameters.blockSize; i++) {
                    peak = Math.max(peak, Math.abs(data[offset + i]));
                }
                peaks[ch] = peak;
            }

            // Crear objeto de mediciones
            result.measurements = {
                channels: Array.from(peaks).map(peak => ({ peak })),
                time: time
            };

            return result;
        `);
    }

    // Manejar mensajes del procesador de audio
    onMessage(message) {
        if (message.type === 'processBuffer' && message.buffer) {
            this.process(message.buffer, message);
        }
    }

    // Convertir amplitud lineal a dB
    amplitudeToDB(amplitude) {
        return 20 * Math.log10(Math.max(amplitude, 1e-6));
    }

    process(audioBuffer, message) {
        if (!audioBuffer || !message?.measurements?.channels) {
            return audioBuffer;
        }

        const time = performance.now() / 1000;
        const deltaTime = time - this.lastProcessTime;
        this.lastProcessTime = time;

        // Procesar cada canal
        for (let ch = 0; ch < message.measurements.channels.length; ch++) {
            const channelPeak = message.measurements.channels[ch].peak;
            const dbLevel = this.amplitudeToDB(channelPeak);
            
            // Actualizar nivel con tasa de caída
            this.levels[ch] = Math.max(
                Math.max(-96, this.levels[ch] - this.FALL_RATE * deltaTime),
                dbLevel
            );

            // Actualizar retención de pico
            if (time > this.peakHoldTimes[ch] + this.PEAK_HOLD_TIME) {
                this.peakLevels[ch] = -96;
            }
            if (dbLevel > this.peakLevels[ch]) {
                this.peakLevels[ch] = dbLevel;
                this.peakHoldTimes[ch] = time;
            }
        }

        // Actualizar estado de sobrecarga
        const maxPeak = Math.max(...message.measurements.channels.map(ch => ch.peak));
        if (maxPeak > 1.0) {
            this.overload = true;
            this.overloadTime = time;
        } else if (time > this.overloadTime + this.OVERLOAD_DISPLAY_TIME) {
            this.overload = false;
        }

        this.updateParameters();
        return audioBuffer;
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'level-meter-plugin-ui';

        // Crear canvas para visualización del medidor
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 100;
        container.appendChild(canvas);
        
        // Función de animación
        const draw = () => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Dibujar cada canal
            for (let ch = 0; ch < this.levels.length; ch++) {
                const y = ch * (canvas.height / 2);
                const height = (canvas.height / 2) - 2;
                
                // Dibujar medidor de nivel
                const levelWidth = canvas.width * 
                    (this.levels[ch] + 96) / 96; // Rango de -96dB a 0dB
                ctx.fillStyle = this.levels[ch] > -6 ? 'red' : 'green';
                ctx.fillRect(0, y, levelWidth, height);
                
                // Dibujar retención de pico
                const peakX = canvas.width * 
                    (this.peakLevels[ch] + 96) / 96;
                ctx.fillStyle = 'white';
                ctx.fillRect(peakX - 1, y, 2, height);
            }
            
            requestAnimationFrame(draw);
        };
        
        // Iniciar animación
        draw();
        
        return container;
    }
}
```

## Funciones Avanzadas

### Paso de Mensajes con Audio Worklet

Los plugins pueden comunicarse entre el hilo principal y Audio Worklet usando paso de mensajes:

1. Desde Audio Worklet al hilo principal:
```javascript
port.postMessage({
    type: 'myMessageType',
    pluginId: parameters.id,
    data: myData
});
```

2. Recibir mensajes en el hilo principal:
```javascript
constructor() {
    super('My Plugin', 'Description');
    
    // Escuchar mensajes desde Audio Worklet
    if (window.workletNode) {
        window.workletNode.port.addEventListener('message', (e) => {
            if (e.data.pluginId === this.id) {
                // Manejar mensaje
            }
        });
    }
}
```

## Gestión de Estado Específico de Instancia

Los plugins pueden mantener estado específico de instancia en el procesador de audio usando el objeto `context`. Esto es particularmente útil para efectos que necesitan rastrear estado entre bloques de procesamiento, como filtros, efectos de modulación o cualquier efecto que requiera historial de muestras.

### Usando el Objeto Context

El objeto `context` es único para cada instancia de plugin y persiste entre llamadas de procesamiento. Aquí está cómo usarlo:

1. **Inicializar Variables de Estado**
```javascript
// Verificar si el estado existe primero
context.myState = context.myState || initialValue;

// O usar una bandera de inicialización
if (!context.initialized) {
    context.myState = initialValue;
    context.initialized = true;
}
```

2. **Manejar Cambios en el Número de Canales**
```javascript
// Restablecer estado si cambia la configuración de canales
if (context.buffers?.length !== parameters.channelCount) {
    context.buffers = new Array(parameters.channelCount)
        .fill()
        .map(() => new Float32Array(bufferSize));
}
```

### Ejemplos

1. **Estado de Filtro (del plugin Narrow Range)**
```javascript
// Inicializar estados de filtro para todos los canales
if (!context.initialized) {
    context.filterStates = {
        // Estados HPF (primera etapa)
        hpf1: new Array(channelCount).fill(0),
        hpf2: new Array(channelCount).fill(0),
        // ... más estados de filtro
    };
    context.initialized = true;
}

// Restablecer si cambia el número de canales
if (context.filterStates.hpf1.length !== channelCount) {
    Object.keys(context.filterStates).forEach(key => {
        context.filterStates[key] = new Array(channelCount).fill(0);
    });
}
```

2. **Estado de Modulación (del plugin Wow Flutter)**
```javascript
// Inicializar estado de modulación
context.phase = context.phase || 0;
context.lpfState = context.lpfState || 0;
context.sampleBufferPos = context.sampleBufferPos || 0;

// Inicializar buffer de retardo si es necesario
if (!context.initialized) {
    context.sampleBuffer = new Array(parameters.channelCount)
        .fill()
        .map(() => new Float32Array(MAX_BUFFER_SIZE).fill(0));
    context.initialized = true;
}
```

3. **Estado de Envolvente (del plugin Compressor)**
```javascript
// Inicializar estados de envolvente para procesamiento dinámico
if (!context.initialized) {
    context.envelopeStates = new Array(channelCount).fill(0);
    context.initialized = true;
}

// Restablecer estados de envolvente si cambia el número de canales
if (context.envelopeStates.length !== channelCount) {
    context.envelopeStates = new Array(channelCount).fill(0);
}

// Ejemplo de uso en procesamiento dinámico
for (let ch = 0; ch < channelCount; ch++) {
    let envelope = context.envelopeStates[ch];
    
    // Procesar muestras con seguidor de envolvente
    for (let i = 0; i < blockSize; i++) {
        const inputAbs = Math.abs(data[offset + i]);
        if (inputAbs > envelope) {
            envelope = attackSamples * (envelope - inputAbs) + inputAbs;
        } else {
            envelope = releaseSamples * (envelope - inputAbs) + inputAbs;
        }
        // Aplicar procesamiento basado en envolvente...
    }
    
    // Almacenar estado de envolvente para el siguiente buffer
    context.envelopeStates[ch] = envelope;
}
```

### Mejores Prácticas para Gestión de Estado

1. **Inicialización**
   - Siempre verificar si el estado existe antes de usarlo
   - Usar una bandera de inicialización para configuración compleja
   - Inicializar arrays y buffers a tamaños apropiados

2. **Cambios en el Número de Canales**
   - Monitorear y manejar cambios en la configuración de canales
   - Restablecer o redimensionar arrays de estado cuando sea necesario
   - Mantener estado por canal cuando sea apropiado

3. **Gestión de Memoria**
   - Pre-asignar buffers para evitar recolección de basura
   - Usar arrays tipados (Float32Array) para mejor rendimiento
   - Limpiar o restablecer buffers grandes cuando el plugin está deshabilitado

4. **Acceso a Estado**
   - Acceder a variables de estado a través del objeto context
   - Actualizar estado consistentemente entre bloques de procesamiento
   - Considerar seguridad de hilos en modificaciones de estado

## Pruebas y Depuración

### Usando la Herramienta de Prueba

El proyecto incluye una herramienta de prueba para validar implementaciones de plugins. Para usarla:

1. Iniciar el servidor de desarrollo:
```bash
python server.py
```

2. Abrir la página de prueba en tu navegador:
```
http://localhost:8000/dev/effetune_test.html
```

La herramienta de prueba realiza las siguientes verificaciones para cada plugin:
- Implementación del constructor (ID del plugin)
- Gestión de parámetros (campos requeridos)
- Creación de UI
- Manejo de estado habilitado
- Notificaciones de actualización de parámetros

Los resultados están codificados por color:
- 🟢 Verde: Prueba pasada exitosamente
- 🟡 Amarillo: Advertencia (posible problema)
- 🔴 Rojo: Prueba fallida

Usa esta herramienta durante el desarrollo para asegurar que tu plugin sigue las pautas de implementación requeridas.

### Pruebas Manuales

1. **Pruebas de Parámetros**
   - Probar validación de parámetros exhaustivamente
   - Verificar comprobación de tipo y validación de rango
   - Probar con entradas inválidas para asegurar manejo adecuado
   - Usar el método `setEnabled` proporcionado para habilitar/deshabilitar
   - Ejemplos de casos de prueba:
     ```javascript
     // Probar tipo inválido
     plugin.setParameters({ gain: 'invalid' });
     assert(plugin.gain === originalGain);  // Debería mantener valor original

     // Probar fuera de rango
     plugin.setParameters({ gain: 999 });
     assert(plugin.gain <= 2);  // Debería limitar al rango válido

     // Probar habilitar/deshabilitar
     plugin.setEnabled(false);
     assert(plugin.getParameters().enabled === false);
     ```

2. **Pruebas de Procesamiento de Audio**
   - Nota: El código de Audio Worklet se ejecuta en un contexto separado
   - No se puede probar directamente la función de procesamiento
   - Enfocarse en validación de parámetros y gestión de estado
   - Probar manejo de estado habilitado:
     ```javascript
     process(audioBuffer, message) {
         if (!audioBuffer || !message?.measurements?.channels) {
             return audioBuffer;
         }

         // Omitir procesamiento si está deshabilitado
         if (!this.enabled) {
             return audioBuffer;
         }

         // Continuar con procesamiento de audio...
     }
     ```

3. **Pruebas de UI**
   - Verificar que actualizaciones de UI reflejen cambios de parámetros
   - Probar capacidad de respuesta de UI en ambos estados habilitado/deshabilitado
   - Para plugins de visualización:
     * Continuar actualizaciones de UI incluso cuando está deshabilitado
     * Solo omitir procesamiento de audio cuando está deshabilitado
     * No detener animaciones en cleanup()

2. **Validación de Parámetros**
   - Siempre validar y sanear valores de parámetros
   - Usar límites min/max apropiados para valores numéricos
   - Verificar parámetros channelCount y blockSize
   - Proporcionar valores predeterminados para entradas inválidas

3. **Rendimiento**
   - Mantener código de procesamiento de audio eficiente
   - Minimizar creación de objetos en la función de procesamiento
   - Pre-calcular constantes fuera de bucles
   - Usar operaciones matemáticas simples donde sea posible

3. **Diseño de UI**
   - Mantener controles intuitivos y responsivos
   - Proporcionar rangos y pasos de valores apropiados
   - Incluir unidades en etiquetas donde sea aplicable
   - Al usar botones de radio, incluir ID del plugin en el atributo name (por ejemplo, `name="radio-group-${this.id}"`) para asegurar que cada instancia del plugin tenga su propio grupo de botones de radio independiente. Esto es crítico cuando se usan múltiples instancias de plugins con botones de radio simultáneamente, ya que los botones de radio con el mismo atributo name interferirán entre sí. Ejemplo:
     ```javascript
     const radio = document.createElement('input');
     radio.type = 'radio';
     radio.name = `channel-${this.id}`; // Incluir ID del plugin para hacerlo único
     radio.value = 'Left';
     ```
   - Seguir los estilos CSS estándar para elementos UI comunes para mantener consistencia entre plugins
   - Mantener CSS específico del plugin mínimo y enfocado en necesidades de estilo únicas
   - Usar las clases CSS base para elementos estándar (por ejemplo, `.parameter-row`, `.radio-group`) para asegurar diseño y apariencia consistentes
   - Solo agregar CSS personalizado para elementos UI específicos del plugin que requieran estilo único

4. **Manejo de Errores**
   - Validar todas las entradas en código UI y de procesamiento
   - Proporcionar valores predeterminados para parámetros inválidos
   - Manejar casos límite con elegancia (por ejemplo, mono vs estéreo)

## Utilidades Disponibles

La función de procesamiento de audio tiene acceso a estas funciones de utilidad:

- `getFadeValue(id, value, time)`: Suavizar cambios de parámetros para prevenir clics de audio. Usa el ID del plugin para mantener estados de transición independientes para cada instancia del plugin

## Categorías de Plugins

Los plugins están organizados en categorías definidas en `plugins/plugins.txt`:

- `Analyzer`: Herramientas de análisis (medidores de nivel, analizadores de espectro, etc.)
- `Basics`: Efectos de audio básicos (volumen, balance, DC offset, etc.)
- `Dynamics`: Procesadores de rango dinámico (compresores, puertas, etc.)
- `EQ`: Efectos de ecualización (filtros, modelado de frecuencia)
- `Filter`: Efectos de filtro basados en tiempo (modulación, wow flutter)
- `Lo-Fi`: Efectos de audio Lo-Fi (reducción de bits, fluctuación)
- `Others`: Efectos misceláneos (osciladores, etc.)
- `Reverb`: Efectos de reverberación (simulación de sala, etc.)
- `Saturation`: Efectos de saturación y distorsión
- `Spatial`: Efectos de audio espacial (procesamiento de campo estéreo)

Para agregar una nueva categoría:
1. Agrégala a la sección `[categories]` en `plugins.txt`
2. Proporciona una descripción clara de qué tipos de plugins pertenecen a esta categoría
3. Crea un subdirectorio apropiado en el directorio `plugins`
