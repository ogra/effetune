# Outras Ferramentas de Áudio

Uma coleção de ferramentas de áudio especializadas e geradores que complementam as principais categorias de efeitos. Esses plugins fornecem capacidades únicas para geração de som e experimentação de áudio.

## Lista de Plugins

- [Oscillator](#oscillator) - Gerador de sinal de áudio multi-forma de onda com controle preciso de frequência

## Oscillator

Um gerador de sinal de áudio versátil que produz várias formas de onda com controle preciso de frequência. Perfeito para testar sistemas de áudio, criar tons de referência ou experimentar com síntese sonora.

### Características
- Múltiplos tipos de forma de onda:
  - Onda senoidal pura para tons de referência
  - Onda quadrada para conteúdo harmônico rico
  - Onda triangular para harmônicos mais suaves
  - Onda dente de serra para timbres brilhantes
  - Ruído branco para teste de sistema
  - Ruído rosa para medições acústicas

### Parâmetros
- **Frequency (Hz)** - Controla a altura do tom gerado (20 Hz a 96 kHz)
  - Frequências baixas: Tons graves profundos
  - Frequências médias: Faixa musical
  - Frequências altas: Teste de sistema
- **Volume (dB)** - Ajusta o nível de saída (-96 dB a 0 dB)
  - Use valores mais baixos para tons de referência
  - Valores mais altos para teste de sistema
- **Panning (L/R)** - Controla o posicionamento estéreo
  - Centro: Igual em ambos os canais
  - Esquerda/Direita: Teste de balanço de canais
- **Waveform Type** - Seleciona o tipo de sinal
  - Sine: Tom de referência limpo
  - Square: Rico em harmônicos ímpares
  - Triangle: Conteúdo harmônico mais suave
  - Sawtooth: Série harmônica completa
  - White Noise: Energia igual por Hz
  - Pink Noise: Energia igual por oitava

### Exemplos de Uso

1. Teste de Alto-falantes
   - Verificar faixa de reprodução de frequência
     * Use varredura de onda senoidal de baixa a alta frequência
     * Note onde o som se torna inaudível ou distorcido
   - Testar características de distorção
     * Use ondas senoidais puras em diferentes frequências
     * Ouça harmônicos ou distorção indesejados
     * Compare o comportamento em diferentes níveis de volume

2. Análise Acústica de Ambiente
   - Identificar ondas estacionárias
     * Use ondas senoidais nas frequências suspeitas de modos da sala
     * Mova-se pelo ambiente para encontrar nós e antinós
   - Verificar ressonância e reverberação
     * Teste diferentes frequências para encontrar ressonâncias problemáticas
     * Use ruído rosa para avaliar a resposta geral do ambiente
   - Mapear resposta de frequência em diferentes posições
     * Use varreduras senoidais para verificar consistência na área de audição

3. Teste de Fones de Ouvido
   - Avaliar interferência entre canais
     * Envie sinal para apenas um canal
     * Verifique vazamento indesejado para o outro canal
   - Testar resposta de frequência
     * Use varreduras senoidais para verificar balanço de frequência
     * Compare respostas dos canais esquerdo e direito

4. Testes de Audição
   - Verificar faixa auditiva pessoal
     * Varra frequências para encontrar limites superior e inferior
     * Note quaisquer lacunas ou fraquezas de frequência
   - Determinar volume mínimo audível
     * Teste diferentes frequências em volumes variados
     * Mapeie contornos pessoais de igual intensidade sonora

5. Calibração de Sistema
   - Correspondência de nível entre componentes
     * Use ondas senoidais em frequências de referência
     * Garanta níveis consistentes ao longo da cadeia de sinal
   - Verificação de balanço de canais
     * Teste balanço esquerda/direita em diferentes frequências
     * Garanta imagem estéreo adequada

Lembre-se: O Oscillator é uma ferramenta de precisão - comece com volumes mais baixos e aumente gradualmente para evitar possíveis danos ao equipamento ou fadiga auditiva.