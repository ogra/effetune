# Plugin Development Guide

本指南介绍如何为 Frieve EffeTune 创建新插件。

## 基本结构

所有插件必须继承 `PluginBase` 类并实现其核心方法。每个方法都有特定的职责和时序考虑:

### 函数职责

1. **constructor**
   - 时机:插件实例创建时执行一次
   - 职责:
     * 通过 super() 设置基本信息(名称、描述)
     * 使用默认值初始化参数(例如 this.gain = 1.0)
     * 初始化状态变量(缓冲区、数组等)
     * 注册处理器函数(registerProcessor)
   - 注意事项:
     * 不要在此创建 UI 或设置事件监听器
     * 避免进行重负载初始化操作

2. **registerProcessor**
   - 时机:从构造函数调用以向 Audio Worklet 注册处理函数
   - 职责:
     * 定义音频处理函数
     * 检查上下文状态初始化
     * 处理启用状态检查并跳过处理
   - 注意事项:
     * 始终首先检查启用状态
     * 仅在必要时初始化上下文
     * 在通道数变化时重置状态

3. **process**
   - 时机:在音频缓冲区处理期间定期调用
   - 职责:
     * 验证消息和缓冲区
     * 检查启用状态(如果禁用则提前返回)
     * 执行音频处理(仅在 enabled=true 时)
     * 更新状态以供 UI 更新
   - 注意事项:
     * 无论启用状态如何都继续 UI 更新
     * 避免重负载处理操作

4. **cleanup**
   - 时机:插件被禁用或移除时调用
   - 职责:
     * 取消动画帧
     * 移除事件监听器
     * 释放临时资源
   - 注意事项:
     * 不要停止 UI 更新
     * 保持状态变量
     * 仅执行最小清理

以下是插件的基本结构:

```javascript
class MyPlugin extends PluginBase {
    constructor() {
        super('Plugin Name', 'Plugin Description');
        
        // 初始化插件参数
        this.myParameter = 0;

        // 注册音频处理函数
        this.registerProcessor(`
            // 在此编写音频处理代码
            // 这部分在 Audio Worklet 中运行
            return data;
        `);
    }

    // 获取当前参数(必需)
    getParameters() {
        return {
            type: this.constructor.name,
            myParameter: this.myParameter,
            enabled: this.enabled
        };
    }

    // 创建 UI 元素(必需)
    createUI() {
        const container = document.createElement('div');
        // 在此添加 UI 元素
        return container;
    }
}

// 全局注册插件
window.MyPlugin = MyPlugin;
```

## 关键组件

### 1. 构造函数
- 使用插件名称和描述调用 `super()`
- 使用默认值初始化插件参数
- 使用适当大小初始化状态变量(如缓冲区、数组)
- 使用 `this.registerProcessor()` 注册音频处理函数
- 示例:
  ```javascript
  constructor() {
      super('My Plugin', 'Description');
      
      // 使用默认值初始化参数
      this.gain = 1.0;
      
      // 初始化状态变量
      this.buffer = new Float32Array(1024);
      this.lastProcessTime = performance.now() / 1000;
      
      // 注册处理器
      this.registerProcessor(`...`);
  }
  ```

### 2. 音频处理函数

音频处理函数在 Audio Worklet 上下文中运行,接收以下参数:
- `data`:包含所有通道交错音频样本的 Float32Array
  * 对于立体声:[L0,L1,...,L127,R0,R1,...,R127]
  * 长度为 (blockSize × channelCount)
- `parameters`:包含插件参数的对象
  * `channelCount`:音频通道数(如立体声为 2)
  * `blockSize`:每个通道的样本数(通常为 128)
  * `enabled`:表示插件是否启用的布尔值
  * 您在 getParameters() 中定义的自定义参数
- `time`:当前音频上下文时间

必须以相同的交错格式返回处理后的音频数据。如果需要访问单个通道数据,可以使用上下文的 `getChannelData(channelIndex)`。始终首先检查启用状态,如果禁用则返回未修改的数据。如果需要,初始化上下文状态(如滤波器状态、缓冲区)。

示例:
```javascript
registerProcessor(`
    // 如果禁用则跳过处理
    if (!parameters.enabled) return data;

    // 如果需要则初始化上下文状态
    if (!context.initialized) {
        context.buffer = new Array(parameters.channelCount)
            .fill()
            .map(() => new Float32Array(1024));
        context.initialized = true;
    }

    // 如果通道数变化则重置状态
    if (context.buffer.length !== parameters.channelCount) {
        context.buffer = new Array(parameters.channelCount)
            .fill()
            .map(() => new Float32Array(1024));
    }

    // 处理音频数据...
    return data;
