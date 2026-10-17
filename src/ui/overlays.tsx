// Composants « par-dessus » : tiroir (bottom sheet), toasts, barre d'onglets,
// carrousel. Sans logique métier.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { haptic } from "./haptics";

/* ------------------------------------------------------------ Tiroir modal */

/**
 * Tiroir qui monte du bas. Fermeture : bouton, tap sur le voile, Échap, ou
 * glisser la poignée vers le bas. Le focus revient où il était.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("is-locked");
    requestAnimationFrame(() => sheetRef.current?.querySelector<HTMLElement>("input, button:not(.sheet__close), [tabindex]")?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("is-locked");
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="sheet-layer">
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={drag > 0 ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
      >
        <div
          className="sheet__handle-zone"
          onPointerDown={(e) => {
            dragStart.current = e.clientY;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => dragStart.current !== null && setDrag(Math.max(0, e.clientY - dragStart.current))}
          onPointerUp={() => {
            if (drag > 90) onClose();
            dragStart.current = null;
            setDrag(0);
          }}
        >
          <span className="sheet__handle" aria-hidden="true" />
        </div>
        <div className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <button type="button" className="icon-btn sheet__close" onClick={onClose} aria-label="Fermer">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------ Toasts */

export interface ToastItem {
  id: string;
  tone?: "neutral" | "info" | "warn" | "ko" | "demo";
  icon?: ReactNode;
  text: ReactNode;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
}

/** Pile de petits toasts au-dessus de la barre d'onglets : ne pousse jamais le contenu. */
export function ToastStack({ items }: { items: ToastItem[] }) {
  return (
    <div className="toast-stack" role="region" aria-label="Notifications">
      {items.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone ?? "neutral"}`} role="status">
          {t.icon && <span className="toast__icon" aria-hidden="true">{t.icon}</span>}
          <span className="toast__text">{t.text}</span>
          {t.action && (
            <button type="button" className="toast__action" onClick={t.action.onClick}>
              {t.action.label}
            </button>
          )}
          {t.onDismiss && (
            <button type="button" className="toast__close" onClick={t.onDismiss} aria-label="Fermer">
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** Fine barre en haut (mode démo, hors-ligne) : 28 px, ne déplace pas le contenu principal. */
export function StatusStrip({ tone, children }: { tone: "demo" | "offline" | "info" | "ko"; children: ReactNode }) {
  return (
    <div className={`status-strip status-strip--${tone}`} role="status">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------ Barre d'onglets */

export interface TabDef<T extends string> {
  id: T;
  label: string;
  icon: ReactNode;
  /** Pastille « nouveau » (ex. annonce à lire). */
  badge?: boolean;
}

export function TabBar<T extends string>({ tabs, active, onChange }: { tabs: TabDef<T>[]; active: T; onChange: (id: T) => void }) {
  return (
    <nav className="tabbar" aria-label="Navigation principale">
      <div className="tabbar__inner" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={t.id === active}
            aria-controls={`panel-${t.id}`}
            className="tabbar__tab"
            onClick={() => {
              if (t.id !== active) haptic(6);
              onChange(t.id);
            }}
          >
            <span className="tabbar__icon" aria-hidden="true">
              {t.icon}
              {t.badge && <span className="tabbar__badge" />}
            </span>
            <span className="tabbar__label">
              {t.label}
              {t.badge && <span className="sr-only"> (nouveau)</span>}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------ Carrousel */

/**
 * Carrousel horizontal (scroll-snap, au pouce). Signale l'élément centré ;
 * `activeIndex` permet de le piloter de l'extérieur (ex. tap sur un marqueur).
 */
export function Carousel({
  children,
  activeIndex,
  onActiveChange,
  label,
}: {
  children: ReactNode[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reported = useRef(activeIndex);
  const scrollTimer = useRef<number | undefined>(undefined);

  // Pilotage externe : centre l'élément demandé.
  useEffect(() => {
    const el = ref.current?.children[activeIndex] as HTMLElement | undefined;
    if (!el || reported.current === activeIndex) return;
    reported.current = activeIndex;
    ref.current!.scrollTo({ left: el.offsetLeft - (ref.current!.clientWidth - el.clientWidth) / 2, behavior: "smooth" });
  }, [activeIndex]);

  const onScroll = () => {
    window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      const box = ref.current;
      if (!box) return;
      const center = box.scrollLeft + box.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      [...box.children].forEach((child, i) => {
        const el = child as HTMLElement;
        const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - center);
        if (d < bestDist) (best = i), (bestDist = d);
      });
      if (best !== reported.current) {
        reported.current = best;
        haptic(5);
        onActiveChange(best);
      }
    }, 90);
  };

  return (
    <div className="carousel" ref={ref} onScroll={onScroll} role="list" aria-label={label}>
      {children.map((child, i) => (
        <div key={i} className={i === activeIndex ? "carousel__item is-active" : "carousel__item"} role="listitem">
          {child}
        </div>
      ))}
    </div>
  );
}
