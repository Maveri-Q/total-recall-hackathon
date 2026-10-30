import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecordCount, type RecalledGame } from "./record-count";

const recalled: RecalledGame[] = [
  { matchId: "a", label: "Monza 1-4 Napoli", closer: "polymarket", blobId: "sGhouUOr5BmZK4t3wj9Ggdz-SwbSv33WV9hYEPzeEz4" },
  { matchId: "b", label: "Parma 0-0 Udinese", closer: "bookies", blobId: "8bG_yy-xe9l7MusgC8TAz42wr9PjUSBzChpC9gVu6-Y" },
  { matchId: "c", label: "Sassuolo 2-6 Lazio", closer: "polymarket", blobId: "cL7tpMezhIhIlN0FDla60-r95sg9-9r1eSp7lZ-Hc1k" },
  { matchId: "d", label: "Genoa 2-0 Juventus", closer: "tie", blobId: "bxNBII_3wcUDwL8q8fVaXjuwHB1RJlQaa0g20lu554M" },
];
const card = (games: number, list: RecalledGame[]) =>
  renderToStaticMarkup(<RecordCount bookies={1} polymarket={3} games={games} leagueName="Serie A" min={3} early={10} recalled={list} />);

describe("RecordCount", () => {
  it("lists the games Walrus brought back, each linking to its memory", () => {
    const html = card(4, recalled);
    expect(html).toContain("The games Walrus brought back");
    expect(html).toContain("Monza 1-4 Napoli");
    expect(html).toContain('href="https://walruscan.com/mainnet/blob/sGhouUOr5BmZK4t3wj9Ggdz-SwbSv33WV9hYEPzeEz4"');
    expect(html).toContain("Bookies closer");
  });

  it("shows three and counts the rest", () => {
    const html = card(4, recalled);
    expect(html).not.toContain("Genoa 2-0 Juventus");
    expect(html).toContain("and 1 more, all saved on Walrus");
  });

  it("still shows what Walrus found when there are too few games for a score", () => {
    const html = card(2, recalled.slice(0, 2));
    expect(html).toContain("Too few past games like this yet");
    expect(html).toContain("Walrus has found 2 so far");
  });

  it("shows no list when Walrus found nothing", () => {
    expect(card(0, [])).not.toContain("Walrus has found");
  });
});
