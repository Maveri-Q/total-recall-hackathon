"use client";

import type { ReactNode } from "react";

// The lamp's position is written straight onto the element: no React re-render on every pointer move.
function move(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
  el.style.setProperty("--o", "1");
}
function leave(e: React.PointerEvent<HTMLElement>) {
  e.currentTarget.style.setProperty("--o", "0");
}

/**
 * A hero card with the "lamp": a soft white glow and faint pitch lines that follow the pointer (or a
 * dragging finger) and fade out 320ms after it leaves. The card looks complete without it.
 */
export function LampCard({
  children,
  className = "",
  pitch = true,
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  pitch?: boolean;
  as?: "section" | "div";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag {...rest} onPointerMove={move} onPointerDown={move} onPointerLeave={leave} onPointerCancel={leave} className={`relative overflow-hidden ${className}`}>
      <div aria-hidden="true" className="lamp">
        <div className="absolute inset-0 bg-[radial-gradient(circle_170px_at_var(--mx,50%)_var(--my,50%),rgba(255,255,255,0.95),rgba(255,255,255,0.45)_55%,transparent_80%)]" />
        {pitch && (
          <svg width="100%" height="100%" viewBox="0 0 354 240" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
            <g fill="none" stroke="#0B1A14" strokeOpacity="0.18" strokeWidth="1.5">
              <rect x="10" y="10" width="334" height="220" rx="6" />
              <line x1="177" y1="10" x2="177" y2="230" />
              <circle cx="177" cy="120" r="40" />
              <rect x="10" y="72" width="46" height="96" />
              <rect x="298" y="72" width="46" height="96" />
            </g>
          </svg>
        )}
      </div>
      <div className="relative">{children}</div>
    </Tag>
  );
}
