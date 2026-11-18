# Game design : notre version originale

## Pourquoi une version originale

On ne recopie pas "Richesses du Monde" : ni son nom, ni son plateau, ni ses illustrations, ni le texte de ses cartes, ni ses montants. Les mécaniques de genre (tour du monde, parts de ressources, redevances, enchères, alliances) sont communes à beaucoup de jeux économiques et restent libres. Tout le reste est créé pour ce projet :

- **Nom** : titre de travail "Comptoirs du Globe" (à changer librement). Le dépôt garde son nom actuel, mais le nom affiché dans le jeu sera le nôtre.
- **Plateau** : notre propre découpage en régions, nos propres cases spéciales.
- **Visuels** : illustrations, pions, icônes et billets dessinés pour le projet (SVG maison, ou banques libres de droits type CC0 avec la licence notée dans `assets/LICENSES.md`).
- **Cartes** : textes et effets écrits pour le projet.
- **Chiffres** : prix, redevances et seuils équilibrés par nos propres tests.

## Matériel numérique

| Élément | Quantité | Détail |
|---|---|---|
| Plateau | 40 cases en anneau | 28 régions, 12 cases spéciales |
| Ressources | 8 | Pétrole, Blé, Cuivre, Café, Coton, Lithium, Or, Bois |
| Titres | 10 par ressource (80) | Chaque titre = 10 % de la ressource |
| Cartes Conjoncture | 20 | Événements mondiaux (hausse/baisse d'une ressource, taxe, bonus) |
| Cartes Atout | 12 | Avantage gardé en main (relancer, refuser une redevance, bloquer une enchère...) |
| Joueurs | 2 à 6 | Pions et couleurs originaux |

## Plateau (40 cases)

- **28 régions** : chacune produit une ressource (3 à 4 régions par ressource) et porte un indice de redevance (x1, x2 ou x3) tiré au hasard en début de partie.
- **Départ** : on touche un revenu fixe en passant.
- **4 Ports** : déplacement optionnel vers un autre port contre paiement.
- **4 Conjoncture** : on pioche une carte événement.
- **2 Bourse** : on peut lancer une enchère sur un titre de n'importe quel joueur (il est forcé de le mettre en vente, avec droit de surenchère).
- **1 Crise** : on paie une taxe proportionnelle à son patrimoine.
- **1 Douane** : équivalent "prison" : on passe un tour sauf paiement ou carte Atout.

## Tour de jeu

1. Le joueur lance 2 dés et avance.
2. Il résout la case :
   - **Région** : il paie d'abord les redevances aux détenteurs de la ressource (voir ci-dessous), puis peut acheter **un** titre de cette ressource à la banque, au prix du marché. S'il refuse, le titre part aux enchères entre tous les joueurs.
   - **Case spéciale** : on applique son effet.
3. Phase libre : échanges et négociations entre joueurs (titres, argent, Atouts), propositions d'alliance.
4. Fin du tour.

## Redevances

- Seuil : il faut détenir **au moins 30 %** d'une ressource (3 titres) pour toucher des redevances.
- Montant payé par le visiteur à chaque détenteur éligible : `prix de base de la ressource x indice de la région x part détenue`.
- Monopole (100 %) : montant doublé.
- Le visiteur ne paie pas sur ses propres titres.

## Marché

- Chaque ressource a un cours qui varie avec les cartes Conjoncture et le nombre de titres déjà vendus (plus la ressource est détenue, plus le titre suivant coûte cher).
- La banque rachète un titre à 50 % du cours (pour lever des fonds).

## Alliances

- Deux joueurs ou plus peuvent signer une alliance pour un nombre de tours fixé.
- Pendant l'alliance, leurs parts d'une même ressource s'additionnent pour franchir le seuil de 30 %, et ils ne se paient pas de redevances entre eux.
- Une alliance ne peut pas inclure le joueur le plus riche (règle anti-leader).

## Faillite et victoire

- Un joueur qui ne peut pas payer vend ses titres à la banque. S'il ne peut toujours pas payer, il est éliminé et ses titres retournent aux enchères.
- Deux modes de victoire au choix de l'hôte :
  - **Classique** : dernier joueur non ruiné.
  - **Chrono** (par défaut, 45 à 60 min) : à la fin du temps ou d'un nombre de tours, le plus grand patrimoine (argent + valeur des titres au cours) gagne.

## Données

Toutes les valeurs (cases, ressources, cartes, prix) vivent dans des fichiers JSON du moteur, pour équilibrer le jeu sans toucher au code.
