import { dmChannel, type ChatMessage, type RoomView } from "@stonks/shared";
import { useEffect, useRef, useState } from "react";
import { PLAYER_COLORS } from "./format";
import { useStore } from "./store";

type Tab = "public" | "prive" | "groupe";

const EMOJIS = ["😀", "😂", "🤣", "😅", "😎", "🤑", "🤔", "😏", "😱", "😭", "😡", "🥳", "🙄", "😴", "🤝", "👍", "👎", "👏", "🙏", "💪", "🔥", "💸", "💰", "📈", "📉", "🚀", "💎", "🏦", "🎲", "🏆", "⭐", "❤️", "💔", "😈", "🤡", "👀", "✅", "❌", "⏳"];
// a message made only of emoji is shown bigger
const onlyEmoji = (t: string) => /^(\p{Extended_Pictographic}|\p{Emoji_Modifier}|\u200d|\ufe0f|\s)+$/u.test(t);

function Messages({ messages, room, onSend }: { messages: ChatMessage[]; room: RoomView; onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const [picker, setPicker] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const insert = (e: string) => {
    const el = input.current;
    const at = el?.selectionStart ?? text.length;
    const next = (text.slice(0, at) + e + text.slice(el?.selectionEnd ?? at)).slice(0, 300);
    setText(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + e.length, at + e.length);
    });
  };
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);
  const color = (id: string) => PLAYER_COLORS[room.players.findIndex((p) => p.id === id)] ?? "#9aa5b8";
  const name = (id: string) => room.players.find((p) => p.id === id)?.name ?? "?";
  return (
    <>
      <div className="chat-messages">
        {messages.length === 0 && <p className="muted">Aucun message pour l'instant.</p>}
        {messages.map((m) =>
          m.from === "system" ? (
            <div key={m.id} className="chat-system">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="chat-line">
              <strong style={{ color: color(m.from) }}>{name(m.from)}</strong> <span className={onlyEmoji(m.text) ? "chat-big" : undefined}>{m.text}</span>
            </div>
          ),
        )}
        <div ref={end} />
      </div>
      {picker && (
        <div className="emoji-picker">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => insert(e)}>
              {e}
            </button>
          ))}
        </div>
      )}
      <form
        className="row chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onSend(text);
          setText("");
          setPicker(false);
        }}
      >
        <button type="button" className={`emoji-btn ${picker ? "on" : ""}`} aria-label="Emoji" onClick={() => setPicker(!picker)}>
          😀
        </button>
        <input ref={input} value={text} maxLength={300} placeholder="Écrire un message" onChange={(e) => setText(e.target.value)} />
        <button className="primary" disabled={!text.trim()}>
          Envoyer
        </button>
      </form>
    </>
  );
}