`);
```

### 3. 参数管理

- 参数命名约定
  * 使用缩短的参数名以优化存储和传输
  * 按以下模式缩短:
    - 单个词:使用首字母(如 volume → vl, bass → bs)
    - 复合词:使用每个词的首字母(如 tpdfDither → td, zohFreq → zf)
  * 在注释中记录原始参数名以保持清晰

- 实现 `getParameters()` 以返回当前插件状态
  * 必须包含 `type` 和 `enabled` 字段
  * 返回所有影响音频处理的参数
  * 示例:`{ type: this.constructor.name, enabled: this.enabled, gain: this.gain }`

- 实现 `setParameters(params)` 以处理参数更新
  * 在应用前验证所有输入参数
  * 使用类型检查和范围验证
  * 忽略无效值,保持当前状态
  * 成功更改后调用 `this.updateParameters()`

- 使用 `setEnabled(enabled)` 进行启用/禁用控制
  * 此方法由 PluginBase 提供
  * 自动处理状态更新
  * 不要直接修改 `this.enabled`
  * 示例:使用 `plugin.setEnabled(false)` 而不是 `plugin.enabled = false`

- 参数验证最佳实践
  * 始终验证参数类型(如 `typeof value === 'number'`)
  * 检查值范围(如 `value >= 0 && value <= 1`)
  * 为无效输入提供回退值
  * 在注释中记录有效参数范围

示例:
```javascript
getParameters() {
    return {
        type: this.constructor.name,
        enabled: this.enabled,
        gain: this.gain,
        // 包含所有影响音频处理的参数
    };
}

setParameters(params) {
    if (params.enabled !== undefined) {
        this.enabled = params.enabled;
    }
    if (params.gain !== undefined) {
        this.setGain(params.gain); // 使用专用设置器进行验证
    }
    this.updateParameters();
}

// 带验证的单个参数设置器
setGain(value) {
    this.gain = Math.max(0, Math.min(2, 
        typeof value === 'number' ? value : parseFloat(value)
    ));
    this.updateParameters();
}
```

参数管理示例:
```javascript
class MyPlugin extends PluginBase {
    constructor() {
        super('My Plugin', 'Description');
        this.gain = 1.0;  // 默认值
    }

    // 获取当前参数
    getParameters() {
        return {
            type: this.constructor.name,  // 必需
            enabled: this.enabled,        // 必需
            gain: this.gain              // 插件特定
        };
    }

    // 带验证的参数设置
    setParameters(params) {
        if (params.gain !== undefined) {
            // 类型检查
            const value = typeof params.gain === 'number' 
                ? params.gain 
                : parseFloat(params.gain);
            
            // 范围验证
            if (!isNaN(value)) {
                this.gain = Math.max(0, Math.min(2, value));
            }
        }
        // 注意:不要在此处理 enabled,使用 setEnabled 代替
        this.updateParameters();
    }

    // 带验证的单个参数设置器
    setGain(value) {
        this.setParameters({ gain: value });
    }
}
```

### 4. 用户界面
- 实现 `createUI()` 以返回包含插件控件的 DOM 元素
- 使用事件监听器在 UI 元素更改时更新参数
- 如果需要更新,存储 UI 元素引用
- 为可视化插件初始化动画帧
- 在 cleanup() 中清理事件监听器和动画帧
- 示例:
  ```javascript
  createUI() {
      const container = document.createElement('div');
      container.className = 'my-plugin-ui';

      // 创建参数控件
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.addEventListener('input', e => {
          this.setGain(parseFloat(e.target.value));
      });

      // 对于可视化插件
      const canvas = document.createElement('canvas');
      this.canvas = canvas; // 如果需要更新则存储引用
      
      // 如果需要则启动动画
      this.startAnimation();

      container.appendChild(slider);
      container.appendChild(canvas);
      return container;
  }

  // 可视化插件的动画控制
  startAnimation() {
      const animate = () => {
          this.updateDisplay();
          this.animationFrameId = requestAnimationFrame(animate);
      };
      this.animationFrameId = requestAnimationFrame(animate);
  }

  cleanup() {
      // 如果存在则取消动画帧
      if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
      }
  }
  ```

## 示例插件

### 1. 基本增益插件

