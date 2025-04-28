# Frieve EffeTune <img src="../../../images/icon_64x64.png" alt="EffeTune Icon" width="30" height="30" align="bottom">

🔗[**Webアプリを開く**](https://frieve-a.github.io/effetune/effetune.html)  🔗[**デスクトップアプリをダウンロード**](https://github.com/Frieve-A/effetune/releases/)

オーディオ愛好家のために設計されたリアルタイムオーディオエフェクトプロセッサです。EffeTuneを使用すると、あらゆるオーディオソースを高品質なエフェクトで処理し、リアルタイムでリスニング体験を自由にカスタマイズして完璧に調整することができます。

[![Screenshot](../../../images/screenshot.png)](https://frieve-a.github.io/effetune/effetune.html)

## コンセプト

EffeTuneは、音楽の聴取体験を向上させたいオーディオ愛好家のために作られました。ストリーミングで音楽を楽しむ場合でも、物理メディアで再生する場合でも、EffeTuneはプロフェッショナルグレードのエフェクトを追加し、好みに合わせた音作りを可能にします。あなたのコンピュータを、オーディオソースとスピーカーまたはアンプの間に配置される強力なオーディオエフェクトプロセッサに変身させましょう。

オカルトは一切なく、純粋な科学のみです。

## Features

- リアルタイムオーディオ処理
- エフェクトチェーン構築のためのドラッグ＆ドロップインターフェース
- カテゴリ別に整理された拡張可能なエフェクトシステム
- ライブオーディオビジュアライゼーション
- リアルタイムで変更可能なオーディオパイプライン
- 現在のエフェクトチェーンを使用したオフラインオーディオファイル処理

## セットアップガイド

EffeTuneを使用する前に、オーディオルーティングの設定が必要です。以下に、各種オーディオソースの設定方法を示します:

### 音楽ファイルプレーヤーのセットアップ

- ブラウザでEffeTuneウェブアプリを開く、またはEffeTuneデスクトップアプリを起動する
- 音楽ファイルを開いて再生し、正常に再生されることを確認する
   - 音楽ファイルを開き、アプリケーションとしてEffeTuneを選択する（デスクトップアプリのみ）
   - またはファイルメニューから「音楽ファイルを開く...」を選択する（デスクトップアプリのみ）
   - または音楽ファイルをウィンドウにドラッグする

### ストリーミングサービスのセットアップ

ストリーミングサービス（Spotify、YouTube Musicなど）からオーディオを処理するには:

1. 前提条件:
   - 仮想オーディオデバイスをインストールする（例: VB Cable、Voice Meeter、または ASIO Link Tool）
   - ストリーミングサービスの出力先を仮想オーディオデバイスに設定する

2. 設定:
   - ブラウザでEffeTuneウェブアプリを開く、またはEffeTuneデスクトップアプリを起動する
   - 入力ソースとして仮想オーディオデバイスを選択する
     - Chromeでは、初めて開いたときにオーディオ入力を選択して許可するダイアログボックスが表示されます
     - デスクトップアプリでは、画面右上の「Config Audio」ボタンをクリックして設定します
   - ストリーミングサービスで音楽を再生する
   - EffeTuneを通じてオーディオが流れていることを確認する

### 物理的なオーディオソースのセットアップ

CDプレーヤー、ネットワークプレーヤー、またはその他の物理的なソースでEffeTuneを使用するには:

- オーディオインターフェースをコンピュータに接続する
- ブラウザでEffeTuneウェブアプリを開く、またはEffeTuneデスクトップアプリを起動する
- 入力ソースと出力先としてオーディオインターフェースを選択する
   - Chromeでは、初めて開いたときにオーディオ入力を選択して許可するダイアログボックスが表示されます
   - デスクトップアプリでは、画面右上の「Config Audio」ボタンをクリックして設定します
- これにより、オーディオインターフェースは以下のように機能します:
   * **Input:** CDプレーヤー、ネットワークプレーヤー、またはその他のオーディオソース
   * **Processing:** EffeTuneによるリアルタイムエフェクト処理
   * **Output:** アンプまたはスピーカーへ送られる処理済みオーディオ

## 使用方法

### エフェクトチェーンの作成

1. 画面左側に **Available Effects** の一覧が表示されています  
   - **Available Effects** の横にある検索ボタンを使用してエフェクトを絞り込みます  
   - 名前またはカテゴリでエフェクトを検索するには、任意のテキストを入力してください  
   - ESCキーを押して検索をクリアします
2. リストからエフェクトをドラッグして、**Effect Pipeline** エリアに配置します
3. エフェクトは上から下へ順番に処理されます
4. ハンドル (⋮) をドラッグまたは▲▼ボタンで順序を変更
5. エフェクト名をクリックし設定の展開・折りたたみ
   - Shift+クリックでAnalyzerカテゴリー以外の全エフェクトを一括展開・折りたたみ
6. **ON** ボタンを使用して、個々のエフェクトをバイパスします
7. ？ボタンをクリックすると、詳細なドキュメントが新しいタブで開きます
8. ×ボタンを使ってエフェクトを削除します
9. ルーティングボタンをクリックして、処理するチャンネルと入出力バスを設定します
   - [バス機能の詳細](bus-function.md)

### プリセットの使用

1. **エフェクトチェーンの保存:**
   - 希望のエフェクトチェーンとパラメーターを設定する
   - プリセットの名前を入力フィールドに入力する
   - saveボタンをクリックしてプリセットを保存する

2. **プリセットの読み込み:**
   - ドロップダウンリストからプリセット名を入力または選択する
   - プリセットは自動的に読み込まれる
   - すべてのエフェクトとその設定が復元される

3. **プリセットの削除:**
   - 削除したいプリセットを選択する
   - deleteボタンをクリックする
   - 確認ダイアログで削除を承認する

4. **プリセット情報:**
   - 各プリセットはエフェクトチェーンの完全な設定を保存する
   - エフェクトの順序、パラメーター、状態が含まれる

### エフェクト選択とキーボードショートカット

1. **エフェクト選択方法:**
   - エフェクトのヘッダーをクリックして個々のエフェクトを選択する
   - Ctrlキーを押しながらクリックすると、複数のエフェクトを選択できる
   - Pipelineエリアの空白部分をクリックして、すべてのエフェクトの選択を解除する

2. **キーボードショートカット:**
   - Ctrl + Z: 元に戻す
   - Ctrl + Y: やり直す
   - Ctrl + S: 現在のパイプラインを保存
   - Ctrl + Shift + S: 現在のパイプラインを別名で保存
   - Ctrl + X: 選択したエフェクトを切り取る
   - Ctrl + C: 選択したエフェクトをコピー
   - Ctrl + V: クリップボードからエフェクトを貼り付ける
   - Ctrl + F: エフェクトを検索する
   - Ctrl + A: パイプライン内のすべてのエフェクトを選択する
   - Delete: 選択したエフェクトを削除する
   - ESC: すべてのエフェクトの選択を解除する

3. **セクション機能の使用方法:**
   - グループ化したいエフェクト群の先頭にSectionエフェクトを配置する
   - Commentフィールドに分かりやすい名前を入力する
   - SectionのON/OFFを切り替えると、そのセクション内のすべてのエフェクトが一括で有効/無効になる
   - 複数のSectionエフェクトを使用して、エフェクトチェーンを論理的なグループに整理する
   - [制御エフェクトの詳細](plugins/control.md)

4. **キーボードショートカット（プレイヤー使用時）**：
   - Space：再生/一時停止
   - Ctrl + → または N：次のトラック
   - Ctrl + ← または P：前のトラック
   - Shift + → または F または .：10秒早送り
   - Shift + ← または B または ,：10秒巻き戻し
   - Ctrl + T：リピートモード切り替え
   - Ctrl + H：シャッフルモード切り替え

### オーディオファイルの処理

1. **ファイルドロップまたはファイル指定エリア:**
   - **Effect Pipeline** の下に常に表示される専用のドロップエリア
   - 単一または複数のオーディオファイルに対応
   - ファイルは現在のパイプライン設定で処理される
   - すべての処理はパイプラインのサンプルレートで行われる

2. **処理状況:**
   - プログレスバーが現在の処理状況を表示する
   - 処理時間はファイルサイズとエフェクトチェーンの複雑さに依存する

3. **ダウンロードまたは保存オプション:**
   - 処理されたファイルはWAV形式で出力される
   - 複数ファイルは自動的にZIPファイルにまとめられる

### エフェクトチェーンの共有

他のユーザーとエフェクトチェーンの設定を共有できます:
1. 希望のエフェクトチェーンを設定したら、**Effect Pipeline** エリアの右上にある **Share** ボタンをクリックする
2. ウェブアプリのURLが自動的にクリップボードにコピーされる
3. コピーされたURLを他のユーザーと共有する ― 共有されたURLを開くことで、まったく同じエフェクトチェーンを再現できます
4. ウェブアプリでは、すべてのエフェクト設定がURLに保存されるため、簡単に保存・共有が可能です
5. デスクトップアプリ版では、ファイルメニューからeffetune_presetファイルに設定をエクスポートできます
6. エクスポートしたeffetune_presetファイルを共有してください。effetune_presetファイルはウェブアプリウィンドウにドラッグして読み込むこともできます

### Audio Reset

オーディオの問題（ドロップアウト、グリッチ）が発生した場合:
1. ウェブアプリでは左上の **Reset Audio** ボタンをクリック、またはデスクトップアプリではViewメニューからReloadを選択する
2. オーディオパイプラインが自動的に再構築される
3. エフェクトチェーンの設定は保持される

## よく使われるエフェクトの組み合わせ

あなたのリスニング体験を向上させるための人気のエフェクト組み合わせをいくつかご紹介します:

### ヘッドフォン強化

1. Stereo Blend -> RS Reverb  
   - **Stereo Blend:** 快適な音場を実現するためにステレオ幅を調整する (60-100%)  
   - **RS Reverb:** 微妙な部屋のアンビエンスを追加する (10-20% mix)  
   - **結果:** より自然で耳が疲れにくいヘッドフォンでのリスニング体験

### Vinyl Simulation

1. Wow Flutter -> Noise Blender -> Saturation  
   - **Wow Flutter:** やわらかなピッチの変動を加える  
   - **Noise Blender:** ヴィニールらしい雰囲気を作り出す  
   - **Saturation:** アナログ的な温かみを加える  
   - **結果:** 本物のヴィニールレコード体験

### FM Radio Style

1. Multiband Compressor -> Stereo Blend  
   - **Multiband Compressor:** "radio"サウンドを作り出す  
   - **Stereo Blend:** 快適な音場のためにステレオ幅を調整する (100-150%)  
   - **結果:** プロフェッショナルな放送のようなサウンド

### Lo-Fi Character

1. Bit Crusher -> Simple Jitter -> RS Reverb  
   - **Bit Crusher:** レトロな雰囲気のためにビット深度を削減する  
   - **Simple Jitter:** デジタルな不完全さを加える  
   - **RS Reverb:** 大気感のある空間を作り出す  
   - **結果:** クラシックなローファイ美学

## トラブルシューティング

### オーディオの問題

1. **ドロップアウトまたはグリッチ**
   - ウェブアプリでは左上の **Reset Audio** ボタンをクリック、またはデスクトップアプリではViewメニューからReloadを選択してオーディオパイプラインを再構築する
   - アクティブなエフェクトの数を減らす

2. **高いCPU使用率**
   - 使用していないエフェクトを無効にする
   - チェーン内のエフェクト数を減らすことを検討する

3. **エコーが発生する**
   - オーディオの入力と出力が正しく設定されていない可能性があります
   - ブラウザの出力を処理するには、EffeTune専用のブラウザをインストールするか、ウェブアプリの代わりにデスクトップアプリを使用することを検討してください

### よくあるセットアップの問題

1. **オーディオ入力がない**
   - ソースからオーディオが再生され、仮想オーディオデバイスに出力されていることを確認する
   - ウェブアプリ版では、ブラウザでオーディオ入力の権限が許可されていること、および仮想オーディオデバイスが入力デバイスとして選択されていることを確認する
   - デスクトップアプリ版では、画面右上の「Config Audio」をクリックし、仮想オーディオデバイスが入力デバイスとして選択されていることを確認する

2. **エフェクトが機能していない**
   - エフェクトが有効になっているか（ON/OFFボタン）確認する
   - パラメーター設定をチェックする

3. **オーディオ出力がない**
   - ウェブアプリ版では、OSのオーディオ出力が出力デバイスとして設定されていることを確認する
   - デスクトップアプリ版では、画面右上の「Config Audio」をクリックし、正しい出力デバイスが選択されていることを確認する

## よくある質問

**Q. このアプリはサラウンドサウンドに対応していますか？**
A. 現在、ブラウザの制限により、ブラウザ上で2チャンネル以上の処理はできず、サラウンドサウンドの実績はありません。エフェクト自体はサラウンドサウンドをサポートしていますが、将来的なブラウザ対応を待つ必要があります。

**Q. 推奨されるエフェクトチェーンの長さはどのくらいですか？**
A. 厳密な制限はありませんが、最適なパフォーマンスのためにエフェクトチェーンは8〜10エフェクト程度に保つことをお勧めします。より複雑なチェーンはシステムパフォーマンスに影響を与える可能性があります。

**Q. 最高の音質を実現するにはどうすればよいですか？**
A. 可能であれば96kHz以上のサンプルレートを使用し、控えめなエフェクト設定から始め、徐々にチェーンを構築してください。歪みを避けるためにレベルを監視しましょう。

**Q. どのようなオーディオソースでも動作しますか？**
A. はい、EffeTuneは、ストリーミングサービス、ローカルファイル、物理メディアなど、選択した入力デバイスを通じて再生される任意のオーディオを処理できます。

## Available Effects

| カテゴリ   | エフェクト             | 説明                                                      | ドキュメント                       |
|------------|--------------------|------------------------------------------------------------|------------------------------------|
| Analyzer   | Level Meter        | ピークホールド付きのオーディオレベルを表示します               | [詳細](plugins/analyzer.md#level-meter) | 
| Analyzer   | Oscilloscope       | リアルタイムで波形を視覚化します                            | [詳細](plugins/analyzer.md#oscilloscope) |
| Analyzer   | Spectrogram        | 時間経過に伴う周波数スペクトルの変化を表示します             | [詳細](plugins/analyzer.md#spectrogram) |
| Analyzer   | Spectrum Analyzer  | リアルタイムでスペクトルを分析します                       | [詳細](plugins/analyzer.md#spectrum-analyzer) |
| Analyzer   | Stereo Meter       | ステレオバランスと音の動きを視覚化します                 | [詳細](plugins/analyzer.md#stereo-meter) |
| Basics     | DC Offset          | DCオフセットを調整します                                  | [詳細](plugins/basics.md#dc-offset) |
| Basics     | Polarity Inversion | 信号の極性を反転します                                    | [詳細](plugins/basics.md#polarity-inversion) |
| Basics     | Stereo Balance     | ステレオチャンネルのバランスを制御します                   | [詳細](plugins/basics.md#stereo-balance) |
| Basics     | Volume             | 基本的な音量制御                                         | [詳細](plugins/basics.md#volume) |
| Delay      | Delay              | 標準的なディレイエフェクト                                | [詳細](plugins/delay.md#delay) |
| Delay      | Time Alignment     | オーディオチャンネルの精密なタイミング調整                | [詳細](plugins/delay.md#time-alignment) |
| Dynamics   | Auto Leveler       | 一貫したリスニング体験のためのLUFS測定に基づく自動音量調整 | [詳細](plugins/dynamics.md#auto-leveler) |
| Dynamics   | Brickwall Limiter  | 安全で快適なリスニングのための透明なピーク制御             | [詳細](plugins/dynamics.md#brickwall-limiter) |
| Dynamics   | Compressor         | スレッショルド、レシオ、ニー制御を備えたダイナミックレンジ圧縮 | [詳細](plugins/dynamics.md#compressor) |
| Dynamics   | Gate               | ノイズリダクションのためのスレッショルド、レシオ、ニー制御を備えたノイズゲート | [詳細](plugins/dynamics.md#gate) |
| Dynamics   | Multiband Compressor | FMラジオスタイルのサウンドシェーピングを備えたプロフェッショナルな5バンドダイナミクスプロセッサ | [詳細](plugins/dynamics.md#multiband-compressor) |
| EQ         | 15Band GEQ         | 15バンドグラフィックイコライザー                          | [詳細](plugins/eq.md#15band-geq) |
| EQ         | 5Band PEQ          | 5つの完全に設定可能なバンドを備えたプロフェッショナルなパラメトリックイコライザー | [詳細](plugins/eq.md#5band-peq) |
| EQ | Hi Pass Filter | 不要な低域周波数を精密に除去します | [詳細](plugins/eq.md#hi-pass-filter) |
| EQ | Lo Pass Filter | 不要な高域周波数を精密に除去します | [詳細](plugins/eq.md#lo-pass-filter) |
| EQ         | Loudness Equalizer | 低音量リスニングのための周波数バランス補正                | [詳細](plugins/eq.md#loudness-equalizer) |
| EQ         | Narrow Range       | ハイパスフィルターとローパスフィルターの組み合わせ           | [詳細](plugins/eq.md#narrow-range) |
| EQ         | Tilt EQ            | 素早いトーンシェーピングのためのチルトイコライザー           | [詳細](plugins/eq.md#tilt-eq) |
| EQ         | Tone Control       | 3バンドトーンコントロール                                  | [詳細](plugins/eq.md#tone-control) |
| Lo-Fi      | Bit Crusher        | ビット深度の削減とゼロオーダーホールドエフェクト            | [詳細](plugins/lofi.md#bit-crusher) |
| Lo-Fi      | Noise Blender      | ノイズ生成とミキシング                                   | [詳細](plugins/lofi.md#noise-blender) |
| Lo-Fi      | Simple Jitter      | デジタルジッターシミュレーション                         | [詳細](plugins/lofi.md#simple-jitter) |
| Modulation | Doppler Distortion | スピーカーコーンの微妙な動きによって引き起こされる、音の自然でダイナミックな変化をシミュレートします | [詳細](plugins/modulation.md#doppler-distortion) |
| Modulation | Pitch Shifter | 軽量なピッチシフトエフェクト | [詳細](plugins/modulation.md#pitch-shifter) |
| Modulation | Tremolo | ボリュームベースのモジュレーションエフェクト | [詳細](plugins/modulation.md#tremolo) |
| Modulation | Wow Flutter | 時間ベースのモジュレーションエフェクト | [詳細](plugins/modulation.md#wow-flutter) |
| Resonator  | Horn Resonator     | カスタマイズ可能な寸法を持つホーン共鳴シミュレーション    | [詳細](plugins/resonator.md#horn-resonator) |
| Resonator  | Modal Resonator    | 最大5つのレゾネータを持つ周波数共振エフェクト            | [詳細](plugins/resonator.md#modal-resonator) |
| Reverb     | RS Reverb          | 自然な拡散を持つランダムスキャッタリングリバーブ          | [詳細](plugins/reverb.md#rs-reverb) |
| Saturation | Hard Clipping    | デジタルハードクリッピングエフェクト                      | [詳細](plugins/saturation.md#hard-clipping) |
| Saturation | Harmonic Distortion | 各ハーモニクスの独立した制御を備えたハーモニックディストーションを通じてユニークなキャラクターを追加します | [詳細](plugins/saturation.md#harmonic-distortion) |
| Saturation | Multiband Saturation | 正確な周波数ベースの暖かさのための3バンドサチュレーションエフェクト | [詳細](plugins/saturation.md#multiband-saturation) |
| Saturation | Saturation        | サチュレーションエフェクト                                | [詳細](plugins/saturation.md#saturation) |
| Saturation | Sub Synth         | 低音強調のためのサブハーモニック信号のミックスイン        | [詳細](plugins/saturation.md#sub-synth) |
| Spatial    | Multiband Balance  | 5バンド周波数依存ステレオバランスコントロール             | [詳細](plugins/spatial.md#multiband-balance) |
| Spatial    | Stereo Blend       | ステレオ幅コントロールエフェクト                         | [詳細](plugins/spatial.md#stereo-blend) |
| Others     | Oscillator         | マルチウェーブフォームオーディオ信号ジェネレーター       | [詳細](plugins/others.md#oscillator) |
| Control    | Section            | 複数のエフェクトをグループ化して一括制御 | [詳細](plugins/control.md) |

## 技術情報

### ブラウザ互換性

Frieve EffeTuneはGoogle Chromeで動作することがテストされ、確認されています。本アプリケーションは以下の機能をサポートする最新のブラウザが必要です:
- Web Audio API
- Audio Worklet
- getUserMedia API
- Drag and Drop API

### ブラウザサポートの詳細

1. Chrome/Chromium
   - 完全にサポートされ、推奨されています
   - 最適なパフォーマンスのために最新バージョンに更新してください

2. Firefox/Safari
   - サポートは限定的です
   - 一部の機能は期待通りに動作しない場合があります
   - 最良の体験のためにChromeの使用を検討してください

### 推奨サンプルレート

非線形エフェクトを最適に動作させるために、EffeTuneは96kHz以上のサンプルレートで使用することを推奨します。この高いサンプルレートにより、サチュレーションやコンプレッションなどの非線形エフェクト処理時に理想的な特性が得られます。

## 開発ガイド

自分だけのオーディオプラグインを作成してみたいですか？ 詳細は[プラグイン開発ガイド](../../plugin-development.md)をご覧ください。
デスクトップアプリをビルドしたいですか？ [ビルドガイド](../../build.md)をご覧ください。

## リンク

[バージョン履歴](../../version-history.md)

[ソースコード](https://github.com/Frieve-A/effetune)

[YouTube](https://www.youtube.com/@frieveamusic)
