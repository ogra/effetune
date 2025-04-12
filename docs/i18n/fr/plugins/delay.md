# Plugins Delay

Une collection d'outils pour ajuster la synchronisation de vos signaux audio ou ajouter des répétitions distinctes. Ces plugins vous aident à affiner l'alignement temporel de votre audio, à créer des échos rythmiques ou à ajouter une sensation d'espace et de profondeur à votre expérience d'écoute.

## Liste des Plugins

- [Delay](#delay) - Crée des échos avec contrôle sur le timing, la tonalité et la dispersion stéréo.
- [Modal Resonator](#modal-resonator) - Effet de résonance de fréquence avec jusqu'à 5 résonateurs
- [Time Alignment](#time-alignment) - Ajustements précis du timing pour les canaux audio.

## Delay

Cet effet ajoute des échos distincts à votre audio. Vous pouvez contrôler la vitesse à laquelle les échos se répètent, comment ils s'estompent et comment ils se répartissent entre vos haut-parleurs, vous permettant d'ajouter une profondeur subtile, un intérêt rythmique ou des effets spatiaux créatifs à votre lecture musicale.

### Guide d'Expérience d'Écoute

- **Profondeur et Espace Subtils :**
  - Ajoute une douce sensation d'espace sans délaver le son.
  - Peut donner aux voix ou aux instruments principaux une sensation légèrement plus ample ou plus présente.
  - Utilisez des temps de delay courts et un faible feedback/mix.
- **Amélioration Rythmique :**
  - Crée des échos qui se synchronisent avec le tempo de la musique (réglé manuellement).
  - Ajoute du groove et de l'énergie, en particulier à la musique électronique, aux batteries ou aux guitares.
  - Expérimentez avec différents temps de delay (par exemple, en faisant correspondre les croches ou les noires à l'oreille).
- **Écho Slapback :**
  - Un écho très court et unique, souvent utilisé sur les voix ou les guitares dans le rock et la country.
  - Ajoute un effet percussif de doublage.
  - Utilisez des temps de delay très courts (30-120ms), un feedback nul et un mix modéré.
- **Dispersion Stéréo Créative :**
  - En utilisant le contrôle Ping-Pong, les échos peuvent rebondir entre les haut-parleurs gauche et droit.
  - Crée une image stéréo plus large et plus engageante.
  - Peut rendre le son plus dynamique et intéressant.

### Paramètres

- **Pre-Delay (ms)** - Temps avant que le *premier* écho soit entendu (0 à 100 ms).
  - Valeurs basses (0-20ms) : L'écho commence presque immédiatement.
  - Valeurs hautes (20-100ms) : Crée un écart notable avant l'écho, le séparant du son original.
- **Delay Size (ms)** - Le temps entre chaque écho (1 à 5000 ms).
  - Court (1-100ms) : Crée des effets d'épaississement ou de 'slapback'.
  - Moyen (100-600ms) : Effets d'écho standard, bons pour l'amélioration rythmique.
  - Long (600ms+) : Échos distincts et très espacés.
  - *Astuce :* Essayez de taper en rythme avec la musique pour trouver un temps de delay qui semble rythmique.
- **Damping (%)** - Contrôle à quel point les hautes et basses fréquences s'estompent à chaque écho (0 à 100%).
  - 0% : Les échos conservent leur tonalité d'origine (plus brillants).
  - 50% : Un estompage naturel et équilibré.
  - 100% : Les échos deviennent significativement plus sombres et plus fins rapidement (plus étouffés).
  - À utiliser conjointement avec High/Low Damp.
- **High Damp (Hz)** - Définit la fréquence au-dessus de laquelle les échos commencent à perdre de la brillance (1000 à 20000 Hz).
  - Valeurs basses (par ex., 2000Hz) : Les échos s'assombrissent rapidement.
  - Valeurs hautes (par ex., 10000Hz) : Les échos restent brillants plus longtemps.
  - Ajuster avec Damping pour le contrôle tonal des échos.
- **Low Damp (Hz)** - Définit la fréquence en dessous de laquelle les échos commencent à perdre du corps (20 à 1000 Hz).
  - Valeurs basses (par ex., 50Hz) : Les échos conservent plus de basses.
  - Valeurs hautes (par ex., 500Hz) : Les échos deviennent plus fins rapidement.
  - Ajuster avec Damping pour le contrôle tonal des échos.
- **Feedback (%)** - Combien d'échos vous entendez, ou combien de temps ils durent (0 à 99%).
  - 0% : Un seul écho est entendu.
  - 10-40% : Quelques répétitions notables.
  - 40-70% : Traînées d'échos plus longues et qui s'estompent.
  - 70-99% : Traînées très longues, approchant l'auto-oscillation (à utiliser avec précaution !).
- **Ping-Pong (%)** - Contrôle comment les échos rebondissent entre les canaux stéréo (0 à 100%). (Affecte uniquement la lecture stéréo).
  - 0% : Delay standard - l'écho de l'entrée gauche sur la gauche, celui de la droite sur la droite.
  - 50% : Feedback mono - les échos sont centrés entre les haut-parleurs.
  - 100% : Ping-Pong complet - les échos alternent entre les haut-parleurs gauche et droit.
  - Les valeurs intermédiaires créent des degrés variables de dispersion stéréo.
- **Mix (%)** - Équilibre le volume des échos par rapport au son original (0 à 100%).
  - 0% : Aucun effet.
  - 5-15% : Profondeur ou rythme subtil.
  - 15-30% : Échos clairement audibles (bon point de départ).
  - 30%+ : Effet plus fort et plus prononcé. La valeur par défaut est 16%.

### Paramètres Recommandés pour l'Amélioration de l'Écoute

1.  **Profondeur Subtile Voix/Instrument :**
    - Delay Size: 80-150ms
    - Feedback: 0-15%
    - Mix: 8-16%
    - Ping-Pong: 0% (ou essayez 20-40% pour une légère largeur)
    - Damping: 40-60%
2.  **Amélioration Rythmique (Électronique/Pop) :**
    - Delay Size: Essayez de correspondre au tempo à l'oreille (par ex., 120-500ms)
    - Feedback: 20-40%
    - Mix: 15-25%
    - Ping-Pong: 0% ou 100%
    - Damping: Ajustez selon le goût (plus bas pour des répétitions plus brillantes)
3.  **Slapback Rock Classique (Guitares/Voix) :**
    - Delay Size: 50-120ms
    - Feedback: 0%
    - Mix: 15-30%
    - Ping-Pong: 0%
    - Damping: 20-40%
4.  **Échos Stéréo Larges (Ambient/Pads) :**
    - Delay Size: 300-800ms
    - Feedback: 40-60%
    - Mix: 20-35%
    - Ping-Pong: 70-100%
    - Damping: 50-70% (pour des queues plus douces)

### Guide de Démarrage Rapide

1.  **Régler le Timing :**
    - Commencez avec `Delay Size` pour définir le rythme principal de l'écho.
    - Ajustez `Feedback` pour contrôler le nombre d'échos que vous entendez.
    - Utilisez `Pre-Delay` si vous souhaitez un intervalle avant le premier écho.
2.  **Ajuster la Tonalité :**
    - Utilisez `Damping`, `High Damp` et `Low Damp` ensemble pour façonner le son des échos lorsqu'ils s'estompent. Commencez avec Damping autour de 50% et ajustez les fréquences Damp.
3.  **Position en Stéréo (Optionnel) :**
    - Si vous écoutez en stéréo, expérimentez avec `Ping-Pong` pour contrôler la largeur des échos.
4.  **Mélanger :**
    - Utilisez `Mix` pour équilibrer le volume de l'écho avec la musique originale. Commencez bas (environ 16%) et augmentez jusqu'à ce que l'effet semble correct.

---

## Modal Resonator

Un effet créatif qui ajoute des fréquences résonnantes à votre audio. Ce plugin crée des résonances accordées à des fréquences spécifiques, de manière similaire à la façon dont les objets physiques vibrent à leurs fréquences de résonance naturelles. Il est parfait pour ajouter des caractéristiques tonales uniques, simuler les propriétés résonnantes de différents matériaux ou créer des effets spéciaux.

### Guide d'Expérience d'Écoute

- **Résonance Métallique :**
  - Crée des sons de cloche ou métalliques qui suivent la dynamique du matériel source.
  - Utile pour ajouter du scintillement ou un caractère métallique aux percussions, synthétiseurs ou mixages complets.
  - Utilisez plusieurs résonateurs à des fréquences soigneusement accordées avec des temps de déclin modérés.
- **Amélioration Tonale :**
  - Renforce subtilement des fréquences spécifiques dans la musique.
  - Peut accentuer les harmoniques ou ajouter de la plénitude à des plages de fréquences spécifiques.
  - Utilisez avec de faibles valeurs de mix (10-20%) pour une amélioration subtile.
- **Simulation de Haut-parleur Large Bande :**
  - Simule le comportement modal des haut-parleurs physiques.
  - Recrée les résonances distinctives qui se produisent lorsque les haut-parleurs divisent leurs vibrations à différentes fréquences.
  - Aide à simuler le son caractéristique de types spécifiques de haut-parleurs.
- **Effets Spéciaux :**
  - Crée des qualités timbrales inhabituelles et des textures d'un autre monde.
  - Excellent pour la conception sonore et le traitement expérimental.
  - Essayez des réglages extrêmes pour une transformation sonore créative.

### Paramètres

- **Resonator Selection (1-5)** - Cinq résonateurs indépendants qui peuvent être activés/désactivés et configurés séparément.
  - Utilisez plusieurs résonateurs pour des effets de résonance complexes et superposés.
  - Chaque résonateur peut cibler différentes régions de fréquences.
  - Essayez des relations harmoniques entre les résonateurs pour des résultats plus musicaux.

Pour chaque résonateur :

- **Enable** - Active/désactive le résonateur individuel.
  - Permet l'activation sélective de résonances de fréquences spécifiques.
  - Utile pour les tests A/B de différentes combinaisons de résonateurs.

- **Freq (Hz)** - Définit la fréquence de résonance primaire (20 à 20 000 Hz).
  - Basses fréquences (20-200 Hz) : Ajoute du corps et des résonances fondamentales.
  - Moyennes fréquences (200-2000 Hz) : Ajoute de la présence et du caractère tonal.
  - Hautes fréquences (2000+ Hz) : Crée des qualités de cloche, métalliques.
  - *Astuce :* Pour les applications musicales, essayez d'accorder les résonateurs sur des notes de la gamme musicale ou sur des harmoniques de la fréquence fondamentale.

- **Decay (ms)** - Contrôle la durée pendant laquelle la résonance continue après le son d'entrée (1 à 500 ms).
  - Court (1-50ms) : Résonances rapides et percussives.
  - Moyen (50-200ms) : Résonances au son naturel similaires à de petits objets en métal ou en bois.
  - Long (200-500ms) : Résonances de type cloche, soutenues.
  - *Note :* Les fréquences plus élevées décroissent automatiquement plus rapidement que les fréquences plus basses pour un son naturel.

- **LPF Freq (Hz)** - Filtre passe-bas qui façonne le timbre de la résonance (20 à 20 000 Hz).
  - Valeurs basses : Résonances plus sombres et feutrées.
  - Valeurs hautes : Résonances plus brillantes et présentes.
  - Ajustez pour contrôler le contenu harmonique de la résonance.

- **HPF Freq (Hz)** - Filtre passe-haut qui élimine les basses fréquences indésirables de la résonance (20 à 20 000 Hz).
  - Valeurs basses : Permet le passage de plus de contenu basse fréquence.
  - Valeurs hautes : Affine la résonance en supprimant les fréquences graves.
  - Utilisez en combinaison avec le LPF pour un contrôle précis de la bande de fréquences.
  - Les valeurs par défaut sont fixées à la moitié de la fréquence de chaque résonateur.

- **Gain (dB)** - Contrôle le niveau de sortie individuel de chaque résonateur (-18 à +18 dB).
  - Valeurs négatives : Réduit le niveau de sortie du résonateur.
  - -12 dB : Gain par défaut.
  - Valeurs positives : Augmente le niveau de sortie du résonateur.
  - Utile pour affiner l'équilibre entre différents résonateurs.

- **Mix (%)** - Équilibre le volume des résonances par rapport au son original (0 à 100%).
  - 0% : Aucun effet.
  - 5-25% : Amélioration subtile.
  - 25-50% : Mélange égal des sons originaux et résonnants.
  - 50-100% : Les résonances deviennent plus dominantes que le son original.

### Paramètres Recommandés pour l'Amélioration de l'Écoute

1. **Amélioration Subtile du Haut-parleur :**
   - Activer 2-3 résonateurs
   - Réglages Freq : 400 Hz, 900 Hz, 1600 Hz
   - Decay : 60-100ms
   - LPF Freq : 2000-4000 Hz
   - Mix : 10-20%

2. **Caractère Métallique :**
   - Activer 3-5 résonateurs
   - Réglages Freq : répartis entre 1000-6500 Hz
   - Decay : 100-200ms
   - LPF Freq : 4000-8000 Hz
   - Mix : 15-30%

3. **Amélioration des Basses :**
   - Activer 1-2 résonateurs
   - Réglages Freq : 50-150 Hz
   - Decay : 50-100ms
   - LPF Freq : 1000-2000 Hz
   - Mix : 10-25%

4. **Simulation de Haut-parleur Large Bande :**
   - Activer les 5 résonateurs
   - Réglages Freq : 100 Hz, 400 Hz, 800 Hz, 1600 Hz, 3000 Hz
   - Decay : Progressivement plus court du grave à l'aigu (100ms à 30ms)
   - LPF Freq : Progressivement plus élevé du grave à l'aigu (2000Hz à 4000Hz)
   - Mix : 20-40%

### Guide de Démarrage Rapide

1. **Choisir les Points de Résonance :**
   - Commencez par activer un ou deux résonateurs.
   - Réglez leurs fréquences pour cibler les zones que vous souhaitez améliorer.
   - Pour des effets plus complexes, ajoutez plus de résonateurs avec des fréquences complémentaires.

2. **Ajuster le Caractère :**
   - Utilisez le paramètre `Decay` pour contrôler la durée de maintien des résonances.
   - Façonnez la tonalité avec le contrôle `LPF Freq`.
   - Des temps de déclin plus longs créent des sons plus évidents, de type cloche.

3. **Mélanger avec l'Original :**
   - Utilisez `Mix` pour équilibrer l'effet avec votre matériel source.
   - Commencez avec des valeurs de mix faibles (10-20%) pour une amélioration subtile.
   - Augmentez pour des effets plus spectaculaires.

4. **Affiner :**
   - Effectuez de petits ajustements aux fréquences et aux temps de déclin.
   - Activez/désactivez les résonateurs individuels pour trouver la combinaison parfaite.
   - N'oubliez pas que des changements subtils peuvent avoir un impact significatif sur le son global.

---

## Time Alignment

Un outil de précision qui vous permet d'ajuster la synchronisation des canaux audio avec une précision à la milliseconde. Parfait pour corriger les problèmes de phase ou créer des effets stéréo spécifiques.

### Quand Utiliser
- Corriger l'alignement de phase entre les canaux stéréo
- Compenser les différences de distance des haut-parleurs
- Affiner l'image stéréo
- Corriger les désynchronisations dans les enregistrements

### Paramètres
- **Delay** - Contrôle le temps de delay (0 à 100ms)
  - 0ms : Pas de delay (timing original)
  - Valeurs hautes : Augmentation du delay
  - Ajustements fins pour un contrôle précis
- **Channel** - Sélectionne le canal à retarder
  - All : Affecte les deux canaux
  - Left : Retarde uniquement le canal gauche
  - Right : Retarde uniquement le canal droit

### Utilisations Recommandées

1. Alignement des Haut-parleurs
   - Compenser les différentes distances des haut-parleurs
   - Faire correspondre le timing entre les moniteurs
   - Ajuster à l'acoustique de la pièce

2. Correction d'Enregistrement
   - Corriger les problèmes de phase entre les microphones
   - Aligner plusieurs sources audio
   - Corriger les divergences de timing

3. Effets Créatifs
   - Créer un élargissement stéréo subtil
   - Concevoir des effets spatiaux
   - Expérimenter avec le timing des canaux

Rappelez-vous : L'objectif est d'améliorer votre plaisir d'écoute. Expérimentez avec les commandes pour trouver des sons qui ajoutent de l'intérêt et de la profondeur à votre musique préférée sans la surcharger.
