import type { PredictionVersion } from "@/lib/predictions";

/** Plain-language Sui stamp status for one version. */
export function SuiStatus({ version }: { version: PredictionVersion }) {
  switch (version.sui_status) {
    case "stamped":
      return (
        <span>
          Stamped on Sui:{" "}
          <a
            href={`https://suiscan.xyz/mainnet/tx/${version.sui_digest}`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {version.sui_digest?.slice(0, 10)}…
          </a>
        </span>
      );
    case "failed":
      return <span className="text-red-700">Couldn&apos;t stamp this on Sui. We&apos;ll try again.</span>;
    case "not_applicable":
      return <span>Imported from our spreadsheet, so it was never stamped on Sui.</span>;
    default:
      return <span>Not stamped on Sui yet</span>;
  }
}
