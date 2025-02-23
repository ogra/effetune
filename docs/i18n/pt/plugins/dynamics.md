# Plugins de Dinâmica

Uma coleção de plugins que ajudam a equilibrar as partes altas e baixas da sua música, tornando sua experiência de audição mais agradável e confortável.

## Lista de Plugins

- [Auto Leveler](#auto-leveler) - Ajuste automático de volume para uma experiência de audição consistente
- [Brickwall Limiter](#brickwall-limiter) - Controle transparente de picos para uma audição segura e confortável
- [Compressor](#compressor) - Equilibra automaticamente os níveis de volume para uma audição mais confortável
- [Gate](#gate) - Reduz ruídos de fundo indesejados atenuando sinais abaixo de um limite
- [Multiband Compressor](#multiband-compressor) - Processador de dinâmica profissional de 5 bandas com modelagem de som estilo rádio FM

## Auto Leveler

Um controle inteligente de volume que ajusta automaticamente sua música para manter um nível de audição consistente. Ele utiliza medições de LUFS, padrão na indústria, para garantir que sua música permaneça em um volume confortável, seja durante a escuta de peças clássicas suaves ou canções pop dinâmicas.

### Guia de Aprimoramento da Audição
- Música Clássica:
  - Desfrute tanto das passagens suaves quanto dos crescendos intensos sem precisar ajustar o volume
  - Ouça todos os detalhes sutis em peças para piano
  - Perfeito para álbuns com níveis de gravação variáveis
- Música Pop/Rock:
  - Mantenha um volume consistente entre diferentes faixas
  - Sem surpresas com faixas excessivamente altas ou baixas
  - Audição confortável em sessões prolongadas
- Música de Fundo:
  - Mantenha o volume estável enquanto trabalha ou estuda
  - Nunca muito alto ou muito baixo
  - Perfeito para playlists com conteúdo variado

### Parâmetros

- **Target** (-36.0dB to 0.0dB LUFS)
  - Define o nível de audição desejado
  - O padrão -18.0dB LUFS é confortável para a maioria das músicas
  - Valores mais baixos para uma escuta de fundo mais silenciosa
  - Valores mais altos para um som mais impactante

- **Time Window** (1000ms to 10000ms)
  - Determina a rapidez com que o nível é medido
  - Tempos mais curtos: Resposta mais rápida às mudanças
  - Tempos mais longos: Som mais estável e natural
  - O padrão de 3000ms funciona bem para a maioria das músicas

- **Max Gain** (0.0dB to 12.0dB)
  - Limita o quanto os sons suaves são amplificados
  - Valores mais altos: Volume mais consistente
  - Valores mais baixos: Dinâmica mais natural
  - Comece com 6.0dB para um controle suave

- **Min Gain** (-36.0dB to 0.0dB)
  - Limita o quanto os sons altos são reduzidos
  - Valores mais altos: Som mais natural
  - Valores mais baixos: Volume mais consistente
  - Experimente -12.0dB como ponto de partida

- **Attack Time** (1ms to 1000ms)
  - Define a rapidez com que o volume é reduzido
  - Tempos mais rápidos: Melhor controle de sons altos repentinos
  - Tempos mais lentos: Transições mais naturais
  - O padrão de 50ms equilibra controle e naturalidade

- **Release Time** (10ms to 10000ms)
  - Define a rapidez com que o volume retorna ao normal
  - Tempos mais rápidos: Resposta mais ágil
  - Tempos mais lentos: Transições mais suaves
  - O padrão de 1000ms proporciona um som natural

- **Noise Gate** (-96dB to -24dB)
  - Reduz o processamento de sons muito suaves
  - Valores mais altos: Menos ruído de fundo
  - Valores mais baixos: Processa mais sons suaves
  - Comece em -60dB e ajuste conforme necessário

### Feedback Visual
- Exibição em tempo real do nível LUFS
- Nível de entrada (linha verde)
- Nível de saída (linha branca)
- Feedback visual claro dos ajustes de volume
- Gráfico baseado no tempo de fácil leitura

### Configurações Recomendadas

#### Audição Geral
- Target: -18.0dB LUFS
- Time Window: 3000ms
- Max Gain: 6.0dB
- Min Gain: -12.0dB
- Attack Time: 50ms
- Release Time: 1000ms
- Noise Gate: -60dB

#### Música de Fundo
- Target: -23.0dB LUFS
- Time Window: 5000ms
- Max Gain: 9.0dB
- Min Gain: -18.0dB
- Attack Time: 100ms
- Release Time: 2000ms
- Noise Gate: -54dB

#### Música Dinâmica
- Target: -16.0dB LUFS
- Time Window: 2000ms
- Max Gain: 3.0dB
- Min Gain: -6.0dB
- Attack Time: 30ms
- Release Time: 500ms
- Noise Gate: -72dB

## Brickwall Limiter

Um limitador de pico de alta qualidade que garante que sua música nunca exceda um nível específico, prevenindo clipagem digital enquanto mantém a qualidade natural do som. Perfeito para proteger seu sistema de áudio e garantir níveis de audição confortáveis sem comprometer a dinâmica da música.

### Guia de Aprimoramento da Audição
- Música Clássica:
  - Aproveite com segurança os crescendos orquestrais completos
  - Mantenha a dinâmica natural das peças de piano
  - Proteja contra picos inesperados em gravações ao vivo
- Música Pop/Rock:
  - Mantenha volume consistente durante passagens intensas
  - Aproveite música dinâmica em qualquer nível de audição
  - Previna distorção em seções com muito grave
- Música Eletrônica:
  - Controle picos de sintetizador de forma transparente
  - Mantenha o impacto enquanto previne sobrecarga
  - Mantenha os drops de grave potentes mas controlados

### Parâmetros
- **Input Gain** (-18dB a +18dB)
  - Ajusta o nível que entra no limitador
  - Aumente para acionar mais o limitador
  - Diminua se ouvir limitação em excesso
  - Valor padrão 0dB

- **Threshold** (-24dB a 0dB)
  - Define o nível máximo de pico
  - Valores mais baixos fornecem mais margem de segurança
  - Valores mais altos preservam mais dinâmica
  - Comece em -3dB para proteção suave

- **Release Time** (10ms a 500ms)
  - Rapidez com que a limitação é liberada
  - Tempos mais rápidos mantêm mais dinâmica
  - Tempos mais lentos para som mais suave
  - Tente 100ms como ponto de partida

- **Lookahead** (0ms a 10ms)
  - Permite ao limitador antecipar picos
  - Valores mais altos para limitação mais transparente
  - Valores mais baixos para menos latência
  - 3ms é um bom equilíbrio

- **Margin** (-1.000dB a 0.000dB)
  - Ajuste fino do limiar efetivo
  - Fornece margem de segurança adicional
  - Valor padrão -1.000dB funciona bem para a maioria dos materiais
  - Ajuste para controle preciso de picos

- **Oversampling** (1x, 2x, 4x, 8x)
  - Valores mais altos para limitação mais limpa
  - Valores mais baixos para menos uso de CPU
  - 4x é um bom equilíbrio entre qualidade e desempenho

### Display Visual
- Medição de redução de ganho em tempo real
- Indicação clara do nível de threshold
- Ajuste interativo de parâmetros
- Monitoramento de nível de pico

### Configurações Recomendadas

#### Proteção Transparente
- Input Gain: 0dB
- Threshold: -3dB
- Release: 100ms
- Lookahead: 3ms
- Margin: -1.000dB
- Oversampling: 4x

#### Máxima Segurança
- Input Gain: -6dB
- Threshold: -6dB
- Release: 50ms
- Lookahead: 5ms
- Margin: -1.000dB
- Oversampling: 8x

#### Dinâmica Natural
- Input Gain: 0dB
- Threshold: -1.5dB
- Release: 200ms
- Lookahead: 2ms
- Margin: -0.500dB
- Oversampling: 4x

## Compressor

Um efeito que gerencia automaticamente as diferenças de volume em sua música, reduzindo suavemente os sons altos e realçando os quietos. Isso cria uma experiência de audição mais equilibrada e agradável, suavizando mudanças repentinas de volume que podem ser perturbadoras ou desconfortáveis.

### Guia de Aprimoramento da Audição
- Música Clássica:
  - Torna os crescendos orquestrais dramáticos mais confortáveis de ouvir
  - Equilibra a diferença entre passagens suaves e fortes do piano
  - Ajuda a ouvir detalhes silenciosos mesmo em seções poderosas
- Música Pop/Rock:
  - Cria uma experiência de audição mais confortável durante seções intensas
  - Torna os vocais mais claros e fáceis de entender
  - Reduz a fadiga auditiva durante sessões longas
- Música Jazz:
  - Equilibra o volume entre diferentes instrumentos
  - Faz as seções solo se misturarem mais naturalmente com o conjunto
  - Mantém a clareza durante passagens tanto quietas quanto altas

### Parâmetros

- **Threshold** - Define o nível de volume onde o efeito começa a funcionar (-60dB a 0dB)
  - Configurações mais altas: Afeta apenas as partes mais altas da música
  - Configurações mais baixas: Cria mais equilíbrio geral
  - Comece em -24dB para um equilíbrio suave
- **Ratio** - Controla quão fortemente o efeito equilibra o volume (1:1 a 20:1)
  - 1:1: Sem efeito (som original)
  - 2:1: Equilíbrio suave
  - 4:1: Equilíbrio moderado
  - 8:1+: Controle de volume forte
- **Attack Time** - Quão rapidamente o efeito responde a sons altos (0.1ms a 100ms)
  - Tempos mais rápidos: Controle de volume mais imediato
  - Tempos mais lentos: Som mais natural
  - Tente 20ms como ponto de partida
- **Release Time** - Quão rapidamente o volume retorna ao normal (10ms a 1000ms)
  - Tempos mais rápidos: Som mais dinâmico
  - Tempos mais lentos: Transições mais suaves e naturais
  - Comece com 200ms para audição geral
- **Knee** - Quão suavemente o efeito faz a transição (0dB a 12dB)
  - Valores mais baixos: Controle mais preciso
  - Valores mais altos: Som mais suave e natural
  - 6dB é um bom ponto de partida
- **Gain** - Ajusta o volume geral após o processamento (-12dB a +12dB)
  - Use para equiparar o volume com o som original
  - Aumente se a música parecer muito baixa
  - Diminua se estiver muito alta

### Display Visual

- Gráfico interativo mostrando como o efeito está funcionando
- Indicadores de nível de volume fáceis de ler
- Feedback visual para todos os ajustes de parâmetros
- Linhas de referência para ajudar a guiar suas configurações

### Configurações Recomendadas para Diferentes Cenários de Audição
- Audição Casual em Segundo Plano:
  - Threshold: -24dB
  - Ratio: 2:1
  - Attack: 20ms
  - Release: 200ms
  - Knee: 6dB
- Sessões de Audição Crítica:
  - Threshold: -18dB
  - Ratio: 1.5:1
  - Attack: 30ms
  - Release: 300ms
  - Knee: 3dB
- Audição Noturna:
  - Threshold: -30dB
  - Ratio: 4:1
  - Attack: 10ms
  - Release: 150ms
  - Knee: 9dB

## Gate

Um gate de ruído que ajuda a reduzir ruídos de fundo indesejados atenuando automaticamente sinais que caem abaixo de um limite especificado. Este plugin é particularmente útil para limpar fontes de áudio com ruído de fundo constante, como ruído de ventilador, zumbido ou ruído ambiente.

### Características Principais
- Controle preciso de threshold para detecção acurada de ruído
- Ratio ajustável para redução de ruído natural ou agressiva
- Tempos de attack e release variáveis para controle de timing ideal
- Opção de soft knee para transições suaves
- Medição de redução de ganho em tempo real
- Display interativo de função de transferência

### Parâmetros

- **Threshold** (-96dB a 0dB)
  - Define o nível onde a redução de ruído começa
  - Sinais abaixo deste nível serão atenuados
  - Valores mais altos: Redução de ruído mais agressiva
  - Valores mais baixos: Efeito mais sutil
  - Comece em -40dB e ajuste com base no seu nível de ruído

- **Ratio** (1:1 a 100:1)
  - Controla quão fortemente os sinais abaixo do threshold são atenuados
  - 1:1: Sem efeito
  - 10:1: Forte redução de ruído
  - 100:1: Silêncio quase completo abaixo do threshold
  - Comece em 10:1 para redução de ruído típica

- **Attack Time** (0.01ms a 50ms)
  - Quão rapidamente o gate responde quando o sinal sobe acima do threshold
  - Tempos mais rápidos: Mais preciso mas pode soar abrupto
  - Tempos mais lentos: Transições mais naturais
  - Tente 1ms como ponto de partida

- **Release Time** (10ms a 2000ms)
  - Quão rapidamente o gate fecha quando o sinal cai abaixo do threshold
  - Tempos mais rápidos: Controle de ruído mais apertado
  - Tempos mais lentos: Decaimento mais natural
  - Comece com 200ms para som natural

- **Knee** (0dB a 6dB)
  - Controla quão gradualmente o gate faz a transição ao redor do threshold
  - 0dB: Hard knee para gating preciso
  - 6dB: Soft knee para transições mais suaves
  - Use 1dB para redução de ruído de uso geral

- **Gain** (-12dB a +12dB)
  - Ajusta o nível de saída após o gating
  - Use para compensar qualquer perda percebida de volume
  - Tipicamente deixado em 0dB a menos que necessário

### Feedback Visual
- Gráfico de função de transferência interativo mostrando:
  - Relação entrada/saída
  - Ponto de threshold
  - Curva de knee
  - Inclinação do ratio
- Medidor de redução de ganho em tempo real exibindo:
  - Quantidade atual de redução de ruído
  - Feedback visual da atividade do gate

### Configurações Recomendadas

#### Redução Leve de Ruído
- Threshold: -50dB
- Ratio: 2:1
- Attack: 5ms
- Release: 300ms
- Knee: 3dB
- Gain: 0dB

#### Ruído de Fundo Moderado
- Threshold: -40dB
- Ratio: 10:1
- Attack: 1ms
- Release: 200ms
- Knee: 1dB
- Gain: 0dB

#### Remoção Pesada de Ruído
- Threshold: -30dB
- Ratio: 50:1
- Attack: 0.1ms
- Release: 100ms
- Knee: 0dB
- Gain: 0dB

### Dicas de Aplicação
- Ajuste o threshold logo acima do nível de ruído para resultados ideais
- Use tempos de release mais longos para som mais natural
- Adicione algum knee ao processar material complexo
- Monitore o medidor de redução de ganho para garantir gating adequado
- Combine com outros processadores de dinâmica para controle abrangente

## Multiband Compressor

Um processador de dinâmica profissional que divide seu áudio em cinco bandas de frequência e processa cada uma independentemente. Este plugin é particularmente eficaz na criação daquele som polido "estilo rádio FM", onde cada parte do espectro de frequência é perfeitamente controlada e equilibrada.

### Características Principais
- Processamento de 5 bandas com frequências de crossover ajustáveis
- Controles de compressão independentes para cada banda
- Configurações padrão otimizadas para som estilo rádio FM
- Visualização em tempo real da redução de ganho por banda
- Filtros de crossover Linkwitz-Riley de alta qualidade

### Bandas de Frequência
- Banda 1 (Grave): Abaixo de 100 Hz
  - Controla as frequências graves profundas e sub-graves
  - Ratio mais alto e release mais longo para graves controlados e firmes
- Banda 2 (Médio-Grave): 100-500 Hz
  - Lida com os graves superiores e médios inferiores
  - Compressão moderada para manter o calor
- Banda 3 (Médio): 500-2000 Hz
  - Faixa crítica de presença vocal e instrumental
  - Compressão suave para preservar naturalidade
- Banda 4 (Médio-Agudo): 2000-8000 Hz
  - Controla presença e ar
  - Compressão leve com resposta mais rápida
- Banda 5 (Agudo): Acima de 8000 Hz
  - Gerencia brilho e cintilância
  - Tempos de resposta rápidos com ratio mais alto

### Parâmetros (Por Banda)
- **Threshold** (-60dB a 0dB)
  - Define o nível onde a compressão começa
  - Configurações mais baixas criam níveis mais consistentes
- **Ratio** (1:1 a 20:1)
  - Controla a quantidade de redução de ganho
  - Ratios mais altos para controle mais agressivo
- **Attack** (0.1ms a 100ms)
  - Quão rapidamente a compressão responde
  - Tempos mais rápidos para controle de transientes
- **Release** (10ms a 1000ms)
  - Quão rapidamente o ganho retorna ao normal
  - Tempos mais longos para som mais suave
- **Knee** (0dB a 12dB)
  - Suavidade do início da compressão
  - Valores mais altos para transição mais natural
- **Gain** (-12dB a +12dB)
  - Ajuste de nível de saída por banda
  - Ajuste fino do balanço de frequência

### Processamento Estilo Rádio FM
O Multiband Compressor vem com configurações padrão otimizadas que recriam o som polido e profissional da radiodifusão FM:

- Banda Grave (< 100 Hz)
  - Ratio mais alto (4:1) para controle firme dos graves
  - Attack/release mais lentos para manter o punch
  - Leve redução para evitar embolamento

- Banda Médio-Grave (100-500 Hz)
  - Compressão moderada (3:1)
  - Timing balanceado para resposta natural
  - Ganho neutro para manter o calor

- Banda Média (500-2000 Hz)
  - Compressão suave (2.5:1)
  - Tempos de resposta rápidos
  - Leve boost para presença vocal

- Banda Médio-Aguda (2000-8000 Hz)
  - Compressão leve (2:1)
  - Attack/release rápidos
  - Boost de presença realçado

- Banda Aguda (> 8000 Hz)
  - Ratio mais alto (5:1) para brilho consistente
  - Tempos de resposta muito rápidos
  - Redução controlada para polimento

Esta configuração cria o som característico "pronto para rádio":
- Graves consistentes e impactantes
- Vocais claros e presentes
- Dinâmica controlada em todas as frequências
- Polimento e brilho profissional
- Presença e clareza realçadas
- Fadiga auditiva reduzida

### Feedback Visual
- Gráficos de função de transferência interativos para cada banda
- Medidores de redução de ganho em tempo real
- Visualização de atividade da banda de frequência
- Indicadores claros de pontos de crossover

### Dicas de Uso
- Comece com o preset padrão de rádio FM
- Ajuste as frequências de crossover para combinar com seu material
- Ajuste fino do threshold de cada banda para a quantidade desejada de controle
- Use os controles de ganho para moldar o balanço final de frequência
- Monitore os medidores de redução de ganho para garantir processamento apropriado