import { activePlayers, allianceOf, board, buyableStock, config, currentPlayer, netWorth, ranking, type GameState } from "@stonks/engine";
import { useEffect, useState } from "react";
import { companyById, money, PLAYER_COLORS } from "./format";
import { AnimatedMoney } from "./Overlay";
import { useStore } from "./store";

export function GamePanel({ game }: { game: GameState }) {
  const { dispatch, error, clearError, quit, you, room } = useStore();
  const me = currentPlayer(game);
  const canAct = (id: string) => you === null || you === id;
  const myTurn = canAct(me.id);
  const cell = board[me.position]!;
  const colorOf = (id: string) => PLAYER_COLORS[game.players.findIndex((p) => p.id === id)]!;
  const nameOf = (id: string) => game.players.find((p) => p.id === id)!.name;
  // phones: the panel is a bottom sheet that can be pulled up
  const [expanded, setExpanded] = useState(false);

  if (game.phase === "gameOver") {
    return (
      <aside className="panel">
        <h2>Partie terminée</h2>
        <p className="big">{nameOf(game.winner!)} gagne !</p>
        {room?.rewards && (
          <div className="card rewards">
            <h3>Points gagnés</h3>
            {ranking(game).map((id, i) => (
              <div className="row" key={id}>
                <span>{i + 1}.</span>
                <strong>{nameOf(id)}</strong>
                <span className="spacer" />
                <span className="points">+{room.rewards![id]} pts</span>
              </div>
            ))}
          </div>
        )}
        <Players game={game} colorOf={colorOf} />
        <button className="primary" onClick={quit}>
          Nouvelle partie
        </button>
      </aside>
    );
  }

  return (
    <aside className={`panel ${expanded ? "expanded" : ""}`}>
      <button className="sheet-handle" aria-label={expanded ? "Réduire le panneau" : "Agrandir le panneau"} onClick={() => setExpanded(!expanded)}>
        <i />
      </button>
      <div className="turn" style={{ borderColor: colorOf(me.id) }}>
        <span className="dot" style={{ background: colorOf(me.id) }} />
        Au tour de <strong>{me.name}</strong>
      </div>

      {error && (
        <div className="error" onClick={clearError}>
          {error}
        </div>
      )}

      {game.phase === "roll" && myTurn && (
        <button className="primary" onClick={() => dispatch({ type: "ROLL", playerId: me.id })}>
          Lancer les dés
        </button>
      )}
      {!myTurn && game.phase !== "auction" && !game.offer && <p className="muted">En attente de {me.name}...</p>}

      {game.phase !== "roll" && (
        <div className="card">
          <h3>{cell.name}</h3>
          {cell.type === "city" && <p>Redevance : {companyById.get(game.royalties[cell.id]!)!.name}</p>}
        </div>
      )}

      {game.phase === "auction" && <p className="muted">Enchères en cours sur le plateau...</p>}
      {me.cash < 0 && game.phase === "act" && <DebtPanel game={game} />}

      {game.phase === "act" && !game.offer && myTurn && (
        <>
          {game.buyScope && <BuyPanel game={game} />}
          {game.canBuyAtout && (
            <button onClick={() => dispatch({ type: "BUY_ATOUT", playerId: me.id })}>Acheter un Atout ({money(config.atoutPrice)})</button>
          )}
          <OfferForm game={game} />
          <SellForm game={game} />
          <button className="primary" onClick={() => dispatch({ type: "END_TURN", playerId: me.id })}>
            Fin du tour
          </button>
        </>
      )}

      {game.offer && <OfferPanel game={game} nameOf={nameOf} />}

      {you && <AlliancePanel game={game} you={you} nameOf={nameOf} />}

      <Players game={game} colorOf={colorOf} />

      <div className="log">
        {game.log.slice(-6).map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>

      {game.mode === "chrono" && (!room || you === room.hostId) && (
        <button className="ghost" onClick={() => dispatch({ type: "END_GAME" })}>
          Arrêter la partie (le plus riche gagne)
        </button>
      )}
    </aside>
  );
}

// Online only: each player manages their own alliance
function AlliancePanel({ game, you, nameOf }: { game: GameState; you: string; nameOf: (id: string) => string }) {
  const dispatch = useStore((s) => s.dispatch);
  const mine = allianceOf(game, you);
  const invites = game.allianceInvites.filter((i) => i.to === you);
  const sent = game.allianceInvites.filter((i) => i.from === you).map((i) => i.to);
  const alive = activePlayers(game);
  const room = (mine?.members.length ?? 1) + 1 < alive.length;
  const candidates = alive.filter((p) => p.id !== you && !allianceOf(game, p.id) && !sent.includes(p.id));
  const [target, setTarget] = useState("");
  if (game.players.find((p) => p.id === you)?.bankrupt) return null;
  return (
    <details className="card" open={invites.length > 0 || !!mine}>
      <summary>Alliance{mine ? ` : ${mine.members.map(nameOf).join(", ")}` : ""}</summary>
      <p className="muted">Les alliés additionnent leurs % pour être le plus gros détenteur, se partagent la redevance selon leurs % et ne se paient pas entre eux.</p>
      {invites.map((i) => (
        <div key={i.from} className="alliance-box">
          <span>
            <strong>{nameOf(i.from)}</strong> te propose une alliance
          </span>
          <div className="row">
            <button className="primary" onClick={() => dispatch({ type: "ALLIANCE_ANSWER", playerId: you, fromId: i.from, accept: true })}>
              Accepter
            </button>
            <button onClick={() => dispatch({ type: "ALLIANCE_ANSWER", playerId: you, fromId: i.from, accept: false })}>Refuser</button>
          </div>
        </div>
      ))}
      {sent.length > 0 && <small className="muted">En attente : {sent.map(nameOf).join(", ")}</small>}
      {room && candidates.length > 0 && (
        <div className="row">
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Choisir un joueur</option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button disabled={!target} onClick={() => dispatch({ type: "ALLIANCE_INVITE", playerId: you, targetId: target }) && setTarget("")}>
            Proposer
          </button>
        </div>
      )}
      {mine && <button onClick={() => dispatch({ type: "ALLIANCE_LEAVE", playerId: you })}>Quitter l'alliance</button>}
    </details>
  );
}

function Players({ game, colorOf }: { game: GameState; colorOf: (id: string) => string }) {
  const { room, you, dispatch, setInspect } = useStore();
  const offline = new Set(room?.players.filter((p) => !p.connected).map((p) => p.id));
  const alive = activePlayers(game);
  const mine = you ? allianceOf(game, you) : null;
  const sent = game.allianceInvites.filter((i) => i.from === you).map((i) => i.to);
  const canInvite = (id: string) =>
    you !== null &&
    id !== you &&
    !game.players.find((p) => p.id === you)?.bankrupt &&
    (mine?.members.length ?? 1) + 1 < alive.length &&
    alive.some((p) => p.id === id) &&
    !allianceOf(game, id) &&
    !sent.includes(id);
  return (
    <div className="players">
      {game.players.map((p) => (
        <div key={p.id} className={`player ${p.bankrupt ? "out" : ""}`}>
          <div className="row">
            <span className="dot" style={{ background: colorOf(p.id) }} />
            <strong>{p.name}</strong>
            {offline.has(p.id) && <span className="offline">déconnecté</span>}
            {allianceOf(game, p.id) && <span className="chip alliance">Alliance {allianceOf(game, p.id)!.id.slice(1)}</span>}
            {sent.includes(p.id) && <small className="muted">invité</small>}
            {canInvite(p.id) && (
              <button className="ally-btn" title="Proposer une alliance" onClick={() => dispatch({ type: "ALLIANCE_INVITE", playerId: you!, targetId: p.id })}>
                Alliance ?
              </button>
            )}
            <span className="spacer" />
            {p.bankrupt ? "en faillite" : <AnimatedMoney value={p.cash} />}
          </div>
          <div className="chips">
            {Object.entries(p.holdings)
              .sort((a, b) => b[1] - a[1])
              .map(([c, pct]) => (
                <span key={c} className="chip clickable" style={{ background: companyById.get(c)!.color }} onClick={() => setInspect({ company: c })}>
                  <img src={`/logos/${c}.svg`} alt="" />
                  {companyById.get(c)!.name} {pct} %
                </span>
              ))}
            {p.atouts > 0 && <span className="chip atout">Atout x{p.atouts}</span>}
          </div>
          {!p.bankrupt && <small>Patrimoine : {money(netWorth(p))}</small>}
        </div>
      ))}
    </div>
  );
}

function BuyPanel({ game }: { game: GameState }) {
  const dispatch = useStore((s) => s.dispatch);
  const inspect = useStore((s) => s.setInspect);
  const me = currentPlayer(game);
  const stock = buyableStock(game);
  const left = config.maxPurchasePercent - game.boughtThisTurn;
  const [wanted, setWanted] = useState<Record<string, number>>({});
  useEffect(() => setWanted({}), [game.current, game.phase, me.position]);

  const total = Object.values(wanted).reduce((a, b) => a + b, 0);
  const cost = Object.entries(wanted).reduce((a, [c, p]) => a + companyById.get(c)!.pricePerPercent * p, 0);
  const entries = Object.entries(stock);

  if (entries.length === 0) return <p className="muted">Rien à acheter ici.</p>;
  return (
    <div className="card">
      <h3>Acheter des parts</h3>
      <p className="muted">Encore {left} % achetables ce tour.</p>
      {entries.map(([c, available]) => {
        const company = companyById.get(c)!;
        const allowed = Math.min(available, left - total + (wanted[c] ?? 0));
        return (
          <div key={c} className="buy-row">
            <span className="chip clickable" style={{ background: company.color }} onClick={() => inspect({ company: c })}>
              <img src={`/logos/${c}.svg`} alt="" />
              {company.name}
            </span>
            <input
              type="range"
              min={0}
              max={available}
              value={wanted[c] ?? 0}
              onChange={(e) => setWanted({ ...wanted, [c]: Math.min(allowed, Number(e.target.value)) })}
            />
            <span>
              {wanted[c] ?? 0} / {available} %
            </span>
            <small>
              {money(company.pricePerPercent)} / % · rapporte {money(company.royaltyPerPercent)} / % à chaque passage
              {wanted[c]
                ? ` · avec ${(me.holdings[c] ?? 0) + wanted[c]!} %, tu toucherais ${money(company.royaltyPerPercent * ((me.holdings[c] ?? 0) + wanted[c]!))} par passage en étant le plus gros détenteur`
                : ""}
            </small>
          </div>
        );
      })}
      <button
        className={`buy-btn ${cost <= me.cash ? "afford" : "broke"}`}
        disabled={total === 0 || cost > me.cash}
        onClick={() => dispatch({ type: "BUY", playerId: me.id, purchases: wanted }) && setWanted({})}
      >
        Acheter {total} % pour {money(cost)}
      </button>
    </div>
  );
}

function OfferForm({ game }: { game: GameState }) {
  const dispatch = useStore((s) => s.dispatch);
  const me = currentPlayer(game);
  const others = game.players.filter((p) => p.id !== me.id && !p.bankrupt && Object.keys(p.holdings).length > 0);
  const [ownerId, setOwnerId] = useState("");
  const [company, setCompany] = useState("");
  const [percent, setPercent] = useState(5);
  const [price, setPrice] = useState(500);
  if (others.length === 0) return null;
  const owner = others.find((p) => p.id === ownerId) ?? others[0]!;
  const holdings = Object.keys(owner.holdings);
  const co = holdings.includes(company) ? company : holdings[0]!;

  return (
    <details className="card">
      <summary>Racheter des parts à un joueur</summary>
      <select value={owner.id} onChange={(e) => setOwnerId(e.target.value)}>
        {others.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select value={co} onChange={(e) => setCompany(e.target.value)}>
        {holdings.map((c) => (
          <option key={c} value={c}>
            {companyById.get(c)!.name} ({owner.holdings[c]} %)
          </option>
        ))}
      </select>
      <label>
        % <input type="number" min={1} max={owner.holdings[co]} value={percent} onChange={(e) => setPercent(Number(e.target.value))} />
      </label>
      <label>
        Prix <input type="number" min={0} step={100} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
      </label>
      <button onClick={() => dispatch({ type: "OFFER", playerId: me.id, ownerId: owner.id, company: co, percent, price })}>Proposer</button>
    </details>
  );
}

function OfferPanel({ game, nameOf }: { game: GameState; nameOf: (id: string) => string }) {
  const { dispatch, you } = useStore();
  const o = game.offer!;
  const [counter, setCounter] = useState(o.price);
  useEffect(() => setCounter(o.price), [o.price]);
  return (
    <div className="card highlight">
      <h3>Offre de rachat</h3>
      <p>
        {nameOf(o.buyerId)} veut acheter {o.percent} % de {companyById.get(o.company)!.name} à {nameOf(o.ownerId)} pour {money(o.price)}.
      </p>
      <p>
        Réponse attendue de <strong>{nameOf(o.awaiting)}</strong>
      </p>
      <Countdown />
      {(you === null || you === o.awaiting) && (
      <>
      <div className="row">
        <button className="primary" onClick={() => dispatch({ type: "RESPOND_OFFER", playerId: o.awaiting, accept: true })}>
          Accepter
        </button>
        <button onClick={() => dispatch({ type: "RESPOND_OFFER", playerId: o.awaiting, accept: false })}>Refuser</button>
      </div>
      <div className="row">
        <input type="number" min={0} step={100} value={counter} onChange={(e) => setCounter(Number(e.target.value))} />
        <button onClick={() => dispatch({ type: "RESPOND_OFFER", playerId: o.awaiting, accept: false, counterPrice: counter })}>Contre-offre</button>
      </div>
      </>
      )}
    </div>
  );
}

// Short of cash after a payment: the player chooses what to sell to the bank
function DebtPanel({ game }: { game: GameState }) {
  const { dispatch, you } = useStore();
  const me = currentPlayer(game);
  if (you !== null && you !== me.id) return <p className="muted">{me.name} doit vendre des actions pour payer sa dette.</p>;
  const ratio = config.bankBuybackRatio;
  return (
    <div className="card highlight debt">
      <h3>Dette : {money(-me.cash)}</h3>
      <p className="muted">Choisis quelles actions revendre à la banque ({ratio * 100} % du prix) pour revenir à 0.</p>
      {Object.entries(me.holdings).map(([c, pct]) => {
        const co = companyById.get(c)!;
        const per = co.pricePerPercent * ratio;
        const needed = Math.min(pct, Math.ceil(-me.cash / per));
        return (
          <div key={c} className="row debt-row">
            <span className="chip" style={{ background: co.color }}>
              <img src={`/logos/${c}.svg`} alt="" />
              {co.name} {pct} %
            </span>
            <span className="spacer" />
            <button onClick={() => dispatch({ type: "SELL_TO_BANK", playerId: me.id, company: c, percent: 1 })}>1 %</button>
            <button onClick={() => dispatch({ type: "SELL_TO_BANK", playerId: me.id, company: c, percent: needed })}>{needed} %</button>
          </div>
        );
      })}
      <button onClick={() => dispatch({ type: "SETTLE_DEBT", playerId: me.id })}>Vendre automatiquement (les moins chères d'abord)</button>
    </div>
  );
}

function SellForm({ game }: { game: GameState }) {
  const dispatch = useStore((s) => s.dispatch);
  const me = currentPlayer(game);
  const holdings = Object.keys(me.holdings);
  const [company, setCompany] = useState("");
  const [percent, setPercent] = useState(1);
  if (holdings.length === 0) return null;
  const co = holdings.includes(company) ? company : holdings[0]!;
  const value = Math.floor(companyById.get(co)!.pricePerPercent * percent * config.bankBuybackRatio);
  return (
    <details className="card">
      <summary>Revendre à la banque (75 % du prix)</summary>
      <select value={co} onChange={(e) => setCompany(e.target.value)}>
        {holdings.map((c) => (
          <option key={c} value={c}>
            {companyById.get(c)!.name} ({me.holdings[c]} %)
          </option>
        ))}
      </select>
      <input type="number" min={1} max={me.holdings[co]} value={percent} onChange={(e) => setPercent(Number(e.target.value))} />
      <button onClick={() => dispatch({ type: "SELL_TO_BANK", playerId: me.id, company: co, percent })}>Vendre pour {money(value)}</button>
    </details>
  );
}

function Countdown({ prefix = "Expire dans" }: { prefix?: string }) {
  const deadline = useStore((s) => s.room?.deadline ?? null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  if (!deadline) return null;
  return (
    <p className="timer">
      {prefix} {Math.max(0, Math.ceil((deadline - now) / 1000))} s
    </p>
  );
}