展示参数控制的简单示例:

```javascript
class GainPlugin extends PluginBase {
    constructor() {
        super('Gain', 'Simple gain adjustment');
        this.gain = 1.0;

        this.registerProcessor(`
            if (!parameters.enabled) return data;
            const gain = parameters.gain;
            
            // 处理所有通道
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                for (let i = 0; i < parameters.blockSize; i++) {
                    data[offset + i] *= gain;
                }
            }
            return data;
        `);
    }

    // 获取当前参数
    getParameters() {
        return {
            type: this.constructor.name,
            gain: this.gain,
            enabled: this.enabled
        };
    }

    // 设置参数
    setParameters(params) {
        if (params.gain !== undefined) {
            this.gain = Math.max(0, Math.min(2, params.gain));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    // 单个参数设置器
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

### 2. 电平表插件

展示可视化和消息传递的高级示例:

```javascript
class LevelMeterPlugin extends PluginBase {
    constructor() {
        super('Level Meter', 'Displays audio level with peak hold');
        
        // 使用固定大小初始化立体声状态
        this.levels = new Array(2).fill(-96);
        this.peakLevels = new Array(2).fill(-96);
        this.peakHoldTimes = new Array(2).fill(0);
        this.lastProcessTime = performance.now() / 1000;
        
        // 注册处理器函数
        this.registerProcessor(`
            // 创建带测量的结果缓冲区
            const result = new Float32Array(data.length);
            result.set(data);
            
            // 计算所有通道的峰值
            const peaks = new Float32Array(parameters.channelCount);
            
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                let peak = 0;
                for (let i = 0; i < parameters.blockSize; i++) {
                    peak = Math.max(peak, Math.abs(data[offset + i]));
                }
                peaks[ch] = peak;
            }

            // 创建测量对象
            result.measurements = {
                channels: Array.from(peaks).map(peak => ({ peak })),
                time: time
            };

            return result;
        `);
    }

    // 处理来自音频处理器的消息
    onMessage(message) {
        if (message.type === 'processBuffer' && message.buffer) {
            this.process(message.buffer, message);
        }
    }

    // 将线性幅度转换为分贝
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

        // 处理每个通道
        for (let ch = 0; ch < message.measurements.channels.length; ch++) {
            const channelPeak = message.measurements.channels[ch].peak;
            const dbLevel = this.amplitudeToDB(channelPeak);
            
            // 使用下降速率更新电平
            this.levels[ch] = Math.max(
                Math.max(-96, this.levels[ch] - this.FALL_RATE * deltaTime),
                dbLevel
            );

            // 更新峰值保持
            if (time > this.peakHoldTimes[ch] + this.PEAK_HOLD_TIME) {
                this.peakLevels[ch] = -96;
            }
            if (dbLevel > this.peakLevels[ch]) {
                this.peakLevels[ch] = dbLevel;
                this.peakHoldTimes[ch] = time;
            }
        }

        // 更新过载状态
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

        // 创建用于电平显示的画布
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 100;
        container.appendChild(canvas);
        
        // 动画函数
        const draw = () => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 绘制每个通道
            for (let ch = 0; ch < this.levels.length; ch++) {
                const y = ch * (canvas.height / 2);
                const height = (canvas.height / 2) - 2;
                
                // 绘制电平表
                const levelWidth = canvas.width * 
                    (this.levels[ch] + 96) / 96; // -96dB 到 0dB 范围
                ctx.fillStyle = this.levels[ch] > -6 ? 'red' : 'green';
                ctx.fillRect(0, y, levelWidth, height);
                
                // 绘制峰值保持
                const peakX = canvas.width * 
                    (this.peakLevels[ch] + 96) / 96;
                ctx.fillStyle = 'white';
                ctx.fillRect(peakX - 1, y, 2, height);
            }
            
            requestAnimationFrame(draw);
        };
        
        // 启动动画
        draw();
        
        return container;
    }
}
```

## 高级功能

### 与 Audio Worklet 的消息传递

插件可以通过消息传递在主线程和 Audio Worklet 之间通信:

1. 从 Audio Worklet 到主线程:
```javascript
port.postMessage({
    type: 'myMessageType',
    pluginId: parameters.id,
    data: myData
});
```

2. 在主线程中接收消息:
```javascript
constructor() {
    super('My Plugin', 'Description');
    
    // 监听来自 Audio Worklet 的消息
    if (window.workletNode) {
        window.workletNode.port.addEventListener('message', (e) => {
            if (e.data.pluginId === this.id) {
                // 处理消息
            }
        });
    }
}
```

## 实例特定状态管理

插件可以使用 `context` 对象在音频处理器中维护实例特定状态。这对于需要在处理块之间跟踪状态的效果特别有用,如滤波器、调制效果或任何需要样本历史的效果。

### 使用 Context 对象

`context` 对象对每个插件实例都是唯一的,并在处理调用之间持续存在。以下是使用方法:

1. **初始化状态变量**
```javascript
// 首先检查状态是否存在
context.myState = context.myState || initialValue;

