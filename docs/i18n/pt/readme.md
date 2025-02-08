# Frieve EffeTune <img src="../../../images/icon.png" alt="EffeTune Icon" width="30" heignt="30" align="bottom">

[Abrir App](https://frieve-a.github.io/effetune/effetune.html)

Um processador de efeitos de áudio em tempo real baseado na web, projetado para entusiastas de áudio aprimorarem sua experiência de audição musical. O EffeTune permite processar qualquer fonte de áudio através de vários efeitos de alta qualidade, permitindo que você personalize e aperfeiçoe sua experiência de audição em tempo real.

[![Screenshot](../../../images/screenshot.png)](https://frieve-a.github.io/effetune/effetune.html)

## Conceito

O EffeTune é criado para entusiastas de áudio que desejam levar sua experiência de audição musical ao próximo nível. Seja você transmitindo música ou reproduzindo de mídia física, o EffeTune permite adicionar efeitos de nível profissional para personalizar o som exatamente às suas preferências. Transforme seu computador em um poderoso processador de efeitos de áudio que fica entre sua fonte de áudio e seus alto-falantes ou amplificador.

Sem mitos audiófilos, apenas ciência pura.

## Características

- Processamento de áudio em tempo real
- Interface de arrastar e soltar para construir cadeias de efeitos
- Sistema de plugins expansível com efeitos categorizados
- Visualização de áudio ao vivo
- Pipeline de áudio que pode ser modificado em tempo real

## Guia de Configuração

Antes de usar o EffeTune, você precisará configurar seu roteamento de áudio. Veja como configurar diferentes fontes de áudio:

### Configuração de Serviço de Streaming

Para processar áudio de serviços de streaming (Spotify, YouTube Music, etc.):

1. Pré-requisitos:
   - Instale um dispositivo de áudio virtual (ex: VB Cable, Voice Meeter ou ASIO Link Tool)
   - Configure seu serviço de streaming para enviar áudio para o dispositivo de áudio virtual

2. Configuração:
   - Inicie o EffeTune
   - Selecione o dispositivo de áudio virtual como sua fonte de entrada
   - Comece a reproduzir música do seu serviço de streaming
   - Verifique se o áudio está fluindo através do EffeTune
   - Adicione efeitos ao Pipeline para aprimorar sua experiência de audição

### Configuração de Fonte de Áudio Física

Para usar o EffeTune com players de CD, players de rede ou outras fontes físicas:

1. Configuração:
   - Conecte sua interface de áudio ao computador
   - Inicie o EffeTune
   - Selecione sua interface de áudio como fonte de entrada
   - Configure a saída de áudio do navegador para sua interface de áudio
   - Sua interface de áudio agora funciona como um processador multi-efeitos:
     * Entrada: Seu player de CD, player de rede ou outra fonte de áudio
     * Processamento: Efeitos em tempo real através do EffeTune
     * Saída: Áudio processado para seu amplificador ou alto-falantes

## Uso

### Construindo Sua Cadeia de Efeitos

1. Os plugins disponíveis estão listados no lado esquerdo da tela
2. Arraste plugins da lista para a área do Pipeline de Efeitos
3. Os plugins são processados em ordem de cima para baixo
4. Use a alça (⋮) para reordenar plugins arrastando
5. Clique no nome de um plugin para expandir/recolher suas configurações
6. Use o botão ON/OFF para bypass de efeitos individuais
7. Remova plugins usando o ícone da lixeira

### Seleção de Plugins e Atalhos de Teclado

1. Métodos de Seleção de Plugin:
   - Clique nos cabeçalhos dos plugins para selecionar plugins individuais
   - Segure Ctrl enquanto clica para selecionar múltiplos plugins
   - Clique em espaço vazio na área do Pipeline para desselecionar todos os plugins

2. Atalhos de Teclado:
   - Ctrl + A: Seleciona todos os plugins no Pipeline
   - Ctrl + C: Copia os plugins selecionados
   - Ctrl + V: Cola plugins da área de transferência
   - ESC: Desseleciona todos os plugins

3. Documentação de Plugin:
   - Clique no botão ? em qualquer plugin para abrir sua documentação detalhada em uma nova aba

### Compartilhando Cadeias de Efeitos

Você pode compartilhar sua configuração de cadeia de efeitos com outros usuários:
1. Após configurar sua cadeia de efeitos desejada, clique no botão "Share" no canto superior direito da área do Pipeline de Efeitos
2. A URL será automaticamente copiada para sua área de transferência
3. Compartilhe a URL copiada com outros - eles podem recriar sua cadeia de efeitos exata abrindo-a
4. Todas as configurações de efeitos são armazenadas na URL, tornando-as fáceis de salvar e compartilhar

### Reset de Áudio

Se você experimentar problemas de áudio (falhas, glitches):
1. Clique no botão "Reset Audio" no canto superior esquerdo
2. O pipeline de áudio será reconstruído automaticamente
3. Sua configuração de cadeia de efeitos será preservada

## Combinações Comuns de Efeitos

Aqui estão algumas combinações populares de efeitos para aprimorar sua experiência de audição:

### Aprimoramento de Fones de Ouvido
1. Stereo Blend -> RS Reverb
   - Stereo Blend: Ajusta largura estéreo para conforto (90-110%)
   - RS Reverb: Adiciona ambiência sutil de sala (10-20% mix)
   - Resultado: Audição mais natural e menos cansativa com fones

### Simulação de Vinil
1. Wow Flutter -> Noise Blender -> Simple Tube
   - Wow Flutter: Adiciona variação suave de altura
   - Noise Blender: Cria atmosfera tipo vinil
   - Simple Tube: Adiciona calor analógico
   - Resultado: Experiência autêntica de disco de vinil

### Estilo Rádio FM
1. Multiband Compressor -> 5Band PEQ -> Hard Clipping
   - Multiband Compressor: Cria aquele som de "rádio"
   - 5Band PEQ: Aprimora presença e clareza
   - Hard Clipping: Adiciona calor sutil
   - Resultado: Som profissional tipo transmissão

### Caráter Lo-Fi
1. Bit Crusher -> Simple Jitter -> RS Reverb
   - Bit Crusher: Reduz profundidade de bits para sensação retrô
   - Simple Jitter: Adiciona imperfeições digitais
   - RS Reverb: Cria espaço atmosférico
   - Resultado: Estética lo-fi clássica

## Solução de Problemas

### Problemas de Áudio
1. Falhas ou Glitches
   - Clique em "Reset Audio" para reconstruir o pipeline de áudio
   - Tente reduzir o número de efeitos ativos
   - Feche outras abas do navegador usando áudio

2. Alto Uso de CPU
   - Desative efeitos que você não está usando ativamente
   - Considere usar menos efeitos em sua cadeia

### Problemas Comuns de Configuração
1. Sem Entrada de Áudio
   - Verifique a seleção de dispositivo de entrada no EffeTune
   - Verifique as permissões de microfone do navegador
   - Certifique-se de que o áudio está sendo reproduzido da sua fonte

2. Efeito Não Funcionando
   - Verifique se o efeito está habilitado (botão ON/OFF)
   - Verifique as configurações de parâmetros
   - Tente remover e readicionar o efeito

3. Problemas de Compartilhamento
   - Use o botão "Share" para gerar uma URL
   - Copie a URL inteira ao compartilhar
   - Teste o link compartilhado em uma nova janela do navegador

## FAQ

P. Este app suporta som surround?
R. Atualmente, devido a limitações do navegador, não podemos lidar com mais de 2 canais no navegador, e não há histórico comprovado de operação surround. Embora a implementação do plugin em si suporte som surround, precisaremos esperar por suporte futuro do navegador.

P. Qual é o comprimento recomendado da cadeia de efeitos?
R. Embora não haja um limite estrito, recomendamos manter sua cadeia de efeitos em 8-10 efeitos para desempenho ideal. Cadeias mais complexas podem impactar o desempenho do sistema.

P. Posso salvar minhas combinações favoritas de efeitos?
R. Sim! Use o botão "Share" para gerar uma URL que contém toda sua configuração de cadeia de efeitos. Adicione esta URL aos favoritos para salvar suas configurações.

P. Como obtenho a melhor qualidade de som?
R. Use taxa de amostragem de 96kHz quando possível, comece com configurações sutis de efeitos e construa sua cadeia gradualmente. Monitore os níveis para evitar distorção.

P. Isso funcionará com qualquer fonte de áudio?
R. Sim, o EffeTune pode processar qualquer áudio reproduzido através do seu dispositivo de entrada selecionado, incluindo serviços de streaming, arquivos locais e mídia física.

## Efeitos Disponíveis

| Categoria | Efeito | Descrição | Documentação |
|----------|--------|-------------|---------------|
| Analyzer | Level Meter | Exibe nível de áudio com retenção de pico | [Detalhes](plugins/analyzer.md#level-meter) |
| Analyzer | Oscilloscope | Visualização de forma de onda em tempo real | [Detalhes](plugins/analyzer.md#oscilloscope) |
| Analyzer | Spectrogram | Exibe mudanças do espectro de frequência ao longo do tempo | [Detalhes](plugins/analyzer.md#spectrogram) |
| Analyzer | Spectrum Analyzer | Análise de espectro em tempo real | [Detalhes](plugins/analyzer.md#spectrum-analyzer) |
| Basics | DC Offset | Ajuste de offset DC | [Detalhes](plugins/basics.md#dc-offset) |
| Basics | Polarity Inversion | Inversão de polaridade do sinal | [Detalhes](plugins/basics.md#polarity-inversion) |
| Basics | Stereo Balance | Controle de balanço de canais estéreo | [Detalhes](plugins/basics.md#stereo-balance) |
| Basics | Volume | Controle básico de volume | [Detalhes](plugins/basics.md#volume) |
| Dynamics | Compressor | Compressão de faixa dinâmica com controle de threshold, ratio e knee | [Detalhes](plugins/dynamics.md#compressor) |
| Dynamics | Gate | Gate de ruído com controle de threshold, ratio e knee para redução de ruído | [Detalhes](plugins/dynamics.md#gate) |
| Dynamics | Multiband Compressor | Processador de dinâmica profissional de 5 bandas com modelagem de som estilo rádio FM | [Detalhes](plugins/dynamics.md#multiband-compressor) |
| EQ | 15Band GEQ | Equalizador gráfico de 15 bandas | [Detalhes](plugins/eq.md#15band-geq) |
| EQ | 5Band PEQ | Equalizador paramétrico profissional com 5 bandas totalmente configuráveis | [Detalhes](plugins/eq.md#5band-peq) |
| EQ | Narrow Range | Combinação de filtro passa-alta e passa-baixa | [Detalhes](plugins/eq.md#narrow-range) |
| EQ | Tone Control | Controle de tom de três bandas | [Detalhes](plugins/eq.md#tone-control) |
| Filter | Wow Flutter | Efeito de modulação baseado em tempo | [Detalhes](plugins/filter.md#wow-flutter) |
| Lo-Fi | Bit Crusher | Redução de profundidade de bits e efeito zero-order hold | [Detalhes](plugins/lofi.md#bit-crusher) |
| Lo-Fi | Noise Blender | Geração e mixagem de ruído | [Detalhes](plugins/lofi.md#noise-blender) |
| Lo-Fi | Simple Jitter | Simulação de jitter digital | [Detalhes](plugins/lofi.md#simple-jitter) |
| Reverb | RS Reverb | Reverb de espalhamento aleatório com difusão natural | [Detalhes](plugins/reverb.md#rs-reverb) |
| Saturation | Hard Clipping | Efeito de clipping digital | [Detalhes](plugins/saturation.md#hard-clipping) |
| Saturation | Saturation | Efeito de saturação | [Detalhes](plugins/saturation.md#saturation) |
| Spatial | Stereo Blend | Efeito de controle de largura estéreo | [Detalhes](plugins/spatial.md#stereo-blend) |
| Others | Oscillator | Gerador de sinal de áudio multi-forma de onda | [Detalhes](plugins/others.md#oscillator) |

## Informações Técnicas

### Compatibilidade com Navegadores

O Frieve EffeTune foi testado e verificado para funcionar no Google Chrome. O aplicativo requer um navegador moderno com suporte para:
- Web Audio API
- Audio Worklet
- getUserMedia API
- Drag and Drop API

### Detalhes de Suporte de Navegador
1. Chrome/Chromium
   - Totalmente suportado e recomendado
   - Atualize para a última versão para melhor desempenho

2. Firefox/Safari
   - Suporte limitado
   - Alguns recursos podem não funcionar como esperado
   - Considere usar Chrome para melhor experiência

### Taxa de Amostragem Recomendada

Para desempenho ideal com efeitos não lineares, é recomendado usar o EffeTune em uma taxa de amostragem de 96kHz ou superior. Esta taxa de amostragem mais alta ajuda a alcançar características ideais ao processar áudio através de efeitos não lineares como saturação e compressão.

## Desenvolvimento de Plugins

Quer criar seus próprios plugins de áudio? Confira nosso [Guia de Desenvolvimento de Plugins](../../plugin-development.md).

## Histórico de Versões

### Versão 1.00 (8 de Fevereiro de 2025)
- Eficiência de processamento melhorada
- Várias melhorias menores

### Versão 0.50 (7 de Fevereiro de 2025)
- Nossa documentação de uso agora está disponível nos seguintes idiomas: 中文 (简体), Español, हिन्दी, العربية, Português, Русский, 日本語, 한국어, e Français
- Várias melhorias menores

### Versão 0.30 (5 de Fevereiro de 2025)
- Eficiência de processamento melhorada
- Adicionada seleção de plugin e atalhos de teclado (Ctrl+A, Ctrl+C, Ctrl+V)
- Adicionado plugin Oscilloscope para visualização de forma de onda em tempo real
- Várias melhorias menores

### Versão 0.10 (3 de Fevereiro de 2025)
- Adicionado suporte a operação por toque
- Eficiência de processamento melhorada
- Tarefas de processamento pesado otimizadas
- Falhas de áudio reduzidas
- Várias melhorias menores

### Versão 0.01 (2 de Fevereiro de 2025)
- Lançamento inicial

## Links

[Código Fonte](https://github.com/Frieve-A/effetune)

[YouTube](https://www.youtube.com/@frieveamusic)