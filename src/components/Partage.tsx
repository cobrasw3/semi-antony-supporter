import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface PartageProps {
  url: string;
  /** Message d'accompagnement (« Suis Léa au Semi d'Antony 👉 »). */
  text: string;
  title: string;
  onShared?: (method: "native" | "copy") => void;
}

export function Partage({ url, text, title, onShared }: PartageProps) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setCopyFailed(false);
      onShared?.("copy");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Presse-papiers indisponible : on affiche le lien à copier à la main.
      setCopyFailed(true);
    }
  };

  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        onShared?.("native");
        return;
      } catch (err) {
        // L'utilisateur a fermé la feuille de partage : rien à faire.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    await copy();
  };

  return (
    <div className="partage">
      <button type="button" className="partage-btn" onClick={share}>
        📤 Partager le suivi
      </button>
      <p className="partage-feedback" role="status" aria-live="polite">
        {copied ? "✓ Lien copié — colle-le dans un message." : ""}
      </p>
      {copyFailed && <p className="partage-url">{url}</p>}
      <button
        type="button"
        className="partage-qr-toggle"
        onClick={() => setQrOpen((o) => !o)}
        aria-expanded={qrOpen}
      >
        {qrOpen ? "Masquer le QR code" : "Afficher un QR code"}
      </button>
      {qrOpen && (
        <div className="partage-panel">
          <div className="partage-qr">
            <QRCodeSVG value={url} size={168} marginSize={2} title="QR code du lien de suivi" />
          </div>
          <p className="partage-url">{url}</p>
        </div>
      )}
    </div>
  );
}
