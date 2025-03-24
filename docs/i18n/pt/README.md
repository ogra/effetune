# Frieve EffeTune <img src="../../../images/icon_64x64.png" alt="EffeTune Icon" width="30" height="30" align="bottom">

[Open Web App](https://frieve-a.github.io/effetune/effetune.html)  [Download Desktop App](https://github.com/Frieve-A/effetune/releases/)

Um processador de efeitos de áudio em tempo real, projetado para entusiastas do áudio aprimorarem sua experiência de escuta. EffeTune permite que você processe qualquer fonte de áudio através de vários efeitos de alta qualidade, possibilitando personalizar e aperfeiçoar sua experiência de escuta em tempo real.

[![Screenshot](../../../images/screenshot.png)](https://frieve-a.github.io/effetune/effetune.html)

## Conceito

EffeTune foi criado para entusiastas do áudio que desejam melhorar sua experiência musical. Quer você esteja transmitindo música ou reproduzindo mídias físicas, EffeTune permite adicionar efeitos de nível profissional para personalizar o som conforme suas preferências exatas. Transforme seu computador em um poderoso processador de efeitos de áudio que se posiciona entre sua fonte de áudio e seus alto-falantes ou amplificador.

Sem mitos audiófilos, apenas pura ciência.

## Recursos

- Processamento de áudio em tempo real
- Interface de arrastar e soltar para construir cadeias de efeitos
- Sistema de efeitos expansível com efeitos categorizados
- Visualização de áudio ao vivo
- Pipeline de áudio que pode ser modificado em tempo real
- Processamento offline de arquivos de áudio com a cadeia de efeitos atual

## Guia de Configuração

Antes de usar o EffeTune, você precisará configurar o roteamento de áudio. Veja como configurar diferentes fontes de áudio:

### Configuração do Reprodutor de Arquivos de Música

- Abra o aplicativo web EffeTune em seu navegador, ou inicie o aplicativo desktop EffeTune
- Abra e reproduza um arquivo de música para garantir a reprodução adequada
   - Abra um arquivo de música e selecione EffeTune como o aplicativo (apenas aplicativo desktop)
   - Ou selecione Abrir arquivo de música... no menu Arquivo (apenas aplicativo desktop)
   - Ou arraste o arquivo de música para a janela

### Configuração para Serviços de Streaming

Para processar áudio de serviços de streaming (Spotify, YouTube Music, etc.):

1. Pré-requisitos:
   - Instale um dispositivo de áudio virtual (por exemplo, VB Cable, Voice Meeter ou ASIO Link Tool)
   - Configure seu serviço de streaming para enviar o áudio para o dispositivo de áudio virtual

2. Configuração:
   - Abra o aplicativo web EffeTune em seu navegador, ou inicie o aplicativo desktop EffeTune
   - Selecione o dispositivo de áudio virtual como fonte de entrada
     - No Chrome, na primeira vez que você abri-lo, uma caixa de diálogo aparecerá pedindo para selecionar e permitir a entrada de áudio
     - No aplicativo desktop, configure-o clicando no botão Config Audio no canto superior direito da tela
   - Comece a reproduzir música no seu serviço de streaming
   - Verifique se o áudio está passando pelo EffeTune

### Configuração para Fontes de Áudio Físicas

Para usar o EffeTune com players de CD, players de rede ou outras fontes físicas:

- Conecte sua interface de áudio ao seu computador
- Abra o aplicativo web EffeTune em seu navegador, ou inicie o aplicativo desktop EffeTune
- Selecione sua interface de áudio como fonte de entrada e saída
   - No Chrome, na primeira vez que você abri-lo, uma caixa de diálogo aparecerá pedindo para selecionar e permitir a entrada de áudio
   - No aplicativo desktop, configure-o clicando no botão Config Audio no canto superior direito da tela
- Sua interface de áudio agora funciona como um processador de múltiplos efeitos:
   * Entrada: Seu CD player, player de rede ou outra fonte de áudio
   * Processamento: Efeitos em tempo real através do EffeTune
   * Saída: Áudio processado para seu amplificador ou alto-falantes

## Uso

### Construindo Sua Cadeia de Efeitos

1. Os **Available Effects** estão listados no lado esquerdo da tela
   - Use o botão de busca ao lado de **Available Effects** para filtrar os efeitos
   - Digite qualquer texto para encontrar efeitos por nome ou categoria
   - Pressione ESC para limpar a busca
2. Arraste os efeitos da lista para a área **Effect Pipeline**
3. Os efeitos são processados na ordem de cima para baixo
4. Arraste o manipulador (⋮) ou clique nos botões ▲▼ para reordenar os efeitos
5. Clique no nome do efeito para expandir/ocultar suas configurações
   - Shift+clique para expandir/ocultar todos os efeitos, exceto a categoria Analyzer
6. Use o botão **ON** para desativar (bypass) efeitos individuais
7. Clique no botão **?** para abrir sua documentação detalhada em uma nova aba
8. Remova os efeitos usando o ícone de lixeira

### Usando Presets

1. Salve sua cadeia de efeitos:
   - Configure sua cadeia de efeitos desejada e os parâmetros
   - Digite um nome para seu preset no campo de entrada
   - Clique no botão de salvar para armazenar seu preset

2. Carregar um Preset:
   - Digite ou selecione um nome de preset na lista suspensa
   - O preset será carregado automaticamente
   - Todos os efeitos e suas configurações serão restaurados

3. Excluir um Preset:
   - Selecione o preset que deseja remover
   - Clique no botão de excluir
   - Confirme a exclusão quando solicitado

4. Informações do Preset:
   - Cada preset armazena a configuração completa da sua cadeia de efeitos
   - Inclui a ordem dos efeitos, os parâmetros e os estados

### Seleção de Efeitos e Atalhos de Teclado

1. Métodos de Seleção de Efeitos:
   - Clique nos cabeçalhos dos efeitos para selecionar efeitos individuais
   - Mantenha Ctrl pressionado ao clicar para selecionar múltiplos efeitos
   - Clique em um espaço vazio na área **Effect Pipeline** para desmarcar todos os efeitos

2. Atalhos de Teclado:
   - Ctrl + Z: Desfazer
   - Ctrl + Y: Refazer
   - Ctrl + S: Salvar o pipeline atual
   - Ctrl + Shift + S: Salvar o pipeline atual como
   - Ctrl + X: Recortar os efeitos selecionados
   - Ctrl + C: Copiar os efeitos selecionados
   - Ctrl + V: Colar os efeitos da área de transferência
   - Ctrl + F: Procurar efeitos
   - Ctrl + A: Selecionar todos os efeitos no pipeline
   - Delete: Excluir os efeitos selecionados
   - ESC: Desmarcar todos os efeitos

3. Atalhos de teclado (ao usar o player):
   - Space: Reproduzir/Pausar
   - Ctrl + → ou N: Próxima faixa
   - Ctrl + ← ou P: Faixa anterior
   - Shift + → ou F ou .: Avançar 10 segundos
   - Shift + ← ou B ou ,: Retroceder 10 segundos
   - Ctrl + T: Alternar modo de repetição
   - Ctrl + H: Alternar modo aleatório

### Processamento de Arquivos de Áudio

1. Área de Soltar ou Especificar Arquivos:
   - Uma área dedicada para soltar arquivos está sempre visível abaixo da área **Effect Pipeline**
   - Suporta um ou múltiplos arquivos de áudio
   - Os arquivos são processados usando as configurações da cadeia atual
   - Todo o processamento é feito na taxa de amostragem da cadeia

2. Status do Processamento:
   - A barra de progresso mostra o status atual do processamento
   - O tempo de processamento depende do tamanho do arquivo e da complexidade da cadeia de efeitos

3. Opções de Download ou Salvamento:
   - O arquivo processado é gerado no formato WAV
   - Múltiplos arquivos são automaticamente empacotados em um arquivo ZIP

### Compartilhando Cadeias de Efeitos

Você pode compartilhar a configuração da sua cadeia de efeitos com outros usuários:
1. Após configurar sua cadeia de efeitos desejada, clique no botão **Share** no canto superior direito da área **Effect Pipeline**
2. A URL do aplicativo web será copiada automaticamente para sua área de transferência
3. Compartilhe a URL copiada com outros – eles poderão recriar exatamente sua cadeia de efeitos ao abri-la
4. No aplicativo web, todas as configurações dos efeitos são armazenadas na URL, facilitando o salvamento e compartilhamento
5. Na versão do aplicativo desktop, exporte as configurações para um arquivo effetune_preset a partir do menu Arquivo
6. Compartilhe o arquivo effetune_preset exportado. O arquivo effetune_preset também pode ser carregado arrastando-o para a janela do aplicativo web

### Reset de Áudio

Se você estiver enfrentando problemas de áudio (interrupções, falhas):
1. Clique no botão **Reset Audio** no canto superior esquerdo no aplicativo web ou selecione Reload no menu View no aplicativo desktop
2. O pipeline de áudio será reconstruído automaticamente
3. A configuração da sua cadeia de efeitos será preservada

## Combinações Comuns de Efeitos

Aqui estão algumas combinações populares de efeitos para aprimorar sua experiência de escuta:

### Melhoria para Fones de Ouvido
1. Stereo Blend -> RS Reverb
   - **Stereo Blend**: Ajusta a largura estéreo para conforto (60-100%)
   - **RS Reverb**: Adiciona uma ambiência sutil de sala (mistura de 10-20%)
   - **Resultado**: Audição com fones de ouvido mais natural e menos fatigante

### Simulação de Vinil
1. Wow Flutter -> Noise Blender -> Saturation
   - **Wow Flutter**: Adiciona uma variação suave de pitch
   - **Noise Blender**: Cria uma atmosfera semelhante à do vinil
   - **Saturation**: Adiciona um calor analógico
   - **Resultado**: Experiência autêntica de disco de vinil

### Estilo Rádio FM
1. Multiband Compressor -> Stereo Blend
   - **Multiband Compressor**: Cria aquele som de "rádio"
   - **Stereo Blend**: Ajusta a largura estéreo para conforto (100-150%)
   - **Resultado**: Som com qualidade de transmissão profissional

### Caráter Lo-Fi
1. Bit Crusher -> Simple Jitter -> RS Reverb
   - **Bit Crusher**: Reduz a profundidade de bits para uma sensação retrô
   - **Simple Jitter**: Adiciona imperfeições digitais
   - **RS Reverb**: Cria um espaço atmosférico
   - **Resultado**: Estética clássica lo-fi

## Solução de Problemas

### Problemas de Áudio
1. Interrupções ou Falhas
   - Clique no botão **Reset Audio** no canto superior esquerdo no aplicativo web ou selecione Reload no menu View no aplicativo desktop para reconstruir o pipeline de áudio
   - Tente reduzir o número de efeitos ativos

2. Alto Uso de CPU
   - Desative os efeitos que você não está utilizando ativamente
   - Considere usar menos efeitos em sua cadeia

3. Ocorrência de Eco
   - É provável que suas entradas e saídas de áudio não estejam configuradas corretamente
   - Para processar a saída de áudio do navegador, considere instalar um navegador dedicado exclusivamente para o EffeTune, ou use o aplicativo desktop em vez do aplicativo web

### Problemas Comuns de Configuração
1. Sem Entrada de Áudio
   - Verifique se o áudio está sendo reproduzido a partir de uma fonte e saindo para um dispositivo de áudio virtual
   - Para a versão do aplicativo web, certifique-se de que as permissões de entrada de áudio estão permitidas em seu navegador e que o dispositivo de áudio virtual está selecionado como dispositivo de entrada
   - Para a versão do aplicativo desktop, vá para Config Audio no canto superior direito da tela e certifique-se de que o dispositivo de áudio virtual está selecionado como dispositivo de entrada

2. Efeito Não Funciona
   - Verifique se o efeito está habilitado (botão **ON/OFF**)
   - Confira as configurações dos parâmetros

3. Sem Saída de Áudio
   - Para a versão do aplicativo web, certifique-se de que a saída de áudio do sistema operacional está definida como dispositivo de saída
   - Para a versão do aplicativo desktop, vá para "Config Audio" no canto superior direito da tela e certifique-se de que o dispositivo de saída correto está selecionado

## FAQ

**Q. Does this app support surround sound?**
**A.** Atualmente, devido às limitações do navegador, não podemos lidar com mais de 2 canais, e não há um histórico comprovado de operação com som surround. Embora a implementação dos efeitos suporte som surround, teremos que aguardar o suporte futuro dos navegadores.

**Q. What's the recommended effect chain length?**
**A.** Embora não haja um limite rígido, recomendamos manter sua cadeia de efeitos entre 8 e 10 efeitos para um desempenho ideal. Cadeias mais complexas podem impactar o desempenho do sistema.

**Q. How do I achieve the best sound quality?**
**A.** Use taxas de amostragem de 96kHz ou superiores sempre que possível, comece com configurações sutis de efeitos e construa sua cadeia gradualmente. Monitore os níveis para evitar distorções.

**Q. Will this work with any audio source?**
**A.** Sim, o EffeTune pode processar qualquer áudio que esteja sendo reproduzido através do dispositivo de entrada selecionado, incluindo serviços de streaming, arquivos locais e mídias físicas.

## Efeitos Disponíveis

| Categoria | Efeito | Descrição | Documentação |
|-----------|--------|-----------|--------------|
| Analyzer  | Level Meter       | Exibe o nível de áudio com retenção de pico                                      | [Detalhes](plugins/analyzer.md#level-meter) |
| Analyzer  | Oscilloscope      | Visualização em tempo real da forma de onda                                      | [Detalhes](plugins/analyzer.md#oscilloscope) |
| Analyzer  | Spectrogram       | Exibe as alterações do espectro de frequências ao longo do tempo                  | [Detalhes](plugins/analyzer.md#spectrogram) |
| Analyzer  | Spectrum Analyzer | Análise do espectro em tempo real                                                 | [Detalhes](plugins/analyzer.md#spectrum-analyzer) |
| Analyzer  | Stereo Meter      | Visualiza o equilíbrio estéreo e o movimento do som                               | [Detalhes](plugins/analyzer.md#stereo-meter) |
| Basics    | DC Offset         | Ajuste do offset DC                                                                | [Detalhes](plugins/basics.md#dc-offset) |
| Basics    | Polarity Inversion| Inversão da polaridade do sinal                                                    | [Detalhes](plugins/basics.md#polarity-inversion) |
| Basics    | Stereo Balance    | Controle do equilíbrio dos canais estéreo                                          | [Detalhes](plugins/basics.md#stereo-balance) |
| Basics    | Volume            | Controle básico de volume                                                          | [Detalhes](plugins/basics.md#volume) |
| Delay     | Time Alignment    | Ajustes precisos de temporização para canais de áudio                             | [Detalhes](plugins/delay.md#time-alignment) |
| Dynamics  | Auto Leveler      | Ajuste automático de volume baseado em medição LUFS para uma experiência de escuta consistente | [Detalhes](plugins/dynamics.md#auto-leveler) |
| Dynamics  | Brickwall Limiter | Controle transparente de picos para uma escuta segura e confortável              | [Detalhes](plugins/dynamics.md#brickwall-limiter) |
| Dynamics  | Compressor        | Compressão da faixa dinâmica com controle de threshold, ratio e knee               | [Detalhes](plugins/dynamics.md#compressor) |
| Dynamics  | Gate              | Noise gate com controle de threshold, ratio e knee para redução de ruído           | [Detalhes](plugins/dynamics.md#gate) |
| Dynamics  | Multiband Compressor | Processador de dinâmica profissional de 5 bandas com modelagem de som no estilo rádio FM | [Detalhes](plugins/dynamics.md#multiband-compressor) |
| EQ        | 15Band GEQ        | Equalizador gráfico de 15 bandas                                                   | [Detalhes](plugins/eq.md#15band-geq) |
| EQ        | 5Band PEQ         | Equalizador paramétrico profissional com 5 bandas totalmente configuráveis         | [Detalhes](plugins/eq.md#5band-peq) |
| EQ        | Loudness Equalizer| Correção do equilíbrio de frequência para audição em volume baixo                  | [Detalhes](plugins/eq.md#loudness-equalizer) |
| EQ        | Narrow Range      | Combinação de filtro passa-alta e passa-baixa                                      | [Detalhes](plugins/eq.md#narrow-range) |
| EQ        | Tone Control      | Controle de tom de três bandas                                                     | [Detalhes](plugins/eq.md#tone-control) |
| Lo-Fi     | Bit Crusher       | Redução da profundidade de bits e efeito de retenção de ordem zero                   | [Detalhes](plugins/lofi.md#bit-crusher) |
| Lo-Fi     | Noise Blender     | Geração e mistura de ruído                                                         | [Detalhes](plugins/lofi.md#noise-blender) |
| Lo-Fi     | Simple Jitter     | Simulação de jitter digital                                                        | [Detalhes](plugins/lofi.md#simple-jitter) |
| Modulation | Pitch Shifter | Efeito leve de alteração de tom | [Detalhes](docs/plugins/modulation.md#pitch-shifter) |
| Modulation | Tremolo | Efeito de modulação baseado em volume | [Detalhes](docs/plugins/modulation.md#tremolo) |
| Modulation | Wow Flutter | Efeito de modulação baseado em tempo | [Detalhes](docs/plugins/modulation.md#wow-flutter) |
| Reverb    | RS Reverb         | Reverb de dispersão aleatória com difusão natural                                  | [Detalhes](plugins/reverb.md#rs-reverb) |
| Saturation| Hard Clipping     | Efeito de hard clipping digital                                                    | [Detalhes](plugins/saturation.md#hard-clipping) |
| Saturation| Multiband Saturation | Efeito de saturação de 3 bandas para um aquecimento preciso baseado em frequência    | [Detalhes](plugins/saturation.md#multiband-saturation) |
| Saturation| Saturation        | Efeito de saturação                                                                | [Detalhes](plugins/saturation.md#saturation) |
| Saturation| Sub Synth         | Mistura sinais subharmônicos para realce dos graves                                | [Detalhes](plugins/saturation.md#sub-synth) |
| Spatial   | Multiband Balance | Controle de equilíbrio estéreo dependente da frequência com 5 bandas                 | [Detalhes](plugins/spatial.md#multiband-balance) |
| Spatial   | Stereo Blend      | Efeito de controle de largura estéreo                                              | [Detalhes](plugins/spatial.md#stereo-blend) |
| Others    | Oscillator        | Gerador de sinal de áudio com múltiplas formas de onda                             | [Detalhes](plugins/others.md#oscillator) |

## Informações Técnicas

### Compatibilidade de Navegador

Frieve EffeTune foi testado e verificado para funcionar no Google Chrome. A aplicação requer um navegador moderno com suporte para:
- Web Audio API
- Audio Worklet
- getUserMedia API
- Drag and Drop API

### Detalhes de Suporte do Navegador
1. Chrome/Chromium
   - Totalmente suportado e recomendado
   - Atualize para a versão mais recente para melhor desempenho

2. Firefox/Safari
   - Suporte limitado
   - Algumas funcionalidades podem não funcionar como esperado
   - Considere usar o Chrome para a melhor experiência

### Taxa de Amostragem Recomendada

Para um desempenho ideal com efeitos não lineares, recomenda-se usar o EffeTune com uma taxa de amostragem de 96kHz ou superior. Essa taxa de amostragem mais alta ajuda a alcançar características ideais ao processar áudio através de efeitos não lineares, como saturação e compressão.

## Guia de Desenvolvimento

Quer criar seus próprios plugins de áudio? Confira nosso [Plugin Development Guide](../../plugin-development.md).
Quer construir um aplicativo desktop? Confira nosso [Guia de Construção](../../build.md).

## Links

[Version History](../../version-history.md)

[Source Code](https://github.com/Frieve-A/effetune)

[YouTube](https://www.youtube.com/@frieveamusic)
