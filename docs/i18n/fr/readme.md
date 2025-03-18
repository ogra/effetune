# Frieve EffeTune <img src="../../../images/icon_64x64.png" alt="EffeTune Icon" width="30" height="30" align="bottom">

[Open Web App](https://frieve-a.github.io/effetune/effetune.html)  [Download Desktop App](https://github.com/Frieve-A/effetune/releases/)

Un processeur d'effets audio en temps réel, conçu pour les passionnés de musique afin d'améliorer leur expérience d'écoute. EffeTune vous permet de traiter n'importe quelle source audio via divers effets de haute qualité, vous offrant la possibilité de personnaliser et de perfectionner votre expérience d'écoute en temps réel.

[![Screenshot](../../../images/screenshot.png)](https://frieve-a.github.io/effetune/effetune.html)

## Concept

EffeTune a été créé pour les passionnés de musique souhaitant améliorer leur expérience d'écoute. Que vous diffusiez de la musique en streaming ou que vous écoutiez des supports physiques, EffeTune vous permet d'ajouter des effets de qualité professionnelle pour personnaliser le son selon vos préférences exactes. Transformez votre ordinateur en un puissant processeur d'effets audio qui se place entre votre source audio et vos enceintes ou amplificateur.

Aucun mythe audiophile, juste de la science pure.

## Fonctionnalités

- Traitement audio en temps réel
- Interface glisser-déposer pour construire des chaînes d'effets
- Système d'effets extensible avec des effets catégorisés
- Visualisation audio en direct
- Pipeline audio pouvant être modifié en temps réel
- Traitement de fichiers audio hors ligne avec la chaîne d'effets actuelle

## Guide de configuration

Avant d'utiliser EffeTune, vous devez configurer votre routage audio. Voici comment configurer différentes sources audio :

### Configuration du lecteur de fichiers musicaux

- Ouvrez l'application web EffeTune dans votre navigateur, ou lancez l'application de bureau EffeTune
- Ouvrez et lisez un fichier musical pour assurer une lecture correcte
   - Ouvrez un fichier musical et sélectionnez EffeTune comme application (application de bureau uniquement)
   - Ou sélectionnez Ouvrir un fichier musical... depuis le menu Fichier (application de bureau uniquement)
   - Ou faites glisser le fichier musical dans la fenêtre

### Configuration des services de streaming

Pour traiter l'audio des services de streaming (Spotify, YouTube Music, etc.) :

1. Prérequis :
   - Installer un périphérique audio virtuel (par exemple, VB Cable, Voice Meeter ou ASIO Link Tool)
   - Configurer votre service de streaming pour envoyer l'audio vers le périphérique audio virtuel

2. Configuration :
   - Ouvrez l'application web EffeTune dans votre navigateur, ou lancez l'application de bureau EffeTune
   - Sélectionnez le périphérique audio virtuel comme source d'entrée
     - Dans Chrome, la première fois que vous l'ouvrez, une boîte de dialogue apparaît vous demandant de sélectionner et d'autoriser l'entrée audio
     - Dans l'application de bureau, configurez-la en cliquant sur le bouton Config Audio en haut à droite de l'écran
   - Lancez la lecture de la musique depuis votre service de streaming
   - Vérifiez que l'audio circule via EffeTune

### Configuration des sources audio physiques

- Connectez votre interface audio à votre ordinateur
- Ouvrez l'application web EffeTune dans votre navigateur, ou lancez l'application de bureau EffeTune
- Sélectionnez votre interface audio comme source d'entrée et de sortie
   - Dans Chrome, la première fois que vous l'ouvrez, une boîte de dialogue apparaît vous demandant de sélectionner et d'autoriser l'entrée audio
   - Dans l'application de bureau, configurez-la en cliquant sur le bouton Config Audio en haut à droite de l'écran
- Votre interface audio fonctionne désormais comme un processeur multi-effets :
   * Entrée : Votre lecteur CD, lecteur réseau ou autre source audio
   * Traitement : Effets en temps réel via EffeTune
   * Sortie : Audio traité vers votre amplificateur ou vos enceintes

## Utilisation

### Construction de votre chaîne d'effets

1. Les effets disponibles sont listés sur le côté gauche de l'écran
   - Utilisez le bouton de recherche à côté de "Available Effects" pour filtrer les effets
   - Tapez n'importe quel texte pour trouver des effets par nom ou catégorie
   - Appuyez sur ESC pour effacer la recherche
2. Glissez-déposez les effets de la liste vers la zone de l'Effect Pipeline
3. Les effets sont traités dans l'ordre du haut vers le bas
4. Utilisez la poignée (⋮) pour réorganiser les effets par glisser-déposer
5. Cliquez sur le nom d'un effet pour développer/réduire ses paramètres
6. Utilisez le bouton ON pour contourner les effets individuels
7. Cliquez sur le bouton ? pour ouvrir sa documentation détaillée dans un nouvel onglet
8. Supprimez les effets en utilisant l'icône de la poubelle

### Utilisation des préréglages

1. Enregistrez votre chaîne d'effets :
   - Configurez la chaîne d'effets et les paramètres souhaités
   - Entrez un nom pour votre préréglage dans le champ de saisie
   - Cliquez sur le bouton save pour enregistrer votre préréglage

2. Charger un préréglage :
   - Tapez ou sélectionnez un nom de préréglage dans la liste déroulante
   - Le préréglage sera chargé automatiquement
   - Tous les effets et leurs paramètres seront restaurés

3. Supprimer un préréglage :
   - Sélectionnez le préréglage que vous souhaitez supprimer
   - Cliquez sur le bouton delete
   - Confirmez la suppression lorsqu'on vous le demande

4. Informations sur le préréglage :
   - Chaque préréglage stocke la configuration complète de votre chaîne d'effets
   - Inclut l'ordre des effets, les paramètres et les états

### Sélection d'effets et raccourcis clavier

1. Méthodes de sélection des effets :
   - Cliquez sur les en-têtes d'effet pour sélectionner des effets individuels
   - Maintenez Ctrl en cliquant pour sélectionner plusieurs effets
   - Cliquez sur un espace vide dans la zone Pipeline pour désélectionner tous les effets

2. Raccourcis clavier :
   - Ctrl + Z: Annuler
   - Ctrl + Y: Rétablir
   - Ctrl + S: Enregistrer le pipeline actuel
   - Ctrl + Shift + S: Enregistrer le pipeline actuel sous
   - Ctrl + X: Couper les effets sélectionnés
   - Ctrl + C: Copier les effets sélectionnés
   - Ctrl + V: Coller les effets depuis le presse-papiers
   - Ctrl + F: Rechercher des effets
   - Ctrl + A: Sélectionner tous les effets du pipeline
   - Delete: Supprimer les effets sélectionnés
   - ESC: Désélectionner tous les effets

3. Raccourcis clavier (application de bureau uniquement) :
   - Space: Lecture/Pause
   - Ctrl + → ou N: Piste suivante
   - Ctrl + ← ou P: Piste précédente
   - Shift + → ou F ou .: Avance rapide de 10 secondes
   - Shift + ← ou B ou ,: Retour en arrière de 10 secondes

### Traitement des fichiers audio

1. Zone de dépôt ou de spécification de fichiers :
   - Une zone de dépôt dédiée est toujours visible sous l'Effect Pipeline
   - Prend en charge un ou plusieurs fichiers audio
   - Les fichiers sont traités en utilisant les paramètres actuels de la Pipeline
   - Tout le traitement est effectué à la fréquence d'échantillonnage de la Pipeline

2. État du traitement :
   - La barre de progression affiche l'état actuel du traitement
   - Le temps de traitement dépend de la taille du fichier et de la complexité de la chaîne d'effets

3. Options de téléchargement :
   - Les fichiers individuels sont téléchargés au format WAV
   - Plusieurs fichiers sont automatiquement regroupés dans une archive ZIP

### Partage de chaînes d'effets

Vous pouvez partager la configuration de votre chaîne d'effets avec d'autres utilisateurs :
1. Après avoir configuré la chaîne d'effets souhaitée, cliquez sur le bouton "Share" dans le coin supérieur droit de la zone Effect Pipeline
2. L'URL sera automatiquement copiée dans votre presse-papiers
3. Partagez l'URL copiée avec d'autres - ils pourront recréer exactement votre chaîne d'effets en l'ouvrant
4. Dans l'application web, tous les paramètres des effets sont stockés dans l'URL, ce qui les rend faciles à sauvegarder et à partager
5. Dans la version application de bureau, exportez les paramètres vers un fichier effetune_preset depuis le menu Fichier
6. Partagez le fichier effetune_preset exporté. Le fichier effetune_preset peut également être chargé en le faisant glisser dans la fenêtre de l'application web

### Réinitialisation audio

Si vous rencontrez des problèmes audio (coupures, interférences) :
1. Dans l'application web, cliquez sur le bouton "Reset Audio" dans le coin supérieur gauche, ou dans l'application de bureau, sélectionnez Reload dans le menu View
2. La pipeline audio sera reconstruite automatiquement
3. La configuration de votre chaîne d'effets sera préservée

## Combinaisons d'effets courantes

Voici quelques combinaisons d'effets populaires pour améliorer votre expérience d'écoute :

### Amélioration pour écouteurs
1. Stereo Blend -> RS Reverb
   - Stereo Blend : Ajuste la largeur stéréo pour le confort (60-100%)
   - RS Reverb : Ajoute une ambiance de pièce subtile (mélange 10-20%)
   - Résultat : Une écoute au casque plus naturelle et moins fatigante

### Simulation vinyle
1. Wow Flutter -> Noise Blender -> Saturation
   - Wow Flutter : Ajoute une légère variation de hauteur
   - Noise Blender : Crée une ambiance similaire à celle du vinyle
   - Saturation : Ajoute une chaleur analogique
   - Résultat : Une expérience authentique de disque vinyle

### Style radio FM
1. Multiband Compressor -> Stereo Blend
   - Multiband Compressor : Crée ce son "radio"
   - Stereo Blend : Ajuste la largeur stéréo pour le confort (100-150%)
   - Résultat : Un son de diffusion professionnelle

### Caractère Lo-Fi
1. Bit Crusher -> Simple Jitter -> RS Reverb
   - Bit Crusher : Réduit la profondeur de bits pour une sensation rétro
   - Simple Jitter : Ajoute des imperfections numériques
   - RS Reverb : Crée un espace atmosphérique
   - Résultat : Une esthétique lo-fi classique

## Dépannage

### Problèmes audio
1. Coupures ou interférences
   - Dans l'application web, cliquez sur le bouton "Reset Audio", ou dans l'application de bureau, sélectionnez Reload dans le menu View pour reconstruire la pipeline audio
   - Essayez de réduire le nombre d'effets actifs
   - Fermez les autres onglets du navigateur utilisant l'audio

2. Utilisation élevée du CPU
   - Désactivez les effets que vous n'utilisez pas activement
   - Envisagez d'utiliser moins d'effets dans votre chaîne

3. Écho se produit
   - Il est probable que vos entrées et sorties audio ne soient pas configurées correctement
   - Pour traiter la sortie audio du navigateur, envisagez d'installer un navigateur dédié exclusivement à EffeTune, ou utilisez l'application de bureau au lieu de l'application web

### Problèmes de configuration courants
1. Pas d'entrée audio
   - Vérifiez qu'une source audio est en cours de lecture et qu'elle est dirigée vers un périphérique audio virtuel
   - Pour la version application web, assurez-vous que les autorisations d'entrée audio sont accordées dans votre navigateur et que le périphérique audio virtuel est sélectionné comme périphérique d'entrée
   - Pour la version application de bureau, allez dans Config Audio dans le coin supérieur droit de l'écran et assurez-vous que le périphérique audio virtuel est sélectionné comme périphérique d'entrée

2. Effet ne fonctionne pas
   - Vérifiez que l'effet est activé (bouton ON/OFF)
   - Vérifiez les paramètres

3. Pas de sortie audio
   - Pour la version application web, assurez-vous que la sortie audio du système d'exploitation est définie comme périphérique de sortie
   - Pour la version application de bureau, allez dans "Config Audio" dans le coin supérieur droit de l'écran et assurez-vous que le périphérique de sortie correct est sélectionné

## FAQ

**Q. Cette application prend-elle en charge le son surround ?**  
**R.** Actuellement, en raison des limitations du navigateur, nous ne pouvons pas gérer plus de 2 canaux dans le navigateur, et il n'existe aucune preuve concrète de la prise en charge du son surround. Bien que l'implémentation des effets supporte le son surround, il faudra attendre une prise en charge future par les navigateurs.

**Q. Quelle est la longueur recommandée pour la chaîne d'effets ?**
**R.** Bien qu'il n'y ait pas de limite stricte, nous recommandons de limiter votre chaîne d'effets à 8-10 effets pour des performances optimales. Des chaînes plus complexes peuvent impacter les performances du système.

**Q. Comment obtenir la meilleure qualité sonore ?**
**R.** Utilisez des fréquences d'échantillonnage de 96 kHz ou plus lorsque c'est possible, commencez par des réglages d'effets subtils et construisez votre chaîne progressivement. Surveillez les niveaux pour éviter la distorsion.

**Q. Cela fonctionnera-t-il avec n'importe quelle source audio ?**  
**R.** Oui, EffeTune peut traiter tout audio provenant du périphérique d'entrée sélectionné, y compris les services de streaming, les fichiers locaux et les supports physiques.

## Effets disponibles

| Catégorie | Effet | Description | Documentation |
|-----------|-------|-------------|---------------|
| Analyzer  | Level Meter | Affiche le niveau audio avec maintien du pic | [Détails](plugins/analyzer.md#level-meter) |
| Analyzer  | Oscilloscope | Visualisation de la forme d'onde en temps réel | [Détails](plugins/analyzer.md#oscilloscope) |
| Analyzer  | Spectrogram | Affiche les variations du spectre de fréquences au fil du temps | [Détails](plugins/analyzer.md#spectrogram) |
| Analyzer  | Spectrum Analyzer | Analyse le spectre en temps réel | [Détails](plugins/analyzer.md#spectrum-analyzer) |
| Analyzer  | Stereo Meter | Visualise l'équilibre stéréo et le mouvement du son | [Détails](plugins/analyzer.md#stereo-meter) |
| Basics    | DC Offset | Réglage du décalage DC | [Détails](plugins/basics.md#dc-offset) |
| Basics    | Polarity Inversion | Inversion de la polarité du signal | [Détails](plugins/basics.md#polarity-inversion) |
| Basics    | Stereo Balance | Contrôle de l'équilibre des canaux stéréo | [Détails](plugins/basics.md#stereo-balance) |
| Basics    | Volume | Contrôle de volume basique | [Détails](plugins/basics.md#volume) |
| Delay     | Time Alignment | Ajustements précis de la synchronisation des canaux audio | [Détails](plugins/delay.md#time-alignment) |
| Dynamics  | Auto Leveler | Ajustement automatique du volume basé sur la mesure LUFS pour une expérience d'écoute cohérente | [Détails](plugins/dynamics.md#auto-leveler) |
| Dynamics  | Brickwall Limiter | Contrôle transparent des crêtes pour une écoute sûre et confortable | [Détails](plugins/dynamics.md#brickwall-limiter) |
| Dynamics  | Compressor | Compression de la plage dynamique avec contrôle du seuil, du ratio et du knee | [Détails](plugins/dynamics.md#compressor) |
| Dynamics  | Gate | Noise gate avec contrôle du seuil, du ratio et du knee pour la réduction du bruit | [Détails](plugins/dynamics.md#gate) |
| Dynamics  | Multiband Compressor | Processeur dynamique professionnel à 5 bandes avec modulation sonore de type radio FM | [Détails](plugins/dynamics.md#multiband-compressor) |
| EQ        | 15Band GEQ | Égaliseur graphique 15 bandes | [Détails](plugins/eq.md#15band-geq) |
| EQ        | 5Band PEQ | Égaliseur paramétrique professionnel avec 5 bandes entièrement configurables | [Détails](plugins/eq.md#5band-peq) |
| EQ        | Loudness Equalizer | Correction de l'équilibre fréquentiel pour une écoute à faible volume | [Détails](plugins/eq.md#loudness-equalizer) |
| EQ        | Narrow Range | Combinaison de filtres passe-haut et passe-bas | [Détails](plugins/eq.md#narrow-range) |
| EQ        | Tone Control | Contrôle de tonalité à trois bandes | [Détails](plugins/eq.md#tone-control) |
| Filter    | Wow Flutter | Effet de modulation basé sur le temps | [Détails](plugins/filter.md#wow-flutter) |
| Lo-Fi     | Bit Crusher | Réduction de la profondeur de bits et effet de maintien zéro | [Détails](plugins/lofi.md#bit-crusher) |
| Lo-Fi     | Noise Blender | Génération et mélange de bruit | [Détails](plugins/lofi.md#noise-blender) |
| Lo-Fi     | Simple Jitter | Simulation de jitter numérique | [Détails](plugins/lofi.md#simple-jitter) |
| Reverb    | RS Reverb | Réverbération à diffusion aléatoire avec diffusion naturelle | [Détails](plugins/reverb.md#rs-reverb) |
| Saturation| Hard Clipping | Effet de hard clipping numérique | [Détails](plugins/saturation.md#hard-clipping) |
| Saturation| Multiband Saturation | Effet de saturation 3 bandes pour une chaleur précise basée sur les fréquences | [Détails](plugins/saturation.md#multiband-saturation) |
| Saturation| Saturation | Effet de saturation | [Détails](plugins/saturation.md#saturation) |
| Saturation| Sub Synth | Mélange des signaux sous-harmoniques pour améliorer les basses | [Détails](plugins/saturation.md#sub-synth) |
| Spatial   | Multiband Balance | Contrôle de l'équilibre stéréo dépendant des fréquences en 5 bandes | [Détails](plugins/spatial.md#multiband-balance) |
| Spatial   | Stereo Blend | Effet de contrôle de la largeur stéréo | [Détails](plugins/spatial.md#stereo-blend) |
| Others    | Oscillator | Générateur de signal audio multi-forme d'onde | [Détails](plugins/others.md#oscillator) |

## Informations techniques

### Compatibilité des navigateurs

Frieve EffeTune a été testé et vérifié pour fonctionner sur Google Chrome. L'application nécessite un navigateur moderne avec le support de :
- Web Audio API
- Audio Worklet
- getUserMedia API
- Drag and Drop API

### Détails de la compatibilité des navigateurs
1. **Chrome/Chromium**
   - Entièrement supporté et recommandé
   - Mettez à jour vers la dernière version pour des performances optimales

2. **Firefox/Safari**
   - Support limité
   - Certaines fonctionnalités peuvent ne pas fonctionner comme prévu
   - Envisagez d'utiliser Chrome pour une meilleure expérience

### Fréquence d'échantillonnage recommandée

Pour des performances optimales avec des effets non linéaires, il est recommandé d'utiliser EffeTune à une fréquence d'échantillonnage de 96 kHz ou plus. Cette fréquence d'échantillonnage élevée permet d'obtenir des caractéristiques idéales lors du traitement de l'audio via des effets non linéaires tels que la saturation et la compression.

## Guide de développement

Vous souhaitez créer vos propres plugins audio ? Consultez notre [Guide de développement de plugins](../../plugin-development.md).
Vous souhaitez créer une application de bureau ? Consultez notre [Guide de construction](../../build.md).

## Liens

[Historique des versions](../../version-history.md)

[Source Code](https://github.com/Frieve-A/effetune)

[YouTube](https://www.youtube.com/@frieveamusic)
