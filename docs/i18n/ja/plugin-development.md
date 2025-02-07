# プラグイン開発ガイド

このガイドでは、Frieve EffeTuneの新しいプラグインの作成方法について説明します。

## 基本構造

すべてのプラグインは`PluginBase`クラスを継承し、そのコアメソッドを実装する必要があります。各メソッドには特定の責任と実行タイミングがあります:

### 関数の責任

1. **constructor**
   - タイミング:プラグインインスタンスの作成時に1回実行
   - 役割:
     * 基本情報の設定(super()を通じて名前、説明を設定)
     * パラメータのデフォルト値の初期化(例:this.gain = 1.0)
     * 状態変数の初期化(バッファ、配列など)
     * プロセッサー関数の登録(registerProcessor)
   - 注意点:
     * ここでUIの作成やイベントリスナーの設定を行わない
     * 重い初期化処理は避ける

2. **registerProcessor**
   - タイミング:コンストラクタから呼び出され、Audio Workletに処理関数を登録
   - 役割:
     * オーディオ処理関数の定義
     * コンテキスト状態の初期化確認
     * 有効状態のチェックと処理のスキップ
   - 注意点:
     * 必ず最初に有効状態をチェック
     * 必要な場合のみコンテキストを初期化
     * チャンネル数が変更された場合は状態をリセット

3. **process**
   - タイミング:オーディオバッファ処理中に定期的に呼び出し
   - 役割:
     * メッセージとバッファの検証
     * 有効状態のチェック(無効の場合は早期リターン)
     * オーディオ処理の実行(有効時のみ)
     * UI更新のための状態更新
   - 注意点:
     * 有効状態に関係なくUI更新は継続
     * 重い処理操作は避ける

4. **cleanup**
   - タイミング:プラグインが無効化または削除された時に呼び出し
   - 役割:
     * アニメーションフレームのキャンセル
     * イベントリスナーの削除
     * 一時的なリソースの解放
   - 注意点:
     * UI更新は停止しない
     * 状態変数は維持
     * 最小限のクリーンアップのみ実行

プラグインの基本構造は以下の通りです:

```javascript
class MyPlugin extends PluginBase {
    constructor() {
        super('Plugin Name', 'Plugin Description');
        
        // Initialize plugin parameters
        this.myParameter = 0;

        // Register the audio processing function
        this.registerProcessor(`
            // Your audio processing code here
            // This runs in the Audio Worklet
            return data;
        `);
    }

    // Get current parameters (required)
    getParameters() {
        return {
            type: this.constructor.name,
            myParameter: this.myParameter,
            enabled: this.enabled
        };
    }

    // Create UI elements (required)
    createUI() {
        const container = document.createElement('div');
        // Add your UI elements here
        return container;
    }
}

// Register the plugin globally
window.MyPlugin = MyPlugin;
```

## 主要コンポーネント

### 1. コンストラクタ
- プラグイン名と説明を指定してsuper()を呼び出し
- プラグインパラメータをデフォルト値で初期化
- 状態変数(バッファ、配列など)を適切なサイズで初期化
- `this.registerProcessor()`を使用してオーディオ処理関数を登録
- 例:
  ```javascript
  constructor() {
      super('My Plugin', 'Description');
      
      // Initialize parameters with defaults
      this.gain = 1.0;
      
      // Initialize state variables
      this.buffer = new Float32Array(1024);
      this.lastProcessTime = performance.now() / 1000;
      
      // Register processor
      this.registerProcessor(`...`);
  }
  ```

### 2. オーディオ処理関数
- Audio Workletコンテキストで実行
- 以下のパラメータを受け取る:
  - `data`:すべてのチャンネルのインターリーブされたオーディオサンプルを含むFloat32Array
    * ステレオの場合:[L0,L1,...,L127,R0,R1,...,R127]
    * 長さは(blockSize × channelCount)
  - `parameters`:プラグインのパラメータを含むオブジェクト
    * `channelCount`:オーディオチャンネル数(ステレオの場合は2)
    * `blockSize`:チャンネルあたりのサンプル数(通常128)
    * `enabled`:プラグインが有効かどうかを示すブール値
    * getParameters()で定義したカスタムパラメータ
  - `time`:現在のオーディオコンテキスト時間
