# Stonks Valley : game design

## Pourquoi une version originale

Les mécaniques suivent le livret de "Richesses du Monde" fourni par Emeric (redevance tirée au hasard par case, cases de choix régional et mondial, enchères forcées, Joker, faillite), adaptées à ses choix : pas de cartes, on achète directement des pourcentages ; le plus gros détenteur encaisse ; seul le joueur actif achète. On ne recopie pas "Richesses du Monde" : ni son nom, ni son plateau, ni ses illustrations, ni le texte de ses cartes, ni ses montants.

- **Thème** : la tech. Les ressources sont des parts d'entreprises technologiques.
- **Nom** : "Stonks Valley".
- **Visuels** : illustrations, pions, icônes, billets et logos parodiques dessinés pour le projet (SVG maison, ou banques libres CC0 avec la licence notée dans `assets/LICENSES.md`).
- **Chiffres** : prix et paiements équilibrés par nos propres tests.

## Les entreprises (ressources)

12 entreprises tech, affichées sous leur nom parodique avec un logo parodique (voir "Noms et logos" plus bas). La colonne "Nom réel" sert seulement de référence. Toutes les valeurs sont dans un fichier JSON.

| Secteur | Nom réel | Nom parodique |
|---|---|---|
| Cartes graphiques / IA | Nvidia | Nvidio |
| Processeurs | AMD | AMB |
| Processeurs | Intel | Intol |
| Fonderie de puces | TSMC | TSMB |
| Smartphones | Apple | Appel |
| Smartphones | Samsung | Samsong |
| Cloud / e-commerce | Amazon | Amazone |
| Logiciels / cloud | Microsoft | Macrosoft |
| Recherche / pub | Google | Gogol |
| Réseaux sociaux | Meta | Méto |
| Voitures électriques | Tesla | Tesler |
| Consoles / électronique | Son## Parts en pourcentage (pas de cartes)

- Chaque entreprise vaut **100 %**. Il n'y a pas de cartes : un joueur détient simplement un pourcentage de chaque entreprise (ex. 35 % d'AMB, 10 % de Nvidio).
- Les 100 % de chaque entreprise sont **répartis entre les régions, puis entre les villes** de ces régions.
  - Exemple : l'Europe détient 50 % d'AMB et 30 % de Nvidio, répartis entre ses villes. Paris en a 20 % d'AMB et 10 % de Nvidio.
- Chaque ville a donc un **stock** : la liste des entreprises qu'on peut y acheter, avec le pourcentage restant de chacune. Le stock baisse au fil des achats.
- Prix = cours de l'entreprise (prix pour 1 %) x pourcentage acheté. Les entreprises chères (Nvidio, Appel) rapportent plus mais coûtent plus.
- Achat par tranches de 1 %.

## Plateau (40 cases)

Un anneau de 40 cases, en 6 régions de couleur : Amérique du Nord, Amérique latine, Europe, Asie de l'Est, Asie du Sud et Moyen-Orient, Afrique et Océanie.

| Case | Nombre | Effet |
|---|---|---|
| Départ | 1 | Point de départ, pas d'effet |
| Ville tech | 24 (4 par région) | Paiement + achat (voir "Tour de jeu") |
| Choix régional | 3 | Achat dans le stock de toutes les villes de la région, seulement d'entreprises dont on détient déjà au moins 1 % |
| Choix mondial | 1 | Pareil, dans le monde entier. Valable seulement après un premier tour complet |
| Enchères | 3 | Mise aux enchères forcée (voir "Enchères"). Valable seulement après un premier tour complet |
| Atout | 2 | On peut acheter une carte Atout |
| Actu Tech | 3 | On pioche une carte événement : on reçoit ou on paie une somme |
| Levée de fonds | 3 | On reçoit de la banque (total des dés x un montant fixe) |

**Villes tech** (villes réelles : Silicon Valley, Seattle, Austin, Shenzhen, Taipei, Séoul, Tokyo, Bangalore, Berlin, Paris...). Chaque ville affiche :
- son **stock** : les entreprises disponibles et le % restant de chacune (ex. Paris : AMB 20 %, Nvidio 10 %) ;
- son **entreprise de redevance**, visible sur le plateau (logo + couleur sur la case). Ces jetons (2 par entreprise, 24 au total) sont **placés au hasard en début de partie**, donc chaque partie a un plateau différent.

