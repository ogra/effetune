# Plugins de Equalizador

Uma coleção de plugins que permite ajustar diferentes aspectos do som da sua música, desde graves profundos até agudos nítidos. Essas ferramentas ajudam você a personalizar sua experiência de audição, realçando ou reduzindo elementos sonoros específicos.

## Lista de Plugins

- [15Band GEQ](#15band-geq) - Ajuste detalhado do som com 15 controles precisos
- [5Band PEQ](#5band-peq) - Equalizador paramétrico profissional com controles flexíveis
- [Hi Pass Filter](#hi-pass-filter) - Remove frequências baixas indesejadas com precisão
- [Lo Pass Filter](#lo-pass-filter) - Remove frequências altas indesejadas com precisão
- [Loudness Equalizer](#loudness-equalizer) - Correção do balanço de frequência para audição em volumes baixos
- [Narrow Range](#narrow-range) - Foca em partes específicas do som
- [Tone Control](#tone-control) - Ajuste simples de graves, médios e agudos

## 15Band GEQ

Uma ferramenta de ajuste de som detalhada com 15 controles separados, cada um afetando uma parte específica do espectro sonoro. Perfeita para afinar sua música exatamente do jeito que você gosta.

### Guia de Aperfeiçoamento da Audição
- Região dos Graves (25Hz-160Hz):
  - Realce a potência dos bumbos e dos graves profundos
  - Ajuste a plenitude dos instrumentos de baixo
  - Controle o sub-grave que faz tremer o ambiente
- Médios Baixos (250Hz-630Hz):
  - Ajuste o calor da música
  - Controle a plenitude do som geral
  - Reduza ou realce a "espessura" do som
- Médios Superiores (1kHz-2.5kHz):
  - Torne os vocais mais claros e presentes
  - Ajuste a proeminência dos instrumentos principais
  - Controle a sensação de que o som está "à frente"
- Altas Frequências (4kHz-16kHz):
  - Realce a nitidez e os detalhes
  - Controle o "brilho" e o "ar" na música
  - Ajuste o brilho geral

### Parâmetros
- **Ganho das Bandas** - Controles individuais para cada faixa de frequência (-12dB a +12dB)
  - Graves Profundos
    - 25Hz: Sensação de grave mais baixa
    - 40Hz: Impacto de grave profundo
    - 63Hz: Potência dos graves
    - 100Hz: Plenitude dos graves
    - 160Hz: Graves superiores
  - Som Inferior
    - 250Hz: Calor do som
    - 400Hz: Plenitude do som
    - 630Hz: Corpo do som
  - Som Médio
    - 1kHz: Presença principal do som
    - 1.6kHz: Clareza do som
    - 2.5kHz: Detalhe do som
  - Som Alto
    - 4kHz: Nitidez do som
    - 6.3kHz: Brilho do som
    - 10kHz: Ar do som
    - 16kHz: Cintilação do som

### Exibição Visual
- Gráfico em tempo real mostrando os ajustes do seu som
- Sliders fáceis de usar com controle preciso
- Reinicialização para as configurações padrão com um clique

## 5Band PEQ

Um equalizador paramétrico de nível profissional baseado em princípios científicos, oferecendo cinco bandas totalmente configuráveis com controle preciso de frequência. Perfeito tanto para refinamento sutil do som quanto para processamento corretivo de áudio.

### Guia de Aperfeiçoamento do Som
- Clareza de Vocais e Instrumentos:
  - Use a banda de 3.2kHz com Q moderado (1.0-2.0) para uma presença natural
  - Aplique cortes com Q estreito (4.0-8.0) para remover ressonâncias
  - Adicione um toque suave de "air" com prateleira alta de 10kHz (+2 a +4dB)
- Controle de Qualidade dos Graves:
  - Molde os fundamentos com filtro de pico de 100Hz
  - Remova a ressonância do ambiente usando Q estreito em frequências específicas
  - Crie uma extensão suave dos graves com prateleira baixa
- Ajuste Científico do Som:
  - Direcione frequências específicas com precisão
  - Use analisadores para identificar áreas problemáticas
  - Aplique correções mensuradas com impacto mínimo na fase

### Parâmetros Técnicos
- **Bandas de Precisão**
  - Banda 1: 100Hz (Sub & Bass Control)
  - Banda 2: 316Hz (Definição dos Médios Baixos)
  - Banda 3: 1.0kHz (Presença dos Médios)
  - Banda 4: 3.2kHz (Detalhe dos Médios Superiores)
  - Banda 5: 10kHz (Extensão de Alta Frequência)
- **Controles Profissionais por Banda**
  - Frequência Central: Espaçada logaritmicamente para cobertura ideal
  - Faixa de Ganho: Ajuste preciso de ±18dB
  - Fator Q: De 0.1 a 10.0
  - Múltiplos Tipos de Filtro:
    - Peaking: Ajuste simétrico de frequência
    - Low/High Pass: Inclinação de 12dB/octave
    - Low/High Shelf: Gentle spectral shaping
    - Band Pass: Isolamento focado de frequência
    - Notch: Remoção precisa de frequência
    - AllPass: Alinhamento de frequência com foco em fase

### Exibição Técnica
- Visualização de resposta de frequência em alta resolução
- Pontos de controle interativos com exibição precisa de parâmetros
- Cálculo da função de transferência em tempo real
- Grade calibrada de frequência e ganho
- Leituras numéricas precisas para todos os parâmetros

## Hi Pass Filter

Um filtro passa-alta de precisão que remove frequências baixas indesejadas, preservando a clareza das frequências mais altas. Baseado no design de filtro Linkwitz-Riley para resposta de fase ideal e qualidade de som transparente.

### Guia de Aperfeiçoamento da Audição
- Remova o ruído indesejado:
  - Defina a frequência entre 20-40Hz para eliminar ruídos sub-sônicos
  - Use inclinações mais acentuadas (-24dB/oct ou mais) para graves mais limpos
  - Ideal para gravações em vinil ou performances ao vivo com vibrações de palco
- Limpe músicas com excesso de graves:
  - Defina a frequência entre 60-100Hz para uma resposta de graves mais ajustada
  - Use inclinações moderadas (-12dB/oct a -24dB/oct) para uma transição natural
  - Ajuda a prevenir sobrecarga dos alto-falantes e melhora a clareza
- Crie efeitos especiais:
  - Defina a frequência entre 200-500Hz para um efeito de voz semelhante a telefone
  - Use inclinações acentuadas (-48dB/oct ou mais) para uma filtragem dramática
  - Combine com Lo Pass Filter para efeitos de passa-banda

### Parâmetros
- **Frequency (Hz)** - Controla onde as frequências baixas são filtradas (1Hz a 40000Hz)
  - Valores mais baixos: Apenas as frequências mais baixas são removidas
  - Valores mais altos: Removidas mais frequências baixas
  - Ajuste com base no conteúdo específico de baixa frequência que deseja eliminar
- **Slope** - Controla quão agressivamente as frequências abaixo do corte são reduzidas
  - Off: Nenhum filtro aplicado
  - -12dB/oct: Filtragem suave (LR2 - Linkwitz-Riley de 2ª ordem)
  - -24dB/oct: Filtragem padrão (LR4 - Linkwitz-Riley de 4ª ordem)
  - -36dB/oct: Filtragem mais forte (LR6 - Linkwitz-Riley de 6ª ordem)
  - -48dB/oct: Filtragem muito forte (LR8 - Linkwitz-Riley de 8ª ordem)
  - -60dB/oct a -96dB/oct: Filtragem extremamente acentuada para aplicações especiais

### Exibição Visual
- Gráfico de resposta de frequência em tempo real com escala logarítmica
- Visualização clara da inclinação do filtro e do ponto de corte
- Controles interativos para ajuste preciso
- Grade de frequência com marcadores em pontos de referência chave

## Lo Pass Filter

Um filtro passa-baixa de precisão que remove frequências altas indesejadas, preservando o calor e o corpo das frequências mais baixas. Baseado no design de filtro Linkwitz-Riley para resposta de fase ideal e qualidade de som transparente.

### Guia de Aperfeiçoamento da Audição
- Reduza a aspereza e a sibilância:
  - Defina a frequência entre 8-12kHz para domar gravações ásperas
  - Use inclinações moderadas (-12dB/oct a -24dB/oct) para um som natural
  - Ajuda a reduzir a fadiga auditiva em gravações brilhantes
- Aqueça gravações digitais:
  - Defina a frequência entre 12-16kHz para reduzir o "edge" digital
  - Use inclinações suaves (-12dB/oct) para um efeito sutil de aquecimento
  - Cria um caráter sonoro mais parecido com o analógico
- Crie efeitos especiais:
  - Defina a frequência entre 1-3kHz para um efeito de rádio vintage
  - Use inclinações acentuadas (-48dB/oct ou mais) para uma filtragem dramática
  - Combine com Hi Pass Filter para efeitos de passa-banda
- Controle ruídos e chiados:
  - Defina a frequência logo acima do conteúdo musical (tipicamente 14-18kHz)
  - Use inclinações mais acentuadas (-36dB/oct ou mais) para um controle eficaz do ruído
  - Reduz o chiado de fitas ou ruídos de fundo, preservando a maior parte do conteúdo musical

### Parâmetros
- **Frequency (Hz)** - Controla onde as frequências altas são filtradas (1Hz a 40000Hz)
  - Valores mais baixos: Remove mais frequências altas
  - Valores mais altos: Apenas as frequências mais altas são removidas
  - Ajuste com base no conteúdo específico de alta frequência que deseja eliminar
- **Slope** - Controla quão agressivamente as frequências acima do corte são reduzidas
  - Off: Nenhum filtro aplicado
  - -12dB/oct: Filtragem suave (LR2 - Linkwitz-Riley de 2ª ordem)
  - -24dB/oct: Filtragem padrão (LR4 - Linkwitz-Riley de 4ª ordem)
  - -36dB/oct: Filtragem mais forte (LR6 - Linkwitz-Riley de 6ª ordem)
  - -48dB/oct: Filtragem muito forte (LR8 - Linkwitz-Riley de 8ª ordem)
  - -60dB/oct a -96dB/oct: Filtragem extremamente acentuada para aplicações especiais

### Exibição Visual
- Gráfico de resposta de frequência em tempo real com escala logarítmica
- Visualização clara da inclinação do filtro e do ponto de corte
- Controles interativos para ajuste preciso
- Grade de frequência com marcadores em pontos de referência chave

## Loudness Equalizer

Um equalizador especializado que ajusta automaticamente o equilíbrio de frequência com base no volume de audição. Este plugin compensa a sensibilidade reduzida do ouvido humano para frequências baixas e altas em volumes baixos, garantindo uma experiência de audição consistente e agradável, independentemente do nível de reprodução.

### Guia de Aperfeiçoamento da Audição
- Audição em Baixo Volume:
  - Realça frequências de graves e agudos
  - Mantém o equilíbrio musical em níveis baixos
  - Compensa as características da audição humana
- Processamento Dependente do Volume:
  - Mais realce em volumes mais baixos
  - Redução gradual do processamento à medida que o volume aumenta
  - Som natural em níveis de audição mais altos
- Equilíbrio de Frequência:
  - Prateleira baixa para realce dos graves (100-300Hz)
  - Prateleira alta para realce dos agudos (3-6kHz)
  - Transição suave entre as faixas de frequência

### Parâmetros
- **Average SPL** - Nível de audição atual (60dB a 85dB)
  - Valores mais baixos: Maior realce
  - Valores mais altos: Menor realce
  - Representa o volume típico de audição
- **Controles de Baixa Frequência**
  - Frequency: Centro de realce dos graves (100Hz a 300Hz)
  - Gain: Aumento máximo dos graves (0dB a 15dB)
  - Q: Forma do realce dos graves (0.5 a 1.0)
- **Controles de Alta Frequência**
  - Frequency: Centro de realce dos agudos (3kHz a 6kHz)
  - Gain: Aumento máximo dos agudos (0dB a 15dB)
  - Q: Forma do realce dos agudos (0.5 a 1.0)

### Exibição Visual
- Gráfico de resposta de frequência em tempo real
- Controles interativos de parâmetros
- Visualização de curva dependente do volume
- Leituras numéricas precisas

## Narrow Range

Uma ferramenta que permite focar em partes específicas da música, filtrando frequências indesejadas. Útil para criar efeitos sonoros especiais ou remover sons indesejados.

### Guia de Aperfeiçoamento da Audição
- Crie efeitos sonoros únicos:
  - Efeito de "voz de telefone"
  - Som de "rádio antigo"
  - Efeito "subaquático"
- Foque em instrumentos específicos:
  - Isole as frequências de graves
  - Foque na faixa vocal
  - Destaque instrumentos específicos
- Remova sons indesejados:
  - Reduza o ruído de baixa frequência
  - Corte o chiado excessivo de alta frequência
  - Foque nas partes mais importantes da música

### Parâmetros
- **HPF Frequency** - Controla onde os sons baixos começam a ser reduzidos (20Hz a 1000Hz)
  - Valores mais altos: Remove mais graves
  - Valores mais baixos: Preserva mais graves
  - Comece com valores baixos e ajuste conforme o gosto
- **HPF Slope** - Quão rapidamente os sons baixos são reduzidos (0 a -48 dB/octave)
  - 0dB: Sem redução (off)
  - -6dB a -48dB: Redução progressivamente mais forte em incrementos de 6dB
- **LPF Frequency** - Controla onde os sons altos começam a ser reduzidos (200Hz a 20000Hz)
  - Valores mais baixos: Remove mais agudos
  - Valores mais altos: Preserva mais agudos
  - Comece com valores altos e ajuste para baixo conforme necessário
- **LPF Slope** - Quão rapidamente os sons altos são reduzidos (0 a -48 dB/octave)
  - 0dB: Sem redução (off)
  - -6dB a -48dB: Redução progressivamente mais forte em incrementos de 6dB

### Exibição Visual
- Gráfico claro mostrando a resposta de frequência
- Controles de frequência fáceis de ajustar
- Botões simples para seleção de inclinação

## Tone Control

Um ajustador de som simples de três bandas para personalização rápida e fácil do som. Perfeito para modelar o som de forma básica sem complicações técnicas.

### Guia de Aperfeiçoamento Musical
- Música Clássica:
  - Aumento leve dos agudos para mais detalhes nas cordas
  - Realce suave dos graves para um som orquestral mais completo
  - Médios neutros para um som natural
- Música Rock/Pop:
  - Realce moderado dos graves para mais impacto
  - Redução leve dos médios para um som mais claro
  - Aumento dos agudos para pratos nítidos e detalhes
- Música Jazz:
  - Graves quentes para um som mais encorpado
  - Médios claros para detalhes dos instrumentos
  - Agudos suaves para brilho dos pratos
- Música Eletrônica:
  - Graves fortes para um impacto profundo
  - Médios reduzidos para um som mais limpo
  - Agudos realçados para detalhes nítidos

### Parâmetros
- **Graves** - Controla os sons graves (-24dB a +24dB)
  - Aumente para graves mais potentes
  - Diminua para um som mais leve e limpo
  - Afeta o "peso" da música
- **Médios** - Controla o corpo principal do som (-24dB a +24dB)
  - Aumente para vocais/instrumentos mais proeminentes
  - Diminua para um som mais espaçoso
  - Afeta a "plenitude" da música
- **Agudos** - Controla os sons agudos (-24dB a +24dB)
  - Aumente para mais brilho e detalhes
  - Diminua para um som mais suave e macio
  - Afeta o "brilho" da música

### Exibição Visual
- Gráfico de fácil leitura mostrando seus ajustes
- Sliders simples para cada controle
- Botão de reinicialização rápida