export function Chat({ room, you }: { room: RoomView; you: string }) {
  const { sendChat, createGroup, leaveGroup } = useStore();
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("public");
  const [channel, setChannel] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [seen, setSeen] = useState<Record<string, number>>({});
  const { messages, groups } = room.chat;
  const others = room.players.filter((p) => p.id !== you);

  const current = tab === "public" ? "public" : channel;
  const lastId = (ch: string) => Math.max(0, ...messages.filter((m) => m.channel === ch).map((m) => m.id));
  useEffect(() => {
    if (open && current) setSeen((s) => ({ ...s, [current]: lastId(current) }));
  }, [open, current, messages.length]);
  const unread = (ch: string) => messages.filter((m) => m.channel === ch && m.from !== you && m.id > (seen[ch] ?? 0)).length;
  const unreadTab = (t: Tab) =>
    t === "public"
      ? unread("public")
      : t === "prive"
        ? others.reduce((a, p) => a + unread(dmChannel(you, p.id)), 0)
        : groups.reduce((a, g) => a + unread(`group:${g.id}`), 0);
  const total = (["public", "prive", "groupe"] as Tab[]).reduce((a, t) => a + unreadTab(t), 0);
  const badge = (n: number) => (n > 0 ? <span className="badge">{n}</span> : null);

  if (!open)
    return (
      <button className="chat-toggle" onClick={() => setOpen(true)}>
        Chat {badge(total)}
      </button>
    );

  const group = channel?.startsWith("group:") ? groups.find((g) => `group:${g.id}` === channel) : undefined;
  const dmWith = channel?.startsWith("dm:") ? others.find((p) => dmChannel(you, p.id) === channel) : undefined;

  return (
    <div className="chat">
      <div className="row chat-head">
        {(["public", "prive", "groupe"] as Tab[]).map((t) => (
          <button
            key={t}
            className={tab === t ? "primary" : ""}
            onClick={() => {
              setTab(t);
              setChannel(null);
              setCreating(false);
            }}
          >
            {{ public: "Public", prive: "Privé", groupe: "Groupe" }[t]} {badge(unreadTab(t))}
          </button>
        ))}
        <span className="spacer" />
        <button className="ghost" onClick={() => setOpen(false)} aria-label="Réduire le chat">
          -
        </button>
      </div>

      {tab === "public" && <Messages room={room} messages={messages.filter((m) => m.channel === "public")} onSend={(t) => sendChat("public", t)} />}

      {tab === "prive" &&
        (dmWith ? (
          <>
            <div className="row chat-sub">
              <button className="ghost" onClick={() => setChannel(null)}>
                {"<"}
              </button>
              <strong>{dmWith.name}</strong>
            </div>
            <Messages room={room} messages={messages.filter((m) => m.channel === channel)} onSend={(t) => sendChat(channel!, t)} />
          </>
        ) : (
          <div className="chat-list">
            {others.map((p) => (
              <button key={p.id} onClick={() => setChannel(dmChannel(you, p.id))}>
                {p.name} {badge(unread(dmChannel(you, p.id)))}
              </button>
            ))}
          </div>
        ))}

      {tab === "groupe" &&
        (group ? (
          <>
            <div className="row chat-sub">
              <button className="ghost" onClick={() => setChannel(null)}>
                {"<"}
              </button>
              <strong>{group.name}</strong>
              <small className="muted">{group.members.map((id) => room.players.find((p) => p.id === id)?.name).join(", ")}</small>
              <span className="spacer" />
              {!group.allianceId && (
                <button
                  className="ghost"
                  onClick={() => {
                    leaveGroup(group.id);
                    setChannel(null);
                  }}
                >
                  Quitter
                </button>
              )}
            </div>
            <Messages room={room} messages={messages.filter((m) => m.channel === channel)} onSend={(t) => sendChat(channel!, t)} />
          </>
        ) : creating ? (
          <form
            className="chat-list"
            onSubmit={async (e) => {
              e.preventDefault();
              const id = await createGroup(groupName, picked);
              if (!id) return;
              setCreating(false);
              setGroupName("");
              setPicked([]);
              setChannel(`group:${id}`);
            }}
          >
            <input value={groupName} maxLength={24} placeholder="Nom du groupe" onChange={(e) => setGroupName(e.target.value)} />
            {others.map((p) => (
              <label key={p.id} className="row">
                <input type="checkbox" checked={picked.includes(p.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, p.id] : picked.filter((x) => x !== p.id))} />
                {p.name}
              </label>
            ))}
            <div className="row">
              <button type="button" className="ghost" onClick={() => setCreating(false)}>
                Annuler
              </button>
              <button className="primary" disabled={picked.length === 0}>
                Créer
              </button>
            </div>
          </form>
        ) : (
          <div className="chat-list">
            {groups.length === 0 && <p className="muted">Tu n'es dans aucun groupe. Une alliance crée aussi son groupe.</p>}
            {groups.map((g) => (
              <button key={g.id} onClick={() => setChannel(`group:${g.id}`)}>
                {g.allianceId ? <span className="chip alliance">Alliance</span> : g.name} {badge(unread(`group:${g.id}`))}
              </button>
            ))}
            <button className={groups.length === 0 ? "primary" : ""} onClick={() => setCreating(true)}>
              Créer un groupe
            </button>
          </div>
        ))}
    </div>
  );
}
