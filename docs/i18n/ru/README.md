# Frieve EffeTune <img src="../../../images/icon_64x64.png" alt="EffeTune Icon" width="30" height="30" align="bottom">

[Open Web App](https://frieve-a.github.io/effetune/effetune.html)  [Download Desktop App](https://github.com/Frieve-A/effetune/releases/)

Приложение для обработки аудио в реальном времени, созданное для аудиофилов, стремящихся улучшить процесс прослушивания музыки. EffeTune позволяет обрабатывать любой аудио источник с помощью различных высококачественных эффектов, давая возможность настроить и усовершенствовать ваш опыт прослушивания в реальном времени.

[![Screenshot](../../../images/screenshot.png)](https://frieve-a.github.io/effetune/effetune.html)

## Концепция

EffeTune создан для аудиофилов, желающих улучшить прослушивание музыки. Независимо от того, транслируете ли вы музыку или воспроизводите её с физических носителей, EffeTune позволяет добавлять профессиональные эффекты для настройки звука по вашим точным предпочтениям. Превратите ваш компьютер в мощный процессор аудиоэффектов, расположенный между вашим аудио источником и динамиками или усилителем.

No audiophile myths, Just pure science.

## Особенности

- Обработка аудио в реальном времени
- Интерфейс drag-and-drop для создания цепочек эффектов
- Расширяемая система эффектов с категоризированными эффектами
- Визуализация аудио в реальном времени
- Аудио Pipeline, который можно изменять в реальном времени
- Офлайн обработка аудиофайлов с использованием текущей цепочки эффектов
- Функция секций для группировки и управления несколькими эффектами
- Функция измерения частотной характеристики для аудио оборудования
- Многоканальная обработка и вывод

## Руководство по настройке

Перед использованием EffeTune вам необходимо настроить маршрутизацию аудио. Вот как сконфигурировать различные источники аудио:

### Настройка проигрывателя музыкальных файлов

- Откройте веб-приложение EffeTune в браузере или запустите настольное приложение EffeTune
- Откройте и воспроизведите музыкальный файл для проверки правильности воспроизведения
   - Откройте музыкальный файл и выберите EffeTune в качестве приложения (только для настольного приложения)
   - Или выберите Открыть музыкальный файл... из меню Файл (только для настольного приложения)
   - Или перетащите музыкальный файл в окно

### Настройка потокового сервиса

Для обработки аудио из потоковых сервисов (Spotify, YouTube Music и т.д.):

1. Необходимые условия:
   - Установите виртуальное аудио устройство (например, VB Cable, Voice Meeter или ASIO Link Tool)
   - Настройте ваш потоковый сервис на вывод аудио через виртуальное устройство

2. Конфигурация:
   - Откройте веб-приложение EffeTune в браузере или запустите настольное приложение EffeTune
   - Выберите виртуальное аудио устройство в качестве источника входного сигнала
     - В Chrome при первом открытии появится диалоговое окно с запросом на выбор и разрешение аудио входа
     - В настольном приложении настройте его, нажав на кнопку Config Audio в правом верхнем углу экрана
   - Начните воспроизведение музыки из вашего потокового сервиса
   - Убедитесь, что аудио проходит через EffeTune

### Настройка физического аудио источника

Чтобы использовать EffeTune с CD-плеерами, сетевыми плеерами или другими физическими источниками:

- Подключите аудиоинтерфейс к вашему компьютеру
- Откройте веб-приложение EffeTune в браузере или запустите настольное приложение EffeTune
- Выберите ваш аудиоинтерфейс в качестве источника входного и выходного сигнала
   - В Chrome при первом открытии появится диалоговое окно с запросом на выбор и разрешение аудио входа
   - В настольном приложении настройте его, нажав на кнопку Config Audio в правом верхнем углу экрана
- Теперь ваш аудиоинтерфейс функционирует как многоэффектный процессор:
   * **Input:** Ваш CD-плеер, сетевой плеер или другой аудио источник
   * **Processing:** Эффекты в реальном времени через EffeTune
   * **Output:** Обработанное аудио на ваш усилитель или динамики

## Использование

### Создание цепочки эффектов

1. Доступные эффекты перечислены слева на экране  
   - Используйте кнопку поиска рядом с "Available Effects", чтобы отфильтровать эффекты  
   - Введите текст для поиска эффектов по названию или категории  
   - Нажмите ESC, чтобы очистить поиск
2. Перетащите эффекты из списка в область Effect Pipeline
3. Эффекты обрабатываются в порядке сверху вниз
4. Перетащите маркер (⋮) или нажмите кнопки ▲▼ для изменения порядка эффектов
5. Нажмите на название эффекта, чтобы развернуть/свернуть его настройки
   - Shift+нажатие сворачивает/разворачивает все эффекты, кроме категории Analyzer
6. Используйте кнопку ON, чтобы обходить отдельные эффекты
7. Нажмите кнопку ? для открытия подробной документации в новой вкладке
8. Удалите эффекты, используя кнопку ×  
9. Нажмите кнопку маршрутизации, чтобы настроить каналы для обработки и входные и выходные шины  
   - [Подробнее о функциях шин](bus-function.md)

### Использование пресетов

1. **Сохранение вашей цепочки эффектов:**
   - Настройте желаемую цепочку эффектов и параметры
   - Введите название вашего пресета в поле ввода
   - Нажмите кнопку save, чтобы сохранить пресет

2. **Загрузка пресета:**
   - Введите или выберите название пресета из выпадающего списка
   - Пресет будет загружен автоматически
   - Все эффекты и их настройки будут восстановлены

3. **Удаление пресета:**
   - Выберите пресет, который хотите удалить
   - Нажмите кнопку delete
   - Подтвердите удаление, когда появится запрос

4. **Информация о пресете:**
   - Каждый пресет сохраняет полную конфигурацию вашей цепочки эффектов
   - Включает порядок эффектов, параметры и их состояния

### Выбор эффектов и горячие клавиши

1. **Методы выбора эффектов:**
   - Кликните по заголовкам эффектов, чтобы выбрать отдельные эффекты
   - Удерживайте Ctrl при клике для выбора нескольких эффектов
   - Кликните по пустому пространству в области Pipeline, чтобы снять выбор со всех эффектов

2. **Горячие клавиши:**
   - Ctrl + Z: Отменить
   - Ctrl + Y: Повторить
   - Ctrl + S: Сохранить текущий pipeline
   - Ctrl + Shift + S: Сохранить текущий pipeline как
   - Ctrl + X: Вырезать выбранные эффекты
   - Ctrl + C: Копировать выбранные эффекты
   - Ctrl + V: Вставить эффекты из буфера обмена
   - Ctrl + F: Найти эффекты
   - Ctrl + A: Выбрать все эффекты в pipeline
   - Delete: Удалить выбранные эффекты
   - ESC: Снять выделение со всех эффектов

3. **Использование Section Features:**
   - Добавьте эффект Section в начале группы эффектов
   - Введите описательное название в поле Comment
   - Переключение ON/OFF эффекта Section включит/отключит все эффекты в этом разделе
   - Используйте несколько эффектов Section для организации вашей цепочки эффектов в логические группы
   - [Подробнее о управлении эффектами](plugins/control.md)

4. **Горячие клавиши (при использовании проигрывателя):**
   - Space: Воспроизведение/Пауза
   - Ctrl + → или N: Следующий трек
   - Ctrl + ← или P: Предыдущий трек
   - Shift + → или F или .: Перемотка вперёд на 10 секунд
   - Shift + ← или B или ,: Перемотка назад на 10 секунд
   - Ctrl + T: Включить/выключить режим повтора
   - Ctrl + H: Включить/выключить случайный порядок

### Обработка аудиофайлов

1. **Область для перетаскивания или указания файлов:**
   - Специальная область для перетаскивания всегда видна под областью Effect Pipeline
   - Поддерживается загрузка одного или нескольких аудиофайлов
   - Файлы обрабатываются с использованием текущих настроек Pipeline
   - Вся обработка выполняется с частотой дискретизации Pipeline

2. **Статус обработки:**
   - Индикатор прогресса показывает текущий статус обработки
   - Время обработки зависит от размера файла и сложности цепочки эффектов

3. **Параметры загрузки или сохранения:**
   - Обработанный файл выводится в формате WAV
   - Несколько файлов автоматически упаковываются в ZIP-архив

### Измерение частотной характеристики

1. Для веб-версии запустите [инструмент измерения амплитудно-частотной характеристики](https://frieve-a.github.io/effetune/features/measurement/measurement.html). Для версии приложения выберите «Измерение АЧХ» в меню «Настройки».
2. Подключите ваше аудио оборудование к входу и выходу компьютера
3. Настройте параметры измерения (длительность развертки, диапазон частот)
4. Запустите измерение для создания графика частотной характеристики
5. Анализируйте результаты или экспортируйте данные измерений для дальнейшего анализа

### Обмен цепочками эффектов

Вы можете поделиться конфигурацией вашей цепочки эффектов с другими пользователями:
1. После настройки желаемой цепочки эффектов нажмите кнопку "Share" в правом верхнем углу области Effect Pipeline
2. URL веб-приложения автоматически скопируется в буфер обмена
3. Поделитесь скопированным URL с другими – они смогут воссоздать вашу цепочку эффектов, открыв его
4. В веб-приложении все настройки эффектов сохраняются в URL, что облегчает их сохранение и обмен
5. В версии настольного приложения экспортируйте настройки в файл effetune_preset из меню File
6. Поделитесь экспортированным файлом effetune_preset. Файл effetune_preset также можно загрузить, перетащив его в окно веб-приложения

### Сброс аудио

Если вы сталкиваетесь с проблемами аудио (прерывания, искажения):
1. Нажмите кнопку "Reset Audio" в верхнем левом углу в веб-приложении или выберите Reload из меню View в настольном приложении
2. Аудио Pipeline будет автоматически перестроен
3. Конфигурация вашей цепочки эффектов сохранится

## Распространенные комбинации эффектов

Ниже приведены некоторые популярные комбинации эффектов для улучшения качества прослушивания:

### Улучшение звучания на наушниках
1. **Stereo Blend** -> **RS Reverb**
   - **Stereo Blend:** Регулирует стерео ширину для комфортного прослушивания (60-100%)
   - **RS Reverb:** Добавляет тонкую реверберацию помещения (микс 10-20%)
   - **Результат:** Более естественное и менее утомительное прослушивание через наушники

### Симуляция винила
1. **Wow Flutter** -> **Noise Blender** -> **Saturation**
   - **Wow Flutter:** Добавляет мягкие вариации высоты тона
   - **Noise Blender:** Создает атмосферу, похожую на виниловую пластинку
   - **Saturation:** Добавляет аналоговое тепло
   - **Результат:** Аутентичное звучание виниловой пластинки

### Стиль FM радио
1. **Multiband Compressor** -> **Stereo Blend**
   - **Multiband Compressor:** Создает характерное "радиозвучание"
   - **Stereo Blend:** Регулирует стерео ширину для комфортного прослушивания (100-150%)
   - **Результат:** Звук, напоминающий профессиональное радио вещание

### Lo-Fi характер
1. **Bit Crusher** -> **Simple Jitter** -> **RS Reverb**
   - **Bit Crusher:** Уменьшает битовую глубину для ретро ощущения
   - **Simple Jitter:** Добавляет цифровые несовершенства
   - **RS Reverb:** Создает атмосферное пространство
   - **Результат:** Классическая эстетика lo-fi

## Устранение неполадок

### Проблемы с аудио
1. **Прерывания или искажения**
   - Нажмите кнопку "Reset Audio" в верхнем левом углу в веб-приложении или выберите Reload из меню View в настольном приложении, чтобы перестроить аудио Pipeline
   - Попробуйте уменьшить количество активных эффектов

2. **Высокая загрузка процессора**
   - Отключите эффекты, которые не используются
   - Рассмотрите возможность использования меньшего количества эффектов в цепочке

3. **Возникает эхо**
   - Вероятно, ваши аудио входы и выходы настроены неправильно
   - Для обработки аудиовыхода браузера рассмотрите возможность установки отдельного браузера исключительно для EffeTune или используйте настольное приложение вместо веб-приложения

### Общие проблемы настройки
1. **Нет аудио входа**
   - Убедитесь, что аудио воспроизводится с источника и выводится на виртуальное аудио устройство
   - Для версии веб-приложения убедитесь, что в вашем браузере разрешены разрешения на аудио вход и что виртуальное аудио устройство выбрано в качестве входного устройства
   - Для версии настольного приложения перейдите в Config Audio в правом верхнем углу экрана и убедитесь, что виртуальное аудио устройство выбрано в качестве входного устройства

2. **Эффект не работает**
   - Проверьте, что эффект включен (кнопка ON/OFF)
   - Проверьте настройки параметров

3. **Нет аудио выхода**
   - Для версии веб-приложения убедитесь, что аудиовыход операционной системы установлен как выходное устройство
   - Для версии настольного приложения перейдите в "Config Audio" в правом верхнем углу экрана и убедитесь, что выбрано правильное выходное устройство

## Часто задаваемые вопросы

**Q. Поддерживает ли это приложение объемный звук?**
A. В настоящее время, из-за ограничений браузера, мы не можем обрабатывать более 2 каналов, и нет доказанной работоспособности объемного звучания. Хотя реализация эффекта поддерживает объемный звук, нам придется дождаться будущей поддержки со стороны браузеров.

**Q. Какова рекомендуемая длина цепочки эффектов?**
A. Хотя строгого ограничения нет, мы рекомендуем ограничивать цепочку эффектов 8–10 эффектами для оптимальной производительности. Более сложные цепочки могут негативно сказаться на работе системы.

**Q. Как достичь наилучшего качества звука?**
A. При возможности используйте частоту дискретизации 96 кГц или выше, начинайте с тонких настроек эффектов и постепенно наращивайте цепочку. Следите за уровнями звука, чтобы избежать искажений.

**Q. Будет ли это работать с любым аудио источником?**
A. Да, EffeTune может обрабатывать любое аудио, воспроизводимое через выбранное входное устройство, включая потоковые сервисы, локальные файлы и физические носители.

## Доступные эффекты

| Категория | Эффект             | Описание                                                               | Документация                                         |
| --------- | ------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| Analyzer  | Level Meter        | Отображает уровень звука с удержанием пиков                             | [Подробности](plugins/analyzer.md#level-meter)        |
| Analyzer  | Oscilloscope       | Визуализация формы сигнала в реальном времени                           | [Подробности](plugins/analyzer.md#oscilloscope)       |
| Analyzer  | Spectrogram        | Показывает изменения частотного спектра со временем                     | [Подробности](plugins/analyzer.md#spectrogram)        |
| Analyzer  | Spectrum Analyzer  | Анализ спектра в реальном времени                                       | [Подробности](plugins/analyzer.md#spectrum-analyzer)  |
| Analyzer  | Stereo Meter       | Визуализирует стереобаланс и движение звука                             | [Подробности](plugins/analyzer.md#stereo-meter)       |
| Basics    | Channel Divider    | Разделяет стереосигнал на частотные полосы и направляет их в отдельные каналы | [Подробности](plugins/basics.md#channel-divider)      |
| Basics    | DC Offset          | Регулировка DC-смещения                                                | [Подробности](plugins/basics.md#dc-offset)            |
| Basics    | Matrix             | Маршрутизация и микширование аудиоканалов с гибким управлением          | [Подробности](plugins/basics.md#matrix)               |
| Basics    | Mute               | Полностью заглушает аудиосигнал                                         | [Подробности](plugins/basics.md#mute)                 |
| Basics    | Polarity Inversion | Инверсия полярности сигнала                                             | [Подробности](plugins/basics.md#polarity-inversion)   |
| Basics    | Stereo Balance     | Регулировка баланса стереоканалов                                       | [Подробности](plugins/basics.md#stereo-balance)       |
| Basics    | Volume             | Базовое управление громкостью                                           | [Подробности](plugins/basics.md#volume)               |
| Delay     | Delay | Стандартный эффект задержки | [Подробнее](plugins/delay.md#delay) |
| Delay     | Time Alignment | Точная настройка временных задержек аудиоканалов | [Подробнее](plugins/delay.md#time-alignment) |
| Dynamics  | Auto Leveler | Автоматическая регулировка громкости по измерению LUFS для равномерного звучания | [Подробнее](plugins/dynamics.md#auto-leveler) |
| Dynamics  | Brickwall Limiter | Прозрачный контроль пиков для безопасного и комфортного прослушивания | [Подробнее](plugins/dynamics.md#brickwall-limiter) |
| Dynamics  | Compressor | Компрессия динамического диапазона с регулировкой порога, коэффициента и «колена» | [Подробнее](plugins/dynamics.md#compressor) |
| Dynamics  | Gate | Гейт шумоподавления с регулировкой порога, коэффициента и «колена» для уменьшения шума | [Подробнее](plugins/dynamics.md#gate) |
| Dynamics  | Multiband Compressor | Профессиональный 5-полосный динамический процессор с FM-радио стилизацией звука | [Подробнее](plugins/dynamics.md#multiband-compressor) |
| EQ        | 15Band GEQ | 15-полосный графический эквалайзер | [Подробнее](plugins/eq.md#15band-geq) |
| EQ        | 5Band PEQ | Профессиональный параметрический эквалайзер с 5 полностью настраиваемыми полосами | [Подробнее](plugins/eq.md#5band-peq) |
| EQ        | Five Band Dynamic EQ | 5-полосный динамический эквалайзер с регулировкой частот на основе порога | [Подробнее](plugins/eq.md#five-band-dynamic-eq) |
| EQ        | Hi Pass Filter | Удаление нежелательных низких частот с точностью | [Подробнее](plugins/eq.md#hi-pass-filter) |
| EQ        | Lo Pass Filter | Удаление нежелательных высоких частот с точностью | [Подробнее](plugins/eq.md#lo-pass-filter) |
| EQ        | Loudness Equalizer | Коррекция баланса частот для низкого уровня громкости | [Подробнее](plugins/eq.md#loudness-equalizer) |
| EQ        | Narrow Range | Сочетание фильтров высоких и низких частот | [Подробнее](plugins/eq.md#narrow-range) |
| EQ        | Tilt EQ | Наклонный эквалайзер для быстрой коррекции тембра | [Подробнее](plugins/eq.md#tilt-eq) |
| EQ        | Tone Control | Трёхполосное управление тоном | [Подробнее](plugins/eq.md#tone-control) |
| Lo-Fi     | Bit Crusher | Снижение битовой глубины и эффект «zero-order hold» | [Подробнее](plugins/lofi.md#bit-crusher) |
| Lo-Fi     | Noise Blender | Генерация и смешивание шума | [Подробнее](plugins/lofi.md#noise-blender) |
| Lo-Fi     | Simple Jitter | Эмуляция цифрового джиттера | [Подробнее](plugins/lofi.md#simple-jitter) |
| Modulation | Doppler Distortion | Симулирует естественные динамические изменения звука, вызванные небольшими движениями конуса динамика | [Подробнее](plugins/modulation.md#doppler-distortion) |
| Modulation | Pitch Shifter | Лёгкий эффект изменения высоты тона | [Подробнее](plugins/modulation.md#pitch-shifter) |
| Modulation | Tremolo | Эффект модуляции громкости | [Подробнее](plugins/modulation.md#tremolo) |
| Modulation | Wow Flutter | Эффект модуляции во времени | [Подробнее](plugins/modulation.md#wow-flutter) |
| Resonator | Horn Resonator | Симуляция резонанса рупора с настраиваемыми параметрами | [Подробнее](plugins/resonator.md#horn-resonator) |
| Resonator | Modal Resonator | Эффект резонанса частот с поддержкой до 5 резонаторов | [Подробнее](plugins/resonator.md#modal-resonator) |
| Reverb    | RS Reverb | Реверберация с рандомным рассеянием и естественной диффузией | [Подробнее](plugins/reverb.md#rs-reverb) |
| Saturation| Hard Clipping | Цифровой эффект жесткого клиппирования | [Подробнее](plugins/saturation.md#hard-clipping) |
| Saturation | Harmonic Distortion | Добавляет уникальный характер через гармонические искажения с независимым управлением каждой гармоникой | [Подробнее](plugins/saturation.md#harmonic-distortion) |
| Saturation| Multiband Saturation | 3-полосный эффект насыщения для точного придания теплоты на основе частот | [Подробнее](plugins/saturation.md#multiband-saturation) |
| Saturation| Saturation | Эффект насыщения | [Подробнее](plugins/saturation.md#saturation) |
| Saturation| Sub Synth | Смешивает субгармонические сигналы для усиления басов | [Подробнее](plugins/saturation.md#sub-synth) |
| Spatial   | MS Matrix | Кодирование и декодирование «середина-бок» для управления стерео | [Подробнее](plugins/spatial.md#ms-matrix) |
| Spatial   | Multiband Balance | 5-полосное управление стереобалансом в зависимости от частоты | [Подробнее](plugins/spatial.md#multiband-balance) |
| Spatial   | Stereo Blend | Эффект контроля ширины стерео | [Подробнее](plugins/spatial.md#stereo-blend) |
| Others    | Oscillator | Генератор аудиосигнала с несколькими формами волн | [Подробнее](plugins/others.md#oscillator) |
| Control   | Section | Группировка нескольких эффектов для единообразного управления | [Подробнее](plugins/control.md) |

## Техническая информация

### Совместимость с браузерами

Frieve EffeTune был протестирован и подтвержден для работы в Google Chrome. Приложение требует современного браузера с поддержкой:
- Web Audio API
- Audio Worklet
- getUserMedia API
- Drag and Drop API

### Поддержка браузеров
1. **Chrome/Chromium**
   - Полностью поддерживается и рекомендуется
   - Обновите до последней версии для лучшей производительности

2. **Firefox/Safari**
   - Ограниченная поддержка
   - Некоторые функции могут работать не так, как ожидалось
   - Рекомендуется использовать Chrome для оптимального опыта

### Рекомендуемая частота дискретизации

Для оптимальной работы с нелинейными эффектами рекомендуется использовать EffeTune с частотой дискретизации 96 кГц или выше. Более высокая частота дискретизации помогает добиться идеальных характеристик при обработке аудио через нелинейные эффекты, такие как сатурация и компрессия.

## Руководство по разработке

Хотите создать собственные аудиоплагины? Ознакомьтесь с нашим [Plugin Development Guide](../../plugin-development.md).
Хотите создать настольное приложение? Ознакомьтесь с нашим [Руководством по сборке](../../build.md).

## Ссылки

[Version History](../../version-history.md)

[Source Code](https://github.com/Frieve-A/effetune)

[YouTube](https://www.youtube.com/@frieveamusic)
