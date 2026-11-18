# Stonks Valley : game design

## Pourquoi une version originale

Les mécaniques suivent le livret de "Richesses du Monde" fourni par Emeric (achat jusqu'à 6 titres, redevance tirée au hasard par case, cases de choix régional et mondial, enchères forcées, Joker, trusts indivisibles, faillite), adaptées à ses choix (le plus gros détenteur encaisse, rachat par le joueur actif). On ne recopie pas "Richesses du Monde" : ni son nom, ni son plateau, ni ses illustrations, ni le texte de ses cartes, ni ses montants.

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
| Consoles / électronique | Sony | Sonyx |

## Cartes de parts

- Chaque entreprise vaut **100 %**, découpés en 8 cartes : 2 x 5 %, 2 x 10 %, 2 x 15 %, 2 x 20 %.
- Soit **96 cartes** au total.
- Chaque carte indique : l'entreprise, le hub où elle est vendue, son pourcentage, son prix d'achat.
- Prix d'achat = cours de l'entreprise x pourcentage. Les entreprises chères (Nvidio, Appel) rapportent plus mais coûtent plus.
- Les cartes d'une même entreprise détenues par un joueur forment un **trust**. Un trust est **indivisible** : on le vend, l'échange ou le met aux enchères en entier.

## Plateau (40 cases)

Un anneau de 40 cases, en 6 régions de couleur : Amérique du Nord, Amérique latine, Europe, Asie de l'Est, Asie du Sud et Moyen-Orient, Afrique et Océanie.

| Case | Nombre | Effet |
|---|---|---|
| Départ | 1 | Point de départ, pas d'effet |
| Hub tech | 24 (4 par région) | Paiement + achat (voir "Tour de jeu") |
| Choix régional | 3 | Achat jusqu'à 6 cartes dans toute la région, seulement d'entreprises dont on a déjà au moins une carte |
| Choix mondial | 1 | Pareil, dans le monde entier. Valable seulement après un premier tour complet |
| Enchères | 3 | Mise aux enchères forcée (voir "Enchères"). Valable seulement après un premier tour complet |
| Atout | 2 | On peut acheter une carte Atout |
| Actu Tech | 3 | On pioche une carte événement : on reçoit ou on paie une somme |
| Levée de fonds | 3 | On reçoit de la banque (total des dés x un montant fixe) |

**Hubs tech** (villes réelles : Silicon Valley, Seattle, Austin, Shenzhen, Taipei, Séoul, Tokyo, Bangalore, Berlin, Paris...) :
- chaque hub **vend 4 cartes** de parts, d'entreprises différentes (24 hubs x 4 = 96 cartes) ;
- chaque hub porte **une entreprise de redevance, visible sur le plateau** (logo + couleur sur la case). Ces jetons (2 par entreprise, 24 au total) sont **placés au hasard en début de partie**, donc chaque partie a un plateau différent.

## Tour de jeu

1. **Dés** : le joueur actif lance 2 dés et avance. Les doubles n'ont pas d'effet particulier.
2. **Paiement** (hub) : il paie le plus gros détenteur de l'entreprise de redevance de la case (voir "Paiements").
3. **Achats** : le joueur actif, et **lui seul** :
   - achète à la banque **jusqu'à 6 cartes** parmi celles vendues sur la case (ou dans la région / le monde sur les cases de choix) ;
   - peut proposer de racheter un trust à **n'importe quel autre joueur**. Le propriétaire accepte, refuse ou fait une contre-offre (délai de 15 s). Les autres joueurs ne peuvent ni acheter ni lancer de transaction pendant ce tour.
4. **Fin du tour** : on passe au joueur suivant.

## Paiements

- On ne touche des redevances qu'à partir de **30 %** d'une entreprise (comme dans le livret).
- Seul **le plus gros détenteur** est payé. Égalité : le paiement est divisé à parts égales (arrondi à l'unité inférieure, le reste va à la banque).
- Le montant suit un **barème par paliers** propre à chaque entreprise : 30-49 %, 50-69 %, 70-89 %, 90-99 %, 100 %. Le palier 100 % rapporte nettement plus pour récompenser le monopole.
- Le paiement est automatique : pas de délai pour réclamer comme sur la table.

## Enchères

- Le joueur qui tombe sur Enchères lance un dé : il doit mettre aux enchères autant de cartes que le dé indique. Comme un trust est indivisible, s'il n'a que des trusts plus gros, il met le trust entier.
- Mise à prix : **la moitié du prix d'achat**. Surenchère minimum fixe.
- Enchère en temps réel : si personne ne surenchérit pendant **7 secondes**, la dernière offre gagne.
- Aucune offre : la banque rachète à la moitié du prix, et les cartes retournent en vente sur leur hub.
- Une carte **Atout** (achetée sur une case Atout) dispense une fois de la mise aux enchères. Elle ne se vend pas et ne s'échange pas.
- Quand il ne reste que 2 joueurs, Enchères et Atout deviennent des cases de repos.

## Argent

- Chaque joueur commence avec la même somme (valeurs à équilibrer, toutes dans le JSON).
- La banque rachète un trust à la moitié de son prix d'achat. Les cartes retournent en vente sur leur hub.

## Faillite et victoire

- Un joueur qui ne peut pas payer une dette est en faillite : la banque couvre la dette, ses cartes retournent en vente sur leur hub, il est éliminé.
- **Classique** (par défaut) : le dernier joueur en jeu gagne. Les autres sont classés par ordre d'élimination.
- **Chrono** (option, 45 à 60 min) : à la fin du temps, le plus grand patrimoine (argent + valeur des cartes) gagne.

## Pas repris du livret

- Payer la banque sur un double (à la demande d'Emeric).
- L'Association entre joueurs : peut revenir plus tard comme variante.
- Le délai de 7 secondes pour réclamer ses redevances : remplacé par un paiement automatique.

## Noms et logos des entreprises

Choix retenu : **noms modifiés** (colonne "Nom parodique" ci-dessus) et **logos parodiques**.

- Les logos sont **redessinés de zéro en SVG** pour le projet : ils reprennent l'esprit de l'original (couleur dominante, forme générale) avec un détournement visible, mais aucun fichier officiel n'est importé ni retouché. Un logo officiel modifié reste une oeuvre dérivée du dessin d'origine, ce que le dessin maison évite.
- Le style vise la parodie évidente (comme les marques détournées des jeux vidéo) pour qu'aucun joueur ne pense à un partenariat officiel.
- Logos et noms vivent dans les données (`engine/data/companies.json` + `assets/logos/*.svg`) : on peut les retoucher sans toucher au code.
