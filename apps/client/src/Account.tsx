import { useState } from "react";
import { useStore } from "./store";

export function Account({ onAdmin }: { onAdmin: () => void }) {
  const { profile, login, logout, setEmail, forgot } = useStore();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmailInput] = useState(profile.email ?? "");
  const [editEmail, setEditEmail] = useState(false);

  if (profile.account)
    return (
      <div className="card account">
        <div className="row">
          <span>
            Connecté : <strong>{profile.account}</strong>
          </span>
          <span className="spacer" />
          {profile.admin && <button onClick={onAdmin}>Admin</button>}
          <button onClick={logout}>Se déconnecter</button>
        </div>
        {editEmail ? (
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              setEmail(email);
              setEditEmail(false);
            }}
          >
            <input type="email" value={email} placeholder="ton@email.fr" onChange={(e) => setEmailInput(e.target.value)} />
            <button className="primary">OK</button>
          </form>
        ) : (
          <button className="link" onClick={() => setEditEmail(true)}>
            {profile.email ? `E-mail de secours : ${profile.email}` : "Ajouter un e-mail (facultatif, pour retrouver ton mot de passe)"}
          </button>
        )}
      </div>
    );

  return (
    <form
      className="card account"
      onSubmit={(e) => {
        e.preventDefault();
        login(name, password);
      }}
    >
      <h3>Compte</h3>
      <small>Pas d'inscription : au premier passage, ton pseudo est réservé avec ce mot de passe. Ensuite il te ramène tes points et tes objets.</small>
      <input value={name} maxLength={20} placeholder="Pseudo" autoComplete="username" onChange={(e) => setName(e.target.value)} />
      <input type="password" value={password} placeholder="Mot de passe" autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} />
      <button className="primary" disabled={name.trim().length < 2 || password.length < 4}>
        Se connecter
      </button>
      <button type="button" className="link" disabled={name.trim().length < 2} onClick={() => forgot(name)}>
        Mot de passe oublié ?
      </button>
    </form>
  );
}

export function ResetPassword({ resetToken, onDone }: { resetToken: string; onDone: () => void }) {
  const { resetPassword } = useStore();
  const [password, setPassword] = useState("");
  return (
    <form
      className="card account"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await resetPassword(resetToken, password)) onDone();
      }}
    >
      <h3>Nouveau mot de passe</h3>
      <input type="password" value={password} placeholder="Nouveau mot de passe" autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
      <button className="primary" disabled={password.length < 4}>
        Valider
      </button>
    </form>
  );
}