- 同じインターリーブ形式で処理済みオーディオデータを返す必要がある
- 必要に応じてcontextからgetChannelData(channelIndex)を使用して個別のチャンネルデータにアクセス
- 必ず最初に有効状態をチェックし、無効の場合は未修正のデータを返す
- 必要に応じてコンテキスト状態を初期化(フィルター状態、バッファなど)
- 例:
  ```javascript
  registerProcessor(`
      // Skip processing if disabled
      if (!parameters.enabled) return data;

      // Initialize context state if needed
      if (!context.initialized) {
          context.buffer = new Array(parameters.channelCount)
              .fill()
              .map(() => new Float32Array(1024));
          context.initialized = true;
      }

      // Reset state if channel count changes
      if (context.buffer.length !== parameters.channelCount) {
          context.buffer = new Array(parameters.channelCount)
              .fill()
              .map(() => new Float32Array(1024));
      }

      // Process audio data...
      return data;
  `);
  ```

### 3. パラメータ管理
- パラメータ命名規則
  * ストレージと転送を最適化するために短縮されたパラメータ名を使用
  * 以下のパターンで短縮:
    - 単語の場合:最初の文字を使用(例:volume → vl、bass → bs)
    - 複合語の場合:各単語の最初の文字を使用(例:tpdfDither → td、zohFreq → zf)
  * 明確性のために元のパラメータ名をコメントで記載

- 現在のプラグイン状態を返す`getParameters()`を実装
  * `type`と`enabled`フィールドを必ず含める
  * オーディオ処理に影響するすべてのパラメータを返す
  * 例:`{ type: this.constructor.name, enabled: this.enabled, gain: this.gain }`

- パラメータ更新を処理する`setParameters(params)`を実装
  * 適用前にすべての入力パラメータを検証
  * 型チェックと範囲の検証を使用
  * 無効な値は無視し、現在の状態を維持
  * 正常な変更後は`this.updateParameters()`を呼び出し

- 有効/無効の制御には`setEnabled(enabled)`を使用
  * このメソッドはPluginBaseで提供
  * 状態更新を自動的に処理
  * `this.enabled`を直接変更しない
  * 例:`plugin.setEnabled(false)`を使用し、`plugin.enabled = false`は使用しない

- パラメータ検証のベストプラクティス
  * 常にパラメータの型を検証(例:`typeof value === 'number'`)
  * 値の範囲をチェック(例:`value >= 0 && value <= 1`)
  * 無効な入力に対するフォールバック値を提供
  * コメントで有効なパラメータ範囲を記載
- 例:
  ```javascript
  getParameters() {
      return {
          type: this.constructor.name,
          enabled: this.enabled,
          gain: this.gain,
          // Include all parameters that affect audio processing
      };
  }

  setParameters(params) {
      if (params.enabled !== undefined) {
          this.enabled = params.enabled;
      }
      if (params.gain !== undefined) {
          this.setGain(params.gain); // Use dedicated setter for validation
      }
      this.updateParameters();
  }

  // Individual parameter setter with validation
  setGain(value) {
      this.gain = Math.max(0, Math.min(2, 
          typeof value === 'number' ? value : parseFloat(value)
      ));
      this.updateParameters();
  }
  ```

パラメータ管理の例:
```javascript
class MyPlugin extends PluginBase {
    constructor() {
        super('My Plugin', 'Description');
        this.gain = 1.0;  // Default value
    }

    // Get current parameters
    getParameters() {
        return {
            type: this.constructor.name,  // Required
            enabled: this.enabled,        // Required
            gain: this.gain              // Plugin-specific
        };
    }

    // Set parameters with validation
    setParameters(params) {
        if (params.gain !== undefined) {
            // Type check
            const value = typeof params.gain === 'number' 
                ? params.gain 
                : parseFloat(params.gain);
            
            // Range validation
            if (!isNaN(value)) {
                this.gain = Math.max(0, Math.min(2, value));
            }
        }
        // Note: Don't handle enabled here, use setEnabled instead
        this.updateParameters();
    }

    // Individual parameter setter with validation
    setGain(value) {
        this.setParameters({ gain: value });
    }
}
```

