import { allianceOf, ATOUTS, board, buyCost, config, markets, regions, royaltyQuote, trendOf, type Cell, type GameState } from "@stonks/engine";
import { useEffect, useState } from "react";
import { companyById, money, PLAYER_COLORS } from "./format";
import { useStore } from "./store";

const SPECIAL: Record<string, string> = {
  depart: `Chaque passage rapporte ${config.lapBonus.toLocaleString("fr-FR")} k$.`,
  mondial: "Achète jusqu'à 30 % dans n'importe quelle entreprise, partout dans le monde.",
  encheres: "Choisis un adversaire et une de ses actions : elle part aux enchères pendant 30 s. Tout le monde peut enchérir, sauf le vendeur.",
  atout: `Une carte Atout tirée au hasard est à vendre pour ${config.atoutPrice.toLocaleString("fr-FR")} k$ : ${ATOUTS.map((a) => a.name).join(", ")}.`,
  actu: "Une actualité tech tombe : gain ou perte pour le joueur, montré à tout le monde. Les pertes vont dans la cagnotte de la Bourse, que seule la carte Délit d'initié permet de rafler.",
  levee: `Levée de fonds : tu reçois ${config.leveeFundsPerPip} k$ par point de dés.`,
  ipo: `Introduction en Bourse : +${config.ipoBonus.toLocaleString("fr-FR")} k$.`,
  krach: `Krach boursier : tu perds ${config.krachPercent} % de ta trésorerie, qui part dans la cagnotte de la Bourse.`,
};

const regionName = (id: string) => regions.find((r) => r.id === id)?.name ?? id;
const regionColor = (id: string) => regions.find((r) => r.id === id)?.color ?? "#5c6b8a";

function Holders({ game, company }: { game: GameState; company: string }) {
  const holders = game.players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !p.bankrupt && (p.holdings[company] ?? 0) > 0)
    .sort((a, b) => b.p.holdings[company]! - a.p.holdings[company]!);
  if (holders.length === 0) return <p className="muted">Personne n'en possède encore.</p>;
  return (
    <div className="inspect-holders">
      {holders.map(({ p, i }) => (
        <div key={p.id} className="row">
          <span className="dot" style={{ background: PLAYER_COLORS[i] }} />
          <span>{p.name}</span>
          {allianceOf(game, p.id) && <small className="muted">alliance</small>}
          <span className="spacer" />
          <strong>{p.holdings[company]} %</strong>
          <span className="holder-value">{money(p.holdings[company]! * companyById.get(company)!.pricePerPercent)}</span>
        </div>
      ))}
    </div>
  );
}

function CompanyHead({ company }: { company: string }) {
  const c = companyById.get(company)!;
  return (
    <div className="inspect-company" style={{ background: c.color }}>
      <img src={`/logos/${c.id}.svg`} alt="" />
      <div>
        <strong>{c.name}</strong>
        <small>
          {money(c.pricePerPercent)} / % · rapporte {money(c.royaltyPerPercent)} / % par passage
        </small>
      </div>
    </div>
  );
}

function Trend({ game, company }: { game: GameState; company: string }) {
  const m = markets.find((x) => x.companies.includes(company));
  const t = trendOf(game, company);
  if (!m) return null;
  return (
    <p>
      Marché {m.name} ce tour : <strong className={t >= 0 ? "plus" : "minus"}>{t >= 0 ? `+${t}` : t} %</strong> sur les redevances.
    </p>
  );
}

function landingCost(game: GameState, company: string) {
  const q = royaltyQuote(game, company);
  if (q.max === 0) return <p>Tomber ici est gratuit : personne ne détient {companyById.get(company)!.name}.</p>;
  const tie = <small className="muted"> Gratuit pour un joueur qui en détient autant.</small>;
  const names = q.winners.map((g) => g.map((p) => p.name).join(" + ")).join(", ");
  return (
    <p>
      Tomber ici coûte <strong>{money(q.share * q.winners.length)}</strong>, payés à {names} ({q.max} %
      {q.max === 100 ? `, monopole x${config.monopolyMultiplier}` : ""}).{tie}
    </p>
  );
}

