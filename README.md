# Stonks Valley

Jeu de plateau économique sur le thème de la tech, jouable à plusieurs dans le navigateur.

## Développement

```sh
corepack enable
pnpm install
pnpm test
pnpm typecheck
```

Documentation du projet : `docs/` (sur la branche du plan).

## En ligne

```sh
pnpm build
pnpm --filter @stonks/server start   # http://localhost:3000
```

## Déploiement sur le NAS

Chaque merge sur `main` publie l'image `ghcr.io/rycrem/stonks-valley:latest` (amd64 et arm64).

1. Ajouter le bloc de `docker-compose.example.yml` au `docker-compose.yml` du NAS (`/volume1/docker`).
2. `docker compose pull stonks-valley && docker compose up -d stonks-valley`
3. Dans le tunnel Cloudflare `nas-maison` : Routes > Add route > Published application, Subdomain `jeu`, Domain `tortuebox.fr`, Service `http://localhost:8090`.

Mise à jour : relancer l'étape 2.

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `ADMIN_PASSWORD` | Mot de passe du compte admin. Le pseudo admin (`ADMIN_USER`, par défaut `Rycrem`) ne peut être créé qu'avec ce mot de passe. Sans cette variable, le pseudo reste réservé. |
| `PUBLIC_URL` | Adresse du site, utilisée dans les liens de réinitialisation (`https://jeu.tortuebox.fr`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Envoi des e-mails "mot de passe oublié". Facultatif : sans SMTP, l'admin réinitialise les mots de passe à la main. |
| `DATA_DIR` | Dossier des profils (`/data` dans l'image) |
