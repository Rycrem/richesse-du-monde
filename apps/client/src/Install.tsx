import { useEffect, useState } from "react";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
}

// "Install the app" on Android and desktop Chrome; a short hint on iPhone, where Safari has no install prompt
export function Install() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  if (standalone) return null;
  if (prompt)
    return (
      <button className="install-btn" onClick={() => void prompt.prompt().then(() => setPrompt(null))}>
        📲 Installer l'application
      </button>
    );
  if (ios) return <p className="install-hint">📲 Pour installer le jeu : bouton Partager, puis "Sur l'écran d'accueil".</p>;
  return null;
}
