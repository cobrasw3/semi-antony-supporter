import { QRCodeSVG } from "qrcode.react";
import { BUNDLED_EVENT } from "../config/event";

/**
 * Page /qr (non liée dans l'app) : QR code imprimable vers l'app, pour les
 * affiches et le stand des dossards. Imprimer depuis le navigateur (A4).
 */
export function QrPage() {
  const url = `${window.location.origin}/`;
  return (
    <main className="qr-page">
      <h1>{BUNDLED_EVENT.event.name}</h1>
      <p className="qr-lead">Supporters : où vous placer, et à quelle heure votre coureur passe ?</p>
      <div className="qr-code">
        <QRCodeSVG value={url} size={320} level="M" marginSize={2} title={`QR code vers ${url}`} />
      </div>
      <p className="qr-url">{url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</p>
      <ul className="qr-points">
        <li>Les horaires de passage de votre coureur à chaque spot</li>
        <li>Le meilleur enchaînement de spots à pied</li>
        <li>Fonctionne hors-ligne le jour J</li>
      </ul>
      <p className="qr-footer">Application non officielle — prototype en attente de validation par l'organisateur.</p>
      <button type="button" className="qr-print" onClick={() => window.print()}>
        Imprimer
      </button>
    </main>
  );
}
