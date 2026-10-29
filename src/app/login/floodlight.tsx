"use client";

import { useEffect, useRef } from "react";

// [kind, left %, top %, size px, bob, blur px, shirt colour, trim colour, number]. Values from design-reference/SignIn.
// Plain made-up shirts only: no real kits, logos or players.
const FLOATERS: [kind: "ball" | "kit", left: number, top: number, size: number, bob: string, blur: number, c1?: string, c2?: string, num?: string][] = [
  ["ball", 6, 6, 70, "bob1", 0],
  ["kit", 62, 3, 96, "bob2", 0, "#E8C547", "#1E2A5A", "7"],
  ["ball", 78, 22, 38, "bob3", 2],
  ["kit", -6, 25, 84, "bob3", 1, "#3B6FD8", "#F2F5F1", "9"],
  ["ball", 42, 15, 30, "bob2", 2.5],
  ["kit", 68, 68, 100, "bob1", 0, "#D9463B", "#F2F5F1", "10"],
  ["ball", 10, 73, 78, "bob2", 0],
  ["ball", 56, 87, 44, "bob3", 1.5],
  ["kit", 28, 81, 70, "bob3", 1, "#F2F5F1", "#127A55", "4"],
  ["ball", 85, 50, 28, "bob1", 2.5],
  ["kit", 2, 52, 56, "bob1", 2, "#2B2F3A", "#F5A524", "11"],
];

const PATCH = "0,-12 11.4,-3.7 7.1,9.7 -7.1,9.7 -11.4,-3.7";

/** Patches turn inside the ball while the shading stays put, so it reads as a spinning sphere. */
function Ball({ spin }: { spin: string }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx="50" cy="50" r="47" fill="#EDEDE6" />
      <g clipPath="url(#od-ball-clip)">
        <g className={spin} fill="#151B18">
          <polygon points="50,36 63.3,45.7 58.2,61.3 41.8,61.3 36.7,45.7" />
          <polygon points={PATCH} transform="translate(50 10) rotate(180)" />
          <polygon points={PATCH} transform="translate(88 37.6) rotate(-108)" />
          <polygon points={PATCH} transform="translate(73.5 82.4) rotate(-36)" />
          <polygon points={PATCH} transform="translate(26.5 82.4) rotate(36)" />
          <polygon points={PATCH} transform="translate(12 37.6) rotate(108)" />
          <g stroke="#151B18" strokeWidth="1.6">
            <line x1="50" y1="36" x2="50" y2="22" />
            <line x1="63.3" y1="45.7" x2="76.6" y2="41.3" />
            <line x1="58.2" y1="61.3" x2="66.5" y2="72.7" />
            <line x1="41.8" y1="61.3" x2="33.5" y2="72.7" />
            <line x1="36.7" y1="45.7" x2="23.4" y2="41.3" />
          </g>
        </g>
      </g>
      <circle cx="50" cy="50" r="47" fill="url(#od-ball-shade)" />
      <ellipse cx="35" cy="26" rx="11" ry="6" fill="#FFFFFF" fillOpacity="0.55" transform="rotate(-30 35 26)" />
    </svg>
  );
}

const SHIRT = "M30 12 L42 7 Q50 15 58 7 L70 12 L91 28 L81 42 L72 36 L72 93 L28 93 L28 36 L19 42 L9 28 Z";

/** A plain shirt with cloth shading and two fold lines, swaying in 3D. */
function Kit({ c1, c2, num, sway }: { c1: string; c2: string; num: string; sway: string }) {
  return (
    <div className={`${sway} h-full w-full`}>
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <path d={SHIRT} fill={c1} />
        <path d={SHIRT} fill="url(#od-kit-shade)" />
        <path d="M40 40 Q44 62 38 90 M62 44 Q58 66 63 90" fill="none" stroke="#000000" strokeOpacity="0.18" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M42 7 Q50 15 58 7" fill="none" stroke={c2} strokeWidth="3.5" />
        <path d="M81 42 L91 28 M19 42 L9 28" stroke={c2} strokeWidth="4" />
        <text x="50" y="66" textAnchor="middle" fontFamily="var(--font-archivo), sans-serif" fontWeight="800" fontSize="26" fill={c2}>
          {num}
        </text>
      </svg>
    </div>
  );
}

function Pitch({ stroke, opacity }: { stroke: string; opacity?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <g fill="none" stroke={stroke} strokeOpacity={opacity} strokeWidth="2">
        <rect x="22" y="40" width="346" height="764" rx="4" />
        <line x1="22" y1="422" x2="368" y2="422" />
        <circle cx="195" cy="422" r="62" />
        <rect x="110" y="40" width="170" height="90" />
        <rect x="110" y="714" width="170" height="90" />
      </g>
    </svg>
  );
}