### 4. ユーザーインターフェース
- プラグインのコントロールを含むDOM要素を返す`createUI()`を実装
- UI要素が変更された時にパラメータを更新するイベントリスナーを使用
- 更新が必要な場合はUI要素の参照を保存
- 可視化プラグインの場合はアニメーションフレームを初期化
- cleanup()でイベントリスナーとアニメーションフレームをクリーンアップ
- 例:
  ```javascript
  createUI() {
      const container = document.createElement('div');
      container.className = 'my-plugin-ui';

      // Create parameter controls
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.addEventListener('input', e => {
          this.setGain(parseFloat(e.target.value));
      });

      // For visualization plugins
      const canvas = document.createElement('canvas');
      this.canvas = canvas; // Store reference if needed for updates
      
      // Start animation if needed
      this.startAnimation();

      container.appendChild(slider);
      container.appendChild(canvas);
      return container;
  }

  // Animation control for visualization plugins
  startAnimation() {
      const animate = () => {
          this.updateDisplay();
          this.animationFrameId = requestAnimationFrame(animate);
      };
      this.animationFrameId = requestAnimationFrame(animate);
  }

  cleanup() {
      // Cancel animation frame if exists
      if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
      }
  }
  ```

## プラグインの例

### 1. 基本的なゲインプラグイン

パラメータ制御を示す簡単な例:

```javascript
class GainPlugin extends PluginBase {
    constructor() {
        super('Gain', 'Simple gain adjustment');
        this.gain = 1.0;

        this.registerProcessor(`
            if (!parameters.enabled) return data;
            const gain = parameters.gain;
            
            // Process all channels
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                for (let i = 0; i < parameters.blockSize; i++) {
                    data[offset + i] *= gain;
                }
            }
            return data;
        `);
    }

    // Get current parameters
    getParameters() {
        return {
            type: this.constructor.name,
            gain: this.gain,
            enabled: this.enabled
        };
    }

    // Set parameters
    setParameters(params) {
        if (params.gain !== undefined) {
            this.gain = Math.max(0, Math.min(2, params.gain));
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    // Individual parameter setter
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

### 2. レベルメータープラグイン

可視化とメッセージパッシングを示す高度な例:

```javascript
class LevelMeterPlugin extends PluginBase {
    constructor() {
        super('Level Meter', 'Displays audio level with peak hold');
        
        // Initialize state with fixed size for stereo
        this.levels = new Array(2).fill(-96);
        this.peakLevels = new Array(2).fill(-96);
        this.peakHoldTimes = new Array(2).fill(0);
        this.lastProcessTime = performance.now() / 1000;
        
        // Register processor function
        this.registerProcessor(`
            // Create result buffer with measurements
            const result = new Float32Array(data.length);
            result.set(data);
            
            // Calculate peaks for all channels
            const peaks = new Float32Array(parameters.channelCount);
            
            for (let ch = 0; ch < parameters.channelCount; ch++) {
                const offset = ch * parameters.blockSize;
                let peak = 0;
                for (let i = 0; i < parameters.blockSize; i++) {
                    peak = Math.max(peak, Math.abs(data[offset + i]));
                }
                peaks[ch] = peak;
            }

            // Create measurements object
            result.measurements = {
                channels: Array.from(peaks).map(peak => ({ peak })),
                time: time
            };

            return result;
        `);
    }

    // Handle messages from audio processor
    onMessage(message) {
        if (message.type === 'processBuffer' && message.buffer) {
            this.process(message.buffer, message);
        }
    }

    // Convert linear amplitude to dB
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

