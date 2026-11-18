# Plan d'action de développement

Objectif : un jeu de plateau économique sur le thème de la tech (parts d'entreprises), jouable dans le navigateur, à 2-6 joueurs en ligne, en temps réel, avec un lien d'invitation.

## Choix techniques

| Couche | Choix | Pourquoi |
|---|---|---|
| Langage | TypeScript partout | Les règles sont partagées entre client et serveur |
| Monorepo | pnpm workspaces | Simple, un seul `pnpm install` |
| Moteur de jeu | Package `engine` en TS pur, sans dépendance | Testable, déterministe, réutilisé côté serveur et client |
| Serveur | Node.js + Socket.IO | Salles, reconnexion, temps réel, très répandu |
| Client | React + Vite | Rapide à développer, bon écosystème |
| Plateau | 3D avec Three.js (WebGL) | Plateau en relief sur deux anneaux, bâtiments qui grandissent, caméra libre (rotation, zoom) |
| Interface (menus, panneaux, achat de %) | React + CSS par-dessus le canvas | Plus simple à faire en HTML qu'en WebGL, accessible, responsive |
| État client | Zustand | Léger, suffit pour un état reçu du serveur |
| Tests | Vitest (moteur), Playwright (parcours multijoueur) | |
| Persistance | Mémoire au départ, Redis ensuite si besoin de reprise après redémarrage | Pas de base de données au début |
| Déploiement | Image Docker unique (serveur qui sert aussi le client) sur le NAS, publiée par le Cloudflare Tunnel existant sur `jeu.tortuebox.fr` | Pas de coût, pas de port ouvert, HTTPS et WebSocket gérés par Cloudflare |

## Architecture multijoueur

```
navigateur (React)  <-- socket.io -->  serveur Node  --> engine (règles)
      |                                   |
  affiche l'état                    seule source de vérité
  envoie des intentions             valide, applique, diffuse
```

- **Serveur autoritaire** : le client envoie des actions (`ROLL_DICE`, `BUY_CARD`, `OFFER_BUY_FROM_PLAYER`, `ANSWER_OFFER`, `END_TURN`...). Le serveur les valide avec le moteur, calcule le nouvel état et le diffuse à la salle.
- **Moteur en réducteur pur** : `applyAction(state, action) -> state | erreur`. Les dés utilisent un générateur aléatoire à graine stocké dans l'état, donc une partie peut être rejouée et testée.
- **Salles** : création d'une partie avec un code court (ex. `KX4P`), lien à partager, lobby où l'hôte choisit le mode et lance.
- **Identité** : pseudo + jeton stocké dans le navigateur, pas de compte au début. Le jeton permet de se reconnecter à sa place après une coupure.
- **Tour verrouillé** : seul le joueur actif peut acheter ou faire une offre de rachat. Le serveur refuse ces actions venant des autres joueurs.
- **Temps réel** : une offre de rachat attend la réponse du propriétaire avec un minuteur côté serveur (refus automatique à expiration). Un joueur absent trop longtemps joue en automatique (passe son tour, refuse les offres).
- **Info cachée** : les cartes Atout d'un joueur ne sont envoyées qu'à lui (le serveur filtre l'état par joueur).

## Rendu 3D

- Le plateau est une scène Three.js (`apps/client/src/board3d/`) : anneau extérieur de 48 cases, anneau intérieur surélevé de 32 cases, passages lumineux entre les deux, tour de la Bourse au centre.
- La caméra tourne (clic gauche), se déplace (clic droit), zoome (molette) ; double-clic pour recentrer.
- Les bâtiments des villes sont recalculés à chaque changement d'état, selon le % du plus gros détenteur de l'entreprise de redevance.
- Les pions sont les images SVG du garage, posées en sprites sur la case ; un marqueur à la couleur du joueur actif flotte au-dessus de sa case.
- Le moteur de jeu ne connaît que des numéros de case : le rendu isométrique est une couche à part, remplaçable sans toucher aux règles.

## Déploiement sur le NAS

Même infrastructure que Foyer : le NAS (Docker, `/volume1/docker`, `docker-compose.yml` + `.env`) est exposé par un Cloudflare Tunnel (`nas-maison`), sans port ouvert sur la box.

1. Ajouter un service au `docker-compose.yml` du NAS :
   ```yaml
   stonks-valley:
     image: ghcr.io/rycrem/richesse-du-monde:latest
     restart: unless-stopped
     ports:
       - "8090:3000"
   ```
   Le port 8090 est libre à côté de Foyer (8088) ; à ajuster si déjà pris.
2. Dans le tunnel Cloudflare, onglet Routes > Add route > Published application :
   - Subdomain : `jeu`
   - Domain : `tortuebox.fr`
   - Service : `http://localhost:8090`
3. Le WebSocket (Socket.IO) passe par le tunnel sans réglage supplémentaire.
4. L'image est construite par GitHub Actions et publiée sur GitHub Container Registry à chaque merge sur `main`. Mise à jour sur le NAS : `docker compose pull stonks-valley && docker compose up -d stonks-valley`.

## Structure du dépôt

```
apps/
  client/        React + Vite
  server/        Node + Socket.IO
packages/
  engine/        règles, types, données JSON (plateau, entreprises, répartition des % par région et ville, noms parodiques)
  shared/        types des messages réseau
docs/
assets/          visuels originaux + LICENSES.md
```

## Jalons

Chaque jalon = une branche + une PR, testée avant de passer au suivant.

| # | Jalon | Contenu | Livrable vérifiable |
|---|---|---|---|
| 0 | Socle | Monorepo, lint, Vitest, CI GitHub Actions | `pnpm test` vert en CI |
| 1 | Données | Plateau 40 cases (entreprise attribuée à chaque hub), 12 entreprises avec noms et logos parodiques SVG, répartition des % par région et ville, cartes Actu Tech et Atout en JSON | Données validées par des tests (chaque entreprise = 100 % au total) |
| 2 | Moteur | Déplacement, achat de % (max 30 % cumulés), stocks par ville, jetons de redevance aléatoires, paiement proportionnel au plus gros détenteur, cases de choix, rachat entre joueurs, enchères, faillite, victoire | Tests unitaires + partie simulée complète par des bots |
| 3 | Jeu local | Plateau isométrique (tuiles, bâtiments par hub, pions animés, caméra zoom/glisser), panneau joueur avec ses parts par entreprise, fenêtre d'achat avec le stock de la ville et curseurs de % (max 30 % cumulés), plusieurs joueurs sur un même écran | Une partie jouable de bout en bout dans un onglet |
| 4 | En ligne | Serveur, salles avec code, lobby, synchro, reconnexion | 2 navigateurs jouent ensemble, test Playwright |
| 5 | Interactions | Enchères en direct (minuteur 7 s), offres de rachat du joueur actif avec contre-offre, cartes Actu Tech et Atout | Toutes les règles du game design jouables en ligne |
| 6 | Finition | Animations, sons libres de droits, mobile, journal de partie, règles intégrées | Jouable confortablement sur téléphone |
| 7 | Mise en ligne | Dockerfile, service à ajouter au `docker-compose.yml` du NAS, route Cloudflare `jeu.tortuebox.fr` | Partie jouable sur `https://jeu.tortuebox.fr` |

Après le jalon 7, pistes possibles : bots pour compléter une table, classement, reprise de partie après redémarrage du serveur (Redis).

## Assets et propriété intellectuelle

- Aucun élément graphique, nom, logo ou texte du jeu existant n'est réutilisé.
- Entreprises affichées sous des noms modifiés, avec des logos parodiques redessinés de zéro en SVG (aucun fichier de logo officiel importé ou retouché). Voir `02-game-design.md`.
- Les visuels sont faits pour le projet (SVG en code) ou pris dans des banques libres (CC0, licence notée dans `assets/LICENSES.md`).
- Le nom affiché du jeu est un titre original : "Stonks Valley".

## Points à valider avant de coder

Décidé : victoire Classique par défaut, hébergement sur le NAS via Cloudflare Tunnel.

Nom du jeu : "Stonks Valley". Plus rien à préciser avant de coder.
