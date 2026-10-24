// Bibliothèque de composants d'interface, sans logique métier. Tout le
// visuel passe par les tokens (tokens.css) : une autre marque = mêmes
// composants. Voir /styleguide pour tous les états.

import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Check, Pencil, Share2 } from "lucide-react";
import { haptic } from "./haptics";

/* ------------------------------------------------------------ Boutons */

type ButtonVariant = "primary" | "secondary" | "ghost" | "strong";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "md" | "lg";
  block?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = "primary", size = "md", block, icon, className = "", children, ...rest }: ButtonProps) {
  const cls = ["btn", `btn--${variant}`, `btn--${size}`, block ? "btn--block" : "", className].join(" ").trim();
  return (
    <button type="button" className={cls} {...rest}>
      {icon && <span className="btn__icon" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" className={`icon-btn ${className}`.trim()} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------ Stepper */

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  label: string;
  unit?: string;
  /** Texte lu par les lecteurs d'écran (ex. « 5 minutes 30 secondes par km »). */
  valueText?: (value: number) => string;
}

/** Stepper géant `–  5:30  +` : pas fixe, appui long pour accélérer. */
export function Stepper({ value, onChange, min, max, step, format, label, unit, valueText }: StepperProps) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const timer = useRef<number | undefined>(undefined);

  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const bump = (dir: 1 | -1) => {
    const next = clamp(valueRef.current + dir * step);
    if (next !== valueRef.current) {
      valueRef.current = next;
      onChange(next);
      haptic(8);
    }
  };
  const stop = () => window.clearTimeout(timer.current);
  const start = (dir: 1 | -1) => {
    bump(dir);
    let delay = 380;
    const repeat = () => {
      bump(dir);
      delay = Math.max(45, delay * 0.8); // accélère pendant l'appui long
      timer.current = window.setTimeout(repeat, delay);
    };
    timer.current = window.setTimeout(repeat, delay);
  };
  useEffect(() => stop, []);

  const holdProps = (dir: 1 | -1) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      start(dir);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    // Clavier : Entrée/Espace déclenchent un clic sans pointerdown.
    onClick: (e: React.MouseEvent) => e.detail === 0 && bump(dir),
  });

  return (
    <div className="stepper">
      <button type="button" className="stepper__btn" aria-label={`Diminuer : ${label}`} disabled={value <= min} {...holdProps(-1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg>
      </button>
      <div
        className="stepper__value"
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText?.(value) ?? format(value)}
        onKeyDown={(e) => {
          const dir = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1 : 0;
          if (dir === 0) return;
          e.preventDefault();
          bump(dir);
        }}
      >
        <span className="stepper__number">{format(value)}</span>
        {unit && <span className="stepper__unit">{unit}</span>}
      </div>
      <button type="button" className="stepper__btn" aria-label={`Augmenter : ${label}`} disabled={value >= max} {...holdProps(1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ Sélecteur segmenté */

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="segmented" role="radiogroup" aria-label={label} style={{ "--count": options.length, "--index": index } as React.CSSProperties}>
      <span className="segmented__thumb" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className="segmented__opt"
          onClick={() => {
            if (o.value !== value) haptic(8);
            onChange(o.value);
          }}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ Puces */

export function Chip({
  selected,
  onClick,
  children,
  tone,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  tone?: "ok" | "warn" | "ko" | "info";
}) {
  if (!onClick) return <span className={`chip chip--static ${tone ? `chip--${tone}` : ""}`}>{children}</span>;
  return (
    <button type="button" className="chip" aria-pressed={!!selected} onClick={onClick}>
      {selected && (
        <span className="chip__check" aria-hidden="true">
          <Check size={18} strokeWidth={3} />
        </span>
      )}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------ Barre de progression */

export function ProgressSteps({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div className="progress-steps" role="progressbar" aria-label={label} aria-valuemin={1} aria-valuemax={total} aria-valuenow={current}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < current ? "progress-steps__seg is-done" : "progress-steps__seg"} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ Puce coureur */

export function RunnerChip({ name, pace, onClick }: { name: string; pace: string; onClick: () => void }) {
  return (
    <button type="button" className="runner-chip" onClick={onClick}>
      <span className="runner-chip__name">{name}</span>
      <span className="runner-chip__dot" aria-hidden="true">·</span>
      <span className="runner-chip__pace">{pace}/km</span>
      <Pencil size={16} aria-hidden="true" />
      <span className="sr-only"> (modifier)</span>
    </button>
  );
}

/* ------------------------------------------------------------ Anneau de compte à rebours */

/**
 * Anneau qui se remplit à l'approche de l'échéance. `progress` de 0 (loin)
 * à 1 (maintenant). Chiffres tabulaires : rien ne « danse ».
 */
export function CountdownRing({
  progress,
  value,
  unit,
  caption,
  size = 220,
}: {
  progress: number;
  value: string;
  unit?: string;
  caption?: string;
  size?: number;
}) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring__track" cx="50" cy="50" r={r} />
        <circle className="ring__bar" cx="50" cy="50" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
      </svg>
      <div className="ring__label">
        <span className="ring__value">{value}</span>
        {unit && <span className="ring__unit">{unit}</span>}
        {caption && <span className="ring__caption">{caption}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Carte de spot */

export function SpotCard({
  number,
  name,
  time,
  window,
  meta,
  status,
  highlight,
  expanded,
  onToggle,
  children,
  id,
}: {
  number: number;
  name: string;
  /** Horaire principal (ex. « 14:45 »). */
  time?: string;
  /** Fourchette sous l'horaire (ex. « 14:43–14:47 »). */
  window?: string;
  /** Ligne secondaire (ex. « Boucle 1 · 14:43–14:47 »). */
  meta?: ReactNode;
  status?: ReactNode;
  highlight?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
  id?: string;
}) {
  const detailsId = useId();
  const header = (
    <>
      <span className={highlight ? "spot-badge spot-badge--fort" : "spot-badge"} aria-hidden="true">
        {number}
      </span>
      <span className="spot-card__main">
        <span className="spot-card__name">{name}</span>
        {meta && <span className="spot-card__meta">{meta}</span>}
      </span>
      {time && (
        <span className="spot-card__when">
          <span className="spot-card__time">{time}</span>
          {window && <span className="spot-card__window">{window}</span>}
        </span>
      )}
    </>
  );
  return (
    <article className={`spot-card ${highlight ? "spot-card--fort" : ""} ${expanded ? "is-open" : ""}`} id={id} tabIndex={-1}>
      {onToggle ? (
        <button type="button" className="spot-card__head" aria-expanded={!!expanded} aria-controls={detailsId} onClick={onToggle}>
          {header}
          <svg className="spot-card__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      ) : (
        <div className="spot-card__head">{header}</div>
      )}
      {status && <div className="spot-card__status">{status}</div>}
      {children && (
        <div className="spot-card__details" id={detailsId} hidden={!expanded}>
          {children}
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------ En-tête de l'app */

/**
 * En-tête compact sur 2 lignes : événement + partage, puis le coureur suivi
 * (touche = modifier) et l'info clé du moment (ex. « Dim. 21 mars · 14:30 »).
 */
export function AppHeader({
  eventName,
  logo,
  info,
  runner,
  onShare,
}: {
  eventName: string;
  logo?: string | null;
  /** Info clé à droite de la puce coureur (date/heure de départ, J-x…). */
  info?: ReactNode;
  runner: ReactNode;
  onShare: () => void;
}) {
  return (
    <header className="app-bar">
      <div className="app-bar__row">
        {logo && <img className="app-bar__logo" src={logo} alt="" />}
        <p className="app-bar__event display">{eventName}</p>
        <button type="button" className="icon-btn app-bar__share" onClick={onShare} aria-label="Partager le suivi">
          <Share2 size={22} aria-hidden="true" />
        </button>
      </div>
      <div className="app-bar__row app-bar__row--runner">
        {runner}
        {info && <span className="app-bar__info">{info}</span>}
      </div>
    </header>
  );
}
