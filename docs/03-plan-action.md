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
| Plateau | 2D isométrique avec PixiJS (WebGL), intégré dans React via `@pixi/react` | Rendu rapide de nombreuses tuiles et sprites, animations fluides (pions, dés, pièces), zoom et déplacement de caméra |
| Interface (menus, panneaux, cartes) | React + CSS par-dessus le canvas | Plus simple à faire en HTML qu'en WebGL, accessible, responsive |
| État client | Zustand | Léger, suffit pour un état reçu du serveur |
| Tests | Vitest (moteur), Playwright (parcours multijoueur) | |
| Persistance | Mémoire au départ, Redis ensuite si besoin de reprise après redémarrage | Pas de base de données au début |
| Déploiement | Image Docker unique (serveur qui sert aussi le client) sur le NAS, publiée par le Cloudflare Tunnel existant sur `jeu.tortuebox.com` | Pas de coût, pas de port ouvert, HTTPS et WebSocket gérés par Cloudflare |

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

## Rendu isométrique

- Le plateau reste un anneau de 40 cases, posé sur une grille isométrique (projection 2:1, tuiles losanges de 128 x 64 px).
- Chaque hub est une tuile avec un petit bâtiment aux couleurs et au logo parodique de son entreprise, et une étiquette lisible au survol.
- Le centre du plateau sert de décor (carte du monde stylisée) et affiche le dé et les événements.
- Le tri en profondeur des sprites se fait par `x + y` de la grille pour que pions et bâtiments se superposent correctement.
- Les sprites sont dessinés en SVG puis convertis en images (atlas) au build, pour garder des visuels maison nets sur écran haute densité.
- Le moteur de jeu ne connaît que des numéros de case : le rendu isométrique est une couche à part, remplaçable sans toucher aux règles.

## Déploiement sur le NAS

Même infrastructure que Foyer : le NAS (Docker, `/volume1/docker`, `docker-compose.yml` + `.env`) est exposé par un Cloudflare Tunnel (`nas-maison`), sans port ouvert sur la box.

1. Ajouter un service au `docker-compose.yml` du NAS :
   ```yaml
   comptoirs:
     image: ghcr.io/rycrem/richesse-du-monde:latest
     restart: unless-stopped
     ports:
       - "8090:3000"
   ```
   Le port 8090 est libre à côté de Foyer (8088) ; à ajuster si déjà pris.
2. Dans le tunnel Cloudflare, onglet Routes > Add route > Published application :
   - Subdomain : `jeu`
   - Domain : `tortuebox.com`
   - Service : `http://localhost:8090`
3. Le WebSocket (Socket.IO) passe par le tunnel sans réglage supplémentaire.
4. L'image est construite par GitHub Actions et publiée sur GitHub Container Registry à chaque merge sur `main`. Mise à jour sur le NAS : `docker compose pull comptoirs && docker compose up -d comptoirs`.

## Structure du dépôt

```
apps/
  client/        React + Vite
  server/        Node + Socket.IO
packages/
  engine/        règles, types, données JSON (plateau, entreprises, cartes, noms réels/parodiques)
  shared/        types des messages réseau
docs/
assets/          visuels originaux + LICENSES.md
```

## Jalons

Chaque jalon = une branche + une PR, testée avant de passer au suivant.

| # | Jalon | Contenu | Livrable vérifiable |
|---|---|---|---|
| 0 | Socle | Monorepo, lint, Vitest, CI GitHub Actions | `pnpm test` vert en CI |
| 1 | Données | Plateau 40 cases (entreprise attribuée à chaque hub), 12 entreprises avec noms et logos parodiques SVG, 96 cartes de parts, cartes Actu Tech et Atout en JSON | Données validées par des tests (chaque entreprise = 100 %) |
| 2 | Moteur | Déplacement, achat libre, paiement au plus gros détenteur, rachat entre joueurs, faillite, victoire | Tests unitaires + partie simulée complète par des bots |
| 3 | Jeu local | Plateau isométrique (tuiles, bâtiments par hub, pions animés, caméra zoom/glisser), panneau joueur avec ses parts par entreprise, achat des cartes de la case, plusieurs joueurs sur un même écran | Une partie jouable de bout en bout dans un onglet |
| 4 | En ligne | Serveur, salles avec code, lobby, synchro, reconnexion | 2 navigateurs jouent ensemble, test Playwright |
| 5 | Interactions | Offres de rachat du joueur actif avec contre-offre, cartes Actu Tech et Atout | Toutes les règles du game design jouables en ligne |
| 6 | Finition | Animations, sons libres de droits, mobile, journal de partie, règles intégrées | Jouable confortablement sur téléphone |
| 7 | Mise en ligne | Dockerfile, service à ajouter au `docker-compose.yml` du NAS, route Cloudflare `jeu.tortuebox.com` | Partie jouable sur `https://jeu.tortuebox.com` |

Après le jalon 7, pistes possibles : bots pour compléter une table, classement, reprise de partie après redémarrage du serveur (Redis).

## Assets et propriété intellectuelle

- Aucun élément graphique, nom, logo ou texte du jeu existant n'est réutilisé.
- Entreprises affichées sous des noms modifiés, avec des logos parodiques redessinés de zéro en SVG (aucun fichier de logo officiel importé ou retouché). Voir `02-game-design.md`.
- Les visuels sont faits pour le projet (SVG en code) ou pris dans des banques libres (CC0, licence notée dans `assets/LICENSES.md`).
- Le nom affiché du jeu est un titre original ("Comptoirs du Globe" en attendant mieux).

## Points à valider avant de coder

Décidé : victoire Classique par défaut, hébergement sur le NAS via Cloudflare Tunnel.

Reste à préciser : le nom affiché du jeu (peut attendre).