Toute la répartition (quelle région et quelle ville détient combien de % de chaque entreprise) est dans un fichier JSON, facile à rééquilibrer.

## Tour de jeu

1. **Dés** : le joueur actif lance 2 dés et avance. Les doubles n'ont pas d'effet particulier.
2. **Paiement** (ville) : il paie le plus gros détenteur de l'entreprise de redevance de la case (voir "Paiements").
3. **Achats** : le joueur actif, et **lui seul** :
   - voit le stock de la case (ex. "Paris : AMB 20 %, Nvidio 10 %") et choisit combien de % il achète de chaque entreprise, **au maximum 30 % cumulés** par achat (ex. 20 % d'AMB + 10 % de Nvidio, ou 15 % + 5 %...) ;
   - peut proposer de racheter un pourcentage à **n'importe quel autre joueur** (ex. 10 % de ses Nvidio pour 3 M). Le propriétaire accepte, refuse ou fait une contre-offre (délai de 15 s). Les autres joueurs ne peuvent ni acheter ni lancer de transaction pendant ce tour.
4. **Fin du tour** : on passe au joueur suivant.

## Paiements

- **Pas de seuil** : dès 1 %, on peut être payé.
- Seul **le plus gros détenteur** est payé. Égalité : le paiement est divisé à parts égales (arrondi à l'unité inférieure, le reste va à la banque).
- **Plus on détient de %, plus on est payé** : montant = tarif de l'entreprise x % détenu par le plus gros détenteur.
  - Exemple : tarif 0,1 M par %, détenteur à 40 % : le visiteur paie 4 M.
- Bonus monopole : à **100 %**, le montant est doublé.
- Le paiement est automatique.

## Enchères

- Le joueur qui tombe sur Enchères lance un dé et doit mettre aux enchères **dé x 5 %** de ses parts (ex. dé à 3 : 15 %), pris dans une seule entreprise de son choix. S'il en a moins, il met tout ce qu'il a de cette entreprise.
- Mise à prix : **la moitié du prix d'achat**. Surenchère minimum fixe.
- Enchère en temps réel : si personne ne surenchérit pendant **7 secondes**, la dernière offre gagne.
- Aucune offre : la banque rachète à la moitié du prix, et les % retournent dans le stock des villes.
- Une carte **Atout** (achetée sur une case Atout) dispense une fois de la mise aux enchères. Elle ne se vend pas et ne s'échange pas.
- Quand il ne reste que 2 joueurs, Enchères et Atout deviennent des cases de repos.

## Argent

- Chaque joueur commence avec la même somme (valeurs à équilibrer, toutes dans le JSON).
- Un joueur peut revendre à la banque n'importe quel % à la moitié du prix d'achat. Les % retournent dans le stock des villes d'origine de l'entreprise.

## Faillite et victoire

- Un joueur qui ne peut pas payer une dette est en faillite : la banque couvre la dette, ses parts retournent dans le stock des villes, il est éliminé.
- **Classique** (par défaut) : le dernier joueur en jeu gagne. Les autres sont classés par ordre d'élimination.
- **Chrono** (option, 45 à 60 min) : à la fin du temps, le plus grand patrimoine (argent + valeur des parts) gagne.

## Pas repris du livret

- Les cartes / titres d'exploitation : remplacés par des pourcentages directs.
- Le seuil de 30 % pour toucher des redevances.
- Payer la banque sur un double.
- L'Association entre joueurs : peut revenir plus tard comme variante.
- Le délai de 7 secondes pour réclamer ses redevances : remplacé par un paiement automatique.

utomatique.

## Noms et logos des entreprises

Choix retenu : **noms modifiés** (colonne "Nom parodique" ci-dessus) et **logos parodiques**.

- Les logos sont **redessinés de zéro en SVG** pour le projet : ils reprennent l'esprit de l'original (couleur dominante, forme générale) avec un détournement visible, mais aucun fichier officiel n'est importé ni retouché. Un logo officiel modifié reste une oeuvre dérivée du dessin d'origine, ce que le dessin maison évite.
- Le style vise la parodie évidente (comme les marques détournées des jeux vidéo) pour qu'aucun joueur ne pense à un partenariat officiel.
- Logos et noms vivent dans les données (`engine/data/companies.json` + `assets/logos/*.svg`) : on peut les retoucher sans toucher au code.