const LIGHT = 220; // floodlight diameter, px

/**
 * The dark pitch with a floodlight that follows the pointer (or a dragging finger). The lit layer
 * (green pitch, markings, balls and kits) is revealed through a radial mask. One requestAnimationFrame
 * loop eases the light toward its target and writes the mask position straight onto the element,
 * so React doesn't re-render every frame. After 2.5s without input it wanders on from where it is.
 */
export function Floodlight({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const lit = useRef<HTMLDivElement>(null);
  const target = useRef<{ x: number; y: number } | null>(null);
  const lastInput = useRef(-10_000);

  useEffect(() => {
    const el = root.current;
    const layer = lit.current;
    if (!el || !layer) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const size = () => el.getBoundingClientRect();
    let { width, height } = size();
    const pos = { x: width / 2, y: height * 0.4 };
    target.current ??= { ...pos };
    let frame = 0;

    const paint = () => {
      const p = `${pos.x - LIGHT / 2}px ${pos.y - LIGHT / 2}px`;
      layer.style.setProperty("-webkit-mask-position", p);
      layer.style.maskPosition = p;
    };
    // Wander from wherever the light is: the wander's start point is the light's position when it went idle.
    let wanderFrom: { x: number; y: number; t: number } | null = null;
    const tick = (now: number) => {
      const idle = now - lastInput.current > 2500;
      if (idle && !reduce) {
        wanderFrom ??= { x: pos.x, y: pos.y, t: now };
        const t = now - wanderFrom.t;
        target.current = {
          x: Math.min(width - 40, Math.max(40, wanderFrom.x + Math.sin(t * 0.00035) * width * 0.3)),
          y: Math.min(height - 40, Math.max(40, wanderFrom.y + Math.sin(t * 0.00021) * height * 0.3)),
        };
      } else {
        wanderFrom = null;
      }
      const k = idle ? 0.02 : 0.22;
      pos.x += (target.current!.x - pos.x) * k;
      pos.y += (target.current!.y - pos.y) * k;
      paint();
      frame = requestAnimationFrame(tick);
    };
    paint();
    if (!reduce) frame = requestAnimationFrame(tick);

    const onResize = () => ({ width, height } = size());
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const move = (e: React.PointerEvent) => {
    const r = root.current!.getBoundingClientRect();
    target.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    lastInput.current = performance.now();
    // Under reduced motion there's no loop, so move the light straight there.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches && lit.current) {
      const p = `${target.current.x - LIGHT / 2}px ${target.current.y - LIGHT / 2}px`;
      lit.current.style.setProperty("-webkit-mask-position", p);
      lit.current.style.maskPosition = p;
    }
  };

  return (
    <div
      ref={root}
      onPointerMove={move}
      onPointerDown={move}
      onPointerLeave={() => (lastInput.current = performance.now())}
      className="relative min-h-dvh w-full overflow-hidden bg-[#040907]"
    >
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <clipPath id="od-ball-clip">
            <circle cx="50" cy="50" r="47" />
          </clipPath>
          <radialGradient id="od-ball-shade" cx="34%" cy="28%" r="78%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="75%" stopColor="#000000" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.75" />
          </radialGradient>
          <linearGradient id="od-kit-shade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
            <stop offset="38%" stopColor="#FFFFFF" stopOpacity="0.18" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
          </linearGradient>
        </defs>
      </svg>

      {/* The dark pitch, and the drag area: only here does a finger move the light instead of scrolling. */}
      <div aria-hidden="true" className="absolute inset-0 touch-none">
        <Pitch stroke="#0E1A15" />
      </div>

      <div ref={lit} aria-hidden="true" className="floodlit pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#1F6146_0%,#0E3122_75%)]" />
        <Pitch stroke="#E4EFE8" opacity={0.6} />
        <div className="absolute inset-0 [perspective:700px]">
          {FLOATERS.map(([kind, left, top, size, bob, blur, c1, c2, num], i) => (
            <div
              key={i}
              className={`${bob} absolute`}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                filter: `drop-shadow(0 16px 18px rgba(0,0,0,0.55))${blur ? ` blur(${blur}px)` : ""}`,
              }}
            >
              {kind === "ball" ? (
                <Ball spin={i % 2 ? "spin" : "spin2"} />
              ) : (
                <Kit c1={c1!} c2={c2!} num={num!} sway={i % 2 ? "sway" : "sway2"} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex min-h-dvh items-center justify-center px-5 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] pointer-events-none">
        {children}
      </div>
    </div>
  );
}
