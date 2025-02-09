# Frieve EffeTune <img src="../../../images/icon.png" alt="EffeTune Icon" width="30" heignt="30" align="bottom">

[Open App](https://frieve-a.github.io/effetune/effetune.html)

Un processeur d'effets audio en temps réel basé sur le web, conçu pour les passionnés d'audio afin d'améliorer leur expérience d'écoute musicale. EffeTune vous permet de traiter n'importe quelle source audio à travers divers effets de haute qualité, vous permettant de personnaliser et de perfectionner votre expérience d'écoute en temps réel.

[![Screenshot](../../../images/screenshot.png)](https://frieve-a.github.io/effetune/effetune.html)

## Concept

EffeTune est créé pour les passionnés d'audio qui souhaitent porter leur expérience d'écoute musicale au niveau supérieur. Que vous écoutiez de la musique en streaming ou sur support physique, EffeTune vous permet d'ajouter des effets de qualité professionnelle pour personnaliser le son selon vos préférences exactes. Transformez votre ordinateur en un puissant processeur d'effets audio qui s'intercale entre votre source audio et vos enceintes ou votre amplificateur.

Pas de mythes audiophiles, juste de la science pure.

## Fonctionnalités

- Traitement audio en temps réel
- Interface glisser-déposer pour construire des chaînes d'effets
- Système de plugins extensible avec effets catégorisés
- Visualisation audio en direct
- Pipeline audio modifiable en temps réel
- Traitement de fichiers audio hors ligne en utilisant la chaîne d'effets actuelle

## Guide d'Installation

Avant d'utiliser EffeTune, vous devrez configurer votre routage audio. Voici comment configurer différentes sources audio :

### Configuration du Service de Streaming

Pour traiter l'audio des services de streaming (Spotify, YouTube Music, etc.) :

1. Prérequis :
   - Installez un périphérique audio virtuel (ex : VB Cable, Voice Meeter, ou ASIO Link Tool)
   - Configurez votre service de streaming pour sortir l'audio vers le périphérique audio virtuel

2. Configuration :
   - Lancez EffeTune
   - Sélectionnez le périphérique audio virtuel comme source d'entrée
   - Commencez à lire de la musique depuis votre service de streaming
   - Vérifiez que l'audio passe à travers EffeTune
   - Ajoutez des effets au Pipeline pour améliorer votre expérience d'écoute

### Configuration de Source Audio Physique

Pour utiliser EffeTune avec des lecteurs CD, lecteurs réseau ou autres sources physiques :

1. Configuration :
   - Connectez votre interface audio à votre ordinateur
   - Lancez EffeTune
   - Sélectionnez votre interface audio comme source d'entrée
   - Configurez la sortie audio de votre navigateur vers votre interface audio
   - Votre interface audio fonctionne maintenant comme un processeur multi-effets :
     * Entrée : Votre lecteur CD, lecteur réseau ou autre source audio
     * Traitement : Effets en temps réel via EffeTune
     * Sortie : Audio traité vers votre amplificateur ou enceintes

## Utilisation

### Construction de Votre Chaîne d'Effets

1. Les plugins disponibles sont listés sur le côté gauche de l'écran
2. Faites glisser les plugins de la liste vers la zone Pipeline d'Effets
3. Les plugins sont traités dans l'ordre de haut en bas
4. Utilisez la poignée (⋮) pour réorganiser les plugins en les faisant glisser
5. Cliquez sur le nom d'un plugin pour développer/réduire ses paramètres
6. Utilisez le bouton ON/OFF pour contourner des effets individuels
7. Supprimez les plugins en utilisant l'icône de corbeille

### Utilisation des Presets

1. Sauvegarder Votre Chaîne d'Effets :
   - Configurez votre chaîne d'effets et paramètres souhaités
   - Entrez un nom dans le champ de preset
   - Cliquez sur le bouton Sauvegarder pour stocker votre preset

2. Charger un Preset :
   - Tapez ou sélectionnez un nom de preset dans la liste déroulante
   - Le preset sera chargé automatiquement
   - Tous les plugins et leurs réglages seront restaurés

3. Supprimer un Preset :
   - Sélectionnez le preset que vous souhaitez supprimer
   - Cliquez sur le bouton Supprimer
   - Confirmez la suppression lorsque demandé

4. Informations sur les Presets :
   - Chaque preset stocke votre configuration complète de chaîne d'effets
   - Inclut l'ordre des plugins, les paramètres et les états

### Sélection de Plugins et Raccourcis Clavier

1. Méthodes de Sélection de Plugins :
   - Cliquez sur les en-têtes de plugins pour sélectionner des plugins individuels
   - Maintenez Ctrl en cliquant pour sélectionner plusieurs plugins
   - Cliquez sur un espace vide dans la zone Pipeline pour désélectionner tous les plugins

2. Raccourcis Clavier :
   - Ctrl + A : Sélectionner tous les plugins dans le Pipeline
   - Ctrl + C : Copier les plugins sélectionnés
   - Ctrl + V : Coller les plugins du presse-papiers
   - ESC : Désélectionner tous les plugins

3. Documentation des Plugins :
   - Cliquez sur le bouton ? sur n'importe quel plugin pour ouvrir sa documentation détaillée dans un nouvel onglet

### Traitement des Fichiers Audio

1. Zone de Dépôt de Fichiers :
    - Une zone dédiée toujours visible sous le Pipeline d'Effets
    - Supporte les fichiers audio uniques ou multiples
    - Les fichiers sont traités avec la configuration actuelle du Pipeline
    - Tout le traitement est effectué au taux d'échantillonnage du Pipeline

2. État du Traitement :
    - La barre de progression affiche l'état actuel du traitement
    - Le temps de traitement dépend de la taille du fichier et de la complexité de la chaîne d'effets

3. Options de Téléchargement :
    - Les fichiers uniques sont téléchargés au format WAV
    - Les fichiers multiples sont automatiquement empaquetés dans un fichier ZIP

### Partage de Chaînes d'Effets

Vous pouvez partager votre configuration de chaîne d'effets avec d'autres utilisateurs :
1. Après avoir configuré votre chaîne d'effets désirée, cliquez sur le bouton "Share" dans le coin supérieur droit de la zone Pipeline d'Effets
2. L'URL sera automatiquement copiée dans votre presse-papiers
3. Partagez l'URL copiée avec d'autres - ils peuvent recréer votre chaîne d'effets exacte en l'ouvrant
4. Tous les paramètres d'effets sont stockés dans l'URL, les rendant faciles à sauvegarder et partager

### Réinitialisation Audio

Si vous rencontrez des problèmes audio (coupures, glitches) :
1. Cliquez sur le bouton "Reset Audio" dans le coin supérieur gauche
2. Le pipeline audio sera reconstruit automatiquement
3. Votre configuration de chaîne d'effets sera préservée

## Combinaisons d'Effets Courantes

Voici quelques combinaisons d'effets populaires pour améliorer votre expérience d'écoute :

### Amélioration Casque
1. Stereo Blend -> RS Reverb
   - Stereo Blend : Ajuste la largeur stéréo pour le confort (90-110%)
   - RS Reverb : Ajoute une ambiance de pièce subtile (mix 10-20%)
   - Résultat : Écoute au casque plus naturelle, moins fatigante

### Simulation Vinyle
1. Wow Flutter -> Noise Blender -> Simple Tube
   - Wow Flutter : Ajoute une variation de hauteur douce
   - Noise Blender : Crée une atmosphère type vinyle
   - Simple Tube : Ajoute de la chaleur analogique
   - Résultat : Expérience authentique de disque vinyle

### Style Radio FM
1. Multiband Compressor -> 5Band PEQ -> Hard Clipping
   - Multiband Compressor : Crée ce son "radio"
   - 5Band PEQ : Améliore la présence et la clarté
   - Hard Clipping : Ajoute une chaleur subtile
   - Résultat : Son type diffusion professionnelle

### Caractère Lo-Fi
1. Bit Crusher -> Simple Jitter -> RS Reverb
   - Bit Crusher : Réduit la profondeur de bits pour un feeling rétro
   - Simple Jitter : Ajoute des imperfections numériques
   - RS Reverb : Crée un espace atmosphérique
   - Résultat : Esthétique lo-fi classique

## Dépannage

### Problèmes Audio
1. Coupures ou Glitches
   - Cliquez sur "Reset Audio" pour reconstruire le pipeline audio
   - Essayez de réduire le nombre d'effets actifs
   - Fermez les autres onglets du navigateur utilisant l'audio

2. Utilisation CPU Élevée
   - Désactivez les effets que vous n'utilisez pas activement
   - Envisagez d'utiliser moins d'effets dans votre chaîne

### Problèmes de Configuration Courants
1. Pas d'Entrée Audio
   - Vérifiez la sélection du périphérique d'entrée dans EffeTune
   - Vérifiez les permissions microphone du navigateur
   - Assurez-vous que l'audio est lu depuis votre source

2. Effet Ne Fonctionne Pas
   - Vérifiez que l'effet est activé (bouton ON/OFF)
   - Vérifiez les paramètres
   - Essayez de supprimer et de rajouter l'effet

3. Problèmes de Partage
   - Utilisez le bouton "Share" pour générer une URL
   - Copiez l'URL entière lors du partage
   - Testez le lien partagé dans une nouvelle fenêtre de navigateur

## FAQ

Q. Cette application supporte-t-elle le son surround ?
R. Actuellement, en raison des limitations du navigateur, nous ne pouvons pas gérer plus de 2 canaux dans le navigateur, et il n'y a pas d'antécédent prouvé de fonctionnement surround. Bien que l'implémentation du plugin elle-même supporte le surround, nous devrons attendre le support futur des navigateurs.

Q. Quelle est la longueur recommandée de chaîne d'effets ?
R. Bien qu'il n'y ait pas de limite stricte, nous recommandons de garder votre chaîne d'effets à 8-10 effets pour des performances optimales. Des chaînes plus complexes peuvent impacter les performances système.

Q. Puis-je sauvegarder mes combinaisons d'effets favorites ?
R. Oui ! Utilisez le bouton "Share" pour générer une URL qui contient toute votre configuration de chaîne d'effets. Mettez cette URL en favori pour sauvegarder vos paramètres.

Q. Comment obtenir la meilleure qualité sonore ?
R. Utilisez un taux d'échantillonnage de 96kHz quand possible, commencez avec des paramètres d'effets subtils, et construisez votre chaîne graduellement. Surveillez les niveaux pour éviter la distorsion.

Q. Cela fonctionnera-t-il avec n'importe quelle source audio ?
R. Oui, EffeTune peut traiter tout audio jouant à travers votre périphérique d'entrée sélectionné, y compris les services de streaming, fichiers locaux et supports physiques.

## Effets Disponibles

| Catégorie | Effet | Description | Documentation |
|-----------|-------|-------------|---------------|
| Analyzer | Level Meter | Affiche le niveau audio avec maintien des crêtes | [Détails](plugins/analyzer.md#level-meter) |
| Analyzer | Oscilloscope | Visualisation de forme d'onde en temps réel | [Détails](plugins/analyzer.md#oscilloscope) |
| Analyzer | Spectrogram | Affiche les changements de spectre de fréquences dans le temps | [Détails](plugins/analyzer.md#spectrogram) |
| Analyzer | Spectrum Analyzer | Analyse spectrale en temps réel | [Détails](plugins/analyzer.md#spectrum-analyzer) |
| Basics | DC Offset | Ajustement du décalage DC | [Détails](plugins/basics.md#dc-offset) |
| Basics | Polarity Inversion | Inversion de polarité du signal | [Détails](plugins/basics.md#polarity-inversion) |
| Basics | Stereo Balance | Contrôle de balance des canaux stéréo | [Détails](plugins/basics.md#stereo-balance) |
| Basics | Volume | Contrôle de volume basique | [Détails](plugins/basics.md#volume) |
| Dynamics | Compressor | Compression de dynamique avec contrôle de seuil, ratio et knee | [Détails](plugins/dynamics.md#compressor) |
| Dynamics | Gate | Gate de bruit avec contrôle de seuil, ratio et knee pour la réduction de bruit | [Détails](plugins/dynamics.md#gate) |
| Dynamics | Multiband Compressor | Processeur de dynamique professionnel 5 bandes avec mise en forme du son style radio FM | [Détails](plugins/dynamics.md#multiband-compressor) |
| EQ | 15Band GEQ | Égaliseur graphique 15 bandes | [Détails](plugins/eq.md#15band-geq) |
| EQ | 5Band PEQ | Égaliseur paramétrique professionnel avec 5 bandes entièrement configurables | [Détails](plugins/eq.md#5band-peq) |
| EQ | Narrow Range | Combinaison de filtres passe-haut et passe-bas | [Détails](plugins/eq.md#narrow-range) |
| EQ | Tone Control | Contrôle de tonalité trois bandes | [Détails](plugins/eq.md#tone-control) |
| Filter | Wow Flutter | Effet de modulation temporelle | [Détails](plugins/filter.md#wow-flutter) |
| Lo-Fi | Bit Crusher | Réduction de profondeur de bits et effet de maintien d'ordre zéro | [Détails](plugins/lofi.md#bit-crusher) |
| Lo-Fi | Noise Blender | Génération et mixage de bruit | [Détails](plugins/lofi.md#noise-blender) |
| Lo-Fi | Simple Jitter | Simulation de jitter numérique | [Détails](plugins/lofi.md#simple-jitter) |
| Reverb | RS Reverb | Réverbération à dispersion aléatoire avec diffusion naturelle | [Détails](plugins/reverb.md#rs-reverb) |
| Saturation | Hard Clipping | Effet d'écrêtage numérique dur | [Détails](plugins/saturation.md#hard-clipping) |
| Saturation | Saturation | Effet de saturation | [Détails](plugins/saturation.md#saturation) |
| Spatial | Multiband Balance | Contrôle de balance stéréo 5 bandes dépendant de la fréquence | [Détails](plugins/spatial.md#multiband-balance) |
| Spatial | Stereo Blend | Effet de contrôle de largeur stéréo | [Détails](plugins/spatial.md#stereo-blend) |
| Others | Oscillator | Générateur de signal audio multi-forme d'onde | [Détails](plugins/others.md#oscillator) |

## Informations Techniques

### Compatibilité Navigateur

Frieve EffeTune a été testé et vérifié pour fonctionner sur Google Chrome. L'application nécessite un navigateur moderne avec support pour :
- Web Audio API
- Audio Worklet
- getUserMedia API
- Drag and Drop API

### Détails de Support Navigateur
1. Chrome/Chromium
   - Entièrement supporté et recommandé
   - Mettez à jour vers la dernière version pour de meilleures performances

2. Firefox/Safari
   - Support limité
   - Certaines fonctionnalités peuvent ne pas fonctionner comme prévu
   - Envisagez d'utiliser Chrome pour la meilleure expérience

### Taux d'Échantillonnage Recommandé

Pour des performances optimales avec les effets non linéaires, il est recommandé d'utiliser EffeTune à un taux d'échantillonnage de 96kHz ou plus. Ce taux d'échantillonnage plus élevé aide à obtenir des caractéristiques idéales lors du traitement audio à travers des effets non linéaires comme la saturation et la compression.

## Développement de Plugins

Vous voulez créer vos propres plugins audio ? Consultez notre [Guide de Développement de Plugins](../../docs/plugin-development.md).

## Historique des Versions

### Version 1.10 (9 février 2025)
- Ajout de la fonctionnalité de traitement de fichiers audio
- Diverses améliorations mineures

### Version 1.00 (8 février 2025)
- Amélioration de l'efficacité du traitement
- Diverses améliorations mineures

### Version 0.50 (7 février 2025)
- Ajout de la fonctionnalité de presets pour sauvegarder et charger les configurations de chaîne d'effets
- Notre documentation d'utilisation est maintenant disponible dans les langues suivantes : 中文 (简体), Español, हिन्दी, العربية, Português, Русский, 日本語, 한국어, et Français
- Diverses améliorations mineures

### Version 0.30 (5 février 2025)
- Amélioration de l'efficacité du traitement
- Ajout de la sélection de plugins et raccourcis clavier (Ctrl+A, Ctrl+C, Ctrl+V)
- Ajout du plugin Oscilloscope pour la visualisation de forme d'onde en temps réel
- Diverses améliorations mineures

### Version 0.10 (3 février 2025)
- Ajout du support des opérations tactiles
- Amélioration de l'efficacité du traitement
- Optimisation des tâches de traitement lourdes
- Réduction des coupures audio
- Diverses améliorations mineures

### Version 0.01 (2 février 2025)
- Version initiale

## Liens

[Source Code](https://github.com/Frieve-A/effetune)

[YouTube](https://www.youtube.com/@frieveamusic)