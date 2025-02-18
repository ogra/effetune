# Equalizer Plugins

Une collection de plugins qui vous permettent d'ajuster différents aspects du son de votre musique, des basses profondes aux aigus cristallins. Ces outils vous aident à personnaliser votre expérience d'écoute en améliorant ou en réduisant des éléments sonores spécifiques.

## Plugin List

- [15Band GEQ](#15band-geq) - Ajustement détaillé du son avec 15 contrôles précis
- [5Band PEQ](#5band-peq) - Égaliseur paramétrique professionnel avec contrôles flexibles
- [Loudness Equalizer](#loudness-equalizer) - Correction de la balance des fréquences pour l'écoute à faible volume
- [Tone Control](#tone-control) - Ajustement simple des basses, médiums et aigus
- [Narrow Range](#narrow-range) - Concentration sur des parties spécifiques du son

## 15Band GEQ

Un outil d'ajustement sonore détaillé avec 15 contrôles distincts, chacun affectant une partie spécifique du spectre sonore. Parfait pour affiner votre musique exactement comme vous l'aimez.

### Guide d'Amélioration de l'Écoute
- Région des Basses (25Hz-160Hz) :
  - Améliorez la puissance des grosses caisses et des basses profondes
  - Ajustez la plénitude des instruments de basse
  - Contrôlez les sub-bass qui font vibrer la pièce
- Bas-médiums (250Hz-630Hz) :
  - Ajustez la chaleur de la musique
  - Contrôlez la plénitude du son global
  - Réduisez ou améliorez l'"épaisseur" du son
- Hauts-médiums (1kHz-2.5kHz) :
  - Rendez les voix plus claires et présentes
  - Ajustez la proéminence des instruments principaux
  - Contrôlez la sensation de "proximité" du son
- Hautes Fréquences (4kHz-16kHz) :
  - Améliorez la netteté et le détail
  - Contrôlez le "brillant" et l'"air" dans la musique
  - Ajustez la luminosité globale

### Parameters
- **Band Gains** - Contrôles individuels pour chaque plage de fréquences (-12dB à +12dB)
  - Basses Profondes
    - 25Hz : Sensation de basse la plus profonde
    - 40Hz : Impact des basses profondes
    - 63Hz : Puissance des basses
    - 100Hz : Plénitude des basses
    - 160Hz : Hautes basses
  - Sons Graves
    - 250Hz : Chaleur du son
    - 400Hz : Plénitude du son
    - 630Hz : Corps du son
  - Sons Médiums
    - 1kHz : Présence sonore principale
    - 1.6kHz : Clarté du son
    - 2.5kHz : Détail du son
  - Sons Aigus
    - 4kHz : Netteté du son
    - 6.3kHz : Brillance du son
    - 10kHz : Air du son
    - 16kHz : Éclat du son

### Affichage Visuel
- Graphique en temps réel montrant vos ajustements sonores
- Curseurs faciles à utiliser avec contrôle précis
- Réinitialisation en un clic aux paramètres par défaut

## Loudness Equalizer

Un égaliseur spécialisé qui ajuste automatiquement la balance des fréquences en fonction de votre volume d'écoute. Ce plugin compense la sensibilité réduite de l'oreille humaine aux basses et hautes fréquences à faible volume, assurant une expérience d'écoute cohérente et agréable quel que soit le niveau de lecture.

### Guide d'Amélioration de l'Écoute
- Écoute à Faible Volume :
  - Amélioration des basses et hautes fréquences
  - Maintien de l'équilibre musical à des niveaux silencieux
  - Compensation des caractéristiques de l'audition humaine
- Traitement Dépendant du Volume :
  - Plus d'amélioration à faible volume
  - Réduction progressive du traitement avec l'augmentation du volume
  - Son naturel à des niveaux d'écoute plus élevés
- Balance des Fréquences :
  - Filtre en plateau bas pour l'amélioration des basses (100-300Hz)
  - Filtre en plateau haut pour l'amélioration des aigus (3-6kHz)
  - Transition douce entre les plages de fréquences

### Paramètres
- **Average SPL** - Niveau d'écoute actuel (60dB à 85dB)
  - Valeurs plus basses : Plus d'amélioration
  - Valeurs plus hautes : Moins d'amélioration
  - Représente le volume d'écoute typique
- **Contrôles Basses Fréquences**
  - Fréquence : Centre d'amélioration des basses (100Hz à 300Hz)
  - Gain : Boost maximum des basses (0dB à 15dB)
  - Q : Forme de l'amélioration des basses (0.5 à 1.0)
- **Contrôles Hautes Fréquences**
  - Fréquence : Centre d'amélioration des aigus (3kHz à 6kHz)
  - Gain : Boost maximum des aigus (0dB à 15dB)
  - Q : Forme de l'amélioration des aigus (0.5 à 1.0)

### Affichage Visuel
- Graphique de réponse en fréquence en temps réel
- Contrôles de paramètres interactifs
- Visualisation de courbe dépendante du volume
- Lectures numériques précises

## Tone Control

Un ajusteur de son à trois bandes simple pour une personnalisation sonore rapide et facile. Parfait pour une mise en forme basique du son sans devenir trop technique.

### Guide d'Amélioration Musicale
- Musique Classique :
  - Léger boost des aigus pour plus de détail dans les cordes
  - Boost doux des basses pour un son d'orchestre plus plein
  - Médiums neutres pour un son naturel
- Musique Rock/Pop :
  - Boost modéré des basses pour plus d'impact
  - Légère réduction des médiums pour un son plus clair
  - Boost des aigus pour des cymbales et détails nets
- Musique Jazz :
  - Basses chaleureuses pour un son plus plein
  - Médiums clairs pour le détail des instruments
  - Aigus doux pour l'éclat des cymbales
- Musique Électronique :
  - Basses fortes pour un impact profond
  - Médiums réduits pour un son plus propre
  - Aigus améliorés pour des détails nets

### Parameters
- **Bass** - Contrôle les sons graves (-24dB à +24dB)
  - Augmentez pour des basses plus puissantes
  - Diminuez pour un son plus léger et propre
  - Affecte le "poids" de la musique
- **Mid** - Contrôle le corps principal du son (-24dB à +24dB)
  - Augmentez pour des voix/instruments plus présents
  - Diminuez pour un son plus spacieux
  - Affecte la "plénitude" de la musique
- **Treble** - Contrôle les sons aigus (-24dB à +24dB)
  - Augmentez pour plus d'éclat et de détail
  - Diminuez pour un son plus doux et lisse
  - Affecte la "brillance" de la musique

### Affichage Visuel
- Graphique facile à lire montrant vos ajustements
- Curseurs simples pour chaque contrôle
- Bouton de réinitialisation rapide

## 5Band PEQ

Un égaliseur paramétrique de qualité professionnelle basé sur des principes scientifiques, offrant cinq bandes entièrement configurables avec un contrôle précis des fréquences. Parfait pour l'affinement subtil du son et le traitement audio correctif.

### Guide d'Amélioration du Son
- Clarté Vocale et Instrumentale :
  - Utilisez la bande 3.2kHz avec un Q modéré (1.0-2.0) pour une présence naturelle
  - Appliquez des coupes étroites (Q 4.0-8.0) pour éliminer les résonances
  - Ajoutez un air doux avec un filtre en plateau haut à 10kHz (+2 à +4dB)
- Contrôle de la Qualité des Basses :
  - Modelez les fondamentales avec un filtre en cloche à 100Hz
  - Éliminez la résonance de la pièce en utilisant un Q étroit à des fréquences spécifiques
  - Créez une extension douce des basses avec un filtre en plateau bas
- Ajustement Scientifique du Son :
  - Ciblez des fréquences spécifiques avec précision
  - Utilisez des analyseurs pour identifier les zones problématiques
  - Appliquez des corrections mesurées avec un impact de phase minimal

### Paramètres Techniques
- **Bandes de Précision**
  - Bande 1 : 100Hz (Contrôle Sub & Basses)
  - Bande 2 : 316Hz (Définition Bas-médiums)
  - Bande 3 : 1.0kHz (Présence Médiums)
  - Bande 4 : 3.2kHz (Détail Hauts-médiums)
  - Bande 5 : 10kHz (Extension Hautes Fréquences)
- **Contrôles Professionnels Par Bande**
  - Fréquence Centrale : Espacée logarithmiquement pour une couverture optimale
  - Plage de Gain : Ajustement précis ±18dB
  - Facteur Q : Large 0.1 à Précis 10.0
  - Types de Filtres Multiples :
    - Peaking : Ajustement symétrique des fréquences
    - Low/High Pass : Pente de 12dB/octave
    - Low/High Shelf : Mise en forme spectrale douce
    - Band Pass : Isolation fréquentielle ciblée

### Affichage Technique
- Visualisation haute résolution de la réponse en fréquence
- Points de contrôle interactifs avec affichage précis des paramètres
- Calcul en temps réel de la fonction de transfert
- Grille calibrée de fréquences et de gain
- Lectures numériques précises pour tous les paramètres

## Narrow Range

Un outil qui vous permet de vous concentrer sur des parties spécifiques de la musique en filtrant les fréquences indésirables. Utile pour créer des effets sonores spéciaux ou éliminer les sons indésirables.

### Guide d'Amélioration de l'Écoute
- Créez des effets sonores uniques :
  - Effet "voix téléphonique"
  - Son "vieille radio"
  - Effet "sous l'eau"
- Concentrez-vous sur des instruments spécifiques :
  - Isolez les fréquences basses
  - Concentrez-vous sur la plage vocale
  - Mettez en valeur des instruments spécifiques
- Supprimez les sons indésirables :
  - Réduisez le grondement basse fréquence
  - Coupez le sifflement haute fréquence excessif
  - Concentrez-vous sur les parties les plus importantes de la musique

### Parameters
- **HPF Frequency** - Contrôle l'endroit où les basses commencent à être atténuées (20Hz à 1000Hz)
  - Valeurs plus élevées : Supprime davantage les basses
  - Valeurs plus basses : Conserve davantage les basses
  - Commencez par des valeurs basses et ajustez selon vos préférences
- **HPF Slope** - Indique la rapidité de l'atténuation des basses (0 à -48 dB/octave)
  - 0dB : Aucune atténuation (désactivé)
  - De -6dB à -48dB : Atténuation de plus en plus forte par paliers de 6dB
- **LPF Frequency** - Contrôle l'endroit où les aigus commencent à être atténués (200Hz à 20000Hz)
  - Valeurs plus basses : Supprime davantage les aigus
  - Valeurs plus élevées : Conserve davantage les aigus
  - Commencez par des valeurs élevées et ajustez à la baisse si nécessaire
- **LPF Slope** - Indique la rapidité de l'atténuation des aigus (0 à -48 dB/octave)
  - 0dB : Aucune atténuation (désactivé)
  - De -6dB à -48dB : Atténuation de plus en plus forte par paliers de 6dB

### Affichage Visuel
- Graphique clair montrant la réponse en fréquence
- Contrôles de fréquence faciles à ajuster
- Boutons simples de sélection de pente
