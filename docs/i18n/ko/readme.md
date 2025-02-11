# Frieve EffeTune <img src="../../../images/icon.png" alt="EffeTune Icon" width="30" heignt="30" align="bottom">

[앱 열기](https://frieve-a.github.io/effetune/effetune.html)

오디오 애호가들의 음악 청취 경험을 향상시키기 위해 설계된 웹 기반 실시간 오디오 이펙트 프로세서입니다. EffeTune을 사용하면 다양한 고품질 이펙트를 통해 모든 오디오 소스를 처리할 수 있어, 실시간으로 청취 경험을 커스터마이즈하고 완벽하게 만들 수 있습니다.

[![Screenshot](../../../images/screenshot.png)](https://frieve-a.github.io/effetune/effetune.html)

## Concept

EffeTune은 음악 청취 경험을 한 단계 높이고 싶은 오디오 애호가들을 위해 만들어졌습니다. 음악을 스트리밍하거나 물리적 미디어에서 재생하든, EffeTune을 사용하면 전문가급 이펙트를 추가하여 정확한 선호도에 맞게 사운드를 커스터마이즈할 수 있습니다. 컴퓨터를 오디오 소스와 스피커 또는 앰프 사이에 위치한 강력한 오디오 이펙트 프로세서로 변환하세요.

오디오파일 신화가 아닌, 순수한 과학입니다.

## Features

- 실시간 오디오 처리
- 이펙트 체인 구축을 위한 드래그 앤 드롭 인터페이스
- 카테고리별 이펙트가 있는 확장 가능한 플러그인 시스템
- 실시간 오디오 시각화
- 실시간으로 수정 가능한 오디오 파이프라인
- 현재 이펙트 체인을 사용한 오프라인 오디오 파일 처리

## Setup Guide

EffeTune을 사용하기 전에 오디오 라우팅을 설정해야 합니다. 다양한 오디오 소스를 구성하는 방법은 다음과 같습니다:

### Streaming Service Setup

스트리밍 서비스(Spotify, YouTube Music 등)의 오디오를 처리하려면:

1. 전제 조건:
   - 가상 오디오 장치 설치(예: VB Cable, Voice Meeter, ASIO Link Tool)
   - 스트리밍 서비스가 가상 오디오 장치로 오디오를 출력하도록 구성

2. 구성:
   - EffeTune 실행
   - 입력 소스로 가상 오디오 장치 선택
   - 스트리밍 서비스에서 음악 재생 시작
   - 오디오가 EffeTune을 통해 흐르는지 확인
   - Pipeline에 이펙트를 추가하여 청취 경험 향상

### Physical Audio Source Setup

CD 플레이어, 네트워크 플레이어 또는 기타 물리적 소스와 함께 EffeTune을 사용하려면:

1. 구성:
   - 오디오 인터페이스를 컴퓨터에 연결
   - EffeTune 실행
   - 입력 소스로 오디오 인터페이스 선택
   - 브라우저의 오디오 출력을 오디오 인터페이스로 구성
   - 오디오 인터페이스가 이제 멀티 이펙트 프로세서로 기능:
     * 입력: CD 플레이어, 네트워크 플레이어 또는 기타 오디오 소스
     * 처리: EffeTune을 통한 실시간 이펙트
     * 출력: 앰프나 스피커로 처리된 오디오

## Usage

### Building Your Effect Chain

1. 사용 가능한 플러그인이 화면 왼쪽에 나열됨
2. 플러그인을 목록에서 Effect Pipeline 영역으로 드래그
3. 플러그인은 위에서 아래로 순서대로 처리됨
4. 핸들(⋮)을 사용하여 드래그로 플러그인 순서 변경
5. 플러그인 이름을 클릭하여 설정 확장/축소
6. ON/OFF 버튼으로 개별 이펙트 바이패스
7. 휴지통 아이콘으로 플러그인 제거

### 프리셋 사용하기

1. 이펙트 체인 저장:
   - 원하는 이펙트 체인과 파라미터 설정
   - 프리셋 입력 필드에 이름 입력
   - 저장 버튼을 클릭하여 프리셋 저장

2. 프리셋 불러오기:
   - 드롭다운 목록에서 프리셋 이름 선택 또는 입력
   - 프리셋이 자동으로 로드됨
   - 모든 플러그인과 설정이 복원됨

3. 프리셋 삭제:
   - 삭제하려는 프리셋 선택
   - 삭제 버튼 클릭
   - 확인 메시지에서 삭제 확인

4. 프리셋 정보:
   - 각 프리셋은 완전한 이펙트 체인 구성을 저장
   - 플러그인 순서, 파라미터, 상태 포함

### Plugin Selection and Keyboard Shortcuts

1. 플러그인 선택 방법:
   - 플러그인 헤더를 클릭하여 개별 플러그인 선택
   - Ctrl을 누른 채 클릭하여 여러 플러그인 선택
   - Pipeline 영역의 빈 공간을 클릭하여 모든 플러그인 선택 해제

2. 키보드 단축키:
   - Ctrl + A: Pipeline의 모든 플러그인 선택
   - Ctrl + C: 선택한 플러그인 복사
   - Ctrl + V: 클립보드에서 플러그인 붙여넣기
   - ESC: 모든 플러그인 선택 해제

3. 플러그인 문서:
   - 모든 플러그인의 ? 버튼을 클릭하여 새 탭에서 상세 문서 열기

### 오디오 파일 처리

1. 파일 드롭 영역:
    - Effect Pipeline 영역 아래에 항상 표시되는 전용 드롭 영역
    - 단일 또는 다중 오디오 파일 지원
    - 현재 Pipeline 설정을 사용하여 파일 처리
    - 모든 처리는 Pipeline의 샘플레이트에서 수행

2. 처리 상태:
    - 진행 바가 현재 처리 상태 표시
    - 처리 시간은 파일 크기와 이펙트 체인 복잡도에 따라 달라짐

3. 다운로드 옵션:
    - 단일 파일은 WAV 형식으로 다운로드
    - 다중 파일은 자동으로 ZIP 파일로 패키징

### Sharing Effect Chains

다른 사용자와 이펙트 체인 구성을 공유할 수 있습니다:
1. 원하는 이펙트 체인을 설정한 후 Effect Pipeline 영역 오른쪽 상단의 "Share" 버튼 클릭
2. URL이 자동으로 클립보드에 복사됨
3. 복사된 URL을 다른 사람과 공유 - 이를 열어 정확한 이펙트 체인을 재현할 수 있음
4. 모든 이펙트 설정이 URL에 저장되어 쉽게 저장하고 공유할 수 있음

### Audio Reset

오디오 문제(끊김, 글리치)가 발생하면:
1. 왼쪽 상단의 "Reset Audio" 버튼 클릭
2. 오디오 파이프라인이 자동으로 재구축됨
3. 이펙트 체인 구성은 유지됨

## Common Effect Combinations

청취 경험을 향상시키는 인기 있는 이펙트 조합입니다:

### Headphone Enhancement
1. Stereo Blend -> RS Reverb
   - Stereo Blend: 편안함을 위한 스테레오 폭 조정(90-110%)
   - RS Reverb: 미묘한 공간 분위기 추가(10-20% mix)
   - 결과: 더 자연스럽고 덜 피로한 헤드폰 청취

### Vinyl Simulation
1. Wow Flutter -> Noise Blender -> Simple Tube
   - Wow Flutter: 부드러운 피치 변화 추가
   - Noise Blender: 바이닐과 같은 분위기 생성
   - Simple Tube: 아날로그 따뜻함 추가
   - 결과: 진정한 바이닐 레코드 경험

### FM Radio Style
1. Multiband Compressor -> 5Band PEQ -> Hard Clipping
   - Multiband Compressor: "라디오" 사운드 생성
   - 5Band PEQ: 프레즌스와 선명도 향상
   - Hard Clipping: 미묘한 따뜻함 추가
   - 결과: 전문적인 방송과 같은 사운드

### Lo-Fi Character
1. Bit Crusher -> Simple Jitter -> RS Reverb
   - Bit Crusher: 레트로 느낌을 위한 비트 뎁스 감소
   - Simple Jitter: 디지털 불완전함 추가
   - RS Reverb: 분위기 있는 공간 생성
   - 결과: 클래식한 로파이 미학

## Troubleshooting

### Audio Issues
1. 끊김이나 글리치
   - "Reset Audio"를 클릭하여 오디오 파이프라인 재구축
   - 활성화된 이펙트 수 줄이기 시도
   - 오디오를 사용하는 다른 브라우저 탭 닫기

2. 높은 CPU 사용량
   - 적극적으로 사용하지 않는 이펙트 비활성화
   - 체인의 이펙트 수 줄이기 고려

### Common Setup Issues
1. 오디오 입력 없음
   - EffeTune의 입력 장치 선택 확인
   - 브라우저 마이크 권한 확인
   - 소스에서 오디오가 재생되고 있는지 확인

2. 이펙트가 작동하지 않음
   - 이펙트가 활성화되어 있는지 확인(ON/OFF 버튼)
   - 파라미터 설정 확인
   - 이펙트 제거 후 다시 추가 시도

3. 공유 문제
   - "Share" 버튼을 사용하여 URL 생성
   - 공유 시 전체 URL 복사
   - 새 브라우저 창에서 공유 링크 테스트

## FAQ

Q. 이 앱은 서라운드 사운드를 지원하나요?
A. 현재 브라우저 제한으로 인해 브라우저에서 2채널 이상을 처리할 수 없으며, 서라운드 사운드 작동의 입증된 기록이 없습니다. 플러그인 구현 자체는 서라운드 사운드를 지원하지만, 향후 브라우저 지원을 기다려야 할 것입니다.

Q. 권장되는 이펙트 체인 길이는 얼마인가요?
A. 엄격한 제한은 없지만, 최적의 성능을 위해 8-10개의 이펙트로 이펙트 체인을 유지하는 것을 권장합니다. 더 복잡한 체인은 시스템 성능에 영향을 미칠 수 있습니다.

Q. 즐겨 사용하는 이펙트 조합을 저장할 수 있나요?
A. 네! "Share" 버튼을 사용하여 전체 이펙트 체인 구성이 포함된 URL을 생성하세요. 이 URL을 북마크하여 설정을 저장하세요.

Q. 최상의 음질을 얻으려면 어떻게 해야 하나요?
A. 가능한 경우 96kHz 샘플레이트를 사용하고, 미묘한 이펙트 설정으로 시작하여 점진적으로 체인을 구축하세요. 왜곡을 방지하기 위해 레벨을 모니터링하세요.

Q. 모든 오디오 소스에서 작동하나요?
A. 네, EffeTune은 스트리밍 서비스, 로컬 파일, 물리적 미디어를 포함하여 선택한 입력 장치를 통해 재생되는 모든 오디오를 처리할 수 있습니다.

## Available Effects

| Category | Effect | Description | Documentation |
|----------|--------|-------------|---------------|
| Analyzer | Level Meter | 피크 홀드가 있는 오디오 레벨 표시 | [Details](plugins/analyzer.md#level-meter) |
| Analyzer | Oscilloscope | 실시간 파형 시각화 | [Details](plugins/analyzer.md#oscilloscope) |
| Analyzer | Spectrogram | 시간에 따른 주파수 스펙트럼 변화 표시 | [Details](plugins/analyzer.md#spectrogram) |
| Analyzer | Stereo Meter | 스테레오 밸런스와 사운드 움직임 시각화 | [Details](plugins/analyzer.md#stereo-meter) |
| Analyzer | Spectrum Analyzer | 실시간 스펙트럼 분석 | [Details](plugins/analyzer.md#spectrum-analyzer) |
| Basics | DC Offset | DC 오프셋 조정 | [Details](plugins/basics.md#dc-offset) |
| Basics | Polarity Inversion | 신호 극성 반전 | [Details](plugins/basics.md#polarity-inversion) |
| Basics | Stereo Balance | 스테레오 채널 밸런스 제어 | [Details](plugins/basics.md#stereo-balance) |
| Basics | Volume | 기본 볼륨 제어 | [Details](plugins/basics.md#volume) |
| Dynamics | Compressor | 임계값, 비율, 니 제어가 있는 다이나믹 레인지 컴프레션 | [Details](plugins/dynamics.md#compressor) |
| Dynamics | Gate | 노이즈 감소를 위한 임계값, 비율, 니 제어가 있는 노이즈 게이트 | [Details](plugins/dynamics.md#gate) |
| Dynamics | Multiband Compressor | FM 라디오 스타일 사운드 쉐이핑이 가능한 전문가급 5밴드 다이나믹 프로세서 | [Details](plugins/dynamics.md#multiband-compressor) |
| EQ | 15Band GEQ | 15밴드 그래픽 이퀄라이저 | [Details](plugins/eq.md#15band-geq) |
| EQ | 5Band PEQ | 5개의 완전 구성 가능한 밴드가 있는 전문가급 파라메트릭 이퀄라이저 | [Details](plugins/eq.md#5band-peq) |
| EQ | Narrow Range | 하이패스와 로우패스 필터 조합 | [Details](plugins/eq.md#narrow-range) |
| EQ | Tone Control | 3밴드 톤 컨트롤 | [Details](plugins/eq.md#tone-control) |
| Filter | Wow Flutter | 시간 기반 모듈레이션 이펙트 | [Details](plugins/filter.md#wow-flutter) |
| Lo-Fi | Bit Crusher | 비트 뎁스 감소와 제로 오더 홀드 이펙트 | [Details](plugins/lofi.md#bit-crusher) |
| Lo-Fi | Noise Blender | 노이즈 생성과 믹싱 | [Details](plugins/lofi.md#noise-blender) |
| Lo-Fi | Simple Jitter | 디지털 지터 시뮬레이션 | [Details](plugins/lofi.md#simple-jitter) |
| Reverb | RS Reverb | 자연스러운 디퓨전이 있는 랜덤 스캐터링 리버브 | [Details](plugins/reverb.md#rs-reverb) |
| Saturation | Hard Clipping | 디지털 하드 클리핑 이펙트 | [Details](plugins/saturation.md#hard-clipping) |
| Saturation | Saturation | 새츄레이션 이펙트 | [Details](plugins/saturation.md#saturation) |
| Spatial | Multiband Balance | 5밴드 주파수 대역별 스테레오 밸런스 제어 | [Details](plugins/spatial.md#multiband-balance) |
| Spatial | Stereo Blend | 스테레오 폭 제어 이펙트 | [Details](plugins/spatial.md#stereo-blend) |
| Others | Oscillator | 다중 파형 오디오 신호 제너레이터 | [Details](plugins/others.md#oscillator) |

## Technical Information

### Browser Compatibility

Frieve EffeTune은 Google Chrome에서 테스트되고 검증되었습니다. 애플리케이션에는 다음을 지원하는 현대적인 브라우저가 필요합니다:
- Web Audio API
- Audio Worklet
- getUserMedia API
- Drag and Drop API

### Browser Support Details
1. Chrome/Chromium
   - 완전히 지원되며 권장됨
   - 최상의 성능을 위해 최신 버전으로 업데이트

2. Firefox/Safari
   - 제한된 지원
   - 일부 기능이 예상대로 작동하지 않을 수 있음
   - 최상의 경험을 위해 Chrome 사용 고려

### Recommended Sample Rate

비선형 이펙트와의 최적 성능을 위해 96kHz 이상의 샘플레이트에서 EffeTune을 사용하는 것이 권장됩니다. 이 높은 샘플레이트는 새츄레이션과 컴프레션과 같은 비선형 이펙트를 통해 오디오를 처리할 때 이상적인 특성을 달성하는 데 도움이 됩니다.

## Plugin Development

자신만의 오디오 플러그인을 만들고 싶으신가요? [Plugin Development Guide](../../plugin-development.md)를 확인하세요.

## Version History

### Version 1.20 (February 11, 2025)
- 새로운 오디오 이펙터를 몇 가지 추가함
- 다양한 사소한 개선

### Version 1.10 (February 9, 2025)
- 오디오 파일 처리 기능 추가
- 다양한 사소한 개선

### Version 1.00 (February 8, 2025)
- 처리 효율성 향상
- 다양한 사소한 개선

### Version 0.50 (February 7, 2025)
- 이펙트 체인 설정을 저장하고 불러올 수 있는 프리셋 기능 추가
- 사용 설명서가 이제 다음 언어로 제공됩니다: 中文 (简体), Español, हिन्दी, العربية, Português, Русский, 日本語, 한국어, 및 Français
- 다양한 사소한 개선

### Version 0.30 (February 5, 2025)
- 처리 효율성 향상
- 플러그인 선택과 키보드 단축키 추가(Ctrl+A, Ctrl+C, Ctrl+V)
- 실시간 파형 시각화를 위한 Oscilloscope 플러그인 추가
- 다양한 사소한 개선

### Version 0.10 (February 3, 2025)
- 터치 조작 지원 추가
- 처리 효율성 향상
- 무거운 처리 작업 최적화
- 오디오 끊김 감소
- 다양한 사소한 개선

### Version 0.01 (February 2, 2025)
- 최초 릴리스

## Links

[Source Code](https://github.com/Frieve-A/effetune)

[YouTube](https://www.youtube.com/@frieveamusic)