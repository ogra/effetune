# Frieve EffeTune <img src="../../../images/icon_64x64.png" alt="EffeTune Icon" width="30" height="30" align="bottom">

[Open Web App](https://frieve-a.github.io/effetune/effetune.html)  [Download Desktop App](https://github.com/Frieve-A/effetune/releases/)

一个实时音频效果处理器，旨在为音频爱好者提升音乐聆听体验。EffeTune 允许您通过各种高质量效果处理任何音频源，从而实时定制并完善您的聆听体验。

[![Screenshot](../../../images/screenshot.png)](https://frieve-a.github.io/effetune/effetune.html)

## 概念

EffeTune 专为希望提升音乐聆听体验的音频爱好者而设计。无论您是在流媒体播放音乐还是从物理介质播放，EffeTune 都能让您添加专业级效果，以精确定制声音。将您的计算机转变为一个强大的音频效果处理器，置于音频源与扬声器或功放之间。

拒绝音响神话，纯粹科学。

## 功能

- 实时音频处理
- 拖放式界面构建效果链
- 可扩展的分类效果系统
- 实时音频可视化
- 可实时修改的音频管道
- 使用当前效果链的离线音频文件处理
- 分组功能，用于将多个效果组合在一起控制

## 设置指南

在使用 EffeTune 之前，您需要配置音频路由。以下是配置不同音频源的方法：

### 音乐文件播放器设置

- 在浏览器中打开 EffeTune 网页应用，或启动 EffeTune 桌面应用
- 打开并播放音乐文件以确保正常播放
   - 打开音乐文件并选择 EffeTune 作为应用程序（仅桌面应用）
   - 或从文件菜单选择打开音乐文件...（仅桌面应用）
   - 或将音乐文件拖入窗口

### Streaming Service Setup

处理流媒体服务（如 Spotify、YouTube Music 等）的音频：

1. 前提条件：
   - 安装虚拟音频设备（例如 VB Cable、Voice Meeter 或 ASIO Link Tool）
   - 将您的流媒体服务配置为将音频输出到虚拟音频设备

2. 配置：
   - 在浏览器中打开 EffeTune 网页应用，或启动 EffeTune 桌面应用
   - 选择虚拟音频设备作为输入源
     - 在 Chrome 中，首次打开时会出现一个对话框，要求您选择并允许音频输入
     - 在桌面应用中，通过点击屏幕右上角的 Config Audio 按钮进行设置
   - 开始播放流媒体音乐
   - 确认音频通过 EffeTune 正常传输

### Physical Audio Source Setup

使用 EffeTune 与 CD 播放器、网络播放器或其他物理音源：

- 将您的音频接口连接到计算机
- 在浏览器中打开 EffeTune 网页应用，或启动 EffeTune 桌面应用
- 选择您的音频接口作为输入和输出源
   - 在 Chrome 中，首次打开时会出现一个对话框，要求您选择并允许音频输入
   - 在桌面应用中，通过点击屏幕右上角的 Config Audio 按钮进行设置
- 您的音频接口现在充当多效果处理器：
   * Input: 您的 CD 播放器、网络播放器或其他音频源
   * Processing: 通过 EffeTune 进行实时效果处理
   * Output: 将处理后的音频输出到功放或扬声器

## 使用方法

### 构建您的效果链

1. 屏幕左侧列出了 Available Effects
   - 使用 "Available Effects" 旁边的搜索按钮过滤效果
   - 输入任意文本以按名称或分类查找效果
   - 按 ESC 清除搜索
2. 将效果从列表拖放到 Effect Pipeline 区域
3. 效果按从上到下的顺序处理
4. 拖动手柄 (⋮) 或点击 ▲▼ 按钮重新排序效果
5. 点击效果名称以展开/折叠其设置
   - 按住Shift键点击可折叠/展开除分析器类别以外的所有效果
6. 使用 ON 按钮绕过单个效果
7. 点击 ? 按钮在新标签页中打开详细文档
8. 使用 × 按钮移除效果
9. 点击路由按钮设置输入和输出总线
   - [更多关于总线功能的信息](bus-function.md)

### 使用 Presets

1. 保存您的效果链：
   - 设置好所需的效果链和参数
   - 在输入栏中输入您的 preset 名称
   - 点击 save 按钮保存您的 preset

2. 加载 Preset：
   - 在下拉列表中输入或选择 preset 名称
   - preset 将自动加载
   - 所有效果及其设置将被恢复

3. 删除 Preset：
   - 选择要删除的 preset
   - 点击 delete 按钮
   - 出现提示时确认删除

4. Preset 信息：
   - 每个 preset 存储了完整的效果链配置
   - 包括效果顺序、参数和状态

### 效果选择和键盘快捷键

1. 效果选择方法：
   - 点击效果标题以选择单个效果
   - 按住 Ctrl 键点击以选择多个效果
   - 点击 Pipeline 区域空白处取消所有效果的选择

2. 键盘快捷键：
   - Ctrl + Z: 撤销
   - Ctrl + Y: 重做
   - Ctrl + S: 保存当前流程
   - Ctrl + Shift + S: 另存为当前流程
   - Ctrl + X: 剪切选中的效果
   - Ctrl + C: 复制选中的效果
   - Ctrl + V: 从剪贴板粘贴效果
   - Ctrl + F: 搜索效果
   - Ctrl + A: 选择流程中的所有效果
   - Delete: 删除选中的效果
   - ESC: 取消选择所有效果

3. 使用分组功能：
   - 在效果链开始处添加一个分组效果
   - 在注释字段中输入描述性名称
   - 切换分组效果的 ON/OFF 将启用/禁用该分组中的所有效果
   - 使用多个分组效果将效果链组织成逻辑分组
   - [更多关于控制效果的信息](plugins/control.md)

4. 键盘快捷键（使用播放器时）：
   - Space：播放/暂停
   - Ctrl + → 或 N：下一曲
   - Ctrl + ← 或 P：上一曲
   - Shift + → 或 F 或 .：快进10秒
   - Shift + ← 或 B 或 ,：后退10秒
   - Ctrl + T：切换循环模式
   - Ctrl + H：切换随机模式

### 处理音频文件

1. 文件拖放或文件指定区域：
   - 一个专用拖放区域始终显示在 Effect Pipeline 下方
   - 支持单个或多个音频文件
   - 文件将使用当前 Pipeline 设置进行处理
   - 所有处理均以 Pipeline 的采样率进行

2. 处理状态：
   - 进度条显示当前处理状态
   - 处理时间取决于文件大小和效果链复杂度

3. 下载或保存选项：
   - 处理后的文件以 WAV 格式输出
   - 多个文件会自动打包成 ZIP 文件

### 分享效果链

您可以与其他用户分享您的效果链配置：
1. 设置好所需的效果链后，点击 Effect Pipeline 区域右上角的 "Share" 按钮
2. 网页应用的 URL 会自动复制到剪贴板
3. 将复制的 URL 分享给他人 —— 他们可通过打开链接重现您完全相同的效果链
4. 在网页应用中，所有效果设置均存储在 URL 中，便于保存和分享
5. 在桌面应用版本中，可以从文件菜单导出设置到 effetune_preset 文件
6. 分享导出的 effetune_preset 文件。effetune_preset 文件也可以通过拖入网页应用窗口加载

### 音频重置

如果您遇到音频问题（断音、杂音）：
1. 在网页应用中点击左上角的 "Reset Audio" 按钮，或在桌面应用中从 View 菜单选择 Reload
2. 音频管道将自动重建
3. 您的效果链配置将被保留

## 常见效果组合

以下是一些流行的效果组合，旨在提升您的聆听体验：

### Headphone Enhancement
1. Stereo Blend -> RS Reverb
   - Stereo Blend: 调整立体声宽度以获得舒适感（60-100%）
   - RS Reverb: 添加微妙的房间氛围（混合比例 10-20%）
   - 结果: 更自然、更不易疲劳的耳机聆听体验

### Vinyl Simulation
1. Wow Flutter -> Noise Blender -> Saturation
   - Wow Flutter: 添加轻微的音高变化
   - Noise Blender: 营造出仿黑胶唱片的氛围
   - Saturation: 增加模拟暖音
   - 结果: 真实的黑胶唱片体验

### FM Radio Style
1. Multiband Compressor -> Stereo Blend
   - Multiband Compressor: 营造出"电台"般的声音
   - Stereo Blend: 调整立体声宽度以获得舒适感（100-150%）
   - 结果: 专业的广播级音效

### Lo-Fi Character
1. Bit Crusher -> Simple Jitter -> RS Reverb
   - Bit Crusher: 降低位深以营造复古感觉
   - Simple Jitter: 添加数字瑕疵
   - RS Reverb: 营造出氛围空间
   - 结果: 经典的 lo-fi 美学

## 故障排除

### 音频问题
1. 断音或杂音
   - 在网页应用中点击左上角的 "Reset Audio" 按钮，或在桌面应用中从 View 菜单选择 Reload 重建音频管道
   - 尝试减少激活效果的数量

2. 高 CPU 使用率
   - 禁用未主动使用的效果
   - 考虑在效果链中使用较少效果

3. 出现回声
   - 可能是您的音频输入和输出配置不正确
   - 要处理浏览器的音频输出，请考虑专门为 EffeTune 安装单独的浏览器，或使用桌面应用而不是网页应用

### 常见设置问题
1. 无音频输入
   - 确认音频正在从源播放并输出到虚拟音频设备
   - 对于网页应用版本，确保浏览器中允许音频输入权限，并且虚拟音频设备被选为输入设备
   - 对于桌面应用版本，点击屏幕右上角的 "Config Audio"，确保虚拟音频设备被选为输入设备

2. 效果无响应
   - 验证效果是否已启用（ON/OFF 按钮）
   - 检查参数设置

3. 无音频输出
   - 对于网页应用版本，确保操作系统的音频输出被设置为输出设备
   - 对于桌面应用版本，点击屏幕右上角的 "Config Audio"，确保选择了正确的输出设备

## FAQ

**Q. 该应用支持环绕声吗？**
**A.** 目前由于浏览器的限制，我们无法在浏览器中处理超过 2 个声道，也没有经过验证的环绕声运行记录。虽然效果本身支持环绕声，但需要等待未来浏览器的支持。

**Q. 推荐的效果链长度是多少？**
**A.** 尽管没有严格限制，我们建议将效果链保持在 8-10 个效果以内以获得最佳性能。更复杂的链可能会影响系统性能。

**Q. 如何实现最佳音质？**
**A.** 尽可能使用 96kHz 或更高的采样率，从细微的效果设置开始，并逐步构建效果链。监控音量以避免失真。

**Q. 这能处理任何音频源吗？**
**A.** 可以，EffeTune 能处理通过您所选输入设备播放的任何音频，包括流媒体服务、本地文件和物理介质。

## 可用效果

| 分类      | 效果              | 描述                                      | 文档          |
|-----------|-------------------|-------------------------------------------|---------------|
| Analyzer  | Level Meter       | 显示具有峰值保持的音频电平                   | [详情](plugins/analyzer.md#level-meter) |
| Analyzer  | Oscilloscope      | 实时波形可视化                              | [详情](plugins/analyzer.md#oscilloscope) |
| Analyzer  | Spectrogram       | 显示频谱随时间变化的情况                     | [详情](plugins/analyzer.md#spectrogram) |
| Analyzer  | Spectrum Analyzer | 实时频谱分析                              | [详情](plugins/analyzer.md#spectrum-analyzer) |
| Analyzer  | Stereo Meter      | 可视化立体声平衡及声音运动                    | [详情](plugins/analyzer.md#stereo-meter) |
| Basics    | DC Offset         | 直流偏移调整                               | [详情](plugins/basics.md#dc-offset) |
| Basics    | Polarity Inversion| 信号极性反转                               | [详情](plugins/basics.md#polarity-inversion) |
| Basics    | Stereo Balance    | 立体声通道平衡控制                          | [详情](plugins/basics.md#stereo-balance) |
| Basics    | Volume            | 基本音量控制                               | [详情](plugins/basics.md#volume) |
| Delay     | Delay             | 标准延迟效果                               | [详情](plugins/delay.md#delay) |
| Delay     | Modal Resonator   | 具有最多5个共振器的频率共振效果 | [详情](plugins/delay.md#modal-resonator) |
| Delay     | Time Alignment    | 音频通道的精确时间调整                      | [详情](plugins/delay.md#time-alignment) |
| Dynamics  | Auto Leveler      | 基于 LUFS 测量的自动音量调整，确保一致的聆听体验 | [详情](plugins/dynamics.md#auto-leveler) |
| Dynamics  | Brickwall Limiter | 透明的峰值控制，实现安全舒适的聆听           | [详情](plugins/dynamics.md#brickwall-limiter) |
| Dynamics  | Compressor        | 带有阈值、比例和拐点控制的动态范围压缩            | [详情](plugins/dynamics.md#compressor) |
| Dynamics  | Gate              | 带有阈值、比例和拐点控制的降噪门                   | [详情](plugins/dynamics.md#gate) |
| Dynamics  | Multiband Compressor | 专业的 5 频段动态处理器，具有 FM 电台风格的声音塑形   | [详情](plugins/dynamics.md#multiband-compressor) |
| EQ        | 15Band GEQ        | 15 频段图形均衡器                           | [详情](plugins/eq.md#15band-geq) |
| EQ        | 5Band PEQ         | 专业参数均衡器，具有 5 个全可配置频段              | [详情](plugins/eq.md#5band-peq) |
| EQ | Hi Pass Filter | 精确地去除不需要的低频 | [详情](plugins/eq.md#hi-pass-filter) |
| EQ | Lo Pass Filter | 精确地去除不需要的高频 | [详情](plugins/eq.md#lo-pass-filter) |
| EQ        | Loudness Equalizer| 针对低音量聆听的频率平衡校正                    | [详情](plugins/eq.md#loudness-equalizer) |
| EQ        | Narrow Range      | 高通和低通滤波器组合                         | [详情](plugins/eq.md#narrow-range) |
| EQ        | Tilt EQ           | 用于快速音调塑造的倾斜均衡器                   | [详情](plugins/eq.md#tilt-eq)      |
| EQ        | Tone Control      | 三频段音调控制                              | [详情](plugins/eq.md#tone-control) |
| Lo-Fi     | Bit Crusher       | 位深度降低及零阶保持效果                       | [详情](plugins/lofi.md#bit-crusher) |
| Lo-Fi     | Noise Blender     | 噪声生成与混合                              | [详情](plugins/lofi.md#noise-blender) |
| Lo-Fi     | Simple Jitter     | 数字抖动模拟                               | [详情](plugins/lofi.md#simple-jitter) |
| Modulation | Doppler Distortion | 模拟因音箱锥体微妙运动产生的自然、动态的声音变化 | [详情](plugins/modulation.md#doppler-distortion) |
| Modulation | Pitch Shifter | 轻量级音高变换效果 | [详情](docs/plugins/modulation.md#pitch-shifter) |
| Modulation | Tremolo | 基于音量的调制效果 | [详情](docs/plugins/modulation.md#tremolo) |
| Modulation | Wow Flutter | 基于时间的调制效果 | [详情](docs/plugins/modulation.md#wow-flutter) |
| Reverb    | RS Reverb         | 随机散射混响，具有自然扩散效果                    | [详情](plugins/reverb.md#rs-reverb) |
| Saturation| Hard Clipping     | 数字硬削波效果                              | [详情](plugins/saturation.md#hard-clipping) |
| Saturation | Harmonic Distortion | 通过独立控制各谐波的谐波失真添加独特的特性 | [详情](plugins/saturation.md#harmonic-distortion) |
| Saturation| Multiband Saturation | 3 频段饱和效果，实现精确的频率基础暖音             | [详情](plugins/saturation.md#multiband-saturation) |
| Saturation| Saturation        | 饱和效果                                  | [详情](plugins/saturation.md#saturation) |
| Saturation| Sub Synth         | 混合次谐波信号以增强低音                      | [详情](plugins/saturation.md#sub-synth) |
| Spatial   | Multiband Balance | 5 频段频率依赖的立体声平衡控制                   | [详情](plugins/spatial.md#multiband-balance) |
| Spatial   | Stereo Blend      | 立体声宽度控制效果                           | [详情](plugins/spatial.md#stereo-blend) |
| Others    | Oscillator        | 多波形音频信号生成器                          | [详情](plugins/others.md#oscillator) |
| Control   | Section           | Group multiple effects for unified control  | [详情](plugins/control.md) |

## 技术信息

### 浏览器兼容性

Frieve EffeTune 已在 Google Chrome 上测试验证运行。该应用需要支持以下功能的现代浏览器：
- Web Audio API
- Audio Worklet
- getUserMedia API
- Drag and Drop API

### 浏览器支持详情
1. Chrome/Chromium
   - 完全支持，推荐使用
   - 请更新至最新版本以获得最佳性能

2. Firefox/Safari
   - 支持有限
   - 部分功能可能无法如预期般运行
   - 建议使用 Chrome 以获得最佳体验

### 推荐采样率

为了在非线性效果下获得最佳性能，建议在 96kHz 或更高采样率下使用 EffeTune。更高的采样率有助于在处理饱和和压缩等非线性效果时达到理想特性。

## 开发指南

想要创建您自己的音频插件？请查看我们的 [Plugin Development Guide](../../plugin-development.md)。
想要构建桌面应用？请查看我们的 [构建指南](../../build.md)。

## 链接

[Version History](../../version-history.md)

[Source Code](https://github.com/Frieve-A/effetune)

[YouTube](https://www.youtube.com/@frieveamusic)
