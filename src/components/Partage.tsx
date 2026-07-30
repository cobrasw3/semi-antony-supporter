import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface PartageProps {
  url: string;
}

export function Partage({ url }: PartageProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible (permission refusée, contexte non
      // sécurisé...) : le lien reste affiché et copiable à la main.
    }
  };

  return (
    <div className="partage">
      <button
        type="button"
        className="partage-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? "Fermer" : "📤 Partager"}
      </button>
      {open && (
        <div className="partage-panel">
          <div className="partage-qr">
            <QRCodeSVG value={url} size={168} marginSize={2} />
          </div>
          <p className="partage-url">{url}</p>
          <button type="button" className="partage-copy-btn" onClick={handleCopy}>
            {copied ? "Lien copié ✓" : "Copier le lien"}
          </button>
        </div>
      )}
    </div>
  );
}
