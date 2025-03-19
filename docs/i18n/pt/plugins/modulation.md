# Modulation Plugins

Uma coleção de plugins que adicionam movimento e variação à sua música por meio de efeitos de modulação. Esses efeitos podem fazer sua música digital parecer mais orgânica e dinâmica, aprimorando sua experiência auditiva com variações sutis ou dramáticas no som.

## Lista de Plugins

- [Tremolo](#tremolo) - Cria variações rítmicas de volume para um som pulsante e dinâmico
- [Wow Flutter](#wow-flutter) - Recria as suaves variações de pitch dos discos de vinil e dos tocadores de fita

## Tremolo

Um efeito que adiciona variações rítmicas de volume à sua música, semelhante ao som pulsante encontrado em amplificadores vintage e gravações clássicas. Isso cria uma qualidade dinâmica e expressiva que adiciona movimento e interesse à sua experiência auditiva.

### Guia de Experiência Auditiva
- Experiência com Amplificador Clássico:
  - Recria o icônico som pulsante dos amplificadores valvulados vintage
  - Adiciona movimento rítmico a gravações estáticas
  - Cria uma experiência auditiva hipnótica e envolvente
- Caráter de Gravação Vintage:
  - Simula os efeitos naturais de tremolo usados em gravações clássicas
  - Adiciona caráter vintage e calor
  - Perfeito para ouvir jazz, blues e rock
- Atmosfera Criativa:
  - Cria aumentos e reduções dramáticas
  - Adiciona intensidade emocional à música
  - Perfeito para ouvir música ambiente e atmosférica

### Parâmetros
- **Rate** - Quão rápido o volume muda (0.1 a 20 Hz)
  - Mais lento (0.1-2 Hz): Pulsação suave e sutil
  - Médio (2-6 Hz): Efeito tremolo clássico
  - Mais rápido (6-20 Hz): Efeitos dramáticos e entrecortados
- **Depth** - Quanto o volume varia (0 a 12 dB)
  - Sutil (0-3 dB): Variações gentis de volume
  - Médio (3-6 dB): Efeito de pulsação notável
  - Forte (6-12 dB): Incréscimos dramáticos de volume
- **Ch Phase** - Diferença de fase entre os canais estéreo (-180 a 180 graus)
  - 0°: Ambos os canais pulsam juntos (tremolo mono)
  - 90° ou -90°: Cria um efeito giratório e de redemoinho
  - 180° ou -180°: Os canais pulsam em direções opostas (largura estéreo máxima)
- **Randomness** - Quão irregulares se tornam as variações de volume (0 a 96 dB)
  - Baixo: Pulsação mais previsível e regular
  - Médio: Variação vintage natural
  - Alto: Som mais instável e orgânico
- **Randomness Cutoff** - Quão rápidas são as mudanças aleatórias (1 a 1000 Hz)
  - Menor: Variações aleatórias mais lentas e suaves
  - Maior: Mudanças mais rápidas e erráticas
- **Ch Sync** - Quão sincronizada está a aleatoriedade entre os canais (0 a 100%)
  - 0%: Cada canal possui aleatoriedade independente
  - 50%: Sincronização parcial entre os canais
  - 100%: Ambos os canais compartilham o mesmo padrão de aleatoriedade

### Configurações Recomendadas para Diferentes Estilos

1. Tremolo de Amplificador Clássico de Guitarra
   - Rate: 4-6 Hz (velocidade média)
   - Depth: 6-8 dB
   - Ch Phase: 0° (mono)
   - Randomness: 0-5 dB
   - Perfeito para: Blues, Rock, Surf Music

2. Efeito Psicodélico Stereo
   - Rate: 2-4 Hz
   - Depth: 4-6 dB
   - Ch Phase: 180° (canais opostos)
   - Randomness: 10-20 dB
   - Perfeito para: Psychedelic Rock, Eletrônica, Experimental

3. Realce Sutil
   - Rate: 1-2 Hz
   - Depth: 2-3 dB
   - Ch Phase: 0-45°
   - Randomness: 5-10 dB
   - Perfeito para: Qualquer música que precise de um movimento suave

4. Pulsação Dramática
   - Rate: 8-12 Hz
   - Depth: 8-12 dB
   - Ch Phase: 90°
   - Randomness: 20-30 dB
   - Perfeito para: Eletrônica, Dance, Ambient

### Guia de Início Rápido

1. Para um Som de Tremolo Clássico:
   - Comece com Rate médio (4-5 Hz)
   - Adicione Depth moderado (6 dB)
   - Configure Ch Phase para 0° para mono ou 90° para movimento estéreo
   - Mantenha Randomness baixo (0-5 dB)
   - Ajuste conforme o gosto

2. Para Mais Caráter:
   - Aumente Randomness gradualmente
   - Experimente diferentes configurações de Ch Phase
   - Teste diferentes combinações de Rate e Depth
   - Confie no seu ouvido

## Wow Flutter

Um efeito que adiciona sutis variações de pitch à sua música, semelhante ao som de oscilação natural que você pode lembrar dos discos de vinil ou fitas cassete. Isso cria uma sensação calorosa e nostálgica que muitas pessoas consideram agradável e relaxante.

### Guia de Experiência Auditiva
- Experiência com Disco de Vinil:
  - Recria a oscilação suave dos toca-discos
  - Adiciona movimento orgânico ao som
  - Cria uma atmosfera aconchegante e nostálgica
- Memória de Fita Cassete:
  - Simula o flutter característico dos tocadores de fita
  - Adiciona o caráter vintage dos tocadores de fita
  - Perfeito para vibes lo-fi e retrô
- Atmosfera Criativa:
  - Cria efeitos oníricos, semelhantes a debaixo d'água
  - Adiciona movimento e vida a sons estáticos
  - Perfeito para ouvir ambient e experimental

### Parâmetros
- **Rate** - Quão rápido o som oscila (0.1 a 20 Hz)
  - Mais lento (0.1-2 Hz): Movimento semelhante a de um disco de vinil
  - Médio (2-6 Hz): Flutter semelhante ao de uma fita cassete
  - Mais rápido (6-20 Hz): Efeitos criativos
- **Depth** - Quanto o pitch varia (0 a 40 ms)
  - Sutil (0-10 ms): Caráter vintage suave
  - Médio (10-20 ms): Sensação clássica de fita/disco
  - Forte (20-40 ms): Efeitos dramáticos
- **Ch Phase** - Diferença de fase entre canais estéreo (-180 a 180 graus)
  - 0°: Ambos os canais oscilam juntos
  - 90° ou -90°: Cria um efeito giratório e de redemoinho
  - 180° ou -180°: Os canais oscilam em direções opostas
- **Randomness** - Quão irregular se torna a oscilação (0 a 40 ms)
  - Baixo: Movimento mais previsível e regular
  - Médio: Variação vintage natural
  - Alto: Som mais instável, como de equipamento desgastado
- **Randomness Cutoff** - Quão rápidas são as mudanças aleatórias (0.1 a 20 Hz)
  - Menor: Mudanças mais lentas e suaves
  - Maior: Mudanças mais rápidas e erráticas
- **Ch Sync** - Quão sincronizada está a aleatoriedade entre os canais (0 a 100%)
  - 0%: Cada canal possui aleatoriedade independente
  - 50%: Sincronização parcial entre os canais
  - 100%: Ambos os canais compartilham o mesmo padrão de aleatoriedade

### Configurações Recomendadas para Diferentes Estilos

1. Experiência Clássica de Vinil
   - Rate: 0.5-1 Hz (movimento lento e suave)
   - Depth: 15-20 ms
   - Randomness: 10-15 ms
   - Ch Phase: 0°
   - Ch Sync: 100%
   - Perfeito para: Jazz, Música Clássica, Vintage Rock

2. Sensação de Cassete Retrô
   - Rate: 4-5 Hz (flutter mais rápido)
   - Depth: 10-15 ms
   - Randomness: 15-20 ms
   - Ch Phase: 0-45°
   - Ch Sync: 80-100%
   - Perfeito para: Lo-Fi, Pop, Rock

3. Atmosfera Onírica
   - Rate: 1-2 Hz
   - Depth: 25-30 ms
   - Randomness: 20-25 ms
   - Ch Phase: 90-180°
   - Ch Sync: 50-70%
   - Perfeito para: Ambient, Eletrônica, Experimental

4. Realce Sutil
   - Rate: 2-3 Hz
   - Depth: 5-10 ms
   - Randomness: 5-10 ms
   - Ch Phase: 0°
   - Ch Sync: 100%
   - Perfeito para: Qualquer música que precise de um caráter vintage suave

### Guia de Início Rápido

1. Para um Som Vintage Natural:
   - Comece com Rate lento (1 Hz)
   - Adicione Depth moderado (15 ms)
   - Inclua um pouco de Randomness (10 ms)
   - Mantenha Ch Phase em 0° e Ch Sync em 100%
   - Ajuste conforme o gosto

2. Para Mais Caráter:
   - Aumente Depth gradualmente
   - Adicione mais Randomness
   - Experimente diferentes configurações de Ch Phase
   - Reduza Ch Sync para mais variação estéreo
   - Confie no seu ouvido

Lembre-se: O objetivo é adicionar um agradável caráter vintage à sua música. Comece de forma sutil e ajuste até encontrar o ponto ideal que aprimora sua experiência auditiva!