        // Process each channel
        for (let ch = 0; ch < message.measurements.channels.length; ch++) {
            const channelPeak = message.measurements.channels[ch].peak;
            const dbLevel = this.amplitudeToDB(channelPeak);
            
            // Update level with fall rate
            this.levels[ch] = Math.max(
                Math.max(-96, this.levels[ch] - this.FALL_RATE * deltaTime),
                dbLevel
            );

            // Update peak hold
            if (time > this.peakHoldTimes[ch] + this.PEAK_HOLD_TIME) {
                this.peakLevels[ch] = -96;
            }
            if (dbLevel > this.peakLevels[ch]) {
                this.peakLevels[ch] = dbLevel;
                this.peakHoldTimes[ch] = time;
            }
        }

        // Update overload state
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

        // Create canvas for meter display
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 100;
        container.appendChild(canvas);
        
        // Animation function
        const draw = () => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw each channel
            for (let ch = 0; ch < this.levels.length; ch++) {
                const y = ch * (canvas.height / 2);
                const height = (canvas.height / 2) - 2;
                
                // Draw level meter
                const levelWidth = canvas.width * 
                    (this.levels[ch] + 96) / 96; // -96dB to 0dB range
                ctx.fillStyle = this.levels[ch] > -6 ? 'red' : 'green';
                ctx.fillRect(0, y, levelWidth, height);
                
                // Draw peak hold
                const peakX = canvas.width * 
                    (this.peakLevels[ch] + 96) / 96;
                ctx.fillStyle = 'white';
                ctx.fillRect(peakX - 1, y, 2, height);
            }
            
            requestAnimationFrame(draw);
        };
        
        // Start animation
        draw();
        
        return container;
    }
}
```

## 高度な機能

### Audio Workletとのメッセージパッシング

プラグインはメインスレッドとAudio Worklet間でメッセージパッシングを使用して通信できます:

1. Audio Workletからメインスレッドへ:
```javascript
port.postMessage({
    type: 'myMessageType',
    pluginId: parameters.id,
    data: myData
});
```

2. メインスレッドでメッセージを受信:
```javascript
constructor() {
    super('My Plugin', 'Description');
    
    // Listen for messages from Audio Worklet
    if (window.workletNode) {
        window.workletNode.port.addEventListener('message', (e) => {
            if (e.data.pluginId === this.id) {
                // Handle message
            }
        });
    }
}
```

## インスタンス固有の状態管理

プラグインは`context`オブジェクトを使用してオーディオプロセッサーでインスタンス固有の状態を維持できます。これは、フィルター、モジュレーションエフェクト、サンプル履歴を必要とするエフェクトなど、処理ブロック間で状態を追跡する必要があるエフェクトに特に有用です。

### contextオブジェクトの使用

`context`オブジェクトは各プラグインインスタンスに固有で、処理呼び出し間で永続化します。使用方法は以下の通りです:

1. **状態変数の初期化**
```javascript
// 状態が存在するかを最初にチェック
context.myState = context.myState || initialValue;

// または初期化フラグを使用
if (!context.initialized) {
    context.myState = initialValue;
    context.initialized = true;
}
```

2. **チャンネル数の変更を処理**
```javascript
// チャンネル構成が変更された場合は状態をリセット
if (context.buffers?.length !== parameters.channelCount) {
    context.buffers = new Array(parameters.channelCount)
        .fill()
        .map(() => new Float32Array(bufferSize));
}
```

### 例

1. **フィルター状態(Narrow Rangeプラグインから)**
```javascript
// すべてのチャンネルのフィルター状態を初期化
if (!context.initialized) {
    context.filterStates = {
        // HPF状態(第1段)
        hpf1: new Array(channelCount).fill(0),
        hpf2: new Array(channelCount).fill(0),
        // ... その他のフィルター状態
    };
    context.initialized = true;
}

// チャンネル数が変更された場合はリセット
if (context.filterStates.hpf1.length !== channelCount) {
    Object.keys(context.filterStates).forEach(key => {
        context.filterStates[key] = new Array(channelCount).fill(0);
    });
}
```

2. **モジュレーション状態(Wow Flutterプラグインから)**
```javascript
// モジュレーション状態を初期化
context.phase = context.phase || 0;
context.lpfState = context.lpfState || 0;
context.sampleBufferPos = context.sampleBufferPos || 0;

