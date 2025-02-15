# Spatial Audio Plugins

Une collection de plugins qui améliorent le rendu de votre musique dans vos casques ou enceintes en ajustant la balance stéréo (gauche et droite). Ces effets peuvent rendre votre musique plus spacieuse et naturelle, particulièrement lors de l'écoute au casque.

## Liste des Plugins

- [Multiband Balance](#multiband-balance) - Contrôle de balance stéréo dépendant de la fréquence à 5 bandes
- [Stereo Blend](#stereo-blend) - Contrôle la largeur stéréo de mono à stéréo améliorée

## Multiband Balance

Un processeur spatial sophistiqué qui divise l'audio en cinq bandes de fréquences et permet un contrôle de balance stéréo indépendant de chaque bande. Ce plugin permet un contrôle précis de l'image stéréo à travers le spectre des fréquences, offrant des possibilités créatives pour le design sonore et le mixage, ainsi que des applications correctives pour les enregistrements stéréo problématiques.

### Caractéristiques Principales
- Contrôle de balance stéréo dépendant de la fréquence à 5 bandes
- Filtres de séparation Linkwitz-Riley de haute qualité
- Contrôle de balance linéaire pour ajustement stéréo précis
- Traitement indépendant des canaux gauche et droit
- Changements de paramètres sans clics avec gestion automatique des fondus

### Paramètres

#### Fréquences de Séparation
- **Freq 1** (20-500 Hz) : Sépare les bandes basses et médium-basses
- **Freq 2** (100-2000 Hz) : Sépare les bandes médium-basses et médiums
- **Freq 3** (500-8000 Hz) : Sépare les bandes médiums et médium-hautes
- **Freq 4** (1000-20000 Hz) : Sépare les bandes médium-hautes et hautes

#### Contrôles de Bande
Chaque bande dispose d'un contrôle de balance indépendant :
- **Band 1 Bal.** (-100% à +100%) : Contrôle la balance stéréo des basses fréquences
- **Band 2 Bal.** (-100% à +100%) : Contrôle la balance stéréo des fréquences médium-basses
- **Band 3 Bal.** (-100% à +100%) : Contrôle la balance stéréo des fréquences médiums
- **Band 4 Bal.** (-100% à +100%) : Contrôle la balance stéréo des fréquences médium-hautes
- **Band 5 Bal.** (-100% à +100%) : Contrôle la balance stéréo des hautes fréquences

### Réglages Recommandés

1. Amélioration Stéréo Naturelle
   - Bande Basse (20-100 Hz) : 0% (centré)
   - Médium-Basse (100-500 Hz) : ±20%
   - Médium (500-2000 Hz) : ±40%
   - Médium-Haute (2000-8000 Hz) : ±60%
   - Haute (8000+ Hz) : ±80%
   - Effet : Crée une expansion stéréo progressive qui s'élargit avec la fréquence

2. Mix Focalisé
   - Bande Basse : 0%
   - Médium-Basse : ±10%
   - Médium : ±30%
   - Médium-Haute : ±20%
   - Haute : ±40%
   - Effet : Maintient la focalisation centrale tout en ajoutant une largeur subtile

3. Paysage Sonore Immersif
   - Bande Basse : 0%
   - Médium-Basse : ±40%
   - Médium : ±60%
   - Médium-Haute : ±80%
   - Haute : ±100%
   - Effet : Crée un champ sonore enveloppant avec des basses ancrées

### Guide d'Application

1. Amélioration du Mix
   - Gardez les basses fréquences (sous 100 Hz) centrées pour des basses stables
   - Augmentez progressivement la largeur stéréo avec la fréquence
   - Utilisez des réglages modérés (±30-50%) pour une amélioration naturelle
   - Contrôlez en mono pour vérifier les problèmes de phase

2. Résolution de Problèmes
   - Corrigez les problèmes de phase dans des plages de fréquences spécifiques
   - Resserrez les basses non focalisées en centrant les basses fréquences
   - Réduisez les artefacts stéréo agressifs dans les hautes fréquences
   - Réparez les pistes stéréo mal enregistrées

3. Design Sonore Créatif
   - Créez des mouvements dépendants de la fréquence
   - Concevez des effets spatiaux uniques
   - Construisez des paysages sonores immersifs
   - Améliorez des instruments ou éléments spécifiques

4. Ajustement du Champ Stéréo
   - Ajustement fin de la balance stéréo par bande de fréquence
   - Correction de la distribution stéréo inégale
   - Amélioration de la séparation stéréo où nécessaire
   - Maintien de la compatibilité mono

### Guide de Démarrage Rapide

1. Configuration Initiale
   - Commencez avec toutes les bandes centrées (0%)
   - Réglez les fréquences de séparation aux points standards :
     * Freq 1 : 100 Hz
     * Freq 2 : 500 Hz
     * Freq 3 : 2000 Hz
     * Freq 4 : 8000 Hz

2. Amélioration de Base
   - Gardez Band 1 (basses) centré
   - Faites de petits ajustements sur les bandes plus hautes
   - Écoutez les changements dans l'image spatiale
   - Vérifiez la compatibilité mono

3. Réglage Fin
   - Ajustez les points de séparation pour correspondre à votre matériel
   - Effectuez des changements graduels des positions de bande
   - Écoutez les artefacts indésirables
   - Comparez avec le bypass pour perspective

N'oubliez pas : Le Multiband Balance est un outil puissant qui nécessite un ajustement soigneux. Commencez avec des réglages subtils et augmentez la complexité selon les besoins. Vérifiez toujours vos ajustements en stéréo et en mono pour assurer la compatibilité.

## Stereo Blend

Un effet qui aide à obtenir un champ sonore plus naturel en ajustant la largeur stéréo de votre musique. Il est particulièrement utile pour l'écoute au casque, où il peut réduire la séparation stéréo exagérée qui se produit souvent avec les casques, rendant l'expérience d'écoute plus naturelle et moins fatigante. Il peut également améliorer l'image stéréo pour l'écoute sur enceintes lorsque nécessaire.

### Guide d'Amélioration de l'Écoute
- Optimisation Casque :
  - Réduisez la largeur stéréo (60-90%) pour une présentation plus naturelle, similaire aux enceintes
  - Minimisez la fatigue d'écoute due à une séparation stéréo excessive
  - Créez une scène sonore frontale plus réaliste
- Amélioration Enceintes :
  - Maintenez l'image stéréo originale (100%) pour une reproduction précise
  - Amélioration subtile (110-130%) pour une scène sonore plus large si nécessaire
  - Ajustement prudent pour maintenir un champ sonore naturel
- Contrôle du Champ Sonore :
  - Concentration sur une présentation naturelle et réaliste
  - Évitez une largeur excessive qui pourrait sonner artificielle
  - Optimisez pour votre environnement d'écoute spécifique

### Parameters
- **Stereo** - Contrôle la largeur stéréo (0-200%)
  - 0% : Mono complet (canaux gauche et droit additionnés)
  - 100% : Image stéréo originale
  - 200% : Stéréo améliorée avec largeur maximale (L-R/R-L)

### Réglages Recommandés pour Différents Scénarios d'Écoute

1. Écoute au Casque (Naturel)
   - Stereo : 60-90%
   - Effet : Séparation stéréo réduite
   - Parfait pour : Longues sessions d'écoute, réduction de la fatigue

2. Écoute sur Enceintes (Référence)
   - Stereo : 100%
   - Effet : Image stéréo originale
   - Parfait pour : Reproduction précise

3. Amélioration Enceintes
   - Stereo : 110-130%
   - Effet : Amélioration subtile de la largeur
   - Parfait pour : Pièces avec placement rapproché des enceintes

### Guide d'Optimisation par Style Musical

- Musique Classique
  - Casque : 70-80%
  - Enceintes : 100%
  - Avantage : Perspective naturelle de salle de concert

- Jazz & Acoustique
  - Casque : 80-90%
  - Enceintes : 100-110%
  - Avantage : Son d'ensemble intime et réaliste

- Rock & Pop
  - Casque : 85-95%
  - Enceintes : 100-120%
  - Avantage : Impact équilibré sans largeur artificielle

- Musique Électronique
  - Casque : 90-100%
  - Enceintes : 100-130%
  - Avantage : Spatialisation contrôlée tout en maintenant la focalisation

### Guide de Démarrage Rapide

1. Choisissez Votre Configuration d'Écoute
   - Identifiez si vous utilisez un casque ou des enceintes
   - Cela détermine votre point de départ pour l'ajustement

2. Commencez avec des Réglages Conservateurs
   - Casque : Commencez à 80%
   - Enceintes : Commencez à 100%
   - Écoutez le placement naturel du son

3. Affinez pour Votre Musique
   - Faites de petits ajustements (5-10% à la fois)
   - Concentrez-vous sur l'obtention d'un champ sonore naturel
   - Prêtez attention au confort d'écoute

N'oubliez pas : L'objectif est d'obtenir une expérience d'écoute naturelle et confortable qui réduit la fatigue et maintient la présentation musicale voulue. Évitez les réglages extrêmes qui peuvent sembler impressionnants au début mais deviennent fatigants avec le temps.