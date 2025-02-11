# Saturation Plugins

Une collection de plugins qui ajoutent de la chaleur et du caractère à votre musique. Ces effets peuvent donner à la musique numérique un son plus analogique et ajouter une richesse agréable au son, similaire à la coloration sonore des équipements audio vintage.

## Plugin List

- [Hard Clipping](#hard-clipping) - Ajoute de l'intensité et du mordant au son
- [Multiband Saturation](#multiband-saturation) - Façonne et améliore différentes plages de fréquences indépendamment
- [Saturation](#saturation) - Ajoute de la chaleur et de la richesse comme un équipement vintage

## Hard Clipping

Un effet qui peut ajouter tout, de la chaleur subtile au caractère intense à votre musique. Il fonctionne en modelant doucement ou agressivement les ondes sonores, créant tout, de l'amélioration douce aux effets dramatiques.

### Guide d'Amélioration de l'Écoute
- Amélioration Subtile :
  - Rend la musique numérique légèrement plus chaleureuse
  - Ajoute une qualité douce "type analogique"
  - Maintient la clarté tout en réduisant la dureté
- Effet Modéré :
  - Crée un son plus énergique
  - Ajoute de l'excitation aux éléments rythmiques
  - Donne à la musique une sensation plus "dynamique"
- Effet Créatif :
  - Crée des transformations sonores dramatiques
  - Ajoute du caractère agressif à la musique
  - Parfait pour l'écoute expérimentale

### Parameters
- **Threshold** - Contrôle la quantité de son affectée (-60dB à 0dB)
  - Valeurs hautes (-6dB à 0dB) : Chaleur subtile
  - Valeurs moyennes (-24dB à -6dB) : Caractère notable
  - Valeurs basses (-60dB à -24dB) : Effet dramatique
- **Mode** - Choisit quelles parties du son affecter
  - Both Sides : Effet équilibré et naturel
  - Positive Only : Son plus brillant et agressif
  - Negative Only : Caractère plus sombre et unique
- **Enabled** - Active ou désactive l'effet

### Affichage Visuel
- Graphique en temps réel montrant comment le son est modelé
- Retour visuel clair lors des ajustements
- Lignes de référence pour guider vos ajustements

### Conseils d'Écoute
- Pour une amélioration subtile :
  1. Commencez avec un Threshold élevé (-6dB)
  2. Utilisez le mode "Both Sides"
  3. Écoutez la chaleur ajoutée
- Pour des effets créatifs :
  1. Baissez progressivement le Threshold
  2. Essayez différents Modes
  3. Combinez avec d'autres effets pour des sons uniques

## Multiband Saturation

Un effet polyvalent qui permet d'ajouter de la chaleur et du caractère à des plages de fréquences spécifiques de votre musique. En divisant le son en bandes basses, moyennes et hautes, vous pouvez façonner chaque plage indépendamment pour une amélioration sonore précise.

### Guide d'Amélioration de l'Écoute
- Amélioration des Basses :
  - Ajoute de la chaleur et du punch aux basses fréquences
  - Parfait pour améliorer les basses et les kicks
  - Crée des basses plus pleines et plus riches
- Façonnage des Médiums :
  - Met en valeur le corps des voix et des instruments
  - Ajoute de la présence aux guitares et aux claviers
  - Crée un son plus clair et plus défini
- Amélioration des Aigus :
  - Ajoute de l'éclat aux cymbales et aux hi-hats
  - Améliore l'air et la brillance
  - Crée des aigus nets et détaillés

### Parameters
- **Fréquences de Crossover**
  - Freq 1 (20Hz-2kHz) : Définit où la bande basse se termine et la bande moyenne commence
  - Freq 2 (200Hz-20kHz) : Définit où la bande moyenne se termine et la bande haute commence
- **Contrôles de Bande** (pour chaque bande Basse, Moyenne et Haute) :
  - **Drive** (0.0-10.0) : Contrôle l'intensité de la saturation
    - Léger (0.0-3.0) : Amélioration subtile
    - Moyen (3.0-6.0) : Chaleur notable
    - Fort (6.0-10.0) : Caractère prononcé
  - **Bias** (-0.3 à 0.3) : Ajuste la symétrie de la courbe de saturation
    - Négatif : Accentue les pics négatifs
    - Zéro : Saturation symétrique
    - Positif : Accentue les pics positifs
  - **Mix** (0-100%) : Mélange l'effet avec l'original
    - Bas (0-30%) : Amélioration subtile
    - Moyen (30-70%) : Effet équilibré
    - Haut (70-100%) : Caractère prononcé
  - **Gain** (-18dB à +18dB) : Ajuste le volume de la bande
    - Utilisé pour équilibrer les bandes entre elles
    - Compense les changements de volume

### Affichage Visuel
- Onglets de sélection de bande interactifs
- Graphique de courbe de transfert en temps réel pour chaque bande
- Retour visuel clair lors des ajustements

### Conseils d'Amélioration Musicale
- Pour l'Amélioration Globale du Mix :
  1. Commencez avec un Drive doux (2.0-3.0) sur toutes les bandes
  2. Gardez le Bias à 0.0 pour une saturation naturelle
  3. Réglez le Mix autour de 40-50% pour un mélange naturel
  4. Affinez le Gain pour chaque bande

- Pour l'Amélioration des Basses :
  1. Concentrez-vous sur la bande basse
  2. Utilisez un Drive modéré (3.0-5.0)
  3. Gardez le Bias neutre pour une réponse cohérente
  4. Gardez le Mix autour de 50-70%

- Pour l'Amélioration des Voix :
  1. Concentrez-vous sur la bande moyenne
  2. Utilisez un Drive léger (1.0-3.0)
  3. Gardez le Bias à 0.0 pour un son naturel
  4. Ajustez le Mix selon le goût (30-50%)

- Pour Ajouter de la Brillance :
  1. Concentrez-vous sur la bande haute
  2. Utilisez un Drive doux (1.0-2.0)
  3. Gardez le Bias neutre pour une saturation propre
  4. Gardez le Mix subtil (20-40%)

### Guide de Démarrage Rapide
1. Réglez les fréquences de crossover pour diviser votre son
2. Commencez avec des valeurs de Drive basses sur toutes les bandes
3. Gardez initialement le Bias à 0.0
4. Utilisez le Mix pour mélanger l'effet naturellement
5. Affinez avec les contrôles de Gain
6. Faites confiance à vos oreilles et ajustez selon le goût !

## Saturation

Un effet qui simule le son chaud et agréable des équipements à lampes vintage. Il peut ajouter de la richesse et du caractère à votre musique, lui donnant un son plus "analogique" et moins "numérique".

### Guide d'Amélioration de l'Écoute
- Ajout de Chaleur :
  - Rend la musique numérique plus naturelle
  - Ajoute une richesse agréable au son
  - Parfait pour le jazz et la musique acoustique
- Caractère Riche :
  - Crée un son plus "vintage"
  - Ajoute de la profondeur et de la dimension
  - Excellent pour le rock et la musique électronique
- Effet Fort :
  - Transforme le son de manière dramatique
  - Crée des tonalités audacieuses et pleines de caractère
  - Idéal pour l'écoute expérimentale

### Parameters
- **Drive** - Contrôle la quantité de chaleur et de caractère (0.0 à 10.0)
  - Léger (0.0-3.0) : Chaleur analogique subtile
  - Moyen (3.0-6.0) : Caractère riche et vintage
  - Fort (6.0-10.0) : Effet audacieux et dramatique
- **Bias** - Ajuste la symétrie de la courbe de saturation (-0.3 à 0.3)
  - 0.0 : Saturation symétrique
  - Positif : Accentue les pics positifs
  - Négatif : Accentue les pics négatifs
- **Mix** - Équilibre l'effet avec le son original (0% à 100%)
  - 0-30% : Amélioration subtile
  - 30-70% : Effet équilibré
  - 70-100% : Caractère fort
- **Gain** - Ajuste le volume global (-18dB à +18dB)
  - Utilisez des valeurs négatives si l'effet est trop fort
  - Utilisez des valeurs positives si l'effet est trop faible
- **Enabled** - Active ou désactive l'effet

### Affichage Visuel
- Graphique clair montrant comment le son est modelé
- Retour visuel en temps réel
- Contrôles faciles à lire

### Conseils d'Amélioration Musicale
- Classique & Jazz :
  - Drive léger (1.0-2.0) pour une chaleur naturelle
  - Gardez le Bias à 0.0 pour une saturation propre
  - Mix bas (20-40%) pour la subtilité
- Rock & Pop :
  - Drive moyen (3.0-5.0) pour un caractère riche
  - Gardez le Bias neutre pour une réponse cohérente
  - Mix moyen (40-60%) pour l'équilibre
- Électronique :
  - Drive plus élevé (4.0-7.0) pour un effet audacieux
  - Expérimentez avec différentes valeurs de Bias
  - Mix plus élevé (60-80%) pour le caractère

### Guide de Démarrage Rapide
1. Commencez avec un Drive bas pour une chaleur douce
2. Gardez initialement le Bias à 0.0
3. Ajustez Mix pour équilibrer l'effet
4. Ajustez Gain si nécessaire pour un volume approprié
5. Expérimentez et faites confiance à vos oreilles !