// 必要に応じてディレイバッファを初期化
if (!context.initialized) {
    context.sampleBuffer = new Array(parameters.channelCount)
        .fill()
        .map(() => new Float32Array(MAX_BUFFER_SIZE).fill(0));
    context.initialized = true;
}
```

3. **エンベロープ状態(Compressorプラグインから)**
```javascript
// ダイナミクス処理用のエンベロープ状態を初期化
if (!context.initialized) {
    context.envelopeStates = new Array(channelCount).fill(0);
    context.initialized = true;
}

// チャンネル数が変更された場合はエンベロープ状態をリセット
if (context.envelopeStates.length !== channelCount) {
    context.envelopeStates = new Array(channelCount).fill(0);
}

// ダイナミクス処理でのエンベロープ使用例
for (let ch = 0; ch < channelCount; ch++) {
    let envelope = context.envelopeStates[ch];
    
    // エンベロープフォロワーでサンプルを処理
    for (let i = 0; i < blockSize; i++) {
        const inputAbs = Math.abs(data[offset + i]);
        if (inputAbs > envelope) {
            envelope = attackSamples * (envelope - inputAbs) + inputAbs;
        } else {
            envelope = releaseSamples * (envelope - inputAbs) + inputAbs;
        }
        // エンベロープベースの処理を適用...
    }
    
    // 次のバッファのためにエンベロープ状態を保存
    context.envelopeStates[ch] = envelope;
}
```

### 状態管理のベストプラクティス

1. **初期化**
   - 使用前に常に状態が存在するかチェック
   - 複雑な設定には初期化フラグを使用
   - 配列とバッファを適切なサイズで初期化

2. **チャンネル数の変更**
   - チャンネル構成の変更を監視し処理
   - 必要に応じて状態配列をリセットまたはリサイズ
   - 適切な場合はチャンネルごとに状態を維持

3. **メモリ管理**
   - ガベージコレクションを避けるためにバッファを事前割り当て
   - パフォーマンス向上のために型付き配列(Float32Array)を使用
   - プラグインが無効化された時に大きなバッファをクリアまたはリセット

4. **状態アクセス**
   - contextオブジェクトを通じて状態変数にアクセス
   - 処理ブロック間で一貫して状態を更新
   - 状態の変更でスレッドセーフティを考慮

## テストとデバッグ

### テストツールの使用

プロジェクトにはプラグインの実装を検証するためのテストツールが含まれています。使用方法:

1. 開発サーバーを起動:
```bash
python server.py
```

2. ブラウザでテストページを開く:
```
http://localhost:8000/dev/effetune_test.html
```

テストツールは各プラグインに対して以下のチェックを実行:
- コンストラクタの実装(プラグインID)
- パラメータ管理(必須フィールド)
- UI作成
- 有効状態の処理
- パラメータ更新通知

結果は色分けされます:
- 🟢 緑:テスト成功
- 🟡 黄:警告(潜在的な問題)
- 🔴 赤:テスト失敗

開発中はこのツールを使用して、必要な実装ガイドラインに従っていることを確認してください。

### 手動テスト

1. **パラメータテスト**
   - パラメータのバリデーションを徹底的にテスト
   - 型チェックと範囲のバリデーションを確認
   - 無効な入力で適切な処理を確認
   - 有効/無効の切り替えには提供されているsetEnabledメソッドを使用
   - テストケース例:
     ```javascript
     // 無効な型のテスト
     plugin.setParameters({ gain: 'invalid' });
     assert(plugin.gain === originalGain);  // 元の値を維持すべき

     // 範囲外のテスト
     plugin.setParameters({ gain: 999 });
     assert(plugin.gain <= 2);  // 有効な範囲に制限すべき

     // 有効/無効のテスト
     plugin.setEnabled(false);
     assert(plugin.getParameters().enabled === false);
     ```

2. **オーディオ処理のテスト**
   - 注意:Audio Workletコードは別のコンテキストで実行
   - プロセッサー関数を直接テストできない
   - パラメータのバリデーションと状態管理に焦点を当てる
   - 有効状態の処理をテスト:
     ```javascript
     process(audioBuffer, message) {
         if (!audioBuffer || !message?.measurements?.channels) {
             return audioBuffer;
         }

         // 無効の場合は処理をスキップ
         if (!this.enabled) {
             return audioBuffer;
         }

         // オーディオ処理を継続...
     }
     ```

3. **UIテスト**
   - UI更新がパラメータの変更を反映することを確認
   - 有効/無効状態の両方でUIの応答性をテスト
   - 可視化プラグインの場合:
     * 無効時もUI更新を継続
     * 無効時はオーディオ処理のみスキップ
     * cleanup()でアニメーションを停止しない

2. **パラメータのバリデーション**
   - 常にパラメータ値を検証・サニタイズ
   - 数値には適切な最小/最大境界を使用
   - channelCountとblockSizeパラメータをチェック

3. **パフォーマンス**
   - オーディオ処理コードを効率的に保つ
   - 処理関数でのオブジェクト生成を最小限に
   - ループの外で定数を事前計算
   - 可能な場合は単純な数学演算を使用

3. **UIデザイン**
   - コントロールを直感的で応答性の高いものに
   - 適切な値の範囲とステップを提供
   - ラベルには適切な単位を含める
   - ラジオボタンを使用する場合、プラグインIDをname属性に含める(例:`name="radio-group-${this.id}"`)。これは、ラジオボタンを持つ複数のプラグインインスタンスが同時に使用される場合に重要で、同じname属性を持つラジオボタンが互いに干渉するのを防ぎます。例:
     ```javascript
     const radio = document.createElement('input');
     radio.type = 'radio';
     radio.name = `channel-${this.id}`; // プラグインIDを含めてユニークにする
     radio.value = 'Left';
     ```
   - 共通のUI要素に標準のCSSスタイルを使用して、プラグイン間の一貫性を維持
   - プラグイン固有のCSSは、ユニークなスタイリングが必要な要素のみに限定
   - 標準的な要素には基本CSSクラスを使用(例:`.parameter-row`、`.radio-group`)して、一貫したレイアウトと外観を確保
   - カスタムCSSはプラグイン固有のUI要素にのみ追加

## 利用可能なユーティリティ

オーディオ処理関数では以下のユーティリティ関数が利用可能です:

- `getFadeValue(id, value, time)`: オーディオのクリックを防ぐためにパラメータ変更を滑らかにします。プラグインIDを使用して各プラグインインスタンスが独立したフェード状態を維持します
- `getChannelData(channelIndex)`: 必要に応じて個別のチャンネルデータを取得

## プラグインカテゴリ

プラグインは`plugins/plugins.txt`で定義されたカテゴリに分類されます:

- `Analyzer`: 分析ツール(レベルメーター、スペクトラムアナライザーなど)
- `Basics`: 基本的なオーディオエフェクト(ボリューム、バランス、DCオフセットなど)
- `Dynamics`: ダイナミクスプロセッサー(コンプレッサー、ゲートなど)
- `EQ`: イコライゼーションエフェクト(フィルター、周波数シェイピング)
- `Filter`: 時間ベースのフィルターエフェクト(モジュレーション、ワウフラッター)
- `Lo-Fi`: ローファイオーディオエフェクト(ビットクラッシャー、ジッター)
- `Others`: その他のエフェクト(オシレーターなど)
- `Reverb`: リバーブエフェクト(ルームシミュレーションなど)
- `Saturation`: サチュレーションとディストーションエフェクト
- `Spatial`: 空間オーディオエフェクト(ステレオフィールド処理)

新しいカテゴリを追加するには:
1. `plugins.txt`の`[categories]`セクションに追加
2. そのカテゴリに属するプラグインの種類を明確に説明
3. `plugins`ディレクトリに適切なサブディレクトリを作成