// 或使用初始化标志
if (!context.initialized) {
    context.myState = initialValue;
    context.initialized = true;
}
```

2. **处理通道数变化**
```javascript
// 如果通道配置改变则重置状态
if (context.buffers?.length !== parameters.channelCount) {
    context.buffers = new Array(parameters.channelCount)
        .fill()
        .map(() => new Float32Array(bufferSize));
}
```

### 示例

1. **滤波器状态(来自 Narrow Range 插件)**
```javascript
// 为所有通道初始化滤波器状态
if (!context.initialized) {
    context.filterStates = {
        // HPF 状态(第一级)
        hpf1: new Array(channelCount).fill(0),
        hpf2: new Array(channelCount).fill(0),
        // ... 更多滤波器状态
    };
    context.initialized = true;
}

// 如果通道数改变则重置
if (context.filterStates.hpf1.length !== channelCount) {
    Object.keys(context.filterStates).forEach(key => {
        context.filterStates[key] = new Array(channelCount).fill(0);
    });
}
```

2. **调制状态(来自 Wow Flutter 插件)**
```javascript
// 初始化调制状态
context.phase = context.phase || 0;
context.lpfState = context.lpfState || 0;
context.sampleBufferPos = context.sampleBufferPos || 0;

// 如果需要则初始化延迟缓冲区
if (!context.initialized) {
    context.sampleBuffer = new Array(parameters.channelCount)
        .fill()
        .map(() => new Float32Array(MAX_BUFFER_SIZE).fill(0));
    context.initialized = true;
}
```

3. **包络状态(来自 Compressor 插件)**
```javascript
// 为动态处理初始化包络状态
if (!context.initialized) {
    context.envelopeStates = new Array(channelCount).fill(0);
    context.initialized = true;
}

// 如果通道数改变则重置包络状态
if (context.envelopeStates.length !== channelCount) {
    context.envelopeStates = new Array(channelCount).fill(0);
}

