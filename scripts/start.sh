#!/bin/sh
# Au démarrage du conteneur : récupère la dernière version de la branche depuis git,
# la construit à côté, et ne la met en service que si tout a réussi.
export GIT_TERMINAL_PROMPT=0
REPO="${GIT_REPO:-https://github.com/Rycrem/stonks-valley.git}"
BRANCH="${GIT_BRANCH:-main}"
BASE="${BASE_DIR:-/app}"
LIVE="${LIVE_DIR:-/opt/stonks}"

current() { if [ -d "$LIVE" ]; then echo "$LIVE"; else echo "$BASE"; fi; }
short() { echo "$1" | cut -c1-7; }

update() {
  latest=$(git ls-remote "$REPO" "refs/heads/$BRANCH" | cut -f1)
  [ -n "$latest" ] || { echo "[maj] dépôt injoignable"; return 1; }
  if [ "$latest" = "$(cat "$(current)/.version" 2>/dev/null)" ]; then
    echo "[maj] déjà à jour ($(short "$latest"))"
    return 0
  fi
  echo "[maj] nouvelle version $(short "$latest"), construction..."
  rm -rf "$LIVE.next"
  git clone -q --depth 1 -b "$BRANCH" "$REPO" "$LIVE.next" &&
    (cd "$LIVE.next" && pnpm install --frozen-lockfile && pnpm --filter @stonks/client build) || return 1
  git -C "$LIVE.next" rev-parse HEAD > "$LIVE.next/.version"
  rm -rf "$LIVE" && mv "$LIVE.next" "$LIVE"
  echo "[maj] version $(short "$latest") installée"
}

if [ "${AUTO_UPDATE:-1}" = "1" ]; then
  update || echo "[maj] échec, on garde la version actuelle"
  rm -rf "$LIVE.next"
fi

cd "$(current)" && exec pnpm --filter @stonks/server start
