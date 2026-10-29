"use client";

import { useState } from "react";
import type { TeamLook } from "@/lib/team-look";

/**
 * The club crest on a soft circle, or the two-colour initials badge if there's no crest
 * or it fails to load. Never a broken image.
 */
export function TeamBadge({ team }: { team: TeamLook }) {
  const [failed, setFailed] = useState(false);
  if (team.crestUrl && !failed) {
    return (
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(242,245,241,0.92)] p-[6px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- small remote crest, loaded straight from football-data.org */}
        <img
          src={team.crestUrl}
          alt={team.name}
          width={28}
          height={28}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }
  const [bg, fg] = team.colors;
  return (
    <span
      role="img"
      aria-label={team.name}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full font-display text-[13px] font-bold"
      style={{ background: bg, color: fg, boxShadow: `inset 0 0 0 3px ${fg}` }}
    >
      {team.initials}
    </span>
  );
}