// 在动态处理中的使用示例
for (let ch = 0; ch < channelCount; ch++) {
    let envelope = context.envelopeStates[ch];
    
    // 使用包络跟随器处理样本
    for (let i = 0; i < blockSize; i++) {
        const inputAbs = Math.abs(data[offset + i]);
        if (inputAbs > envelope) {
            envelope = attackSamples * (envelope - inputAbs) + inputAbs;
        } else {
            envelope = releaseSamples * (envelope - inputAbs) + inputAbs;
        }
        // 应用基于包络的处理...
    }
    
    // 为下一个缓冲区存储包络状态
    context.envelopeStates[ch] = envelope;
}
```

### 状态管理最佳实践

1. **初始化**
   - 在使用状态前始终检查其是否存在
   - 对复杂设置使用初始化标志
   - 将数组和缓冲区初始化为适当大小

2. **通道数变化**
   - 监控并处理通道配置的变化
   - 在需要时重置或调整状态数组大小
   - 在适当时为每个通道维护状态

3. **内存管理**
   - 预分配缓冲区以避免垃圾回收
   - 使用类型化数组(Float32Array)以获得更好的性能
   - 在插件禁用时清除或重置大型缓冲区

4. **状态访问**
   - 通过 context 对象访问状态变量
   - 在处理块之间一致地更新状态
   - 考虑状态修改中的线程安全性

## 测试和调试

### 使用测试工具

项目包含一个用于验证插件实现的测试工具。使用方法:

1. 启动开发服务器:
```bash
python server.py
```

2. 在浏览器中打开测试页面:
```
http://localhost:8000/dev/effetune_test.html
```

测试工具对每个插件执行以下检查:
- 构造函数实现(插件 ID)
- 参数管理(必需字段)
- UI 创建
- 启用状态处理
- 参数更新通知

结果使用颜色编码:
- 🟢 绿色:测试成功通过
- 🟡 黄色:警告(潜在问题)
- 🔴 红色:测试失败

在开发过程中使用此工具以确保您的插件遵循所需的实现指南。

### 手动测试

1. **参数测试**
   - 彻底测试参数验证
   - 验证类型检查和范围验证
   - 测试无效输入以确保正确处理
   - 使用提供的 `setEnabled` 方法进行启用/禁用
   - 示例测试用例:
     ```javascript
     // 测试无效类型
     plugin.setParameters({ gain: 'invalid' });
     assert(plugin.gain === originalGain);  // 应保持原始值

     // 测试超出范围
     plugin.setParameters({ gain: 999 });
     assert(plugin.gain <= 2);  // 应限制在有效范围内

     // 测试启用/禁用
     plugin.setEnabled(false);
     assert(plugin.getParameters().enabled === false);
     ```

2. **音频处理测试**
   - 注意:Audio Worklet 代码在单独的上下文中运行
   - 无法直接测试处理器函数
   - 专注于参数验证和状态管理
   - 测试启用状态处理:
     ```javascript
     process(audioBuffer, message) {
         if (!audioBuffer || !message?.measurements?.channels) {
             return audioBuffer;
         }

         // 如果禁用则跳过处理
         if (!this.enabled) {
             return audioBuffer;
         }

         // 继续音频处理...
     }
     ```

3. **UI 测试**
   - 验证 UI 更新是否反映参数变化
   - 测试启用/禁用状态下的 UI 响应性
   - 对于可视化插件:
     * 即使禁用也继续 UI 更新
     * 仅在禁用时跳过音频处理
     * 不要在 cleanup() 中停止动画

2. **参数验证**
   - 始终验证和净化参数值
   - 对数值使用适当的最小/最大边界
   - 检查 channelCount 和 blockSize 参数

3. **性能**
   - 保持音频处理代码高效
   - 最小化处理函数中的对象创建
   - 在循环外预计算常量
   - 尽可能使用简单的数学运算

3. **UI 设计**
   - 保持控件直观和响应迅速
   - 提供适当的值范围和步长
   - 在标签中包含单位(如适用)
   - 使用单选按钮时,在 name 属性中包含插件 ID(如 `name="radio-group-${this.id}"`)以确保每个插件实例都有自己独立的单选按钮组。当同时使用多个带有单选按钮的插件实例时,这一点至关重要,因为具有相同 name 属性的单选按钮会相互干扰。示例:
     ```javascript
     const radio = document.createElement('input');
     radio.type = 'radio';
     radio.name = `channel-${this.id}`; // 包含插件 ID 使其唯一
     radio.value = 'Left';
     ```
   - 遵循标准 CSS 样式以保持插件之间的一致性
   - 保持插件特定的 CSS 最小化并专注于独特的样式需求
   - 对标准元素使用基础 CSS 类(如 `.parameter-row`、`.radio-group`)以确保布局和外观一致
   - 仅为需要独特样式的插件特定 UI 元素添加自定义 CSS

4. **错误处理**
   - 在 UI 和处理代码中验证所有输入
   - 为无效参数提供回退值
   - 优雅地处理边缘情况(如单声道与立体声)

## 可用工具

音频处理函数可以访问以下工具函数:

- `getFadeValue(id, value, time)`:平滑参数变化以防止音频咔嗒声。使用插件ID为每个插件实例维护独立的淡入淡出状态
- `getChannelData(channelIndex)`:在需要时获取单个通道数据

## 插件类别

插件按照 `plugins/plugins.txt` 中定义的类别组织:

- `Analyzer`: 分析工具（电平表、频谱分析器等）
- `Basics`: 基本音频效果（音量、平衡、直流偏移等）
- `Dynamics`: 动态范围处理器（压缩器、门限器等）
- `EQ`: 均衡效果（滤波器、频率塑形等）
- `Filter`: 基于时间的滤波效果（调制、哇音、颤音等）
- `Lo-Fi`: 低保真音效（位削、抖动等）
- `Others`: 其他效果（振荡器等）
- `Reverb`: 混响效果（房间模拟等）
- `Saturation`: 饱和和失真效果
- `Spatial`: 空间音频效果（立体声场处理等）

要添加新类别，请遵循以下步骤：
1. 在 `plugins.txt` 的 `[categories]` 部分中添加该类别
2. 提供一个清晰的描述，说明哪些类型的插件属于该类别
3. 在 `plugins` 目录中创建一个相应的子目录