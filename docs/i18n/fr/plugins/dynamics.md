# Dynamics Plugins

Une collection de plugins qui aident à équilibrer les parties fortes et douces de votre musique, rendant votre expérience d'écoute plus agréable et confortable.

## Plugin List

- [Brickwall Limiter](#brickwall-limiter) - Contrôle transparent des crêtes pour une écoute sûre et confortable
- [Compressor](#compressor) - Équilibre automatiquement les niveaux de volume pour une écoute plus confortable
- [Gate](#gate) - Réduit les bruits de fond indésirables en atténuant les signaux sous un seuil
- [Multiband Compressor](#multiband-compressor) - Processeur de dynamique professionnel à 5 bandes avec mise en forme du son style radio FM

## Brickwall Limiter

Un limiteur de crêtes de haute qualité qui garantit que votre musique ne dépasse jamais un niveau spécifié, évitant l'écrêtage numérique tout en maintenant une qualité sonore naturelle. Parfait pour protéger votre système audio et assurer des niveaux d'écoute confortables sans compromettre la dynamique de la musique.

### Guide d'Amélioration de l'Écoute
- Musique Classique :
  - Profitez en toute sécurité des crescendos orchestraux complets
  - Maintenez la dynamique naturelle des pièces de piano
  - Protégez contre les pics inattendus dans les enregistrements live
- Musique Pop/Rock :
  - Maintenez un volume constant pendant les passages intenses
  - Profitez de la musique dynamique à n'importe quel niveau d'écoute
  - Prévenez la distorsion dans les sections riches en basses
- Musique Électronique :
  - Contrôlez les pics de synthétiseur de manière transparente
  - Maintenez l'impact tout en évitant la surcharge
  - Gardez les drops de basse puissants mais contrôlés

### Paramètres
- **Input Gain** (-18dB à +18dB)
  - Ajuste le niveau entrant dans le limiteur
  - Augmentez pour pousser davantage le limiteur
  - Diminuez si vous entendez trop de limitation
  - Valeur par défaut 0dB

- **Threshold** (-24dB à 0dB)
  - Définit le niveau maximal des crêtes
  - Valeurs plus basses offrent plus de marge de sécurité
  - Valeurs plus hautes préservent plus de dynamique
  - Commencez à -3dB pour une protection douce

- **Release Time** (10ms à 500ms)
  - Rapidité de relâchement de la limitation
  - Temps plus rapides maintiennent plus de dynamique
  - Temps plus lents pour un son plus doux
  - Essayez 100ms comme point de départ

- **Lookahead** (0ms à 10ms)
  - Permet au limiteur d'anticiper les crêtes
  - Valeurs plus hautes pour une limitation plus transparente
  - Valeurs plus basses pour moins de latence
  - 3ms est un bon compromis

- **Margin** (-1.000dB à 0.000dB)
  - Ajustement fin du seuil effectif
  - Fournit une marge de sécurité supplémentaire
  - Valeur par défaut -1.000dB convient à la plupart des matériaux
  - Ajustez pour un contrôle précis des crêtes

- **Oversampling** (1x, 2x, 4x, 8x)
  - Valeurs plus hautes pour une limitation plus propre
  - Valeurs plus basses pour moins d'utilisation CPU
  - 4x est un bon compromis entre qualité et performance

### Affichage Visuel
- Mesure de réduction de gain en temps réel
- Indication claire du niveau de seuil
- Ajustement interactif des paramètres
- Surveillance du niveau des crêtes

### Réglages Recommandés

#### Protection Transparente
- Input Gain : 0dB
- Threshold : -3dB
- Release : 100ms
- Lookahead : 3ms
- Margin : -1.000dB
- Oversampling : 4x

#### Sécurité Maximale
- Input Gain : -6dB
- Threshold : -6dB
- Release : 50ms
- Lookahead : 5ms
- Margin : -1.000dB
- Oversampling : 8x

#### Dynamique Naturelle
- Input Gain : 0dB
- Threshold : -1.5dB
- Release : 200ms
- Lookahead : 2ms
- Margin : -0.500dB
- Oversampling : 4x

## Compressor

Un effet qui gère automatiquement les différences de volume dans votre musique en réduisant doucement les sons forts et en améliorant les sons faibles. Cela crée une expérience d'écoute plus équilibrée et agréable en lissant les changements de volume soudains qui pourraient être dérangeants ou inconfortables.

### Guide d'Amélioration de l'Écoute
- Musique Classique :
  - Rend les crescendos orchestraux dramatiques plus confortables à écouter
  - Équilibre la différence entre les passages piano doux et forts
  - Aide à entendre les détails subtils même dans les sections puissantes
- Musique Pop/Rock :
  - Crée une expérience d'écoute plus confortable pendant les sections intenses
  - Rend les voix plus claires et plus faciles à comprendre
  - Réduit la fatigue auditive pendant les longues sessions
- Musique Jazz :
  - Équilibre le volume entre les différents instruments
  - Fait se fondre plus naturellement les sections solo avec l'ensemble
  - Maintient la clarté pendant les passages doux et forts

### Parameters

- **Threshold** - Définit le niveau de volume où l'effet commence à agir (-60dB à 0dB)
  - Réglages plus élevés : N'affecte que les parties les plus fortes de la musique
  - Réglages plus bas : Crée plus d'équilibre global
  - Commencez à -24dB pour un équilibrage doux
- **Ratio** - Contrôle l'intensité de l'équilibrage du volume (1:1 à 20:1)
  - 1:1 : Pas d'effet (son original)
  - 2:1 : Équilibrage doux
  - 4:1 : Équilibrage modéré
  - 8:1+ : Contrôle du volume fort
- **Attack Time** - Rapidité de réaction de l'effet aux sons forts (0.1ms à 100ms)
  - Temps plus rapides : Contrôle du volume plus immédiat
  - Temps plus lents : Son plus naturel
  - Essayez 20ms comme point de départ
- **Release Time** - Rapidité de retour du volume à la normale (10ms à 1000ms)
  - Temps plus rapides : Son plus dynamique
  - Temps plus lents : Transitions plus douces et naturelles
  - Commencez avec 200ms pour l'écoute générale
- **Knee** - Douceur de la transition de l'effet (0dB à 12dB)
  - Valeurs plus basses : Contrôle plus précis
  - Valeurs plus hautes : Son plus doux et naturel
  - 6dB est un bon point de départ
- **Gain** - Ajuste le volume global après traitement (-12dB à +12dB)
  - Utilisez-le pour faire correspondre le volume avec le son original
  - Augmentez si la musique semble trop douce
  - Diminuez si elle est trop forte
- **Enabled** - Active ou désactive l'effet

### Affichage Visuel

- Graphique interactif montrant le fonctionnement de l'effet
- Indicateurs de niveau de volume faciles à lire
- Retour visuel pour tous les ajustements de paramètres
- Lignes de référence pour guider vos réglages

### Réglages Recommandés pour Différents Scénarios d'Écoute
- Écoute de Fond Décontractée :
  - Threshold : -24dB
  - Ratio : 2:1
  - Attack : 20ms
  - Release : 200ms
  - Knee : 6dB
- Sessions d'Écoute Critique :
  - Threshold : -18dB
  - Ratio : 1.5:1
  - Attack : 30ms
  - Release : 300ms
  - Knee : 3dB
- Écoute Nocturne :
  - Threshold : -30dB
  - Ratio : 4:1
  - Attack : 10ms
  - Release : 150ms
  - Knee : 9dB

## Gate

Une porte de bruit qui aide à réduire les bruits de fond indésirables en atténuant automatiquement les signaux qui tombent sous un seuil spécifié. Ce plugin est particulièrement utile pour nettoyer les sources audio avec un bruit de fond constant, comme le bruit de ventilateur, le bourdonnement ou le bruit ambiant de la pièce.

### Caractéristiques Principales
- Contrôle précis du seuil pour une détection précise du bruit
- Ratio ajustable pour une réduction du bruit naturelle ou agressive
- Temps d'attaque et de relâchement variables pour un contrôle optimal du timing
- Option de knee douce pour des transitions fluides
- Mesure de réduction de gain en temps réel
- Affichage interactif de la fonction de transfert

### Parameters

- **Threshold** (-96dB à 0dB)
  - Définit le niveau où commence la réduction du bruit
  - Les signaux sous ce niveau seront atténués
  - Valeurs plus hautes : Réduction du bruit plus agressive
  - Valeurs plus basses : Effet plus subtil
  - Commencez à -40dB et ajustez selon votre niveau de bruit de fond

- **Ratio** (1:1 à 100:1)
  - Contrôle l'intensité de l'atténuation des signaux sous le seuil
  - 1:1 : Pas d'effet
  - 10:1 : Forte réduction du bruit
  - 100:1 : Silence presque complet sous le seuil
  - Commencez à 10:1 pour une réduction du bruit typique

- **Attack Time** (0.01ms à 50ms)
  - Rapidité de réaction de la porte quand le signal dépasse le seuil
  - Temps plus rapides : Plus précis mais peut sembler brusque
  - Temps plus lents : Transitions plus naturelles
  - Essayez 1ms comme point de départ

- **Release Time** (10ms à 2000ms)
  - Rapidité de fermeture de la porte quand le signal passe sous le seuil
  - Temps plus rapides : Contrôle du bruit plus serré
  - Temps plus lents : Déclin plus naturel
  - Commencez avec 200ms pour un son naturel

- **Knee** (0dB à 6dB)
  - Contrôle la progressivité de la transition de la porte autour du seuil
  - 0dB : Knee dure pour un gating précis
  - 6dB : Knee douce pour des transitions plus fluides
  - Utilisez 1dB pour une réduction du bruit générale

- **Gain** (-12dB à +12dB)
  - Ajuste le niveau de sortie après le gating
  - Utilisez pour compenser toute perte de volume perçue
  - Typiquement laissé à 0dB sauf si nécessaire

### Retour Visuel
- Graphique de fonction de transfert interactif montrant :
  - Relation entrée/sortie
  - Point de seuil
  - Courbe de knee
  - Pente du ratio
- Vumètre de réduction de gain en temps réel affichant :
  - Quantité actuelle de réduction du bruit
  - Retour visuel de l'activité de la porte

### Réglages Recommandés

#### Réduction Légère du Bruit
- Threshold : -50dB
- Ratio : 2:1
- Attack : 5ms
- Release : 300ms
- Knee : 3dB
- Gain : 0dB

#### Bruit de Fond Modéré
- Threshold : -40dB
- Ratio : 10:1
- Attack : 1ms
- Release : 200ms
- Knee : 1dB
- Gain : 0dB

#### Suppression de Bruit Intense
- Threshold : -30dB
- Ratio : 50:1
- Attack : 0.1ms
- Release : 100ms
- Knee : 0dB
- Gain : 0dB

### Conseils d'Application
- Réglez le seuil juste au-dessus du bruit de fond pour des résultats optimaux
- Utilisez des temps de relâchement plus longs pour un son plus naturel
- Ajoutez de la knee lors du traitement de matériel complexe
- Surveillez le vumètre de réduction de gain pour assurer un gating approprié
- Combinez avec d'autres processeurs de dynamique pour un contrôle complet

## Multiband Compressor

Un processeur de dynamique professionnel qui divise votre audio en cinq bandes de fréquences et traite chacune indépendamment. Ce plugin est particulièrement efficace pour créer ce son "radio FM" poli, où chaque partie du spectre de fréquences est parfaitement contrôlée et équilibrée.

### Caractéristiques Principales
- Traitement 5 bandes avec fréquences de crossover ajustables
- Contrôles de compression indépendants pour chaque bande
- Réglages par défaut optimisés pour un son style radio FM
- Visualisation en temps réel de la réduction de gain par bande
- Filtres de crossover Linkwitz-Riley de haute qualité

### Bandes de Fréquences
- Bande 1 (Basse) : Sous 100 Hz
  - Contrôle les basses profondes et les sous-fréquences
  - Ratio plus élevé et relâchement plus long pour des basses serrées et contrôlées
- Bande 2 (Bas-médium) : 100-500 Hz
  - Gère les basses supérieures et le bas-médium
  - Compression modérée pour maintenir la chaleur
- Bande 3 (Médium) : 500-2000 Hz
  - Gamme critique de présence vocale et instrumentale
  - Compression douce pour préserver le naturel
- Bande 4 (Haut-médium) : 2000-8000 Hz
  - Contrôle la présence et l'air
  - Compression légère avec réponse plus rapide
- Bande 5 (Aigu) : Au-dessus de 8000 Hz
  - Gère la brillance et l'éclat
  - Temps de réponse rapides avec ratio plus élevé

### Parameters (Par Bande)
- **Threshold** (-60dB à 0dB)
  - Définit le niveau où commence la compression
  - Réglages plus bas créent des niveaux plus constants
- **Ratio** (1:1 à 20:1)
  - Contrôle la quantité de réduction de gain
  - Ratios plus élevés pour un contrôle plus agressif
- **Attack** (0.1ms à 100ms)
  - Rapidité de réponse de la compression
  - Temps plus rapides pour le contrôle des transitoires
- **Release** (10ms à 1000ms)
  - Rapidité de retour du gain à la normale
  - Temps plus longs pour un son plus doux
- **Knee** (0dB à 12dB)
  - Douceur de l'apparition de la compression
  - Valeurs plus élevées pour une transition plus naturelle
- **Gain** (-12dB à +12dB)
  - Ajustement du niveau de sortie par bande
  - Affinez l'équilibre des fréquences

### Traitement Style Radio FM
Le Multiband Compressor est livré avec des réglages par défaut optimisés qui recréent le son poli et professionnel de la radiodiffusion FM :

- Bande Basse (< 100 Hz)
  - Ratio plus élevé (4:1) pour un contrôle serré des basses
  - Attaque/relâchement plus lents pour maintenir le punch
  - Légère réduction pour éviter la boue sonore

- Bande Bas-médium (100-500 Hz)
  - Compression modérée (3:1)
  - Timing équilibré pour une réponse naturelle
  - Gain neutre pour maintenir la chaleur

- Bande Médium (500-2000 Hz)
  - Compression douce (2.5:1)
  - Temps de réponse rapides
  - Léger boost pour la présence vocale

- Bande Haut-médium (2000-8000 Hz)
  - Compression légère (2:1)
  - Attaque/relâchement rapides
  - Boost de présence amélioré

- Bande Haute (> 8000 Hz)
  - Ratio plus élevé (5:1) pour une brillance constante
  - Temps de réponse très rapides
  - Réduction contrôlée pour le poli

Cette configuration crée le son caractéristique "prêt pour la radio" :
- Basses constantes et impactantes
- Voix claires et en avant
- Dynamique contrôlée sur toutes les fréquences
- Poli et brillance professionnels
- Présence et clarté améliorées
- Fatigue d'écoute réduite

### Retour Visuel
- Graphiques de fonction de transfert interactifs pour chaque bande
- Vumètres de réduction de gain en temps réel
- Visualisation de l'activité des bandes de fréquences
- Indicateurs clairs des points de crossover

### Conseils d'Utilisation
- Commencez avec le preset radio FM par défaut
- Ajustez les fréquences de crossover selon votre matériel
- Affinez le seuil de chaque bande pour le niveau de contrôle souhaité
- Utilisez les contrôles de gain pour façonner l'équilibre final des fréquences
- Surveillez les vumètres de réduction de gain pour assurer un traitement approprié