# Game design : notre version originale

## Pourquoi une version originale

On reprend le système de gestion des ressources du genre (cartes de parts à pourcentage, achat libre, le plus gros détenteur encaisse), mais on ne recopie pas "Richesses du Monde" : ni son nom, ni son plateau, ni ses illustrations, ni le texte de ses cartes, ni ses montants.

- **Thème** : la tech. Les ressources sont des parts d'entreprises technologiques.
- **Nom** : titre de travail "Comptoirs du Globe" (à changer librement).
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
- Chaque carte a un **prix** = cours de l'entreprise x pourcentage. Les entreprises chères (Nvidia, Apple) rapportent plus mais coûtent plus.

## Plateau (40 cases)

- **28 hubs tech** (villes réelles : Silicon Valley, Seattle, Austin, Shenzhen, Taipei, Séoul, Tokyo, Bangalore, Berlin, Paris...). Chaque hub :
  - porte **une seule entreprise attribuée, visible sur le plateau** (logo + couleur sur la case). Quand on tombe sur la case, on paie le joueur qui détient le plus de parts de cette entreprise ;
  - met en vente **plusieurs cartes de parts** de cette entreprise (pourcentages et prix différents), tant qu'elles n'ont pas été achetées.
  - Chaque entreprise a 2 ou 3 hubs sur le plateau (12 entreprises pour 28 hubs), et ses 8 cartes sont réparties entre ces hubs.
- **Départ** : revenu fixe en passant.
- **4 Aéroports** : déplacement optionnel vers un autre aéroport contre paiement.
- **4 Actu Tech** : on pioche une carte événement (hausse ou baisse du cours d'une entreprise, taxe, bonus).
- **2 Krach** : le cours d'une entreprise tirée au hasard chute pour un tour de table.
- **1 Impôts** : taxe proportionnelle au patrimoine.
- **1 Audit** : équivalent "prison", on passe un tour sauf paiement ou carte Atout.

## Tour de jeu

1. **Dés** : le joueur actif lance 2 dés et avance.
2. **Paiement** : il paie le plus gros détenteur de l'entreprise affichée sur la case (voir ci-dessous). Il ne paie pas si c'est lui.
3. **Achats** : le joueur actif, et **lui seul** :
   - achète à la banque **autant de cartes qu'il veut** parmi celles en vente sur la case, s'il a l'argent ;
   - peut proposer de racheter des cartes à **n'importe quel autre joueur**. Le propriétaire accepte, refuse ou fait une contre-offre. Les autres joueurs ne peuvent ni acheter ni lancer d'échange pendant ce tour.
4. **Fin du tour** : on passe au joueur suivant.

## Paiements

- Seul **le plus gros détenteur** d'une entreprise est payé. Les autres détenteurs ne touchent rien.
- Montant = `tarif de base de l'entreprise x (part du plus gros détenteur en %) / 10`.
  - Exemple : tarif 20, détenteur à 40 % : le visiteur paie 80.
- Si un joueur détient **100 %** d'une entreprise : montant doublé.
- **Égalité** : le paiement est divisé à parts égales entre les ex aequo (arrondi à l'unité inférieure, le reste va à la banque).
- Personne ne détient l'entreprise : on ne paie rien.

## Marché

- Chaque entreprise a un cours qui varie avec les cartes Actu Tech et les Krach.
- La banque rachète une carte à 50 % de son prix (pour lever des fonds). La carte retourne en vente sur un hub de l'entreprise.

## Cartes Atout

12 cartes gardées en main, gagnées sur certaines cases Actu Tech : relancer les dés, ne pas payer une fois, sortir d'Audit, forcer la vente d'une carte au prix banque...

## Faillite et victoire

- Un joueur qui ne peut pas payer revend ses cartes à la banque. S'il ne peut toujours pas payer, il est éliminé et ses cartes retournent en vente.
- Deux modes au choix de l'hôte :
  - **Classique** : dernier joueur non ruiné.
  - **Chrono** (par défaut, 45 à 60 min) : à la fin du temps ou d'un nombre de tours, le plus grand patrimoine (argent + valeur des cartes au cours) gagne.

## Noms et logos des entreprises

Choix retenu : **noms modifiés** (colonne "Nom parodique" ci-dessus) et **logos parodiques**.

- Les logos sont **redessinés de zéro en SVG** pour le projet : ils reprennent l'esprit de l'original (couleur dominante, forme générale) avec un détournement visible, mais aucun fichier officiel n'est importé ni retouché. Un logo officiel modifié reste une oeuvre dérivée du dessin d'origine, ce que le dessin maison évite.
- Le style vise la parodie évidente (comme les marques détournées des jeux vidéo) pour qu'aucun joueur ne pense à un partenariat officiel.
- Logos et noms vivent dans les données (`engine/data/companies.json` + `assets/logos/*.svg`) : on peut les retoucher sans toucher au code.
