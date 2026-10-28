/**
 * A small ⓘ that opens a short explanation. Uses the browser's built-in popover, so no script is needed.
 * Made of spans so it can sit inside a line of text.
 */
export function Info({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <>
      <button type="button" popoverTarget={id} aria-label={label} className="ml-1 cursor-pointer text-sm opacity-70">
        ⓘ
      </button>
      <span id={id} popover="auto" className="m-auto max-w-xs border bg-white p-4 text-black">
        <span className="block">{children}</span>
        <button type="button" popoverTarget={id} popoverTargetAction="hide" className="mt-3 block underline">
          Got it
        </button>
      </span>
    </>
  );
}