function CellBody({ game, cell }: { game: GameState; cell: Cell }) {
  if (cell.type === "city") {
    const company = game.royalties[cell.id]!;
    const stock = Object.entries(game.stocks[cell.id]!).filter(([, pct]) => pct > 0);
    return (
      <>
        <h4>Redevance de la case</h4>
        <CompanyHead company={company} />
        <Trend game={game} company={company} />
        {landingCost(game, company)}
        <h4>En vente ici</h4>
        {stock.length === 0 ? (
          <p className="muted">Tout est déjà vendu.</p>
        ) : (
          <div className="chips">
            {stock.map(([c, pct]) => (
              <span key={c} className="chip" style={{ background: companyById.get(c)!.color }}>
                <img src={`/logos/${c}.svg`} alt="" />
                {companyById.get(c)!.name} {pct} %
              </span>
            ))}
          </div>
        )}
        <h4>Détenteurs de {companyById.get(company)!.name}</h4>
        <Holders game={game} company={company} />
      </>
    );
  }
  if (cell.type === "choix-regional") return <p>Achète jusqu'à 30 % dans n'importe quelle ville de la région {regionName(cell.region)}.</p>;
  return <p>{SPECIAL[cell.type]}</p>;
}

// Cost of owning x % bought from the bank: linear, then each % dearer past dominanceFrom
function PriceChart({ game, company }: { game: GameState; company: string }) {
  const you = useStore((s) => s.you);
  const [hover, setHover] = useState<number | null>(null);
  const c = companyById.get(company)!;
  const W = 290, H = 150, L = 40, R = 16, T = 10, B = 22;
  const costs = Array.from({ length: 101 }, (_, x) => buyCost(company, 0, x));
  const max = costs[100]!;
  const px = (x: number) => L + (x / 100) * (W - L - R);
  const py = (v: number) => T + (1 - v / max) * (H - T - B);
  const path = costs.map((v, x) => `${x ? "L" : "M"}${px(x).toFixed(1)},${py(v).toFixed(1)}`).join("");
  const held = you ? (game.players.find((p) => p.id === you)?.holdings[company] ?? 0) : 0;
  const ticks = [0, max / 2, max];
  const k = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v)}`);
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round((((e.clientX - r.left) / r.width) * W - L) / ((W - L - R) / 100));
    setHover(x >= 0 && x <= 100 ? x : null);
  };
  const h = hover;
  return (
    <div className="price-chart">
      <svg viewBox={`0 0 ${W} ${H}`} onPointerMove={move} onPointerLeave={() => setHover(null)} role="img" aria-label={`Coût pour détenir x % de ${c.name}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={py(v)} y2={py(v)} className="grid" />
            <text x={L - 4} y={py(v) + 3} textAnchor="end">
              {k(v)}
            </text>
          </g>
        ))}
        {[0, 25, 50, 75, 100].map((x) => (
          <text key={x} x={px(x)} y={H - 6} textAnchor="middle">
            {x} %
          </text>
        ))}
        <line x1={px(config.dominanceFrom)} x2={px(config.dominanceFrom)} y1={T} y2={H - B} className="threshold" />
        <path d={path} fill="none" stroke={c.color} strokeWidth={2} strokeLinejoin="round" />
        {held > 0 && <circle cx={px(held)} cy={py(costs[held]!)} r={4} fill={c.color} className="ring" />}
        {h !== null && (
          <>
            <line x1={px(h)} x2={px(h)} y1={T} y2={H - B} className="cross" />
            <circle cx={px(h)} cy={py(costs[h]!)} r={4} fill={c.color} className="ring" />
          </>
        )}
      </svg>
      <div className="price-chart-read">
        {h !== null ? (
          <>
            <strong>{h} %</strong> détenus : {money(costs[h]!)} au total
            {h > 0 && <> · ce % coûte {money(costs[h]! - costs[h - 1]!)}</>}
          </>
        ) : (
          <>
            Survole la courbe. Au-delà de {config.dominanceFrom} %, chaque % coûte plus cher.
            {held > 0 && <> Point : tes {held} %.</>}
          </>
        )}
      </div>
    </div>
  );
}

function CompanyBody({ game, company }: { game: GameState; company: string }) {
  const c = companyById.get(company)!;
  const cities = board.filter((cell) => cell.type === "city" && (game.stocks[cell.id]![company] ?? 0) > 0) as Extract<Cell, { type: "city" }>[];
  const royaltyCells = board.filter((cell) => game.royalties[cell.id] === company);
  return (
    <>
      <CompanyHead company={company} />
      <div className="legend">
        <span>
          <i className="buy" /> Cases où acheter
        </span>
        <span>
          <i className="pay" /> Cases qui rapportent
        </span>
      </div>
      <Trend game={game} company={company} />
      <p>
        Le plus gros détenteur touche {money(c.royaltyPerPercent)} par % détenu chaque fois qu'un joueur tombe sur une case {c.name} (x
        {config.monopolyMultiplier} à 100 %). La banque rachète {money(Math.floor(c.pricePerPercent * config.bankBuybackRatio))} / %.
      </p>
      <h4>Prix selon le % détenu</h4>
      <PriceChart game={game} company={company} />
      <h4>Cases qui paient {c.name}</h4>
      <p>{royaltyCells.map((cell) => cell.name).join(", ")}</p>
      <h4>Parts à vendre</h4>
      <div className="chips">
        {cities.map((cell) => (
          <span key={cell.id} className="chip" style={{ background: regionColor(cell.region) }}>
            {cell.name} {game.stocks[cell.id]![company] ?? 0} %
          </span>
        ))}
      </div>
      <h4>Détenteurs</h4>
      <Holders game={game} company={company} />
    </>
  );
}

