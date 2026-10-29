// Matching team names across The Odds API, Polymarket and football-data.org.
// Each service writes names differently ("Paris Saint Germain", "Paris Saint-Germain FC", "PSG").
// We tidy both names into word sets and call them the same team when one set contains the other.
// A Polymarket event only counts as the same match when BOTH teams agree and kickoff is close.

/** Words that don't help tell clubs apart. */
const FILLER = new Set([
  "fc", "afc", "cf", "sc", "ac", "as", "ssc", "us", "ss", "sv", "rc", "cd", "ud", "sd", "ca", "club",
  "calcio", "de", "del", "la", "le", "futbol", "football", "balompie", "the",
]);

/** Different spellings of the same word. Left side is replaced by the right. */
const SAME_WORD: Record<string, string> = {
  internazionale: "inter",
  munchen: "munich",
  koln: "cologne",
  brestois: "brest",
  rennais: "rennes",
  lyonnais: "lyon",
  st: "saint",
  utd: "united",
};

/** Whole names that share no words with their other spelling. */
const SAME_TEAM: Record<string, string> = {
  psg: "paris saint germain",
  // Not "inter milan": "milan" alone is AC Milan, and the words would clash in the derby.
  "inter milan": "inter",
  "athletic bilbao": "athletic",
  "wolves": "wolverhampton wanderers",
  "spurs": "tottenham hotspur",
  "sporting lisbon": "sporting cp",
  "aek athens": "aek",
};

export function teamWords(name: string): string[] {
  const plain = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const whole = SAME_TEAM[plain] ?? plain;
  return whole
    .split(" ")
    .map((w) => SAME_WORD[w] ?? w)
    .filter((w) => w && !FILLER.has(w) && !/^\d+$/.test(w));
}

/** 2 = same words, 1 = one name's words all appear in the other, 0 = different clubs. */
export function teamMatchScore(a: string, b: string): 0 | 1 | 2 {
  const wa = new Set(teamWords(a));
  const wb = new Set(teamWords(b));
  if (wa.size === 0 || wb.size === 0) return 0;
  const [small, big] = wa.size <= wb.size ? [wa, wb] : [wb, wa];
  for (const w of small) if (!big.has(w)) return 0;
  return wa.size === wb.size ? 2 : 1;
}

/** True when the two names are the same club: one word set contains the other. */
export function sameTeam(a: string, b: string): boolean {
  return teamMatchScore(a, b) > 0;
}

/** "Chelsea FC vs. Manchester United FC" -> ["Chelsea FC", "Manchester United FC"]. Null for other titles. */
export function splitMatchTitle(title: string): [string, string] | null {
  const parts = title.split(/\s+vs\.?\s+/i);
  if (parts.length !== 2) return null;
  const [home, away] = parts.map((p) => p.trim());
  if (!home || !away || / - /.test(away)) return null;
  return [home, away];
}

export type EventCandidate = { id: string; title: string; closeTime: string; marketCount: number };

/** Polymarket match events close at kickoff. Allow some slack for listing differences. */
export const KICKOFF_TOLERANCE_MS = 3 * 60 * 60 * 1000;

/**
 * Picks the one Polymarket event that is this match: same home team, same away team,
 * three markets, kickoff within 3 hours. Returns null when there is none or more than one.
 */
export function findMatchingEvent<T extends EventCandidate>(
  match: { homeTeam: string; awayTeam: string; kickoffAt: string },
  candidates: T[],
): T | null {
  const kickoff = new Date(match.kickoffAt).getTime();
  const hits = candidates.filter((c) => {
    const teams = splitMatchTitle(c.title);
    if (!teams || c.marketCount !== 3) return false;
    if (Math.abs(new Date(c.closeTime).getTime() - kickoff) > KICKOFF_TOLERANCE_MS) return false;
    return sameTeam(teams[0], match.homeTeam) && sameTeam(teams[1], match.awayTeam);
  });
  const unique = [...new Map(hits.map((h) => [h.id, h])).values()];
  return unique.length === 1 ? unique[0] : null;
}

export type MarketQuestion = { id: string; question: string };

/**
 * Works out which market is home win, draw and away win from the question text:
 * "Will Chelsea FC win on 2026-10-31?", "Will Chelsea FC vs. Manchester United FC end in a draw?".
 * Returns null unless each outcome has exactly one market.
 */
export function mapMarkets(
  eventTitle: string,
  markets: MarketQuestion[],
): { home: string; draw: string; away: string } | null {
  const teams = splitMatchTitle(eventTitle);
  if (!teams) return null;
  const found: Record<"home" | "draw" | "away", string[]> = { home: [], draw: [], away: [] };
  for (const m of markets) {
    if (/end in a draw\??$/i.test(m.question)) {
      found.draw.push(m.id);
      continue;
    }
    const win = /^will (.+) win\b/i.exec(m.question);
    if (!win) continue;
    // If a name fits both teams (e.g. "Paris FC" and "Paris Saint-Germain FC"), the closer fit wins.
    const who = win[1].trim();
    const toHome = teamMatchScore(who, teams[0]);
    const toAway = teamMatchScore(who, teams[1]);
    if (toHome > toAway) found.home.push(m.id);
    if (toAway > toHome) found.away.push(m.id);
  }
  if (found.home.length !== 1 || found.draw.length !== 1 || found.away.length !== 1) return null;
  return { home: found.home[0], draw: found.draw[0], away: found.away[0] };
}
