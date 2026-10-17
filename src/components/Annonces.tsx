import { useState } from "react";
import type { Annonce } from "../lib/annonces";
import { readJson, writeJson } from "../lib/storage";

const DISMISSED_KEY = "semi-supporter:annonces-fermees";

/** Bandeau(x) d'annonces en haut de l'app. Les « info » peuvent être fermées. */
export function Annonces({ annonces }: { annonces: Annonce[] }) {
  const [dismissed, setDismissed] = useState<string[]>(() => readJson<string[]>(DISMISSED_KEY) ?? []);
  const visible = annonces.filter((a) => a.level === "important" || !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    writeJson(DISMISSED_KEY, next);
  };

  return (
    <div className="annonces">
      {visible.map((a) => (
        <div key={a.id} className={`annonce annonce-${a.level}`} role={a.level === "important" ? "alert" : "status"}>
          <span className="annonce-text">
            <span aria-hidden="true">{a.level === "important" ? "⚠️ " : "📣 "}</span>
            {a.text}
          </span>
          {a.level === "info" && (
            <button type="button" className="annonce-close" onClick={() => dismiss(a.id)} aria-label="Fermer l'annonce">
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