function MarketBody({ game, market }: { game: GameState; market: string }) {
  const setInspect = useStore((s) => s.setInspect);
  const m = markets.find((x) => x.id === market)!;
  const t = game.market[m.id] ?? 0;
  return (
    <>
      <p>
        Ce tour, les redevances des entreprises de ce marché sont <strong className={t > 0 ? "plus" : t < 0 ? "minus" : ""}>{t > 0 ? `en hausse de ${t} %` : t < 0 ? `en baisse de ${-t} %` : "stables"}</strong>. La tendance change quand le joueur le plus avancé repasse par le Départ.
      </p>
      <h4>Entreprises impactées</h4>
      <div className="market-companies">
        {m.companies.map((id) => {
          const c = companyById.get(id)!;
          return (
            <button key={id} className="market-company" onClick={() => setInspect({ company: id })}>
              <span className="chip" style={{ background: c.color }}>
                <img src={`/logos/${id}.svg`} alt="" />
                {c.name}
              </span>
              <span className="spacer" />
              <small className="muted">{money(c.royaltyPerPercent)}</small>
              <strong className={t >= 0 ? "plus" : "minus"}>{money(Math.floor((c.royaltyPerPercent * (100 + t)) / 100))} / %</strong>
            </button>
          );
        })}
      </div>
    </>
  );
}

// Keeps the last content on screen while the panel slides out
export function InspectPanel({ game }: { game: GameState }) {
  const { inspect, setInspect } = useStore();
  const [shown, setShown] = useState(inspect);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (inspect) {
      setShown(inspect);
      setLeaving(false);
      return;
    }
    setLeaving(true);
    const t = setTimeout(() => setShown(null), 300);
    return () => clearTimeout(t);
  }, [inspect]);
  if (!shown) return null;

  const cell = "cell" in shown ? board[shown.cell]! : null;
  const market = "market" in shown ? markets.find((m) => m.id === shown.market)! : null;
  const title = cell ? cell.name : market ? `Marché ${market.name}` : companyById.get((shown as { company: string }).company)!.name;
  const trend = market ? (game.market[market.id] ?? 0) : 0;
  const color = cell ? ("region" in cell ? regionColor(cell.region) : "#5c6b8a") : market ? (trend >= 0 ? "#0a9d6e" : "#c0283c") : companyById.get((shown as { company: string }).company)!.color;
  return (
    <div className={`inspect ${leaving ? "leaving" : ""}`} key={JSON.stringify(shown)}>
      <header style={{ background: color }}>
        <div>
          <strong>{title}</strong>
          {cell && "region" in cell && <small>{regionName(cell.region)}</small>}
        </div>
        <button className="close" onClick={() => setInspect(null)} aria-label="Fermer">
          ×
        </button>
      </header>
      <div className="inspect-body">
        {cell ? <CellBody game={game} cell={cell} /> : market ? <MarketBody game={game} market={market.id} /> : <CompanyBody game={game} company={(shown as { company: string }).company} />}
      </div>
    </div>
  );
}

export function HoverTip({ hover, game }: { hover: { cell: number; x: number; y: number } | null; game: GameState }) {
  if (!hover) return null;
  const cell = board[hover.cell]!;
  const company = cell.type === "city" ? companyById.get(game.royalties[cell.id]!)! : null;
  const owners = company ? royaltyQuote(game, company.id).winners.flat() : [];
  return (
    <div className="hover-tip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
      {company && <img src={`/logos/${company.id}.svg`} alt="" />}
      <div>
        <strong>{company ? company.name : cell.name}</strong>
        {company && <small>{cell.name}</small>}
        {owners.length > 0 && <small className="owner-name">à {owners.map((p) => `${p.name} (${p.holdings[company!.id]} %)`).join(", ")}</small>}
      </div>
    </div>
  );
}
