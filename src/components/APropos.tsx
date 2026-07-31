import { useState } from "react";

export function APropos() {
  const [open, setOpen] = useState(false);

  return (
    <div className="a-propos">
      <button
        type="button"
        className="a-propos-link"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        À propos
      </button>
      {open && (
        <p className="a-propos-text">
          Prototype de démonstration, non-officiel, pour aider les supporters du semi-marathon
          d'Antony à savoir où se placer et à quelle heure encourager leur coureur. Une question,
          une suggestion ?{" "}
          <a href="mailto:p.machard.2001@gmail.com">p.machard.2001@gmail.com</a>
        </p>
      )}
    </div>
  );
}
