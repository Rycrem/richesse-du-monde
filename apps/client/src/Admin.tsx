import type { AccountRow } from "@stonks/shared";
import { useEffect, useState } from "react";
import { useStore } from "./store";

function Row({ row, onSaved }: { row: AccountRow; onSaved: () => void }) {
  const { adminPassword, adminPoints } = useStore();
  const [points, setPoints] = useState(String(row.points));
  const [password, setPassword] = useState("");
  return (
    <tr>
      <td>
        <strong>{row.name}</strong>
        <br />
        <small>{row.email ?? "pas d'e-mail"}</small>
      </td>
      <td>{row.owned}</td>
      <td>
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await adminPoints(row.name, Number(points))) onSaved();
          }}
        >
          <input type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} />
          <button disabled={points === String(row.points) || points === ""}>OK</button>
        </form>
      </td>
      <td>
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await adminPassword(row.name, password)) {
              setPassword("");
              onSaved();
            }
          }}
        >
          <input value={password} placeholder="nouveau" autoComplete="off" onChange={(e) => setPassword(e.target.value)} />
          <button disabled={password.length < 4}>OK</button>
        </form>
      </td>
    </tr>
  );
}

export function Admin({ onClose }: { onClose: () => void }) {
  const { adminList, loadProfile, error } = useStore();
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [saved, setSaved] = useState("");
  const refresh = () => {
    adminList().then(setRows);
    loadProfile();
  };
  useEffect(refresh, []);

  return (
    <div className="setup admin">
      <header className="row">
        <h1>Admin</h1>
        <span className="spacer" />
        <button onClick={onClose}>Retour</button>
      </header>
      {error && <div className="error">{error}</div>}
      {saved && <div className="notice">{saved}</div>}
      <p>{rows.length} comptes</p>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Compte</th>
              <th>Objets</th>
              <th>Points</th>
              <th>Mot de passe</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Row
                key={`${r.name}-${r.points}`}
                row={r}
                onSaved={() => {
                  setSaved(`${r.name} mis à jour`);
                  refresh();
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
