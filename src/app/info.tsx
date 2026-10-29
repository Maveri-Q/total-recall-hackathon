/**
 * A small ⓘ that opens a short explanation. Uses the browser's built-in popover, so no script is needed.
 * Made of spans so it can sit inside a line of text.
 */
export function Info({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={label}
        className="inline-flex h-11 min-w-11 cursor-pointer items-center justify-center text-[13px] text-faint -my-3"
      >
        ⓘ
      </button>
      <span
        id={id}
        popover="auto"
        className="m-auto max-w-[300px] rounded-[20px] border border-white/10 bg-[#10241B] p-4 text-[15px] leading-normal text-chalk shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop:bg-black/50"
      >
        <span className="block">{children}</span>
        <button
          type="button"
          popoverTarget={id}
          popoverTargetAction="hide"
          className="press mt-3 inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 text-[14px] font-medium"
        >
          Got it
        </button>
      </span>
    </>
  );
}
