import { board, buyableStock, config, currentPlayer, netWorth, type GameState } from "@stonks/engine";
import { useEffect, useState } from "react";
import { companyById, money, PLAYER_COLORS } from "./format";
import { useStore } from "./store";

export function GamePanel({ game }: { game: GameState }) {
  const { dispatch, error, clearError, quit, you, room } = useStore();
  const me = currentPlayer(game);
  const canAct = (id: string) => you === null || you === id;
  const myTurn = canAct(me.id);
  const cell = board[me.position]!;
  const colorOf = (id: string) => PLAYER_COLORS[game.players.findIndex((p) => p.id === id)]!;
  const nameOf = (id: string) => game.players.find((p) => p.id === id)!.name;

  if (game.phase === "gameOver") {
    return (
      <aside className="panel">
        <h2>Partie terminée</h2>
        <p className="big">{nameOf(game.winner!)} gagne !</p>
        <Players game={game} colorOf={colorOf} />
        <button className="primary" onClick={quit}>
          Nouvelle partie
        </button>
      </aside>
    );
  }

  return (
    <aside className="panel">
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

      {game.phase === "auction" && <AuctionPanel game={game} nameOf={nameOf} />}

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

      <Players game={game} colorOf={colorOf} />

      <div className="log">
        {game.log.slice(-6).map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>

      {game.mode === "chrono" && (you === null || you === room?.hostId) && (
        <button className="ghost" onClick={() => dispatch({ type: "END_GAME" })}>
          Arrêter la partie (le plus riche gagne)
        </button>
      )}
    </aside>
  );
}

function Players({ game, colorOf }: { game: GameState; colorOf: (id: string) => string }) {
  const room = useStore((s) => s.room);
  const offline = new Set(room?.players.filter((p) => !p.connected).map((p) => p.id));
  return (
    <div className="players">
      {game.players.map((p) => (
        <div key={p.id} className={`player ${p.bankrupt ? "out" : ""}`}>
          <div className="row">
            <span className="dot" style={{ background: colorOf(p.id) }} />
            <strong>{p.name}</strong>
            {offline.has(p.id) && <span className="offline">déconnecté</span>}
            <span className="spacer" />
            {p.bankrupt ? "en faillite" : money(p.cash)}
          </div>
          <div className="chips">
            {Object.entries(p.holdings)
              .sort((a, b) => b[1] - a[1])
              .map(([c, pct]) => (
                <span key={c} className="chip" style={{ background: companyById.get(c)!.color }}>
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
        const max = Math.min(available, left - total + (wanted[c] ?? 0));
        return (
          <div key={c} className="buy-row">
            <span className="chip" style={{ background: company.color }}>
              {company.name}
            </span>
            <input type="range" min={0} max={max} value={wanted[c] ?? 0} onChange={(e) => setWanted({ ...wanted, [c]: Number(e.target.value) })} />
            <span>
              {wanted[c] ?? 0} / {available} %
            </span>
            <small>{money(company.pricePerPercent)} / %</small>
          </div>
        );
      })}
      <button
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
      <summary>Revendre à la banque (moitié prix)</summary>
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

function AuctionPanel({ game, nameOf }: { game: GameState; nameOf: (id: string) => string }) {
  const { dispatch, you, online } = useStore();
  const a = game.auction!;
  const seller = game.players.find((p) => p.id === a.sellerId)!;
  const bidders = game.players.filter((p) => !p.bankrupt && p.id !== a.sellerId && (you === null || p.id === you));
  const [bidderId, setBidderId] = useState(bidders[0]?.id ?? "");
  const min = a.highestBidderId ? a.highestBid + config.minBidIncrement : a.startPrice;
  const [amount, setAmount] = useState(min);
  const [remaining, setRemaining] = useState(config.auctionTimeoutSeconds);
  useEffect(() => setAmount(min), [min]);

  useEffect(() => {
    if (!a.company || online) return;
    setRemaining(config.auctionTimeoutSeconds);
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [a.company, a.highestBid]);

  useEffect(() => {
    if (!online && a.company && remaining <= 0) dispatch({ type: "AUCTION_CLOSE" });
  }, [online, remaining, a.company, dispatch]);

  if (!a.company) {
    return (
      <div className="card highlight">
        <h3>Enchères !</h3>
        <p>
          {seller.name} doit mettre aux enchères {a.percentToSell} % d'une entreprise.
        </p>
        {(you === null || you === seller.id) && (
        <div className="chips">
          {Object.entries(seller.holdings).map(([c, pct]) => (
            <button key={c} className="chip" style={{ background: companyById.get(c)!.color }} onClick={() => dispatch({ type: "AUCTION_CHOOSE", playerId: seller.id, company: c })}>
              {companyById.get(c)!.name} ({pct} %)
            </button>
          ))}
        </div>
        )}
        {seller.atouts > 0 && (you === null || you === seller.id) && <button onClick={() => dispatch({ type: "USE_ATOUT", playerId: seller.id })}>Utiliser un Atout</button>}
      </div>
    );
  }

  return (
    <div className="card highlight">
      <h3>
        Enchère : {a.percent} % de {companyById.get(a.company)!.name}
      </h3>
      <p>
        Mise à prix {money(a.startPrice)}.{" "}
        {a.highestBidderId ? `Meilleure offre : ${money(a.highestBid)} (${nameOf(a.highestBidderId)})` : "Aucune offre."}
      </p>
      {online ? <Countdown prefix="Adjugé dans" /> : <p className="timer">Adjugé dans {Math.max(0, remaining)} s</p>}
      {bidders.length > 0 && (
      <div className="row">
        <select value={bidderId} onChange={(e) => setBidderId(e.target.value)}>
          {bidders.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input type="number" min={min} step={config.minBidIncrement} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <button className="primary" onClick={() => dispatch({ type: "BID", playerId: bidderId, amount })}>
          Enchérir
        </button>
      </div>
      )}
    </div>
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
