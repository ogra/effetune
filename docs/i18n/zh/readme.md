# Frieve EffeTune <img src="../../../images/icon.png" alt="EffeTune Icon" width="30" heignt="30" align="bottom">

[Open App](https://frieve-a.github.io/effetune/effetune.html)

EffeTune 是一款基于网页的实时音频效果处理器,专为音乐爱好者打造,旨在提升音乐聆听体验。通过各种高品质的音效处理,您可以实时调整和完善您的聆听体验。

[![Screenshot](../../../images/screenshot.png)](https://frieve-a.github.io/effetune/effetune.html)

## 理念

EffeTune 专为追求极致音乐体验的发烧友而生。无论您是在线播放音乐还是使用物理媒介,EffeTune 都能让您添加专业级音效,完全按照个人喜好定制声音。它能将您的计算机转变为一台强大的音频处理器,完美衔接音源与音箱或功放。

不玩虚的,只讲科学。

## 特点

- 实时音频处理
- 拖放式音效链构建界面
- 可扩展的分类插件系统
- 实时音频可视化
- 可实时修改的音频处理流程
- 使用当前效果链进行离线音频文件处理

## 设置指南

使用 EffeTune 前,您需要设置音频路由。以下是不同音源的配置方法:

### 流媒体服务设置

处理流媒体服务(如 Spotify、YouTube Music 等)的音频:

1. 前提条件:
   - 安装虚拟音频设备(如 VB Cable、Voice Meeter 或 ASIO Link Tool)
   - 将流媒体服务的音频输出设置为虚拟音频设备

2. 配置步骤:
   - 启动 EffeTune
   - 选择虚拟音频设备作为输入源
   - 开始播放流媒体音乐
   - 确认音频正在通过 EffeTune 处理
   - 在处理流程中添加音效以提升聆听体验

### 物理音源设置

使用 CD 播放器、网络播放器或其他物理音源:

1. 配置步骤:
   - 将音频接口连接到计算机
   - 启动 EffeTune
   - 选择音频接口作为输入源
   - 将浏览器的音频输出配置到音频接口
   - 您的音频接口现在可以作为多效果处理器:
     * 输入:CD 播放器、网络播放器或其他音源
     * 处理:通过 EffeTune 实时处理效果
     * 输出:处理后的音频输出到功放或音箱

## 使用方法

### 构建效果链

1. 可用插件列表显示在屏幕左侧
2. 将插件从列表拖放到效果处理区域
3. 插件按从上到下的顺序处理
4. 使用手柄(⋮)拖动重新排序插件
5. 点击插件名称展开/折叠设置
6. 使用开关按钮绕过单个效果
7. 使用垃圾桶图标移除插件

### 使用预设

1. 保存效果链:
   - 设置所需的效果链和参数
   - 在预设输入栏中输入名称
   - 点击保存按钮存储预设

2. 加载预设:
   - 从下拉列表中选择或输入预设名称
   - 预设将自动加载
   - 所有插件和设置将被恢复

3. 删除预设:
   - 选择要删除的预设
   - 点击删除按钮
   - 确认删除提示

4. 预设信息:
   - 预设存储完整的效果链配置
   - 包含插件顺序、参数和状态

### 插件选择和键盘快捷键

1. 插件选择方法:
   - 点击插件标题选择单个插件
   - 按住 Ctrl 点击选择多个插件
   - 点击处理区域的空白处取消所有选择

2. 键盘快捷键:
   - Ctrl + A:选择处理区域中的所有插件
   - Ctrl + C:复制选中的插件
   - Ctrl + V:粘贴剪贴板中的插件
   - ESC:取消所有选择

3. 插件文档:
   - 点击任何插件上的 ? 按钮在新标签页中打开详细文档

### 处理音频文件

1. 文件拖放区域:
    - 效果处理区域下方始终显示专用的拖放区域
    - 支持单个或多个音频文件
    - 使用当前处理流程设置处理文件
    - 所有处理均在处理流程的采样率下进行

2. 处理状态:
    - 进度条显示当前处理状态
    - 处理时间取决于文件大小和效果链复杂度

3. 下载选项:
    - 单个文件以 WAV 格式下载
    - 多个文件自动打包为 ZIP 文件

### 分享效果链

您可以与其他用户分享您的效果链配置:
1. 设置好理想的效果链后,点击效果处理区域右上角的"分享"按钮
2. 链接将自动复制到剪贴板
3. 将复制的链接分享给他人 - 他们可以通过打开链接重现您的效果链
4. 所有效果设置都存储在链接中,便于保存和分享

### 音频重置

如果遇到音频问题(断音、杂音):
1. 点击左上角的"重置音频"按钮
2. 音频处理流程将自动重建
3. 您的效果链配置将被保留

## 常用效果组合

以下是一些用于提升聆听体验的流行效果组合:

### 耳机优化
1. Stereo Blend -> RS Reverb
   - Stereo Blend:调整立体声宽度以提升舒适度(90-110%)
   - RS Reverb:添加细微的空间感(10-20% 混合)
   - 效果:更自然、更不易疲劳的耳机聆听体验

### 黑胶模拟
1. Wow Flutter -> Noise Blender -> Simple Tube
   - Wow Flutter:添加轻微的音高变化
   - Noise Blender:营造黑胶般的氛围
   - Simple Tube:增添模拟温暖感
   - 效果:真实的黑胶唱片体验

### FM 广播风格
1. Multiband Compressor -> 5Band PEQ -> Hard Clipping
   - Multiband Compressor:创造"广播"音色
   - 5Band PEQ:增强存在感和清晰度
   - Hard Clipping:添加细微温暖感
   - 效果:专业广播般的声音

### Lo-Fi 特色
1. Bit Crusher -> Simple Jitter -> RS Reverb
   - Bit Crusher:降低位深以营造复古感
   - Simple Jitter:添加数字瑕疵
   - RS Reverb:创造空间氛围
   - 效果:经典 lo-fi 美学

## 故障排除

### 音频问题
1. 断音或杂音
   - 点击"重置音频"重建音频处理流程
   - 尝试减少活动效果数量
   - 关闭其他使用音频的浏览器标签页

2. CPU 使用率高
   - 禁用不常用的效果
   - 考虑减少效果链中的效果数量

### 常见设置问题
1. 无音频输入
   - 检查 EffeTune 中的输入设备选择
   - 验证浏览器麦克风权限
   - 确保音源正在播放

2. 效果不起作用
   - 确认效果已启用(开关按钮)
   - 检查参数设置
   - 尝试移除并重新添加效果

3. 分享问题
   - 使用"分享"按钮生成链接
   - 复制完整链接进行分享
   - 在新浏览器窗口中测试分享链接

## 常见问题

Q. 这个应用支持环绕声吗?
A. 目前由于浏览器限制,我们无法在浏览器中处理超过 2 个声道,也没有环绕声运行的成功案例。虽然插件实现本身支持环绕声,但我们需要等待浏览器的未来支持。

Q. 推荐的效果链长度是多少?
A. 虽然没有严格限制,但我们建议将效果链控制在 8-10 个效果以获得最佳性能。更复杂的链可能会影响系统性能。

Q. 我可以保存我喜欢的效果组合吗?
A. 可以!使用"分享"按钮生成包含整个效果链配置的链接。将此链接加入书签以保存您的设置。

Q. 如何获得最佳音质?
A. 尽可能使用 96kHz 采样率,从细微的效果设置开始,逐步构建效果链。监控电平以避免失真。

Q. 这个应用可以处理任何音源吗?
A. 是的,EffeTune 可以处理通过选定输入设备播放的任何音频,包括流媒体服务、本地文件和物理媒体。

## 可用效果

| 类别 | 效果 | 描述 | 文档 |
|----------|--------|-------------|---------------|
| Analyzer | Level Meter | 显示带峰值保持的音频电平 | [详情](plugins/analyzer.md#level-meter) |
| Analyzer | Oscilloscope | 实时波形可视化 | [详情](plugins/analyzer.md#oscilloscope) |
| Analyzer | Spectrogram | 显示频谱随时间变化 | [详情](plugins/analyzer.md#spectrogram) |
| Analyzer | Stereo Meter | 可视化立体声平衡和声音移动 | [详情](plugins/analyzer.md#stereo-meter) |
| Analyzer | Spectrum Analyzer | 实时频谱分析 | [详情](plugins/analyzer.md#spectrum-analyzer) |
| Basics | DC Offset | 直流偏移调整 | [详情](plugins/basics.md#dc-offset) |
| Basics | Polarity Inversion | 信号极性反转 | [详情](plugins/basics.md#polarity-inversion) |
| Basics | Stereo Balance | 立体声声道平衡控制 | [详情](plugins/basics.md#stereo-balance) |
| Basics | Volume | 基本音量控制 | [详情](plugins/basics.md#volume) |
| Dynamics | Compressor | 带阈值、比率和拐点控制的动态范围压缩 | [详情](plugins/dynamics.md#compressor) |
| Dynamics | Gate | 带阈值、比率和拐点控制的噪声门,用于降噪 | [详情](plugins/dynamics.md#gate) |
| Dynamics | Multiband Compressor | 专业的 5 段动态处理器,具有 FM 广播风格的音色塑造 | [详情](plugins/dynamics.md#multiband-compressor) |
| EQ | 15Band GEQ | 15 段图形均衡器 | [详情](plugins/eq.md#15band-geq) |
| EQ | 5Band PEQ | 带 5 个完全可配置段的专业参数均衡器 | [详情](plugins/eq.md#5band-peq) |
| EQ | Narrow Range | 高通和低通滤波器组合 | [详情](plugins/eq.md#narrow-range) |
| EQ | Tone Control | 三段音调控制 | [详情](plugins/eq.md#tone-control) |
| Filter | Wow Flutter | 基于时间的调制效果 | [详情](plugins/filter.md#wow-flutter) |
| Lo-Fi | Bit Crusher | 位深缩减和零阶保持效果 | [详情](plugins/lofi.md#bit-crusher) |
| Lo-Fi | Noise Blender | 噪声生成和混合 | [详情](plugins/lofi.md#noise-blender) |
| Lo-Fi | Simple Jitter | 数字抖动模拟 | [详情](plugins/lofi.md#simple-jitter) |
| Reverb | RS Reverb | 具有自然扩散的随机散射混响 | [详情](plugins/reverb.md#rs-reverb) |
| Saturation | Hard Clipping | 数字硬限幅效果 | [详情](plugins/saturation.md#hard-clipping) |
| Saturation | Saturation | 饱和效果 | [详情](plugins/saturation.md#saturation) |
| Spatial | Multiband Balance | 5段频带立体声平衡控制 | [详情](plugins/spatial.md#multiband-balance) |
| Spatial | Stereo Blend | 立体声宽度控制效果 | [详情](plugins/spatial.md#stereo-blend) |
| Others | Oscillator | 多波形音频信号发生器 | [详情](plugins/others.md#oscillator) |

## 技术信息

### 浏览器兼容性

Frieve EffeTune 已在 Google Chrome 上测试和验证。应用需要支持以下功能的现代浏览器:
- Web Audio API
- Audio Worklet
- getUserMedia API
- Drag and Drop API

### 浏览器支持详情
1. Chrome/Chromium
   - 完全支持并推荐使用
   - 更新到最新版本以获得最佳性能

2. Firefox/Safari
   - 有限支持
   - 部分功能可能无法正常工作
   - 建议使用 Chrome 以获得最佳体验

### 推荐采样率

为了在非线性效果处理时获得最佳性能,建议在 96kHz 或更高采样率下使用 EffeTune。较高的采样率有助于在通过饱和和压缩等非线性效果处理音频时实现理想特性。

## 插件开发

想要创建自己的音频插件?查看我们的[插件开发指南](plugin-development.md)。

## 版本历史

### Version 1.20(2025年2月11日)
- 添加了一些新效果
- 各种细节改进

### Version 1.10(2025年2月9日)
- 添加音频文件处理功能
- 各种细节改进

### Version 1.00(2025年2月8日)
- 提升处理效率
- 各种细节改进

### Version 0.50(2025年2月7日)
- 添加效果链配置的保存和加载预设功能
- 新增以下语言支持:中文(简体)、Español、हिन्दी、العربية、Português、Русский、日本語、한국어和Français
- 各种细节改进

### Version 0.30(2025年2月5日)
- 提升处理效率
- 添加插件选择和键盘快捷键(Ctrl+A、Ctrl+C、Ctrl+V)
- 添加 Oscilloscope 插件用于实时波形可视化
- 各种细节改进

### Version 0.10(2025年2月3日)
- 添加触摸操作支持
- 提升处理效率
- 优化重负载处理任务
- 减少音频断音
- 各种细节改进

### Version 0.01(2025年2月2日)
- 初始发布

## 链接

[源代码](https://github.com/Frieve-A/effetune)

[YouTube](https://www.youtube.com/@frieveamusic)